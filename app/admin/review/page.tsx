import { redirect } from 'next/navigation';
import { createServerSupabaseClient, getCurrentUser, isAuthorizedUser, getUserRole } from '@/lib/supabase/server';
import { getAllPermissionsForRole, canAccessAdmin } from '@/lib/supabase/roleMatrix';
import AdminReviewClient from './AdminReviewClient';
import type { ReviewPost } from './types';

async function isAdminUser(userId: string): Promise<boolean> {
  const [byFlag, roleLevel] = await Promise.all([
    isAuthorizedUser(userId),
    getUserRole(userId),
  ]);
  if (byFlag) return true;
  const permissions = await getAllPermissionsForRole(roleLevel);
  return canAccessAdmin(permissions);
}

async function fetchPendingPosts(): Promise<ReviewPost[]> {
  const supabase = await createServerSupabaseClient();

  // We fetch all posts that are pending review
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      category_id,
      content,
      cover_image,
      created_at,
      author:profiles(display_name, avatar_url),
      category:categories(name, slug)
    `)
    .eq('status', 'draft')
    .filter('content->>review_state', 'eq', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending posts:', error);
    return [];
  }

  return (data as unknown as ReviewPost[]) || [];
}

export default async function AdminReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const authorized = await isAdminUser(user.id);
  if (!authorized) redirect('/');

  const posts = await fetchPendingPosts();

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <AdminReviewClient initialPosts={posts} />
    </div>
  );
}

