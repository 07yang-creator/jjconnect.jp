import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getProfileGateStatus, isUpgradedRole } from '@/lib/supabase/server';

function safeNextPath(input: string | null, fallback = '/publish'): string {
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

  const status = await getProfileGateStatus(user.id);
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    user.user_metadata?.profile_image_url ||
    user.user_metadata?.photo_url ||
    null;
  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    null;

  if (avatarUrl || displayName) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('id', user.id)
        .single();
      if (profile) {
        const updates: { avatar_url?: string; display_name?: string } = {};
        if (avatarUrl && !profile.avatar_url) updates.avatar_url = avatarUrl;
        if (displayName && !profile.display_name) updates.display_name = displayName;
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', user.id);
        }
      }
    } catch {
      // Non-fatal: we can continue without profile defaults.
    }
  }

  if (!status.basic_complete) {
    return NextResponse.redirect(
      new URL(`/onboarding?next=${encodeURIComponent(next)}`, url.origin)
    );
  }

  if (isUpgradedRole(status.role) && !status.upgrade_complete) {
    return NextResponse.redirect(
      new URL(`/upgrade/complete-profile?next=${encodeURIComponent(next)}`, url.origin)
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
