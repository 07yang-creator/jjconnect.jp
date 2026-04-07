/**
 * Role Matrix handlers:
 * - POST /api/admin/sync-role-matrix
 * - GET /api/my-permissions
 */

import { jsonResponse, errorResponse } from '../lib/http.js';
import { extractToken, verifyToken } from '../lib/auth.js';
import {
  parseRoleMatrixCSV,
  parseRoleAssignmentsCSV,
  getAllPermissionsForRole,
  hasWritePermission,
} from '../lib/roleMatrix.js';
import {
  getSupabaseServiceConfig,
  getSupabaseUserFromToken,
  syncRolePermissionsToSupabase,
  syncRoleAssignmentsToSupabase,
  querySupabase,
} from '../lib/supabase.js';

function csvResponse(filename, text) {
  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function escapeCsvCell(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

async function ensureAuditTables(db) {
  if (!db) return;
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS role_matrix_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        source TEXT,
        note TEXT,
        rows_json TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS sync_run_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        run_type TEXT NOT NULL,
        status TEXT NOT NULL,
        rows_in INTEGER DEFAULT 0,
        rows_updated INTEGER DEFAULT 0,
        created_by TEXT,
        error_message TEXT,
        meta_json TEXT
      )
    `),
  ]);
}

async function createSnapshot(db, { createdBy, source, note, rows }) {
  const res = await db.prepare(
    'INSERT INTO role_matrix_snapshots (created_by, source, note, rows_json) VALUES (?, ?, ?, ?)'
  ).bind(createdBy || '', source || '', note || '', JSON.stringify(rows || [])).run();
  return res?.meta?.last_row_id || null;
}

async function insertRunLog(db, payload) {
  if (!db) return;
  await db.prepare(`
    INSERT INTO sync_run_logs (run_type, status, rows_in, rows_updated, created_by, error_message, meta_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    payload.run_type || '',
    payload.status || 'ok',
    payload.rows_in || 0,
    payload.rows_updated || 0,
    payload.created_by || '',
    payload.error_message || '',
    JSON.stringify(payload.meta || {})
  ).run();
}

async function getCurrentRoleMatrixRows(db) {
  if (!db) return [];
  const { results } = await db.prepare(
    'SELECT role_level, resource, permission FROM role_permissions ORDER BY role_level, resource'
  ).all();
  return results || [];
}

function keyOfRow(row) {
  return `${row.role_level}::${row.resource}`;
}

function buildMatrixDiff(oldRows, newRows) {
  const oldMap = new Map((oldRows || []).map((r) => [keyOfRow(r), r.permission]));
  const newMap = new Map((newRows || []).map((r) => [keyOfRow(r), r.permission]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [k, perm] of newMap.entries()) {
    if (!oldMap.has(k)) {
      added.push({ key: k, permission: perm });
      continue;
    }
    const prev = oldMap.get(k);
    if (prev !== perm) {
      changed.push({ key: k, before: prev, after: perm });
    }
  }
  for (const [k, perm] of oldMap.entries()) {
    if (!newMap.has(k)) {
      removed.push({ key: k, permission: perm });
    }
  }

  return {
    totalBefore: oldMap.size,
    totalAfter: newMap.size,
    addedCount: added.length,
    removedCount: removed.length,
    changedCount: changed.length,
    sample: {
      added: added.slice(0, 20),
      removed: removed.slice(0, 20),
      changed: changed.slice(0, 20),
    },
  };
}

async function fetchAuthUsersByEmail(config) {
  const users = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const res = await fetch(`${config.url}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: config.headers,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Fetch auth users failed: ${res.status} - ${err}`);
    }
    const payload = await res.json();
    const chunk = payload.users || [];
    users.push(...chunk);
    if (chunk.length < perPage) break;
    page += 1;
  }
  const map = new Map();
  for (const u of users) {
    if (u.email) map.set(String(u.email).toLowerCase(), u);
  }
  return map;
}

