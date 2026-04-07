/**
 * Request router for JJConnect Worker
 */

import {
  handleOptions,
  htmlResponse,
  errorResponse,
} from './lib/http.js';
import { generateMainPage } from './lib/pages.js';
import { handleGetFile } from './lib/storage.js';
import {
  handleBackendStatus,
  handleGetPosts,
  handleGetCategories,
  handleHealth,
} from './handlers/content.js';
import {
  handleAccountCheck,
} from './handlers/auth.js';
import {
  handleGetUsers,
  handleGetProfile,
  handlePutProfile,
  handleAvatarUpload,
} from './handlers/users.js';
import {
  handleSubmit,
  handleGetSubmissions,
  handleUpdateSubmission,
} from './handlers/submissions.js';
import {
  handleSyncRoleMatrix,
  handleSyncRoleAssignments,
  handleSyncAuthAll,
  handlePreviewRoleMatrixSync,
  handleRollbackRoleMatrix,
  handleGetMyPermissions,
  handleExportRoleMatrix,
  handleExportRoleAssignments,
  handleRoleStats,
  handlePendingUsers,
  handleNewArticles,
  handleMetricsHealth,
  handleMetricsTraffic,
  handleMetricsErrors,
} from './handlers/roleMatrix.js';
import { 
  handleSendEmail, 
  handleNewsletterInterest,
  handleRequestPublishAuth 
} from './handlers/email.js';
import { validate } from './lib/validate.js';
import {
  accountCheckSchema,
  profilePatchSchema,
  submitFormSchema,
  updateSubmissionSchema,
  getSubmissionsQuerySchema,
} from './lib/schemas.js';

/**
 * Route and handle incoming request
 */
export async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const supabaseUrlPrefix = env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 5) : 'NOT_SET';
  const supabaseKeyPrefix = env.SUPABASE_ANON_KEY ? env.SUPABASE_ANON_KEY.substring(0, 5) : 'NOT_SET';

  console.log(`[DEBUG] 🚀 ${method} ${path}`);
  console.log(`[DEBUG] 🔌 SUPABASE_URL prefix: ${supabaseUrlPrefix}...`);
  console.log(`[DEBUG] 🔑 SUPABASE_ANON_KEY prefix: ${supabaseKeyPrefix}...`);

  if (method === 'OPTIONS') return handleOptions();

  if (path === '/' && method === 'GET') return htmlResponse(generateMainPage(env));
  if (path === '/app' && method === 'GET') return htmlResponse(generateMainPage(env));

  try {
    if (path === '/api/backend/status' && method === 'GET') return await handleBackendStatus(env);
    if (path === '/api/posts' && method === 'GET') return await handleGetPosts(env);
    if (path === '/api/categories' && method === 'GET') return await handleGetCategories(env);
    if (path === '/api/health' && method === 'GET') return await handleHealth();

    if (path === '/api/account/check' && method === 'GET') return await validate(accountCheckSchema, 'query')(handleAccountCheck)(request, env);
    if (path === '/api/users' && method === 'GET') return await handleGetUsers(request, env);
    if (path === '/api/admin/sync-role-matrix' && method === 'POST') return await handleSyncRoleMatrix(request, env);
    if (path === '/api/admin/sync-role-assignments' && method === 'POST') return await handleSyncRoleAssignments(request, env);
    if (path === '/api/admin/sync-auth-all' && method === 'POST') return await handleSyncAuthAll(request, env);
    if (path === '/api/admin/preview-role-matrix-sync' && method === 'GET') return await handlePreviewRoleMatrixSync(request, env);
    if (path === '/api/admin/rollback-role-matrix' && method === 'POST') return await handleRollbackRoleMatrix(request, env);
    if (path === '/api/my-permissions' && method === 'GET') return await handleGetMyPermissions(request, env);
    if (path === '/api/admin/export-role-matrix' && method === 'GET') return await handleExportRoleMatrix(request, env);
    if (path === '/api/admin/export-role-assignments' && method === 'GET') return await handleExportRoleAssignments(request, env);
    if (path === '/api/admin/stats/roles' && method === 'GET') return await handleRoleStats(request, env);
    if (path === '/api/admin/pending-users' && method === 'GET') return await handlePendingUsers(request, env);
    if (path === '/api/admin/new-articles' && method === 'GET') return await handleNewArticles(request, env);
    if (path === '/api/admin/metrics/health' && method === 'GET') return await handleMetricsHealth(request, env);
    if (path === '/api/admin/metrics/traffic' && method === 'GET') return await handleMetricsTraffic(request, env);
    if (path === '/api/admin/metrics/errors' && method === 'GET') return await handleMetricsErrors(request, env);
    if (path.startsWith('/api/profile') && method === 'GET') return await handleGetProfile(request, env);
    if (path === '/api/profile' && method === 'PUT') return await validate(profilePatchSchema, 'body')(handlePutProfile)(request, env);
    if (path === '/api/avatar/upload' && method === 'POST') return await handleAvatarUpload(request, env);
    if (path === '/api/submit' && method === 'POST') return await validate(submitFormSchema, 'form', ['name', 'email', 'relation_type', 'content'])(handleSubmit)(request, env);
    if (path === '/api/submissions' && method === 'GET') return await validate(getSubmissionsQuerySchema, 'query')(handleGetSubmissions)(request, env);
    if (path.startsWith('/api/submissions/') && method === 'PATCH') return await validate(updateSubmissionSchema, 'body')(handleUpdateSubmission)(request, env);
    if (path.startsWith('/api/files/') && method === 'GET') return await handleGetFile(request, env);
    if (path === '/api/internal/send-email' && method === 'POST') return await handleSendEmail(request, env);
    if (path === '/api/newsletter-interest' && method === 'POST') return await handleNewsletterInterest(request, env);
    if (path === '/api/request-publish-auth' && method === 'POST') return await handleRequestPublishAuth(request, env);

    return errorResponse('API 端点不存在', 404);
  } catch (error) {
    console.error('Request handler error:', error);
    return errorResponse('服务器内部错误', 500);
  }
}
