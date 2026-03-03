# Role Matrix 设置指南

## 1. 数据库迁移

### D1（Worker）

新安装（使用 schema.sql）
直接运行完整 schema：
```bash
npx wrangler d1 execute jjconnect-db --local --file=schema.sql
# 远程: npx wrangler d1 execute jjconnect-db --remote --file=schema.sql
```

### 已有数据库
```bash
cd workers

# 创建 role_permissions 表
npx wrangler d1 execute jjconnect-db --local --file=migrations/001_role_matrix.sql
npx wrangler d1 execute jjconnect-db --remote --file=migrations/001_role_matrix.sql

# 为 users 表添加 role_level 列（若 users 已存在）
npx wrangler d1 execute jjconnect-db --local --file=migrations/002_users_role_level.sql
npx wrangler d1 execute jjconnect-db --remote --file=migrations/002_users_role_level.sql
```

### Supabase（Next.js 查询权限）

在 Supabase SQL Editor 执行 `supabase/migrations/004_role_permissions.sql`，创建 `role_permissions` 表。

同步时 Worker 会双写 D1 与 Supabase。需在 `workers/.dev.vars` 或 wrangler secret 中设置 `SUPABASE_SERVICE_ROLE_KEY`（Supabase Dashboard → Settings → API → service_role）。

## 2. 配置 Google Sheet URL

在 `workers/.dev.vars`（本地）或 wrangler secret（生产）中设置：

```
ROLE_MATRIX_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0
```

Sheet ID 从表格 URL 获取：`https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

**重要**：表格需设为「知道链接的任何人都可查看」，否则 Worker 无法拉取。

## 3. 使用

1. 登录 admin 页面（需管理员 role >= 2）
2. 点击 header 中的「更新授权」按钮
3. 系统从 Google Sheet 拉取 CSV，解析并写入 `role_permissions` 表

## 4. Sheet 格式约定

- 第 2 行：表头（资源列名）
- 第 4 行起：数据，A 列 = 角色代码（A, B, CB, VB, T, S, W, WN, W1, W2, W3, S_writer）
- 权限单元格：R、R/W、✓、–

详见计划文档中的「Role Matrix 命名约定」。
