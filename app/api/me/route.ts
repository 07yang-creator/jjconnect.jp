import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server';
import { isAuth0Enabled } from '@/lib/auth/provider';
import { getAuth0SessionUser } from '@/lib/auth0/server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ isLoggedIn: false, userData: null });
    }

    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'display_name, avatar_url, role, is_authorized, country_region, preferred_language, call_name, basic_profile_completed_at, upgrade_profile_completed_at, full_name, phone_number, company_name, address_line1, postal_code'
      )
      .eq('id', user.id)
      .single();

    const auth0Session = isAuth0Enabled() ? await getAuth0SessionUser() : null;
    const avatarFromProfile = profile?.avatar_url?.trim() || null;
    const avatarUrl = avatarFromProfile || auth0Session?.picture?.trim() || null;

    const emailConfirmedAt =
      'email_confirmed_at' in user ? (user as { email_confirmed_at?: string | null }).email_confirmed_at ?? null : null;

    const userData = {
      id: user.id,
      username:
        profile?.display_name?.trim() ||
        auth0Session?.name?.trim() ||
        user.email ||
        'User',
      email: user.email || '',
      email_confirmed_at: emailConfirmedAt,
      avatar_url: avatarUrl,
      role: profile?.role || 'T',
      is_authorized: profile?.is_authorized === true,
      country_region: profile?.country_region ?? null,
      preferred_language: profile?.preferred_language ?? null,
      call_name: profile?.call_name ?? null,
      basic_profile_completed_at: profile?.basic_profile_completed_at ?? null,
      full_name: profile?.full_name ?? null,
      phone_number: profile?.phone_number ?? null,
      company_name: profile?.company_name ?? null,
      address_line1: profile?.address_line1 ?? null,
      postal_code: profile?.postal_code ?? null,
      basic_complete: Boolean(
        profile?.country_region?.trim() &&
          profile?.preferred_language?.trim() &&
          profile?.call_name?.trim()
      ),
      upgrade_complete: Boolean(profile?.upgrade_profile_completed_at),
      email_verified: Boolean(user.email_confirmed_at),
    };

    let userCategories: Array<{ id: string; user_id: string; name: string }> = [];
    if (userData.is_authorized) {
      const { data } = await supabase
        .from('user_categories')
        .select('id, user_id, name')
        .eq('user_id', user.id)
        .order('name');
      userCategories = data ?? [];
    }

    return NextResponse.json({ isLoggedIn: true, userData, userCategories });
  } catch (error) {
    console.error('Failed to resolve current user:', error);
    return NextResponse.json({ isLoggedIn: false, userData: null }, { status: 200 });
  }
}
