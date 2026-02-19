# 🔧 Localhost 访问被拒绝 - 故障排查指南

## 🚨 问题描述

访问 `http://localhost:8787/` 被拒绝（Connection Refused）

---

## ✅ 根本原因

**Wrangler Dev 服务器没有运行**

端口 8787 没有被监听，因此浏览器无法连接。

---

## 🛠️ 解决方案

### 方法 1: 使用快速启动脚本（推荐）

```bash
cd /Users/mini23/Documents/GitHub/jjconnect.jp
./start-dev-server.sh
```

这个脚本会：
- ✅ 自动诊断端口状态
- ✅ 检查环境变量
- ✅ 验证构建输出
- ✅ 启动开发服务器

---

### 方法 2: 手动启动

```bash
cd /Users/mini23/Documents/GitHub/jjconnect.jp

# 启动开发服务器
npx wrangler dev
```

**预期输出**：
```
⛅️ wrangler 3.114.17
---------------------------------------------------------
⬣ Listening on http://localhost:8787
╭──────────────────────────────────────────────────╮
│ [b] open a browser, [d] open Devtools, [l] turn  │
│ on local mode, [c] clear console, [x] to exit    │
╰──────────────────────────────────────────────────╯
```

看到这个输出后，访问 `http://localhost:8787/` 即可。

---

### 方法 3: 检查并配置环境变量

#### 创建 .dev.vars 文件（本地开发用）

```bash
cat > .dev.vars << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
JWT_SECRET=your-jwt-secret
EOF
```

#### 验证配置

```bash
cat .dev.vars
```

应该看到：
```
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
JWT_SECRET=...
```

---

## 🔍 常见问题

### Q1: 启动时报错 "No such file or directory"

**原因**: 没有在正确的目录

**解决**:
```bash
cd /Users/mini23/Documents/GitHub/jjconnect.jp
pwd  # 确认当前目录
npx wrangler dev
```

---

### Q2: 端口已被占用

**错误信息**:
```
Error: listen EADDRINUSE: address already in use :::8787
```

**解决方法 A - 使用不同端口**:
```bash
npx wrangler dev --port 3000
# 然后访问 http://localhost:3000/
```

**解决方法 B - 关闭占用的进程**:
```bash
# 查找占用端口的进程
lsof -ti :8787

# 关闭进程
lsof -ti :8787 | xargs kill -9

# 重新启动
npx wrangler dev
```

---

### Q3: 页面显示 "Supabase not configured"

**原因**: 环境变量未配置

**解决**:

1. **检查 .dev.vars 文件**
   ```bash
   cat .dev.vars
   ```

2. **如果不存在，创建它**
   ```bash
   cat > .dev.vars << 'EOF'
   SUPABASE_URL=https://ykqobumyxcqckohvhitg.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   EOF
   ```

3. **重启 wrangler dev**
   ```bash
   # 按 Ctrl+C 停止当前服务器
   npx wrangler dev
   ```

---

### Q4: Worker 已部署但本地访问不了

**说明**: 
- 生产环境: `https://jjconnect-auth-worker.07-yang.workers.dev` ✅ 可访问
- 本地环境: `http://localhost:8787/` ❌ 需要启动 dev 服务器

**解决**: 两者是独立的
```bash
# 本地开发
npx wrangler dev                  # 启动本地服务器
open http://localhost:8787/       # 访问本地

# 或直接访问生产环境
open https://jjconnect-auth-worker.07-yang.workers.dev/
```

---

## 🎯 正确的启动流程

```bash
# Step 1: 进入项目目录
cd /Users/mini23/Documents/GitHub/jjconnect.jp

# Step 2: 确保已构建
npm run build

# Step 3: 配置环境变量（如果还没有）
cat > .dev.vars << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
EOF

# Step 4: 启动开发服务器
npx wrangler dev

# Step 5: 等待启动完成（看到 "Listening on http://localhost:8787"）

# Step 6: 在浏览器访问
open http://localhost:8787/
```

