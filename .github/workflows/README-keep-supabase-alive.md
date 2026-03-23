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

- Default: every **12 hours** (UTC).
- To run more or less often, edit the `cron` in `keep-supabase-alive.yml`.

## Incident log

### 2026-03-22: Supabase pause warning received

- **Symptom**: Received "project is going to be paused" email from Supabase.
- **Root cause**:
  - Keep-alive ping was changed to a weaker endpoint (`/rest/v1/`) instead of a concrete table query.
  - Workflow updates were local at first; GitHub Actions only uses committed and pushed workflow files.
  - Local `.env` keys were present, but Actions depends on **repository secrets**, not local env files.
- **Fix applied**:
  - Restored ping to a concrete read endpoint:
    - `GET /rest/v1/categories?select=id&limit=1`
  - Confirmed repository secrets:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
  - Ran workflow manually in GitHub Actions and confirmed **Success**.
