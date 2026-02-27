# JJConnect 编辑与发布系统指南

本文档说明文章编辑、图片上传、数据库字段约定，以及如何扩展 TipTap 插件。

---

## 1. 图片上传接口配置

### 1.1 接口约定

- **路径**：`POST /api/upload`
- **请求**：`multipart/form-data`，字段名为 `file`，值为图片文件（`File`）。
- **响应**：JSON，且需包含可公网访问的图片 URL：

```json
{
  "url": "https://your-cdn.com/uploads/1234567890-image.png"
}
```

前端会使用返回的 `url` 插入到编辑器中的图片节点（如 TipTap Image extension）。

### 1.2 当前实现位置

- **API 路由**：`app/api/upload/route.ts`  
  当前为 Mock 实现：不落盘，仅返回模拟 CDN URL。生产环境应改为真实存储并返回最终 URL。

### 1.3 接入真实存储（如 Supabase Storage / R2 / S3）

1. 在 `app/api/upload/route.ts` 的 `POST` 中：
   - 从 `request.formData()` 取得 `file`。
   - 校验类型（如只允许 `image/*`）、大小（如 ≤ 5MB）。
   - 上传到所选存储（如 Supabase Storage 的 `covers` 或专用 `uploads` bucket），生成唯一路径（如 `userId/timestamp-originalName`）。
   - 取得该文件的公网 URL（Supabase 的 `getPublicUrl()` 或 CDN 域名 + path）。
   - 返回 `NextResponse.json({ url: publicUrl })`。
2. 错误时返回 4xx/5xx 与可读错误信息；前端可根据状态码提示用户。

### 1.4 前端调用方式

编辑器内粘贴/拖拽图片或通过扩展插入图片时，会向 `/api/upload` 发送 `FormData`（字段 `file`），并在收到 `url` 后插入到内容中。无需修改前端即可切换为真实上传，只要接口路径与请求/响应格式保持不变。

---

## 2. 数据库字段要求

### 2.1 文章表 `posts` 与状态（Status）

- **`status`**（必填）：`'draft' | 'published'`
  - `draft`：草稿或待审核；仅作者/管理员可见，前台列表不展示。
  - `published`：已发布；在首页、分类页、文章详情页对访客可见。
- 审核流程不新增数据库枚举，而是用 `content` 内的 `review_state` 区分（见下）。

### 2.2 内容字段 `content`（JSONB）

`content` 为 JSONB，支持多种写法，以兼容不同编辑器和历史数据。

#### 2.2.1 推荐：TipTap / ProseMirror JSON + 可选 HTML

保存时建议同时写入：

- **`type: 'doc'`**：表示 ProseMirror/TipTap 文档。
- **`content`**：节点数组（paragraph、heading、bulletList、image 等），与 TipTap 的 `editor.getJSON()` 一致。
- **`html`**（可选）：`editor.getHTML()` 的字符串，用于详情页直接渲染或 SEO；若存在则优先用 `html`，否则服务端用 `lib/tiptap-json-to-html.ts` 将 `content` 转为 HTML。

示例：

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "标题" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "正文..." }] }
  ],
  "html": "<h1>标题</h1><p>正文...</p>"
}
```

#### 2.2.2 审核状态（与 status 配合）

“提交审核”时：

- `posts.status` 仍为 `'draft'`。
- 在 `content` 根级别增加 **`review_state`**：
  - `'pending'`：待审核（管理员在 `/admin/review` 可见）。
  - `'approved'` / `'rejected'`：审核通过/拒绝后由后台写入。

示例（待审核）：

```json
{
  "type": "doc",
  "content": [ ... ],
  "html": "...",
  "review_state": "pending"
}
```

查询待审核列表时：`status = 'draft'` 且 `content->>'review_state' = 'pending'`。

#### 2.2.3 其他 content 形态（兼容）

- 仅 **`html`** 字符串：可直接渲染。
- **`markdown`**：若将来有 Markdown 渲染管线，可在此存储。
- **`blocks`**：若使用 Notion 式块编辑器，可在此定义结构。

类型定义见 `types/database.ts` 中的 `PostContent`。

---

## 3. 如何扩展新的 TipTap 插件

### 3.1 在编辑器中注册扩展

在 `app/publish/page.tsx`（或使用 TipTap 的页面）中，`useEditor` 的 `extensions` 数组里加入新扩展即可，例如：

```ts
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import YourNewExtension from '@tiptap/extension-your-new'; // 或自定义扩展

