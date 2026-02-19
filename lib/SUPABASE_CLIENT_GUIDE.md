# Supabase 客户端使用指南

本文档介绍如何在 Cloudflare Workers 中使用 Supabase 客户端。

## 文件结构

```
lib/
├── supabase.ts                    # Supabase 客户端核心文件
└── supabase-worker-example.ts     # Worker 使用示例
```

## 核心功能

### 1. `getSupabase(env)` - 基本客户端

创建一个标准的 Supabase 客户端实例，用于公共数据访问。

```typescript
import { getSupabase } from './lib/supabase'

const supabase = getSupabase(env)

// 查询数据
const { data, error } = await supabase
  .from('posts')
  .select('*')
```

**特点**:
- 使用 `anon` 密钥
- 适用于公共数据访问
- 自动刷新令牌
- 不持久化 session（适合 Workers 无状态环境）

### 2. `getSupabaseWithAuth(env, token)` - 认证客户端

创建一个带有用户认证令牌的 Supabase 客户端，用于需要用户身份的操作。

```typescript
import { getSupabaseWithAuth, extractTokenFromRequest } from './lib/supabase'

// 从请求头中提取令牌
const token = extractTokenFromRequest(request)

if (token) {
  const supabase = getSupabaseWithAuth(env, token)
  
  // 验证用户
  const { data: { user } } = await supabase.auth.getUser()
  
  // 以用户身份查询数据
  const { data } = await supabase
    .from('user_posts')
    .select('*')
    .eq('user_id', user.id)
}
```

**特点**:
- 使用用户的 JWT 令牌
- 自动应用 Row Level Security (RLS) 策略
- 适用于需要用户身份的操作

### 3. `extractTokenFromRequest(request)` - 令牌提取

从 HTTP 请求中提取 JWT 令牌。

```typescript
const token = extractTokenFromRequest(request)
// 支持: "Bearer <token>" 或直接 "<token>"
```

### 4. `isSupabaseConfigured(env)` - 配置验证

检查 Supabase 环境变量是否已正确配置。

```typescript
if (!isSupabaseConfigured(env)) {
  return new Response('Supabase not configured', { status: 500 })
}
```

## 完整 Worker 示例

### 基础结构

```typescript
import { getSupabase, Env } from './lib/supabase'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const supabase = getSupabase(env)
    
    // 您的业务逻辑
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
    
    return new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
```

### 认证路由示例

```typescript
import { getSupabaseWithAuth, extractTokenFromRequest, Env } from './lib/supabase'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)
    
    // 公开路由
    if (url.pathname === '/api/public/posts') {
      const supabase = getSupabase(env)
      const { data } = await supabase.from('posts').select('*')
      return new Response(JSON.stringify({ data }))
    }
    
    // 需要认证的路由
    if (url.pathname === '/api/user/profile') {
      const token = extractTokenFromRequest(request)
      
      if (!token) {
        return new Response('Unauthorized', { status: 401 })
      }
      
      const supabase = getSupabaseWithAuth(env, token)
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return new Response('Invalid token', { status: 401 })
      }
      
      // 获取用户数据
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      return new Response(JSON.stringify({ user, profile: data }))
    }
    
    return new Response('Not Found', { status: 404 })
  }
}
```

## 常见操作示例

### 查询数据

```typescript
// 简单查询
const { data, error } = await supabase
  .from('posts')
  .select('*')

// 带条件查询
const { data } = await supabase
  .from('posts')
  .select('id, title, author:users(name)')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(10)

// 单条记录
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('id', postId)
  .single()
```

### 插入数据

```typescript
const { data, error } = await supabase
  .from('posts')
  .insert({
    title: 'New Post',
    content: 'Post content',
    author_id: user.id
  })
  .select()
  .single()
```

### 更新数据

```typescript
const { data, error } = await supabase
  .from('posts')
  .update({ 
    title: 'Updated Title',
    updated_at: new Date().toISOString()
  })
  .eq('id', postId)
  .select()
```

### 删除数据

```typescript
const { error } = await supabase
  .from('posts')
  .delete()
  .eq('id', postId)
```

### 用户认证操作

```typescript
// 获取当前用户
const { data: { user }, error } = await supabase.auth.getUser()

// 用户登录 (通常在前端完成)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// 退出登录
const { error } = await supabase.auth.signOut()
```

## 错误处理

