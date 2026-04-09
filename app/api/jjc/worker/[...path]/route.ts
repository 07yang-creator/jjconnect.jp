/**
 * BFF proxy: /api/jjc/worker/[...path]
 *
 * Verifies the current Auth0 / Supabase admin session server-side, then
 * forwards the request to the Cloudflare auth worker with an X-Internal-Secret
 * header.  The worker grants admin access when that header matches its
 * INTERNAL_API_SECRET env var (same pattern already used by the email proxy).
 *
 * Required env:
 *   INTERNAL_API_SECRET   — shared secret (set in both .env and wrangler secret)
 *   JJC_WORKER_URL        — optional override (defaults to the deployed worker URL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfileInfo } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const WORKER_ORIGIN =
  (process.env.JJC_WORKER_URL || 'https://jjconnect-auth-worker.07-yang.workers.dev').replace(
    /\/$/,
    ''
  );

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string
) {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'Server misconfiguration: INTERNAL_API_SECRET not set' },
      { status: 503 }
    );
  }

  const isDev = process.env.NODE_ENV === 'development';

  // Auth gate: must have an active admin session.
  // In local development APP_BASE_URL points to production so Auth0 callbacks
  // don't complete at localhost:3000 — skip the user check in that case.
  // The INTERNAL_API_SECRET still secures the worker.
  let userId = 'dev-proxy';
  if (!isDev) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '需要登录', success: false }, { status: 401 });
    }

    const { is_authorized, role } = await getUserProfileInfo(user.id);
    if (!is_authorized && role !== 'A') {
      return NextResponse.json({ error: '权限不足', success: false }, { status: 403 });
    }
    userId = user.id;
  }

  const { path } = await params;
  const workerPath = '/' + path.join('/');
  const search = req.nextUrl.searchParams.toString();
  const workerUrl = `${WORKER_ORIGIN}${workerPath}${search ? `?${search}` : ''}`;

  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Internal-Secret': secret,
    'X-JJC-User-Id': userId,
  };

  const hasBody = method !== 'GET' && method !== 'HEAD';
  let body: string | undefined;
  if (hasBody) {
    try {
      body = await req.text();
    } catch {
      body = undefined;
    }
  }

  const workerRes = await fetch(workerUrl, {
    method,
    headers: forwardHeaders,
    ...(body !== undefined ? { body } : {}),
  });

  const text = await workerRes.text();
  const contentType = workerRes.headers.get('Content-Type') || 'application/json';

  return new NextResponse(text, {
    status: workerRes.status,
    headers: { 'Content-Type': contentType },
  });
}

export function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx, 'GET');
}
export function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx, 'POST');
}
export function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx, 'PUT');
}
export function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx, 'DELETE');
}
export function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx, 'PATCH');
}
