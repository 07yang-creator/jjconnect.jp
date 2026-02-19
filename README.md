# JJConnect - 日本人社区平台

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/jjconnect/jjconnect.jp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-3ECF8E.svg)](https://supabase.com)

> 基于 Supabase 的现代化社区内容管理平台，支持文章发布、分类浏览、付费内容等功能。

## 🌟 项目特色

- 📝 **富文本编辑** - 支持 TipTap 和 Quill 编辑器
- 💰 **付费内容** - 完整的付费文章系统
- 🗂️ **分类管理** - 官方分类 + 个人分类
- 👤 **用户权限** - 多级权限管理系统
- 📱 **响应式设计** - 完美适配各种设备
- 🔐 **安全可靠** - 基于 Supabase RLS 的权限控制

## 🚀 快速开始

### 方式 1: 使用独立 HTML（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/jjconnect.jp.git
cd jjconnect.jp

# 2. 配置 Supabase
# 在以下文件中更新配置：
# - home.html (第 73 行)
# - category.html (第 99 行)
# - publish.html (第 151 行)

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

# 3. 启动本地服务器
python3 -m http.server 8000

# 4. 访问应用
open http://localhost:8000/home.html
```

### 方式 2: 使用 Next.js

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 配置

# 3. 运行开发服务器
npm run dev

# 4. 访问应用
open http://localhost:3000
```

## 📦 项目结构

```
jjconnect.jp/
├── app/                          # Next.js 应用目录
│   ├── page.tsx                  # 首页
│   ├── publish/                  # 文章发布
│   │   └── page.tsx
│   ├── category/[slug]/          # 动态分类页
│   │   └── page.tsx
│   ├── actions/                  # Server Actions
│   │   └── posts.ts
│   ├── layout.tsx                # 根布局
│   └── globals.css               # 全局样式
├── components/                   # React 组件
│   └── layout/
│       ├── RightSidebar.tsx      # 右侧边栏
│       └── RightSidebar.js       # JS 版本
├── lib/                          # 工具库
│   └── supabase/
│       ├── client.ts             # 客户端配置
│       └── server.ts             # 服务端工具
├── types/                        # TypeScript 类型
│   └── database.ts
├── workers/                      # Cloudflare Workers
│   └── auth-worker.js
├── *.html                        # 独立 HTML 页面
│   ├── home.html                 # 首页
│   ├── category.html             # 分类页
│   ├── publish.html              # 发布页
│   ├── login.html                # 登录页
│   └── ...
├── schema.sql                    # 数据库架构
├── wrangler.toml                 # Cloudflare 配置
└── package.json
```

## 📚 核心功能

### 1. 文章发布系统

- ✅ 富文本编辑器（TipTap / Quill）
- ✅ 封面图片上传
- ✅ 分类选择（官方/个人）
- ✅ 付费内容设置
- ✅ 草稿保存
- ✅ 即时发布

**使用:** 访问 `/publish.html` 或 `/publish`

### 2. 首页与分类浏览

- ✅ 最新文章展示
- ✅ 按分类浏览
- ✅ 付费内容标识
- ✅ 响应式网格布局
- ✅ 作者信息显示

**使用:** 访问 `/home.html` 或 `/`

### 3. 右侧边栏

- ✅ 全站搜索
- ✅ 分类导航
- ✅ 快捷入口（授权用户）
- ✅ 精选内容
- ✅ 登录提示

**集成:** 自动显示在所有页面右侧

### 4. 用户权限系统

- ✅ 普通用户（发布文章）
- ✅ 授权用户（个人分类）
- ✅ 管理员（全部权限）
- ✅ RLS 行级安全

## 🗄️ 数据库设置

### 1. 运行 SQL Schema

```bash
# 在 Supabase Dashboard SQL Editor 中运行
cat schema.sql | pbcopy
# 粘贴并执行
```

### 2. 创建 Storage Bucket

```bash
# 在 Supabase Storage 中创建：
Bucket Name: covers
Public: Yes (或配置 RLS)
```

### 3. 添加测试数据

```sql
-- 添加分类
INSERT INTO categories (name, slug, description) VALUES
  ('技术分享', 'tech', '技术相关的文章和讨论'),
  ('生活日常', 'life', '生活经验分享'),
  ('公告通知', 'announcement', '官方公告和通知');

-- 设置授权用户
UPDATE profiles 
SET is_authorized = true 
WHERE id = 'your-user-id';
```

## 📖 使用文档

### 快速参考
- 📝 [文章发布指南](./PUBLISH_PAGE_GUIDE.md)
- 🏠 [首页和分类](./HOMEPAGE_CATEGORY_GUIDE.md)
- 📊 [右侧边栏](./RIGHT_SIDEBAR_GUIDE.md)
- 🔧 [Server Actions](./POSTS_ACTIONS_GUIDE.md)

### 快速查阅
- ⚡ [发布页面快速参考](./PUBLISH_QUICK_REF.md)
- ⚡ [首页快速参考](./HOMEPAGE_QUICK_REF.md)
- ⚡ [数据库类型](./types/database.ts)

### 设置指南
- ✅ [发布页面设置清单](./PUBLISH_PAGE_SUMMARY.md)
- ✅ [侧边栏设置清单](./SIDEBAR_SETUP_CHECKLIST.md)
- 📐 [架构说明](./SIDEBAR_ARCHITECTURE.md)

## 🎯 版本信息

**当前版本:** v2.0.0  
**发布日期:** 2026-02-15  
**更新日志:** [CHANGELOG.md](./CHANGELOG.md)

### 版本特性

#### v2.0.0 (2026-02-15)
- ✨ 完整的文章发布系统
- ✨ 首页和分类浏览
- ✨ 右侧边栏组件
- ✨ 付费内容支持
- ✨ 响应式设计
- 📚 完整文档系统

查看完整更新日志：[CHANGELOG.md](./CHANGELOG.md)

## 🔧 配置选项

### 环境变量

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 可选配置
NEXT_PUBLIC_SITE_URL=https://jjconnect.jp
NEXT_PUBLIC_SITE_NAME=JJConnect
```

### Supabase RLS 策略

项目已包含完整的 RLS 策略配置，确保：
- ✅ 所有人可读已发布内容
- ✅ 用户只能修改自己的内容
- ✅ 管理员拥有全部权限
- ✅ 付费内容权限控制

## 🌐 部署

### Vercel 部署（Next.js）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 部署
vercel

# 3. 配置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Cloudflare Pages（HTML）

```bash
# 1. 上传静态文件
# 将 *.html 文件上传到 Cloudflare Pages

# 2. 配置环境变量（如需要）

# 3. 完成！
```

### Cloudflare Workers（Auth）

```bash
# 1. 配置 wrangler.toml
# 已包含完整配置

# 2. 部署
wrangler deploy

# 3. 测试
curl https://your-worker.workers.dev/api/auth/status
```

## 🧪 测试

### 功能测试清单

```bash
# 首页
- [ ] 最新文章加载
- [ ] 分类区块显示
- [ ] 付费徽章显示
- [ ] 链接跳转正确

# 分类页
- [ ] 分类内容加载
- [ ] 面包屑导航
- [ ] 侧边栏显示

# 发布页
- [ ] 编辑器正常
- [ ] 图片上传
- [ ] 分类选择
- [ ] 发布成功

# 侧边栏
- [ ] 分类列表
- [ ] 精选内容
- [ ] 用户状态
```

## 🐛 故障排查

### 常见问题

**Q: 文章不显示？**
```javascript
// 检查 Supabase 连接
console.log(SUPABASE_URL, SUPABASE_ANON_KEY);

// 检查数据
const { data, error } = await supabase.from('posts').select('*');
console.log(data, error);
```

**Q: 图片上传失败？**
```sql
-- 检查 Storage bucket
-- 1. Bucket 是否存在
-- 2. RLS 策略是否正确
```

**Q: 权限问题？**
```sql
-- 检查用户权限
SELECT is_authorized FROM profiles WHERE id = 'user-id';
```

更多问题请查看各功能的详细文档。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 团队

- **开发**: Claude (Cursor AI)
- **项目**: JJConnect.jp
- **日期**: 2026-02-15

## 🔗 相关链接

- [Supabase 文档](https://supabase.com/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [TipTap 编辑器](https://tiptap.dev)

## 📞 支持

遇到问题？

1. 查看文档目录中的相关指南
2. 检查 [CHANGELOG.md](./CHANGELOG.md)
3. 提交 [Issue](https://github.com/yourusername/jjconnect.jp/issues)

---

**Made with ❤️ for the Japanese community in Japan**

**Version 2.0.0** | **Released: 2026-02-15** | **Status: ✅ Production Ready**
