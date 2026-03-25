/**
 * Supabase integration for JJConnect Worker
 * REST API client for Supabase
 */

/**
 * Initialize Supabase client from environment variables
 * @param {Object} env - Cloudflare Worker environment
 * @returns {Object|null} Supabase client configuration
 */
export function getSupabaseConfig(env) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[WARN] Supabase credentials not configured');
    return null;
  }

  return {
    url: supabaseUrl,
    key: supabaseKey,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Get Supabase client with service role (bypasses RLS)
 * Used for sync operations like role_permissions
 */
export function getSupabaseServiceConfig(env) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return {
    url: supabaseUrl,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Verify Supabase access token and return auth user.
 * Uses Auth API with anon key.
 */
export async function getSupabaseUserFromToken(env, accessToken) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey || !accessToken) return null;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  return await res.json();
}

async function listSupabaseAuthUsers(config) {
  const users = [];
  const perPage = 200;
  let page = 1;
  while (true) {
    const res = await fetch(`${config.url}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: config.headers,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase auth users fetch failed: ${res.status} - ${text}`);
    }
    const payload = await res.json();
    const items = payload.users || [];
    users.push(...items);
    if (items.length < perPage) break;
    page += 1;
  }
  return users;
}

/**
 * Bulk replace role_permissions in Supabase (delete all + insert)
 * Uses service role to bypass RLS
 */
export async function syncRolePermissionsToSupabase(config, rows) {
  if (!config) return;
  const base = `${config.url}/rest/v1/role_permissions`;

  // Delete all
  const delRes = await fetch(base, {
    method: 'DELETE',
    headers: { ...config.headers, Prefer: 'return=minimal' },
  });
  if (!delRes.ok) {
    throw new Error(`Supabase role_permissions delete failed: ${delRes.status}`);
  }

  if (rows.length === 0) return;

  // Bulk insert (PostgREST accepts array, max ~1000 per request)
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const insRes = await fetch(base, {
      method: 'POST',
      headers: { ...config.headers, Prefer: 'return=minimal' },
      body: JSON.stringify(chunk),
    });
    if (!insRes.ok) {
      const err = await insRes.text();
      throw new Error(`Supabase role_permissions insert failed: ${insRes.status} - ${err}`);
    }
  }
}

/**
 * Sync email->role assignments to profiles.role in Supabase.
 * role_level is generated from role in schema.
 */
export async function syncRoleAssignmentsToSupabase(config, assignments) {
  if (!config) return { updated: 0, matched: 0, notFound: [], skipped: 0 };
  const users = await listSupabaseAuthUsers(config);
  const emailToUserId = new Map();
  for (const u of users) {
    if (u.email) emailToUserId.set(String(u.email).toLowerCase(), u.id);
  }

  let updated = 0;
  let matched = 0;
  let skipped = 0;
  const notFound = [];

  for (const row of assignments) {
    const email = String(row.email || '').toLowerCase();
    const role = row.role_level;
    if (!email || !role) {
      skipped++;
      continue;
    }
    const userId = emailToUserId.get(email);
    if (!userId) {
      notFound.push(email);
      continue;
    }
    matched++;

    const patchUrl = new URL(`${config.url}/rest/v1/profiles`);
    patchUrl.searchParams.set('id', `eq.${userId}`);
    const patchRes = await fetch(patchUrl.toString(), {
      method: 'PATCH',
      headers: { ...config.headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ role }),
    });

    if (patchRes.ok) {
      updated++;
      continue;
    }

    // No row in profiles, fallback to upsert minimal row
    const upsertRes = await fetch(`${config.url}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        ...config.headers,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ id: userId, role }]),
    });
    if (upsertRes.ok) {
      updated++;
      continue;
    }
    const errText = await upsertRes.text();
    throw new Error(`Supabase role assignment upsert failed: ${upsertRes.status} - ${errText}`);
  }

  return { updated, matched, notFound, skipped };
}

/**
 * Query Supabase REST API
 * @param {Object} config - Supabase configuration
 * @param {string} table - Table name
 * @param {Object} params - Query parameters
 */
export async function querySupabase(config, table, params = {}) {
  if (!config) {
    throw new Error('Supabase not configured');
  }

  const url = new URL(`${config.url}/rest/v1/${table}`);

  // Add query parameters
  if (params.select) url.searchParams.set('select', params.select);
  if (params.eq) {
    Object.entries(params.eq).forEach(([key, value]) => {
      url.searchParams.set(key, `eq.${value}`);
    });
  }
  if (params.order) url.searchParams.set('order', params.order);
  if (params.limit) url.searchParams.set('limit', params.limit);

  const response = await fetch(url.toString(), {
    headers: config.headers,
  });

  if (!response.ok) {
    throw new Error(`Supabase query failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Supabase upsert (insert or update on conflict)
 * @param {Object} config - Supabase configuration
 * @param {string} table - Table name
 * @param {Object} row - Row data to upsert
 */
export async function supabaseUpsert(config, table, row) {
  if (!config) throw new Error('Supabase not configured');
  const url = `${config.url}/rest/v1/${table}`;
  const headers = {
    ...config.headers,
    Prefer: 'resolution=merge-duplicates,return=representation',
  };
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase upsert failed: ${response.status} - ${errText}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Supabase PATCH (update by filter)
 */
export async function supabasePatch(config, table, eq, patch) {
  if (!config) throw new Error('Supabase not configured');
  const url = new URL(`${config.url}/rest/v1/${table}`);
  Object.entries(eq).forEach(([key, value]) => {
    url.searchParams.set(key, `eq.${value}`);
  });
  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: config.headers,
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase patch failed: ${response.status} - ${errText}`);
  }
  return response.status === 204 ? null : await response.json();
}
