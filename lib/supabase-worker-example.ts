/**
 * Supabase Worker 使用示例
 * 
 * 此文件展示了如何在 Cloudflare Workers 中使用 Supabase 客户端
 */

import { getSupabase, getSupabaseWithAuth, extractTokenFromRequest, Env } from '../lib/supabase'

/**
 * Worker 入口点 - 基本使用示例
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // 路由处理
      switch (path) {
        case '/api/users':
          return await handleGetUsers(request, env)
        
        case '/api/auth/user':
          return await handleAuthenticatedRequest(request, env)
        
        case '/api/posts':
          return await handleGetPosts(request, env)
        
        case '/api/health':
          return await handleHealthCheck(env)
        
        default:
          return new Response('Not Found', { status: 404 })
      }
    } catch (error) {
      console.error('Worker error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * 示例 1: 基本的数据库查询
 */
async function handleGetUsers(request: Request, env: Env): Promise<Response> {
  // 创建 Supabase 客户端
  const supabase = getSupabase(env)

  // 查询用户列表
  const { data, error } = await supabase
    .from('users')
    .select('id, email, created_at')
    .limit(10)

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ users: data }), 
    { 
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * 示例 2: 使用认证令牌的请求
 */
async function handleAuthenticatedRequest(request: Request, env: Env): Promise<Response> {
  // 从请求中提取令牌
  const token = extractTokenFromRequest(request)

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - No token provided' }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // 创建带认证的 Supabase 客户端
  const supabase = getSupabaseWithAuth(env, token)

  // 获取当前用户信息
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid token' }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // 查询用户特定的数据
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ user, profile: data }), 
    { 
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * 示例 3: 处理 POST 请求 - 创建新记录
 */
async function handleGetPosts(request: Request, env: Env): Promise<Response> {
  const supabase = getSupabase(env)

  if (request.method === 'GET') {
    // 获取文章列表
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, content, created_at, author:users(id, email)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ posts: data }), 
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  if (request.method === 'POST') {
    // 创建新文章
    const token = extractTokenFromRequest(request)
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const supabaseAuth = getSupabaseWithAuth(env, token)
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const body = await request.json() as { title: string; content: string }

    const { data, error } = await supabaseAuth
      .from('posts')
      .insert({
        title: body.title,
        content: body.content,
        author_id: user.id
      })
      .select()
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ post: data }), 
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response('Method Not Allowed', { status: 405 })
}

/**
 * 示例 4: 健康检查端点
 */
async function handleHealthCheck(env: Env): Promise<Response> {
  try {
    // 创建 Supabase 客户端并测试连接
    const supabase = getSupabase(env)
    
    // 简单的查询来测试连接
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (error) {
      return new Response(
        JSON.stringify({ 
          status: 'unhealthy',
          error: error.message
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
      }), 
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
