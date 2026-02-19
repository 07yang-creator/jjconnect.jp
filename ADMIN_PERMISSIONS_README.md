# Admin Dashboard 权限控制系统说明

## 概述

`admin.html` 现在包含一个完整的基于角色的权限控制系统（RBAC），可以根据用户角色自动显示/隐藏功能和按钮。

## 用户角色定义

系统支持三种用户角色：

| 角色值 | 角色名称 | 英文名 | 权限描述 |
|--------|---------|--------|----------|
| 0 | 访客 | Viewer | 只能查看内容，无法进行任何编辑或删除操作 |
| 1 | 编辑者 | Editor | 可以创建和编辑内容，可以编辑用户，但不能删除用户或修改系统设置 |
| 2 | 管理员 | Admin | 拥有所有权限，可以执行所有操作 |

## 权限矩阵

### 用户管理权限

| 操作 | Viewer | Editor | Admin |
|------|--------|--------|-------|
| 查看用户列表 | ✅ | ✅ | ✅ |
| 添加用户 | ❌ | ❌ | ✅ |
| 编辑用户 | ❌ | ✅ | ✅ |
| 删除用户 | ❌ | ❌ | ✅ |

### 内容管理权限

| 操作 | Viewer | Editor | Admin |
|------|--------|--------|-------|
| 查看内容列表 | ✅ | ✅ | ✅ |
| 发布内容 | ❌ | ✅ | ✅ |
| 编辑内容 | ❌ | ✅ | ✅ |
| 删除内容 | ❌ | ❌ | ✅ |
| 保存草稿 | ❌ | ✅ | ✅ |

### 系统设置权限

| 操作 | Viewer | Editor | Admin |
|------|--------|--------|-------|
| 访问设置页面 | ❌ | ❌ | ✅ |
| 修改设置 | ❌ | ❌ | ✅ |

## 开发测试

### 本地测试

在 `admin.html` 中，您可以通过修改 `userRole` 变量来测试不同的权限等级：

```javascript
// 在脚本开头找到这一行：
let userRole = 2; // 修改为 0, 1, 或 2

// 或使用右下角的调试面板动态切换角色
```

### 使用调试面板

页面右下角有一个开发者调试面板，可以实时切换用户角色：

1. 打开 `admin.html`
2. 在右下角找到"🔧 开发者调试面板"
3. 使用下拉菜单切换角色
4. 观察页面UI的变化

**注意：** 在生产环境中，请删除调试面板代码。

## Cloudflare Workers 集成

### checkAuth() 函数

系统预留了 `checkAuth()` 函数用于与 Cloudflare Workers 后端集成：

```javascript
async function checkAuth() {
    // TODO: 替换为您的 Cloudflare Workers API endpoint
    const CLOUDFLARE_AUTH_ENDPOINT = 'https://your-worker.your-subdomain.workers.dev/api/auth/check';
    
    const response = await fetch(CLOUDFLARE_AUTH_ENDPOINT, {
        method: 'GET',
        credentials: 'include', // 包含 cookies 用于会话管理
        headers: {
            'Content-Type': 'application/json',
            // 如果使用 JWT token，添加 Authorization header
            // 'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    });
    
    const data = await response.json();
    
    if (!data.authenticated) {
        window.location.href = 'login.html';
        return null;
    }
    
    // 从后端响应设置用户角色
    userRole = data.role;
    
    // 应用权限控制
    applyPermissionControls();
    
    return data;
}
```

### Cloudflare Workers 后端示例

您的 Cloudflare Workers 应该返回以下格式的 JSON：

```json
{
  "authenticated": true,
  "role": 2,
  "username": "admin_user",
  "email": "admin@jjconnect.jp",
  "userId": "12345"
}
```

### 集成步骤

1. **创建 Cloudflare Workers 认证端点**
   ```javascript
   // workers/auth.js
   export default {
     async fetch(request) {
       // 验证用户会话/token
       const session = await validateSession(request);
       
       if (!session) {
         return new Response(JSON.stringify({
           authenticated: false
         }), {
           status: 401,
           headers: { 'Content-Type': 'application/json' }
         });
       }
       
       return new Response(JSON.stringify({
         authenticated: true,
         role: session.role,
         username: session.username,
         email: session.email
       }), {
         headers: { 'Content-Type': 'application/json' }
       });
     }
   };
   ```

