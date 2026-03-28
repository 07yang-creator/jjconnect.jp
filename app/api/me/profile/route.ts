import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server';

const ALLOWED_KEYS = [
  'country_region',
  'preferred_language',
  'call_name',
  'basic_profile_completed_at',
  'full_name',
  'phone_number',
  'company_name',
  'address_line1',
  'postal_code',
  'upgrade_profile_completed_at',
  'email_verified_at',
] as const;

/**
 * Update the current user's profile row (works for Auth0-mapped users: server uses service role).
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const payload: Record<string, string | null> = {};

  for (const key of ALLOWED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const v = raw[key];
    if (v === null) {
      payload[key] = null;
      continue;
    }
    if (typeof v === 'string') {
      payload[key] = v;
    }
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
