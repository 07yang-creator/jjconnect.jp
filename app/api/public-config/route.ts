import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth/provider';

/**
 * Public config endpoint for static HTML/JS pages.
 * Returns only public-safe values from environment variables.
 * Do NOT add secrets here — these are exposed to the browser.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const payload: Record<string, unknown> = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
    authProvider: getAuthProvider(),
    nextPublishUrl: (process.env.NEXT_PUBLIC_NEXT_PUBLISH_URL || '').trim(),
  };

  return NextResponse.json(payload);
}
