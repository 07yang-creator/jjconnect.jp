/**
 * Role Matrix handlers:
 * - POST /api/admin/sync-role-matrix
 * - GET /api/my-permissions
 */

import { jsonResponse, errorResponse } from '../lib/http.js';
import { extractToken, verifyToken } from '../lib/auth.js';
import { parseRoleMatrixCSV, getAllPermissionsForRole, hasWritePermission } from '../lib/roleMatrix.js';
import { getSupabaseServiceConfig, syncRolePermissionsToSupabase } from '../lib/supabase.js';

export async function handleSyncRoleMatrix(request, env) {
  try {
    const token = extractToken(request);
    if (!token) return errorResponse('需要登录', 401);

    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (e) {
      return errorResponse(`Token 验证失败: ${e.message}`, 401);
    }
    if (!payload) return errorResponse('Token 无效或已过期', 401);
    if (payload.role < 2) return errorResponse('仅管理员可执行此操作', 403);

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
      return errorResponse(`写入数据库失败: ${dbError.message}`, 500);
    }

    // 双写 Supabase role_permissions（供 Next.js 查询）
    const supabaseService = getSupabaseServiceConfig(env);
    if (supabaseService) {
      try {
        await syncRolePermissionsToSupabase(supabaseService, rows);
      } catch (supaErr) {
        console.error('Supabase role_permissions sync error:', supaErr);
        // 不阻断成功，D1 已写入
      }
    }

    const lastSyncAt = new Date().toISOString();
    return jsonResponse({
      success: true,
      message: '授权矩阵已更新',
      rowsUpdated: rows.length,
      lastSyncAt,
      parseReport,
    });
  } catch (error) {
    console.error('Sync role matrix error:', error);
    return errorResponse('同步失败', 500);
  }
}

/**
 * GET /api/my-permissions - Returns permissions for current user's role_level
 */
export async function handleGetMyPermissions(request, env) {
  try {
    const token = extractToken(request);
    if (!token) return errorResponse('需要登录', 401);

    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (e) {
      return errorResponse(`Token 验证失败: ${e.message}`, 401);
    }
    if (!payload) return errorResponse('Token 无效或已过期', 401);

    const roleLevel = payload.role_level || 'T';
    const permissions = await getAllPermissionsForRole(roleLevel, env);

    // Derive admin UI flags from matrix (fallback to role for backward compat)
    const canPublishContent =
      hasWritePermission(permissions.blog_full_1) ||
      hasWritePermission(permissions.blog_full_2) ||
      hasWritePermission(permissions.blog_full_3) ||
      hasWritePermission(permissions.admin_content) ||
      payload.role >= 2;
    const canEditContent = canPublishContent;
    const canAccessUserManagement =
      hasWritePermission(permissions.admin_users) || payload.role >= 1;
    const canAccessContentManagement = canPublishContent;
    const canAccessSystemSettings =
      hasWritePermission(permissions.admin_settings) || payload.role >= 2;

    return jsonResponse({
      success: true,
      role_level: roleLevel,
      permissions,
      ui: {
        canPublishContent,
        canEditContent,
        canSaveDraft: canPublishContent,
        canAccessUserManagement,
        canAccessContentManagement,
        canAccessSystemSettings,
        canAddUser: payload.role >= 2,
        canDeleteUser: payload.role >= 2,
        canDeleteContent: payload.role >= 2,
      },
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    return errorResponse('获取权限失败', 500);
  }
}
