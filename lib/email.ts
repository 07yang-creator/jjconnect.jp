/**
 * Email sending via MailChannels API
 * Uses noreply@jjconnect.jp as sender (same as workers/auth-worker.js)
 */

import { escapeHtml } from './escape-html';

const REVIEW_ADMIN_EMAIL = process.env.REVIEW_ADMIN_EMAIL || 'review@jjconnect.jp';

// Worker proxy config — MailChannels only works in CF Workers runtime,
// so Next.js delegates email sending to the deployed Worker.
const WORKER_BASE_URL = (process.env.WORKER_BASE_URL || 'https://www.jjconnect.jp').replace(/\/$/, '');
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send a single email by proxying through the Cloudflare Worker.
 * The Worker uses MailChannels (CF Workers runtime only), so all
 * email requests from Next.js are forwarded here.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<SendEmailResult> {
  if (!INTERNAL_API_SECRET) {
    console.warn('[email] INTERNAL_API_SECRET not set — email sending skipped');
    return { success: false, error: 'INTERNAL_API_SECRET not configured' };
  }

  try {
    const response = await fetch(`${WORKER_BASE_URL}/api/internal/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ to, subject, html, text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Worker email API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as SendEmailResult;
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[email] Send error:', message);
    return { success: false, error: message };
  }
}

/**
 * Send "we have received your submission" email to the author
 */
export async function sendPostSubmittedConfirmationToAuthor(
  authorEmail: string
): Promise<SendEmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2D3748; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2B6CB0; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px 20px; border: 1px solid #EDF2F7; border-top: none; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>文章已收到</h1>
    </div>
    <div class="content">
      <p>您好，</p>
      <p>我们已经收到您提交的文章。</p>
      <p>当管理员完成审核以后，文章将得到发布。</p>
      <p>感谢您的投稿。</p>
      <p>祝好，<br>JJConnect 团队</p>
    </div>
    <div class="footer">
      <p>此邮件由系统自动发送，请勿直接回复。</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
文章已收到

我们已经收到您提交的文章。
当管理员完成审核以后，文章将得到发布。

感谢您的投稿。

祝好，
JJConnect 团队

此邮件由系统自动发送，请勿直接回复。
  `.trim();

  return sendEmail({
    to: authorEmail,
    subject: '【JJConnect】文章已收到，等待审核',
    html,
    text,
  });
}

/**
 * Send notification to section admin (review@jjconnect.jp) that a new post was submitted for review
 */
export async function sendPostSubmittedNotificationToAdmin(params: {
  postTitle: string;
  authorEmail: string;
  postId: string;
  authorDisplayName?: string | null;
}): Promise<SendEmailResult> {
  const baseUrl =
    typeof process.env.NEXT_PUBLIC_APP_URL === 'string' && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'https://www.jjconnect.jp';
  const reviewUrl = `${baseUrl}/admin/review`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2D3748; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2B6CB0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #EDF2F7; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 16px; }
    .field-label { font-weight: 600; color: #4A5568; margin-bottom: 4px; }
    .field-value { color: #2D3748; }
    .button { display: inline-block; background: #2B6CB0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>新文章待审核</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="field-label">文章标题</div>
        <div class="field-value">${escapeHtml(params.postTitle)}</div>
      </div>
      <div class="field">
        <div class="field-label">投稿者</div>
        <div class="field-value">${escapeHtml(params.authorDisplayName || params.authorEmail)}</div>
      </div>
      <div class="field">
        <div class="field-label">投稿者邮箱</div>
        <div class="field-value">${escapeHtml(params.authorEmail)}</div>
      </div>
      <div class="field">
        <div class="field-label">提交时间</div>
        <div class="field-value">${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Tokyo' })}</div>
      </div>
      <a href="${escapeHtml(reviewUrl)}" class="button">前往审核</a>
    </div>
    <div class="footer">
      <p>此邮件由系统自动发送。</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
新文章待审核

文章标题: ${params.postTitle}
投稿者: ${params.authorDisplayName || params.authorEmail}
投稿者邮箱: ${params.authorEmail}
提交时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Tokyo' })}

前往审核: ${reviewUrl}
  `.trim();

  return sendEmail({
    to: REVIEW_ADMIN_EMAIL,
    subject: `【JJConnect】新文章待审核：${params.postTitle.slice(0, 40)}${params.postTitle.length > 40 ? '…' : ''}`,
    html,
    text,
  });
}

/**
 * Notify author that their submission was rejected (with optional reason and edit link).
 */
export async function sendPostRejectedToAuthor(params: {
  to: string;
  postTitle: string;
  postId: string;
  reason?: string | null;
}): Promise<SendEmailResult> {
  const baseUrl =
    typeof process.env.NEXT_PUBLIC_APP_URL === 'string' && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'https://www.jjconnect.jp';
  const editUrl = `${baseUrl}/publish?edit=${encodeURIComponent(params.postId)}`;
  const reasonBlock =
    params.reason && params.reason.trim()
      ? `<p><strong>管理员说明：</strong></p><p>${escapeHtml(params.reason.trim())}</p>`
      : '<p>本次未通过审核，您可根据站点规范修改后再次提交。</p>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2D3748; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #C53030; color: white; padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px 20px; border: 1px solid #EDF2F7; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #2B6CB0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>文章未通过审核</h1>
    </div>
    <div class="content">
      <p>您好，</p>
      <p>您提交的文章「${escapeHtml(params.postTitle)}」未通过本次审核。</p>
      ${reasonBlock}
      <p>您可以修改内容后重新提交审核，或从草稿列表中撤回稿件。</p>
      <a href="${escapeHtml(editUrl)}" class="button">打开编辑页面</a>
    </div>
    <div class="footer">
      <p>此邮件由系统自动发送，请勿直接回复。</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
文章未通过审核

您提交的文章「${params.postTitle}」未通过本次审核。
${params.reason && params.reason.trim() ? `说明：${params.reason.trim()}\n` : ''}
您可以修改后重新提交，或从草稿列表撤回。

编辑链接: ${editUrl}

此邮件由系统自动发送，请勿直接回复。
  `.trim();

  return sendEmail({
    to: params.to,
    subject: `【JJConnect】文章未通过审核：${params.postTitle.slice(0, 40)}${params.postTitle.length > 40 ? '…' : ''}`,
    html,
    text,
  });
}
