# Keep Supabase Alive – Setup

The workflow [keep-supabase-alive.yml](keep-supabase-alive.yml) pings your Supabase project on a schedule so it stays awake.

## One-time setup: add repository secrets

1. Open your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** and add:

| Name                 | Value |
|----------------------|--------|
| `SUPABASE_URL`       | `https://iagbrhyqatsccwdlxoww.supabase.co` |
| `SUPABASE_ANON_KEY`  | Your project anon key (paste the value you use in the app) |

3. Save. The workflow will use these on the next scheduled run or when you run it manually.

## Run manually

- **Actions** tab → **Keep Supabase Alive** → **Run workflow** → **Run workflow**.

## Schedule

- Default: every **Monday and Thursday** at 00:00 UTC.
- To run more often (e.g. daily or every 6 hours), edit the `cron` in `keep-supabase-alive.yml`.
