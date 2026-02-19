# 🚀 JJConnect 模块化架构验证清单

## 📝 快速验证步骤

按照以下顺序测试所有功能，确保架构完整可用。

---

## 1️⃣ 导航栏基础测试

### 测试页面：`about.html`, `raft_home.html`, `mansion_home.html`, `property_report.html`

#### ✅ 未登录状态
1. 打开任意测试页面
2. 查看页面顶部导航栏
3. **预期结果**：
   - [x] 左侧显示 JJConnect Logo
   - [x] 中间显示：关于我们、RAFT2.03、Mansion管理主任、地产报告
   - [x] 右侧显示：「登录」和「注册」按钮
   - [x] 导航栏固定在页面顶部（滚动时不消失）

#### ✅ 移动端响应式
1. 将浏览器窗口缩小到移动端尺寸（宽度 < 1024px）
2. **预期结果**：
   - [x] 中间导航链接和右侧按钮隐藏
   - [x] 右上角显示汉堡菜单图标（三条横线）
   - [x] 点击汉堡菜单展开移动端导航
   - [x] 移动菜单包含所有导航链接和登录/注册按钮

---

## 2️⃣ 登录功能测试

### 测试页面：`login.html`

#### ✅ 注册新账号
1. 打开 `login.html`，切换到「注册」标签
2. 填写表单：
   - 用户名：`testuser001`
   - 邮箱：`test001@example.com`
   - 密码：`password123`
   - 名字：`张`
   - 姓氏：`三`
3. 点击「注册」
4. **预期结果**：
   - [x] 显示「注册成功」消息
   - [x] 自动跳转到首页或自动登录
   - [x] 浏览器控制台无 JSON 解析错误

#### ✅ 登录已有账号
1. 在 `login.html` 的「登录」标签
2. 输入用户名和密码
3. 点击「登录」
4. **预期结果**：
   - [x] 显示「登录成功」
   - [x] 跳转到首页或之前的页面
   - [x] 浏览器控制台无 JSON 解析错误

---

## 3️⃣ 登录后导航栏状态测试

### 测试页面：任意包含 `navbar.js` 的页面

#### ✅ 已登录状态
1. 登录后打开 `about.html` 或任意产品页面
2. 查看导航栏右侧
3. **预期结果**：
   - [x] 不再显示「登录」和「注册」按钮
   - [x] 显示用户图标 + 用户名（如「testuser001」）
   - [x] 点击用户名按钮，下拉菜单展开
   - [x] 下拉菜单包含「退出登录」选项

#### ✅ 管理员权限测试（如果您的账号 role >= 2）
1. 使用管理员账号登录（需手动修改数据库 `role` 字段为 2）
2. 查看导航栏用户下拉菜单
3. **预期结果**：
   - [x] 下拉菜单包含「管理后台」链接
   - [x] 点击「管理后台」跳转到 `admin.html`

#### ✅ 退出登录测试
1. 点击导航栏用户名，展开下拉菜单
2. 点击「退出登录」
3. **预期结果**：
   - [x] 页面自动刷新
   - [x] 导航栏恢复到「登录」和「注册」按钮状态
   - [x] 浏览器 localStorage 中的 `auth_token` 和 `user_info` 被清除

---

## 4️⃣ 产品页面登录模态框测试

### 测试页面：`raft_home.html`, `mansion_home.html`, `property_report.html`

#### ✅ 未登录访问产品功能
1. **先退出登录**（如果已登录）
2. 打开 `raft_home.html`
3. 滚动到页面中部，找到「开始使用 RAFT2.03」区域
4. 点击「立即访问」按钮
5. **预期结果**：
   - [x] 弹出登录模态框（Modal）
   - [x] 模态框标题：「登录以继续」
   - [x] 模态框包含用户名、密码输入框和「登录」按钮
   - [x] **重要**：页面没有跳转到 `login.html`，而是在当前页显示模态框

#### ✅ 模态框内登录
1. 在弹出的模态框中输入用户名和密码
2. 点击「登录」
3. **预期结果**：
   - [x] 显示「登录成功！」消息
   - [x] 模态框自动关闭
   - [x] 页面自动刷新
   - [x] 页面底部「锁定内容」区域变为可访问状态
   - [x] 导航栏右侧显示用户名

#### ✅ 已登录访问产品功能
1. 确保已登录状态
2. 打开 `mansion_home.html`
3. 点击「立即访问」按钮
4. **预期结果**：
   - [x] 不弹出登录模态框
   - [x] 直接显示产品功能界面（或弹出提示：「欢迎使用 Mansion管理主任！」）

