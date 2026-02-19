# 📄 首页文章列表功能指南

本文档说明首页（`app/page.tsx`）的文章列表功能，包括数据获取、显示和分类过滤。

---

## ✅ 已实现的功能

### 1. **从 Supabase 获取最新文章**
- ✅ 默认获取最新 10 篇已发布文章
- ✅ 按创建时间倒序排列
- ✅ 包含作者和分类信息
- ✅ 仅显示状态为 `published` 的文章

### 2. **文章卡片展示**
- ✅ 标题（line-clamp-2，最多2行）
- ✅ 摘要（line-clamp-3，最多3行）
- ✅ 发布时间（智能显示：今天、昨天、X天前等）
- ✅ 作者信息（头像 + 昵称）
- ✅ 封面图片
- ✅ 分类标签

### 3. **付费文章标识**
- ✅ 右上角漂亮的渐变"付费阅读"标签
- ✅ 发光效果
- ✅ 显示价格
- ✅ 醒目的橙红色渐变设计

### 4. **分类过滤**
- ✅ 点击侧边栏分类链接时使用 URL 参数过滤
- ✅ 显示当前过滤的分类名称
- ✅ 可以清除过滤返回首页
- ✅ 过滤时只显示该分类的文章

---

## 🎨 界面特性

### 标题和摘要
```tsx
{/* 标题 - 最多显示 2 行 */}
<h3 className="font-bold text-gray-900 text-lg line-clamp-2">
  {post.title}
</h3>

{/* 摘要 - 最多显示 3 行 */}
{post.summary && (
  <p className="text-sm text-gray-600 line-clamp-3">
    {post.summary}
  </p>
)}
```

### 发布时间（智能显示）
- **今天**：显示"今天"
- **昨天**：显示"昨天"
- **7天内**：显示"X 天前"
- **7天-30天**：显示"X 周前"
- **30天以上**：显示完整日期

```typescript
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
```

### 付费文章标识

**设计特点**：
- 渐变色：橙色 → 红色 → 粉色
- 发光效果（blur-md）
- 圆角标签
- 金钱图标
- 右上角定位

```tsx
{post.is_paid && (
  <div className="absolute top-3 right-3">
    <div className="relative">
      {/* 发光效果 */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur-md opacity-75"></div>
      {/* 主标签 */}
      <div className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold">
        <svg>...</svg>
        <span>付费阅读</span>
      </div>
    </div>
  </div>
)}
```

---

## 🔍 分类过滤功能

### 工作原理

1. **侧边栏分类链接**
   ```tsx
   <a href={`/?category=${category.slug}`}>
     {category.name}
   </a>
   ```

2. **首页接收参数**
   ```typescript
   interface PageProps {
     searchParams: {
       category?: string;  // URL 参数
     };
   }
   ```

3. **根据参数过滤**
   ```typescript
   // 获取分类 slug
   const categorySlug = searchParams.category;
   
   // 查找分类
   const currentCategory = await getCategoryBySlug(categorySlug);
   
   // 获取该分类的文章
   const posts = await getLatestPosts(10, currentCategory?.id);
   ```

### 使用示例

#### 默认首页（无过滤）
```
URL: http://localhost:3000/
显示: 最新 10 篇文章 + 各分类推荐
```

#### 过滤技术分类
```
URL: http://localhost:3000/?category=tech
显示: 技术分类的最新 10 篇文章
```

#### 过滤生活分类
```
URL: http://localhost:3000/?category=life
显示: 生活分类的最新 10 篇文章
```

### 过滤状态指示

当有分类过滤时，页面会显示：

```tsx
{/* 分类过滤指示器 */}
<div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3">
  <svg>...</svg>
  <span>正在浏览分类：<strong>{currentCategory.name}</strong></span>
  <Link href="/">清除过滤 ×</Link>
</div>
```

---

## 📊 数据结构

### Post 类型（带关联）

```typescript
interface PostWithAuthor extends Post {
  author: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  category?: {
    name: string;
    slug: string;
  } | null;
}
```

### 查询示例

```typescript
const { data } = await supabase
  .from('posts')
  .select(`
    *,
    author:profiles(display_name, avatar_url),
    category:categories(name, slug)
  `)
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## 🎯 核心函数

### 1. `getLatestPosts(limit, categoryId?)`

**功能**: 获取最新文章列表

**参数**:
- `limit` (number): 返回文章数量，默认 10
- `categoryId` (string, 可选): 分类 ID 过滤

**返回**: `PostWithAuthor[]`

**用法**:
```typescript
// 获取最新 10 篇文章
const posts = await getLatestPosts(10);

// 获取某分类的最新 10 篇文章
const posts = await getLatestPosts(10, categoryId);
```

### 2. `getCategoryBySlug(slug)`

**功能**: 通过 slug 获取分类信息

**参数**:
- `slug` (string): 分类 slug

**返回**: `Category | null`

**用法**:
```typescript
const category = await getCategoryBySlug('tech');
```

### 3. `getCategoriesWithPosts()`

**功能**: 获取所有分类及其文章

**返回**: `CategoryWithPosts[]`

**用法**:
```typescript
const categoriesWithPosts = await getCategoriesWithPosts();
```

---

## 🔗 相关组件集成

### RightSidebar 分类链接

**位置**: `src/components/RightSidebar.tsx` 和 `components/layout/RightSidebar.tsx`

**修改**: 分类链接现在使用查询参数而不是路由
```tsx
// ❌ 旧的链接方式
<a href={`/category/${category.slug}`}>

