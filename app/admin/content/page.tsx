/**
 * Admin Content Page
 * Same TipTap config as Publish - for admin content editing
 */

import { redirect } from 'next/navigation';
import { getCurrentUser, isAuthorizedUser } from '@/lib/supabase/server';
import AdminContentEditor from './AdminContentEditor';

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login.html');
  }

  const authorized = await isAuthorizedUser(user.id);
  if (!authorized) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">内容编辑</h1>
          <p className="text-sm text-gray-500 mt-1">与发布页相同的 TipTap 配置，支持粘贴/拖拽图片</p>
        </header>
        <AdminContentEditor />
      </div>
    </div>
  );
}
