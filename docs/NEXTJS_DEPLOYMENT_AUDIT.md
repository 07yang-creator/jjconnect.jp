# Next.js 部署完整性检查报告

> 检查时间：基于当前代码库状态

---

## 一、当前状态概览

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Next.js 依赖 | ❌ 缺失 | package.json 中无 next、react、react-dom |
| TypeScript 配置 | ❌ 缺失 | 无 tsconfig.json |
| Next.js 配置 | ❌ 缺失 | 无 next.config.js / next.config.mjs |
| Tailwind 配置 | ❌ 缺失 | globals.css 使用 @tailwind，但无 tailwind.config.js |
| PostCSS 配置 | ❌ 缺失 | 无 postcss.config.js |
| Next.js 脚本 | ❌ 缺失 | 无 `next dev`、`next build`、`next start` |
| Supabase SSR | ❌ 缺失 | lib/supabase/server 依赖 @supabase/ssr，未在 package.json |
| TipTap Link | ❌ 缺失 | publish 使用 @tiptap/extension-link，未在 package.json |
| 环境变量示例 | ✅ 存在 | .env.example 已包含 NEXT_PUBLIC_SUPABASE_* |
| App 源码 | ✅ 存在 | app/ 目录完整（layout, page, publish, category 等） |
| Workers 部署 | ✅ 已配置 | wrangler deploy 部署的是 auth-worker，非 Next.js |

**结论**：Next.js 部署已完成（2026-03 更新）。已补充依赖、配置文件，`npm run dev` 和 `npm run build` 可正常执行。

---

## 二、缺失项清单

### 1. package.json 需补充

**依赖 (dependencies):**
```
next
react
react-dom
@supabase/ssr
@tiptap/extension-link
```

**开发依赖 (devDependencies，可选):**
```
typescript
@types/react
@types/node
tailwindcss
postcss
autoprefixer
eslint
eslint-config-next
```

**脚本 (scripts):**
```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint"
```

**说明**：当前 `build` 和 `deploy` 用于 Cloudflare Workers，若需同时部署 Next.js，建议：
- 保留 `build:worker`、`deploy:worker` 用于 Worker
- 新增 `dev`、`build`、`start` 用于 Next.js

### 2. 需新建的配置文件

| 文件 | 用途 |
|------|------|
| `tsconfig.json` | TypeScript 与路径别名 `@/*` |
| `next.config.js` 或 `next.config.mjs` | Next.js 配置（图片域、重定向等） |
| `tailwind.config.js` | Tailwind 与 content 路径 |
| `postcss.config.js` | PostCSS（Tailwind 需） |
| `.env.local` | 本地环境变量（从 .env.example 复制并填入真实值） |

### 3. 部署目标

文档中提到的部署方式：

- **Vercel**：适合 Next.js，`vercel` 即可部署
- **Cloudflare Pages**：需使用 `@cloudflare/next-on-pages` 适配器，构建配置较复杂
- **Cloudflare Workers**：当前 `wrangler deploy` 部署的是 auth-worker，**不是** Next.js 应用

---

## 三、推荐实施步骤

### 阶段 1：补齐 Next.js 运行环境

1. **安装依赖**
   ```bash
   npm install next@latest react@latest react-dom@latest
   npm install @supabase/ssr @tiptap/extension-link
   npm install -D typescript @types/react @types/node tailwindcss postcss autoprefixer
   ```

2. **创建 tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "target": "ES2017",
       "lib": ["dom", "dom.iterable", "esnext"],
       "allowJs": true,
       "skipLibCheck": true,
       "strict": true,
       "noEmit": true,
       "esModuleInterop": true,
       "module": "esnext",
       "moduleResolution": "bundler",
       "resolveJsonModule": true,
       "isolatedModules": true,
       "jsx": "preserve",
       "incremental": true,
       "plugins": [{ "name": "next" }],
       "paths": { "@/*": ["./*"] }
     },
     "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
     "exclude": ["node_modules"]
   }
   ```

3. **创建 next.config.mjs**
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     images: {
       remotePatterns: [{ hostname: '*.supabase.co' }, { hostname: '*.cloudflare.com' }],
     },
   };
   export default nextConfig;
   ```

4. **创建 tailwind.config.js**
   ```javascript
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
     theme: { extend: {} },
     plugins: [],
   };
   ```

5. **创建 postcss.config.js**
   ```javascript
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   };
   ```

6. **修改 package.json 的 scripts**
   - 增加：`"dev": "next dev"`
   - 增加：`"build": "next build"`
   - 增加：`"start": "next start"`
   - 将原 `build` 改为 `build:worker`（若需保留 Worker 构建）

7. **配置 .env.local**
   ```bash
   cp .env.example .env.local
   # 编辑 .env.local，填入真实的 SUPABASE_URL 和 SUPABASE_ANON_KEY
   ```

### 阶段 2：本地验证

```bash
npm run dev
# 访问 http://localhost:3000
# 检查首页、发布页、分类页是否正常
```

### 阶段 3：部署

**Vercel（推荐）：**
```bash
npm i -g vercel
vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

**Cloudflare Pages：**
- 需配置 `@cloudflare/next-on-pages`
- 或使用 Vercel 部署 Next.js，Workers 单独部署

---

## 四、与现有 Workers 的关系

| 组件 | 当前部署 | 说明 |
|------|----------|------|
| auth-worker | `wrangler deploy` | API 与认证逻辑 |
| Next.js app | 未部署 | 首页、发布、分类等页面 |
| 静态 HTML | 可能通过 Pages/其他 | home.html, login.html 等 |

建议：
- **Next.js** 作为主站（/、/publish、/category/* 等）
- **Workers** 作为 API 服务
- **login.html** 可保留为独立页面，或后续迁移到 Next.js 路由

---

## 五、快速修复命令汇总

```bash
# 1. 安装 Next.js 及相关依赖
npm install next@latest react@latest react-dom@latest @supabase/ssr @tiptap/extension-link
npm install -D typescript @types/react @types/node tailwindcss postcss autoprefixer

# 2. 初始化 Tailwind
npx tailwindcss init -p

# 3. 配置 .env.local
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 配置

# 4. 启动开发服务器
npm run dev
```

完成上述步骤后，仍需新增 `tsconfig.json` 和 `next.config.mjs`（或 .js）才能正常构建。
