# Right Sidebar Component - 使用指南

## 📋 概述

右侧边栏组件，提供搜索、分类导航、用户快捷入口和精选内容展示功能。支持 Next.js 和纯 HTML 两种集成方式。

## 📁 文件结构

```
├── components/
│   └── layout/
│       ├── RightSidebar.tsx    # React/Next.js 组件
│       └── RightSidebar.js     # 独立 JavaScript 模块
├── app/
│   ├── layout.tsx              # Next.js 布局文件
│   └── globals.css             # 全局样式
└── sidebar-example.html        # 独立 HTML 示例
```

## 🎨 设计特性

### 响应式宽度
- **移动端**: 80px（仅显示图标）
- **平板**: 256px（md:w-64）
- **桌面**: 320px（lg:w-80）

### 功能模块
1. **搜索框** - 全站内容搜索
2. **官方分类** - 动态加载 `categories` 表数据
3. **快捷入口** - 授权用户专属功能（需要 `is_authorized = true`）
4. **精选专栏** - 显示付费文章列表
5. **登录提示** - 未登录用户显示

### 样式
- 使用 Tailwind CSS
- 固定在右侧 (`fixed right-0`)
- 自动滚动 (`overflow-y-auto`)
- 平滑过渡动画
- 自定义滚动条样式

## 🚀 集成方式

### 方式 1: Next.js App Router

#### 1. 安装依赖
```bash
npm install @supabase/supabase-js @supabase/ssr tailwindcss
```

#### 2. 配置 Tailwind
创建 `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### 3. 在 layout.tsx 中使用
```typescript
import { RightSidebar } from '@/components/layout/RightSidebar';

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen bg-gray-50">
          {/* Main content with padding for sidebar */}
          <main className="pr-20 md:pr-64 lg:pr-80">
            {children}
          </main>
          
          {/* Right Sidebar */}
          <RightSidebar />
        </div>
      </body>
    </html>
  );
}
```

### 方式 2: 纯 HTML（当前项目推荐）

#### 1. 在 HTML 文件中添加

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Supabase Client -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body class="bg-gray-50">

  <!-- Main Content (with right padding) -->
  <main class="pr-20 md:pr-64 lg:pr-80 p-8">
    <!-- Your content here -->
  </main>

  <!-- Right Sidebar -->
  <aside id="right-sidebar" class="fixed right-0 top-0 h-screen w-20 md:w-64 lg:w-80 bg-white border-l border-gray-200 overflow-y-auto z-40">
    <!-- Sidebar content (see sidebar-example.html) -->
  </aside>

  <script>
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Initialize sidebar (see sidebar-example.html for full code)
  </script>
</body>
</html>
```

#### 2. 复制示例代码
参考 `sidebar-example.html` 获取完整的 HTML 和 JavaScript 代码。

## 🔧 配置

### 环境变量
创建 `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 数据库要求
确保已创建以下表：
- `categories` - 官方分类
- `profiles` - 用户信息（包含 `is_authorized` 字段）
- `posts` - 文章内容

## 📊 功能说明

### 1. 搜索功能
```html
<form action="/search" method="GET">
  <input type="search" name="q" placeholder="搜索..." />
  <button type="submit">搜索</button>
</form>
```

### 2. 动态加载分类
```javascript
async function loadCategories() {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  
  // Render categories...
}
```

### 3. 授权用户检查
```javascript
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_authorized')
      .eq('id', user.id)
      .single();
    
    if (profile?.is_authorized) {
      // Show admin shortcuts
    }
  }
}
```

### 4. 精选内容
```javascript
async function loadFeaturedPosts() {
  const { data } = await supabase
    .from('posts')
    .select('id, title, price, cover_image, author:profiles(display_name)')
    .eq('status', 'published')
    .eq('is_paid', true)
    .order('created_at', { ascending: false })
    .limit(5);
  
  // Render posts...
}
```

## 🎯 使用示例

### 添加到现有 HTML 页面

1. **修改 index.html**
```html
<!-- 在 <body> 标签中添加 padding -->
<body class="bg-gray-50 pr-20 md:pr-64 lg:pr-80">
  
  <!-- 原有内容 -->
  <main>
    ...
  </main>
  
  <!-- 在页面底部添加侧边栏 -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script>
    // 复制 sidebar-example.html 中的 JavaScript 代码
  </script>
