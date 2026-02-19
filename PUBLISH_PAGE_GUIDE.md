# 📝 Article Publishing Page - Setup Guide

## 🎯 概述

已创建完整的文章发布页面，支持两种使用方式：
1. **Next.js 版本** (`app/publish/page.tsx`) - 使用 TipTap 编辑器
2. **独立 HTML 版本** (`publish.html`) - 使用 Quill 编辑器

## 📦 文件清单

```
├── app/
│   └── publish/
│       └── page.tsx          # Next.js 发布页面
├── publish.html              # 独立 HTML 发布页面
└── PUBLISH_PAGE_GUIDE.md     # 本文档
```

## 🚀 方式 1: Next.js 版本（TipTap）

### 安装依赖

```bash
# 安装 TipTap 编辑器及扩展
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder

# 安装 Supabase (如果还没安装)
npm install @supabase/supabase-js @supabase/ssr

# 安装 Next.js (如果还没安装)
npm install next@latest react@latest react-dom@latest

# 安装 TypeScript 类型 (如果使用 TypeScript)
npm install -D @types/react @types/node
```

### 配置

1. **环境变量** (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. **Supabase Storage**
```sql
-- 确保 covers bucket 已创建
-- 在 Supabase Dashboard > Storage 中创建
```

### 使用

访问 `http://localhost:3000/publish` 即可使用。

---

## 🌐 方式 2: 独立 HTML 版本（Quill）推荐当前项目

### 无需安装！

使用 CDN 加载所有依赖，开箱即用。

### 配置

1. **打开 `publish.html`**
2. **修改 Supabase 配置**（第 151-152 行）

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

3. **上传到服务器或本地测试**

```bash
# 本地测试
open publish.html

# 或使用 Python 简单服务器
python3 -m http.server 8000
# 访问 http://localhost:8000/publish.html
```

---

## ✨ 功能特性

### 1. 标题输入
- 大字号输入框（4xl）
- 实时预览
- 必填字段验证

### 2. 封面图片
- 拖拽或点击上传
- 实时预览
- 5MB 大小限制
- 支持 JPG, PNG, GIF
- 可移除重新选择

### 3. 摘要
- 可选字段
- 多行文本输入
- 用于文章列表显示

### 4. 分类选择

#### 官方分类
- 从 `categories` 表加载
- 所有用户可用

#### 个人分类
- 从 `user_categories` 表加载
- 仅授权用户可见（`is_authorized = true`）
- 动态切换

### 5. 富文本编辑器

#### TipTap (Next.js 版本)
- 现代化界面
- 丰富的扩展支持
- 自定义工具栏
- 键盘快捷键

**支持格式:**
- 粗体、斜体
- 标题（H2, H3）
- 列表（有序、无序）
- 引用
- 图片、链接
- 撤销/重做

#### Quill (HTML 版本)
- 轻量级
- 易于使用
- 广泛兼容

**支持格式:**
- 粗体、斜体、下划线、删除线
- 标题（H2, H3）
- 列表（有序、无序）
- 引用、代码块
- 图片、链接
- 缩进

### 6. 付费设置
- 开关切换
- 开启后显示价格输入
- 价格支持小数（0.01 精度）
- 自动验证（付费文章必须有价格）

### 7. 发布选项

#### 保存草稿
- 状态: `draft`
- 不公开显示
- 可后续编辑
- 跳转到草稿列表

#### 立即发布
- 状态: `published`
- 公开可见
- 可后续编辑
- 跳转到文章详情页

---

## 📊 数据流程

```
用户填写表单
    ↓
点击发布/保存
    ↓
验证表单数据
    ↓
上传封面图片 (如果有)
    ↓
获取图片 URL
    ↓
调用 Server Action / 直接插入
    ↓
保存到 posts 表
    ↓
成功提示
    ↓
跳转到相应页面
```

## 🔒 权限控制

### 必须登录
```javascript
// 自动检测登录状态
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  // 重定向到登录页
  redirect('/login');
}
```

### 个人分类权限
```javascript
// 检查 is_authorized 字段
const { data: profile } = await supabase
  .from('profiles')
  .select('is_authorized')
  .eq('id', user.id)
  .single();

if (profile?.is_authorized) {
  // 显示个人分类选项
}
```

---

## 🎨 UI/UX 设计

### 响应式布局
- 移动端优化
- 平板适配
- 桌面端完整体验

### 颜色方案
- 主色: 蓝色 (#2563eb)
- 成功: 绿色
- 警告: 橙色
- 错误: 红色

### 交互反馈
- 按钮加载状态
- 表单验证提示
- 成功/失败消息
- 禁用状态处理

---

## 🔧 自定义

### 修改编辑器工具栏

#### TipTap (Next.js)
```typescript
// 在 EditorToolbar 组件中添加新按钮
<button
  onClick={() => editor.chain().focus().setColor('red').run()}
  title="红色文字"
>
  🔴
</button>
```

#### Quill (HTML)
```javascript
// 修改 toolbar 配置
const quill = new Quill('#editor', {
  modules: {
    toolbar: [
      ['bold', 'italic'],
      ['link', 'image', 'video'], // 添加视频支持
      [{ 'color': [] }], // 添加颜色选择
    ]
  }
});
```

### 修改封面图大小限制
```javascript
// 修改为 10MB
if (file.size > 10 * 1024 * 1024) {
  alert('文件大小不能超过 10MB');
}
```

### 添加自动保存草稿
```javascript
// HTML 版本
let autoSaveTimer;
quill.on('text-change', () => {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    autoSaveDraft();
  }, 5000); // 5秒后自动保存
});

async function autoSaveDraft() {
  // 保存逻辑
}
```

---

## 🐛 故障排查

### 1. 编辑器不显示

**TipTap (Next.js):**
```bash
# 检查依赖是否安装
npm list @tiptap/react

# 重新安装
npm install @tiptap/react @tiptap/starter-kit --force
```

**Quill (HTML):**
```html
<!-- 检查 CDN 是否加载 -->
<script>
  console.log('Quill loaded:', typeof Quill !== 'undefined');
</script>
```

### 2. 图片上传失败

```javascript
// 检查 Storage bucket
// 1. Bucket 是否存在
// 2. Bucket 是否为 public
// 3. RLS 策略是否正确

-- Storage RLS Policy
CREATE POLICY "Users can upload covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'covers' 
  AND auth.role() = 'authenticated'
);
```

### 3. 分类不显示

```javascript
// 检查数据库
SELECT * FROM categories;
SELECT * FROM user_categories WHERE user_id = 'your-user-id';

// 检查控制台错误
console.log('Categories:', categories);
```

### 4. 发布失败

```javascript
// 检查表单验证
console.log('Form data:', {
  title,
  content,
  category_id,
  author_id
});

// 检查 RLS 策略
-- posts 表必须允许插入
CREATE POLICY "Users can insert own posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = author_id);
```

---

## 📱 使用示例

### 基础发布流程

1. **访问发布页面**
   - Next.js: `/publish`
   - HTML: `/publish.html`

2. **填写标题**
   ```
   输入: "深度学习入门指南"
   ```

3. **上传封面**（可选）
   ```
   点击上传区域 → 选择图片 → 预览
   ```

4. **选择分类**
   ```
   网站官方板块 → 技术分享
   ```

5. **编写内容**
   ```
   使用富文本编辑器编写文章正文
   ```

6. **设置付费**（可选）
   ```
   开启付费 → 输入价格: 29.9
   ```

7. **发布**
   ```
   点击"立即发布" 或 "保存草稿"
   ```

### 高级功能

#### 插入图片
```
编辑器工具栏 → 图片按钮 → 输入 URL 或上传
```

#### 插入链接
```
选中文字 → 链接按钮 → 输入 URL
```

#### 格式化文本
```
选中文字 → 工具栏选择格式（粗体、标题等）
```

---

## 🎯 最佳实践

### 1. 标题优化
- 简洁明了（15-30 字）
- 包含关键词
- 吸引眼球

### 2. 封面图片
- 分辨率: 1200x630px（推荐）
- 格式: JPG 或 PNG
- 大小: < 500KB（优化加载速度）

### 3. 摘要编写
- 100-200 字
- 概括文章核心内容
- 吸引读者点击

### 4. 内容结构
- 使用标题分段
- 合理使用列表
- 添加图片和链接
- 段落不要过长

### 5. 付费定价
- 新手: 9.9 - 19.9 元
- 进阶: 29.9 - 49.9 元
- 专业: 69.9 - 99.9 元

---

## 🔄 与 Server Action 集成

### Next.js 版本

已自动集成 `createPost` Server Action:

```typescript
import { createPost } from '@/app/actions/posts';

// 调用
const result = await createPost(input);

if (result.success) {
  // 成功处理
  router.push(`/posts/${result.data?.post_id}`);
} else {
  // 错误处理
  alert(result.error?.message);
}
```

### HTML 版本

直接使用 Supabase 客户端:

```javascript
const { data: post, error } = await supabase
  .from('posts')
  .insert(postData)
  .select()
  .single();

if (error) throw error;

// 重定向
window.location.href = `/posts/${post.id}`;
```

---

## 📚 相关文档

- [TipTap 文档](https://tiptap.dev/docs)
- [Quill 文档](https://quilljs.com/docs)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Posts Server Actions](./POSTS_ACTIONS_GUIDE.md)

---

## 🎉 完成清单

### Next.js 版本
- [ ] 安装依赖
- [ ] 配置环境变量
- [ ] 创建 Storage bucket
- [ ] 访问 `/publish` 测试

### HTML 版本
- [x] 文件已创建 ✅
- [ ] 修改 Supabase 配置
- [ ] 创建 Storage bucket
- [ ] 测试发布功能

---

## 💡 下一步

1. **测试发布流程**
   - 创建测试文章
   - 验证数据保存
   - 检查跳转逻辑

2. **优化用户体验**
   - 添加自动保存
   - 添加字数统计
   - 添加预览功能

3. **扩展功能**
   - 支持标签系统
   - 支持草稿自动恢复
   - 支持文章定时发布

---

**创建日期**: 2026-02-15  
**版本**: 1.0.0  
**作者**: Claude (Cursor AI)
