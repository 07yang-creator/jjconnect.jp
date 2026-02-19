# 🚀 Cloudflare Worker 登录系统 - 5分钟快速开始

## ⚡ 超快速启动（3 步）

### 1️⃣ 安装依赖

```bash
npm install -g wrangler
```

### 2️⃣ 启动 Worker

```bash
cd /Users/mini23/Documents/GitHub/jjconnect.jp
wrangler dev
```

看到这个输出就成功了：
```
⛅️ wrangler 3.x.x
-------------------
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

### 3️⃣ 测试登录

在浏览器中打开 `login.html`，使用测试账号：
- 用户名: `admin`
- 密码: `admin123`

## 🎯 测试账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| **admin** | admin123 | Admin | 完全权限 |
| **editor** | editor123 | Editor | 编辑权限 |
| **viewer** | viewer123 | Viewer | 只读权限 |

## 🧪 快速测试（命令行）

```bash
# 赋予执行权限
chmod +x test-worker.sh

# 运行测试脚本
./test-worker.sh
```

或者手动测试：

```bash
# 测试健康检查
curl http://localhost:8787/api/health

# 测试登录
curl -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📋 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 用户登录 |
| GET | `/api/auth/check` | 检查认证状态 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/users` | 获取用户列表（需要 Admin） |
| GET | `/api/health` | 健康检查 |

## 🔧 在 Cursor 中使用

### 方法 1: 使用终端

1. 按 `` Ctrl+` `` (或 `` Cmd+` ``) 打开终端
2. 运行: `wrangler dev`
3. 保持终端运行

### 方法 2: 使用 NPM Scripts

1. 打开 `package.json`
2. 点击 "dev" 脚本旁边的 ▶️ 按钮
3. 或在终端运行: `npm run dev`

## 🌐 部署到 Cloudflare

### 首次部署

```bash
# 1. 登录 Cloudflare
wrangler login

# 2. 部署
wrangler deploy
```

部署成功后会显示 URL：
```
https://jjconnect-auth-worker.your-subdomain.workers.dev
```

### 更新前端配置

在 `login.html` 中修改：

```javascript
// 改为您的 Worker URL
const API_ENDPOINT = 'https://jjconnect-auth-worker.your-subdomain.workers.dev';
```

## ❓ 常见问题

### Q: wrangler 命令不存在？

**A**: 安装 wrangler
```bash
npm install -g wrangler
```

### Q: Worker 启动失败？

**A**: 检查端口是否被占用
```bash
# 使用其他端口
wrangler dev --port 8788
```

### Q: 登录时出现 CORS 错误？

**A**: 确保 Worker 正在运行
```bash
wrangler dev
```

### Q: Token 验证失败？

**A**: 检查浏览器控制台，确认 token 已保存
```javascript
console.log(localStorage.getItem('auth_token'));
```

## 📚 完整文档

详细文档请查看：
- **[CLOUDFLARE_WORKER_SETUP.md](CLOUDFLARE_WORKER_SETUP.md)** - 完整设置指南
- **[workers/auth-worker.js](workers/auth-worker.js)** - Worker 源码（含详细注释）

## 🎨 工作流程

```
用户访问 login.html
    ↓
输入用户名密码
    ↓
POST /api/login
    ↓
Worker 验证凭据
    ↓
返回 JWT Token
    ↓
存储到 localStorage
    ↓
跳转到 admin.html
```

## 🔐 安全提示

**当前配置仅用于开发测试！**

生产环境必须：
1. ✅ 使用数据库存储用户
2. ✅ 加密密码（bcrypt）
3. ✅ 使用环境变量存储 secrets
4. ✅ 限制 CORS 来源
5. ✅ 添加速率限制

## 🎉 成功标志

如果看到以下内容，说明一切正常：

✅ Worker 在 `http://localhost:8787` 运行  
✅ 可以访问 `/api/health`  
✅ 可以用测试账号登录  
✅ 登录后跳转到 admin.html  
✅ Token 存储在 localStorage  

## 🆘 需要帮助？

1. 查看浏览器控制台（F12）
2. 查看 Worker 日志：`wrangler tail`
3. 运行测试脚本：`./test-worker.sh`
4. 查看完整文档：`CLOUDFLARE_WORKER_SETUP.md`

---

**准备好了吗？开始吧！** 🚀

```bash
wrangler dev
```
