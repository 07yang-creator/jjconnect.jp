/**
 * Email sending via MailChannels API
 * Uses noreply@jjconnect.jp as sender (same as workers/auth-worker.js)
 */

const FROM_EMAIL = 'noreply@jjconnect.jp';
const FROM_NAME = 'JJConnect';
const REVIEW_ADMIN_EMAIL = 'review@jjconnect.jp';
const MAILCHANNELS_API = 'https://api.mailchannels.net/tx/v1/send';

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
 * Send a single email via MailChannels API
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const response = await fetch(MAILCHANNELS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          { type: 'text/html', value: html },
          { type: 'text/plain', value: text },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MailChannels API error: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email send error:', message);
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
      : 'https://jjconnect.jp';
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
