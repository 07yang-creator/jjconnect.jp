/**
 * Supabase Client for Cloudflare Workers
 * 
 * 此文件提供了一个适用于 Cloudflare Workers 环境的 Supabase 客户端初始化函数。
 * 
 * @module lib/supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

/**
 * Cloudflare Workers 环境变量接口
 * 定义了 Worker 运行时所需的环境变量
 */
export interface Env {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  // 可以根据需要添加其他环境变量
  // DB?: D1Database
  // KV?: KVNamespace
}

/**
 * 创建并返回一个 Supabase 客户端实例
 * 
 * 此函数从 Cloudflare Workers 的 env 对象中读取 Supabase 配置，
 * 并返回一个配置好的 Supabase 客户端实例。
 * 
 * @param env - Cloudflare Workers 环境变量对象
 * @returns 配置好的 Supabase 客户端实例
 * 
 * @throws 如果环境变量未设置，将抛出错误
 * 
 * @example
 * ```typescript
 * // 在 Worker 的 fetch 处理器中使用
 * export default {
 *   async fetch(request: Request, env: Env, ctx: ExecutionContext) {
 *     const supabase = getSupabase(env)
 *     
 *     const { data, error } = await supabase
 *       .from('users')
 *       .select('*')
 *     
 *     return new Response(JSON.stringify({ data }))
 *   }
 * }
 * ```
 */
export function getSupabase(env: Env): SupabaseClient<Database> {
  // 验证环境变量
  if (!env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not set in environment variables')
  }
  
  if (!env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is not set in environment variables')
  }

  // 创建并返回 Supabase 客户端（带类型支持）
  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      auth: {
        // Cloudflare Workers 环境配置
        autoRefreshToken: true,
        persistSession: false, // Workers 环境不持久化 session
        detectSessionInUrl: false, // Workers 通常不需要从 URL 检测 session
      },
      global: {
        // 可以添加自定义请求头
        headers: {
          'X-Client-Info': 'cloudflare-workers',
        },
      },
    }
  )

  return supabase
}

/**
 * 创建带有自定义认证令牌的 Supabase 客户端
 * 
 * 用于需要使用特定用户身份进行操作的场景
 * 
 * @param env - Cloudflare Workers 环境变量对象
 * @param accessToken - 用户的访问令牌 (JWT)
 * @returns 配置了认证令牌的 Supabase 客户端实例
 * 
 * @example
 * ```typescript
 * // 使用用户的访问令牌
 * const token = request.headers.get('Authorization')?.replace('Bearer ', '')
 * const supabase = getSupabaseWithAuth(env, token)
 * ```
 */
export function getSupabaseWithAuth(env: Env, accessToken: string): SupabaseClient<Database> {
  if (!env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not set in environment variables')
  }
  
  if (!env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is not set in environment variables')
  }

  if (!accessToken) {
    throw new Error('Access token is required')
  }

  // 创建带有认证令牌的客户端（带类型支持）
  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Client-Info': 'cloudflare-workers',
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )

  return supabase
}

/**
 * 从请求中提取 JWT 令牌
 * 
 * @param request - HTTP 请求对象
 * @returns JWT 令牌字符串，如果不存在则返回 null
 * 
 * @example
 * ```typescript
 * const token = extractTokenFromRequest(request)
 * if (token) {
 *   const supabase = getSupabaseWithAuth(env, token)
 * }
 * ```
 */
export function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader) {
    return null
  }

  // 支持 "Bearer <token>" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 直接返回令牌
  return authHeader
}

/**
 * 验证 Supabase 环境变量是否已配置
 * 
 * @param env - Cloudflare Workers 环境变量对象
 * @returns 如果所有必需的环境变量都已设置，返回 true
 * 
 * @example
 * ```typescript
 * if (!isSupabaseConfigured(env)) {
 *   return new Response('Supabase not configured', { status: 500 })
 * }
 * ```
 */
export function isSupabaseConfigured(env: Env): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
}

/**
 * Alias for getSupabase for compatibility
 * @deprecated Use getSupabase instead
 */
export const getSupabaseClient = getSupabase
