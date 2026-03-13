/**
 * Internal email sending endpoint
 * Only accepts requests with a valid X-Internal-Secret header.
 * This allows the Next.js app (Node.js / CF Pages) to delegate
 * MailChannels sending to the Worker runtime where it works.
 */

import { jsonResponse } from '../lib/http.js';
import { sendEmail } from '../lib/email.js';

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