async function resolveAdminContext(request, env) {
  const token = extractToken(request);
  if (!token) return { error: errorResponse('需要登录', 401) };

  // Backward compatibility with custom worker JWT
  const legacyPayload = verifyToken(token, env);
  if (legacyPayload?.role >= 2) {
    return {
      payload: legacyPayload,
      roleLevel: legacyPayload.role_level || 'A',
      role: legacyPayload.role,
      source: 'legacy',
    };
  }

  // Supabase-primary path
  const supabaseUser = await getSupabaseUserFromToken(env, token);
  if (!supabaseUser?.id) {
    return { error: errorResponse('Token 无效或已过期', 401) };
  }
  const serviceConfig = getSupabaseServiceConfig(env);
  if (!serviceConfig) {
    return { error: errorResponse('SUPABASE_SERVICE_ROLE_KEY 未配置', 503) };
  }
  const profileRows = await querySupabase(serviceConfig, 'profiles', {
    select: 'id,role,role_level,is_authorized',
    eq: { id: supabaseUser.id },
    limit: '1',
  });
  const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
  const roleLevel = profile?.role_level || profile?.role || 'T';
  const isAdmin = roleLevel === 'A' || profile?.is_authorized === true;
  if (!isAdmin) return { error: errorResponse('仅管理员可执行此操作', 403) };

  return {
    payload: {
      userId: supabaseUser.id,
      email: supabaseUser.email,
      role_level: roleLevel,
      role: isAdmin ? 2 : 0,
    },
    roleLevel,
    role: isAdmin ? 2 : 0,
    serviceConfig,
    source: 'supabase',
  };
}

async function resolveUserContext(request, env) {
  const token = extractToken(request);
  if (!token) return { error: errorResponse('需要登录', 401) };
  const legacyPayload = verifyToken(token, env);
  if (legacyPayload) {
    return {
      payload: legacyPayload,
      roleLevel: legacyPayload.role_level || 'T',
      role: legacyPayload.role || 0,
    };
  }

  const supabaseUser = await getSupabaseUserFromToken(env, token);
  if (!supabaseUser?.id) return { error: errorResponse('Token 无效或已过期', 401) };
  const serviceConfig = getSupabaseServiceConfig(env);
  if (!serviceConfig) return { error: errorResponse('SUPABASE_SERVICE_ROLE_KEY 未配置', 503) };

  const profileRows = await querySupabase(serviceConfig, 'profiles', {
    select: 'id,role,role_level,is_authorized',
    eq: { id: supabaseUser.id },
    limit: '1',
  });
  const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
  return {
    payload: {
      userId: supabaseUser.id,
      email: supabaseUser.email,
      role_level: profile?.role_level || profile?.role || 'T',
      role: profile?.is_authorized || profile?.role_level === 'A' ? 2 : 0,
    },
    roleLevel: profile?.role_level || profile?.role || 'T',
    role: profile?.is_authorized || profile?.role_level === 'A' ? 2 : 0,
  };
}

