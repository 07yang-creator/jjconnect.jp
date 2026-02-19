# RightSidebar 布局集成指南

本文档说明如何将 RightSidebar 组件集成到不同的布局中。

---

## ✅ 已完成的集成

### `app/layout.tsx` - Next.js App Router 主布局

已经成功集成 RightSidebar 组件，主要特点：

#### 1. **布局结构**
```tsx
<html>
  <body>
    <div className="flex">
      {/* 左侧：主内容区（自动适配边栏宽度） */}
      <main className="flex-1 md:mr-[260px]">
        {children}
      </main>
      
      {/* 右侧：固定边栏 */}
      <RightSidebar env={env} user={user} />
    </div>
  </body>
</html>
```

#### 2. **响应式设计**
- **桌面端（≥768px）**：主内容区右侧留出 260px 空间
- **移动端（<768px）**：主内容区占满宽度，边栏自动隐藏

#### 3. **用户状态管理**
```tsx
// 获取当前用户（服务端）
const user = await getCurrentUser();

// 传递给 RightSidebar
<RightSidebar env={env} user={user} />
```

---

## 📐 布局方案说明

### 方案 1: Flex 布局（✅ 已采用）

**优点**：
- 简单直观
- 自动适应内容高度
- 响应式处理容易

**实现**：
```tsx
<div className="flex relative">
  {/* 主内容 */}
  <main className="flex-1 md:mr-[260px]">
    {children}
  </main>
  
  {/* 右侧边栏（fixed 定位） */}
  <RightSidebar />
</div>
```

### 方案 2: Grid 布局（备选）

**优点**：
- 更精确的列控制
- 适合复杂的多列布局

**实现**：
```tsx
<div className="grid grid-cols-1 md:grid-cols-[1fr_260px] min-h-screen">
  {/* 主内容 */}
  <main className="col-span-1">
    {children}
  </main>
  
  {/* 右侧边栏 */}
  <aside className="hidden md:block">
    <RightSidebar />
  </aside>
</div>
```

### 方案 3: 绝对定位（原有方案）

**实现**：
```tsx
<div className="min-h-screen">
  {/* 主内容（带右边距） */}
  <main className="pr-[260px]">
    {children}
  </main>
  
  {/* 右侧边栏（fixed 定位） */}
  <RightSidebar />
</div>
```

---

## 🎨 关键 CSS 类说明

### 主内容区样式

```tsx
<main className="
  flex-1                    /* Flex: 占据剩余空间 */
  md:mr-[260px]            /* 桌面端：右边距 260px */
  transition-all           /* 平滑过渡 */
  duration-300             /* 300ms 动画 */
">
```

### 内容包装器样式

```tsx
<div className="
  w-full                   /* 100% 宽度 */
  max-w-7xl               /* 最大宽度 1280px */
  mx-auto                 /* 水平居中 */
  px-4 sm:px-6 lg:px-8   /* 响应式内边距 */
  py-6                    /* 垂直内边距 */
">
```

---

## 🔧 自定义布局

### 修改边栏宽度

如果需要修改边栏宽度（例如改为 300px）：

1. **修改 RightSidebar 组件**：
```tsx
// src/components/RightSidebar.tsx
<aside className="... w-[300px]">  // 改为 300px
```

2. **修改 layout.tsx**：
```tsx
// app/layout.tsx
<main className="flex-1 md:mr-[300px]">  // 同步改为 300px
```

### 添加左侧边栏

如果需要添加左侧边栏：

```tsx
<div className="flex">
  {/* 左侧边栏 */}
  <aside className="hidden lg:block w-64">
    <LeftSidebar />
  </aside>
  
  {/* 主内容 */}
  <main className="flex-1 lg:ml-64 md:mr-[260px]">
    {children}
  </main>
  
  {/* 右侧边栏 */}
  <RightSidebar />
</div>
```

### 添加顶部导航栏

```tsx
<div className="min-h-screen flex flex-col">
  {/* 顶部导航 */}
  <header className="h-16 border-b">
    <Navbar />
  </header>
  
  {/* 主体 */}
  <div className="flex-1 flex">
    <main className="flex-1 md:mr-[260px]">
      {children}
    </main>
    <RightSidebar />
  </div>
</div>
```

---

## 📱 响应式断点

### Tailwind CSS 断点

```css
/* 默认 (移动端): <768px */
.mr-0              /* 无右边距 */
.hidden            /* 右侧栏隐藏 */

/* md (中等屏幕): ≥768px */
.md:mr-[260px]     /* 右边距 260px */
.md:block          /* 右侧栏显示 */

/* lg (大屏幕): ≥1024px */
.lg:mr-[280px]     /* 可选：更大的边距 */
```

### 自定义断点

如果需要自定义断点，修改 `tailwind.config.js`：

```js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',    // 默认
      'lg': '1024px',
      'xl': '1280px',
      'tablet': '900px', // 自定义
    },
  },
}
```

