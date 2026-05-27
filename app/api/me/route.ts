import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getCurrentUser, provisionJjcProfile } from '@/lib/supabase/server';

/**
 * Current-user endpoint for the shared navbar / client chrome.
 * Reads jjc.profiles (shared Supabase project). jjconnect.jp is all-public for
 * now, so onboarding/upgrade are reported complete.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ isLoggedIn: false, userData: null });
    }

    // Ensure the jjconnect.jp profile exists (covers password signup + any auth path,
    // and auto-promotes ADMIN_EMAIL). Non-fatal if the service role isn't configured.
    try {
      await provisionJjcProfile(user);
    } catch (e) {
      console.error('[jjc] profile provisioning (me) failed', e);
    }

    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .schema('jjc')
      .from('profiles')
      .select('display_name, role_level, country_region, preferred_language')
      .eq('id', user.id)
      .maybeSingle();

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const avatarUrl =
      (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
      (typeof meta.picture === 'string' && meta.picture.trim()) ||
      null;
    const role = profile?.role_level ?? 'T';

    const userData = {
      id: user.id,
      username: profile?.display_name?.trim() || user.email || 'User',
      email: user.email || '',
      email_confirmed_at: user.email_confirmed_at ?? null,
      avatar_url: avatarUrl,
      role,
      is_authorized: role === 'A',
      country_region: profile?.country_region ?? null,
      preferred_language: profile?.preferred_language ?? null,
      // jjconnect.jp is all-public for now — no onboarding/upgrade gates.
      basic_complete: true,
      upgrade_complete: true,
      email_verified: Boolean(user.email_confirmed_at),
    };

    return NextResponse.json({ isLoggedIn: true, userData });
  } catch (error) {
    console.error('Failed to resolve current user:', error);
    return NextResponse.json({ isLoggedIn: false, userData: null }, { status: 200 });
  }
}
