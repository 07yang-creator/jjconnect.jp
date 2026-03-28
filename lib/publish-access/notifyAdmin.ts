import { Resend } from 'resend';
import type { PublishAccessRequest } from '@/types/database';
import { PUBLISH_ACCESS_NOTIFY_EMAIL, RESEND_FROM_FALLBACK } from './constants';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function appOrigin(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

/**
 * Email support@jjconnect.jp when a new request is submitted.
 * No-op (logs) if RESEND_API_KEY is missing.
 */
export async function notifyAdminsPublishAccessRequest(row: PublishAccessRequest): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || RESEND_FROM_FALLBACK;

  const origin = appOrigin();
  const adminUrl = origin
    ? `${origin}/admin/publish-requests?id=${encodeURIComponent(row.id)}`
    : `/admin/publish-requests?id=${row.id}`;

  const subject = `[JJConnect] New publish access request — ${row.full_name}`;

  const html = `
  <h2>New publish access request</h2>
  <p><strong>Request ID:</strong> ${escapeHtml(row.id)}</p>
  <p><strong>Submitted:</strong> ${escapeHtml(row.created_at)}</p>
  <p><strong>Applicant email:</strong> ${escapeHtml(row.applicant_email)}</p>
  <p><strong>User ID:</strong> ${escapeHtml(row.user_id)}</p>
  <hr />
  <p><strong>Full name:</strong> ${escapeHtml(row.full_name)}</p>
  <p><strong>Organization:</strong> ${escapeHtml(row.org_name)} (${escapeHtml(row.org_type)})</p>
  <p><strong>Role in org:</strong> ${escapeHtml(row.role_in_org)}</p>
  ${row.org_url ? `<p><strong>URL:</strong> ${escapeHtml(row.org_url)}</p>` : ''}
  <p><strong>Publishing experience:</strong> ${escapeHtml(row.publishing_experience)}</p>
  ${row.language_pref ? `<p><strong>Language:</strong> ${escapeHtml(row.language_pref)}</p>` : ''}
  <p><strong>What they want to publish:</strong></p>
  <pre style="white-space:pre-wrap;font-family:sans-serif;">${escapeHtml(row.intent_summary)}</pre>
  <p><a href="${escapeHtml(adminUrl)}">Open in admin</a></p>
  `.trim();

  if (!apiKey) {
    console.warn(
      '[publish-access] RESEND_API_KEY not set; skipping admin email. Request id:',
      row.id
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [PUBLISH_ACCESS_NOTIFY_EMAIL],
    subject,
    html,
  });

  if (error) {
    console.error('[publish-access] Resend error:', error);
  }
}
