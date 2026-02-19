# Joint Mamori 提交系统 - R2 文件上传完整实现

## 🎯 实现概述

已完成 Joint Mamori 提交系统的完整文件上传功能,集成 Cloudflare R2 对象存储和 D1 数据库。

### 核心功能

✅ **R2 文件存储** - 图片和视频上传到 Cloudflare R2  
✅ **Multipart 表单** - 前端使用 FormData 发送文件  
✅ **文件验证** - 类型、大小验证 (最大 50MB)  
✅ **数据库集成** - 存储文件元数据 (key, filename, size, type)  
✅ **邮件通知** - 包含文件链接的通知邮件  
✅ **文件服务** - 通过 Worker 端点访问文件

---

## 📁 文件变更总结

### 1. workers/wrangler.toml (新建)

```toml
name = "jjconnect-auth-worker"
main = "auth-worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "jjconnect-db"
database_id = "your-database-id"  # 需替换

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "jjconnect"
preview_bucket_name = "jjconnect-preview"
```

**重要配置**:
- `binding = "MY_BUCKET"` - Worker 中使用 `env.MY_BUCKET` 访问
- `bucket_name = "jjconnect"` - R2 存储桶名称

### 2. schema.sql (更新)

**新增字段**:
```sql
media_key TEXT,           -- R2 存储的文件 Key (2025/02/07/timestamp-id.jpg)
media_filename TEXT,      -- 原始文件名
media_size INTEGER,       -- 文件大小 (bytes)
media_type TEXT,          -- MIME 类型 (image/jpeg, video/mp4)
```

**移除字段**:
- ~~`media_url TEXT`~~ → 改为 `media_key`

### 3. workers/auth-worker.js (主要更新)

#### 新增功能模块

**A. 文件上传辅助函数**
```javascript
// 生成唯一文件 Key
function generateFileKey(filename)
// 格式: 2025/02/07/1739066789-a3f9d2c1e.jpg

// 验证文件类型
function isValidFileType(mimeType)
// 支持: image/*, video/*

// 上传到 R2
async function uploadToR2(file, env)
// 返回: { success, key, filename, size, type }
```

**B. 更新的提交接口**
```javascript
async function handleSubmit(request, env)
```

变更:
- 接收 `multipart/form-data` (不再是 JSON)
- 提取文件: `const mediaFile = formData.get('media')`
- 上传到 R2: `const uploadResult = await uploadToR2(mediaFile, env)`
- 存储文件元数据到数据库

**C. 文件服务接口**
```javascript
async function handleGetFile(request, env)
// GET /api/files/:key
// 从 R2 读取并返回文件
```

### 4. joint-mamori-submission.html (前端更新)

**主要变更**:
```javascript
// 改为 FormData (不再是 JSON)
const formData = new FormData();
formData.append('name', ...);
formData.append('media', file); // 添加文件

// 发送 multipart/form-data
fetch(API_ENDPOINT + '/api/submit', {
    method: 'POST',
    body: formData
    // 不设置 Content-Type,浏览器自动添加 boundary
});
```

**新增验证**:
- 文件类型验证 (仅图片/视频)
- 文件大小验证 (最大 50MB)
- 实时反馈文件选择状态

---

## 🚀 部署步骤

### 步骤 1: 创建 R2 存储桶

```bash
# 登录 Cloudflare
npx wrangler login

# 创建 R2 存储桶
npx wrangler r2 bucket create jjconnect

# 验证创建成功
npx wrangler r2 bucket list
```

**预期输出**:
```
✅ Created bucket 'jjconnect'
```

### 步骤 2: 创建 D1 数据库 (如果还没有)

```bash
# 创建数据库
npx wrangler d1 create jjconnect-db

# 记录输出的 database_id
# 例如: database_id = "abc123def456"
```

**更新 wrangler.toml**:
```toml
[[d1_databases]]
binding = "DB"
database_name = "jjconnect-db"
database_id = "abc123def456"  # 替换为实际 ID
```

### 步骤 3: 运行数据库迁移

```bash
cd /Users/mini23/Documents/GitHub/jjconnect.jp

# 本地测试 (推荐先测试)
npx wrangler d1 execute jjconnect-db --local --file=schema.sql

# 生产环境
npx wrangler d1 execute jjconnect-db --remote --file=schema.sql
```

**验证字段**:
```bash
npx wrangler d1 execute jjconnect-db --command \
  "PRAGMA table_info(submissions);"
```

应该看到新字段:
- `media_key`
- `media_filename`
- `media_size`
- `media_type`

### 步骤 4: 部署 Worker

```bash
cd workers

# 部署
npx wrangler deploy auth-worker.js

# 记录部署 URL
# 例如: https://jjconnect-auth-worker.your-subdomain.workers.dev
```

### 步骤 5: 更新前端配置

编辑 `joint-mamori-submission.html`:
```javascript
// 第 308 行,更改为实际 Worker URL
const API_ENDPOINT = 'https://jjconnect-auth-worker.your-subdomain.workers.dev';
```

