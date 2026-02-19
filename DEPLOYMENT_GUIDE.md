# Joint Mamori 提交系统 - 快速部署指南

## 🚀 5 分钟快速上手

### 步骤 1: 数据库迁移

```bash
# 进入项目目录
cd /Users/mini23/Documents/GitHub/jjconnect.jp

# 本地测试环境 (推荐先测试)
npx wrangler d1 execute jjconnect-db --local --file=schema.sql

# 生产环境部署
npx wrangler d1 execute jjconnect-db --remote --file=schema.sql
```

**验证**: 确保看到 `CREATE TABLE` 成功消息

---

### 步骤 2: 部署 Worker (后端 API)

```bash
cd workers

# 部署到 Cloudflare Workers
npx wrangler deploy auth-worker.js

# 记录部署后的 Worker URL (例如: https://auth-worker.your-subdomain.workers.dev)
```

**重要**: 复制部署后的 URL,需要在前端配置中使用

---

### 步骤 3: 更新前端配置

编辑 `joint-mamori-submission.html`:

```javascript
// 第 308 行附近,找到这一行:
const API_ENDPOINT = 'http://localhost:8787';

// 改为你的 Worker URL:
const API_ENDPOINT = 'https://auth-worker.your-subdomain.workers.dev';
```

---

### 步骤 4: 测试提交功能

1. 在浏览器打开: `https://jjconnect.jp/joint-mamori-submission.html`
2. 填写测试数据:
   - 姓名: テストユーザー
   - 邮箱: test@example.com
   - 关系: 環境問題
   - 内容: テスト提出
3. 勾选隐私政策
4. 点击 "記録を提出する"

**预期结果**:
- ✅ 绿色成功提示
- ✅ support@jjconnect.jp 收到邮件
- ✅ 数据存入数据库

---

### 步骤 5: 管理后台查看

1. 登录管理后台: `https://jjconnect.jp/admin.html`
2. 点击左侧菜单 "📮 提交管理"
3. 点击 "刷新列表"
4. 查看刚才的测试提交

---

## 🧪 测试清单

### 邮件功能测试

- [ ] 注册新用户,检查是否收到欢迎邮件
- [ ] 提交表单,检查 support@jjconnect.jp 是否收到通知

### 提交功能测试

- [ ] 匿名提交 (不登录)
- [ ] 登录后提交 (关联 user_id)
- [ ] 带文件上传 (当前为文件名占位)
- [ ] 各种关系类型选择

### 管理后台测试

- [ ] 加载提交列表
- [ ] 按状态筛选 (pending/reviewed/resolved)
- [ ] 查看统计数据
- [ ] 尝试状态变更

---

## 🐛 常见问题排查

### 问题 1: 邮件未收到

**检查**:
```bash
# 查看 Worker 日志
npx wrangler tail auth-worker

# 寻找类似错误:
# ⚠️ Failed to send email: ...
```

**解决方案**:
- 确认 MailChannels API 正常 (Cloudflare Workers 默认支持)
- 检查邮箱是否在垃圾邮件中
- 验证域名 DNS 配置

### 问题 2: 提交失败 "数据库表不存在"

**检查**:
```bash
# 列出所有表
npx wrangler d1 execute jjconnect-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**解决方案**:
```bash
# 重新运行数据库迁移
npx wrangler d1 execute jjconnect-db --remote --file=schema.sql
```

### 问题 3: CORS 错误

**症状**: 浏览器控制台显示 "Access-Control-Allow-Origin" 错误

**解决方案**:
在 `auth-worker.js` 中已配置 CORS,确保:
```javascript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  // ...
};
```

### 问题 4: 管理后台无法加载提交

**检查**:
- 确认以 Admin 身份登录 (role = 2)
- 浏览器控制台查看 API 调用错误
- 检查 Worker URL 配置

---

## 📋 文件上传实现 (可选)

### 使用 Cloudflare R2

1. **创建 R2 存储桶**:
```bash
npx wrangler r2 bucket create jjconnect-submissions
```

2. **在 wrangler.toml 中绑定**:
```toml
[[r2_buckets]]
binding = "SUBMISSIONS_BUCKET"
bucket_name = "jjconnect-submissions"
```

3. **实现上传端点**:
```javascript
// In auth-worker.js
async function handleFileUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');
  
  const key = `${Date.now()}-${file.name}`;
  await env.SUBMISSIONS_BUCKET.put(key, file.stream());
  
  return jsonResponse({
    success: true,
    url: `https://pub-xxx.r2.dev/${key}`
  });
}
```

4. **前端调用**:
```javascript
// In joint-mamori-submission.html
const file = fileInput.files[0];
const uploadFormData = new FormData();
uploadFormData.append('file', file);

