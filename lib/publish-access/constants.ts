/** Inbox for new publish-access request notifications (override with env if needed). */
export const PUBLISH_ACCESS_NOTIFY_EMAIL =
  process.env.PUBLISH_ACCESS_NOTIFY_EMAIL?.trim() || 'support@jjconnect.jp';

/** Verified sender in Resend (e.g. JJConnect <noreply@yourdomain.com>). */
export const RESEND_FROM_FALLBACK = 'JJConnect <onboarding@resend.dev>';