export async function handleSyncRoleMatrix(request, env) {
  let auth = null;
  try {
    auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;

    const sheetUrl = env.ROLE_MATRIX_SHEET_URL;
    if (!sheetUrl) {
      return errorResponse('ROLE_MATRIX_SHEET_URL 未配置，请在 wrangler 或 .dev.vars 中设置', 503);
    }

    let csvText;
    try {
      const res = await fetch(sheetUrl, {
        headers: { 'Accept': 'text/csv' },
      });
      if (!res.ok) {
        throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
      }
      csvText = await res.text();
    } catch (fetchError) {
      console.error('Fetch Role Matrix Sheet error:', fetchError);
      return errorResponse(
        `无法获取 Google Sheet: ${fetchError.message}。请确认表格已设为「知道链接的人可查看」。`,
        502
      );
    }

    const { rows, parseReport } = parseRoleMatrixCSV(csvText);
    if (rows.length === 0) {
      return errorResponse(
        '解析结果为空，请检查 Sheet 格式（第2行为表头，第4行起为数据，A列=角色代码）',
        400
      );
    }

    const db = env.DB;
    if (!db) return errorResponse('数据库未配置', 500);
    await ensureAuditTables(db);
    const beforeRows = await getCurrentRoleMatrixRows(db);
    const diff = buildMatrixDiff(beforeRows, rows);
    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dry_run') === '1';
    if (dryRun) {
      return jsonResponse({
        success: true,
        dryRun: true,
        parseReport,
        diff,
      });
    }

    const previousSnapshotId = await createSnapshot(db, {
      createdBy: auth.payload?.email || String(auth.payload?.userId || ''),
      source: auth.source || 'unknown',
      note: 'before sync-role-matrix',
      rows: beforeRows,
    });

    try {
      const statements = [
        db.prepare(
          'CREATE TABLE IF NOT EXISTS role_permissions_staging (role_level TEXT, resource TEXT, permission TEXT)'
        ),
        db.prepare('DELETE FROM role_permissions_staging'),
        ...rows.map((r) =>
          db
            .prepare(
              'INSERT INTO role_permissions_staging (role_level, resource, permission) VALUES (?, ?, ?)'
            )
            .bind(r.role_level, r.resource, r.permission)
        ),
        db.prepare('DELETE FROM role_permissions'),
        db.prepare('INSERT INTO role_permissions SELECT * FROM role_permissions_staging'),
        db.prepare('DROP TABLE role_permissions_staging'),
      ];
      await db.batch(statements);
    } catch (dbError) {
      console.error('Role matrix sync DB error:', dbError);
      await insertRunLog(db, {
        run_type: 'sync-role-matrix',
        status: 'error',
        rows_in: rows.length,
        rows_updated: 0,
        created_by: auth.payload?.email || String(auth.payload?.userId || ''),
        error_message: dbError.message || 'db write failed',
        meta: { parseReport, diff, previousSnapshotId },
      });
      return errorResponse(`写入数据库失败: ${dbError.message}`, 500);
    }

    // 双写 Supabase role_permissions（供 Next.js 查询）
    const supabaseService = auth.serviceConfig || getSupabaseServiceConfig(env);
    if (supabaseService) {
      try {
        await syncRolePermissionsToSupabase(supabaseService, rows);
      } catch (supaErr) {
        console.error('Supabase role_permissions sync error:', supaErr);
        // 不阻断成功，D1 已写入
      }
    }

    const lastSyncAt = new Date().toISOString();
    const appliedRows = await getCurrentRoleMatrixRows(db);
    const newSnapshotId = await createSnapshot(db, {
      createdBy: auth.payload?.email || String(auth.payload?.userId || ''),
      source: auth.source || 'unknown',
      note: 'after sync-role-matrix',
      rows: appliedRows,
    });
    await insertRunLog(db, {
      run_type: 'sync-role-matrix',
      status: 'ok',
      rows_in: rows.length,
      rows_updated: rows.length,
      created_by: auth.payload?.email || String(auth.payload?.userId || ''),
      meta: { parseReport, diff, previousSnapshotId, newSnapshotId },
    });
    return jsonResponse({
      success: true,
      message: '授权矩阵已更新',
      rowsUpdated: rows.length,
      lastSyncAt,
      parseReport,
      diff,
      previousSnapshotId,
      newSnapshotId,
      authSource: auth.source,
    });
  } catch (error) {
    console.error('Sync role matrix error:', error);
    if (env.DB) {
      await ensureAuditTables(env.DB);
      await insertRunLog(env.DB, {
        run_type: 'sync-role-matrix',
        status: 'error',
        rows_in: 0,
        rows_updated: 0,
        created_by: auth?.payload?.email || String(auth?.payload?.userId || ''),
        error_message: error.message || 'unknown',
      });
    }
    return errorResponse('同步失败', 500);
  }
}

