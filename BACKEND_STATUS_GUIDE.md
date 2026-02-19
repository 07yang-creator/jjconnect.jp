# Backend Status Display 使用指南

## 📋 更新内容

### 1. ✅ Worker API 端点添加

在 `workers/auth-worker.js` 中添加了新的状态检查端点：

#### 端点信息
```
GET /api/backend/status
```

#### 返回数据
```json
{
  "success": true,
  "message": "Current Backend: Supabase Connection Active",
  "data": {
    "status": "active",
    "backend": "Supabase",
    "connection": "Active",
    "supabaseUrlPrefix": "https",  // 前5个字符
    "supabaseKeyPrefix": "eyJhb",  // 前5个字符
    "timestamp": "2026-02-15T14:30:00.000Z"
  }
}
```

### 2. ✅ 控制台调试日志

Worker 现在会在每个请求中输出调试信息：

```javascript
console.log('[DEBUG] 🚀 GET /api/backend/status');
console.log('[DEBUG] 🔌 SUPABASE_URL prefix: https...');
console.log('[DEBUG] 🔑 SUPABASE_ANON_KEY prefix: eyJhb...');
```

### 3. ✅ 状态页面

创建了 `backend-status.html` - 一个漂亮的状态监控页面。

---

## 🚀 使用方法

### 方法 1: 访问状态页面

1. **部署到 Cloudflare**
   ```bash
   npm run build
   wrangler deploy
   ```

2. **访问状态页面**
   ```
   https://your-worker.workers.dev/backend-status.html
   或
   https://jjconnect.jp/backend-status.html
   ```

3. **页面功能**
   - ✅ 顶部显示醒目的状态横幅：**"Current Backend: Supabase Connection Active"**
   - ✅ 显示详细的连接信息
   - ✅ 显示 Supabase URL 和 Key 的前5个字符
   - ✅ 实时控制台输出
   - ✅ 自动刷新（每30秒）
   - ✅ 手动刷新按钮

---

### 方法 2: 使用 wrangler tail 查看日志

1. **启动日志监控**
   ```bash
   wrangler tail
   ```

2. **发起请求**
   ```bash
   # 在另一个终端
   curl https://your-worker.workers.dev/api/backend/status
   ```

3. **查看输出**
   ```
   [DEBUG] 🚀 GET /api/backend/status
   [DEBUG] 🔌 SUPABASE_URL prefix: https...
   [DEBUG] 🔑 SUPABASE_ANON_KEY prefix: eyJhb...
   ```

---

### 方法 3: 在任何页面嵌入状态横幅

将以下代码添加到任何 HTML 页面的 `<body>` 标签后：

```html
<!-- Backend Status Banner -->
<div id="backend-status-banner" style="
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 12px 20px;
    text-align: center;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
">
    <span id="status-icon">⏳</span>
    <span id="status-text">Loading backend status...</span>
</div>

<script>
(function() {
    const banner = document.getElementById('backend-status-banner');
    const icon = document.getElementById('status-icon');
    const text = document.getElementById('status-text');
    
    fetch('/api/backend/status')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data.connection === 'Active') {
                icon.textContent = '✅';
                text.textContent = 'Current Backend: Supabase Connection Active';
                banner.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                
                // 在控制台输出调试信息
                console.log('[DEBUG] 🔌 SUPABASE_URL prefix:', data.data.supabaseUrlPrefix);
                console.log('[DEBUG] 🔑 SUPABASE_ANON_KEY prefix:', data.data.supabaseKeyPrefix);
            } else {
                icon.textContent = '❌';
                text.textContent = 'Backend Connection Failed';
                banner.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            }
        })
        .catch(err => {
            icon.textContent = '⚠️';
            text.textContent = 'Unable to check backend status';
            banner.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            console.error('[ERROR] Backend status check failed:', err);
        });
})();
</script>
```

---

## 📊 状态页面截图

访问 `backend-status.html` 后，您会看到：

```
┌──────────────────────────────────────────────┐
│ ✅ Current Backend: Supabase Connection Active │
└──────────────────────────────────────────────┘

🔌 Backend Status
┌────────────────────────────────────────┐
│ Backend Type:         Supabase         │
│ Connection Status:    Active           │
│ Supabase URL Prefix:  https...         │
│ Supabase Key Prefix:  eyJhb...         │
│ Last Checked:         2026-02-15 14:30 │
└────────────────────────────────────────┘

       🔄 Refresh Status

┌─── Console Output ───────────────────┐
│ [14:30:00] Fetching backend status... │
│ [14:30:01] ✓ Backend: Supabase       │
│ [14:30:01] ✓ Connection: Active      │
│ [14:30:01] ✓ Supabase URL: https...  │
│ [14:30:01] ✓ Supabase Key: eyJhb...  │
└──────────────────────────────────────┘
```

