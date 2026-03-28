'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertCanAccessAdmin } from '@/lib/admin/assertCanAccessAdmin';
import { notifyAdminsPublishAccessRequest } from '@/lib/publish-access/notifyAdmin';
import { assertCanSubmitPublishAccessRequest } from '@/lib/publish-access/guards';
import { getCurrentUser } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { PublishAccessRequest } from '@/types/database';

const ORG_TYPES = ['company', 'individual', 'media', 'academic', 'government', 'npo', 'other'] as const;
const EXPERIENCE = ['first_time', 'occasional', 'regular', 'professional'] as const;

const submitSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(200),
  org_name: z.string().trim().min(1, 'Organization is required').max(200),
  org_type: z.enum(ORG_TYPES),
  role_in_org: z.string().trim().min(1, 'Role is required').max(200),
  org_url: z.string().trim().max(2000).optional().transform((v) => (v === '' ? undefined : v)),
  intent_summary: z.string().trim().min(20, 'Please write at least 20 characters about what you want to publish').max(8000),
  publishing_experience: z.enum(EXPERIENCE),
  language_pref: z.string().trim().max(50).optional().transform((v) => (v === '' ? undefined : v)),
});

export type SubmitPublishAccessResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitPublishAccessRequestAction(formData: FormData): Promise<SubmitPublishAccessResult> {
  const user = await assertCanSubmitPublishAccessRequest();
  const email = user.email?.trim();
  if (!email) {
    return { ok: false, error: 'Your account has no email on file. Please update your profile or contact support.' };
  }

  const attestation = formData.get('attestation_accepted');
  if (attestation !== 'on' && attestation !== 'true') {
    return { ok: false, error: 'Please confirm that the information above is accurate.' };
  }

  const parsed = submitSchema.safeParse({
    full_name: formData.get('full_name'),
    org_name: formData.get('org_name'),
    org_type: formData.get('org_type'),
    role_in_org: formData.get('role_in_org'),
    org_url: formData.get('org_url'),
    intent_summary: formData.get('intent_summary'),
    publishing_experience: formData.get('publishing_experience'),
    language_pref: formData.get('language_pref'),
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg).flat()[0];
    return { ok: false, error: first || 'Please check the form.' };
  }

  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from('publish_access_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: 'You already have a request in progress. We will notify you when it has been reviewed.',
    };
  }

  const insert = {
    user_id: user.id,
    applicant_email: email,
    status: 'pending' as const,
    full_name: parsed.data.full_name,
    org_name: parsed.data.org_name,
    org_type: parsed.data.org_type,
    role_in_org: parsed.data.role_in_org,
    org_url: parsed.data.org_url ?? null,
    intent_summary: parsed.data.intent_summary,
    publishing_experience: parsed.data.publishing_experience,
    language_pref: parsed.data.language_pref ?? null,
    attestation_accepted: true,
  };

  const { data: row, error } = await admin
    .from('publish_access_requests')
    .insert(insert)
    .select()
    .single();

  if (error || !row) {
    console.error('[publish-access] insert failed', error);
    return { ok: false, error: 'Could not save your request. Please try again later.' };
  }

  void notifyAdminsPublishAccessRequest(row as unknown as PublishAccessRequest).catch((e) =>
    console.error('[publish-access] notify failed', e)
  );

  revalidatePath('/admin/publish-requests');
  return { ok: true };
}

export type ReviewPublishAccessResult = { ok: true } | { ok: false; error: string };

export async function approvePublishAccessRequestAction(requestId: string): Promise<ReviewPublishAccessResult> {
  await assertCanAccessAdmin();
  const admin = createSupabaseAdminClient();
  const reviewer = await getCurrentUser();
  if (!reviewer) return { ok: false, error: 'Not signed in.' };

  const { data: row, error: fetchErr } = await admin
    .from('publish_access_requests')
    .select('id, user_id, status')
    .eq('id', requestId)
    .single();

  if (fetchErr || !row || row.status !== 'pending') {
    return { ok: false, error: 'Request not found or already reviewed.' };
  }

  const { error: profileErr } = await admin.from('profiles').update({ is_authorized: true }).eq('id', row.user_id);

  if (profileErr) {
    console.error('[publish-access] profile update', profileErr);
    return { ok: false, error: 'Could not update profile.' };
  }

  const { error: updErr } = await admin
    .from('publish_access_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updErr) {
    console.error('[publish-access] request update', updErr);
    return { ok: false, error: 'Could not mark request approved.' };
  }

  revalidatePath('/admin/publish-requests');
  revalidatePath('/publish');
  return { ok: true };
}

export async function declinePublishAccessRequestAction(
  requestId: string,
  adminNote: string
): Promise<ReviewPublishAccessResult> {
  await assertCanAccessAdmin();
  const admin = createSupabaseAdminClient();
  const reviewer = await getCurrentUser();
  if (!reviewer) return { ok: false, error: 'Not signed in.' };

  const note = adminNote.trim().slice(0, 2000);

  const { data: row, error: fetchErr } = await admin
    .from('publish_access_requests')
    .select('id, status')
    .eq('id', requestId)
    .single();

  if (fetchErr || !row || row.status !== 'pending') {
    return { ok: false, error: 'Request not found or already reviewed.' };
  }

  const { error: updErr } = await admin
    .from('publish_access_requests')
    .update({
      status: 'declined',
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      admin_note: note || null,
    })
    .eq('id', requestId);

  if (updErr) {
    return { ok: false, error: 'Could not decline request.' };
  }

  revalidatePath('/admin/publish-requests');
  return { ok: true };
}
