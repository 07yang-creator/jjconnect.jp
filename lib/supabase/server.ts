/**
 * Supabase Server Utilities — Supabase-only (Auth0 removed in Movement B).
 *
 * jjconnect.jp profiles live in the `jjc` schema of the SHARED Supabase project
 * (shared auth.users = SSO with jjconnect.online). Profile helpers below read
 * `jjc.profiles` via `.schema('jjc')`. jjconnect.jp is all-public for now, so the
 * onboarding/upgrade gate helpers return permissive ("complete") status.
 */

import { cookies } from 'next/headers';
import { createServerClient as createClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface ProfileGateStatus {
  role: string;
  is_authorized: boolean;
  basic_complete: boolean;
  upgrade_complete: boolean;
}

function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !anon?.trim()) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return { url, anon };
}

/**
 * Supabase client for Server Components / route handlers (cookie-based session).
 */
export async function createServerSupabaseClient() {
  const { url, anon } = requireSupabaseEnv();
  const cookieStore = await cookies();
  return createClient<Database>(url, anon, {
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
          // Called from a Server Component; the session is refreshed in middleware.
        }
      },
    },
  });
}

/**
 * The current authenticated user, or null.
 */
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Read a user's role_level from jjc.profiles (default 'T'). Uses the session
 * client — RLS returns the row only for the caller's own id, which is what every
 * call site needs (gating the logged-in user).
 */
export async function getUserRole(userId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .schema('jjc')
    .from('profiles')
    .select('role_level')
    .eq('id', userId)
    .maybeSingle();
  return data?.role_level ?? 'T';
}

/** jjconnect.jp admin == role_level 'A'. */
export async function isAuthorizedUser(userId: string): Promise<boolean> {
  return (await getUserRole(userId)) === 'A';
}

/** is_authorized + role in one call (kept for existing callers). */
export async function getUserProfileInfo(userId: string): Promise<{
  is_authorized: boolean;
  role: string;
}> {
  const role = await getUserRole(userId);
  return { is_authorized: role === 'A', role };
}

/**
 * Onboarding / upgrade gate status. jjconnect.jp is all-public for now, so there
 * are no gates — report everything complete (kept for callers; revisit when the
 * gating matrix + paid tiers come online).
 */
export async function getProfileGateStatus(userId: string): Promise<ProfileGateStatus> {
  const role = await getUserRole(userId);
  return {
    role,
    is_authorized: role === 'A',
    basic_complete: true,
    upgrade_complete: true,
  };
}

export function isUpgradedRole(role: string | null | undefined): boolean {
  return Boolean(role && role !== 'T');
}

/**
 * Provision a jjc.profiles row on first login (service role; bypasses RLS).
 * Auto-promotes the configured ADMIN_EMAIL to role_level 'A'.
 */
export async function provisionJjcProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const email = user.email?.trim() || null;
  const isAdminEmail = Boolean(adminEmail && email && email.toLowerCase() === adminEmail);
  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.full_name === 'string' && meta.full_name) ||
    null;

  const { data: existing } = await admin
    .schema('jjc')
    .from('profiles')
    .select('id, role_level')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    await admin.schema('jjc').from('profiles').insert({
      id: user.id,
      email,
      display_name: displayName,
      role_level: isAdminEmail ? 'A' : 'T',
      onboarded_at: new Date().toISOString(),
    });
  } else if (isAdminEmail && existing.role_level !== 'A') {
    await admin.schema('jjc').from('profiles').update({ role_level: 'A' }).eq('id', user.id);
  }
}
