import { NextResponse } from 'next/server';
import {
  authProviderEnvMismatch,
  getAuthProvider,
} from '@/lib/auth/provider';
import { getAuth0ConnectionMap, getAuth0DatabaseConnection } from '@/lib/auth0/connections';
import { auth0CredentialFromEnv } from '@/lib/auth0/env-credentials';

function auth0SuggestedUrlsFromEnv(): {
  suggestedCallbackUrls: string[];
  suggestedLogoutOrigins: string[];
} {
  const suggestedCallbackUrls: string[] = [];
  const logoutSet = new Set<string>();
  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw) {
    return { suggestedCallbackUrls, suggestedLogoutOrigins: [] };
  }
  const parts = raw.includes(',') ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [raw];
  for (const p of parts) {
    try {
      const u = new URL(p);
      suggestedCallbackUrls.push(`${u.origin}/auth/callback`);
      logoutSet.add(u.origin);
    } catch {
      /* skip invalid APP_BASE_URL entry */
    }
  }
  return { suggestedCallbackUrls, suggestedLogoutOrigins: [...logoutSet] };
}

/** When APP_BASE_URL is all-https, @auth0/nextjs-auth0 uses Secure transaction cookies — often breaks http://localhost dev. */
function auth0LocalHttpDevHint(): string | null {
  if (process.env.NODE_ENV === 'production') return null;
  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw) return null;
  const parts = raw.includes(',')
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : [raw];
  try {
    const allHttps = parts.every((p) => new URL(p).protocol === 'https:');
    if (allHttps) {
      return 'APP_BASE_URL is only https URL(s). For http://localhost dev, add APP_BASE_URL=http://localhost:3000 in .env.local (or use only http for local) so transaction cookies work; see AUTH0_SETUP.md § “The state parameter is invalid.”';
    }
  } catch {
    return null;
  }
  return null;
}

/** Same issuer rule as @auth0/nextjs-auth0 (domain or full https URL). */
function auth0IssuerFromDomain(domain: string): string {
  const d = domain.trim();
  if (d.startsWith('http://') || d.startsWith('https://')) return d.replace(/\/$/, '');
  return `https://${d.replace(/\/$/, '')}`;
}

/**
 * Live check: can this deployment reach Auth0 OIDC discovery? Failures cause 500
 * "An error occurred while trying to initiate the login request." on GET /auth/login.
 */
async function auth0DiscoveryProbe(domain: string | undefined): Promise<{
  ok: boolean;
  wellKnownUrl: string | null;
  httpStatus: number | null;
  error: string | null;
}> {
  if (!domain) {
    return { ok: false, wellKnownUrl: null, httpStatus: null, error: 'AUTH0_DOMAIN is missing' };
  }
  try {
    const issuer = auth0IssuerFromDomain(domain);
    const wellKnownUrl = `${issuer}/.well-known/openid-configuration`;
    const res = await fetch(wellKnownUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return {
        ok: false,
        wellKnownUrl,
        httpStatus: res.status,
        error: `Discovery HTTP ${res.status}`,
      };
    }
    return { ok: true, wellKnownUrl, httpStatus: res.status, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      wellKnownUrl: null,
      httpStatus: null,
      error: msg,
    };
  }
}

/**
 * Sanity check for Auth0 + Supabase mapping env (no secret values returned).
 * Production: set AUTH_DIAGNOSTICS_SECRET and send header x-auth-diagnostics: <secret>
 * Development: allowed without secret when NODE_ENV !== 'production'
 */
export async function GET(request: Request) {
  const configuredSecret = process.env.AUTH_DIAGNOSTICS_SECRET?.trim();
  const headerSecret = request.headers.get('x-auth-diagnostics')?.trim();

  if (process.env.NODE_ENV === 'production') {
    if (!configuredSecret || headerSecret !== configuredSecret) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  } else if (configuredSecret && headerSecret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { suggestedCallbackUrls, suggestedLogoutOrigins } = auth0SuggestedUrlsFromEnv();
  const auth0 = getAuthProvider() === 'auth0';
  const clientId = auth0CredentialFromEnv('AUTH0_CLIENT_ID');
  const clientSecret = auth0CredentialFromEnv('AUTH0_CLIENT_SECRET');
  const auth0Domain = auth0CredentialFromEnv('AUTH0_DOMAIN');
  const discovery = auth0 ? await auth0DiscoveryProbe(auth0Domain) : null;

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    jjcAuthProvider: process.env.JJC_AUTH_PROVIDER || null,
    nextPublicAuthProvider: process.env.NEXT_PUBLIC_AUTH_PROVIDER || null,
    effectiveAuthProvider: getAuthProvider(),
    authProviderEnvMismatch: authProviderEnvMismatch(),
    appBaseUrl: Boolean(process.env.APP_BASE_URL),
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    auth0: {
      domain: Boolean(auth0CredentialFromEnv('AUTH0_DOMAIN')),
      clientId: Boolean(clientId),
      clientSecret: Boolean(clientSecret),
      secret: Boolean(auth0CredentialFromEnv('AUTH0_SECRET')),
      /** If set, @auth0/nextjs-auth0 uses private_key_jwt at the token endpoint instead of client_secret — mismatch can look like “invalid secret”. */
      clientAssertionSigningKeyConfigured: Boolean(
        auth0CredentialFromEnv('AUTH0_CLIENT_ASSERTION_SIGNING_KEY'),
      ),
      /** Safe sanity check (values, not secrets). Auth0 Client ID is public in the browser. */
      clientIdPrefix: clientId && clientId.length >= 8 ? `${clientId.slice(0, 8)}…` : null,
      clientSecretCharLength: clientSecret?.length ?? 0,
      /** When false, /auth/login returns 500 "initiate the login request" — fix AUTH0_DOMAIN / outbound network. */
      discovery: discovery,
    },
    auth0Connections: getAuth0ConnectionMap(),
    auth0DatabaseConnection: auth0 ? getAuth0DatabaseConnection() : null,
    /** Paste these into Auth0 Allowed Callback URLs (add www/non-www variants if you serve both). */
    auth0SuggestedCallbackUrls: auth0 ? suggestedCallbackUrls : [],
    auth0SuggestedLogoutOrigins: auth0 ? suggestedLogoutOrigins : [],
    auth0LocalHttpDevHint: auth0LocalHttpDevHint(),
  });
}