// ✅ 新的链接方式（支持首页过滤）
<a href={`/?category=${category.slug}`}>
```

---

## 🎨 样式特色

### 文章卡片悬停效果

```css
/* 卡片 */
className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300"

/* 图片缩放 */
className="group-hover:scale-110 transition-transform duration-500"

/* 标题颜色变化 */
className="group-hover:text-blue-600 transition-colors"

/* 边框高亮 */
className="border border-gray-100 hover:border-blue-200"
```

### 付费标签样式

```css
/* 外层发光 */
className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur-md opacity-75"

/* 主标签渐变 */
className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"
```

---

## 🧪 测试场景

### 1. 测试文章列表

```bash
# 访问首页
http://localhost:3000/

# 应该看到：
# - 最新 10 篇文章
# - Hero 区域
# - 各分类推荐
# - CTA 区域
```

### 2. 测试分类过滤

```bash
# 点击侧边栏任意分类
# 或直接访问
http://localhost:3000/?category=tech

# 应该看到：
# - 只有该分类的文章
# - 分类过滤指示器
# - "清除过滤"链接
```

### 3. 测试付费文章

```bash
# 确保数据库中有 is_paid=true 的文章
# 应该看到：
# - 右上角渐变"付费阅读"标签
# - 底部显示价格
```

### 4. 测试空状态

```bash
# 访问一个没有文章的分类
http://localhost:3000/?category=empty-category

# 应该看到：
# - 空状态提示
# - "该分类暂无文章"
```

---

## 📝 数据库要求

### posts 表必需字段

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  title VARCHAR(200) NOT NULL,        -- 标题
  summary TEXT,                       -- 摘要
  content JSONB NOT NULL,             -- 内容
  cover_image TEXT,                   -- 封面图片
  category_id UUID,                   -- 分类 ID
  author_id UUID NOT NULL,            -- 作者 ID
  is_paid BOOLEAN DEFAULT false,      -- 是否付费
  price DECIMAL(10,2) DEFAULT 0,      -- 价格
  status VARCHAR(20) DEFAULT 'draft', -- 状态
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 示例数据

```sql
INSERT INTO posts (title, summary, category_id, author_id, is_paid, price, status) VALUES
  (
    '如何学习 TypeScript',
    '本文介绍 TypeScript 的基础知识和最佳实践...',
    'category-uuid',
    'author-uuid',
    false,
    0,
    'published'
  ),
  (
    '高级 React 模式详解',
    '深入讲解 React 的高级使用模式，包括 HOC、Render Props...',
    'category-uuid',
    'author-uuid',
    true,
    29.99,
    'published'
  );
```

---

## 🚀 性能优化

### 1. 服务端渲染（SSR）

文章列表在服务端获取，首屏加载快：
```typescript
export default async function HomePage({ searchParams }: PageProps) {
  // 服务端获取数据
  const posts = await getLatestPosts(10);
  // ...
}
```

### 2. 限制查询数量

使用 `.limit()` 避免获取过多数据：
```typescript
.limit(10)  // 只获取 10 篇
```

### 3. 只查询必要字段

```typescript
.select(`
  *,
  author:profiles(display_name, avatar_url),  // 只要这两个字段
  category:categories(name, slug)             // 只要这两个字段
`)
```

---

## 🎯 后续增强建议

### 1. 分页功能

```typescript
async function getLatestPosts(page = 1, limit = 10, categoryId?: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data } = await supabase
    .from('posts')
    .select('*')
    .range(from, to);
}
```

### 2. 搜索功能

```typescript
async function searchPosts(query: string) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .textSearch('title', query);
}
```

### 3. 排序选项

```typescript
interface SortOption {
  field: 'created_at' | 'title' | 'price';
  order: 'asc' | 'desc';
}

async function getLatestPosts(sort: SortOption) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .order(sort.field, { ascending: sort.order === 'asc' });
}
```

### 4. 标签过滤

```typescript
async function getPostsByTags(tags: string[]) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .contains('tags', tags);
}
```

---

## 🐛 常见问题

### Q: 文章不显示？

**检查**:
1. 文章 `status` 是否为 `'published'`
2. 数据库连接是否正常
3. 环境变量是否配置

### Q: 分类过滤不工作？

**检查**:
1. 分类 slug 是否正确
2. URL 参数是否传递
3. 侧边栏链接是否更新为 `/?category=slug`

### Q: 付费标签不显示？

**检查**:
1. 文章 `is_paid` 字段是否为 `true`
2. CSS 是否正确加载
3. Tailwind 配置是否包含渐变类

### Q: 时间显示不正确？

**检查**:
1. 数据库时区设置
2. 服务器时区
3. `created_at` 字段格式

---

## 📚 相关文件

- **首页**: `app/page.tsx`
- **右侧边栏**: `src/components/RightSidebar.tsx`
- **旧版边栏**: `components/layout/RightSidebar.tsx`
- **数据库类型**: `types/database.ts`
- **Supabase 客户端**: `lib/supabase/server.ts`

---

## ✅ 完成检查清单

- [x] ✅ 从 Supabase 获取最新 10 篇文章
- [x] ✅ 显示标题、摘要
- [x] ✅ 显示发布时间（智能格式化）
- [x] ✅ 付费文章显示渐变标签（右上角）
- [x] ✅ 显示价格
- [x] ✅ 分类过滤功能
- [x] ✅ 过滤状态指示
- [x] ✅ 清除过滤功能
- [x] ✅ 响应式卡片布局
- [x] ✅ 悬停动画效果
- [x] ✅ 空状态处理

---

**状态**: ✅ 功能完整，可以使用！

**测试**: 启动开发服务器 `npm run dev`，访问 `http://localhost:3000` 查看效果。
