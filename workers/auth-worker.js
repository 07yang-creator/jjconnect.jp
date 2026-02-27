/**
 * JJConnect Web Application Worker
 * Handles web pages, API routes, and Supabase integration
 * 
 * Routes:
 * - GET / - Main web application (React mount point)
 * - GET /api/* - API endpoints
 * - GET /static/* - Static assets (JS, CSS)
 * 
 * API Endpoints:
 * - POST /api/login - User login
 * - GET /api/account/check - Check if account exists (?identifier=email|username)
 * - GET /api/auth/check - Check authentication status
 * - POST /api/auth/logout - User logout
 * - POST /api/register - User registration
 * - GET /api/users - Get user list
 * - POST /api/submit - Submit joint-mamori form
 * - GET /api/submissions - Get submissions list (Admin only)
 * - GET /api/backend/status - Backend connection status (debug)
 * - GET /api/posts - Get posts list
 * - GET /api/categories - Get categories list
 */

// ============================================
// Supabase Integration
// ============================================

/**
 * Initialize Supabase client from environment variables
 * @param {Object} env - Cloudflare Worker environment
 * @returns {Object} Supabase client configuration
 */
function getSupabaseConfig(env) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[WARN] Supabase credentials not configured');
    return null;
  }
  
  console.log('[INFO] Supabase initialized:', supabaseUrl.substring(0, 30) + '...');
  
  return {
    url: supabaseUrl,
    key: supabaseKey,
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  };
}

/**
 * Query Supabase REST API
 * @param {Object} config - Supabase configuration
 * @param {string} table - Table name
 * @param {Object} params - Query parameters
 */
async function querySupabase(config, table, params = {}) {
  if (!config) {
    throw new Error('Supabase not configured');
  }
  
  const url = new URL(`${config.url}/rest/v1/${table}`);
  
  // Add query parameters
  if (params.select) url.searchParams.set('select', params.select);
  if (params.eq) {
    Object.entries(params.eq).forEach(([key, value]) => {
      url.searchParams.set(key, `eq.${value}`);
    });
  }
  if (params.order) url.searchParams.set('order', params.order);
  if (params.limit) url.searchParams.set('limit', params.limit);
  
  const response = await fetch(url.toString(), {
    headers: config.headers
  });
  
  if (!response.ok) {
    throw new Error(`Supabase query failed: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Supabase upsert (insert or update on conflict)
 * @param {Object} config - Supabase configuration
 * @param {string} table - Table name
 * @param {Object} row - Row data to upsert
 */
async function supabaseUpsert(config, table, row) {
  if (!config) throw new Error('Supabase not configured');
  const url = `${config.url}/rest/v1/${table}`;
  const headers = {
    ...config.headers,
    'Prefer': 'resolution=merge-duplicates,return=representation'
  };
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(row)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase upsert failed: ${response.status} - ${errText}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Supabase PATCH (update by filter)
 */
async function supabasePatch(config, table, eq, patch) {
  if (!config) throw new Error('Supabase not configured');
  const url = new URL(`${config.url}/rest/v1/${table}`);
  Object.entries(eq).forEach(([key, value]) => {
    url.searchParams.set(key, `eq.${value}`);
  });
  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: config.headers,
    body: JSON.stringify(patch)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase patch failed: ${response.status} - ${errText}`);
  }
  return response.status === 204 ? null : await response.json();
}

// ============================================
// Configuration
// ============================================

// JWT Secret (生产环境请使用环境变量)
const getJwtSecret = (env) => env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Token expiration time (24 hours)
const TOKEN_EXPIRATION = 24 * 60 * 60 * 1000;

// ============================================
// CORS Configuration
// ============================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // 生产环境改为具体域名，例如: 'https://jjconnect.jp'
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

// ============================================
// Email Configuration
// ============================================

/**
 * Send email using MailChannels API
 * MailChannels is free for Cloudflare Workers
 * @param {object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} params.text - Plain text body
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }]
          }
        ],
        from: {
          email: 'noreply@jjconnect.jp',
          name: 'JJConnect'
        },
        subject: subject,
        content: [
          {
            type: 'text/html',
            value: html
          },
          {
            type: 'text/plain',
            value: text
          }
        ]
      })
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
async function sendWelcomeEmail(userEmail, userName) {
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
      <p>© ${new Date().getFullYear()} JJConnect. All rights reserved.</p>
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

© ${new Date().getFullYear()} JJConnect. All rights reserved.
  `;

  return await sendEmail({
    to: userEmail,
    subject: '欢迎加入 JJConnect!',
    html: html,
    text: text
  });
}

/**
 * Send submission notification to support team
 */
async function sendSubmissionNotification(submission) {
  const fileUrl = submission.media_url || '';
  const hasMedia = !!submission.media_url;
  const isImage = submission.media_filename && /\.(jpg|jpeg|png|gif|webp)$/i.test(submission.media_filename);
  
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
        <div class="field-value">${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</div>
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
      <p>© ${new Date().getFullYear()} JJConnect Support System</p>
      <p>此郵件由系統自動發送，請勿直接回复</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
新的 Joint Mamori 提交

提交時間: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
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

© ${new Date().getFullYear()} JJConnect Support System
  `;

  return await sendEmail({
    to: 'support@jjconnect.jp',
    subject: `新提交 - Joint Mamori Project (${submission.relation_type || '未分類'})`,
    html: html,
    text: text
  });
}

// ============================================
// File Upload & R2 Storage Functions (NEW)
// ============================================

/**
 * Generate unique file key for R2 storage
 * Format: YYYY/MM/DD/timestamp-randomId.ext
 */
function generateFileKey(filename) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  
  // Extract file extension
  const ext = filename.split('.').pop().toLowerCase();
  
  return `${year}/${month}/${day}/${timestamp}-${randomId}.${ext}`;
}

/**
 * Generate avatar file key: avatars/userId/timestamp-random.ext
 */
function generateAvatarKey(userId, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const randomId = Math.random().toString(36).substring(2, 15);
  return `avatars/${userId}/${Date.now()}-${randomId}.${ext}`;
}

const AVATAR_MAX_SIZE = 500 * 1024; // 500KB
const AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validate file type (images and videos only)
 */
function isValidFileType(mimeType) {
  const validTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    // Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/3gpp'
  ];
  
  return validTypes.includes(mimeType.toLowerCase());
}

/**
 * Upload file to R2 storage
 * @param {File} file - The file object from form-data
 * @param {Env} env - Worker environment with MY_BUCKET binding
 * @returns {Promise<object>} - { success, key, filename, size, type }
 */
async function uploadToR2(file, env) {
  try {
    // Validate R2 bucket binding
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket (MY_BUCKET) not configured in wrangler.toml');
    }
    
    // Validate file type
    if (!isValidFileType(file.type)) {
      throw new Error(`不支持的文件类型: ${file.type}。仅支持图片和视频文件。`);
    }
    
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error(`文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB。最大允许 50MB。`);
    }
    
    // Generate unique key
    const key = generateFileKey(file.name);
    
    // Upload to R2
    await env.MY_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type
      },
      customMetadata: {
        originalFilename: file.name,
        uploadedAt: new Date().toISOString()
      }
    });
    
    console.log(`✓ File uploaded to R2: ${key} (${(file.size / 1024).toFixed(2)} KB)`);
    
    return {
      success: true,
      key: key,
      filename: file.name,
      size: file.size,
      type: file.type
    };
    
  } catch (error) {
    console.error('R2 upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get file URL from R2
 * Note: In production, you should configure R2 public access or use signed URLs
 */
function getFileUrl(key, env) {
  // Option 1: Public R2 bucket with custom domain
  // return `https://files.jjconnect.jp/${key}`;
  
  // Option 2: Cloudflare R2 public URL (if bucket is public)
  // return `https://pub-xxxxxxxxxxxx.r2.dev/${key}`;
  
  // For now, return the key (admin can access via Worker endpoint)
  return `/api/files/${key}`;
}

/**
 * Serve file from R2
 * GET /api/files/:key
 */
async function handleGetFile(request, env) {
  try {
    const url = new URL(request.url);
    const key = url.pathname.replace('/api/files/', '');
    
    if (!key) {
      return errorResponse('文件 Key 不能为空', 400);
    }
    
    // Get file from R2
    const object = await env.MY_BUCKET.get(key);
    
    if (!object) {
      return errorResponse('文件不存在', 404);
    }
    
    // Return file with proper headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    return new Response(object.body, {
      headers: headers
    });
    
  } catch (error) {
    console.error('Get file error:', error);
    return errorResponse(`获取文件失败: ${error.message}`, 500);
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create CORS response
 */
function corsResponse(response) {
  const newResponse = new Response(response.body, response);
  Object.keys(CORS_HEADERS).forEach(key => {
    newResponse.headers.set(key, CORS_HEADERS[key]);
  });
  return newResponse;
}

/**
 * Handle CORS preflight request
 */
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

/**
 * Create JSON response
 */
function jsonResponse(data, status = 200) {
  return corsResponse(new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  }));
}