const editor = useEditor({
  extensions: [
    StarterKit,
    Image,
    YourNewExtension.configure({ ... }),
    // ...
  ],
  content: '',
  editorProps: { ... },
});
```

若为自定义扩展，可参考 [TipTap 文档](https://tiptap.dev/docs/editor/extensions/custom-extensions) 使用 `Extension.create()` 或 `Node.create()` / `Mark.create()`。

### 3.2 服务端渲染（JSON → HTML）

若新扩展会往文档中写入**新节点类型**，在服务端渲染时需同步支持，否则详情页只会忽略或显示为兜底 div。

- **渲染入口**：`lib/tiptap-json-to-html.ts` 中的 `tiptapJsonToHtml()`。
- **扩展方式**：
  1. 在 `renderBlock()`（或必要时 `renderInline()`）中为新 `node.type` 增加 `case`。
  2. 根据 `node.attrs`、`node.content` 递归生成 HTML 字符串。
  3. 文本与属性值务必经 `escapeHtml()` 再输出，避免 XSS。

当前已支持的节点类型包括：`paragraph`、`heading`、`bulletList`、`orderedList`、`listItem`、`blockquote`、`codeBlock`、`hardBreak`、`image`；Marks：`bold`、`italic`、`code`、`link`。新增节点/标记时在此处增加对应分支即可。

### 3.3 保存与读取

- **保存**：提交时使用 `editor.getJSON()` 得到 `{ type: 'doc', content: [...] }`，可同时调用 `editor.getHTML()` 写入 `content.html`。
- **读取**：若从数据库加载的是 TipTap JSON，用 `editor.commands.setContent(json)` 即可；若仅有 HTML，可用 `editor.commands.setContent(html, false)`（或按 TipTap 的 HTML 解析方式加载）。

按上述方式扩展后，新插件在编辑端与详情页渲染端即可一致生效。

---

## 4. 响应式与移动端

- **编辑器**：发布页在移动端使用更小内边距与工具栏按钮，编辑器区域设置 `min-height` 与 `overflow-x: auto`，避免横向溢出。
- **评论区**：文章详情页评论区在窄屏下缩小嵌套缩进、字体与间距，评论块使用 `break-words` 与 `min-w-0` 防止溢出。
- **正文图片**：`.tiptap-content` 内带 `float-left` / `float-right` 的图片在小屏（≤640px）下改为块级居中、`max-width: 100%`，不再浮动。

样式见 `app/globals.css` 及 `app/publish/page.tsx`、`app/posts/[id]/page.tsx` 中的 Tailwind 类。

---

## 5. 相关文件索引

| 功能           | 文件路径 |
|----------------|----------|
| 图片上传 API   | `app/api/upload/route.ts` |
| 发布页编辑器   | `app/publish/page.tsx` |
| 文章详情与评论 | `app/posts/[id]/page.tsx` |
| 服务端 JSON→HTML | `lib/tiptap-json-to-html.ts` |
| 数据库类型     | `types/database.ts` |
| 审核后台       | `app/admin/review/page.tsx` |
| 创建/更新文章  | `app/actions/posts.ts` |

---

## 6. comments 表结构与 RLS 概要

- 表结构与类型参见：`supabase/migrations/002_comments.sql` 和 `types/database.types.ts` 中的 `comments` 定义。核心字段：
  - `post_id`：关联文章 ID（`posts.id`）
  - `user_id`：评论作者（Supabase Auth 的 `auth.users.id`）
  - `content`：评论内容（纯文本）
  - `parent_id`：父评论 ID（支持嵌套回复）
  - `created_at` / `updated_at`：时间戳，`updated_at` 由触发器自动维护
- RLS 策略（概要）：
  - 所有人可读取评论（是否展示由应用根据文章 `status` 决定）
  - 已登录用户可插入自己的评论（`user_id = auth.uid()`）
  - 仅评论作者可更新 / 删除自己的评论（可按需调整或关闭）

在 `app/posts/[id]/page.tsx` 中，Server Action `createComment` 会写入该表，并在服务端做简单的内容长度限制和 5 秒节流保护，防止异常长评论和误触连点。

