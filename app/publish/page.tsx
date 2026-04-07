/**
 * Publish page — requires sign-in, profile gates, and writer access.
 */

import { redirect } from 'next/navigation';
import { getPostForAuthorEdit, type AuthorEditablePost } from '@/app/actions/posts';
import { getAuthProvider } from '@/lib/auth/provider';
import { canPublishDirectly } from '@/lib/publish/canPublishDirectly';
import { getCurrentUser, getProfileGateStatus } from '@/lib/supabase/server';
import PublishForm from './PublishForm';

const PUBLISH_NEXT = '/publish';


export default async function PublishPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const gateStatus = await getProfileGateStatus(user.id);
  if (!gateStatus.basic_complete) {
    redirect(`/onboarding?next=${encodeURIComponent(PUBLISH_NEXT)}`);
  }

  if (gateStatus.role === 'admin' && (!gateStatus.upgrade_complete || !user.email_confirmed_at)) {
    redirect(`/upgrade/complete-profile?next=${encodeURIComponent(PUBLISH_NEXT)}`);
  }


  const sp = await searchParams;
  const editId = sp.edit?.trim();
  let initialPost: AuthorEditablePost | null = null;
  if (editId) {
    const loaded = await getPostForAuthorEdit(editId);
    if (!loaded.ok) {
      redirect('/publish');
    }
    initialPost = loaded.post;
  }

  const canDirect = await canPublishDirectly(user.id);

  return (
    <PublishForm
      useAuth0Identity={getAuthProvider() === 'auth0'}
      canPublishDirectly={canDirect}
      initialPost={initialPost}
    />
  );
}