export async function handleSyncRoleAssignments(request, env) {
  let auth = null;
  try {
    auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    if (env.DB) await ensureAuditTables(env.DB);
    const sheetUrl = env.ROLE_ASSIGNMENTS_SHEET_URL;
    if (!sheetUrl) {
      return errorResponse('ROLE_ASSIGNMENTS_SHEET_URL 未配置，请在 wrangler 或 .dev.vars 中设置', 503);
    }
    const res = await fetch(sheetUrl, { headers: { Accept: 'text/csv' } });
    if (!res.ok) {
      return errorResponse(`无法获取 Assignment Sheet: ${res.status} ${res.statusText}`, 502);
    }
    const csvText = await res.text();
    const { rows, parseReport } = parseRoleAssignmentsCSV(csvText);
    if (rows.length === 0) {
      return errorResponse('Assignment 解析结果为空，请检查 Sheet 格式', 400);
    }
    const serviceConfig = auth.serviceConfig || getSupabaseServiceConfig(env);
    const syncReport = await syncRoleAssignmentsToSupabase(serviceConfig, rows);
    if (env.DB) {
      await insertRunLog(env.DB, {
        run_type: 'sync-role-assignments',
        status: 'ok',
        rows_in: rows.length,
        rows_updated: syncReport.updated,
        created_by: auth.payload?.email || String(auth.payload?.userId || ''),
        meta: { parseReport, syncReport },
      });
    }
    return jsonResponse({
      success: true,
      message: '用户角色分配已更新',
      rowsUpdated: syncReport.updated,
      parseReport,
      syncReport,
      lastSyncAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync role assignments error:', error);
    if (env.DB) {
      await ensureAuditTables(env.DB);
      await insertRunLog(env.DB, {
        run_type: 'sync-role-assignments',
        status: 'error',
        rows_in: 0,
        rows_updated: 0,
        created_by: auth?.payload?.email || String(auth?.payload?.userId || ''),
        error_message: error.message || 'unknown',
      });
    }
    return errorResponse(`同步失败: ${error.message}`, 500);
  }
}

export async function handlePreviewRoleMatrixSync(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const sheetUrl = env.ROLE_MATRIX_SHEET_URL;
    if (!sheetUrl) {
      return errorResponse('ROLE_MATRIX_SHEET_URL 未配置，请在 wrangler 或 .dev.vars 中设置', 503);
    }
    const res = await fetch(sheetUrl, { headers: { Accept: 'text/csv' } });
    if (!res.ok) return errorResponse(`无法获取 Google Sheet: ${res.status} ${res.statusText}`, 502);
    const csvText = await res.text();
    const { rows, parseReport } = parseRoleMatrixCSV(csvText);
    const db = env.DB;
    if (!db) return errorResponse('数据库未配置', 500);
    const beforeRows = await getCurrentRoleMatrixRows(db);
    const diff = buildMatrixDiff(beforeRows, rows);
    return jsonResponse({ success: true, parseReport, diff, rowsPreviewCount: rows.length });
  } catch (error) {
    return errorResponse(`预览失败: ${error.message}`, 500);
  }
}

export async function handleRollbackRoleMatrix(request, env) {
  let auth = null;
  try {
    auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const db = env.DB;
    if (!db) return errorResponse('数据库未配置', 500);
    await ensureAuditTables(db);
    const url = new URL(request.url);
    let snapshotId = url.searchParams.get('snapshot_id');
    if (!snapshotId && request.method === 'POST') {
      try {
        const body = await request.json();
        snapshotId = body?.snapshot_id || '';
      } catch (_) {
        // ignore body parse errors
      }
    }
    if (!snapshotId) return errorResponse('缺少 snapshot_id', 400);

    const snap = await db.prepare(
      'SELECT id, rows_json FROM role_matrix_snapshots WHERE id = ?'
    ).bind(snapshotId).first();
    if (!snap) return errorResponse('snapshot 不存在', 404);
    const rows = JSON.parse(snap.rows_json || '[]');

    const statements = [
      db.prepare('DELETE FROM role_permissions'),
      ...rows.map((r) =>
        db
          .prepare('INSERT INTO role_permissions (role_level, resource, permission) VALUES (?, ?, ?)')
          .bind(r.role_level, r.resource, r.permission)
      ),
    ];
    await db.batch(statements);

    const supabaseService = auth.serviceConfig || getSupabaseServiceConfig(env);
    if (supabaseService) {
      await syncRolePermissionsToSupabase(supabaseService, rows);
    }
    const newSnapshotId = await createSnapshot(db, {
      createdBy: auth.payload?.email || String(auth.payload?.userId || ''),
      source: auth.source || 'unknown',
      note: `rollback from snapshot ${snapshotId}`,
      rows,
    });
    await insertRunLog(db, {
      run_type: 'rollback-role-matrix',
      status: 'ok',
      rows_in: rows.length,
      rows_updated: rows.length,
      created_by: auth.payload?.email || String(auth.payload?.userId || ''),
      meta: { sourceSnapshotId: snapshotId, newSnapshotId },
    });
    return jsonResponse({
      success: true,
      message: '角色矩阵已回滚',
      rowsUpdated: rows.length,
      sourceSnapshotId: Number(snapshotId),
      newSnapshotId,
    });
  } catch (error) {
    if (env.DB) {
      await ensureAuditTables(env.DB);
      await insertRunLog(env.DB, {
        run_type: 'rollback-role-matrix',
        status: 'error',
        rows_in: 0,
        rows_updated: 0,
        created_by: auth?.payload?.email || String(auth?.payload?.userId || ''),
        error_message: error.message || 'unknown',
      });
    }
    return errorResponse(`回滚失败: ${error.message}`, 500);
  }
}

export async function handleSyncAuthAll(request, env) {
  const matrixResult = await handleSyncRoleMatrix(request, env);
  if (!(matrixResult instanceof Response)) return matrixResult;
  if (matrixResult.status >= 400) return matrixResult;
  const assignResult = await handleSyncRoleAssignments(request, env);
  if (assignResult.status >= 400) return assignResult;
  return jsonResponse({
    success: true,
    message: '权限矩阵与角色分配同步完成',
    lastSyncAt: new Date().toISOString(),
  });
}

/**
 * GET /api/my-permissions - Returns permissions for current user's role_level
 */
export async function handleGetMyPermissions(request, env) {
  try {
    const auth = await resolveUserContext(request, env);
    if (auth.error) return auth.error;
    const { payload, roleLevel, role } = auth;
    const permissions = await getAllPermissionsForRole(roleLevel, env);

    // Derive admin UI flags from matrix (fallback to role for backward compat)
    const canPublishContent =
      hasWritePermission(permissions.blog_full_1) ||
      hasWritePermission(permissions.blog_full_2) ||
      hasWritePermission(permissions.blog_full_3) ||
      hasWritePermission(permissions.admin_content) ||
      role >= 2;
    const canEditContent = canPublishContent;
    const canAccessUserManagement =
      hasWritePermission(permissions.admin_users) || role >= 1;
    const canAccessContentManagement = canPublishContent;
    const canAccessSystemSettings =
      hasWritePermission(permissions.admin_settings) || role >= 2;

    return jsonResponse({
      success: true,
      user_id: payload.userId,
      role_level: roleLevel,
      permissions,
      ui: {
        canPublishContent,
        canEditContent,
        canSaveDraft: canPublishContent,
        canAccessUserManagement,
        canAccessContentManagement,
        canAccessSystemSettings,
        canAddUser: role >= 2,
        canDeleteUser: role >= 2,
        canDeleteContent: role >= 2,
      },
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    return errorResponse('获取权限失败', 500);
  }
}

export async function handleExportRoleMatrix(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const serviceConfig = auth.serviceConfig || getSupabaseServiceConfig(env);
    const rows = await querySupabase(serviceConfig, 'role_permissions', {
      select: 'role_level,resource,permission',
      order: 'role_level.asc,resource.asc',
    });

    const format = new URL(request.url).searchParams.get('format') || 'json';
    if (format === 'csv') {
      const resources = [...new Set((rows || []).map((r) => r.resource))].sort();
      const byRole = new Map();
      for (const row of rows || []) {
        if (!byRole.has(row.role_level)) byRole.set(row.role_level, {});
        byRole.get(row.role_level)[row.resource] = row.permission;
      }
      const roleLevels = [...byRole.keys()].sort();
      const csvLines = [];
      csvLines.push(['role_level', ...resources].map(escapeCsvCell).join(','));
      for (const role of roleLevels) {
        const perms = byRole.get(role) || {};
        csvLines.push([role, ...resources.map((r) => perms[r] || 'deny')].map(escapeCsvCell).join(','));
      }
      return csvResponse('role_matrix.csv', csvLines.join('\n'));
    }

    return jsonResponse({ success: true, rows: rows || [] });
  } catch (error) {
    console.error('Export role matrix error:', error);
    return errorResponse(`导出失败: ${error.message}`, 500);
  }
}

export async function handleExportRoleAssignments(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const serviceConfig = auth.serviceConfig || getSupabaseServiceConfig(env);

    const profiles = await querySupabase(serviceConfig, 'profiles', {
      select: 'id,role,role_level,is_authorized,created_at',
      order: 'created_at.desc',
      limit: '1000',
    });
    const usersByEmail = await fetchAuthUsersByEmail(serviceConfig);
    const usersById = new Map();
    for (const [, user] of usersByEmail) usersById.set(user.id, user);

    const rows = (profiles || []).map((p) => {
      const user = usersById.get(p.id);
      return {
        user_id: p.id,
        email: user?.user_metadata?.jjc_email || user?.email || '',
        role: p.role || p.role_level || 'T',
        role_level: p.role_level || p.role || 'T',
        is_authorized: p.is_authorized || false,
        created_at: p.created_at || '',
      };
    });

    const format = new URL(request.url).searchParams.get('format') || 'json';
    if (format === 'csv') {
      const header = ['user_id', 'email', 'role', 'role_level', 'is_authorized', 'created_at'];
      const csvLines = [header.map(escapeCsvCell).join(',')];
      for (const row of rows) {
        csvLines.push(header.map((k) => escapeCsvCell(row[k])).join(','));
      }
      return csvResponse('role_assignments.csv', csvLines.join('\n'));
    }
    return jsonResponse({ success: true, rows });
  } catch (error) {
    console.error('Export role assignments error:', error);
    return errorResponse(`导出失败: ${error.message}`, 500);
  }
}

export async function handleRoleStats(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const serviceConfig = auth.serviceConfig || getSupabaseServiceConfig(env);
    const profiles = await querySupabase(serviceConfig, 'profiles', {
      select: 'role,role_level',
      limit: '5000',
    });
    const counts = {};
    for (const row of profiles || []) {
      const role = row.role_level || row.role || 'T';
      counts[role] = (counts[role] || 0) + 1;
    }
    return jsonResponse({ success: true, counts });
  } catch (error) {
    console.error('Role stats error:', error);
    return errorResponse(`获取统计失败: ${error.message}`, 500);
  }
}

