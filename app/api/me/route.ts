import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server';

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
        'display_name, avatar_url, role, is_authorized, country_region, preferred_language, call_name, upgrade_profile_completed_at'
      )
      .eq('id', user.id)
      .single();

    const userData = {
      id: user.id,
      username: profile?.display_name || user.email || 'User',
      email: user.email || '',
      avatar_url: profile?.avatar_url || null,
      role: profile?.role || 'T',
      is_authorized: profile?.is_authorized === true,
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
