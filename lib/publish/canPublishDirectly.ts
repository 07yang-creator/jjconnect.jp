import { getAllPermissionsForRole, canAccessAdmin } from '@/lib/supabase/roleMatrix';
import { getUserRole } from '@/lib/supabase/server';

/**
 * Only these users may set a post to `published` from the app (skip review queue).
 * Matches the intent: authors submit for review; admins publish.
 */
export async function canPublishDirectly(userId: string): Promise<boolean> {
  const roleLevel = await getUserRole(userId);
  if (roleLevel === 'A') return true;
  const permissions = await getAllPermissionsForRole(roleLevel);
  return canAccessAdmin(permissions);
}
