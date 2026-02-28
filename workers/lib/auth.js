/**
 * JWT and password utilities for JJConnect Worker
 */

/** Token expiration time (24 hours) */
export const TOKEN_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Get JWT secret from environment
 * @param {Object} env - Cloudflare Worker environment
 */
export const getJwtSecret = (env) =>
  env.JWT_SECRET || 'your-secret-key-change-this-in-production';

/**
 * Password hashing using Web Crypto API (SHA-256)
 * 使用 SHA-256 进行密码哈希（用于本地开发测试）
 * 生产环境建议使用 bcrypt 或 Argon2 (通过 WebAssembly)
 */
export async function hashPassword(password, env) {
  try {
    const encoder = new TextEncoder();
    const salt = getJwtSecret(env);
    const data = encoder.encode(password + salt);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    console.error('Hash password error:', error);
    throw new Error(`密码哈希失败: ${error.message}`);
  }
}

/**
 * Password verification using SHA-256
 */
export async function verifyPassword(password, hashedPassword, env) {
  try {
    const newHash = await hashPassword(password, env);
    return newHash === hashedPassword;
  } catch (error) {
    console.error('Verify password error:', error);
    return false;
  }
}

/**
 * Simple JWT token creation (基础实现)
 * 生产环境建议使用专业的 JWT 库，例如 `@tsndr/cloudflare-worker-jwt`
 */
export function createToken(payload, env) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Date.now();
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRATION,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(tokenPayload));

  const signature = btoa(`${encodedHeader}.${encodedPayload}.${getJwtSecret(env)}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify JWT token (基础实现)
 */
export function verifyToken(token, env) {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));

    if (payload.exp < Date.now()) {
      return null;
    }

    const expectedSignature = btoa(`${parts[0]}.${parts[1]}.${getJwtSecret(env)}`);
    if (parts[2] !== expectedSignature) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Extract token from request
 */
export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith('auth_token='));
    if (tokenCookie) {
      return tokenCookie.substring(11);
    }
  }

  return null;
}