2. **在 admin.html 中取消注释 checkAuth() 的 fetch 代码**
   - 找到 `checkAuth()` 函数
   - 取消注释 `fetch()` 调用部分
   - 替换 `CLOUDFLARE_AUTH_ENDPOINT` 为您的实际 API 地址

3. **配置 CORS（如果需要）**
   ```javascript
   // 在 Cloudflare Workers 中添加 CORS headers
   headers: {
     'Access-Control-Allow-Origin': 'https://jjconnect.jp',
     'Access-Control-Allow-Credentials': 'true',
     'Content-Type': 'application/json'
   }
   ```

## API 端点文档

所有操作函数都包含详细的 API 端点注释：

### 用户管理 API
- `POST /api/users` - 添加用户
- `PUT /api/users/:id` - 编辑用户
- `DELETE /api/users/:id` - 删除用户

### 内容管理 API
- `POST /api/content` - 发布内容
- `POST /api/content/draft` - 保存草稿
- `PUT /api/content/:id` - 编辑内容
- `DELETE /api/content/:id` - 删除内容

### 系统设置 API
- `PUT /api/settings/:type` - 保存设置
- `POST /api/settings/test-email` - 测试邮件

### 认证 API
- `GET /api/auth/check` - 检查认证状态
- `POST /api/auth/logout` - 退出登录

## 权限控制函数

### hasPermission(action)

检查当前用户是否有特定权限：

```javascript
if (hasPermission('deleteUser')) {
    // 执行删除操作
} else {
    showPermissionDenied('删除用户');
}
```

### showPermissionDenied(action)

显示权限不足的提示信息：

```javascript
showPermissionDenied('删除用户');
// 显示: "⚠️ 权限不足 - 您没有执行"删除用户"操作的权限"
```

### applyPermissionControls()

根据当前用户角色应用所有权限控制：

```javascript
// 在角色改变后调用
userRole = 1; // 切换到 Editor
applyPermissionControls(); // 重新应用权限控制
```

## 生产环境部署

在部署到生产环境前，请执行以下步骤：

1. **删除调试面板**
   ```html
   <!-- 删除这个 div -->
   <div id="debug-panel">...</div>
   ```

2. **启用 checkAuth() 的实际 API 调用**
   - 取消注释 `fetch()` 代码
   - 删除或注释掉模拟认证代码

3. **配置实际的 API 端点**
   - 替换所有 `/api/*` 端点为实际的 Cloudflare Workers URL

4. **设置默认角色为最低权限**
   ```javascript
   let userRole = 0; // 默认为 Viewer，等待后端验证
   ```

5. **启用登录重定向**
   ```javascript
   // 取消注释这些重定向代码
   if (!data.authenticated) {
       window.location.href = 'login.html';
   }
   ```

## 安全建议

1. **永远在后端验证权限** - 前端权限控制只是 UI 层面的，真正的权限验证必须在后端进行
2. **使用 HTTPS** - 确保所有 API 调用都通过 HTTPS
3. **实施会话管理** - 使用安全的会话 token 或 JWT
4. **定期刷新认证** - 定期调用 `checkAuth()` 验证用户会话
5. **日志记录** - 记录所有敏感操作的日志

## 常见问题

### Q: 如何添加新的权限？

在 `hasPermission()` 函数的 `permissionMap` 中添加新的权限规则：

```javascript
const permissionMap = {
    // ... 现有权限
    'exportData': userRole >= ROLE.EDITOR,
    'importData': userRole >= ROLE.ADMIN
};
```

### Q: 如何添加新的角色？

1. 在 `ROLE` 常量中添加新角色
2. 在 `ROLE_NAMES` 中添加角色名称
3. 更新所有权限检查逻辑

### Q: 权限控制不生效怎么办？

1. 检查浏览器控制台是否有错误
2. 确认 `userRole` 变量是否正确设置
3. 确认 `applyPermissionControls()` 是否被调用
4. 使用调试面板测试不同角色

## 支持

如有问题，请查看：
- 浏览器控制台日志
- `admin.html` 中的函数注释
- API 端点文档

---

**版本:** 1.0  
**最后更新:** 2025-02-06  
**作者:** JJConnect Development Team