#### ✅ 关闭模态框
1. 未登录状态下打开 `property_report.html`
2. 点击「立即访问」弹出登录模态框
3. **测试关闭方式**：
   - 点击模态框右上角的「×」关闭按钮 → [x] 模态框关闭
   - 点击模态框外部的灰色背景区域 → [x] 模态框关闭

---

## 5️⃣ About 页面产品索引测试

### 测试页面：`about.html`

#### ✅ 产品卡片显示
1. 打开 `about.html`
2. 滚动到「我们的产品」区域
3. **预期结果**：
   - [x] 显示三个产品卡片（并排或换行显示）
   - [x] 每个卡片包含：
     - 产品图标（🚢、🏢、📊）
     - 产品名称（RAFT2.03、Mansion管理主任、地产报告）
     - 简短描述
     - 三个特性列表（带 ✓ 符号）
     - 「立即进入」按钮

#### ✅ 卡片悬停效果
1. 鼠标悬停在任意产品卡片上
2. **预期结果**：
   - [x] 卡片轻微上移（transform: translateY(-5px)）
   - [x] 阴影加深

#### ✅ 卡片链接跳转
1. 点击「RAFT2.03」卡片的「立即进入」按钮
2. **预期结果**：[x] 跳转到 `raft_home.html`
3. 返回 `about.html`，点击「Mansion管理主任」的「立即进入」
4. **预期结果**：[x] 跳转到 `mansion_home.html`
5. 返回 `about.html`，点击「地产报告」的「立即进入」
6. **预期结果**：[x] 跳转到 `property_report.html`

---

## 6️⃣ 后端 API JSON 响应测试

### 使用浏览器控制台或 Postman 测试

#### ✅ 注册 API
```bash
# 请求
POST http://localhost:8787/api/register
Content-Type: application/json

{
  "username": "testuser002",
  "email": "test002@example.com",
  "password": "password123",
  "firstname": "李",
  "lastname": "四"
}

# 预期响应（JSON 格式）
{
  "success": true,
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "testuser002",
    "email": "test002@example.com",
    "role": 0,
    "name": "李 四"
  }
}
```

**检查点**：
- [x] 响应是 JSON 格式（不是纯文本）
- [x] 包含 `success: true`
- [x] 包含 `token` 字段
- [x] `user.role` 字段存在且为 `0`

#### ✅ 登录 API
```bash
# 请求
POST http://localhost:8787/api/login
Content-Type: application/json

{
  "username": "testuser002",
  "password": "password123"
}

# 预期响应（JSON 格式）
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "testuser002",
    "email": "test002@example.com",
    "role": 0,
    "name": "李 四"
  }
}
```

**检查点**：
- [x] 响应是 JSON 格式
- [x] 包含 `token` 和 `user` 对象
- [x] `user.role` 字段正确

#### ✅ Token 验证 API
```bash
# 请求
GET http://localhost:8787/api/auth/check
Authorization: Bearer <your-token-here>

# 预期响应（已登录）
{
  "authenticated": true,
  "user": {
    "id": 2,
    "username": "testuser002",
    "email": "test002@example.com",
    "role": 0,
    "name": "李 四"
  }
}
```

**检查点**：
- [x] 响应是 JSON 格式
- [x] `authenticated: true`
- [x] `user.role` 字段存在

#### ✅ 错误响应测试
```bash
# 请求（错误密码）
POST http://localhost:8787/api/login
Content-Type: application/json

{
  "username": "testuser002",
  "password": "wrongpassword"
}

# 预期响应（JSON 格式，非纯文本）
{
  "success": false,
  "error": "用户名或密码错误"
}
```

**检查点**：
- [x] 错误响应也是 JSON 格式
- [x] 不是纯文本「用户名或密码错误」
- [x] 浏览器控制台无 `SyntaxError: Unexpected token` 错误

---

## 7️⃣ JWT Role 字段验证

### 使用 JWT 解析工具（https://jwt.io/）

1. 登录后从浏览器控制台获取 token：
   ```javascript
   localStorage.getItem('auth_token')
   ```

2. 复制 token 到 https://jwt.io/ 解析

3. **预期 Payload 结构**：
   ```json
   {
     "userId": 2,
     "username": "testuser002",
     "email": "test002@example.com",
     "role": 0,
     "name": "李 四",
     "iat": 1738876543000,
     "exp": 1738962943000
   }
   ```

**检查点**：
- [x] Payload 包含 `role` 字段
- [x] `role` 值为数字（0、1 或 2）
- [x] `name` 字段格式正确（firstname + 空格 + lastname）

