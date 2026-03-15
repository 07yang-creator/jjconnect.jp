/**
 * Admin Layout - Notion-style sidebar + top bar
 * Sidebar: ~224px, collapse to 48px on mobile (drawer)
 * 权限：is_authorized / role_level=A 或 矩阵中对 admin_content/blog_full_* 有 R/W
 */

import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfileInfo } from '@/lib/supabase/server';
import { getAllPermissionsForRole, canAccessAdmin } from '@/lib/supabase/roleMatrix';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Single profiles query for both flag and role_level
  const { is_authorized: byFlag, role_level: roleLevel } = await getUserProfileInfo(user.id);
  const permissions = await getAllPermissionsForRole(roleLevel);
  const byMatrix = canAccessAdmin(permissions);

  if (!byFlag && !byMatrix) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)]">
      <AdminSidebar />
      <main className="flex-1 min-w-0 pt-14 pl-14 lg:pt-0 lg:pl-0">
        {children}
      </main>
    </div>
  );
}
