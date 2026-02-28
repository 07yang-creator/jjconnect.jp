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

  console.log('[INFO] Supabase initialized:', supabaseUrl.substring(0, 30) + '...');

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
