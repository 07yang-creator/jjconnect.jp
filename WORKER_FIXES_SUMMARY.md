# Worker 修复总结

## ✅ 完成的修复

### 1. **统一 JSON 返回格式** ✓

所有接口现在都使用 `errorResponse()` 或 `jsonResponse()` 函数返回 JSON 格式：

```javascript
// 错误响应格式
{
  "success": false,
  "error": "错误信息"
}

// 成功响应格式
{
  "success": true,
  "message": "操作成功",
  "token": "...",
  "user": { ... }
}
```

**修改的地方：**
- `/api/register` 中所有的 `new Response(errorMsg, { ... 'Content-Type': 'text/plain' ... })` 
- 全部改为 `errorResponse(errorMsg, statusCode)`
- 确保返回 `Content-Type: application/json`

### 2. **密码哈希改用 SHA-256** ✓

使用 Web Crypto API 实现 SHA-256 密码哈希（本地开发可用）：

```javascript
async function hashPassword(password, env) {
  const encoder = new TextEncoder();
  const salt = getJwtSecret(env);
  const data = encoder.encode(password + salt);
  
  // SHA-256 哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // 转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
```

**优点：**
- ✅ 不需要安装额外的 npm 包
- ✅ Cloudflare Workers 原生支持
- ✅ 适合本地开发测试
- ⚠️ 生产环境建议使用 bcrypt (通过 WebAssembly)

### 3. **数据库字段完全匹配** ✓

INSERT 语句与 `schema.sql` 完全一致：

```sql
INSERT INTO users (
  username,       -- TEXT UNIQUE NOT NULL
  email,          -- TEXT UNIQUE NOT NULL
  password_hash,  -- TEXT NOT NULL
  firstname,      -- TEXT NOT NULL
  lastname,       -- TEXT NOT NULL
  role,           -- INTEGER DEFAULT 0
  email_verified  -- BOOLEAN DEFAULT 0
) VALUES (?, ?, ?, ?, ?, ?, ?)
```

**绑定参数顺序：**
```javascript
.bind(
  username.trim(),    // 1. username
  email.trim(),       // 2. email
  password_hash,      // 3. password_hash (SHA-256 哈希后的结果)
  firstname.trim(),   // 4. firstname
  lastname.trim(),    // 5. lastname
  userRole,           // 6. role (0: Viewer, 1: Editor, 2: Admin)
  0                   // 7. email_verified (0 = false)
)
```

### 4. **完整的 CORS 支持** ✓

所有响应都包含完整的 CORS 头部：

```javascript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};
```

**实现方式：**
- `jsonResponse()` 函数自动添加 CORS 头
- `errorResponse()` 函数自动添加 CORS 头
- OPTIONS 预检请求由 `handleOptions()` 处理

---

## 📋 API 响应格式示例

### 成功注册

**请求：**
```bash
POST http://localhost:8787/api/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "firstname": "Test",
  "lastname": "User",
  "role": 0
}
```

**响应 (201)：**
```json
{
  "success": true,
  "message": "注册成功",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role": 0,
    "name": "Test User"
  }
}
```

### 错误：用户名已存在

**响应 (409)：**
```json
{
  "success": false,
  "error": "用户名已被使用"
}
```

### 错误：数据库表不存在

**响应 (500)：**
```json
{
  "success": false,
  "error": "数据库表不存在: no such table: users。请先运行命令创建表: npx wrangler d1 execute jjconnect-db --local --file=schema.sql"
}
```

### 错误：字段格式错误

**响应 (400)：**
```json
{
  "success": false,
  "error": "邮箱格式不正确"
}
```

---

## 🔧 测试步骤

### 1. 启动本地 Worker

```bash
cd /Users/mini23/Documents/GitHub/jjconnect.jp
npx wrangler dev
```

### 2. 确保数据库表已创建

```bash
npx wrangler d1 execute jjconnect-db --local --file=schema.sql
```

### 3. 测试注册接口

使用 `curl` 或浏览器开发者工具：

```bash
curl -X POST http://localhost:8787/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstname": "Test",
    "lastname": "User",
    "role": 0
  }'
```

### 4. 检查响应

- ✅ 响应头应包含 `Content-Type: application/json`
- ✅ 响应头应包含 `Access-Control-Allow-Origin: *`
- ✅ 响应体应为 JSON 格式（不是纯文本）
- ✅ 成功时返回 `success: true` 和 token
- ✅ 失败时返回 `success: false` 和具体的 error 信息

---

## 🎯 关键改进点

1. **统一返回格式**：所有接口都返回 JSON，前端可以统一解析
2. **密码哈希安全**：使用 SHA-256 替代简单字符串拼接
3. **数据库字段匹配**：INSERT 语句与 schema.sql 完全一致
4. **完整 CORS 支持**：前端不会再遇到跨域错误
5. **详细错误信息**：便于调试，快速定位问题
6. **控制台日志完善**：服务器端有详细的错误堆栈

---

## ⚠️ 生产环境注意事项

1. **密码哈希**：当前使用 SHA-256，生产环境请改用 bcrypt 或 Argon2
2. **CORS 策略**：将 `Access-Control-Allow-Origin: *` 改为具体域名
3. **JWT Secret**：使用 `wrangler secret put JWT_SECRET` 设置环境变量
4. **错误信息**：生产环境不要返回详细的数据库错误信息

---

## 📝 修改的文件

- `/Users/mini23/Documents/GitHub/jjconnect.jp/workers/auth-worker.js`
  - 修改 `hashPassword()` 和 `verifyPassword()` 函数
  - 修改 `handleRegister()` 函数中所有错误返回
  - 确保所有响应都包含 CORS 头部
  - 确保所有响应都是 JSON 格式

---

## 🚀 下一步

1. 测试注册接口是否正常工作
2. 测试登录接口是否可以使用注册的用户
3. 在 `login.html` 中测试完整的注册流程
4. 检查浏览器控制台是否还有 CORS 错误
5. 验证返回的 token 是否可以用于身份验证
