# Auth0 Dual-Run Cutover Checklist

## Feature flag rollout

1. Keep default:
   - `JJC_AUTH_PROVIDER=supabase`
   - `NEXT_PUBLIC_AUTH_PROVIDER=supabase`
2. Deploy Auth0 code paths first (no behavior change).
3. In staging, switch both vars to `auth0`.
4. Validate all login paths:
   - `/login`
   - `/login.html`
   - social providers from create/sign-in section
5. Validate protected routes:
   - `/publish`
   - `/admin/*`
6. Validate logout from Next and static navigation.
7. Promote `auth0` flags to production.

## Monitoring targets during cutover

- 4xx/5xx spikes on:
  - `/auth/*`
  - `/api/me`
- callback failures and login loops
- new rows in `public.external_identities`
- profile bootstrap anomalies:
  - missing `profiles` row for mapped identity
  - missing avatar/display_name inheritance

## Safe rollback

Set both flags back to supabase:

```bash
JJC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_AUTH_PROVIDER=supabase
```

No schema rollback is required. `external_identities` can remain in place.