/**
 * Create HTML response
 */
function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=60',
      ...CORS_HEADERS
    }
  });
}

/**
 * Generate main application page with React mount point
 */
function generateMainPage(env) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JJConnect - 日本人社区平台</title>
    <meta name="description" content="JJConnect - 专业的日本人社区平台，分享知识、交流经验、探索可能">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- React & ReactDOM CDN -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    
    <!-- Supabase Client CDN -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    
    <style>
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        #root {
            min-height: 100vh;
        }
        
        .pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: .5;
            }
        }
        
        .slide-in {
            animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
            from {
                transform: translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    </style>
</head>
<body>
    <!-- Backend Status Banner -->
    <div id="backend-status" class="fixed top-0 left-0 right-0 bg-green-600 text-white px-4 py-2 text-center text-sm font-semibold z-50 slide-in">
        <span class="pulse inline-block mr-2">●</span>
        <span>Current Backend: Supabase Connection Active</span>
    </div>
    
    <!-- React Mount Point -->
    <div id="root" class="pt-10"></div>
    
    <!-- Configuration Script -->
    <script>
        // Global configuration
        window.JJCONNECT_CONFIG = {
            supabaseUrl: '${supabaseUrl}',
            supabaseKey: '${supabaseKey}',
            apiEndpoint: '/api',
            version: '1.0.0'
        };
        
        // Initialize Supabase client
        if (window.supabase && window.JJCONNECT_CONFIG.supabaseUrl) {
            window.supabaseClient = window.supabase.createClient(
                window.JJCONNECT_CONFIG.supabaseUrl,
                window.JJCONNECT_CONFIG.supabaseKey
            );
            console.log('[INFO] Supabase client initialized');
            console.log('[DEBUG] 🔌 SUPABASE_URL prefix:', window.JJCONNECT_CONFIG.supabaseUrl.substring(0, 5) + '...');
        }
    </script>
    
    <!-- Main Application Script -->
    <script>
        const { useState, useEffect } = React;
        
        // Main App Component
        function App() {
            const [posts, setPosts] = useState([]);
            const [categories, setCategories] = useState([]);
            const [loading, setLoading] = useState(true);
            const [activeCategory, setActiveCategory] = useState(null);
            
            useEffect(() => {
                loadData();
            }, []);
            
            async function loadData() {
                try {
                    // Load categories
                    const categoriesRes = await fetch('/api/categories');
                    const categoriesData = await categoriesRes.json();
                    if (categoriesData.success) {
                        setCategories(categoriesData.data);
                    }
                    
                    // Load posts
                    const postsRes = await fetch('/api/posts');
                    const postsData = await postsRes.json();
                    if (postsData.success) {
                        setPosts(postsData.data);
                    }
                } catch (error) {
                    console.error('[ERROR] Failed to load data:', error);
                } finally {
                    setLoading(false);
                }
            }
            
            const filteredPosts = activeCategory 
                ? posts.filter(post => post.category_id === activeCategory)
                : posts;
            
            return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
                // Header
                React.createElement('header', { className: 'bg-white shadow-sm' },
                    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-6' },
                        React.createElement('h1', { className: 'text-3xl font-bold text-gray-900' },
                            '🌸 JJConnect 网页模式已启动'
                        ),
                        React.createElement('p', { className: 'mt-2 text-gray-600' },
                            '欢迎来到 JJConnect - 日本人社区平台'
                        )
                    )
                ),
                
                // Main Content
                React.createElement('main', { className: 'max-w-7xl mx-auto px-4 py-8' },
                    React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-4 gap-6' },
                        // Sidebar
                        React.createElement('aside', { className: 'lg:col-span-1' },
                            React.createElement('div', { className: 'bg-white rounded-lg shadow p-6 sticky top-24' },
                                React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, '分类板块'),
                                React.createElement('div', { className: 'space-y-2' },
                                    React.createElement('button', {
                                        className: 'w-full text-left px-3 py-2 rounded hover:bg-blue-50 ' + (!activeCategory ? 'bg-blue-100 text-blue-700' : ''),
                                        onClick: () => setActiveCategory(null)
                                    }, '📋 全部'),
                                    categories.map(cat => 
                                        React.createElement('button', {
                                            key: cat.id,
                                            className: 'w-full text-left px-3 py-2 rounded hover:bg-blue-50 ' + (activeCategory === cat.id ? 'bg-blue-100 text-blue-700' : ''),
                                            onClick: () => setActiveCategory(cat.id)
                                        }, '• ' + cat.name)
                                    )
                                )
                            )
                        ),
                        
                        // Posts List
                        React.createElement('div', { className: 'lg:col-span-3' },
                            loading 
                                ? React.createElement('div', { className: 'text-center py-12' },
                                    React.createElement('div', { className: 'inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent' })
                                  )
                                : React.createElement('div', { className: 'grid gap-6' },
                                    filteredPosts.length === 0
                                        ? React.createElement('div', { className: 'text-center py-12 bg-white rounded-lg shadow' },
                                            React.createElement('p', { className: 'text-gray-500' }, '暂无文章')
                                          )
                                        : filteredPosts.map(post => 
                                            React.createElement('article', {
                                                key: post.id,
                                                className: 'bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6'
                                            },
                                                React.createElement('div', { className: 'flex items-start justify-between' },
                                                    React.createElement('div', { className: 'flex-1' },
                                                        React.createElement('h3', { className: 'text-xl font-semibold text-gray-900 mb-2' }, post.title),
                                                        post.summary && React.createElement('p', { className: 'text-gray-600 mb-4' }, post.summary),
                                                        React.createElement('div', { className: 'flex items-center gap-4 text-sm text-gray-500' },
                                                            post.category && React.createElement('span', { className: 'bg-blue-100 text-blue-800 px-2 py-1 rounded' }, post.category.name),
                                                            post.author && React.createElement('span', {}, '作者: ' + (post.author.display_name || '匿名')),
                                                            React.createElement('span', {}, new Date(post.created_at).toLocaleDateString('zh-CN'))
                                                        )
                                                    ),
                                                    post.is_paid && React.createElement('div', {
                                                        className: 'ml-4 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold'
                                                    }, '💰 付费阅读')
                                                )
                                            )
                                          )
                                  )
                        )
                    )
                ),
                
                // Footer
                React.createElement('footer', { className: 'bg-white border-t mt-12' },
                    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-6 text-center text-gray-600' },
                        React.createElement('p', {}, '© 2026 JJConnect. All rights reserved.')
                    )
                )
            );
        }
        
        // Render app
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
        
        console.log('[INFO] JJConnect App initialized');
    </script>
