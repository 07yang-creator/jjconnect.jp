# Environment Variables

All sensitive keys are stored in `.env` at the project root. Do NOT commit `.env` (it's in `.gitignore`).

## Setup

```bash
cp .env.example .env
# Edit .env and fill in your actual values
```

## Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Next.js app, publish.js (via API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Next.js app, publish.js (via API) |
| `SUPABASE_URL` | Same as above (alternative name) | Workers, GitHub Actions |
| `SUPABASE_ANON_KEY` | Same as above (alternative name) | Workers, GitHub Actions |
| `NEXT_PUBLIC_APP_URL` | App base URL (e.g. https://jjconnect.jp) | Emails, links |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key | Static HTML (index, feedback, about) |
| `REVIEW_ADMIN_EMAIL` | Admin email for review notifications | lib/email.ts |
| `FROM_EMAIL` | Sender email | lib/email.ts |
| `FROM_NAME` | Sender name | lib/email.ts |

## Static HTML & reCAPTCHA

The files `index.html`, `feedback.html`, and `about.html` contain reCAPTCHA keys. To inject values from `.env` before deploy:

```bash
npm run inject-env
```

## Publish Page (publish.js)

`publish.js` loads config from `/api/public-config` (Next.js API route). This requires the publish page to be served from the same origin as the Next.js app. For static-only deployment, inject `window.JJCONNECT_CONFIG` in `publish.html`:

```html
<script>
window.JJCONNECT_CONFIG = {
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY'
};
</script>
```

## Workers (Cloudflare)

For local development, create `workers/.dev.vars` (copy from `workers/.dev.vars.example`). For production, use `wrangler secret put SUPABASE_URL` etc.

## GitHub Actions

Add these as repository secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
