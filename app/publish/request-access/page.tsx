import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { assertCanSubmitPublishAccessRequest } from '@/lib/publish-access/guards';
import RequestAccessForm from './RequestAccessForm';

export const metadata = {
  title: 'Request publishing access | JJConnect',
  description: 'Tell us about yourself so we can enable posting on your account.',
};

export default async function PublishRequestAccessPage() {
  const user = await assertCanSubmitPublishAccessRequest();

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, call_name')
    .eq('id', user.id)
    .maybeSingle();

  const defaultFullName =
    (profile?.call_name || profile?.display_name || '').trim() || '';

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <p className="text-sm text-gray-500 mb-6">
        <Link href="/publish" className="text-blue-600 hover:underline">
          ← Back
        </Link>
      </p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Request to publish</h1>
      <p className="text-gray-600 text-sm mb-8">
        A few details help our team turn on writing for your account. After you submit, we will email{' '}
        <span className="font-medium">support@jjconnect.jp</span> with your answers.
      </p>
      <RequestAccessForm defaultFullName={defaultFullName} userEmail={user.email ?? ''} />
    </div>
  );
}