---

## 📊 验证服务器运行

### 检查方法 1: 使用 curl

```bash
# 测试根路径
curl http://localhost:8787/

# 应该返回 HTML 内容
# 如果返回 "Connection refused"，说明服务器未运行
```

### 检查方法 2: 测试 API

```bash
# 测试状态端点
curl http://localhost:8787/api/backend/status

# 应该返回 JSON:
# {"success":true,"message":"Current Backend: Supabase Connection Active",...}
```

### 检查方法 3: 查看进程

```bash
# 查看 wrangler 进程
ps aux | grep wrangler | grep -v grep

# 如果没有输出，说明未运行
```

---

## 🚀 快速解决

### 一键启动命令

```bash
cd /Users/mini23/Documents/GitHub/jjconnect.jp && npx wrangler dev --port 8787
```

### 后台运行（可选）

```bash
# 后台运行
npx wrangler dev > wrangler.log 2>&1 &

# 查看日志
tail -f wrangler.log

# 停止后台进程
pkill -f wrangler
```

---

## 🎉 成功标志

启动成功后，您应该看到：

### 终端输出
```
⛅️ wrangler 3.114.17
---------------------------------------------------------
Your worker has access to the following bindings:
- Vars:
  - SUPABASE_URL: "(hidden)"
  - SUPABASE_ANON_KEY: "(hidden)"
⬣ Listening on http://localhost:8787
Total Upload: 42.64 KiB / gzip: 9.49 KiB
```

### 浏览器显示
访问 `http://localhost:8787/` 应该看到：
```
┌─────────────────────────────────────────┐
│ ✅ Current Backend: Supabase Active     │
├─────────────────────────────────────────┤
│  🌸 JJConnect 网页模式已启动            │
│  欢迎来到 JJConnect - 日本人社区平台     │
└─────────────────────────────────────────┘
```

### 控制台输出（F12）
```
[INFO] Supabase client initialized
[DEBUG] 🔌 SUPABASE_URL prefix: https...
[INFO] JJConnect App initialized
```

---

## 📝 故障排查清单

如果仍然无法访问，请按顺序检查：

- [ ] 是否在正确的目录？
  ```bash
  pwd
  # 应该是 /Users/mini23/Documents/GitHub/jjconnect.jp
  ```

- [ ] wrangler dev 是否正在运行？
  ```bash
  lsof -i :8787
  ```

- [ ] 端口是否被占用？
  ```bash
  lsof -i :8787 | grep -v wrangler
  ```

- [ ] 环境变量是否配置？
  ```bash
  cat .dev.vars
  ```

- [ ] 构建是否成功？
  ```bash
  ls -lh .wrangler/dist/index.js
  ```

- [ ] 防火墙是否阻止？
  ```bash
  # macOS 检查防火墙
  sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
  ```

---

## 🆘 仍然无法访问？

### 使用生产环境（临时方案）

既然你已经部署到 Cloudflare，可以直接访问生产环境：

```bash
# 访问生产环境
open https://jjconnect-auth-worker.07-yang.workers.dev/

# 查看生产环境日志
npx wrangler tail
```

### 完全重置

```bash
# 1. 清理构建
rm -rf .wrangler

# 2. 重新构建
npm run build

# 3. 重新启动
npx wrangler dev --port 8787

# 4. 测试
curl http://localhost:8787/api/backend/status
```

---

## 📞 需要帮助？

### 查看日志
```bash
# 启动时查看详细日志
npx wrangler dev --log-level debug

# 查看生产环境日志
npx wrangler tail
```

### 检查网络
```bash
# 测试本地网络
curl http://localhost:8787/

# 测试生产环境
curl https://jjconnect-auth-worker.07-yang.workers.dev/
```

---

**更新时间**: 2026-02-15  
**版本**: 1.0.0
