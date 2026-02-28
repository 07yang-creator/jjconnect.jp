/**
 * Auth route handlers: login, logout, auth check, account check, register
 */

import { jsonResponse, errorResponse } from '../lib/http.js';
import { querySupabase } from '../lib/supabase.js';
import { getSupabaseConfig } from '../lib/supabase.js';
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  extractToken,
} from '../lib/auth.js';
import { findUserByUsernameOrEmail } from '../lib/db.js';
import { loginSchema, registerSchema, accountCheckSchema } from '../lib/schemas.js';
import { sendWelcomeEmail } from '../lib/email.js';

/** @param {Request} request @param {object} env @param {{ username: string; password: string }} data */
export async function handleLogin(request, env, data) {
  try {
    const { username, password } = data;

    let user;
    try {
      user = await findUserByUsernameOrEmail(username, env);
    } catch (dbError) {
      console.error('Database query error (login):', dbError);
      return errorResponse(`数据库查询失败: ${dbError.message}`, 500);
    }

    if (!user) {
      return errorResponse('用户名或密码错误', 401);
    }

    const isValidPassword = await verifyPassword(password, user.password_hash, env);
    if (!isValidPassword) {
      return errorResponse('用户名或密码错误', 401);
    }

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: `${user.firstname} ${user.lastname}`,
    };

    const token = createToken(tokenPayload, env);

    return jsonResponse({
      success: true,
      message: '登录成功',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: `${user.firstname} ${user.lastname}`,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(`登录失败: ${error.message}`, 500);
  }
}

export async function handleAuthCheck(request, env) {
  try {
    const token = extractToken(request);

    if (!token) {
      return jsonResponse({ authenticated: false, message: '未登录' }, 401);
    }

    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return jsonResponse(
        { authenticated: false, message: `Token 验证失败: ${tokenError.message}` },
        401
      );
    }

    if (!payload) {
      return jsonResponse({ authenticated: false, message: 'Token 无效或已过期' }, 401);
    }

    let avatar_url = null;
    const supabase = getSupabaseConfig(env);
    if (supabase) {
      try {
        const rows = await querySupabase(supabase, 'user_profiles', {
          select: 'avatar_url',
          eq: { user_id: String(payload.userId) },
          limit: '1',
        });
        const p = Array.isArray(rows) ? rows[0] : rows;
        if (p && p.avatar_url) avatar_url = p.avatar_url;
      } catch (e) {
        /* ignore */
      }
    }

    return jsonResponse({
      authenticated: true,
      user: {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
        avatar_url: avatar_url,
        role: payload.role,
        name: payload.name,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return errorResponse(`认证检查失败: ${error.message}`, 500);
  }
}

export async function handleLogout() {
  return jsonResponse({
    success: true,
    message: '登出成功',
  });
}

/** @param {Request} request @param {object} env @param {{ identifier: string }} data */
export async function handleAccountCheck(request, env, data) {
  try {
    const user = await findUserByUsernameOrEmail(data.identifier.trim(), env);
    return jsonResponse({ exists: !!user });
  } catch (dbError) {
    console.error('Account check error:', dbError);
    return errorResponse(`Account check failed: ${dbError.message}`, 500);
  }
}

/** @param {Request} request @param {object} env @param {{ firstname: string; lastname: string; username: string; email: string; password: string; role: number }} data */
export async function handleRegister(request, env, data) {
  try {
    const { firstname, lastname, username, email, password, role } = data;

    if (!env.DB) {
      return errorResponse(
        '数据库绑定 (env.DB) 不存在。请检查 wrangler.toml 中的 [[d1_databases]] 配置',
        500
      );
    }

    let existingUserByUsername;
    try {
      existingUserByUsername = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
        .bind(username)
        .first();
    } catch (dbError) {
      return errorResponse(`数据库查询失败 (检查用户名): ${dbError.message}`, 500);
    }
    if (existingUserByUsername) return errorResponse('用户名已被使用', 409);

    let existingUserByEmail;
    try {
      existingUserByEmail = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(email)
        .first();
    } catch (dbError) {
      return errorResponse(`数据库查询失败 (检查邮箱): ${dbError.message}`, 500);
    }
    if (existingUserByEmail) return errorResponse('邮箱已被注册', 409);

    const userRole = parseInt(role) || 0;
    if (userRole > 1) {
      return errorResponse('无法注册管理员账号，管理员账号只能由现有管理员创建', 403);
    }

    let password_hash;
    try {
      password_hash = await hashPassword(password, env);
    } catch (hashError) {
      return errorResponse(`密码哈希失败: ${hashError.message}`, 500);
    }

    let insertResult;
    try {
      insertResult = await env.DB.prepare(
        'INSERT INTO users (username, email, password_hash, firstname, lastname, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          username.trim(),
          email.trim(),
          password_hash,
          firstname.trim(),
          lastname.trim(),
          userRole,
          0
        )
        .run();
    } catch (dbError) {
      if (dbError.message?.includes('no such table')) {
        return errorResponse(`数据库表不存在: ${dbError.message}`, 500);
      }
      if (dbError.message?.includes('UNIQUE constraint')) {
        return errorResponse(`唯一性约束冲突: ${dbError.message}`, 409);
      }
      if (dbError.message?.includes('no such column')) {
        return errorResponse(`数据库字段不存在: ${dbError.message}`, 500);
      }
      if (dbError.message?.includes('NOT NULL constraint')) {
        return errorResponse(`字段不能为空: ${dbError.message}`, 400);
      }
      return errorResponse(`数据库插入失败: ${dbError.message}`, 500);
    }

    if (!insertResult?.success) {
      return errorResponse(`用户插入失败: ${insertResult?.error || 'unknown'}`, 500);
    }

    let newUser;
    try {
      newUser = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
        .bind(username)
        .first();
    } catch (dbError) {
      return errorResponse(`数据库查询失败 (获取新用户): ${dbError.message}`, 500);
    }

    if (!newUser) {
      return errorResponse('注册成功但无法获取用户信息，请尝试登录', 500);
    }

    try {
      const emailResult = await sendWelcomeEmail(
        newUser.email,
        `${newUser.firstname} ${newUser.lastname}`
      );
      if (!emailResult.success) {
        console.error('⚠️ Failed to send welcome email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('⚠️ Welcome email error:', emailError);
    }

    const tokenPayload = {
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      name: `${newUser.firstname} ${newUser.lastname}`,
    };

    const token = createToken(tokenPayload, env);

    return jsonResponse(
      {
        success: true,
        message: '注册成功',
        token: token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          name: `${newUser.firstname} ${newUser.lastname}`,
        },
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse(`注册失败: ${error.message}`, 500);
  }
}