然后使用：
```tsx
<main className="tablet:mr-[260px]">
```

---

## 🚀 常见布局场景

### 场景 1: 博客/文章页

```tsx
<main className="flex-1 md:mr-[260px]">
  <article className="max-w-4xl mx-auto px-6 py-8">
    <h1>{title}</h1>
    <div>{content}</div>
  </article>
</main>
```

### 场景 2: 仪表板

```tsx
<main className="flex-1 md:mr-[260px] bg-gray-100">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
    <DashboardCard />
    <DashboardCard />
    <DashboardCard />
  </div>
</main>
```

### 场景 3: 列表页

```tsx
<main className="flex-1 md:mr-[260px]">
  <div className="max-w-6xl mx-auto px-4 py-6">
    <h1 className="text-2xl font-bold mb-6">文章列表</h1>
    <div className="space-y-4">
      {posts.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  </div>
</main>
```

### 场景 4: 全宽页面

某些页面可能不需要边栏，可以这样处理：

```tsx
// app/full-width-page/layout.tsx
export default function FullWidthLayout({ children }) {
  return (
    <div className="min-h-screen">
      {/* 不包含 RightSidebar */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
```

---

## ⚠️ 常见问题

### Q: 主内容被边栏遮挡？

**A**: 确保主内容区有足够的右边距：

```tsx
// ❌ 错误：没有右边距
<main className="flex-1">

// ✅ 正确：添加右边距
<main className="flex-1 md:mr-[260px]">
```

### Q: 移动端边栏不显示？

**A**: 移动端设计为底部导航栏，不是右侧边栏。这是正常的响应式行为。

### Q: 边栏位置不固定？

**A**: 确认 RightSidebar 组件使用了 `fixed` 定位：

```tsx
<aside className="fixed right-0 top-0 h-screen">
```

### Q: 内容滚动时边栏也滚动？

**A**: 这是因为边栏使用了 `absolute` 而不是 `fixed`，检查组件代码。

### Q: 布局在不同页面不一致？

**A**: 确保所有页面都使用同样的布局结构，或者在根 layout.tsx 中统一设置。

---

## 🎯 最佳实践

### 1. 内容宽度限制

为了更好的阅读体验，限制内容宽度：

```tsx
<main className="flex-1 md:mr-[260px]">
  <div className="max-w-7xl mx-auto px-4">
    {children}
  </div>
</main>
```

### 2. 响应式内边距

使用响应式内边距适配不同屏幕：

```tsx
<div className="px-4 sm:px-6 lg:px-8">
```

### 3. 平滑过渡

添加过渡动画提升体验：

```tsx
<main className="... transition-all duration-300">
```

### 4. Z-index 管理

确保边栏在正确的层级：

```tsx
<RightSidebar />  // z-40 (组件内部定义)
<Modal />         // z-50 (更高层级)
```

### 5. 打印样式

考虑打印时隐藏边栏：

```tsx
<aside className="... print:hidden">
```

---

## 📊 布局性能优化

### 1. 使用 CSS Grid

对于复杂布局，Grid 可能更高效：

```tsx
<div className="grid grid-cols-[1fr_260px]">
  <main>{children}</main>
  <RightSidebar />
</div>
```

### 2. 避免重复渲染

使用 `memo` 优化组件：

```tsx
import { memo } from 'react';

const RightSidebar = memo(function RightSidebar({ env, user }) {
  // ...
});
```

### 3. 懒加载

非首屏内容可以懒加载：

```tsx
import dynamic from 'next/dynamic';

const RightSidebar = dynamic(
  () => import('@/src/components/RightSidebar'),
  { ssr: false }
);
```

---

## 🔗 相关文件

- `app/layout.tsx` - 主布局文件
- `src/components/RightSidebar.tsx` - 边栏组件
- `lib/auth.ts` - 认证工具函数
- `tailwind.config.js` - Tailwind 配置

---

## 📝 检查清单

使用此清单确保布局正确集成：

- [x] ✅ 引入 RightSidebar 组件
- [x] ✅ 设置环境变量 (env)
- [x] ✅ 获取用户状态 (user)
- [x] ✅ 主内容区设置右边距 (md:mr-[260px])
- [x] ✅ 使用 Flex 布局
- [x] ✅ 响应式断点配置
- [x] ✅ 移动端测试通过
- [x] ✅ 桌面端测试通过
- [x] ✅ 滚动行为正常
- [x] ✅ 过渡动画流畅

---

## 🎉 完成！

布局已经成功集成 RightSidebar 组件。现在你可以：

1. 启动开发服务器：`npm run dev`
2. 访问 `http://localhost:3000` 查看效果
3. 调整浏览器窗口测试响应式
4. 查看移动端效果（使用开发者工具）

---

**需要帮助？**
- 查看完整文档：`src/components/RIGHT_SIDEBAR_README.md`
- 查看使用示例：`src/components/USAGE_EXAMPLES.md`
- 运行演示页面：打开 `src/components/right-sidebar-example.html`
