import { redirect } from 'next/navigation';
import { getCurrentUser, getProfileGateStatus, getUserProfileInfo, isUpgradedRole } from '@/lib/supabase/server';
import { getAllPermissionsForRole, canAccessAdmin } from '@/lib/supabase/roleMatrix';

/** Same gate as `app/admin/layout.tsx`. */
export async function assertCanAccessAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=%2Fadmin');
  }

  const { is_authorized: byFlag, role: roleLevel } = await getUserProfileInfo(user.id);
  const permissions = await getAllPermissionsForRole(roleLevel);
  const byMatrix = canAccessAdmin(permissions);

  if (!byFlag && !byMatrix) {
    redirect('/');
  }

  const gateStatus = await getProfileGateStatus(user.id);
  if (!gateStatus.basic_complete) {
    redirect('/onboarding?next=%2Fadmin');
  }
  if (isUpgradedRole(gateStatus.role) && (!gateStatus.upgrade_complete || !user.email_confirmed_at)) {
    redirect('/upgrade/complete-profile?next=%2Fadmin');
  }

  return user;
}
