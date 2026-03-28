# V&V session log

Structured log for production validation days. IDs: `P*`=plan phase/job, `DEF*`=defect, `CB*`=check-in backlog.

---

## 2025-03-27 — `npm run audit:test-users` (test-account readiness)

| Field | Value |
|-------|--------|
| **Job** | Test-user audit (prep for Phase 3–4) |
| **Command** | `npm run audit:test-users` |
| **Status** | **Recorded** — script exited **0**; **Auth path degraded** |

### Result summary

- **Auth Admin `listUsers`:** **Fail** — `unexpected_failure` / `Database error finding users` (HTTP 500 from GoTrue).  
  - **Interpretation:** Project-side issue reading `auth.users` (data, trigger, or DB error). Check **Supabase Dashboard → Logs → Auth / Postgres** at time of run.
- **Fallback (`public.profiles` scan):** **Pass** — **12** profile rows returned.

### Per-row outcome (profiles-only mode)

| Metric | All 12 users |
|--------|----------------|
| `has_profile` | true |
| `basic` (onboarding 3 fields) | **false** |
| `upgrade` | false |
| `role` | T |
| `authz` | false |
| `email_conf` (proxy: `email_verified_at`) | false |
| `publish_free` | false |
| `issues` | `basic_profile_incomplete` |

**Profile UUIDs (for cross-reference):**  
`0f5b2f37-…`, `4971391f-…`, `7929e686-…`, `8552fc1c-…`, `8f800381-…`, `992ffe2a-…`, `c44d12f9-…`, `d26b61a7-…`, `da745da5-…`, `e374cd2f-…`, `f1fc5cf4-…`, `f8c96911-…` (full UUIDs in terminal capture).

### Implication for V&V

These accounts are **not** ready to exercise **publish / createPost** until `country_region`, `preferred_language`, and `call_name` are set (and auth/email rules satisfied for non-`T` or paid flows).

### Check-in backlog (from this run)

| ID | Type | Description |
|----|------|-------------|
| CB-01 | infra / db | Fix Supabase Auth **`listUsers`** failure (`Database error finding users`); inspect `auth.users` and triggers. |
| CB-02 | data / test | Backfill or UI-complete **basic profile** (+ email confirm / `email_verified_at` as needed) for the 12 test users before article-system V&V. |

### SQL suggested by script (sanity)

