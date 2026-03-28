import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getProfileGateStatus,
  isAuthorizedUser,
  isUpgradedRole,
} from '@/lib/supabase/server';

const REQUEST_PATH = '/publish/request-access';

export async function assertCanSubmitPublishAccessRequest() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(REQUEST_PATH)}`);
  }

  const gateStatus = await getProfileGateStatus(user.id);
  if (!gateStatus.basic_complete) {
    redirect(`/onboarding?next=${encodeURIComponent(REQUEST_PATH)}`);
  }

  if (isUpgradedRole(gateStatus.role) && (!gateStatus.upgrade_complete || !user.email_confirmed_at)) {
    redirect(`/upgrade/complete-profile?next=${encodeURIComponent(REQUEST_PATH)}`);
  }

  if (await isAuthorizedUser(user.id)) {
    redirect('/publish');
  }

  return user;
}
