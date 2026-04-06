# Auth0 Setup (Incremental Migration)

This project uses the **official Auth0 Next.js SDK** (`@auth0/nextjs-auth0` v4). The SDK mounts these routes automatically (via middleware):

- `/auth/login` — start login (optional query: `returnTo`, `connection`, `login_hint`, `screen_hint`)
- `/auth/logout` — end session
- `/auth/callback` — OAuth callback (**must** be listed in Auth0 Application settings)
- `/auth/profile` — JSON profile (SDK default)
- `/auth/access-token` — access token (SDK default)

This project can run in dual mode:

- `JJC_AUTH_PROVIDER=supabase` (default, legacy flow)
- `JJC_AUTH_PROVIDER=auth0` (Auth0 + Supabase DB mapping)

## 0) Environment variables (`.env.local`)

Add **only** non-secret placeholders to git; put real values in `.env.local` (never commit).

Required when using Auth0 (same names as the [Auth0 Next.js quickstart](https://auth0.com/docs/quickstart/webapp/nextjs)):

```bash
APP_BASE_URL=http://localhost:3000
AUTH0_DOMAIN=YOUR_TENANT.jp.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_SECRET=openssl_rand_hex_32_or_similar
```

Also set app mode flags (this repo). **Use the same value for both** in normal setups:

```bash
JJC_AUTH_PROVIDER=auth0
NEXT_PUBLIC_AUTH_PROVIDER=auth0
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Precedence:** If `JJC_AUTH_PROVIDER` is explicitly `auth0` or `supabase`, the server, middleware, and `/api/public-config` use that value. If it is unset, they fall back to `NEXT_PUBLIC_AUTH_PROVIDER`. Mismatched explicit values confuse the UI; `/api/auth/diagnostics` reports `authProviderEnvMismatch` when both are set but differ.

Generate `AUTH0_SECRET` locally:

```bash
openssl rand -hex 32
```

## 1) Create Auth0 application

1. In Auth0 dashboard, create a **Regular Web Application**.
2. **Tenant Settings → General → Support URL** (clears the “Configure tenant Support URL” check): set to your public help page, e.g. **`https://www.jjconnect.jp/support`** (this repo serves [`/support`](app/support/page.tsx) on the Next app origin).
3. **Application Login URI** (optional): `http://localhost:3000` (or your production origin).
4. **Token Endpoint Authentication Method**: `POST` (`client_secret_post`) is supported by the SDK.

## 2) Configure callback / logout / web origins (required)

In **Applications → your app → Settings**, set:

**Allowed Callback URLs** (exact paths the SDK uses):

- `http://localhost:3000/auth/callback`
- `https://YOUR_PRODUCTION_DOMAIN/auth/callback`

Example tenant (replace with yours if different):

- If `AUTH0_DOMAIN` is `dev-5z54p7b3gul1eb27.jp.auth0.com`, local dev callback is still  
  `http://localhost:3000/auth/callback`  
  (the domain in the browser is your app, not the Auth0 domain).

**Allowed Logout URLs**:

- `http://localhost:3000`
- `https://YOUR_PRODUCTION_DOMAIN`

**Allowed Web Origins** (same origins as your app):

- `http://localhost:3000`
- `https://YOUR_PRODUCTION_DOMAIN`

Click **Save Changes**. Until these are set, login will fail with a callback mismatch.

### Production verification (Vercel + jjconnect.jp)

Use this checklist when testing login on the **live** site (not localhost).

1. **Vercel → Project → Settings → Domains**  
   - Prefer **`www.jjconnect.jp`** as production; configure **apex** `jjconnect.jp` to **308 redirect** to `https://www.jjconnect.jp` so cookies and Auth0 always see one host.

2. **Vercel → Project → Settings → Environment Variables (Production)**  
   - Set **`APP_BASE_URL`** to `https://www.jjconnect.jp` (no trailing slash, no path) so it matches the URL after redirect.  
   - After changes, **redeploy**.

3. **Auth0 → Applications → (your app) → Settings**  
   - **Allowed Callback URLs** — at minimum: `https://www.jjconnect.jp/auth/callback`. Add `https://jjconnect.jp/auth/callback` only if apex still serves the app without redirect.  
   - **Allowed Logout URLs** / **Allowed Web Origins** — at minimum `https://www.jjconnect.jp`; add `http://localhost:3000` for local dev if you use one Auth0 app.

4. **Auth0 → Applications → Connections**  
   - Enable **Username-Password-Authentication** (or your renamed database connection) for this application.  
   - The Next.js `/login` page sends **`connection=`** on **Continue** (email) so Auth0 routes to the database connection; if it is disabled for the app, authorize can fail before the password step.

5. **Optional: confirm what the server expects**  
   - Set **`AUTH_DIAGNOSTICS_SECRET`** in Vercel (Production).  
   - `GET /api/auth/diagnostics` with header **`x-auth-diagnostics: <your secret>`** returns **`auth0SuggestedCallbackUrls`** and **`auth0SuggestedLogoutOrigins`** derived from **`APP_BASE_URL`** (no secrets in the body). Add any **missing** URLs to Auth0 if you use multiple hosts.

## 3) Enable provider connections

Enable these connections in Auth0 and link them to the application:

- LINE
- Yahoo
- Google
- Facebook

(Apple Sign-In is not offered in this app’s UI; it requires a paid Apple Developer Program account. You can disable the **apple** connection in Auth0 or leave it unused.)

Connection names vary by strategy/region. Use the Auth0 connection name value in URLs where needed (for example `google-oauth2`).

**Database (email / password on Universal Login):** Ensure **Username-Password-Authentication** is enabled for the application. If you renamed it in Auth0, set **`AUTH0_CONNECTION_DATABASE`** (or **`NEXT_PUBLIC_AUTH0_CONNECTION_DATABASE`**) to that connection name and redeploy.

The app uses Auth0 middleware routes:

- `/auth/login`
- `/auth/callback`
- `/auth/logout`

## 4) Supabase service role for identity mapping

Auth0 users are mapped into local Supabase identity rows. Set:

- `SUPABASE_SERVICE_ROLE_KEY`

This is required for:

- creating/updating Supabase auth users for mapped identities
- maintaining `public.external_identities`
- upserting `public.profiles` bootstrap fields

## 5) Switch provider mode

Set:

```bash
JJC_AUTH_PROVIDER=auth0
```

When omitted, the app keeps using Supabase auth paths.

## 6) Troubleshooting (social login + dashboard “Failed Checks”)

### Generic error on Auth0’s site (“Oops!, something went wrong”) before password

On the Auth0 error page, click **“See details for this error”** and match **`error`** / **`error_description`**:

| `error` (typical) | What to fix |
|-------------------|-------------|
| `redirect_uri_mismatch` | **Allowed Callback URLs** must include exactly `{APP_BASE_URL}/auth/callback` for the origin users use; align **Vercel `APP_BASE_URL`** with that origin (www vs apex). |
| `unauthorized_client` | Wrong application type, client disabled, or client does not belong to this tenant; check **AUTH0_CLIENT_ID** / secret in Vercel. |
| `invalid_request` (Unknown client) | **`AUTH0_CLIENT_ID` does not exist** on the tenant in **`AUTH0_DOMAIN`**. In **Auth0 → Applications**, open your **Regular Web Application**, copy **Client ID** and **Client Secret** into Vercel Production (and local env), then **redeploy**. |
| other `invalid_request` | Malformed authorize request; check Auth0 Monitoring → Logs; ensure required connections are enabled for the app. |

If details mention **connection**, enable that connection for the application or set **`AUTH0_CONNECTION_DATABASE`** to the correct name.

### `/auth/callback?error=…&error_description=The%20provided%20client%20secret%20is%20invalid`

This text appears when **something in the OAuth chain rejects a client secret**. Do not assume it is only Vercel’s **`AUTH0_CLIENT_SECRET`**.

1. **Regular Web Application secret (Vercel)** — Must match **Auth0 → Applications → your app → Client Secret** for the same **Client ID**. If **database / email** login completes but **Google** does not, still re-verify this pair after a **redeploy**; also clear site data and try again in a private window (stale `/auth` state is confusing).

2. **Google social connection secret (Auth0 only)** — If you use **your own** Google OAuth client (**Authentication → Social → Google**, not Auth0 developer keys), the **Client Secret** there must match **Google Cloud Console** for that OAuth client. A wrong or rotated **Google** secret can surface as a callback error while **Username-Password-Authentication** still works. Regenerate the secret in Google, paste it into the Auth0 Google connection, save, and retry.

3. **Static `login.html`** — For Auth0, `returnTo` should be a **path** (e.g. `/feed`), not `https://www…/feed`, so it matches the Next.js `/login` behavior and avoids host quirks. This repo’s `public/login.html` uses path-only `returnTo` for social links and sends **`connection=`** on the identifier step the same way as `/login`.

Use **Auth0 → Monitoring → Logs** on a failed Google attempt: the log type (e.g. **Failed Exchange** vs **Failed Login**) shows whether the failure is the application’s token exchange or the Google connection.

### Broken layout or navbar after login (no avatar, 500 on `navbar.css`, `Unexpected token '<'` in JS)

The Auth0 **profile gate** in [`middleware.ts`](middleware.ts) must not run for **static assets**. If requests like `/navbar.css`, `/wp-includes/...`, or `/wp-content/...` were redirected to `/onboarding`, the browser loads HTML instead of CSS/ JS, **`navbar.js`** never runs correctly, and the **avatar** (from `/api/me`) can disappear. This repo exempts those URLs and common static **file extensions** from the gate.

### Google “authorization flow” error and CSP lines mentioning `content.bundle.js`

Console errors that block **blob:** workers on `accounts.google.com` / `login.yahoo.com` while citing **`content.bundle.js`** are often from a **browser extension**, not JJConnect. Try again in a **private window with extensions off**. If the failure is on Auth0 or `/auth/callback`, configure **your own Google OAuth client** on Auth0’s Google connection (see Facebook / social keys below) and confirm **Allowed Callback URLs** include your production **`{APP_BASE_URL}/auth/callback`**.

### “The state parameter is invalid.” on `/auth/callback` (you still entered the right password)

This message is **not** from Auth0 rejecting your email or password. It means `@auth0/nextjs-auth0` could not read the encrypted **transaction** cookie (`__txn_<state>`) that was set when you opened `/auth/login` — so the `state` query parameter no longer matches anything in your browser.

Typical causes:

1. **`APP_BASE_URL` does not match how you open the app.**  
   If `APP_BASE_URL` is your **production** `https://…` URL while you develop on **`http://localhost:3000`**, the SDK turns on **`Secure` cookies** for the transaction. Over plain HTTP on localhost, those cookies are often **not stored or not sent**, and you get this error after Auth0 redirects back with `code` and `state`.  
   **Fix:** In `.env.local` for machine-only dev, set:
   `APP_BASE_URL=http://localhost:3000`  
   (and keep production `APP_BASE_URL` on the deployed host only).

2. **Mixed hosts:** always use **`http://localhost:3000`** or always **`http://127.0.0.1:3000`**, not both. Cookies are per-host; switching breaks the flow.

3. **Stale or bookmarked callback URL:** start sign-in from **`/login`** or **`/auth/login`** again. Do not refresh `/auth/callback?code=…` without a matching cookie.

4. **`AUTH0_SECRET` changed** between starting login and finishing (or multiple secrets across processes): decryption fails and the cookie is treated as missing. Keep one stable secret per environment.

After fixing env, clear cookies for `localhost`, restart `next dev`, and sign in again from **`/login`**.

### Facebook (and other social providers) fail with a similar error

Auth0 often shows **“Use custom development keys for all Social Connections”** as critical. With **Auth0’s shared dev keys**, Facebook and other providers are **unreliable or blocked** (especially outside simple test flows). Fix:

1. Open **Authentication → Social** → select the connection (e.g. **facebook**).
2. In **Settings**, switch from dev keys to **your own** app credentials:
   - **Facebook**: [Meta for Developers](https://developers.facebook.com/) → create an app → add **Facebook Login** → set **Valid OAuth Redirect URIs** to the value Auth0 shows on that connection page (Auth0 provides the exact redirect URL to paste).
3. Save the connection, then use **Try Connection** from the connection page.

Also confirm **Applications →** your connection → **Applications** tab: your **JJConnect** application must be **enabled** for that connection. If the app is off, every social provider will fail the same way.

### Callback / logout / “localhost” warnings

- **Local dev**: `http://localhost:3000/auth/callback` is correct for this repo (`@auth0/nextjs-auth0` v4 mounts **`/auth/callback`**, not `/api/auth/callback`).
- **Production**: add your real origins too, for example:
  - `https://www.jjconnect.jp/auth/callback`
  - `https://jjconnect.jp/auth/callback` (if you use bare domain)
- **Allowed Logout URLs**: add `http://localhost:3000`, `https://www.jjconnect.jp`, and `https://jjconnect.jp` as needed.
- Auth0’s “localhost is not production-ready” check is **advisory** for local URLs; you can keep localhost for dev **and** add public URLs for production in the same application.

### Static HTML (`navbar.js`, `login.html`)

These pages load **`/config.js`** (generated at build by `npm run generate:public-config` / `npm run build` from env) and call **`/api/public-config`** on the **same origin** as the Next app.

- **`GET /config.js` 404**: Run a production build with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set so `public/config.js` is emitted, or run `npm run generate:public-config` locally before deploy.
- **`GET /api/public-config` 404**: The hostname must be served by **Next.js** (Node), not a static-only bucket. If `login.html` is on a CDN without the Next server, either deploy the full Next app on that host or proxy `/api/*` to your Next origin. When the fetch fails, `navbar.js` falls back to `config.js` only.

### Other “Failed Checks” (usually not why social login breaks)

- **Support URL**, **custom email provider**: important for production and compliance; they do not fix Facebook or other social login issues by themselves.
- **Node runtime deprecation** (yellow banner): affects **Rules/Hooks/custom DB**; standard social connections with official guides are unaffected unless you use those features.
