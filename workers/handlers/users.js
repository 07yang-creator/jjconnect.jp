/**
 * User and profile route handlers
 */

import { jsonResponse, errorResponse } from '../lib/http.js';
import {
  getSupabaseConfig,
  querySupabase,
  supabaseUpsert,
  supabasePatch,
} from '../lib/supabase.js';
import { extractToken, verifyToken } from '../lib/auth.js';
import {
  generateAvatarKey,
  AVATAR_MAX_SIZE,
  AVATAR_TYPES,
} from '../lib/storage.js';
import { profilePatchSchema } from '../lib/schemas.js';

export async function handleGetUsers(request, env) {
  try {
    const token = extractToken(request);
    if (!token) return errorResponse('需要登录', 401);

    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (tokenError) {
      return errorResponse(`Token 验证失败: ${tokenError.message}`, 401);
    }
    if (!payload) return errorResponse('Token 无效或已过期', 401);
    if (payload.role < 2) return errorResponse('权限不足', 403);

    let results;
    try {
      const queryResult = await env.DB.prepare(
        'SELECT id, username, email, firstname, lastname, role, email_verified, created_at FROM users'
      ).all();
      results = queryResult.results;
    } catch (dbError) {
      if (dbError.message?.includes('no such table')) {
        return errorResponse(`数据库表不存在: ${dbError.message}`, 500);
      }
      return errorResponse(`数据库查询失败: ${dbError.message}`, 500);
    }

    return jsonResponse({
      success: true,
      users: results.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        name: `${u.firstname} ${u.lastname}`,
        email_verified: u.email_verified,
        created_at: u.created_at,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(`获取用户列表失败: ${error.message}`, 500);
  }
}

export async function handleGetProfile(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const isPublic = pathParts[2] && pathParts[2] !== 'own';
  const targetUserId = isPublic ? pathParts[2] : null;

  if (isPublic && targetUserId) {
    const supabase = getSupabaseConfig(env);
    if (!supabase) return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);
    try {
      const rows = await querySupabase(supabase, 'user_profiles', {
        select: 'username,avatar_url,contribution_value,registered_date',
        eq: { user_id: targetUserId },
        limit: '1',
      });
      const profile = Array.isArray(rows) ? rows[0] : rows;
      if (!profile) return jsonResponse({ success: false, error: 'Profile not found' }, 404);
      return jsonResponse({
        success: true,
        profile: {
          username: profile.username,
          avatar_url: profile.avatar_url || null,
          contribution_value: profile.contribution_value || '0',
          registered_date: profile.registered_date,
        },
        public: true,
      });
    } catch (err) {
      return jsonResponse({ success: false, error: err.message }, 500);
    }
  }

  const token = extractToken(request);
  if (!token) return errorResponse('需要登录', 401);

  let payload;
  try {
    payload = verifyToken(token, env);
  } catch {
    return errorResponse('Token 验证失败', 401);
  }
  if (!payload) return errorResponse('Token 无效或已过期', 401);

  const userId = String(payload.userId);
  const supabase = getSupabaseConfig(env);
  if (!supabase) return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);

  try {
    const rows = await querySupabase(supabase, 'user_profiles', {
      select: '*',
      eq: { user_id: userId },
      limit: '1',
    });
    let profile = Array.isArray(rows) ? rows[0] : rows;

    if (!profile) {
      const d1User = await env.DB.prepare(
        'SELECT id, username, email, firstname, lastname, role, created_at FROM users WHERE id = ?'
      )
        .bind(payload.userId)
        .first();

      const now = new Date().toISOString();
      const defaultProfile = {
        user_id: userId,
        username: payload.username || (d1User?.username ?? ''),
        avatar_url: null,
        registered_date: d1User?.created_at || now,
        self_description: null,
        email: payload.email || (d1User?.email ?? ''),
        telephone: null,
        company_name: null,
        address: null,
        mail_code: null,
        user_category: payload.role ?? 1,
        contribution_value: '0',
        personal_remarks: null,
        created_at: now,
        updated_at: now,
      };
      try {
        profile = await supabaseUpsert(supabase, 'user_profiles', defaultProfile);
      } catch (upsertErr) {
        return jsonResponse({ success: false, error: upsertErr.message }, 500);
      }
    }

    return jsonResponse({
      success: true,
      profile: {
        user_id: profile.user_id,
        username: profile.username,
        avatar_url: profile.avatar_url || null,
        registered_date: profile.registered_date,
        self_description: profile.self_description || '',
        email: profile.email || '',
        telephone: profile.telephone || '',
        company_name: profile.company_name || '',
        address: profile.address || '',
        mail_code: profile.mail_code || '',
        user_category: profile.user_category ?? 1,
        contribution_value: profile.contribution_value || '0',
        personal_remarks: profile.personal_remarks || '',
      },
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

/** @param {Request} request @param {object} env @param {object} data - Validated profile patch */
export async function handlePutProfile(request, env, data) {
  const token = extractToken(request);
  if (!token) return errorResponse('需要登录', 401);

  let payload;
  try {
    payload = verifyToken(token, env);
  } catch {
    return errorResponse('Token 验证失败', 401);
  }
  if (!payload) return errorResponse('Token 无效或已过期', 401);

  const patch = data;
  if (Object.keys(patch).length === 0) return errorResponse('没有可更新的字段', 400);

  const userId = String(payload.userId);

  const supabase = getSupabaseConfig(env);
  if (!supabase) return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);

  try {
    const rows = await querySupabase(supabase, 'user_profiles', {
      select: 'user_id',
      eq: { user_id: userId },
      limit: '1',
    });
    const exists = Array.isArray(rows) ? rows[0] : rows;

    if (!exists) {
      const now = new Date().toISOString();
      const d1User = await env.DB.prepare(
        'SELECT username, email, role, created_at FROM users WHERE id = ?'
      )
        .bind(payload.userId)
        .first();
      const fullRow = {
        user_id: userId,
        username: patch.username ?? payload.username ?? (d1User?.username || ''),
        avatar_url: patch.avatar_url ?? null,
        registered_date: d1User?.created_at || now,
        self_description: patch.self_description ?? null,
        email: patch.email ?? payload.email ?? (d1User?.email || ''),
        telephone: patch.telephone ?? null,
        company_name: patch.company_name ?? null,
        address: patch.address ?? null,
        mail_code: patch.mail_code ?? null,
        user_category: patch.user_category ?? d1User?.role ?? 1,
        contribution_value: patch.contribution_value ?? '0',
        personal_remarks: patch.personal_remarks ?? null,
        created_at: now,
        updated_at: now,
      };
      await supabaseUpsert(supabase, 'user_profiles', fullRow);
    } else {
      patch.updated_at = new Date().toISOString();
      await supabasePatch(supabase, 'user_profiles', { user_id: userId }, patch);
    }

    const updated = await querySupabase(supabase, 'user_profiles', {
      select: '*',
      eq: { user_id: userId },
      limit: '1',
    });
    const profile = Array.isArray(updated) ? updated[0] : updated;

    return jsonResponse({
      success: true,
      profile: {
        user_id: profile.user_id,
        username: profile.username,
        avatar_url: profile.avatar_url || null,
        registered_date: profile.registered_date,
        self_description: profile.self_description || '',
        email: profile.email || '',
        telephone: profile.telephone || '',
        company_name: profile.company_name || '',
        address: profile.address || '',
        mail_code: profile.mail_code || '',
        user_category: profile.user_category ?? 1,
        contribution_value: profile.contribution_value || '0',
        personal_remarks: profile.personal_remarks || '',
      },
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

export async function handleAvatarUpload(request, env) {
  try {
    const token = extractToken(request);
    if (!token) return errorResponse('需要登录', 401);

    let payload;
    try {
      payload = verifyToken(token, env);
    } catch {
      return errorResponse('Token 验证失败', 401);
    }
    if (!payload) return errorResponse('Token 无效或已过期', 401);

    const formData = await request.formData();
    const file = formData.get('avatar');
    if (!file || !(file instanceof File))
      return errorResponse('请选择图片文件 (avatar 字段)', 400);

    if (!AVATAR_TYPES.includes(file.type?.toLowerCase()))
      return errorResponse('仅支持 JPEG, PNG, GIF, WebP', 400);
    if (file.size > AVATAR_MAX_SIZE) return errorResponse('图片过大，最大 500KB', 400);

    if (!env.MY_BUCKET) return errorResponse('文件存储未配置', 500);

    const key = generateAvatarKey(String(payload.userId), file.name);
    await env.MY_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalFilename: file.name, uploadedAt: new Date().toISOString() },
    });

    const avatarUrl = '/api/files/' + key;

    const supabase = getSupabaseConfig(env);
    if (supabase) {
      const rows = await querySupabase(supabase, 'user_profiles', {
        select: 'user_id',
        eq: { user_id: String(payload.userId) },
        limit: '1',
      });
      const exists = Array.isArray(rows) ? rows[0] : rows;
      if (exists) {
        await supabasePatch(supabase, 'user_profiles', { user_id: String(payload.userId) }, {
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });
      } else {
        const now = new Date().toISOString();
        const d1User = await env.DB.prepare(
          'SELECT username, email, role, created_at FROM users WHERE id = ?'
        )
          .bind(payload.userId)
          .first();
        await supabaseUpsert(supabase, 'user_profiles', {
          user_id: String(payload.userId),
          username: payload.username ?? d1User?.username ?? '',
          avatar_url: avatarUrl,
          registered_date: d1User?.created_at || now,
          email: payload.email ?? d1User?.email ?? '',
          user_category: d1User?.role ?? 1,
          contribution_value: '0',
          created_at: now,
          updated_at: now,
        });
      }
    }

    return jsonResponse({ success: true, avatar_url: avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
