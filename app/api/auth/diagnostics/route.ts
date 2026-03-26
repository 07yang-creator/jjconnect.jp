import { NextResponse } from 'next/server';
import {
  authProviderEnvMismatch,
  getAuthProvider,
} from '@/lib/auth/provider';
import { getAuth0ConnectionMap } from '@/lib/auth0/connections';

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
      domain: Boolean(process.env.AUTH0_DOMAIN),
      clientId: Boolean(process.env.AUTH0_CLIENT_ID),
      clientSecret: Boolean(process.env.AUTH0_CLIENT_SECRET),
      secret: Boolean(process.env.AUTH0_SECRET),
    },
    auth0Connections: getAuth0ConnectionMap(),
  });
}
