/**
 * Internal email sending endpoint
 * Only accepts requests with a valid X-Internal-Secret header.
 * This allows the Next.js app (Node.js / CF Pages) to delegate
 * MailChannels sending to the Worker runtime where it works.
 */

import { jsonResponse } from '../lib/http.js';
import { sendEmail } from '../lib/email.js';
import { extractToken } from '../lib/auth.js';
import { getSupabaseUserFromToken } from '../lib/supabase.js';

export async function handleSendEmail(request, env) {
  const secret = request.headers.get('X-Internal-Secret');
  const expectedSecret = env.INTERNAL_API_SECRET;

  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { to, subject, html, text } = body;
  if (!to || !subject || !html || !text) {
    return jsonResponse(
      { success: false, error: 'Missing required fields: to, subject, html, text' },
      400,
    );
  }

  const result = await sendEmail({ to, subject, html, text }, env);
  return jsonResponse(result, result.success ? 200 : 500);
}

export async function handleNewsletterInterest(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const email = String(body?.email || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonResponse({ success: false, error: 'Invalid email' }, 400);
  }

  const adminMailbox = env.REVIEW_ADMIN_EMAIL || env.ADMIN_EMAIL || 'support@jjconnect.jp';
  const submittedAt = new Date().toISOString();
  const sourceIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const sourceUa = request.headers.get('User-Agent') || 'unknown';

  const html = `
    <h2>New Getting Ready newsletter interest</h2>
    <p>A visitor left an email on gettingready page.</p>
    <ul>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Submitted at:</strong> ${submittedAt}</li>
      <li><strong>IP:</strong> ${sourceIp}</li>
      <li><strong>User-Agent:</strong> ${sourceUa}</li>
    </ul>
  `;
  const text = [
    'New Getting Ready newsletter interest',
    `Email: ${email}`,
    `Submitted at: ${submittedAt}`,
    `IP: ${sourceIp}`,
    `User-Agent: ${sourceUa}`,
  ].join('\n');

  const result = await sendEmail(
    {
      to: adminMailbox,
      subject: 'New newsletter interest from gettingready page',
      html,
      text,
    },
    env,
  );

  if (!result.success) {
    return jsonResponse({ success: false, error: result.error || 'Failed to send email' }, 500);
  }

  return jsonResponse({ success: true });
}

export async function handleRequestPublishAuth(request, env) {
  const token = extractToken(request);
  if (!token) return jsonResponse({ success: false, error: 'Unauthorized' }, 401);

  const user = await getSupabaseUserFromToken(env, token).catch(() => null);
  if (!user || !user.id) return jsonResponse({ success: false, error: 'Invalid token' }, 401);

  const adminMailbox = env.REVIEW_ADMIN_EMAIL || env.ADMIN_EMAIL || 'support@jjconnect.jp';
  const submittedAt = new Date().toISOString();

  const email = user.email || 'Unknown Email';

  const html = `
    <h2>Author/Publishing Authorization Request</h2>
    <p>A user has requested authorization to publish content on JJConnect:</p>
    <ul>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>User UUID:</strong> ${user.id}</li>
      <li><strong>Requested at:</strong> ${submittedAt}</li>
    </ul>
    <p>Please review their account in the admin panel and assign the appropriate role level to grant publish access.</p>
  `;
  
  const text = [
    'Author/Publishing Authorization Request',
    `Email: ${email}`,
    `User UUID: ${user.id}`,
    `Requested at: ${submittedAt}`,
  ].join('\n');

  const result = await sendEmail(
    {
      to: adminMailbox,
      subject: 'New Author/Publishing Request - JJConnect',
      html,
      text,
    },
    env,
  );

  if (!result.success) {
    return jsonResponse({ success: false, error: result.error || 'Failed to send email' }, 500);
  }

  return jsonResponse({ success: true });
}