export async function handlePendingUsers(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const serviceConfig = auth.serviceConfig || getSupabaseServiceConfig(env);
    const profiles = await querySupabase(serviceConfig, 'profiles', {
      select: 'id,role,role_level,created_at',
      eq: { role: 'T' },
      order: 'created_at.desc',
      limit: '100',
    });
    const usersByEmail = await fetchAuthUsersByEmail(serviceConfig);
    const usersById = new Map();
    for (const [, user] of usersByEmail) usersById.set(user.id, user);
    const rows = (profiles || []).map((p) => ({
      user_id: p.id,
      email: usersById.get(p.id)?.user_metadata?.jjc_email || usersById.get(p.id)?.email || '',
      role: p.role || 'T',
      role_level: p.role_level || p.role || 'T',
      created_at: p.created_at || '',
    }));
    return jsonResponse({ success: true, rows });
  } catch (error) {
    console.error('Pending users error:', error);
    return errorResponse(`获取待分配用户失败: ${error.message}`, 500);
  }
}

export async function handleNewArticles(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const serviceConfig = auth.serviceConfig || getSupabaseServiceConfig(env);
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '10';
    const rows = await querySupabase(serviceConfig, 'posts', {
      select: 'id,title,status,created_at,author_id',
      order: 'created_at.desc',
      limit,
    });
    return jsonResponse({ success: true, rows: rows || [] });
  } catch (error) {
    console.error('New articles error:', error);
    return errorResponse(`获取文章失败: ${error.message}`, 500);
  }
}