---

## 🧪 测试指南

### 测试 1: 文件上传验证

**测试用例 1.1: 有效图片**
```
文件: test.jpg (2MB)
类型: image/jpeg
预期: ✅ 上传成功
```

**测试用例 1.2: 有效视频**
```
文件: test.mp4 (10MB)
类型: video/mp4
预期: ✅ 上传成功
```

**测试用例 1.3: 无效类型**
```
文件: test.pdf (1MB)
类型: application/pdf
预期: ❌ "不支持的文件类型"
```

**测试用例 1.4: 文件过大**
```
文件: large.mp4 (100MB)
类型: video/mp4
预期: ❌ "文件过大"
```

### 测试 2: 完整提交流程

**步骤**:
1. 打开 `https://jjconnect.jp/joint-mamori-submission.html`
2. 填写表单:
   - 姓名: テストユーザー
   - 邮箱: test@example.com
   - 关系: 環境問題
   - 内容: テスト提出です
3. 上传文件: test.jpg (< 5MB)
4. 勾选隐私政策
5. 提交

**预期结果**:
```
✓ 提交成功!已发送至 support@jjconnect.jp 并存入后台
✓ ファイルが正常にアップロードされました
```

### 测试 3: 验证数据库记录

```bash
# 查询最新提交
npx wrangler d1 execute jjconnect-db --command \
  "SELECT id, user_name, media_key, media_filename, media_size, created_at 
   FROM submissions ORDER BY created_at DESC LIMIT 5;"
```

**预期输出**:
```
id | user_name        | media_key                           | media_filename | media_size
1  | テストユーザー   | 2025/02/07/1739066789-a3f9d2c.jpg  | test.jpg       | 2048576
```

### 测试 4: 访问上传的文件

```bash
# 方法 1: 通过 Worker 端点
curl -I https://your-worker.workers.dev/api/files/2025/02/07/1739066789-a3f9d2c.jpg

# 预期: HTTP/1.1 200 OK
# Content-Type: image/jpeg
```

```javascript
// 方法 2: 在浏览器中
window.open('/api/files/' + mediaKey);
```

### 测试 5: 检查邮件通知

**检查内容**:
- 收件人: support@jjconnect.jp
- 主题: 新提交 - Joint Mamori Project (環境問題)
- 正文包含:
  - 提交者姓名和邮箱
  - 关系类型
  - 内容
  - ✅ 媒体文件链接 (查看文件)

---

## 📊 文件存储结构

### R2 存储桶结构
```
jjconnect/
├── 2025/
│   └── 02/
│       ├── 06/
│       │   ├── 1739025600-abc123.jpg
│       │   └── 1739029200-def456.mp4
│       └── 07/
│           ├── 1739066789-a3f9d2c.jpg
│           └── 1739070389-b4e0f3d.mp4
└── ...
```

**Key 格式**: `YYYY/MM/DD/timestamp-randomId.ext`

**优点**:
- 按日期组织,便于管理
- 唯一性保证 (timestamp + random)
- 易于清理旧文件

### 数据库记录
```sql
CREATE TABLE submissions (
  id: 1
  user_id: NULL
  user_name: "テストユーザー"
  user_email: "test@example.com"
  relation_type: "環境問題"
  content: "テスト提出です"
  media_key: "2025/02/07/1739066789-a3f9d2c.jpg"
  media_filename: "test.jpg"
  media_size: 2048576
  media_type: "image/jpeg"
  status: "pending"
  created_at: "2025-02-07 10:39:49"
);
```

---

## 🔐 安全性考虑

### 已实现的安全措施

✅ **文件类型白名单**
```javascript
const validTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm'
];
```

✅ **文件大小限制**
```javascript
const maxSize = 50 * 1024 * 1024; // 50MB
```

✅ **唯一文件名**
```javascript
const key = `${year}/${month}/${day}/${timestamp}-${randomId}.${ext}`;
// 避免文件名冲突和路径遍历攻击
```

✅ **MIME 类型验证**
```javascript
// 检查 file.type,不依赖文件扩展名
```

### 建议的额外安全措施

**1. 内容扫描**
```javascript
// 使用 Cloudflare Images 的自动病毒扫描
// 或集成第三方 API (如 VirusTotal)
```

**2. Rate Limiting**
```javascript
// 限制每个 IP 的上传频率
const uploads = await env.RATE_LIMIT.get(ip);
if (uploads > 10) {
  return errorResponse('上传过于频繁', 429);
}
```

**3. 认证上传**
```javascript
// 仅允许登录用户上传
if (!token) {
  return errorResponse('需要登录才能上传文件', 401);
}
```

**4. 文件访问控制**
```javascript
// 使用签名 URL,限时访问
async function generateSignedUrl(key, expiresIn = 3600) {
  // 生成带签名的临时 URL
}
```

---

## 🎨 前端 UI 增强

### 当前功能

