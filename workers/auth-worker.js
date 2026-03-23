/**
 * JJConnect Web Application Worker
 * Handles web pages, API routes, and Supabase integration
 *
 * Routes:
 * - GET / - Main web application (React mount point)
 * - GET /api/* - API endpoints
 *
 * API Endpoints:
 * - GET /api/account/check - Check if account exists (?identifier=email|username)
 * - GET /api/users - Get user list
 * - POST /api/submit - Submit joint-mamori form
 * - GET /api/submissions - Get submissions list (Admin only)
 * - GET /api/backend/status - Backend connection status (debug)
 * - GET /api/posts - Get posts list
 * - GET /api/categories - Get categories list
 */

import { route } from './router.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/api/sync-role-matrix') {
      return await handleSyncRoleMatrix(request, env);
    }
    return route(request, env);
  },
};

const ALLOWED_ROLE_CODES = new Set(['A', 'B', 'CB', 'VB', 'T', 'S', 'W', 'WN', 'W1', 'W2', 'W3', 'S-writer']);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function extractBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function toGoogleSheetCsvUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!u.hostname.includes('docs.google.com') || !u.pathname.includes('/spreadsheets/')) {
      return rawUrl;
    }

    const pathParts = u.pathname.split('/');
    const dIndex = pathParts.indexOf('d');
    const sheetId = dIndex >= 0 ? pathParts[dIndex + 1] : '';
    if (!sheetId) return rawUrl;

    const gid = u.searchParams.get('gid') || (u.hash.startsWith('#gid=') ? u.hash.slice(5) : '0');
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;
  } catch {
    return rawUrl;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

function normalizePermission(value) {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'R/W') return 'R/W';
  if (v === 'R') return 'R';
  if (v === '✓' || v === '√') return 'allow';
  if (v === '–' || v === '-' || v === '') return 'deny';
  return 'deny';
}

function parseRoleMatrix(csvText) {
  const table = parseCsv(csvText);
  if (table.length < 4) return [];

  // Row 2 => index 1 (resource/page names), Row 4+ => index 3+
  const headerRow = table[1] || [];
  const resources = [];
  for (let c = 1; c < headerRow.length; c++) {
    resources.push({ col: c, resource: String(headerRow[c] || '').trim() });
  }

  const rows = [];
  for (let r = 3; r < table.length; r++) {
    const dataRow = table[r] || [];
    const role = String(dataRow[0] || '').trim();
    if (!ALLOWED_ROLE_CODES.has(role)) continue;

    for (const { col, resource } of resources) {
      if (!resource) continue;
      rows.push({
        role_level: role === 'S-writer' ? 'S_writer' : role,
        resource,
        permission: normalizePermission(dataRow[col]),
      });
    }
  }

  return rows;
}

async function verifySupabaseSessionAndAdminRole(token, env) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new Error('Supabase 环境变量缺失');
  }

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!userResp.ok) {
    throw new Error('Supabase session token 无效');
  }

  const user = await userResp.json();
  const userId = user?.id;
  if (!userId) throw new Error('无法解析当前用户');

  const profileResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=role_level&id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  if (!profileResp.ok) {
    throw new Error('读取用户角色失败');
  }

  const profiles = await profileResp.json();
  const roleLevel = profiles?.[0]?.role_level;
  if (roleLevel !== 'A') {
    const err = new Error('仅管理员可执行此操作');
    err.status = 403;
    throw err;
  }
}

async function syncRolePermissionsToSupabase(env, rows) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service role 未配置');

  const baseUrl = `${supabaseUrl}/rest/v1/role_permissions`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  const del = await fetch(baseUrl, { method: 'DELETE', headers });
  if (!del.ok) throw new Error(`清空 role_permissions 失败: ${del.status}`);

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const ins = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });
    if (!ins.ok) {
      const reason = await ins.text();
      throw new Error(`写入 role_permissions 失败: ${ins.status} ${reason}`);
    }
  }
}

async function handleSyncRoleMatrix(request, env) {
  try {
    const token = extractBearerToken(request);
    if (!token) return json({ success: false, error: '需要登录' }, 401);

    const sheetUrlRaw = env.ROLE_MATRIX_SHEET_URL;
    if (!sheetUrlRaw) {
      return json({ success: false, error: 'ROLE_MATRIX_SHEET_URL 未配置' }, 503);
    }
    const sheetUrl = toGoogleSheetCsvUrl(sheetUrlRaw);

    await verifySupabaseSessionAndAdminRole(token, env);

    const sheetResp = await fetch(sheetUrl, { headers: { Accept: 'text/csv' } });
    if (!sheetResp.ok) {
      return json({ success: false, error: '无法获取 Google Sheet CSV' }, 502);
    }
    const csvText = await sheetResp.text();
    const rows = parseRoleMatrix(csvText);
    if (rows.length === 0) {
      return json({ success: false, error: 'CSV 解析结果为空' }, 400);
    }

    await syncRolePermissionsToSupabase(env, rows);
    return json({ success: true, updated: rows.length });
  } catch (error) {
    const status = Number(error?.status) || 500;
    return json({ success: false, error: error?.message || '同步失败' }, status);
  }
}
