/**
 * Admin Layout - Notion-style sidebar + top bar
 * Sidebar: ~224px, collapse to 48px on mobile (drawer)
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
    redirect('/login.html');
  }

  const authorized = await isAuthorizedUser(user.id);
  if (!authorized) {
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
