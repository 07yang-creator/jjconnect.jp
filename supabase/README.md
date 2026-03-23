# Supabase Setup for JJConnect

## Migration order

在 Supabase Dashboard → SQL Editor 中按以下顺序执行迁移（新库首次部署时）：

1. `001_user_profiles.sql`
2. **`006_categories.sql`** — 分类表（posts 依赖）
3. **`007_posts.sql`** — 文章表（comments 依赖）
4. `002_comments.sql` — 依赖 public.posts(id)
5. `003_profiles_role_level.sql`
6. `004_role_permissions.sql`
7. **先部署 Worker（含 getSupabaseServiceConfig）后** 再执行 `005_user_profiles_rls_fix.sql`
8. `008_profiles_role_and_signup_trigger.sql`

若库中已存在 `posts` / `categories`（例如在 Dashboard 手动建过），可直接执行 006、007（幂等），再按需执行其余迁移。

## user_profiles table

Run the migration in Supabase SQL Editor to create the `user_profiles` table:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → SQL Editor
2. Copy the contents of `migrations/001_user_profiles.sql`
3. Paste and run

Or use Supabase CLI:

```bash
supabase db push
```

## Tables (migrations)

| Migration | Table | Description |
|-----------|--------|-------------|
| 001 | user_profiles | D1 用户扩展资料 |
| 006 | categories | 全局文章分类 |
| 007 | posts | 文章（含付费、分类、作者） |
| 002 | comments | 评论（依赖 posts） |
| 003 | profiles | Supabase Auth 用户资料 + role_level |
| 004 | role_permissions | 权限矩阵 |
| 008 | profiles trigger | profiles.role 默认值 + auth.users 注册自动建档 |

## user_profiles schema

| Column | Type | Description |
|--------|------|-------------|
| user_id | TEXT (PK) | D1 user id from auth-worker |
| username | TEXT | Display name |
| avatar_url | TEXT | Profile image URL |
| registered_date | TIMESTAMPTZ | Registration date |
| self_description | TEXT | Bio / self-description |
| email | TEXT | Email address |
| telephone | TEXT | Phone number |
| company_name | TEXT | Company name |
| address | TEXT | Street address |
| mail_code | TEXT | Postal code |
| user_category | INTEGER | 0=Viewer, 1=Editor, 2=Admin |
| contribution_value | TEXT | Contribution score (format TBD) |
| personal_remarks | TEXT | Private notes |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

## Storage (Dashboard)

- **covers**：发布页封面上传。需在 Dashboard → Storage 中：
  1. 创建 bucket 名称 `covers`，建议勾选 **Public**（公开读）。
  2. 在 Storage → Policies 中为 `storage.objects` 添加 **INSERT** 策略：`bucket_id = 'covers'`，角色 `authenticated`。
  发布页 `publish.js` 已使用 `supabase.storage.from('covers').upload` 与 `getPublicUrl`，无需改代码。

## Environment

Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `workers/.dev.vars` (local) or Wrangler secrets (production). For user_profiles 写入需配置 `SUPABASE_SERVICE_ROLE_KEY`。
