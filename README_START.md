# 🚀 快速启动指南 - 模块化产品矩阵

## 📦 系统概览

本项目实现了一个包含 3 个独立产品的模块化 Web 架构：
- **RAFT2.03** (蓝色) - 智能财务分析系统
- **Mansion管理主任** (青色) - 公寓管理系统
- **地产报告** (橙色) - 房地产分析平台

所有产品通过统一的导航栏 (`navbar.js`) 实现：
- ✅ 登录状态同步
- ✅ 权限级别管理
- ✅ 模态框登录
- ✅ 无缝用户体验

---

## 🏁 第一次启动

### 1. 启动后端 API (Cloudflare Worker)

```bash
# 方法一: 使用启动脚本 (推荐)
./start.sh

# 方法二: 手动启动
npx wrangler dev workers/auth-worker.js
```

Worker 将在 **http://localhost:8787** 运行

### 2. 初始化数据库 (仅第一次需要)

```bash
npx wrangler d1 execute jjconnect-db --local --file=schema.sql
```

### 3. 启动 Web 服务器

**选项 A: 使用 Python** (推荐)
```bash
python3 -m http.server 8080
```

**选项 B: 使用 VS Code Live Server**
1. 安装 Live Server 扩展
2. 右键点击任意 HTML 文件 → "Open with Live Server"

**选项 C: 使用 Node.js http-server**
```bash
npx http-server -p 8080
```

### 4. 打开浏览器

访问: **http://localhost:8080/index.html**

---

## 🧪 测试流程

### 测试 1: 导航栏功能
1. 打开 `index.html`
2. ✅ 确认顶部显示 JJConnect 导航栏
3. ✅ 未登录时显示"登录"和"注册"按钮
4. ✅ 点击"登录"跳转到 `login.html`

### 测试 2: 用户注册
1. 访问 `login.html`
2. 切换到"注册"标签
3. 填写信息:
   - 用户名: `testuser`
   - 邮箱: `test@example.com`
   - 密码: `password123`
   - 名字: `Test`
   - 姓氏: `User`
4. 点击"注册"
5. ✅ 注册成功后自动登录

### 测试 3: 导航栏登录状态
1. 注册/登录成功后
2. ✅ 导航栏显示用户名 (testuser)
3. ✅ 点击用户名显示下拉菜单
4. ✅ 下拉菜单包含"退出登录"选项

### 测试 4: 产品索引页
1. 访问 `about.html`
2. ✅ 找到"我们的产品"区域
3. ✅ 显示 3 张产品卡片 (蓝色/青色/橙色)
4. 点击任意"立即进入"按钮

### 测试 5: 模态框登录
1. **未登录状态**访问 `raft_home.html`
2. 点击"立即访问"按钮
3. ✅ 弹出登录模态框
4. 在模态框中登录
5. ✅ 登录成功后模态框关闭
6. ✅ 页面内容解锁，无需跳转

### 测试 6: 已登录访问
1. **已登录状态**访问 `mansion_home.html`
2. ✅ 内容直接解锁
3. 点击"立即访问"
4. ✅ 显示欢迎提示（功能占位）

### 测试 7: 管理员权限
1. 使用管理员账号登录 (role = 2)
2. ✅ 导航栏显示"管理后台"链接
3. 点击进入 `admin.html`
4. ✅ 可以查看用户列表

### 测试 8: 退出登录
1. 点击导航栏用户名
2. 选择"退出登录"
3. ✅ 页面刷新
4. ✅ 导航栏恢复到未登录状态

---

## 🔑 测试账号

### 创建管理员账号
目前没有UI界面创建管理员，需要手动修改数据库：

```bash
# 连接到本地 D1 数据库
npx wrangler d1 execute jjconnect-db --local --command="UPDATE users SET role = 2 WHERE username = 'testuser'"
```

---

## 📊 API 测试

### 使用 curl 测试

**1. 注册用户**
```bash
curl -X POST http://localhost:8787/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testapi",
    "email": "testapi@example.com",
    "password": "password123",
    "firstname": "API",
    "lastname": "Test"
  }'
```

**2. 登录**
```bash
curl -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testapi",
    "password": "password123"
  }'
```

**3. 检查认证**
```bash
# 将上一步返回的 token 替换到下面
curl -X GET http://localhost:8787/api/auth/check \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**4. 健康检查**
```bash
curl http://localhost:8787/api/health
```

---

## 🐛 常见问题

### Q1: 导航栏不显示
**原因**: 浏览器直接打开 HTML 文件（`file://` 协议）  
**解决**: 必须通过 HTTP 服务器访问（`http://localhost:8080`）

### Q2: 登录失败，提示"网络错误"
**原因**: Worker 未启动或端口不匹配  
**解决**: 
1. 确保 `npx wrangler dev` 正在运行
2. 检查是否在 http://localhost:8787

### Q3: 模态框登录后页面没反应
**原因**: localStorage 未正确存储 token  
**解决**:
1. 打开浏览器开发者工具 → Application → Local Storage
2. 检查是否有 `auth_token` 和 `user_info`
3. 手动刷新页面 (F5)

### Q4: 产品卡片样式错乱
**原因**: CSS 冲突  
**解决**: 清除浏览器缓存，强制刷新 (Ctrl+F5)

### Q5: 数据库错误 "no such table: users"
**原因**: 数据库未初始化  
**解决**:
```bash
npx wrangler d1 execute jjconnect-db --local --file=schema.sql
```

---

## 📁 文件结构

```
jjconnect.jp/
├── navbar.js                    # 通用导航栏
├── index.html                   # 首页
├── about.html                   # 关于我们 + 产品索引
├── login.html                   # 登录/注册
├── admin.html                   # 管理后台
├── raft_home.html              # RAFT2.03 产品页
├── mansion_home.html           # Mansion管理主任页
├── property_report.html        # 地产报告页
├── feedback.html               # 反馈页面
├── joint-mamori-submission.html
├── workers/
│   └── auth-worker.js          # Cloudflare Worker API
├── schema.sql                  # 数据库结构
├── wrangler.toml               # Worker 配置
├── start.sh                    # 快速启动脚本
├── MODULAR_PRODUCT_MATRIX.md   # 完整技术文档
└── README_START.md             # 本文件
```

---

## 📖 详细文档

查看 **`MODULAR_PRODUCT_MATRIX.md`** 了解：
- 完整技术实现细节
- 架构图和流程图
- 安全性说明
- 优化建议

---

## 🎯 下一步

1. **自定义样式**: 修改 CSS 变量适配品牌色
2. **添加功能**: 在产品页面实现实际业务逻辑
3. **部署上线**: 
   ```bash
   # 部署 Worker
   npx wrangler deploy workers/auth-worker.js
   
   # 部署前端到 Cloudflare Pages
   npx wrangler pages deploy .
   ```

---

## 📞 帮助

遇到问题？检查：
1. 浏览器控制台 (F12) 的错误信息
2. Worker 终端的日志输出
3. `MODULAR_PRODUCT_MATRIX.md` 的故障排除部分

**祝您测试愉快！** 🎉
