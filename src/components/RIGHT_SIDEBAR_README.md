# RightSidebar 组件使用指南

## 📋 组件概述

`RightSidebar` 是一个功能丰富的右侧边栏组件，提供搜索、分类导航、用户管理等功能，并且完全响应式。

## ✨ 主要特性

### 1. **视觉设计**
- ✅ 固定在屏幕右侧，宽度 260px
- ✅ 半透明背景 (`bg-white/80`) + 模糊效果 (`backdrop-blur-md`)
- ✅ 优雅的渐变和悬停效果
- ✅ 现代化的卡片式布局

### 2. **功能板块**

#### 搜索栏
- 实时搜索输入框
- 支持关键词搜索
- Enter 键或点击按钮提交

#### 官方板块
- 从 `categories` 表自动读取分类
- 按名称排序显示
- 悬停效果和图标动画

#### 授权用户入口
- 仅当 `profiles.is_authorized = true` 时显示
- 提供"我的管理主页"、"管理后台"、"发布内容"等入口
- 醒目的渐变背景样式

#### 登录提示
- 未登录用户显示登录邀请卡片
- 已登录但未授权用户显示个人信息卡

### 3. **响应式设计**

#### 桌面端 (≥768px)
- 右侧固定边栏，完整显示所有功能
- 260px 宽度，不影响主内容区

#### 移动端 (<768px)
- 隐藏右侧边栏
- 显示底部导航栏
- 提供快速访问：首页、分类、搜索、我的
- 分类通过模态框显示

## 🚀 使用方法

### 在 Next.js App Router 中使用

```typescript
// app/layout.tsx
import RightSidebar from '@/src/components/RightSidebar';
import { cookies } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 准备环境变量
  const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };

  // 获取当前用户（如果已登录）
  const user = await getCurrentUser(); // 你的用户获取逻辑

  return (
    <html lang="zh">
      <body>
        {/* 主内容区 - 右侧留出边栏空间 */}
        <main className="md:pr-[260px]">
          {children}
        </main>

        {/* 右侧边栏 */}
        <RightSidebar env={env} user={user} />
      </body>
    </html>
  );
}
```

### 在 Pages Router 中使用

```typescript
// pages/_app.tsx
import RightSidebar from '@/src/components/RightSidebar';
import { useUser } from '@/hooks/useUser';

function MyApp({ Component, pageProps }: AppProps) {
  const { user } = useUser();
  
  const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };

  return (
    <div className="min-h-screen">
      <main className="md:pr-[260px]">
        <Component {...pageProps} />
      </main>
      <RightSidebar env={env} user={user} />
    </div>
  );
}
```

### 在 HTML 文件中使用（通过脚本）

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JJConnect</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <!-- 主内容 -->
  <main class="md:pr-[260px] min-h-screen">
    <h1>网站内容</h1>
  </main>

  <!-- 右侧边栏容器 -->
  <div id="right-sidebar-root"></div>

  <!-- React 和组件脚本 -->
  <script type="module">
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import RightSidebar from './src/components/RightSidebar.tsx';

    const env = {
      SUPABASE_URL: 'YOUR_SUPABASE_URL',
      SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    };

    const user = null; // 或从 localStorage/cookies 获取

    const root = ReactDOM.createRoot(document.getElementById('right-sidebar-root'));
    root.render(<RightSidebar env={env} user={user} />);
  </script>
</body>
</html>
```

## 📊 数据库要求

### categories 表结构

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### profiles 表结构

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  is_authorized BOOLEAN DEFAULT FALSE, -- 授权用户标志
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎨 自定义样式

### 修改边栏宽度

```typescript
// 在组件中修改
<aside className="... w-[300px]"> {/* 改为 300px */}

// 在布局中相应调整
<main className="md:pr-[300px]"> {/* 同步修改 */}
```

### 修改透明度和模糊效果

```typescript
<aside 
  className="... bg-white/70 backdrop-blur-lg" // 更透明 + 更强模糊
  style={{
    backdropFilter: 'blur(16px)', // 更强的模糊
  }}
>
```

### 自定义颜色方案

```typescript
// 修改分类链接颜色
<a className="... hover:bg-purple-50 hover:text-purple-600">

// 修改管理入口渐变
<a className="... bg-gradient-to-r from-blue-50 to-cyan-50">
```

## 🔧 高级功能

### 添加自定义板块

```typescript
// 在组件中添加新的 section
<section className="space-y-3">
  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
    热门话题
  </h3>
  <div className="space-y-2">
    {trendingTopics.map(topic => (
      <a key={topic.id} href={`/topic/${topic.slug}`}>
        {topic.name}
      </a>
    ))}
  </div>
</section>
```

### 集成搜索建议

```typescript
const [suggestions, setSuggestions] = useState([]);

// 在 useEffect 中添加
useEffect(() => {
  if (searchQuery.length > 2) {
    // 获取搜索建议
    fetchSearchSuggestions(searchQuery).then(setSuggestions);
  }
}, [searchQuery]);
```

### 添加通知徽章

```typescript
<a href="/dashboard" className="relative ...">
  {unreadCount > 0 && (
    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
      {unreadCount}
    </span>
  )}
  <span>我的管理主页</span>
</a>
```

## 🐛 故障排除

### 边栏不显示
- 检查环境变量是否正确设置
- 确认 Supabase 客户端初始化成功
- 查看浏览器控制台错误日志

### 分类无法加载
- 确认 `categories` 表存在且有数据
- 检查 Supabase RLS 策略允许公开读取
- 验证 API 请求是否成功

### 授权入口不显示
- 确认用户已登录
- 检查 `profiles.is_authorized` 字段值
- 验证用户 ID 匹配

### 移动端样式问题
- 确保引入了 Tailwind CSS
- 检查 viewport meta 标签
- 测试不同屏幕尺寸

## 📱 移动端特性

### 底部导航栏
- 固定在屏幕底部
- 半透明模糊背景
- 4 个主要入口：首页、分类、搜索、我的

### 分类模态框
- 点击"分类"按钮弹出
- 从底部滑入动画
- 点击遮罩层关闭
- 最大高度 70vh，超出可滚动

## 🎯 最佳实践

1. **性能优化**
   - 使用 `useEffect` 只在必要时获取数据
   - 分类数据可以缓存避免重复请求
   - 考虑使用 SWR 或 React Query 进行数据管理

2. **用户体验**
   - 加载状态明确提示
   - 错误处理友好
   - 动画流畅自然

3. **可访问性**
   - 使用语义化 HTML
   - 添加 aria-label
   - 支持键盘导航

4. **SEO**
   - 使用正确的 HTML 标签
   - 链接使用有意义的文本
   - 避免过度 JavaScript 依赖

## 📦 依赖项

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

## 🔗 相关文件

- `src/lib/supabase.ts` - Supabase 客户端配置
- `types/database.ts` - 数据库类型定义
- `components/layout/RightSidebar.tsx` - 原有的服务端组件版本

## 💡 提示

- 这是一个客户端组件 (`'use client'`)，可以使用 React hooks
- 如果需要服务端渲染，参考 `components/layout/RightSidebar.tsx`
- 可以根据项目需求扩展更多功能板块
- 建议配合全局状态管理使用（Redux、Zustand 等）

---

有问题或建议？欢迎提 Issue 或 PR！
