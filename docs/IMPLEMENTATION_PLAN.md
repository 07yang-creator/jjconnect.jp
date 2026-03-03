# JJConnect 实施计划（已确认）

> 本文档整合 Publish、Admin、TipTap、路由保护、Notion 风格 UI 等改造计划，并记录已确认的决策。

---

## 一、已确认的决策

| 项目 | 决策 |
|------|------|
| 登录页 | 使用 `login.html`，路由保护重定向到 `/login.html` |
| Admin 技术栈 | **方案 A**：新建 `app/admin/*`（Next.js），与 publish 共用组件 |
| 实施顺序 | 1. 路由与后端保护 → 2. 改用 TipTap → 3. Notion 风格 UI |
| Publish 设置区 | **右侧面板** + **顶栏下拉**（分享/发布/草稿在顶栏） |
| 移动端 | 必须有响应式布局（侧栏抽屉、设置面板适配等） |

---

## 二、实施顺序与依赖

```
Phase 1: 路由与后端保护
    ↓
Phase 2: 改用 TipTap
    ↓
Phase 3: Notion 风格 UI（Publish + Admin）
```

---

## 三、Phase 1：Publish 路由与后端保护

### 3.1 前端路由保护

- 新建 `app/publish/PublishForm.tsx`：将现有 publish 页面逻辑移入（保持 `'use client'`）
- 修改 `app/publish/page.tsx` 为 Server Component：
  - 调用 `getCurrentUser()`，若 `!user` 则 `redirect('/login.html')`
  - 有用户则渲染 `<PublishForm />`
- **重要**：其他需保护路由（如 admin）也使用 `redirect('/login.html')`

### 3.2 后端保护

- `createPost` 已包含 `getCurrentUser()` 校验，无需改动
- 可选：检查 Supabase `posts` 表 RLS 策略，确保 INSERT 需要 `auth.uid()`

### 3.3 相关文件

- `app/publish/page.tsx`（改为 Server 包装器）
- `app/publish/PublishForm.tsx`（新建，从 page 迁移）
- `app/actions/posts.ts`（确认，无需改）

---

## 四、Phase 2：改用 TipTap

### 4.1 TipTapBasicEditor 扩展

- 文件：`src/components/TipTapBasicEditor.tsx`
- 新增 `onEditorReady?: (editor: Editor | null) => void`
- 新增可选 `minHeight` 或 `editorClassName`（publish 需更大编辑区）
- 在 `useEffect` 中 editor 变化时调用 `onEditorReady`

### 4.2 Publish 页面改用 TipTapBasicEditor

- 移除内联 `useEditor` 及 StarterKit/Image/Link/Placeholder 导入
- 使用 `TipTapBasicEditor`，通过 `onEditorReady` 获取 editor
- 保留 `EditorToolbar`，传入 editor 实例
- 使用 `dynamic(..., { ssr: false })` 动态导入

### 4.3 Admin 内容发布（方案 A）

- 新建 `app/admin/content/page.tsx`
- 使用 TipTapBasicEditor，与 publish 相同配置
- 表单：标题、分类、作者、发布状态、内容（TipTap）、发布/草稿
- `admin.html` 可增加「前往发布页面」链接指向 `/admin/content`

### 4.4 依赖

- 确认 `@tiptap/extension-file-handler` 已安装

---

## 五、Phase 3：Notion 风格 UI

### 5.1 设计 Token（Tailwind / CSS 变量）

```css
--sidebar-width: 224px;
--sidebar-collapsed: 48px;
--radius: 8px;
--bg-page: #fafafa;
--bg-sidebar: #ffffff;
--border: rgba(0,0,0,0.06);
--text-primary: #37352f;
--text-secondary: #6b6b6b;
--hover: rgba(55,53,47,0.08);
```

### 5.2 Publish 页面

- **顶栏**：左侧返回，中间自动保存提示，右侧「分享」下拉 + 发布按钮
- **标题**：内联输入，placeholder「Untitled」，无卡片包裹
- **编辑区**：去掉重卡片样式，轻边框或无边框
- **设置区**：
  - **右侧面板**：分类、付费、封面、摘要
  - **顶栏下拉**：分享、发布、草稿、提交审核
- **移动端**：右侧面板改为底部抽屉或全屏覆盖

### 5.3 Admin 页面（方案 A：Next.js）

- **布局**：`app/admin/layout.tsx`，Notion 风格（顶栏 + 可收缩侧栏）
- **侧栏**：约 224px，可收缩至约 48px（仅图标）
- **子页**：`/admin`（首页）、`/admin/users`、`/admin/content`、`/admin/review`、`/admin/settings` 等
- **表格**：轻边框、行悬停、8px 圆角
- **移动端**：汉堡菜单 + 抽屉式侧栏

### 5.4 移动端要求

- 侧栏：汉堡菜单触发抽屉
- 右侧设置面板：全屏或底部抽屉
- 表格：横向滚动或卡片列表
- 顶栏：保留，必要时精简

---

## 六、文件变更清单（汇总）

| 阶段 | 操作 | 文件 |
|------|------|------|
| 1 | 新建 | `app/publish/PublishForm.tsx` |
| 1 | 修改 | `app/publish/page.tsx`（Server 包装 + redirect） |
| 2 | 修改 | `src/components/TipTapBasicEditor.tsx`（onEditorReady） |
| 2 | 修改 | `app/publish/PublishForm.tsx`（使用 TipTapBasicEditor） |
| 2 | 新建 | `app/admin/content/page.tsx` |
| 3 | 新建 | `app/admin/layout.tsx` |
| 3 | 修改 | `app/publish/PublishForm.tsx`（Notion 布局 + 右侧面板） |
| 3 | 新建/修改 | `app/admin/*` 各子页 |
| 3 | 新建 | `tailwind.config` 或 `globals.css` 中的 Notion 设计 token |

---

## 七、参考

- 登录页：`login.html`
- 现有 Admin：`admin.html`（可保留为入口或逐步迁移）
- TipTap 组件：`src/components/TipTapBasicEditor.tsx`
- 发布逻辑：`app/actions/posts.ts`
- Supabase Server：`lib/supabase/server.ts`（getCurrentUser）