export async function handleMetricsHealth(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const serviceConfig = auth.serviceConfig || getSupabaseServiceConfig(env);
    const started = Date.now();
    const ping = await querySupabase(serviceConfig, 'role_permissions', {
      select: 'role_level',
      limit: '1',
    });
    const latencyMs = Date.now() - started;
    return jsonResponse({
      success: true,
      web: { status: 'ok' },
      worker: { status: 'ok', timestamp: new Date().toISOString() },
      supabase: { status: Array.isArray(ping) ? 'ok' : 'ok', latencyMs },
    });
  } catch (error) {
    return errorResponse(`健康检查失败: ${error.message}`, 500);
  }
}

export async function handleMetricsTraffic(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const db = env.DB;
    if (!db) return jsonResponse({ success: true, rows: [] });
    await ensureAuditTables(db);
    const stats = await db.prepare(`
      SELECT
        COUNT(*) AS total_runs,
        SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS ok_runs,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_runs
      FROM sync_run_logs
      WHERE created_at >= datetime('now', '-1 day')
    `).first();
    return jsonResponse({
      success: true,
      window: '24h',
      runs: {
        total: Number(stats?.total_runs || 0),
        ok: Number(stats?.ok_runs || 0),
        error: Number(stats?.error_runs || 0),
      },
      message: 'Operational traffic (sync runs) metrics. External web analytics can be added next.',
    });
  } catch (error) {
    return errorResponse(`获取统计失败: ${error.message}`, 500);
  }
}