</body>
</html>`;
}

/**
 * Create error response
 */
function errorResponse(message, status = 400) {
  return jsonResponse({
    success: false,
    error: message
  }, status);
}

/**
 * Password hashing using Web Crypto API (SHA-256)
 * 使用 SHA-256 进行密码哈希（用于本地开发测试）
 * 生产环境建议使用 bcrypt 或 Argon2 (通过 WebAssembly)
 */
async function hashPassword(password, env) {
  try {
    // 使用 Web Crypto API 进行 SHA-256 哈希
    const encoder = new TextEncoder();
    const salt = getJwtSecret(env); // 使用 JWT_SECRET 作为盐值
    const data = encoder.encode(password + salt);
    
    // 生成 SHA-256 哈希
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // 转换为十六进制字符串
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Hash password error:', error);
    throw new Error(`密码哈希失败: ${error.message}`);
  }
}

/**
 * Password verification using SHA-256
 * 验证密码是否匹配
 */
async function verifyPassword(password, hashedPassword, env) {
  try {
    const newHash = await hashPassword(password, env);
    return newHash === hashedPassword;
  } catch (error) {
    console.error('Verify password error:', error);
    return false;
  }
}

/**
 * Simple JWT token creation (基础实现)
 * 生产环境建议使用专业的 JWT 库，例如 `@tsndr/cloudflare-worker-jwt`
 */
function createToken(payload, env) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Date.now();
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRATION
  };
  
  // Base64 encode
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(tokenPayload));
  
  // Create signature (simplified - use Web Crypto API in production)
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${getJwtSecret(env)}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify JWT token (基础实现)
 */
function verifyToken(token, env) {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp < Date.now()) {
      return null;
    }
    
    // Verify signature (simplified)
    const expectedSignature = btoa(`${parts[0]}.${parts[1]}.${getJwtSecret(env)}`);
    if (parts[2] !== expectedSignature) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Extract token from request
 */
function extractToken(request) {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookie (for session-based authentication if implemented)
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const tokenCookie = cookies.find(c => c.startsWith('auth_token='));
    if (tokenCookie) {
      return tokenCookie.substring(11);
    }
  }
  
  return null;
}

/**
 * Find user by username or email from D1 database
 */
async function findUserByUsernameOrEmail(identifier, env) {
  try {
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).bind(identifier, identifier).first();
    return user;
  } catch (dbError) {
    console.error('Database query error (findUserByUsernameOrEmail):', dbError);
    
    // 抛出详细错误，让调用方处理
    if (dbError.message && dbError.message.includes('no such table')) {
      throw new Error(`数据库表 'users' 不存在。请先运行 schema.sql: ${dbError.message}`);
    } else if (dbError.message && dbError.message.includes('no such column')) {
      throw new Error(`数据库字段不存在: ${dbError.message}`);
    } else {
      throw new Error(`数据库查询失败: ${dbError.message}`);
    }
  }
}

// ============================================
// Route Handlers
// ============================================

/**
 * Handle POST /api/login
 * Request body: { username, password }
 * Response: { success, token, user }
 */
async function handleLogin(request, env) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return errorResponse(`请求体解析失败: ${parseError.message}`, 400);
    }
    
    const { username, password } = body;
    
    // Validate input
    if (!username || !password) {
      return errorResponse('用户名和密码不能为空', 400);
    }
    
    // Find user from D1
    let user;
    try {
      user = await findUserByUsernameOrEmail(username, env);
    } catch (dbError) {
      console.error('Database query error (login):', dbError);
      return errorResponse(`数据库查询失败: ${dbError.message}`, 500);
    }
    
    if (!user) {
      return errorResponse('用户名或密码错误', 401);
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash, env);
    
    if (!isValidPassword) {
      return errorResponse('用户名或密码错误', 401);
    }
    
    // Create token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: `${user.firstname} ${user.lastname}`
    };
    
    const token = createToken(tokenPayload, env);
    
    // Return success response
    return jsonResponse({
      success: true,
      message: '登录成功',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: `${user.firstname} ${user.lastname}`
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(`登录失败: ${error.message}`, 500);
  }
}

/**
 * Handle GET /api/auth/check
 * Check if user is authenticated
 * Response: { authenticated, user }
 */
async function handleAuthCheck(request, env) {
  try {
    const token = extractToken(request);
    
    if (!token) {
      return jsonResponse({
        authenticated: false,
        message: '未登录'
      }, 401);
    }
    
    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return jsonResponse({
        authenticated: false,
        message: `Token 验证失败: ${tokenError.message}`
      }, 401);
    }
    
    if (!payload) {
      return jsonResponse({
        authenticated: false,
        message: 'Token 无效或已过期'
      }, 401);
    }
    
    let avatar_url = null;
    const supabase = getSupabaseConfig(env);
    if (supabase) {
      try {
        const rows = await querySupabase(supabase, 'user_profiles', {
          select: 'avatar_url',
          eq: { user_id: String(payload.userId) },
          limit: '1'
        });
        const p = Array.isArray(rows) ? rows[0] : rows;
        if (p && p.avatar_url) avatar_url = p.avatar_url;
      } catch (e) { /* ignore */ }
    }
    
    return jsonResponse({
      authenticated: true,
      user: {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
        avatar_url: avatar_url,
        role: payload.role,
        name: payload.name
      }
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return errorResponse(`认证检查失败: ${error.message}`, 500);
  }
}

/**
 * Handle POST /api/auth/logout
 * Logout user
 * Response: { success, message }
 */
async function handleLogout() {
  // 对于无状态 JWT，前端删除 token 即可
  // 如果使用 session，这里需要清除 session
  return jsonResponse({
    success: true,
    message: '登出成功'
  });
}

/**
 * Handle GET /api/account/check
 * Check if account exists (for Google-style sign-in flow)
 * Query: ?identifier=email_or_username
 * Response: { exists: boolean }
 */
async function handleAccountCheck(request, env) {
  try {
    const url = new URL(request.url);
    const identifier = url.searchParams.get('identifier');
    if (!identifier || identifier.trim() === '') {
      return errorResponse('identifier is required', 400);
    }
    const user = await findUserByUsernameOrEmail(identifier.trim(), env);
    return jsonResponse({ exists: !!user });
  } catch (dbError) {
    console.error('Account check error:', dbError);
    return errorResponse(`Account check failed: ${dbError.message}`, 500);
  }
}

/**
 * Handle POST /api/register
 * Register new user
 * Request body: { firstname, lastname, username, email, password, role }
 * Response: { success, token, user }
 */
async function handleRegister(request, env) {
  // 整个函数包裹在 try-catch 中，确保任何错误都能被捕获
  try {
    // ============================================
    // 1. 解析请求体
    // ============================================
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('请求体解析失败:', parseError);
      return errorResponse(`请求体解析失败: ${parseError.message}`, 400);
    }
    
    // ============================================
    // 2. 提取字段并设置默认值（确保所有必填字段都有值）
    // ============================================
    const {
      firstname = '',
      lastname = '',
      username = '',
      email = '',
      password = '',
      role = 0
    } = body;
    
    // ============================================
    // 3. 验证必填字段
    // ============================================
    if (!username || username.trim() === '') {
      return errorResponse('用户名不能为空', 400);
    }
    
    if (!email || email.trim() === '') {
      return errorResponse('邮箱不能为空', 400);
    }
    
    if (!password || password.trim() === '') {
      return errorResponse('密码不能为空', 400);
    }
    
    if (!firstname || firstname.trim() === '') {
      return errorResponse('名字不能为空', 400);
    }
    
    if (!lastname || lastname.trim() === '') {
      return errorResponse('姓氏不能为空', 400);
    }
    
    // ============================================
    // 4. 验证字段格式
    // ============================================
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return errorResponse('用户名必须是 3-20 个字符，只能包含字母、数字和下划线', 400);
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('邮箱格式不正确', 400);
    }
    
    if (password.length < 8) {
      return errorResponse('密码长度至少需要 8 个字符', 400);
    }
    
    // ============================================
    // 5. 检查数据库绑定是否存在
    // ============================================
    if (!env.DB) {
      const errorMsg = '数据库绑定 (env.DB) 不存在。请检查 wrangler.toml 中的 [[d1_databases]] 配置，确保 binding = "DB"';
      console.error(errorMsg);
      return errorResponse(errorMsg, 500);
    }
    
    // ============================================
    // 6. 检查用户名是否已存在
    // ============================================
    let existingUserByUsername;
    try {
      existingUserByUsername = await env.DB.prepare(
        'SELECT id FROM users WHERE username = ?'
      ).bind(username).first();
    } catch (dbError) {
      console.error('Database query error (check username):', dbError);
      console.error('Error details:', JSON.stringify(dbError, null, 2));
      return errorResponse(`数据库查询失败 (检查用户名): ${dbError.message || dbError.toString()}`, 500);
    }
    
    if (existingUserByUsername) {
      return errorResponse('用户名已被使用', 409);
    }
    
    // ============================================
    // 7. 检查邮箱是否已存在
    // ============================================
    let existingUserByEmail;
    try {
      existingUserByEmail = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email).first();
    } catch (dbError) {
      console.error('Database query error (check email):', dbError);
      console.error('Error details:', JSON.stringify(dbError, null, 2));
      return errorResponse(`数据库查询失败 (检查邮箱): ${dbError.message || dbError.toString()}`, 500);
    }
    
    if (existingUserByEmail) {
      return errorResponse('邮箱已被注册', 409);
    }
    
    // ============================================
    // 8. 验证权限等级
    // ============================================
    const userRole = parseInt(role) || 0;
    if (userRole > 1) { 
      return errorResponse('无法注册管理员账号，管理员账号只能由现有管理员创建', 403);
    }
    
    // ============================================
    // 9. 密码哈希处理 (使用 SHA-256)
    // ============================================
    let password_hash;
    try {
      password_hash = await hashPassword(password, env);
      console.log('Password hashed successfully (SHA-256)');
    } catch (hashError) {
      console.error('Password hash error:', hashError);
      return errorResponse(`密码哈希失败: ${hashError.message || hashError.toString()}`, 500);
    }
    
    // ============================================
    // 10. 插入新用户到 D1 数据库
    // ============================================
    // 确保所有字段都符合 schema.sql 中的定义：
    // username TEXT UNIQUE NOT NULL
    // email TEXT UNIQUE NOT NULL
    // password_hash TEXT NOT NULL
    // firstname TEXT NOT NULL
    // lastname TEXT NOT NULL
    // role INTEGER DEFAULT 0
    // email_verified BOOLEAN DEFAULT 0
    
    let insertResult;
    try {
      console.log('Attempting to insert user:', { 
        username: username.trim(), 
        email: email.trim(), 
        firstname: firstname.trim(), 
        lastname: lastname.trim(), 
        role: userRole 
      });
      
      insertResult = await env.DB.prepare(
        'INSERT INTO users (username, email, password_hash, firstname, lastname, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        username.trim(),
        email.trim(),
        password_hash,
        firstname.trim(),
        lastname.trim(),
        userRole,
        0  // email_verified = false
      ).run();
      
      console.log('Insert result:', JSON.stringify(insertResult, null, 2));
      
    } catch (dbError) {
      // 详细的错误信息，帮助诊断问题
      console.error('=== DATABASE INSERT ERROR ===');
      console.error('Error message:', dbError.message);
      console.error('Error stack:', dbError.stack);
      console.error('Error object:', JSON.stringify(dbError, null, 2));
      console.error('Attempted to insert:', {
        username: username.trim(),
        email: email.trim(),
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        role: userRole,
        email_verified: 0
      });
      console.error('=============================');
      
      // 检查具体的数据库错误类型
      if (dbError.message && dbError.message.includes('no such table')) {
        return errorResponse(`数据库表不存在: ${dbError.message}。请先运行命令创建表: npx wrangler d1 execute jjconnect-db --local --file=schema.sql`, 500);
      } else if (dbError.message && dbError.message.includes('UNIQUE constraint')) {
        return errorResponse(`唯一性约束冲突: ${dbError.message}`, 409);
      } else if (dbError.message && dbError.message.includes('no such column')) {
        return errorResponse(`数据库字段不存在: ${dbError.message}。请检查 schema.sql 是否正确执行`, 500);
      } else if (dbError.message && dbError.message.includes('NOT NULL constraint')) {
        return errorResponse(`字段不能为空: ${dbError.message}。请检查所有必填字段是否都有值`, 400);
      } else {
        return errorResponse(`数据库插入失败: ${dbError.message || dbError.toString()}`, 500);
      }
    }
    
    // ============================================
    // 11. 检查插入结果
    // ============================================
    if (!insertResult || !insertResult.success) {
      const errorMsg = insertResult?.error || 'insertResult.success = false';
      console.error('Insert operation failed:', errorMsg);
      console.error('Insert result object:', JSON.stringify(insertResult, null, 2));
      return errorResponse(`用户插入失败: ${errorMsg}`, 500);
    }
    
    // ============================================
    // 12. 获取新创建的用户信息
    // ============================================
    let newUser;
    try {
      newUser = await env.DB.prepare(
        'SELECT * FROM users WHERE username = ?'
      ).bind(username).first();
    } catch (dbError) {
      console.error('Database query error (retrieve new user):', dbError);
      return errorResponse(`数据库查询失败 (获取新用户): ${dbError.message || dbError.toString()}`, 500);
    }
    
    if (!newUser) {
      console.error('Failed to retrieve new user after successful insert');
      return errorResponse('注册成功但无法获取用户信息，请尝试登录', 500);
    }
    
    console.log('✅ New user registered successfully:', {
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      id: newUser.id
    });
    
    // ============================================
    // 13. 发送欢迎邮件 (Send Welcome Email)
    // ============================================
    try {
      console.log('Sending welcome email to:', newUser.email);
      const emailResult = await sendWelcomeEmail(
        newUser.email, 
        `${newUser.firstname} ${newUser.lastname}`
      );
      
      if (emailResult.success) {
        console.log('✓ Welcome email sent successfully');
      } else {
        console.error('⚠️ Failed to send welcome email:', emailResult.error);
        // 邮件发送失败不影响注册流程,仅记录错误
      }
    } catch (emailError) {
      console.error('⚠️ Welcome email error:', emailError);
      // 邮件错误不应阻止注册成功响应
    }
    
    // ============================================
    // 14. 创建 JWT Token (自动登录)
    // ============================================
    const tokenPayload = {
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      name: `${newUser.firstname} ${newUser.lastname}`
    };
    
    const token = createToken(tokenPayload, env);
    
    // ============================================
    // 15. 返回成功响应 (JSON 格式)
    // ============================================
    return jsonResponse({
      success: true,
      message: '注册成功',
      token: token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        name: `${newUser.firstname} ${newUser.lastname}`
      }
    }, 201);
    
  } catch (error) {
    // 捕获所有未预期的错误
    console.error('=== UNEXPECTED REGISTRATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error object:', JSON.stringify(error, null, 2));
    console.error('====================================');
    return errorResponse(`注册失败 (未预期的错误): ${error.message || error.toString()}`, 500);
  }
}

/**
 * Handle GET /api/users (示例 - 需要认证)
 * Get user list (requires authentication)
 */
async function handleGetUsers(request, env) {
  try {
    const token = extractToken(request);
    
    if (!token) {
      return errorResponse('需要登录', 401);
    }
    
    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return errorResponse(`Token 验证失败: ${tokenError.message}`, 401);
    }
    
    if (!payload) {
      return errorResponse('Token 无效或已过期', 401);
    }
    
    // Check permission (only admin can view users)
    if (payload.role < 2) {
      return errorResponse('权限不足', 403);
    }
    
    // Fetch user list from D1 (without password hashes)
    let results;
    try {
      const queryResult = await env.DB.prepare(
        'SELECT id, username, email, firstname, lastname, role, email_verified, created_at FROM users'
      ).all();
      results = queryResult.results;
    } catch (dbError) {
      console.error('Database query error (get users):', dbError);
      
      if (dbError.message && dbError.message.includes('no such table')) {
        return errorResponse(`数据库表不存在: ${dbError.message}。请先运行 schema.sql 创建 users 表`, 500);
      } else {
        return errorResponse(`数据库查询失败: ${dbError.message}`, 500);
      }
    }
    
    return jsonResponse({
      success: true,
      users: results.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        name: `${u.firstname} ${u.lastname}`,
        email_verified: u.email_verified,
        created_at: u.created_at
      }))
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(`获取用户列表失败: ${error.message}`, 500);
  }
}

/**
 * Handle GET /api/profile - Own profile (full, requires auth)
 * Handle GET /api/profile/:userId - Public profile (limited: username, avatar_url, contribution_value)
 */
async function handleGetProfile(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const isPublic = pathParts[2] && pathParts[2] !== 'own';
  const targetUserId = isPublic ? pathParts[2] : null;

  if (isPublic && targetUserId) {
    // Public profile: return only username, avatar_url, contribution_value
    const supabase = getSupabaseConfig(env);
    if (!supabase) {
      return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);
    }
    try {
      const rows = await querySupabase(supabase, 'user_profiles', {
        select: 'username,avatar_url,contribution_value,registered_date',
        eq: { user_id: targetUserId },
        limit: '1'
      });
      const profile = Array.isArray(rows) ? rows[0] : rows;
      if (!profile) {
        return jsonResponse({ success: false, error: 'Profile not found' }, 404);
      }
      return jsonResponse({
        success: true,
        profile: {
          username: profile.username,
          avatar_url: profile.avatar_url || null,
          contribution_value: profile.contribution_value || '0',
          registered_date: profile.registered_date
        },
        public: true
      });
    } catch (err) {
      console.error('Get public profile error:', err);
      return jsonResponse({ success: false, error: err.message }, 500);
    }
  }

  // Own profile: requires auth, returns full data
  const token = extractToken(request);
  if (!token) {
    return errorResponse('需要登录', 401);
  }
  let payload;
  try {
    payload = verifyToken(token, env);
  } catch (tokenError) {
    return errorResponse('Token 验证失败', 401);
  }
  if (!payload) {
    return errorResponse('Token 无效或已过期', 401);
  }

  const userId = String(payload.userId);
  const supabase = getSupabaseConfig(env);
  if (!supabase) {
    return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);
  }

  try {
    const rows = await querySupabase(supabase, 'user_profiles', {
      select: '*',
      eq: { user_id: userId },
      limit: '1'
    });
    let profile = Array.isArray(rows) ? rows[0] : rows;

    if (!profile) {
      // Create default profile from JWT user data
      const d1User = await env.DB.prepare(
        'SELECT id, username, email, firstname, lastname, role, created_at FROM users WHERE id = ?'
      ).bind(payload.userId).first();

      const now = new Date().toISOString();
      const defaultProfile = {
        user_id: userId,
        username: payload.username || (d1User ? d1User.username : ''),
        avatar_url: null,
        registered_date: d1User?.created_at || now,
        self_description: null,
        email: payload.email || (d1User ? d1User.email : ''),
        telephone: null,
        company_name: null,
        address: null,
        mail_code: null,
        user_category: payload.role ?? 1,
        contribution_value: '0',
        personal_remarks: null,
        created_at: now,
        updated_at: now
      };
      try {
        profile = await supabaseUpsert(supabase, 'user_profiles', defaultProfile);
      } catch (upsertErr) {
        console.error('Profile upsert error:', upsertErr);
        return jsonResponse({ success: false, error: upsertErr.message }, 500);
      }
    }

    return jsonResponse({
      success: true,
      profile: {
        user_id: profile.user_id,
        username: profile.username,
        avatar_url: profile.avatar_url || null,
        registered_date: profile.registered_date,
        self_description: profile.self_description || '',
        email: profile.email || '',
        telephone: profile.telephone || '',
        company_name: profile.company_name || '',
        address: profile.address || '',
        mail_code: profile.mail_code || '',
        user_category: profile.user_category ?? 1,
        contribution_value: profile.contribution_value || '0',
        personal_remarks: profile.personal_remarks || ''
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

/**
 * Handle PUT /api/profile - Update own profile (requires auth)
 */
async function handlePutProfile(request, env) {
  const token = extractToken(request);
  if (!token) {
    return errorResponse('需要登录', 401);
  }
  let payload;
  try {
    payload = verifyToken(token, env);
  } catch (tokenError) {
    return errorResponse('Token 验证失败', 401);
  }
  if (!payload) {
    return errorResponse('Token 无效或已过期', 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('请求体无效', 400);
  }

  const userId = String(payload.userId);
  const allowed = [
    'username', 'avatar_url', 'self_description', 'email', 'telephone',
    'company_name', 'address', 'mail_code', 'user_category',
    'contribution_value', 'personal_remarks'
  ];
  const patch = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      patch[key] = body[key];
    }
  }

  if (Object.keys(patch).length === 0) {
    return errorResponse('没有可更新的字段', 400);
  }

  const supabase = getSupabaseConfig(env);
  if (!supabase) {
    return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);
  }

  try {
    const rows = await querySupabase(supabase, 'user_profiles', {
      select: 'user_id',
      eq: { user_id: userId },
      limit: '1'
    });
    const exists = Array.isArray(rows) ? rows[0] : rows;

    if (!exists) {
      const now = new Date().toISOString();
      const d1User = await env.DB.prepare(
        'SELECT username, email, role, created_at FROM users WHERE id = ?'
      ).bind(payload.userId).first();
      const fullRow = {
        user_id: userId,
        username: patch.username ?? payload.username ?? (d1User?.username || ''),
        avatar_url: patch.avatar_url ?? null,
        registered_date: d1User?.created_at || now,
        self_description: patch.self_description ?? null,
        email: patch.email ?? payload.email ?? (d1User?.email || ''),
        telephone: patch.telephone ?? null,
        company_name: patch.company_name ?? null,
        address: patch.address ?? null,
        mail_code: patch.mail_code ?? null,
        user_category: patch.user_category ?? d1User?.role ?? 1,
        contribution_value: patch.contribution_value ?? '0',
        personal_remarks: patch.personal_remarks ?? null,
        created_at: now,
        updated_at: now
      };
      await supabaseUpsert(supabase, 'user_profiles', fullRow);
    } else {
      patch.updated_at = new Date().toISOString();
      await supabasePatch(supabase, 'user_profiles', { user_id: userId }, patch);
    }

    const updated = await querySupabase(supabase, 'user_profiles', {
      select: '*',
      eq: { user_id: userId },
      limit: '1'
    });
    const profile = Array.isArray(updated) ? updated[0] : updated;

    return jsonResponse({
      success: true,
      profile: {
        user_id: profile.user_id,
        username: profile.username,
        avatar_url: profile.avatar_url || null,
        registered_date: profile.registered_date,
        self_description: profile.self_description || '',
        email: profile.email || '',
        telephone: profile.telephone || '',
        company_name: profile.company_name || '',
        address: profile.address || '',
        mail_code: profile.mail_code || '',
        user_category: profile.user_category ?? 1,
        contribution_value: profile.contribution_value || '0',
        personal_remarks: profile.personal_remarks || ''
      }
    });
  } catch (err) {
    console.error('Put profile error:', err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

/**
 * Handle POST /api/avatar/upload
 * Upload avatar image (auth required, max 500KB, images only)
 * Response: { success, avatar_url }
 */
async function handleAvatarUpload(request, env) {
  try {
    const token = extractToken(request);
    if (!token) return errorResponse('需要登录', 401);
    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (e) {
      return errorResponse('Token 验证失败', 401);
    }
    if (!payload) return errorResponse('Token 无效或已过期', 401);
    
    const formData = await request.formData();
    const file = formData.get('avatar');
    if (!file || !(file instanceof File))
      return errorResponse('请选择图片文件 (avatar 字段)', 400);
    
    if (!AVATAR_TYPES.includes(file.type?.toLowerCase()))
      return errorResponse('仅支持 JPEG, PNG, GIF, WebP', 400);
    if (file.size > AVATAR_MAX_SIZE)
      return errorResponse('图片过大，最大 500KB', 400);
    
    if (!env.MY_BUCKET)
      return errorResponse('文件存储未配置', 500);
    
    const key = generateAvatarKey(String(payload.userId), file.name);
    await env.MY_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalFilename: file.name, uploadedAt: new Date().toISOString() }
    });
    
    const avatarUrl = '/api/files/' + key;
    
    const supabase = getSupabaseConfig(env);
    if (supabase) {
      const rows = await querySupabase(supabase, 'user_profiles', { select: 'user_id', eq: { user_id: String(payload.userId) }, limit: '1' });
      const exists = Array.isArray(rows) ? rows[0] : rows;
      if (exists) {
        await supabasePatch(supabase, 'user_profiles', { user_id: String(payload.userId) }, { avatar_url: avatarUrl, updated_at: new Date().toISOString() });
      } else {
        const now = new Date().toISOString();
        const d1User = await env.DB.prepare('SELECT username, email, role, created_at FROM users WHERE id = ?').bind(payload.userId).first();
        await supabaseUpsert(supabase, 'user_profiles', {
          user_id: String(payload.userId), username: payload.username ?? d1User?.username ?? '', avatar_url: avatarUrl,
          registered_date: d1User?.created_at || now, email: payload.email ?? d1User?.email ?? '',
          user_category: d1User?.role ?? 1, contribution_value: '0',
          created_at: now, updated_at: now
        });
      }
    }
    
    return jsonResponse({ success: true, avatar_url: avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

/**
 * Handle POST /api/submit
 * Submit joint-mamori form with file upload
 * Content-Type: multipart/form-data
 * Form fields: name, email, relation_type, content, media (file)
 * Response: { success, message, submission_id }
 */
async function handleSubmit(request, env) {
  try {
    // ============================================
    // 1. 解析 multipart/form-data
    // ============================================
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      return errorResponse(`请求体解析失败: ${parseError.message}`, 400);
    }
    
    // 提取表单字段
    const name = formData.get('name')?.toString().trim() || '';
    const email = formData.get('email')?.toString().trim() || '';
    const relation_type = formData.get('relation_type')?.toString().trim() || '';
    const content = formData.get('content')?.toString().trim() || '';
    const mediaFile = formData.get('media'); // File object
    
    // ============================================
    // 2. 验证必填字段
    // ============================================
    if (!name || name === '') {
      return errorResponse('姓名不能为空', 400);
    }
    
    if (!email || email === '') {
      return errorResponse('邮箱不能为空', 400);
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('邮箱格式不正确', 400);
    }
    
    // ============================================
    // 3. 处理文件上传到 R2
    // ============================================
    let mediaKey = null;
    let mediaFilename = null;
    let mediaSize = null;
    let mediaType = null;
    
    if (mediaFile && mediaFile instanceof File) {
      console.log('Processing file upload:', {
        name: mediaFile.name,
        size: mediaFile.size,
        type: mediaFile.type
      });
      
      const uploadResult = await uploadToR2(mediaFile, env);
      
      if (!uploadResult.success) {
        return errorResponse(`文件上传失败: ${uploadResult.error}`, 400);
      }
      
      mediaKey = uploadResult.key;
      mediaFilename = uploadResult.filename;
      mediaSize = uploadResult.size;
      mediaType = uploadResult.type;
      
      console.log('✓ File uploaded successfully:', mediaKey);
    }
    
    // ============================================
    // 4. 检查用户登录状态 (可选)
    // ============================================
    const token = extractToken(request);
    let userId = null;
    
    if (token) {
      try {
        const payload = verifyToken(token, env);
        if (payload && payload.userId) {
          userId = payload.userId;
          console.log('Submission from logged-in user:', userId);
        }
      } catch (tokenError) {
        // Token 验证失败不影响提交,匿名提交
        console.log('Anonymous submission (token verification failed)');
      }
    }
    
    // ============================================
    // 5. 检查数据库绑定
    // ============================================
    if (!env.DB) {
      const errorMsg = '数据库绑定 (env.DB) 不存在';
      console.error(errorMsg);
      return errorResponse(errorMsg, 500);
    }
    
    // ============================================
    // 6. 插入提交记录到数据库
    // ============================================
    let insertResult;
    try {
      console.log('Inserting submission:', {
        user_id: userId,
        user_name: name,
        user_email: email,
        relation_type: relation_type,
        content_length: content.length,
        media_key: mediaKey
      });
      
      insertResult = await env.DB.prepare(
        `INSERT INTO submissions 
         (user_id, user_name, user_email, relation_type, content, 
          media_key, media_filename, media_size, media_type, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        userId,
        name,
        email,
        relation_type || null,
        content || null,
        mediaKey,
        mediaFilename,
        mediaSize,
        mediaType,
        'pending'
      ).run();
      
      console.log('Insert result:', insertResult);
      
    } catch (dbError) {
      console.error('=== DATABASE INSERT ERROR ===');
      console.error('Error message:', dbError.message);
      console.error('Error stack:', dbError.stack);
      console.error('=============================');
      
      if (dbError.message && dbError.message.includes('no such table')) {
        return errorResponse(`数据库表不存在: ${dbError.message}。请先运行 schema.sql 创建 submissions 表`, 500);
      } else if (dbError.message && dbError.message.includes('no such column')) {
        return errorResponse(`数据库字段不存在: ${dbError.message}。请确认 schema.sql 已更新`, 500);
      } else {
        return errorResponse(`数据库插入失败: ${dbError.message}`, 500);
      }
    }
    
    if (!insertResult || !insertResult.success) {
      const errorMsg = insertResult?.error || 'insertResult.success = false';
      console.error('Insert operation failed:', errorMsg);
      return errorResponse(`提交失败: ${errorMsg}`, 500);
    }
    
    const submissionId = insertResult.meta.last_row_id;
    console.log('✓ Submission saved with ID:', submissionId);
    
    // ============================================
    // 7. 发送邮件通知到 support@jjconnect.jp
    // ============================================
    try {
      console.log('Sending submission notification email...');
      
      const emailResult = await sendSubmissionNotification({
        user_name: name,
        user_email: email,
        relation_type: relation_type,
        content: content,
        media_url: mediaKey ? getFileUrl(mediaKey, env) : null,
        media_filename: mediaFilename
      });
      
      if (emailResult.success) {
        console.log('✓ Notification email sent to support@jjconnect.jp');
      } else {
        console.error('⚠️ Failed to send notification email:', emailResult.error);
        // 邮件发送失败不影响提交成功响应
      }
    } catch (emailError) {
      console.error('⚠️ Email notification error:', emailError);
      // 邮件错误不应阻止提交成功响应
    }
    
    // ============================================
    // 8. 返回成功响应
    // ============================================
    return jsonResponse({
      success: true,
      message: '提交成功!已发送至 support@jjconnect.jp 并存入后台',
      submission_id: submissionId,
      media_uploaded: !!mediaKey
    }, 201);
    
  } catch (error) {
    console.error('=== SUBMISSION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================');
    return errorResponse(`提交失败: ${error.message}`, 500);
  }
}

