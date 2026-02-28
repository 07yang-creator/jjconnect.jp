/**
 * Email sending utilities for JJConnect Worker
 * Uses MailChannels API (free for Cloudflare Workers)
 */

import { getWelcomeEmailContent, getSubmissionNotificationContent } from './email-templates.js';

/**
 * Send email using MailChannels API
 * @param {object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} params.text - Plain text body
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        from: {
          email: 'noreply@jjconnect.jp',
          name: 'JJConnect',
        },
        subject: subject,
        content: [
          {
            type: 'text/html',
            value: html,
          },
          {
            type: 'text/plain',
            value: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MailChannels API error: ${response.status} - ${errorText}`);
    }

    console.log(`✓ Email sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(userEmail, userName) {
  const { html, text } = getWelcomeEmailContent(userName);
  return await sendEmail({
    to: userEmail,
    subject: '欢迎加入 JJConnect!',
    html,
    text,
  });
}

/**
 * Send submission notification to support team
 */
export async function sendSubmissionNotification(submission) {
  const { html, text } = getSubmissionNotificationContent(submission);
  return await sendEmail({
    to: 'support@jjconnect.jp',
    subject: `新提交 - Joint Mamori Project (${submission.relation_type || '未分類'})`,
    html,
    text,
  });
}
