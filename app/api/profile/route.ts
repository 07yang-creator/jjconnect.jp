import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import {
  getOrCreateOwnLegacyProfile,
  normalizeProfilePatch,
  toLegacyProfile,
  updateOwnLegacyProfile,
} from './shared';

export const dynamic = 'force-dynamic';

function userMetadataFromIdentity(user: unknown): Record<string, unknown> | null {
  if (!user || typeof user !== 'object') return null;
  if (!('user_metadata' in user)) return null;
  const value = (user as { user_metadata?: unknown }).user_metadata;
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: '需要登录' }, { status: 401 });

    const profile = await getOrCreateOwnLegacyProfile({
      id: user.id,
      email: user.email,
      user_metadata: userMetadataFromIdentity(user),
    });
    return NextResponse.json({ success: true, profile: toLegacyProfile(profile) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load profile';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: '需要登录' }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const patch = normalizeProfilePatch(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, error: '没有可更新的字段' }, { status: 400 });
    }

    const profile = await updateOwnLegacyProfile(
      {
        id: user.id,
        email: user.email,
        user_metadata: userMetadataFromIdentity(user),
      },
      patch
    );
    return NextResponse.json({ success: true, profile: toLegacyProfile(profile) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