---

## 8️⃣ 管理员功能测试（可选）

### 前置条件：手动修改数据库某个用户的 `role` 为 2

```bash
# 本地开发环境
npx wrangler d1 execute jjconnect-db --local --command="UPDATE users SET role = 2 WHERE username = 'testuser002';"

# 生产环境
npx wrangler d1 execute jjconnect-db --remote --command="UPDATE users SET role = 2 WHERE username = 'testuser002';"
```

#### ✅ 管理后台链接显示
1. 使用 `role = 2` 的账号登录
2. 查看导航栏用户下拉菜单
3. **预期结果**：
   - [x] 下拉菜单包含「管理后台」链接
   - [x] 普通用户（role < 2）看不到此链接

#### ✅ 管理后台访问
1. 点击「管理后台」链接
2. **预期结果**：
   - [x] 跳转到 `admin.html`
   - [x] 页面正常显示（无导航栏冲突）

---

## 9️⃣ 跨页面状态一致性测试

#### ✅ 登录状态持久化
1. 在 `login.html` 登录
2. 手动访问 `about.html`
3. **预期结果**：[x] 导航栏显示已登录状态（用户名）
4. 访问 `raft_home.html`
5. **预期结果**：[x] 导航栏仍显示已登录状态
6. 关闭浏览器，重新打开访问任意页面
7. **预期结果**：[x] 仍保持登录状态（因为 token 存储在 localStorage）

#### ✅ 退出登录全局生效
1. 在 `about.html` 点击「退出登录」
2. 访问 `mansion_home.html`
3. **预期结果**：[x] 导航栏恢复到「登录」和「注册」按钮状态

---

## 🔟 样式隔离与兼容性测试

#### ✅ 导航栏不受页面主题干扰
1. 打开 `about.html`（包含 WordPress Kadence 主题样式）
2. 检查导航栏显示
3. **预期结果**：
   - [x] 导航栏文字不堆叠
   - [x] Logo 图片大小正常（约 36px 高度）
   - [x] 按钮样式完整（边框、背景色、悬停效果）
   - [x] 没有被 WordPress 主题的 `.entry-content a` 等样式污染

#### ✅ 移动端布局正常
1. 在移动端尺寸下（宽度 375px）测试所有页面
2. **预期结果**：
   - [x] 导航栏不溢出屏幕
   - [x] 汉堡菜单图标可点击
   - [x] 移动菜单展开时内容清晰可读
   - [x] 产品卡片（about.html）自动换行为单列
   - [x] 登录模态框宽度自适应（不超出屏幕）

---

## ✅ 验证完成确认

如果以上所有测试项均通过，恭喜您！JJConnect 模块化架构已完整实现并正常运行。

### 最终检查清单

- [x] 通用导航栏在所有页面正常显示（除 `index.html`）
- [x] 登录/注册功能正常，无 JSON 解析错误
- [x] 登录状态在所有页面同步更新
- [x] 产品页面登录模态框正常工作（不跳转）
- [x] About 页面产品卡片链接正确
- [x] JWT 包含 `role` 字段
- [x] 管理员权限控制生效
- [x] 移动端响应式布局正常
- [x] 导航栏样式完全隔离，不受主题干扰

---

## 🐛 如果遇到问题

### 常见问题排查

1. **导航栏显示混乱**
   - 检查是否有旧的 WordPress 导航栏结构（`#masthead`、`#mobile-header`）
   - 确认 `navbar.js` 使用了 `!important` 样式

2. **登录后导航栏未更新**
   - 打开浏览器控制台，检查是否有 JavaScript 错误
   - 确认 `localStorage` 中存在 `auth_token`
   - 刷新页面（F5）

3. **JSON 解析错误**
   - 打开浏览器 Network 面板，查看 API 响应内容
   - 确认响应 Content-Type 为 `application/json`
   - 检查 Worker 是否正确使用 `jsonResponse` / `errorResponse`

4. **管理后台链接不显示**
   - 打开浏览器控制台，执行：
     ```javascript
     const token = localStorage.getItem('auth_token');
     const payload = JSON.parse(atob(token.split('.')[1]));
     console.log(payload.role); // 应显示 0、1 或 2
     ```
   - 如果 `role < 2`，需要手动修改数据库

---

**验证日期**：_________  
**验证人员**：_________  
**验证结果**：✅ 通过 / ❌ 未通过  
**备注**：_________

---

**文档版本**：1.0  
**最后更新**：2026-02-06