```sql
SELECT (SELECT count(*) FROM auth.users) AS auth_users,
       (SELECT count(*) FROM public.profiles) AS profiles;
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

### Next plan job (per agreed order)

**Phase 1** — `npm run lint` && `npm run build` (same revision as prod). **Done** — see below.

---

## 2025-03-27 — Phase 1: `npm run lint` + `npm run build`

| Field | Value |
|-------|--------|
| **Job** | P1-J1, P1-J2 (build quality) |
| **Status** | **Pass** (both exit **0**) |

### Lint (`next lint`)

- **Result:** Completed with **warnings only** (no ESLint errors).
- **Notable themes:** `@next/next/no-img-element` on several routes; `react-hooks/exhaustive-deps` in `PublishForm.tsx`; unused vars in `EditorPage.tsx`, `supabase-worker-example.ts`; `import/no-anonymous-default-export` in example file.
- **Tooling note:** `next lint` deprecation message (Next 16); `MODULE_TYPELESS_PACKAGE_JSON` suggests adding `"type": "module"` or aligning `eslint.config.js` format.

### Build (`next build`)

- **Result:** **Compiled successfully**; production build finished.
- **Warnings:** Auth0 / `jose` pulled into **Edge** path via `./lib/auth0.ts` (crypto / CompressionStream not supported in Edge — verify middleware / edge routes do not rely on that bundle path incorrectly).
- **Other:** Webpack cache “big strings” note.

### Check-in backlog (optional follow-ups from Phase 1)

| ID | Type | Description |
|----|------|-------------|
| CB-03 | code | Replace raw `<img>` with `next/image` where appropriate (lint warnings). |
| CB-04 | code | Resolve Auth0/jose **Edge Runtime** import trace for middleware if any route uses Edge + `lib/auth0.ts`. |

### Next plan job

**Phase 2** — Production smoke (availability, `/api/public-config`, Supabase reads, auth diagnostics).

---

## 2025-03-27 — Cleanup V&V test users (12 SQL-created accounts)

| Field | Value |
|-------|--------|
| **Action** | `npm run cleanup:vv-test-users` |
| **Result** | **Blocked via API** — all 12 `deleteUser` calls failed: `Database error loading user` (same class of failure as `listUsers`). |
| **Follow-up** | Run [`scripts/delete-vv-test-users.sql`](../scripts/delete-vv-test-users.sql) in **Supabase → SQL Editor** to `DELETE FROM auth.users WHERE id IN (...)` (CASCADE cleans `public.profiles` and related rows per migrations). |

### Recreate test users (from scratch)

Use **Auth Admin** so passwords and `auth.users` rows are valid (avoid raw SQL inserts).

1. Remove old users (SQL file above, or Dashboard) so emails do not conflict.
2. In `.env.local` set **`VV_TEST_EMAIL_DOMAIN`** and **`VV_TEST_PASSWORD`** (see [`.env.example`](../.env.example)).
3. Run:

```bash
npm run seed:vv-test-users -- --count=12
```

Script: [`scripts/seed-vv-test-users.mjs`](../scripts/seed-vv-test-users.mjs) — creates **`vv1{role}@jjconnect.jp`** (e.g. `vv1t@`, `vv1cb@`, `vv1s-writer@` for `S_writer`), sets **`profiles.role`**, and **upserts `role_permissions`** from the role matrix (same resource slugs as `workers/lib/roleMatrix.js`). Default domain: **`VV_TEST_EMAIL_DOMAIN`** or `jjconnect.jp`.

---

## 2026-03-27 — Environment switch record

| Field | Value |
|-------|--------|
| **Timestamp (UTC)** | 2026-03-27 06:14:04 UTC |
| **Decision** | From this point onward, execute and log V&V under **DEV** environment. |
| **Base app URL (local)** | `http://localhost:3001` |
| **Auth mode** | Auth0 (via local `.env.local`) |
| **Recording rule** | All subsequent test evidence, pass/fail status, and backlog items are tagged as **DEV** unless explicitly marked otherwise. |

---

## 2026-03-27 — DEV Auth0 login blocker (buttons)

| Field | Value |
|-------|--------|
| **Area** | P3 User/Auth (DEV) |
| **Scenario** | `/login` → `Continue` / social button triggers Auth0 `/authorize` |
| **Result** | **Fail / Blocked** |
| **Observed** | Auth0 page returns `400 Bad Request` |
| **Root cause** | `invalid_request: Unknown client: n2j2pQXwj2Lf5I6Y8N1O0P` (from Auth0 error details) |
| **Tracking ID** | `be60b2d807f516fea513` |
| **Evidence** | Local redirect URL generated correctly from app: `https://dev-5z54p7b3gul1eb27.jp.auth0.com/authorize?...client_id=n2j2pQXwj2Lf5I6Y8N1O0P&redirect_uri=http://localhost:3001/auth/callback...` |

### Required fix

- In Auth0 tenant **`dev-5z54p7b3gul1eb27.jp.auth0.com`**, use a valid **Application Client ID/Secret** pair.
- Update local `.env.local` values `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` to that exact app.
- Ensure app URLs in Auth0 include `http://localhost:3001/auth/callback` and `http://localhost:3001`.

### Check-in backlog

| ID | Type | Description |
|----|------|-------------|
| CB-05 | config | Correct Auth0 app credentials for DEV tenant (unknown client); verify button flow end-to-end after update. |

---

## 2026-03-27 — DEV Auth0 DB login failure (new account)

| Field | Value |
|-------|--------|
| **Area** | P3 User/Auth (DEV) |
| **Scenario** | New account attempts Auth0 Universal Login (email/password) |
| **Result** | **Fail** |
| **Observed** | Universal Login shows `Wrong email or password`; browser shows `POST /u/login/state... 400` |
| **Likely scope** | Auth0 database-connection config / signup enablement / wrong connection path (not app routing) |

### Follow-up

| ID | Type | Description |
|----|------|-------------|
| CB-06 | auth0-config | Verify DB connection allows signup + application assignment; verify account actually exists in the same Auth0 tenant/connection used by Universal Login. |
