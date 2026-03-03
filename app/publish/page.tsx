/**
 * Publish Page - Server Component wrapper
 * Redirects to /login.html if user is not authenticated
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import PublishForm from './PublishForm';

export default async function PublishPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login.html');
  }
  return <PublishForm />;
}
