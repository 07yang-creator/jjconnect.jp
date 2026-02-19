# Cloudflare Worker 登录系统 - 完整设置指南

## 📦 已创建的文件

1. **`workers/auth-worker.js`** - Cloudflare Worker 认证脚本
2. **`wrangler.toml`** - Wrangler 配置文件
3. **`package.json`** - NPM 包管理文件
4. **`login.html`** - 已更新，集成 Worker API

## 🚀 快速开始

### 步骤 1: 安装 Wrangler CLI

在项目根目录运行：

```bash
# 安装 wrangler (全局安装)
npm install -g wrangler

# 或者安装到项目本地
npm install
```

### 步骤 2: 登录 Cloudflare

```bash
# 登录到您的 Cloudflare 账户
wrangler login

# 验证登录状态
wrangler whoami
```

这会打开浏览器，让您授权 Wrangler 访问您的 Cloudflare 账户。

### 步骤 3: 获取 Account ID（可选但推荐）

1. 访问 https://dash.cloudflare.com/
2. 点击左侧 **Workers & Pages**
3. 在右侧找到您的 **Account ID**
4. 复制并粘贴到 `wrangler.toml` 中：

```toml
account_id = "your-account-id-here"
```

### 步骤 4: 本地测试

```bash
# 启动本地开发服务器
npm run dev

# 或直接使用 wrangler
wrangler dev
```

Worker 将在 `http://localhost:8787` 运行。

### 步骤 5: 测试登录功能

1. 在浏览器中打开 `login.html`
2. 使用测试账号登录：
   - **Admin**: `admin` / `admin123`
   - **Editor**: `editor` / `editor123`
   - **Viewer**: `viewer` / `viewer123`

### 步骤 6: 部署到 Cloudflare

```bash
# 部署到生产环境
npm run deploy

# 或使用 wrangler
wrangler deploy
```

部署成功后，您会看到 Worker 的 URL，例如：
```
https://jjconnect-auth-worker.your-subdomain.workers.dev
```

### 步骤 7: 更新前端 API 地址

在 `login.html` 中更新 API endpoint：

```javascript
// 将这行：
const API_ENDPOINT = 'http://localhost:8787';

// 改为您的 Worker URL：
const API_ENDPOINT = 'https://jjconnect-auth-worker.your-subdomain.workers.dev';
```

## 📋 API 端点文档

### 1. POST /api/login

**用途**: 用户登录

**请求**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@jjconnect.jp",
    "role": 2,
    "name": "Admin User"
  }
}
```

**失败响应** (401):
```json
{
  "success": false,
  "error": "用户名或密码错误"
}
```

### 2. GET /api/auth/check

**用途**: 检查用户认证状态

**请求头**:
```
Authorization: Bearer <token>
```

**成功响应** (200):
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@jjconnect.jp",
    "role": 2,
    "name": "Admin User"
  }
}
```

**失败响应** (401):
```json
{
  "authenticated": false,
  "message": "未登录"
}
```

### 3. POST /api/auth/logout

**用途**: 用户登出

**成功响应** (200):
```json
{
  "success": true,
  "message": "登出成功"
}
```

### 4. GET /api/users

**用途**: 获取用户列表（需要 Admin 权限）

**请求头**:
```
Authorization: Bearer <token>
```

**成功响应** (200):
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@jjconnect.jp",
      "role": 2,
      "name": "Admin User"
    }
  ]
}
```

### 5. GET /api/health

**用途**: 健康检查

**成功响应** (200):
```json
{
  "status": "ok",
  "timestamp": "2025-02-06T12:00:00.000Z"
}
```

## 🧪 测试 Worker

### 使用 curl 测试

```bash
# 测试健康检查
curl http://localhost:8787/api/health

# 测试登录
curl -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 测试认证检查（替换 <token> 为实际 token）
curl http://localhost:8787/api/auth/check \
  -H "Authorization: Bearer <token>"

# 测试获取用户列表
curl http://localhost:8787/api/users \
  -H "Authorization: Bearer <token>"
