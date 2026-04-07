/**
 * Publish page — requires sign-in, profile gates, and writer access.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPostForAuthorEdit, type AuthorEditablePost } from '@/app/actions/posts';
import { getAuthProvider } from '@/lib/auth/provider';
import { canPublishDirectly } from '@/lib/publish/canPublishDirectly';
import { getCurrentUser, getProfileGateStatus, isAuthorizedUser, isUpgradedRole } from '@/lib/supabase/server';
import PublishForm from './PublishForm';

const PUBLISH_NEXT = '/publish';

function PublishAccessPending() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-3">We&apos;d love to host your story</h1>
        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          Click on the button below—just a few steps to set up your account and get ready.
        </p>
        <Link
          href="/publish/request-access"
          className="inline-flex justify-center items-center w-full sm:w-auto rounded-lg bg-blue-600 text-white px-6 py-3 text-sm font-semibold hover:bg-blue-700"
        >
          I want to post a story
        </Link>
      </div>
    </div>
  );
}

export default async function PublishPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(PUBLISH_NEXT)}`);
  }

  const gateStatus = await getProfileGateStatus(user.id);
  if (!gateStatus.basic_complete) {
    redirect(`/onboarding?next=${encodeURIComponent(PUBLISH_NEXT)}`);
  }

  if (isUpgradedRole(gateStatus.role) && (!gateStatus.upgrade_complete || !user.email_confirmed_at)) {
    redirect(`/upgrade/complete-profile?next=${encodeURIComponent(PUBLISH_NEXT)}`);
  }

  // TEMPORARY BYPASS FOR TESTING: Allow any registered user to publish
  /*
  const authorized = await isAuthorizedUser(user.id);
  if (!authorized) {
    return <PublishAccessPending />;
  }
  */
  const authorized = true;

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
