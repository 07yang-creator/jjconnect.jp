import { NextResponse } from 'next/server';
import { getPublicLegacyProfile } from '../shared';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const id = String(userId || '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'Invalid user id' }, { status: 400 });

    const profile = await getPublicLegacyProfile(id);
    if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });

    return NextResponse.json({ success: true, profile, public: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load profile';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