---

## 🔍 在 wrangler tail 中查看日志

### 启动监控
```bash
cd /Users/mini23/Documents/GitHub/jjconnect.jp
wrangler tail
```

### 触发请求
```bash
# 方法 1: curl
curl https://jjconnect-auth-worker.your-subdomain.workers.dev/api/backend/status

# 方法 2: 访问页面
open https://jjconnect-auth-worker.your-subdomain.workers.dev/backend-status.html

# 方法 3: 使用 JavaScript
fetch('/api/backend/status').then(r => r.json()).then(console.log);
```

### 预期输出
```
[2026-02-15 14:30:00] [INFO] [DEBUG] 🚀 GET /api/backend/status
[2026-02-15 14:30:00] [INFO] [DEBUG] 🔌 SUPABASE_URL prefix: https...
[2026-02-15 14:30:00] [INFO] [DEBUG] 🔑 SUPABASE_ANON_KEY prefix: eyJhb...
```

---

## 🛠️ 故障排查

### 问题 1: 状态显示 "NOT_SET"

**原因**: 环境变量未配置

**解决方法**:
```bash
# 检查环境变量
wrangler secret list

# 设置环境变量
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# 或使用 .dev.vars（仅本地）
echo 'SUPABASE_URL=https://your-project.supabase.co' > .dev.vars
echo 'SUPABASE_ANON_KEY=your-key' >> .dev.vars
```

### 问题 2: 无法访问状态页面

**检查**:
1. Worker 是否已部署
2. 路由配置是否正确
3. 构建是否成功

```bash
# 重新构建和部署
npm run build
wrangler deploy

# 测试端点
curl https://your-worker.workers.dev/api/backend/status
```

### 问题 3: wrangler tail 没有输出

**解决方法**:
```bash
# 确保 Worker 正在运行
wrangler dev

# 在另一个终端
wrangler tail --format pretty

# 触发请求
curl http://localhost:8787/api/backend/status
```

---

## 📝 集成到现有页面

### 选项 A: 使用 iframe
```html
<iframe src="/backend-status.html" 
        width="100%" 
        height="800" 
        frameborder="0"
        style="border-radius: 10px;">
</iframe>
```

### 选项 B: 只显示状态横幅

在任何页面的 `<head>` 部分添加：

```html
<script>
window.addEventListener('DOMContentLoaded', () => {
    // 创建状态横幅
    const banner = document.createElement('div');
    banner.id = 'backend-status-banner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 12px 20px;
        text-align: center;
        font-weight: 600;
        font-size: 16px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 9999;
    `;
    banner.innerHTML = '<span>⏳</span> Loading backend status...';
    document.body.insertBefore(banner, document.body.firstChild);
    
    // 检查状态
    fetch('/api/backend/status')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data.connection === 'Active') {
                banner.innerHTML = '<span>✅</span> Current Backend: Supabase Connection Active';
                console.log('[DEBUG] 🔌 SUPABASE_URL prefix:', data.data.supabaseUrlPrefix);
                console.log('[DEBUG] 🔑 SUPABASE_ANON_KEY prefix:', data.data.supabaseKeyPrefix);
            } else {
                banner.innerHTML = '<span>❌</span> Backend Connection Failed';
                banner.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            }
        })
        .catch(err => {
            banner.innerHTML = '<span>⚠️</span> Unable to check backend status';
            banner.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            console.error('[ERROR]', err);
        });
});
</script>
```

---

## ✨ 功能总结

| 功能 | 状态 | 说明 |
|------|------|------|
| 状态 API 端点 | ✅ | `/api/backend/status` |
| 环境变量日志 | ✅ | 输出前5个字符 |
| 状态页面 | ✅ | `backend-status.html` |
| wrangler tail 支持 | ✅ | 实时日志输出 |
| 浏览器控制台输出 | ✅ | console.log 调试 |
| 自动刷新 | ✅ | 每30秒 |
| 响应式设计 | ✅ | 移动端友好 |

---

## 🎯 快速测试

```bash
# 1. 构建
npm run build

# 2. 本地测试
wrangler dev

# 3. 在另一个终端访问
curl http://localhost:8787/api/backend/status

# 4. 或在浏览器打开
open http://localhost:8787/backend-status.html

# 5. 查看日志
wrangler tail
```

---

**创建时间**: 2026-02-15  
**版本**: 1.0.0  
**状态**: ✅ 完成并测试
