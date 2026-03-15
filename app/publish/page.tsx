/**
 * Publish Page - Server Component wrapper
 * Requires login + is_authorized (write permission for publish)
 * Non-authorized users are redirected to home
 */

import { redirect } from 'next/navigation';
import { getCurrentUser, isAuthorizedUser } from '@/lib/supabase/server';
import PublishForm from './PublishForm';

export default async function PublishPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const authorized = await isAuthorizedUser(user.id);
  if (!authorized) {
    redirect('/');
  }
  return <PublishForm />;
}
