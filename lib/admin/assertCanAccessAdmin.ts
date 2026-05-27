import { redirect } from 'next/navigation';
import { getCurrentUser, isAuthorizedUser } from '@/lib/supabase/server';

/** Same gate as app/admin/layout.tsx: a signed-in jjconnect.jp admin (role_level 'A'). */
export async function assertCanAccessAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=%2Fadmin');
  }
  if (!(await isAuthorizedUser(user.id))) {
    redirect('/');
  }
  return user;
}
