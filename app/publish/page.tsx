/**
 * Publish Page - Server Component wrapper
 * Requires login + is_authorized (write permission for publish)
 * Non-authorized users are redirected to home
 */

import { redirect } from 'next/navigation';
import { getAuthProvider } from '@/lib/auth/provider';
import { getCurrentUser, getProfileGateStatus, isAuthorizedUser, isUpgradedRole } from '@/lib/supabase/server';
import PublishForm from './PublishForm';

export default async function PublishPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const gateStatus = await getProfileGateStatus(user.id);
  if (!gateStatus.basic_complete) {
    redirect('/onboarding?next=%2Fpublish');
  }

  if (isUpgradedRole(gateStatus.role) && (!gateStatus.upgrade_complete || !user.email_confirmed_at)) {
    redirect('/upgrade/complete-profile?next=%2Fpublish');
  }

  const authorized = await isAuthorizedUser(user.id);
  if (!authorized) {
    redirect('/');
  }
  return <PublishForm useAuth0Identity={getAuthProvider() === 'auth0'} />;
}