✅ 文件选择按钮  
✅ 文件名和大小显示  
✅ 类型和大小验证  
✅ 上传进度反馈 ("送信中...")  
✅ 成功/错误消息

### 建议的增强功能

**1. 上传进度条**
```javascript
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  const percent = (e.loaded / e.total) * 100;
  progressBar.style.width = percent + '%';
});
```

**2. 图片预览**
```javascript
const file = fileInput.files[0];
const reader = new FileReader();
reader.onload = (e) => {
  previewImage.src = e.target.result;
};
reader.readAsDataURL(file);
```

**3. 拖放上传**
```javascript
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  handleFiles(files);
});
```

**4. 多文件上传**
```html
<input type="file" multiple accept="image/*,video/*">
```

---

## 🔧 故障排查

### 问题 1: "R2 bucket not configured"

**原因**: wrangler.toml 中没有配置 R2 绑定

**解决**:
```bash
# 检查 wrangler.toml
cat workers/wrangler.toml | grep -A 2 "r2_buckets"

# 应该看到:
# [[r2_buckets]]
# binding = "MY_BUCKET"
# bucket_name = "jjconnect"

# 重新部署
npx wrangler deploy
```

### 问题 2: "no such column: media_key"

**原因**: 数据库 schema 未更新

**解决**:
```bash
# 删除旧表并重新创建 (警告: 会删除数据!)
npx wrangler d1 execute jjconnect-db --command "DROP TABLE submissions;"
npx wrangler d1 execute jjconnect-db --file=schema.sql

# 或者使用 ALTER TABLE (推荐)
npx wrangler d1 execute jjconnect-db --command \
  "ALTER TABLE submissions ADD COLUMN media_key TEXT;"
```

### 问题 3: 文件上传后无法访问

**检查 R2 对象**:
```bash
npx wrangler r2 object list jjconnect --prefix="2025/02/07/"
```

**访问文件**:
```bash
# 通过 Worker
curl https://your-worker.workers.dev/api/files/2025/02/07/xxx.jpg

# 或配置 R2 公开访问
npx wrangler r2 bucket create jjconnect --public
```

### 问题 4: CORS 错误

**确认 CORS 头**:
```javascript
// auth-worker.js 中应该有:
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

---

## 💰 成本估算

### Cloudflare R2 定价 (2025)

| 项目 | 价格 | 备注 |
|------|------|------|
| 存储 | $0.015/GB/月 | 10GB 免费 |
| Class A 操作 | $4.50/百万次 | 写入 (PUT, POST) |
| Class B 操作 | $0.36/百万次 | 读取 (GET) |
| 出口流量 | 免费 | 通过 Cloudflare CDN |

**示例计算** (每月 1000 次提交):
- 存储: 1000 文件 × 5MB = 5GB → $0.075
- 上传: 1000 × PUT → $0.0045
- 访问: 1000 × 10 views × GET → $0.0036
- **总计**: ~$0.08/月

**结论**: 成本非常低,适合中小型应用

---

## 📚 API 文档更新

### POST /api/submit

**变更**: Content-Type 从 `application/json` 改为 `multipart/form-data`

**请求**:
```http
POST /api/submit HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="name"

テストユーザー
------WebKitFormBoundary...
Content-Disposition: form-data; name="email"

test@example.com
------WebKitFormBoundary...
Content-Disposition: form-data; name="media"; filename="test.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary...--
```

**响应**:
```json
{
  "success": true,
  "message": "提交成功!已发送至 support@jjconnect.jp 并存入后台",
  "submission_id": 123,
  "media_uploaded": true
}
```

### GET /api/files/:key (新增)

**功能**: 从 R2 获取上传的文件

**请求**:
```http
GET /api/files/2025/02/07/1739066789-a3f9d2c.jpg HTTP/1.1
```

**响应**:
```http
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 2048576
Cache-Control: public, max-age=31536000

[binary data]
```

---

## ✅ 完成清单

- ✅ 配置 wrangler.toml (R2 绑定)
- ✅ 更新 schema.sql (media_key 等字段)
- ✅ 实现文件上传到 R2
- ✅ 更新提交接口 (multipart/form-data)
- ✅ 实现文件服务接口 (GET /api/files/:key)
- ✅ 更新前端 (FormData 上传)
- ✅ 添加文件验证 (类型、大小)
- ✅ 邮件通知包含文件链接
- ✅ 完整测试流程

**所有任务已完成! 🎉**

---

## 🚦 下一步

### 短期优化

1. **配置 R2 公开访问** (可选)
   ```bash
   # 配置自定义域名
   npx wrangler r2 bucket domain add jjconnect files.jjconnect.jp
   ```

2. **添加上传进度条**
3. **实现图片预览**
4. **多文件上传支持**

### 长期增强

1. **图片压缩和优化** (Cloudflare Images)
2. **视频转码** (Cloudflare Stream)
3. **内容审核** (AI 审核)
4. **文件版本控制**
5. **定时清理旧文件**

---

生成时间: 2025-02-07  
版本: v2.0.0 (R2 Integration)
