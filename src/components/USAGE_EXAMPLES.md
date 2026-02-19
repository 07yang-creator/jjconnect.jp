# RightSidebar 使用示例集合

本文档包含多种场景下的 RightSidebar 使用示例。

---

## 📖 目录

1. [基础使用](#1-基础使用)
2. [Next.js App Router](#2-nextjs-app-router)
3. [Next.js Pages Router](#3-nextjs-pages-router)
4. [Cloudflare Workers + React](#4-cloudflare-workers--react)
5. [纯 HTML + JavaScript](#5-纯-html--javascript)
6. [自定义样式](#6-自定义样式)
7. [高级功能](#7-高级功能)

---

## 1. 基础使用

### 最简单的使用方式

```tsx
import RightSidebar from '@/src/components/RightSidebar';

function App() {
  const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };

  return (
    <div>
      <main className="md:pr-[260px]">
        <h1>欢迎来到 JJConnect</h1>
      </main>
      <RightSidebar env={env} user={null} />
    </div>
  );
}
```

---

## 2. Next.js App Router

### 布局文件 (app/layout.tsx)

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import RightSidebar from '@/src/components/RightSidebar';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JJConnect - 日本人コミュニティ',
  description: '日本人のための情報交流プラットフォーム',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 获取当前用户
  const user = await getCurrentUser();

  // 环境变量
  const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };

  return (
    <html lang="zh">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {/* 主内容区 - 为右侧边栏留出空间 */}
          <main className="md:pr-[260px] transition-all duration-300">
            {children}
          </main>

          {/* 右侧边栏 */}
          <RightSidebar env={env} user={user} />
        </div>
      </body>
    </html>
  );
}
```

### 获取用户信息 (lib/auth.ts)

```tsx
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function getCurrentUser() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return user ? {
    id: user.id,
    email: user.email,
  } : null;
}
```

---

## 3. Next.js Pages Router

### _app.tsx

```tsx
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import RightSidebar from '@/src/components/RightSidebar';
import { createClient } from '@supabase/supabase-js';
import '@/styles/globals.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function App({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    // 获取当前用户
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          id: user.id,
          email: user.email,
        });
      }
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="md:pr-[260px]">
        <Component {...pageProps} />
      </main>
      <RightSidebar env={env} user={user} />
    </div>
  );
}
```

---

## 4. Cloudflare Workers + React

### worker.ts

```tsx
import { Hono } from 'hono';
import { renderToString } from 'react-dom/server';
import RightSidebar from './src/components/RightSidebar';

const app = new Hono();

