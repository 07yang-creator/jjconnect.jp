import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth/provider';
import { getAuth0ConnectionMap, getAuth0DatabaseConnection } from '@/lib/auth0/connections';

/**
 * Public config endpoint for static HTML/JS pages (e.g. publish.js)
 * Returns only public-safe values from environment variables.
 * Do NOT add secrets here - these are exposed to the browser.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const recaptchaSiteKey =
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
  const authProvider = getAuthProvider(); // was hardcoded 'supabase' for E2E; restored to fix TS build

  const nextPublishUrl = (process.env.NEXT_PUBLIC_NEXT_PUBLISH_URL || '').trim();

  const payload: Record<string, unknown> = {
    supabaseUrl,
    supabaseAnonKey,
    recaptchaSiteKey,
    authProvider,
    nextPublishUrl,
  };

  if (authProvider === 'auth0') {
    payload.auth0Connections = getAuth0ConnectionMap();
    payload.auth0DatabaseConnection = getAuth0DatabaseConnection();
  }

  return NextResponse.json(payload);
}
