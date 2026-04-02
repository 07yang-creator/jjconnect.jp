import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getAuthProvider } from '@/lib/auth/provider';
import { accountCheckSchema } from '@/lib/schemas';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

async function existsInAuthUsers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  identifier: string
): Promise<boolean> {
  const raw = identifier.trim();
  const byEmail = raw.includes('@');
  const targetEmail = byEmail ? normalizeEmail(raw) : null;
  const targetUser = byEmail ? null : raw.toLowerCase();

  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users: User[] = data?.users ?? [];
    for (const u of users) {
      if (targetEmail && u.email?.toLowerCase() === targetEmail) return true;
      if (!targetUser) continue;
      const meta = u.user_metadata as Record<string, unknown> | null | undefined;
      const un = typeof meta?.username === 'string' ? meta.username.toLowerCase() : '';
      if (un === targetUser) return true;
    }
    if (users.length < perPage) break;
    page += 1;
    if (page > 100) break;
  }
  return false;
}

/**
 * Static login.html uses this to decide “sign in” vs “create account”.
 * Previously it called the Cloudflare Worker; when using `next dev` the worker is often
 * not running. Same-origin + Supabase matches password sign-up (auth.users / profiles).
 */
export async function GET(request: NextRequest) {
  if (getAuthProvider() === 'auth0') {
    return NextResponse.json({ error: 'Use /auth/login for Auth0' }, { status: 404 });
  }

  const parsed = accountCheckSchema.safeParse({
    identifier: request.nextUrl.searchParams.get('identifier') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid identifier' }, { status: 400 });
  }

  const identifier = parsed.data.identifier.trim();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Server missing Supabase admin configuration' },
      { status: 503 }
    );
  }

  const admin = createSupabaseAdminClient();

  try {
    if (identifier.includes('@')) {
      const email = normalizeEmail(identifier);
      const { data, error } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
      if (!error && data?.id) {
        return NextResponse.json({ exists: true });
      }
    }

    const exists = await existsInAuthUsers(admin, identifier);
    return NextResponse.json({ exists });
  } catch (e) {
    console.error('[GET /api/account/check]', e);
    return NextResponse.json({ error: 'Account check failed' }, { status: 500 });
  }
}