/**
 * Handle GET /api/submissions
 * Get submissions list (Admin only)
 * Query params: ?status=pending&limit=50
 * Response: { success, submissions: [...] }
 */
async function handleGetSubmissions(request, env) {
  try {
    const token = extractToken(request);
    
    if (!token) {
      return errorResponse('需要登录', 401);
    }
    
    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return errorResponse(`Token 验证失败: ${tokenError.message}`, 401);
    }
    
    if (!payload) {
      return errorResponse('Token 无效或已过期', 401);
    }
    
    // Check permission (only admin can view submissions)
    if (payload.role < 2) {
      return errorResponse('权限不足:只有管理员可以查看提交记录', 403);
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || null;
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    
    // Build query
    let query = 'SELECT * FROM submissions';
    let params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    // Fetch submissions from D1
    let results;
    try {
      const queryResult = await env.DB.prepare(query).bind(...params).all();
      results = queryResult.results;
    } catch (dbError) {
      console.error('Database query error (get submissions):', dbError);
      
      if (dbError.message && dbError.message.includes('no such table')) {
        return errorResponse(`数据库表不存在: ${dbError.message}。请先运行 schema.sql 创建 submissions 表`, 500);
      } else {
        return errorResponse(`数据库查询失败: ${dbError.message}`, 500);
      }
    }
    
    return jsonResponse({
      success: true,
      submissions: results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Get submissions error:', error);
    return errorResponse(`获取提交记录失败: ${error.message}`, 500);
  }
}

/**
 * Handle PATCH /api/submissions/:id
 * Update submission status (Admin only)
 * Request body: { status: 'pending'|'reviewed'|'resolved'|'archived', notes: string }
 * Response: { success, message }
 */
async function handleUpdateSubmission(request, env) {
  try {
    // Extract submission ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const submissionId = pathParts[pathParts.length - 1];
    
    if (!submissionId || isNaN(parseInt(submissionId))) {
      return errorResponse('无效的提交 ID', 400);
    }
    
    // Check authentication
    const token = extractToken(request);
    
    if (!token) {
      return errorResponse('需要登录', 401);
    }
    
    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return errorResponse(`Token 验证失败: ${tokenError.message}`, 401);
    }
    
    if (!payload) {
      return errorResponse('Token 无效或已过期', 401);
    }
    
    // Check permission (only admin can update submissions)
    if (payload.role < 2) {
      return errorResponse('权限不足:只有管理员可以更新提交状态', 403);
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return errorResponse(`请求体解析失败: ${parseError.message}`, 400);
    }
    
    const { status, notes } = body;
    
    // Validate status
    const validStatuses = ['pending', 'reviewed', 'resolved', 'archived'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(`无效的状态值。允许的值: ${validStatuses.join(', ')}`, 400);
    }
    
    // Build update query
    let updateFields = [];
    let params = [];
    
    if (status) {
      updateFields.push('status = ?');
      params.push(status);
      
      if (status === 'reviewed' || status === 'resolved') {
        updateFields.push('reviewed_at = ?');
        params.push(new Date().toISOString());
        
        updateFields.push('reviewed_by = ?');
        params.push(payload.userId);
      }
    }
    
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      params.push(notes);
    }
    
    if (updateFields.length === 0) {
      return errorResponse('没有提供要更新的字段', 400);
    }
    
    params.push(submissionId);
    
    const updateQuery = `UPDATE submissions SET ${updateFields.join(', ')} WHERE id = ?`;
    
    // Execute update
    let updateResult;
    try {
      updateResult = await env.DB.prepare(updateQuery).bind(...params).run();
    } catch (dbError) {
      console.error('Database update error:', dbError);
      return errorResponse(`数据库更新失败: ${dbError.message}`, 500);
    }
    
    if (!updateResult || !updateResult.success) {
      return errorResponse('更新失败', 500);
    }
    
    // Check if any rows were affected
    if (updateResult.meta.changes === 0) {
      return errorResponse('提交记录不存在', 404);
    }
    
    console.log(`✓ Submission ${submissionId} updated by user ${payload.userId}`);
    
    return jsonResponse({
      success: true,
      message: '提交状态已更新',
      submission_id: parseInt(submissionId),
      updated_by: payload.userId
    });
    
  } catch (error) {
    console.error('Update submission error:', error);
    return errorResponse(`更新提交失败: ${error.message}`, 500);
  }
}

