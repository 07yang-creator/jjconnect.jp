# 用户注册功能说明

## ✅ 已完成的更新

### 1. 前端 - login.html

#### 新增功能
- ✅ **登录/注册切换标签** - 用户可以在登录和注册表单之间切换
- ✅ **完整的注册表单** - 包含所有必要字段
- ✅ **表单验证** - 前端验证确保数据格式正确
- ✅ **自动登录** - 注册成功后自动登录并跳转

#### 注册表单字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **First Name** | text | ✅ | 名字 |
| **Last Name** | text | ✅ | 姓氏 |
| **Username** | text | ✅ | 用户名（3-20 字符，字母、数字、下划线）|
| **Email** | email | ✅ | 邮箱地址 |
| **Password** | password | ✅ | 密码（最少 8 字符）|
| **Confirm Password** | password | ✅ | 确认密码 |
| **Account Type** | select | - | 账户类型（Viewer / Editor）|
| **Terms** | checkbox | ✅ | 同意服务条款 |

#### 账户类型限制

注册时只能选择以下两种类型：
- **Viewer (0)** - 只读权限，可以查看内容
- **Editor (1)** - 编辑权限，可以创建和编辑内容

**注意**: Admin (2) 账户只能由现有管理员创建，不能通过注册页面创建。

### 2. 后端 - Worker API

#### 新增路由

**POST /api/register**

**请求示例**:
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepass123",
  "role": 0
}
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 4,
    "username": "johndoe",
    "email": "john@example.com",
    "role": 0,
    "name": "John Doe"
  }
}
```

**错误响应示例**:

| 错误 | 状态码 | 消息 |
|------|--------|------|
| 缺少字段 | 400 | "所有字段都是必填的" |
| 用户名格式错误 | 400 | "用户名必须是 3-20 个字符..." |
| 邮箱格式错误 | 400 | "邮箱格式不正确" |
| 密码太短 | 400 | "密码长度至少需要 8 个字符" |
| 用户名已存在 | 409 | "用户名已被使用" |
| 邮箱已注册 | 409 | "邮箱已被注册" |
| 尝试注册 Admin | 403 | "无法注册管理员账号..." |

### 3. 数据验证

#### 前端验证
- ✅ 所有必填字段检查
- ✅ 用户名格式验证（正则表达式）
- ✅ 邮箱格式验证（HTML5 type="email"）
- ✅ 密码长度验证（最少 8 字符）
- ✅ 密码确认匹配检查
- ✅ 服务条款勾选检查

#### 后端验证
- ✅ 字段存在性检查
- ✅ 用户名格式验证（3-20 字符，字母数字下划线）
- ✅ 邮箱格式验证（正则表达式）
- ✅ 密码长度验证
- ✅ 用户名唯一性检查
- ✅ 邮箱唯一性检查
- ✅ 角色权限验证

## 🎯 使用流程

### 用户注册流程

```
1. 用户访问 login.html
   ↓
2. 点击 "Register" 标签
   ↓
3. 填写注册表单
   ↓
4. 点击 "Create Account"
   ↓
5. 前端验证数据
   ↓
6. POST /api/register
   ↓
7. Worker 验证数据
   ↓
8. 创建新用户
   ↓
9. 返回 Token
   ↓
10. 自动登录
   ↓
11. 跳转到 admin.html
```

## 🧪 测试注册功能

### 方法 1: 使用浏览器

1. 确保 Worker 正在运行：
   ```bash
   wrangler dev
   ```

2. 在浏览器中打开 `login.html`

3. 点击 "Register" 标签

4. 填写表单并提交

### 方法 2: 使用 curl

```bash
curl -X POST http://localhost:8787/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Test",
    "lastname": "User",
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": 0
  }'
