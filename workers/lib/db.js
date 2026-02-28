/**
 * D1 database queries for JJConnect Worker
 */

/**
 * Find user by username or email from D1 database
 * @param {string} identifier - Username or email
 * @param {Object} env - Cloudflare Worker environment with DB binding
 * @returns {Promise<Object|null>} User object or null
 */
export async function findUserByUsernameOrEmail(identifier, env) {
  try {
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    )
      .bind(identifier, identifier)
      .first();
    return user;
  } catch (dbError) {
    console.error('Database query error (findUserByUsernameOrEmail):', dbError);

    if (dbError.message && dbError.message.includes('no such table')) {
      throw new Error(`数据库表 'users' 不存在。请先运行 schema.sql: ${dbError.message}`);
    } else if (dbError.message && dbError.message.includes('no such column')) {
      throw new Error(`数据库字段不存在: ${dbError.message}`);
    } else {
      throw new Error(`数据库查询失败: ${dbError.message}`);
    }
  }
}