</body>
```

2. **修改 login.html**
同样的方式添加侧边栏，但登录页面可以隐藏登录提示。

3. **修改 admin.html**
授权用户会自动看到管理快捷入口。

## 🔒 权限控制

### 显示逻辑

| 用户状态 | 显示内容 |
|---------|---------|
| 未登录 | 搜索、分类、精选内容、登录提示 |
| 已登录（普通用户） | 搜索、分类、精选内容 |
| 已登录（授权用户） | 搜索、分类、**快捷入口**、精选内容 |

### 授权检查
```javascript
// 检查 profiles.is_authorized 字段
const { data: profile } = await supabase
  .from('profiles')
  .select('is_authorized')
  .eq('id', user.id)
  .single();

if (profile?.is_authorized === true) {
  // 显示管理功能
}
```

## 🎨 自定义样式

### 修改宽度
```html
<!-- 默认 -->
<aside class="w-20 md:w-64 lg:w-80">

<!-- 自定义 -->
<aside class="w-16 md:w-56 lg:w-72">
```

### 修改颜色主题
```css
/* 蓝色主题（默认） */
.text-blue-600, .bg-blue-600

/* 改为绿色 */
.text-green-600, .bg-green-600
```

### 添加暗色模式
```html
<aside class="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
```

## 📱 响应式行为

### 桌面端 (≥1024px)
- 完整侧边栏（320px）
- 显示所有文字和图片

### 平板端 (768px - 1023px)
- 中等侧边栏（256px）
- 显示主要内容

### 移动端 (<768px)
- 窄侧边栏（80px）
- 仅显示图标
- 隐藏文字和详细内容

## 🐛 故障排查

### 1. 侧边栏不显示
- 检查 Tailwind CSS 是否加载
- 确认 `fixed` 和 `right-0` 类是否生效
- 检查 `z-index` 是否被其他元素覆盖

### 2. 分类不加载
- 确认 Supabase 连接配置正确
- 检查 `categories` 表是否有数据
- 打开浏览器控制台查看错误信息

### 3. 授权用户功能不显示
- 确认用户 `is_authorized` 字段为 `true`
- 检查 `profiles` 表 RLS 策略
- 确认用户已登录

### 4. 移动端布局问题
- 确保 `<meta name="viewport">` 标签存在
- 检查 Tailwind 响应式类是否正确
- 测试不同屏幕尺寸

## 🔄 更新和维护

### 添加新分类
1. 在 Supabase `categories` 表中添加数据
2. 侧边栏会自动刷新显示

### 修改快捷入口
编辑 `RightSidebar.tsx` 或 HTML 中的快捷入口部分：
```html
<a href="/your-page" class="...">
  <svg>...</svg>
  <span>新功能</span>
</a>
```

### 调整精选内容数量
修改查询的 `limit`:
```javascript
.limit(10) // 从 5 改为 10
```

## 📚 相关文档

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript)
- [Next.js App Router](https://nextjs.org/docs/app)

## 💡 最佳实践

1. **性能优化**
   - 使用 `loading="lazy"` 加载图片
   - 限制精选内容数量（5-10 条）
   - 添加适当的缓存策略

2. **用户体验**
   - 添加加载动画
   - 处理空状态（无分类、无内容）
   - 提供清晰的错误提示

3. **安全性**
   - 使用 Supabase RLS 策略
   - 不在前端暴露敏感信息
   - 验证用户权限

4. **可访问性**
   - 添加 ARIA 标签
   - 支持键盘导航
   - 确保颜色对比度

## 🆘 获取帮助

如有问题，请检查：
1. 浏览器控制台错误
2. Supabase 项目设置
3. 网络请求状态
4. RLS 策略配置

## 📄 许可证

MIT License
