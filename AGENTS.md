## Cursor Cloud specific instructions

### Overview

JJConnect is a Japanese community platform with two services needed for local development:

1. **Cloudflare Worker (auth API)** on port 8787 — backend for auth, submissions, posts, categories
2. **Static file server** on port 8080 — serves standalone HTML pages (the primary frontend)

### Starting Services

```bash
# 1. Initialize local D1 database (only needed once, or after schema changes)
cd /workspace/workers && npx wrangler d1 execute jjconnect-db --local --file=../schema.sql

# 2. Start the Cloudflare Worker (from the workers/ directory)
cd /workspace/workers && npx wrangler dev auth-worker.js --local --port 8787 &

# 3. Start static file server (from project root)
cd /workspace && python3 -m http.server 8080 &
```

### Key Gotchas

- The Worker **must** be started from `/workspace/workers/` (not the project root) because that directory has the `wrangler.toml` with D1 and R2 bindings.
- The root `/workspace/wrangler.toml` is for deployment config only; it expects a built file at `.wrangler/dist/index.js` and does NOT have D1/R2 bindings.
- `.dev.vars` must exist in `/workspace/workers/` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `JWT_SECRET` for the Worker to start. Placeholder values are fine for auth-only testing (D1-based features like register/login work without real Supabase credentials).
- Supabase-dependent features (posts, categories) require real Supabase credentials to function.
- The login page (`login.html`) talks to `localhost:8787` for authentication API calls. Registration creates users in the local D1 database.
- There is no linter, test framework, or build step configured in this project. The `npm run build` script just copies `workers/auth-worker.js` to `.wrangler/dist/index.js`.

### Useful API Endpoints (Worker on port 8787)

- `GET /api/health` — health check
- `POST /api/register` — register a new user
- `POST /api/login` — login
- `GET /api/auth/check` — verify auth token
- `GET /api/backend/status` — Supabase connection status

### HTML Pages (Static server on port 8080)

- `index.html` — landing page
- `home.html` — community home
- `login.html` — login/registration
- `admin.html` — admin dashboard
- `about.html` — about page with product index