const uploadResponse = await fetch(`${API_ENDPOINT}/api/upload`, {
  method: 'POST',
  body: uploadFormData
});

const { url } = await uploadResponse.json();
formData.media_url = url;
```

---

## 🔒 生产环境安全建议

### 1. 环境变量

不要在代码中硬编码敏感信息:

```bash
# 设置 Worker Secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put MAILCHANNELS_API_KEY  # 如果需要
```

### 2. Rate Limiting

添加请求频率限制:

```javascript
// Simple rate limiting example
const submissions = await env.RATE_LIMIT.get(ip);
if (submissions > 10) {
  return errorResponse('请求过于频繁,请稍后再试', 429);
}
await env.RATE_LIMIT.put(ip, (submissions || 0) + 1, { expirationTtl: 3600 });
```

### 3. 输入验证

加强服务器端验证:

```javascript
// Email validation
if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  return errorResponse('邮箱格式不正确', 400);
}

// Content length limit
if (content.length > 5000) {
  return errorResponse('内容超过最大长度限制 (5000字)', 400);
}
```

---

## 📊 监控和日志

### 查看实时日志

```bash
# 实时监控 Worker 日志
npx wrangler tail auth-worker

# 筛选错误日志
npx wrangler tail auth-worker --status error
```

### 数据库查询

```bash
# 查看最近的提交
npx wrangler d1 execute jjconnect-db --command \
  "SELECT * FROM submissions ORDER BY created_at DESC LIMIT 10;"

# 统计各状态数量
npx wrangler d1 execute jjconnect-db --command \
  "SELECT status, COUNT(*) as count FROM submissions GROUP BY status;"
```

---

## 🎯 性能优化建议

### 1. 启用 Cloudflare Cache

```javascript
// Cache GET requests
if (method === 'GET' && path === '/api/submissions') {
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  const cachedResponse = await cache.match(cacheKey);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const response = await handleGetSubmissions(request, env);
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
```

### 2. 数据库索引优化

已添加的索引:
- `idx_submissions_user_id` - 按用户查询
- `idx_submissions_status` - 按状态筛选
- `idx_submissions_created_at` - 按时间排序

### 3. 分页实现

```javascript
// Frontend
const page = 1;
const pageSize = 20;
const offset = (page - 1) * pageSize;

// Backend
const results = await env.DB.prepare(
  'SELECT * FROM submissions LIMIT ? OFFSET ?'
).bind(pageSize, offset).all();
```

---

## 🔄 更新和维护

### 更新 Worker

```bash
# 修改 auth-worker.js 后
cd workers
npx wrangler deploy auth-worker.js
```

### 数据库迁移

```bash
# 添加新字段或表
npx wrangler d1 execute jjconnect-db --remote --command \
  "ALTER TABLE submissions ADD COLUMN priority INTEGER DEFAULT 0;"
```

### 回滚

```bash
# 查看历史版本
npx wrangler deployments list

# 回滚到指定版本
npx wrangler rollback --version-id <version-id>
```

---

## 📞 支持和资源

### 文档

- **完整实现报告**: `JOINT_MAMORI_IMPLEMENTATION.md`
- **API 文档**: 见 `auth-worker.js` 注释
- **数据库 Schema**: `schema.sql`

### Cloudflare 资源

- [Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 数据库](https://developers.cloudflare.com/d1/)
- [R2 存储](https://developers.cloudflare.com/r2/)
- [MailChannels](https://support.mailchannels.com/hc/en-us/articles/4565898358413)

### 社区

- Cloudflare Discord: https://discord.gg/cloudflaredev
- GitHub Issues: (你的仓库地址)

---

**部署完成后,别忘了测试所有功能! 🎉**

如有问题,请查看 Worker 日志获取详细错误信息。
