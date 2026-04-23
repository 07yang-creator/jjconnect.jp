import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * DELETE /api/account/delete
 *
 * Permanently deletes the currently authenticated user's account.
 * 1. Deletes the user's profile row from the `profiles` table.
 * 2. Deletes the user from Supabase Auth (auth.users).
 *
 * Requires a valid session (Bearer token or cookie).
 */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error. Please contact support.' },
        { status: 503 }
      );
    }

    const admin = createSupabaseAdminClient();

    // 1. Delete profile data first (foreign key references auth.users)
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('[DELETE /api/account/delete] Profile deletion failed:', profileError);
      // Continue to delete auth user even if profile deletion fails
    }

    // 2. Delete from auth.users using Admin API
    const { error: authError } = await admin.auth.admin.deleteUser(user.id);

    if (authError) {
      console.error('[DELETE /api/account/delete] Auth user deletion failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Your account has been permanently deleted.',
    });
  } catch (error) {
    console.error('[DELETE /api/account/delete] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