// ============================================
// Main Request Handler
// ============================================

/**
 * Main fetch handler
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} ctx
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 🔍 Debug: Log environment variables (first 5 chars only for security)
    const supabaseUrlPrefix = env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 5) : 'NOT_SET';
    const supabaseKeyPrefix = env.SUPABASE_ANON_KEY ? env.SUPABASE_ANON_KEY.substring(0, 5) : 'NOT_SET';
    
    console.log(`[DEBUG] 🚀 ${method} ${path}`);
    console.log(`[DEBUG] 🔌 SUPABASE_URL prefix: ${supabaseUrlPrefix}...`);
    console.log(`[DEBUG] 🔑 SUPABASE_ANON_KEY prefix: ${supabaseKeyPrefix}...`);
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return handleOptions();
    }
    
    // ============================================
    // Web Page Routes
    // ============================================
    
    // GET / - Main web application (React mount point)
    if (path === '/' && method === 'GET') {
      return htmlResponse(generateMainPage(env));
    }
    
    // GET /app - Alternative route for main app
    if (path === '/app' && method === 'GET') {
      return htmlResponse(generateMainPage(env));
    }
    
    // ============================================
    // API Routes
    // ============================================
    
    // Route handling
    try {
      // GET /api/backend/status - Backend connection status
      if (path === '/api/backend/status' && method === 'GET') {
        const statusData = {
          status: 'active',
          backend: 'Supabase',
          connection: env.SUPABASE_URL && env.SUPABASE_ANON_KEY ? 'Active' : 'Inactive',
          supabaseUrlPrefix: supabaseUrlPrefix,
          supabaseKeyPrefix: supabaseKeyPrefix,
          timestamp: new Date().toISOString()
        };
        
        return jsonResponse({
          success: true,
          message: 'Current Backend: Supabase Connection Active',
          data: statusData
        });
      }
      
      // GET /api/posts - Get posts list
      if (path === '/api/posts' && method === 'GET') {
        const supabase = getSupabaseConfig(env);
        if (!supabase) {
          return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);
        }
        
        try {
          const posts = await querySupabase(supabase, 'posts', {
            select: '*,author:profiles(display_name,avatar_url),category:categories(name,slug)',
            eq: { status: 'published' },
            order: 'created_at.desc',
            limit: '20'
          });
          
          return jsonResponse({ success: true, data: posts });
        } catch (error) {
          return jsonResponse({ success: false, error: error.message }, 500);
        }
      }
      
      // GET /api/categories - Get categories list
      if (path === '/api/categories' && method === 'GET') {
        const supabase = getSupabaseConfig(env);
        if (!supabase) {
          return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);
        }
        
        try {
          const categories = await querySupabase(supabase, 'categories', {
            select: '*',
            order: 'name.asc'
          });
          
          return jsonResponse({ success: true, data: categories });
        } catch (error) {
          return jsonResponse({ success: false, error: error.message }, 500);
        }
      }
      
      // GET /api/account/check - Check if account exists (Google-style flow)
      if (path === '/api/account/check' && method === 'GET') {
        return await handleAccountCheck(request, env);
      }
      
      // POST /api/login
      if (path === '/api/login' && method === 'POST') {
        return await handleLogin(request, env);
      }
      
      // POST /api/register
      if (path === '/api/register' && method === 'POST') {
        return await handleRegister(request, env);
      }
      
      // GET /api/auth/check
      if (path === '/api/auth/check' && method === 'GET') {
        return await handleAuthCheck(request, env);
      }
      
      // POST /api/auth/logout
      if (path === '/api/auth/logout' && method === 'POST') {
        return await handleLogout(request);
      }
      
      // GET /api/users (示例)
      if (path === '/api/users' && method === 'GET') {
        return await handleGetUsers(request, env);
      }
      
      // GET /api/profile (own, full) or GET /api/profile/:userId (public, limited)
      if (path.startsWith('/api/profile') && method === 'GET') {
        return await handleGetProfile(request, env);
      }
      
      // PUT /api/profile (update own profile)
      if (path === '/api/profile' && method === 'PUT') {
        return await handlePutProfile(request, env);
      }
      
      // POST /api/avatar/upload (avatar image, max 500KB)
      if (path === '/api/avatar/upload' && method === 'POST') {
        return await handleAvatarUpload(request, env);
      }
      
      // POST /api/submit (Joint Mamori Submission)
      if (path === '/api/submit' && method === 'POST') {
        return await handleSubmit(request, env);
      }
      
      // GET /api/submissions (Admin only)
      if (path === '/api/submissions' && method === 'GET') {
        return await handleGetSubmissions(request, env);
      }
      
      // PATCH /api/submissions/:id (Admin only - Update status)
      if (path.startsWith('/api/submissions/') && method === 'PATCH') {
        return await handleUpdateSubmission(request, env);
      }
      
      // GET /api/files/:key (Serve file from R2)
      if (path.startsWith('/api/files/') && method === 'GET') {
        return await handleGetFile(request, env);
      }
      
      // Health check
      if (path === '/api/health' && method === 'GET') {
        return jsonResponse({
          status: 'ok',
          timestamp: new Date().toISOString()
        });
      }
      
      // 404 Not Found
      return errorResponse('API 端点不存在', 404);
      
    } catch (error) {
      console.error('Request handler error:', error);
      return errorResponse('服务器内部错误', 500);
    }
  }
};
