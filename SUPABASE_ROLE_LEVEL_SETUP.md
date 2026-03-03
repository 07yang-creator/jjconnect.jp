# Supabase Role Matrix 执行指南

包含 `profiles.role_level` 与 `role_permissions` 表。

---

## 一、前置检查

确认 `profiles` 表已存在：

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 选择项目
2. 左侧 **Table Editor** → 查看是否有 `profiles` 表
3. 若不存在，需先创建 `profiles` 表（通常由 Supabase Auth 或项目初始化脚本创建）

---

## 二、执行迁移

按顺序执行以下 migration：

### 1. profiles.role_level（003）

1. 打开 **SQL Editor**：  
   https://supabase.com/dashboard/project/`<你的项目ID>`/sql/new

2. 复制 `supabase/migrations/003_profiles_role_level.sql` 的完整内容，执行

### 2. role_permissions（004）

3. 复制 `supabase/migrations/004_role_permissions.sql` 的完整内容，执行

4. 执行成功会显示类似：
   ```
   Success. No rows returned
   ```

### 方式 B：Supabase CLI（若已配置）

```bash
# 在项目根目录
supabase db push

# 或仅执行该迁移
supabase migration up
```

---

## 三、验证

在 SQL Editor 中执行：

```sql
-- profiles.role_level
SELECT id, display_name, is_authorized, role_level FROM public.profiles LIMIT 10;

-- role_permissions（需在 admin 点击「更新授权」后才有数据）
SELECT role_level, resource, permission FROM public.role_permissions LIMIT 20;
```

预期：`role_level` 列存在；`role_permissions` 在首次同步后会有数据。

---

## 四、迁移内容说明

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | `ALTER TABLE profiles ADD COLUMN role_level TEXT DEFAULT 'T'` | 新增列，默认 `'T'` |
| 2 | `UPDATE profiles SET role_level = 'A' WHERE is_authorized = true ...` | 将现有管理员设为 `'A'` |

**幂等**：若 `role_level` 列已存在，步骤 1 会跳过，可重复执行。

---

## 五、代码改动（已完成）

迁移执行后，代码已做如下更新：

1. **types/database.ts**：`Profile` 接口已增加 `role_level?: string | null`
2. **lib/supabase/server.ts**：
   - `isAuthorizedUser` 同时支持 `is_authorized === true` 或 `role_level === 'A'`
   - 新增 `getRoleLevel(userId)`，供后续按 Role Matrix 做细粒度校验

---

## 六、常见问题

### Q: 执行报错 "relation public.profiles does not exist"

**A**：`profiles` 表尚未创建。可先执行建表脚本，例如：

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_authorized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 启用 RLS 并添加策略（根据项目需求调整）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

然后再执行 `003_profiles_role_level.sql`。

### Q: 如何手动设置某用户的 role_level？

`UPDATE public.profiles SET role_level = 'S' WHERE id = '<user-uuid>';`

### Q: role_level 取值说明

| 值 | 含义 |
|----|------|
| A | Admin（管理员） |
| S | Staff/Editor |
| T | 默认（访客/普通用户） |
| B, CB, VB, W, WN, W1, W2, W3, S_writer | 其他 Role Matrix 角色 |