app.get('/', async (c) => {
  const env = {
    SUPABASE_URL: c.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  // 从 cookie 或 header 获取用户信息
  const user = await getUserFromRequest(c.req);

  // 渲染组件为 HTML 字符串
  const sidebarHtml = renderToString(
    <RightSidebar env={env} user={user} />
  );

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>JJConnect</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <main class="md:pr-[260px]">
          <h1>Welcome to JJConnect</h1>
        </main>
        ${sidebarHtml}
        <script src="/bundle.js"></script>
      </body>
    </html>
  `);
});

export default app;
```

---

## 5. 纯 HTML + JavaScript

### index.html

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JJConnect</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <main class="md:pr-[260px] p-6">
    <h1 class="text-3xl font-bold">欢迎来到 JJConnect</h1>
    <p class="text-gray-600 mt-2">日本人のための情報交流プラットフォーム</p>
  </main>

  <div id="sidebar-root"></div>

  <script>
    // 初始化 Supabase
    const { createClient } = supabase;
    const supabaseClient = createClient(
      'YOUR_SUPABASE_URL',
      'YOUR_SUPABASE_ANON_KEY'
    );

    // 获取当前用户
    async function getCurrentUser() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      return user ? { id: user.id, email: user.email } : null;
    }

    // 加载并渲染侧边栏
    async function loadSidebar() {
      const user = await getCurrentUser();
      const env = {
        SUPABASE_URL: 'YOUR_SUPABASE_URL',
        SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
      };

      // 这里需要编译后的 RightSidebar 组件
      // 使用 webpack/vite 等工具构建
      ReactDOM.render(
        React.createElement(RightSidebar, { env, user }),
        document.getElementById('sidebar-root')
      );
    }

    loadSidebar();
  </script>
</body>
</html>
```

---

## 6. 自定义样式

### 修改宽度和颜色

```tsx
import RightSidebar from '@/src/components/RightSidebar';

// 自定义样式的包装组件
function CustomRightSidebar({ env, user }) {
  return (
    <div className="custom-sidebar">
      <style jsx>{`
        .custom-sidebar :global(aside) {
          width: 300px !important;
          background: rgba(255, 255, 255, 0.7) !important;
        }
        
        .custom-sidebar :global(main) {
          padding-right: 300px !important;
        }
        
        /* 自定义主题色 */
        .custom-sidebar :global(.bg-blue-50) {
          background-color: #f0f9ff !important;
        }
        
        .custom-sidebar :global(.text-blue-600) {
          color: #2563eb !important;
        }
      `}</style>
      <RightSidebar env={env} user={user} />
    </div>
  );
}

export default CustomRightSidebar;
```

### 使用 CSS 变量

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <style>{`
          :root {
            --sidebar-width: 280px;
            --sidebar-bg: rgba(255, 255, 255, 0.85);
            --sidebar-blur: 16px;
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}

// 然后在组件中使用
<aside style={{
  width: 'var(--sidebar-width)',
  background: 'var(--sidebar-bg)',
  backdropFilter: `blur(var(--sidebar-blur))`,
}}>
```

---

## 7. 高级功能

### 添加搜索建议

```tsx
'use client';

import { useState, useEffect } from 'react';
import RightSidebar from '@/src/components/RightSidebar';

export function EnhancedRightSidebar({ env, user }) {
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  
  // 监听搜索输入，提供建议
  useEffect(() => {
    const handleSearch = async (query: string) => {
      if (query.length > 2) {
        const suggestions = await fetchSearchSuggestions(query);
        setSearchSuggestions(suggestions);
      }
    };

    // 监听搜索事件
    window.addEventListener('sidebar:search', (e: CustomEvent) => {
      handleSearch(e.detail.query);
    });
  }, []);

  return <RightSidebar env={env} user={user} />;
}
```

### 添加通知徽章

```tsx
import RightSidebar from '@/src/components/RightSidebar';
import { useNotifications } from '@/hooks/useNotifications';

export function RightSidebarWithNotifications({ env, user }) {
  const { unreadCount } = useNotifications(user?.id);

  return (
    <>
      <RightSidebar env={env} user={user} />
      {unreadCount > 0 && (
        <div className="fixed right-4 top-4 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-50">
          {unreadCount}
        </div>
      )}
    </>
  );
}
```

### 集成 React Query

```tsx
import { useQuery } from '@tanstack/react-query';
import RightSidebar from '@/src/components/RightSidebar';
import { getSupabaseClient } from '@/src/lib/supabase';

export function RightSidebarWithQuery({ env, user }) {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const supabase = getSupabaseClient(env);
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  });

  return <RightSidebar env={env} user={user} />;
}
```

### 添加分析追踪

```tsx
import RightSidebar from '@/src/components/RightSidebar';
import { useEffect } from 'react';

export function RightSidebarWithAnalytics({ env, user }) {
  useEffect(() => {
    // 追踪搜索事件
    window.addEventListener('sidebar:search', (e: CustomEvent) => {
      analytics.track('Sidebar Search', {
        query: e.detail.query,
        userId: user?.id,
      });
    });

    // 追踪分类点击
    window.addEventListener('sidebar:category-click', (e: CustomEvent) => {
      analytics.track('Category Click', {
        categoryId: e.detail.categoryId,
        categoryName: e.detail.categoryName,
        userId: user?.id,
      });
    });
  }, [user]);

  return <RightSidebar env={env} user={user} />;
}
```

---

## 🎯 使用提示

1. **环境变量**
   - 始终使用环境变量存储敏感信息
   - 在客户端使用 `NEXT_PUBLIC_` 前缀

2. **用户状态**
   - 使用 Supabase Auth 管理用户状态
   - 监听 `onAuthStateChange` 事件保持同步

3. **布局适配**
   - 主内容区使用 `md:pr-[260px]` 留出空间
   - 响应式断点可以根据需求调整

4. **性能优化**
   - 使用 React Query 或 SWR 缓存数据
   - 分类数据可以长期缓存
   - 用户资料可以短期缓存

5. **错误处理**
   - 总是处理 API 错误
   - 提供友好的错误提示
   - 使用加载状态改善体验

---

## 📚 相关资源

- [完整文档](./RIGHT_SIDEBAR_README.md)
- [快速参考](./RIGHT_SIDEBAR_QUICK_REF.md)
- [类型定义](./RightSidebar.types.ts)
- [测试文件](./RightSidebar.test.tsx)
- [演示页面](./right-sidebar-example.html)
