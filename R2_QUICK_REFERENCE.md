# Joint Mamori R2 文件上传 - 快速参考

## 🚀 一键部署

```bash
# 1. 创建 R2 存储桶
npx wrangler r2 bucket create jjconnect

# 2. 创建 D1 数据库 (如果还没有)
npx wrangler d1 create jjconnect-db
# 记录 database_id,更新到 wrangler.toml

# 3. 运行数据库迁移
cd /Users/mini23/Documents/GitHub/jjconnect.jp
npx wrangler d1 execute jjconnect-db --remote --file=schema.sql

# 4. 部署 Worker
cd workers
npx wrangler deploy auth-worker.js

# 5. 更新前端配置 (joint-mamori-submission.html)
# 将 API_ENDPOINT 改为实际 Worker URL

# 完成! 🎉
```

---

## 📁 关键文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `workers/wrangler.toml` | R2 和 D1 配置 | ✅ 已创建 |
| `schema.sql` | 数据库 Schema | ✅ 已更新 |
| `workers/auth-worker.js` | 后端 API | ✅ 已更新 |
| `joint-mamori-submission.html` | 前端表单 | ✅ 已更新 |

---

## 🔑 重要配置

### wrangler.toml
```toml
[[r2_buckets]]
binding = "MY_BUCKET"        # Worker 中使用 env.MY_BUCKET
bucket_name = "jjconnect"    # R2 存储桶名称

[[d1_databases]]
binding = "DB"
database_name = "jjconnect-db"
database_id = "替换为实际ID"  # ⚠️ 必须替换
```

### 前端配置
```javascript
// joint-mamori-submission.html 第 308 行
const API_ENDPOINT = 'https://your-worker.workers.dev';  // ⚠️ 替换为实际 URL
```

---

## 🧪 快速测试

### 测试命令
```bash
# 查看 R2 存储桶
npx wrangler r2 bucket list

# 查看已上传文件
npx wrangler r2 object list jjconnect

# 查看数据库记录
npx wrangler d1 execute jjconnect-db --command \
  "SELECT id, user_name, media_key, media_filename FROM submissions;"

# 查看 Worker 日志
npx wrangler tail
```

### 浏览器测试
1. 打开 `https://jjconnect.jp/joint-mamori-submission.html`
2. 填写表单并上传图片 (< 50MB)
3. 提交
4. 预期: ✅ "提交成功! ✅ ファイルが正常にアップロードされました"

---

## 📊 支持的文件类型

### 图片
- JPEG/JPG
- PNG
- GIF
- WebP
- HEIC/HEIF

### 视频
- MP4
- MPEG
- QuickTime (MOV)
- WebM
- 3GP

### 限制
- 最大文件大小: 50MB
- 单次上传: 1 个文件

---

## 🔧 常见问题

### Q1: "R2 bucket not configured"
**解决**: 检查 wrangler.toml 中的 R2 配置并重新部署
```bash
npx wrangler deploy
```

### Q2: "no such column: media_key"
**解决**: 运行数据库迁移
```bash
npx wrangler d1 execute jjconnect-db --remote --file=schema.sql
```

### Q3: 文件无法访问
**解决**: 通过 Worker 端点访问
```
https://your-worker.workers.dev/api/files/2025/02/07/xxx.jpg
```

### Q4: 上传失败
**检查**:
1. 文件类型是否支持
2. 文件大小是否 < 50MB
3. 浏览器控制台错误信息
4. Worker 日志: `npx wrangler tail`

---

## 📋 API 端点

| 方法 | 端点 | 功能 |
|------|------|------|
| POST | `/api/submit` | 提交表单 (multipart/form-data) |
| GET | `/api/submissions` | 获取提交列表 (Admin only) |
| GET | `/api/files/:key` | 获取上传的文件 |

---

## 💡 开发技巧

### 本地测试
```bash
# 启动本地 Worker
cd workers
npx wrangler dev

# 前端指向本地
const API_ENDPOINT = 'http://localhost:8787';
```

### 查看上传的文件
```javascript
// 在浏览器控制台
fetch('/api/files/2025/02/07/xxx.jpg')
  .then(r => r.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    window.open(url);
  });
```

### 删除测试文件
```bash
# 列出文件
npx wrangler r2 object list jjconnect --prefix="2025/02/07/"

# 删除文件
npx wrangler r2 object delete jjconnect 2025/02/07/xxx.jpg
```

---

## 📈 性能优化

### CDN 缓存
```javascript
// 文件响应已配置 1 年缓存
headers.set('Cache-Control', 'public, max-age=31536000');
```

### 文件服务
```javascript
// 使用 R2 自定义域名 (推荐)
npx wrangler r2 bucket domain add jjconnect files.jjconnect.jp
```

---

## 🔐 安全建议

### 生产环境
1. ✅ 启用 Rate Limiting
2. ✅ 仅允许登录用户上传
3. ✅ 添加病毒扫描
4. ✅ 使用签名 URL (限时访问)

### 示例: Rate Limiting
```javascript
// 在 handleSubmit 开头添加
const ip = request.headers.get('CF-Connecting-IP');
const uploadCount = await env.RATE_LIMIT.get(ip);
if (uploadCount > 10) {
  return errorResponse('上传过于频繁,请稍后再试', 429);
}
```

---

## 📚 相关文档

- [完整实现报告](R2_UPLOAD_IMPLEMENTATION.md)
- [部署指南](DEPLOYMENT_GUIDE.md)
- [API 文档](JOINT_MAMORI_IMPLEMENTATION.md)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)

---

## 🆘 获取帮助

```bash
# 查看 Worker 日志
npx wrangler tail

# 查看详细错误
npx wrangler tail --format=json

# 联系支持
# 1. 检查日志
# 2. 确认配置
# 3. 查看文档
```

---

**部署完成后记得测试所有功能! ✨**

最后更新: 2025-02-07