```

### 测试用例

#### ✅ 成功注册
```json
{
  "firstname": "Alice",
  "lastname": "Smith",
  "username": "alicesmith",
  "email": "alice@jjconnect.jp",
  "password": "securepass123",
  "role": 0
}
```

#### ❌ 用户名已存在
```json
{
  "firstname": "Test",
  "lastname": "User",
  "username": "admin",  // 已存在
  "email": "newuser@example.com",
  "password": "password123",
  "role": 0
}
```

#### ❌ 密码太短
```json
{
  "firstname": "Test",
  "lastname": "User",
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "short",  // 少于 8 字符
  "role": 0
}
```

#### ❌ 尝试注册 Admin
```json
{
  "firstname": "Test",
  "lastname": "User",
  "username": "newadmin",
  "email": "admin@example.com",
  "password": "password123",
  "role": 2  // Admin 角色被禁止
}
```

## 🔐 安全特性

### 已实现
- ✅ 前端表单验证
- ✅ 后端数据验证
- ✅ 用户名唯一性检查
- ✅ 邮箱唯一性检查
- ✅ 密码长度要求
- ✅ 角色权限限制（禁止注册 Admin）
- ✅ 自动生成 JWT Token

### 生产环境需要
- ⚠️ **密码加密** - 使用 bcrypt 加密存储密码
- ⚠️ **邮箱验证** - 发送验证邮件确认邮箱
- ⚠️ **验证码** - 添加 reCAPTCHA 防止机器注册
- ⚠️ **速率限制** - 限制注册频率，防止滥用
- ⚠️ **用户名黑名单** - 禁止使用保留用户名
- ⚠️ **密码强度检查** - 要求更强的密码策略
- ⚠️ **数据库存储** - 使用 D1 或其他数据库持久化用户数据

## 📊 数据库集成建议

### 使用 Cloudflare D1

#### 1. 创建数据库

```bash
wrangler d1 create jjconnect-users
```

#### 2. 创建用户表

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  role INTEGER DEFAULT 0,
  email_verified BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_email ON users(email);
```

#### 3. 在 Worker 中使用

```javascript
// 查询用户
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE username = ?'
).bind(username).first();

// 插入用户
await env.DB.prepare(
  'INSERT INTO users (username, email, password_hash, firstname, lastname, role) VALUES (?, ?, ?, ?, ?, ?)'
).bind(username, email, passwordHash, firstname, lastname, role).run();
```

## 🎨 UI/UX 特性

### 登录/注册切换
- 标签式界面，易于切换
- 活动标签高亮显示
- 平滑的表单切换动画

### 表单设计
- 清晰的字段标签
- 必填字段标识（红色星号）
- 响应式布局（两列/单列自适应）
- 输入焦点动画
- 实时表单验证

### 用户反馈
- 成功/错误消息提示
- 加载状态指示
- 详细的错误信息

## 📝 API 端点总结

现在 Worker 提供以下端点：

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/register` | 用户注册 | 公开 |
| POST | `/api/login` | 用户登录 | 公开 |
| GET | `/api/auth/check` | 检查认证状态 | 需要 Token |
| POST | `/api/auth/logout` | 用户登出 | 需要 Token |
| GET | `/api/users` | 获取用户列表 | 需要 Admin |
| GET | `/api/health` | 健康检查 | 公开 |

## 🚀 下一步开发建议

### 短期（立即可做）
1. ✅ 测试注册功能
2. ✅ 验证所有表单字段
3. ✅ 测试错误处理

### 中期（1-2 周）
1. ⬜ 实现邮箱验证
2. ⬜ 添加密码重置功能
3. ⬜ 集成数据库（D1）
4. ⬜ 实现密码加密（bcrypt）
5. ⬜ 添加用户个人资料页面

### 长期（1 个月+）
1. ⬜ 添加 OAuth 登录（Google, GitHub）
2. ⬜ 实现双因素认证 (2FA)
3. ⬜ 添加用户活动日志
4. ⬜ 实现账户恢复流程
5. ⬜ 添加管理员创建用户功能

## ❓ 常见问题

### Q: 如何创建 Admin 账户？

**A**: Admin 账户只能由现有 Admin 创建。首次部署时，可以：
1. 在 Worker 的 `TEST_USERS` 数组中预设一个 Admin 账户
2. 或者在后台管理界面由现有 Admin 创建

### Q: 注册后为什么自动登录？

**A**: 为了更好的用户体验，注册成功后会自动获取 Token 并登录。如果不需要自动登录，只需在 `handleRegister` 中不返回 token。

### Q: 如何禁用注册功能？

**A**: 在 Worker 中注释掉注册路由：
```javascript
// 注释这一段
// if (path === '/api/register' && method === 'POST') {
//   return await handleRegister(request);
// }
```

### Q: 密码存储安全吗？

**A**: 当前代码中密码是明文存储的，仅用于开发测试。生产环境必须使用 bcrypt 等加密算法。

## 🎉 总结

用户注册功能现已完成，包括：

✅ 前端注册表单（含验证）  
✅ 后端注册 API  
✅ 数据验证和错误处理  
✅ 自动登录和跳转  
✅ 角色权限限制  
✅ 完整的文档

现在您可以：
1. 运行 `wrangler dev` 启动 Worker
2. 打开 `login.html`
3. 点击 "Register" 标签
4. 创建新账户并测试

---

**版本**: 1.0  
**创建日期**: 2025-02-06  
**状态**: ✅ 完成
