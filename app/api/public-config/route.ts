import { NextResponse } from 'next/server';

/**
 * Public config endpoint for static HTML/JS pages (e.g. publish.js)
 * Returns only public-safe values from environment variables.
 * Do NOT add secrets here - these are exposed to the browser.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const recaptchaSiteKey =
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  return NextResponse.json({
    supabaseUrl,
    supabaseAnonKey,
    recaptchaSiteKey,
  });
}
