/**
 * Auth0 Next.js SDK — official client (Regular Web App, server-side session).
 * Configure via env: APP_BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET.
 *
 * With a static APP_BASE_URL, @auth0/nextjs-auth0 always uses it for `redirect_uri` (it does not
 * follow the browser host). If Vercel still has `https://jjconnect.jp`, Auth0 gets
 * `/auth/callback` on apex even though users are on `www`. We normalize apex → `www` here so
 * `redirect_uri` matches Allowed Callback URLs; still set APP_BASE_URL to `https://www.jjconnect.jp` in Vercel.
 * @see https://auth0.com/docs/quickstart/webapp/nextjs
 */
import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { auth0CredentialFromEnv } from '@/lib/auth0/env-credentials';

function normalizeAuth0AppBaseEntry(entry: string): string {
  try {
    const u = new URL(entry);
    if (u.hostname === 'jjconnect.jp') {
      return 'https://www.jjconnect.jp';
    }
    return entry;
  } catch {
    return entry;
  }
}

/**
 * Mirrors SDK env parsing, then rewrites production apex to canonical www for OIDC redirect_uri.
 */
function resolvedAuth0AppBaseUrl(): string | string[] | undefined {
  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw) return undefined;
  if (raw.includes(',')) {
    const parts = raw
      .split(',')
      .map((s) => normalizeAuth0AppBaseEntry(s.trim()))
      .filter(Boolean);
    return parts.length ? parts : undefined;
  }
  return normalizeAuth0AppBaseEntry(raw);
}

export const auth0 = new Auth0Client({
  appBaseUrl: resolvedAuth0AppBaseUrl(),
  domain: auth0CredentialFromEnv('AUTH0_DOMAIN'),
  clientId: auth0CredentialFromEnv('AUTH0_CLIENT_ID'),
  clientSecret: auth0CredentialFromEnv('AUTH0_CLIENT_SECRET'),
  secret: auth0CredentialFromEnv('AUTH0_SECRET'),
});
