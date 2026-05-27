/**
 * Admin Layout — Notion-style sidebar shell.
 * Gate: signed-in jjconnect.jp admin (jjc.profiles.role_level === 'A').
 * jjconnect.jp is all-public for now, so there is no profile-completion gate.
 */

import { redirect } from 'next/navigation';
import { getCurrentUser, isAuthorizedUser } from '@/lib/supabase/server';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=%2Fadmin');
  }
  if (!(await isAuthorizedUser(user.id))) {
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
