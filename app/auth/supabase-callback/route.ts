import { NextResponse } from 'next/server';
import { createServerSupabaseClient, provisionJjcProfile } from '@/lib/supabase/server';

function safeNextPath(input: string | null, fallback = '/'): string {
  if (!input) return fallback;
  if (!input.startsWith('/')) return fallback;
  if (input.startsWith('//')) return fallback;
  return input;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=session_missing', url.origin));
  }

  // Create the jjconnect.jp profile on first login (auto-promotes ADMIN_EMAIL).
  // Non-fatal: a missing service role just means the profile is created later.
  try {
    await provisionJjcProfile(user);
  } catch (e) {
    console.error('[jjc] profile provisioning failed', e);
  }

  // jjconnect.jp is all-public for now — no onboarding/upgrade gates.
  return NextResponse.redirect(new URL(next, url.origin));
}
