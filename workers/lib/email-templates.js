/**
 * Email HTML and plain-text templates for JJConnect Worker
 */

/**
 * Welcome email template for new user registration
 */
export function getWelcomeEmailContent(userName) {
  const year = new Date().getFullYear();
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
    .button { display: inline-block; background: #2B6CB0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>欢迎加入 JJConnect!</h1>
    </div>
    <div class="content">
      <p>尊敬的 ${userName},</p>
      <p>感谢您注册 JJConnect 账号!您的账户已成功创建。</p>
      <p>现在您可以访问我们的产品和服务:</p>
      <ul>
        <li><strong>RAFT2.03</strong> - 智能财务分析系统</li>
        <li><strong>Mansion 管理主任</strong> - 物业管理解决方案</li>
        <li><strong>地产报告</strong> - 房地产分析工具</li>
      </ul>
      <a href="https://jjconnect.jp" class="button">立即访问</a>
      <p>如有任何问题,请随时联系我们。</p>
      <p>祝好,<br>JJConnect 团队</p>
    </div>
    <div class="footer">
      <p>© ${year} JJConnect. All rights reserved.</p>
      <p>此邮件由系统自动发送,请勿直接回复。</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
欢迎加入 JJConnect!

尊敬的 ${userName},

感谢您注册 JJConnect 账号!您的账户已成功创建。

现在您可以访问我们的产品和服务:
- RAFT2.03 - 智能财务分析系统
- Mansion 管理主任 - 物业管理解决方案
- 地产报告 - 房地产分析工具

访问: https://jjconnect.jp

如有任何问题,请随时联系我们。

祝好,
JJConnect 团队

© ${year} JJConnect. All rights reserved.
  `;

  return { html, text };
}

/**
 * Submission notification template for Joint Mamori form
 */
export function getSubmissionNotificationContent(submission) {
  const fileUrl = submission.media_url || '';
  const hasMedia = !!submission.media_url;
  const isImage =
    submission.media_filename && /\.(jpg|jpeg|png|gif|webp)$/i.test(submission.media_filename);
  const submittedAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2D3748; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #2B6CB0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #EDF2F7; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #EDF2F7; }
    .field-label { font-weight: 600; color: #4A5568; margin-bottom: 5px; }
    .field-value { color: #2D3748; white-space: pre-wrap; }
    .button { display: inline-block; background: #2B6CB0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .media-preview { margin: 15px 0; padding: 15px; background: #F7FAFC; border-radius: 8px; border: 1px solid #EDF2F7; }
    .media-preview img { max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px; }
    .media-link { display: inline-block; margin-top: 10px; color: #2B6CB0; text-decoration: none; font-weight: 600; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 新的 Joint Mamori 提交</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="field-label">提交時間:</div>
        <div class="field-value">${submittedAt}</div>
      </div>
      
      <div class="field">
        <div class="field-label">提交者姓名:</div>
        <div class="field-value">${submission.user_name || '未提供'}</div>
      </div>
      
      <div class="field">
        <div class="field-label">郵箱:</div>
        <div class="field-value">${submission.user_email || '未提供'}</div>
      </div>
      
      <div class="field">
        <div class="field-label">関係類型:</div>
        <div class="field-value">${submission.relation_type || '未指定'}</div>
      </div>
      
      <div class="field">
        <div class="field-label">內容:</div>
        <div class="field-value">${submission.content || '無'}</div>
      </div>
      
      ${hasMedia ? `
      <div class="media-preview">
        <div class="field-label">📎 附件:</div>
        <div class="field-value">
          <strong>文件名:</strong> ${submission.media_filename}<br>
          ${isImage ? `
            <img src="${fileUrl}" alt="${submission.media_filename}" 
                 style="max-width: 100%; height: auto; margin-top: 10px; border-radius: 4px;">
          ` : ''}
          <div style="margin-top: 10px;">
            <a href="${fileUrl}" class="media-link" target="_blank">
              ${isImage ? '🖼️ 查看完整圖片' : '📥 下載文件'}
            </a>
          </div>
        </div>
      </div>
      ` : ''}
      
      <a href="https://jjconnect.jp/admin.html#submissions" class="button">前往後台處理</a>
    </div>
    <div class="footer">
      <p>© ${year} JJConnect Support System</p>
      <p>此郵件由系統自動發送，請勿直接回复</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
新的 Joint Mamori 提交

提交時間: ${submittedAt}
提交者姓名: ${submission.user_name || '未提供'}
郵箱: ${submission.user_email || '未提供'}
関係類型: ${submission.relation_type || '未指定'}

內容:
${submission.content || '無'}

${hasMedia ? `
附件: ${submission.media_filename}
文件連結: ${fileUrl}
` : ''}

前往後台處理: https://jjconnect.jp/admin.html#submissions

© ${year} JJConnect Support System
  `;

  return { html, text };
}