```typescript
const { data, error } = await supabase
  .from('posts')
  .select('*')

if (error) {
  console.error('Supabase error:', error.message)
  return new Response(
    JSON.stringify({ 
      error: error.message,
      details: error.details,
      hint: error.hint
    }), 
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

return new Response(JSON.stringify({ data }))
```

## 环境变量配置

### 本地开发 (`.dev.vars`)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 生产环境

```bash
# 设置生产环境密钥
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```

## TypeScript 类型支持

### 定义数据库类型

```typescript
// types/database.types.ts
export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string
          title: string
          content: string
          author_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          author_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author_id?: string
          created_at?: string
        }
      }
    }
  }
}
```

### 使用类型

```typescript
import { getSupabase } from './lib/supabase'
import { Database } from './types/database.types'

const supabase = getSupabase<Database>(env)

// 现在有完整的类型提示
const { data } = await supabase
  .from('posts')
  .select('*')
// data 的类型是 Database['public']['Tables']['posts']['Row'][]
```

## Row Level Security (RLS)

Supabase 的 RLS 策略会自动应用到使用认证令牌的请求上。

### 示例策略 (在 Supabase Dashboard 中设置)

```sql
-- 允许用户查看所有已发布的文章
CREATE POLICY "Public posts are viewable by everyone"
ON posts FOR SELECT
USING (status = 'published');

-- 用户只能更新自己的文章
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (auth.uid() = author_id);

-- 用户可以插入文章
CREATE POLICY "Authenticated users can insert posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = author_id);
```

### 在 Worker 中的应用

```typescript
// 使用 getSupabase (anon key) - 只能看到 published 的文章
const supabase = getSupabase(env)
const { data } = await supabase.from('posts').select('*')
// 只返回 status='published' 的记录

// 使用 getSupabaseWithAuth (user token) - 可以看到自己的所有文章
const token = extractTokenFromRequest(request)
const supabaseAuth = getSupabaseWithAuth(env, token)
const { data: myPosts } = await supabaseAuth
  .from('posts')
  .select('*')
  .eq('author_id', user.id)
// 可以访问自己的所有文章，包括未发布的
```

## 性能优化

### 1. 选择必要的字段

```typescript
// ❌ 不好 - 获取所有字段
const { data } = await supabase.from('posts').select('*')

// ✅ 好 - 只获取需要的字段
const { data } = await supabase
  .from('posts')
  .select('id, title, created_at')
```

### 2. 使用分页

```typescript
const page = 1
const pageSize = 20

const { data, error, count } = await supabase
  .from('posts')
  .select('*', { count: 'exact' })
  .range(page * pageSize, (page + 1) * pageSize - 1)
```

### 3. 使用索引

确保在 Supabase 中为常用查询字段创建索引。

```sql
-- 在 Supabase SQL Editor 中执行
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

## 调试技巧

### 启用详细日志

```typescript
const supabase = getSupabase(env)

// 查看请求详情
console.log('Querying posts...')
const { data, error } = await supabase
  .from('posts')
  .select('*')

console.log('Response:', { data, error })
```

### 检查环境变量

```typescript
console.log('SUPABASE_URL:', env.SUPABASE_URL ? '✓ Set' : '✗ Not set')
console.log('SUPABASE_ANON_KEY:', env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set')
```

## 常见问题

### Q: 为什么 `persistSession: false`？

**A**: Cloudflare Workers 是无状态的，每个请求都在隔离的环境中运行。持久化 session 需要存储（如 KV），在大多数情况下不需要。

### Q: 如何处理用户认证？

**A**: 通常用户在前端使用 Supabase Auth 登录，获得 JWT 令牌，然后在请求 Worker 时通过 `Authorization` 头传递令牌。

### Q: 可以使用 Service Role Key 吗？

**A**: 可以，但要非常小心。Service Role Key 绕过所有 RLS 策略，应该只用于管理操作，并且必须存储为 secret。

```typescript
// 仅用于管理操作
const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY // 使用 wrangler secret put 设置
)
```

## 相关资源

- [Supabase JavaScript 文档](https://supabase.com/docs/reference/javascript/introduction)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Supabase RLS 指南](https://supabase.com/docs/guides/auth/row-level-security)
- [完整示例代码](./supabase-worker-example.ts)

## 下一步

1. 在 Supabase Dashboard 中创建表和 RLS 策略
2. 在 `.dev.vars` 中配置环境变量
3. 使用 `wrangler dev` 测试本地开发
4. 部署到生产环境: `wrangler deploy`

---

**创建时间**: 2026-02-15  
**版本**: 1.0.0