export async function handleUpdateUserRole(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    
    let body;
    try { body = await request.json(); } catch(e) { return errorResponse('无效的请求体', 400); }
    
    const { user_id, role_level, is_authorized } = body;
    if (!user_id || !role_level) return errorResponse('缺少必填字段', 400);
    
    const serviceConfig = auth.serviceConfig || getSupabaseServiceConfig(env);
    
    // Update Supabase profiles
    try {
      const res = await fetch(`${serviceConfig.url}/rest/v1/profiles?id=eq.${user_id}`, {
        method: 'PATCH',
        headers: {
          ...serviceConfig.headers,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ role_level, is_authorized: !!is_authorized })
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      return errorResponse(`更新 Supabase 操作失败: ${e.message}`, 500);
    }
    
    return jsonResponse({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('Update user role error:', error);
    return errorResponse(`系统错误: ${error.message}`, 500);
  }
}

export async function handleMetricsErrors(request, env) {
  try {
    const auth = await resolveAdminContext(request, env);
    if (auth.error) return auth.error;
    const db = env.DB;
    if (!db) return jsonResponse({ success: true, rows: [] });
    await ensureAuditTables(db);
    const { results } = await db.prepare(`
      SELECT id, created_at, run_type, status, error_message
      FROM sync_run_logs
      WHERE status = 'error'
      ORDER BY id DESC
      LIMIT 30
    `).all();
    return jsonResponse({ success: true, rows: results || [] });
  } catch (error) {
    return errorResponse(`错误统计失败: ${error.message}`, 500);
  }
}
