# RightSidebar 快速参考

## 🚀 快速开始

```tsx
import RightSidebar from '@/src/components/RightSidebar';

const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

<RightSidebar env={env} user={currentUser} />
```

## 📐 布局调整

```tsx
// 主内容区留出空间
<main className="md:pr-[260px]">
  {children}
</main>
```

## 🎨 主要特性

| 功能 | 桌面端 | 移动端 |
|------|--------|--------|
| 右侧边栏 | ✅ 固定 260px | ❌ 隐藏 |
| 底部导航 | ❌ 隐藏 | ✅ 固定底部 |
| 搜索栏 | ✅ 完整 | ✅ 简化 |
| 分类列表 | ✅ 直接显示 | ✅ 模态框 |
| 授权入口 | ✅ 完整 | ✅ 图标 |

## 🔑 Props 参数

```typescript
interface RightSidebarProps {
  env: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
  };
  user?: {
    id: string;
    email?: string;
  } | null;
}
```

## 📊 数据库要求

### categories 表
```sql
- id: UUID (主键)
- name: VARCHAR(100) (分类名称)
- slug: VARCHAR(100) (URL友好名称)
- description: TEXT (描述)
```

### profiles 表
```sql
- id: UUID (关联 auth.users)
- display_name: VARCHAR(100)
- is_authorized: BOOLEAN (授权标志)
```

## 🎯 关键功能

### 1. 搜索
- 实时输入
- Enter 提交
- 跳转到 `/search?q=关键词`

### 2. 分类导航
- 从 `categories` 表自动读取
- 按名称排序
- 链接格式：`/category/{slug}`

### 3. 授权用户入口
- 仅当 `is_authorized = true` 时显示
- 提供：管理主页、管理后台、发布内容

### 4. 响应式
- 桌面：右侧固定边栏
- 移动：底部导航 + 分类模态框

## 🛠️ 自定义样式

```tsx
// 修改宽度
<aside className="w-[300px]">  // 改为 300px

// 修改透明度
<aside className="bg-white/70">  // 更透明

// 修改模糊
style={{ backdropFilter: 'blur(16px)' }}  // 更强模糊
```

## 📱 移动端配置

```tsx
// 底部导航高度
<nav className="py-3">  // 调整 padding

// 模态框最大高度
<div className="max-h-[80vh]">  // 改为 80vh

// 断点
<aside className="lg:block">  // 改为 lg 断点
```

## 🔧 常见问题

### Q: 边栏不显示？
A: 检查环境变量和 Supabase 连接

### Q: 分类无法加载？
A: 确认 categories 表存在且有 RLS 策略

### Q: 授权入口不显示？
A: 确认 `profiles.is_authorized = true`

### Q: 移动端样式错误？
A: 确保引入 Tailwind CSS

## 📦 依赖

```json
{
  "react": "^18.0.0",
  "@supabase/supabase-js": "^2.0.0",
  "tailwindcss": "^3.0.0"
}
```

## 🔗 相关文件

- `src/components/RightSidebar.tsx` - 主组件
- `src/components/RightSidebar.types.ts` - 类型定义
- `src/components/RIGHT_SIDEBAR_README.md` - 完整文档
- `src/lib/supabase.ts` - Supabase 客户端

## 💡 快速提示

1. **主内容区记得留空间**：`md:pr-[260px]`
2. **环境变量必须设置**：`SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
3. **RLS 策略要配置**：允许公开读取 categories
4. **移动端测试重要**：使用响应式工具测试
5. **性能优化考虑**：分类数据可以缓存

---

📚 **完整文档**：查看 `RIGHT_SIDEBAR_README.md`
🧪 **测试文件**：查看 `RightSidebar.test.tsx`
🎨 **演示页面**：打开 `right-sidebar-example.html`
