# Supabase Setup for JJConnect

## user_profiles table

Run the migration in Supabase SQL Editor to create the `user_profiles` table:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → SQL Editor
2. Copy the contents of `migrations/001_user_profiles.sql`
3. Paste and run

Or use Supabase CLI:

```bash
supabase db push
```

## Schema

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

## Environment

Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.dev.vars` (local) or Wrangler secrets (production).
