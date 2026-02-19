# wrangler.toml 配置更新说明

## 📋 更新时间
2026-02-15

---

## ✅ 完成的修改

### 1. **更新 `main` 入口文件**

**修改前**:
```toml
main = "workers/auth-worker.js"
```

**修改后**:
```toml
main = ".wrangler/dist/index.js"
```

**说明**: 
- 现在指向构建后的输出目录
- `.wrangler/dist/index.js` 是 wrangler 的标准构建输出路径
- 支持构建流程和代码转换

---

### 2. **添加 `[build]` 配置**

**新增配置**:
```toml
[build]
command = "npm run build"
```

**说明**:
- 部署前自动执行构建命令
- `npm run build` 会复制 worker 文件到输出目录
- 支持 TypeScript 编译、代码打包等构建步骤

---

### 3. **删除 D1 数据库相关内容**

**删除项**:
- ✅ 删除了所有 D1 数据库的注释和引用
- ✅ 删除了 `DATABASE_PASSWORD` 相关的 secret 说明
- ✅ 清理了不必要的数据库配置注释

**保留项**:
- ✅ KV 命名空间配置（注释状态，可选使用）
- ✅ Supabase 配置说明

---

### 4. **更新 package.json**

**新增 build 脚本**:
```json
{
  "scripts": {
    "build": "echo 'Build step - copying worker files' && mkdir -p .wrangler/dist && cp workers/auth-worker.js .wrangler/dist/index.js",
    ...
  }
}
```

**功能**:
1. 创建输出目录 `.wrangler/dist`
2. 复制 worker 文件到 `index.js`
3. 支持构建流程

---

## 🚀 使用方法

### 本地开发
```bash
# 启动开发服务器
npm run dev

# 访问
# http://localhost:8787
```

### 构建项目
```bash
# 手动构建
npm run build

# 检查输出
ls -la .wrangler/dist/
```

### 部署到生产环境

```bash
# 方法 1: 自动构建 + 部署
wrangler deploy

# 方法 2: 手动构建 + 部署
npm run build
wrangler deploy

# 部署到特定环境
npm run deploy:production    # 生产环境
npm run deploy:development   # 开发环境
```

---

## 📝 配置文件结构

```
wrangler.toml
├── name              - Worker 名称
├── main              - 入口文件（构建后）✅ 已更新
├── compatibility_date - 运行时版本
├── workers_dev       - 开发环境配置
├── [env.production]  - 生产环境配置
├── [env.development] - 开发环境配置
├── [build]           - 构建配置 ✅ 新增
├── [dev]             - 本地开发配置
└── 注意事项          - 使用说明
```

---

## 🔧 高级配置（可选）

### 如果使用 TypeScript

如果你的项目需要编译 TypeScript，可以修改 build 脚本：

```json
{
  "scripts": {
    "build": "tsc && cp -r dist/* .wrangler/dist/"
  }
}
```

### 如果使用 Hono/Vite

```toml
[build]
command = "npm run build"

# tsconfig.json 或 vite.config.ts 需要配置输出目录为 .wrangler/dist
```

**Vite 配置示例**:
```js
// vite.config.ts
export default {
  build: {
    outDir: '.wrangler/dist',
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    }
  }
}
```

### 添加环境变量

```toml
[env.production.vars]
ENVIRONMENT = "production"
API_URL = "https://api.jjconnect.jp"
```

---

## ⚠️ 注意事项

### 1. 敏感信息管理

**不要在 wrangler.toml 中写入敏感信息！**

使用 Wrangler CLI 设置 secrets:
```bash
# 设置 Supabase URL
wrangler secret put NEXT_PUBLIC_SUPABASE_URL

# 设置 Supabase Key
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY

# 设置 JWT Secret
wrangler secret put JWT_SECRET
```

### 2. 本地开发环境变量

创建 `.dev.vars` 文件（不要提交到 git）:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
```

### 3. .gitignore 配置

确保以下文件被忽略：
```
.wrangler/
.dev.vars
node_modules/
```

---

## 📊 验证配置

运行以下命令验证配置是否正确：

```bash
# 1. 检查 wrangler 配置
wrangler whoami

# 2. 验证构建
npm run build
ls -la .wrangler/dist/index.js

# 3. 本地测试
npm run dev

# 4. 检查语法
wrangler deploy --dry-run
```

---

## ✨ 完成状态

```
✅ main 指向构建输出 (.wrangler/dist/index.js)
✅ 添加 [build] 配置 (npm run build)
✅ 删除所有 D1 引用
✅ 更新 package.json (添加 build 脚本)
✅ 清理不必要的注释
✅ 保留必要的配置选项
```

---

## 🔗 相关文档

- **Wrangler 官方文档**: https://developers.cloudflare.com/workers/wrangler/configuration/
- **Workers 部署指南**: https://developers.cloudflare.com/workers/get-started/guide/
- **环境变量配置**: https://developers.cloudflare.com/workers/configuration/environment-variables/

---

## 📞 下一步建议

1. **测试本地环境**:
   ```bash
   npm run dev
   ```

2. **配置环境变量**:
   - 创建 `.dev.vars` 文件
   - 设置 Supabase 相关变量

3. **执行构建测试**:
   ```bash
   npm run build
   ```

4. **部署到 Cloudflare**:
   ```bash
   wrangler login
   wrangler deploy
   ```

---

**更新者**: AI Assistant  
**版本**: 1.0.0  
**状态**: ✅ 配置完成
