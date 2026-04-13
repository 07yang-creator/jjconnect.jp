import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const requestSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  markEmailConfirmed: z.boolean().default(true),
  grantAuthorized: z.boolean().default(true),
  approvePendingRequest: z.boolean().default(true),
});

function readBearerToken(req: NextRequest): string {
  const auth = req.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

function isE2EEnabled(): boolean {
  return process.env.E2E_ENABLED === 'true';
}

function tokenMatches(req: NextRequest): boolean {
  const expected = process.env.E2E_PRIVILEGED_TOKEN?.trim();
  if (!expected) return false;
  const actual = readBearerToken(req);
  return actual.length > 0 && actual === expected;
}

function emailIsAllowed(email: string): boolean {
  const domain = process.env.E2E_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!domain) return true;
  return email.toLowerCase().endsWith(`@${domain}`);
}

export async function POST(req: NextRequest) {
  if (!isE2EEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!tokenMatches(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const data = parsed.data;
  if (!emailIsAllowed(data.email)) {
    return NextResponse.json({ error: 'Email not allowed for E2E elevation' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(data.userId);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if ((userData.user.email || '').toLowerCase() !== data.email.toLowerCase()) {
    return NextResponse.json({ error: 'Email and user id mismatch' }, { status: 400 });
  }

  if (data.markEmailConfirmed) {
    const { error } = await admin.auth.admin.updateUserById(data.userId, { email_confirm: true });
    if (error) {
      return NextResponse.json({ error: `Email confirm failed: ${error.message}` }, { status: 500 });
    }
  }

  if (data.grantAuthorized) {
    const { error } = await admin.from('profiles').update({ is_authorized: true }).eq('id', data.userId);
    if (error) {
      return NextResponse.json({ error: `Profile authorization failed: ${error.message}` }, { status: 500 });
    }
  }

  if (data.approvePendingRequest) {
    const { error } = await admin
      .from('publish_access_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('user_id', data.userId)
      .eq('status', 'pending');
    if (error) {
      return NextResponse.json({ error: `Approval update failed: ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    userId: data.userId,
    email: data.email,
    updated: {
      markEmailConfirmed: data.markEmailConfirmed,
      grantAuthorized: data.grantAuthorized,
      approvePendingRequest: data.approvePendingRequest,
    },
  });
}
