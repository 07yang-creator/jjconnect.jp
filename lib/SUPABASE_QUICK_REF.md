# Supabase 客户端快速参考

## 快速开始

### 1. 导入客户端

```typescript
import { getSupabase, getSupabaseWithAuth, extractTokenFromRequest } from './lib/supabase'
```

### 2. 基本使用（公共数据）

```typescript
const supabase = getSupabase(env)
const { data } = await supabase.from('posts').select('*')
```

### 3. 认证使用（用户数据）

```typescript
const token = extractTokenFromRequest(request)
const supabase = getSupabaseWithAuth(env, token)
const { data: { user } } = await supabase.auth.getUser()
```

## 核心 API

### getSupabase(env)
创建标准客户端，用于公共数据访问

### getSupabaseWithAuth(env, token)
创建认证客户端，用于用户特定操作

### extractTokenFromRequest(request)
从请求头提取 JWT 令牌

### isSupabaseConfigured(env)
检查环境变量是否已配置

## 常用查询

```typescript
// 查询所有
await supabase.from('posts').select('*')

// 条件查询
await supabase.from('posts').select('*').eq('status', 'published')

// 关联查询
await supabase.from('posts').select('*, author:users(name)')

// 单条记录
await supabase.from('posts').select('*').eq('id', id).single()

// 插入
await supabase.from('posts').insert({ title: 'New' }).select()

// 更新
await supabase.from('posts').update({ title: 'Updated' }).eq('id', id)

// 删除
await supabase.from('posts').delete().eq('id', id)
```

## Worker 模板

```typescript
import { getSupabase, getSupabaseWithAuth, extractTokenFromRequest, Env } from './lib/supabase'

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    
    // 公共路由
    if (url.pathname === '/api/posts') {
      const supabase = getSupabase(env)
      const { data } = await supabase.from('posts').select('*')
      return Response.json({ data })
    }
    
    // 认证路由
    if (url.pathname === '/api/me') {
      const token = extractTokenFromRequest(request)
      if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      
      const supabase = getSupabaseWithAuth(env, token)
      const { data: { user } } = await supabase.auth.getUser()
      return Response.json({ user })
    }
    
    return Response.json({ error: 'Not Found' }, { status: 404 })
  }
}
```

## 环境配置

### .dev.vars (本地)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### 生产环境
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```

## TypeScript 类型

客户端已配置完整类型支持，查询会自动获得类型提示：

```typescript
const { data } = await supabase.from('posts').select('*')
// data 类型: Post[] | null
```

## 文件清单

- `lib/supabase.ts` - 核心客户端实现 ✅
- `lib/supabase-worker-example.ts` - 完整示例 ✅
- `types/database.types.ts` - 数据库类型定义 ✅
- `lib/SUPABASE_CLIENT_GUIDE.md` - 详细文档 ✅

## 相关文档

- [完整使用指南](./SUPABASE_CLIENT_GUIDE.md)
- [Worker 示例](./supabase-worker-example.ts)
- [Supabase 官方文档](https://supabase.com/docs)

---

**状态**: ✅ 准备就绪
