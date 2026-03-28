/**
 * Supabase Server Utilities
 * Helper functions for server-side Supabase operations
 */

import { cookies } from 'next/headers';
import { createServerClient as createClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { isAuth0Enabled } from '@/lib/auth/provider';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuth0SessionUser } from '@/lib/auth0/server';
import { resolveOrCreateSupabaseIdentityFromAuth0User } from '@/lib/auth/identity';

export interface ProfileGateStatus {
  role: string;
  is_authorized: boolean;
  basic_complete: boolean;
  upgrade_complete: boolean;
}

/**
 * Create a Supabase client for Server Components
 * Automatically handles cookie-based authentication
 */
export async function createServerSupabaseClient() {
  if (isAuth0Enabled()) {
    return createSupabaseAdminClient();
  }

  const cookieStore = await cookies();

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  if (isAuth0Enabled()) {
    const auth0User = await getAuth0SessionUser();
    if (auth0User) {
      return resolveOrCreateSupabaseIdentityFromAuth0User(auth0User);
    }

    // Hybrid mode fallback: allow native Supabase session users to work
    // even when auth provider is configured as Auth0.
    const cookieStore = await cookies();
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in Server Components.
            }
          },
        },
      }
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) return user;
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Check if the current user is authorized (admin)
 * 兼容 is_authorized 与 role === 'A'
 */
export async function isAuthorizedUser(userId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('is_authorized, role')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  return data.is_authorized === true || data.role === 'A';
}

/**
 * Get role for a user (for Role Matrix permission checks)
 * Returns 'T' if not found or null
 */
export async function getUserRole(userId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (error || !data?.role) {
    return 'T';
  }
  
  return data.role;
}

/**
 * Fetch is_authorized and role in a single query.
 * Use this when both values are needed to avoid two round-trips.
 */
export async function getUserProfileInfo(userId: string): Promise<{
  is_authorized: boolean;
  role: string;
}> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('is_authorized, role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { is_authorized: false, role: 'T' };
  }

  return {
    is_authorized: data.is_authorized === true,
    role: data.role ?? 'T',
  };
}

/**
 * Check completion state used by onboarding and upgrade gates.
 */
export async function getProfileGateStatus(userId: string): Promise<ProfileGateStatus> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('is_authorized, role, country_region, preferred_language, call_name, upgrade_profile_completed_at')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return {
      role: 'T',
      is_authorized: false,
      basic_complete: false,
      upgrade_complete: false,
    };
  }

  const basicComplete = Boolean(
    data.country_region?.trim() &&
    data.preferred_language?.trim() &&
    data.call_name?.trim()
  );

  return {
    role: data.role ?? 'T',
    is_authorized: data.is_authorized === true,
    basic_complete: basicComplete,
    upgrade_complete: Boolean(data.upgrade_profile_completed_at),
  };
}

export function isUpgradedRole(role: string | null | undefined): boolean {
  return Boolean(role && role !== 'T');
}