```

### 使用浏览器测试

1. 打开浏览器开发者工具 (F12)
2. 访问 `login.html`
3. 打开 **Network** 标签
4. 尝试登录
5. 查看请求和响应

## 🔧 在 Cursor 中配置

### 1. 安装 Wrangler 扩展（可选）

在 Cursor 中搜索并安装 "Cloudflare Workers" 扩展。

### 2. 配置 wrangler.toml

`wrangler.toml` 文件已经创建好了，您只需要：

1. 打开 `wrangler.toml`
2. 取消注释并填写 `account_id`：
   ```toml
   account_id = "your-account-id-here"
   ```

### 3. 设置 NPM Scripts

`package.json` 已包含以下脚本：

```json
{
  "scripts": {
    "dev": "wrangler dev",           // 本地开发
    "deploy": "wrangler deploy",     // 部署
    "tail": "wrangler tail",         // 查看日志
    "login": "wrangler login",       // 登录
    "whoami": "wrangler whoami"      // 查看当前用户
  }
}
```

### 4. 在 Cursor 终端中运行

1. 打开 Cursor 的集成终端 (`` Ctrl+` `` 或 `` Cmd+` ``)
2. 运行命令：
   ```bash
   npm run dev
   ```

### 5. 调试技巧

在 Worker 代码中添加 `console.log()`：

```javascript
console.log('Login attempt:', username);
```

然后在终端中运行：
```bash
npm run tail
```

这会实时显示 Worker 的日志输出。

## 🔐 测试账号

系统预设了三个测试账号：

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| admin | admin123 | Admin (2) | 完全权限 |
| editor | editor123 | Editor (1) | 编辑权限 |
| viewer | viewer123 | Viewer (0) | 只读权限 |

## 🛡️ 安全建议

### 开发环境

当前配置适合开发和测试：
- ✅ 密码硬编码在代码中
- ✅ JWT Secret 硬编码
- ✅ CORS 允许所有来源

### 生产环境

**必须**进行以下改进：

#### 1. 使用环境变量存储敏感信息

```bash
# 设置 JWT Secret
wrangler secret put JWT_SECRET
# 输入您的 secret

# 设置数据库密码
wrangler secret put DATABASE_PASSWORD
```

在 Worker 中使用：
```javascript
const JWT_SECRET = env.JWT_SECRET;
```

#### 2. 使用数据库存储用户

推荐使用 Cloudflare D1：

```bash
# 创建数据库
wrangler d1 create jjconnect-auth-db

# 在 wrangler.toml 中配置
[[d1_databases]]
binding = "DB"
database_name = "jjconnect-auth-db"
database_id = "your-database-id"
```

#### 3. 密码加密

使用 bcrypt 或类似库加密密码：

```javascript
// 安装 bcryptjs
npm install bcryptjs

// 在 Worker 中使用
import bcrypt from 'bcryptjs';

// 验证密码
const isValid = await bcrypt.compare(password, user.hashedPassword);
```

#### 4. 限制 CORS

在 `auth-worker.js` 中修改：

```javascript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://jjconnect.jp', // 只允许您的域名
  // ...
};
```

#### 5. 添加速率限制

防止暴力破解：

```javascript
// 使用 KV 存储登录尝试次数
const attempts = await env.AUTH_SESSIONS.get(`login:${username}`);
if (attempts > 5) {
  return errorResponse('登录尝试次数过多，请稍后再试', 429);
}
```

#### 6. 使用专业的 JWT 库

```bash
npm install @tsndr/cloudflare-worker-jwt
```

## 📊 监控和日志

### 查看实时日志

```bash
# 查看 Worker 日志
wrangler tail

# 查看特定环境的日志
wrangler tail --env production
```

### 在 Cloudflare Dashboard 查看

1. 访问 https://dash.cloudflare.com/
2. 点击 **Workers & Pages**
3. 选择您的 Worker
4. 查看 **Metrics** 和 **Logs**

## 🔄 更新和部署

### 更新 Worker 代码

1. 修改 `workers/auth-worker.js`
2. 本地测试：
   ```bash
   npm run dev
   ```
3. 部署到生产：
   ```bash
   npm run deploy
   ```

### 回滚版本

```bash
# 查看部署历史
wrangler deployments list

# 回滚到特定版本
wrangler rollback [deployment-id]
```

## 🐛 常见问题

### 问题 1: wrangler 命令不存在

**解决方案**:
```bash
npm install -g wrangler
```

### 问题 2: 登录失败 - CORS 错误

**解决方案**:
检查 Worker 是否正在运行：
```bash
npm run dev
```

### 问题 3: Token 验证失败

**解决方案**:
检查 token 是否正确存储：
```javascript
console.log('Token:', localStorage.getItem('auth_token'));
```

### 问题 4: 部署后 404 错误

**解决方案**:
确保 `wrangler.toml` 中的路由配置正确。

### 问题 5: 本地开发时无法访问

**解决方案**:
确保 Worker 在 8787 端口运行：
```bash
wrangler dev --port 8787
```

## 📚 更多资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/kv/)

## 🎯 下一步

1. ✅ 安装 Wrangler
2. ✅ 登录 Cloudflare
3. ✅ 本地测试 Worker
4. ✅ 测试登录功能
5. ⬜ 部署到生产环境
6. ⬜ 配置数据库
7. ⬜ 实现密码加密
8. ⬜ 添加速率限制

---

**创建日期**: 2025-02-06  
**版本**: 1.0  
**状态**: ✅ 开发环境就绪
