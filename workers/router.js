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
  handleLogin,
  handleAuthCheck,
  handleLogout,
  handleAccountCheck,
  handleRegister,
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
import { validate } from './lib/validate.js';
import {
  loginSchema,
  registerSchema,
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
    if (path === '/api/login' && method === 'POST') return await validate(loginSchema, 'body')(handleLogin)(request, env);
    if (path === '/api/register' && method === 'POST') return await validate(registerSchema, 'body')(handleRegister)(request, env);
    if (path === '/api/auth/check' && method === 'GET') return await handleAuthCheck(request, env);
    if (path === '/api/auth/logout' && method === 'POST') return await handleLogout(request);
    if (path === '/api/users' && method === 'GET') return await handleGetUsers(request, env);
    if (path.startsWith('/api/profile') && method === 'GET') return await handleGetProfile(request, env);
    if (path === '/api/profile' && method === 'PUT') return await validate(profilePatchSchema, 'body')(handlePutProfile)(request, env);
    if (path === '/api/avatar/upload' && method === 'POST') return await handleAvatarUpload(request, env);
    if (path === '/api/submit' && method === 'POST') return await validate(submitFormSchema, 'form', ['name', 'email', 'relation_type', 'content'])(handleSubmit)(request, env);
    if (path === '/api/submissions' && method === 'GET') return await validate(getSubmissionsQuerySchema, 'query')(handleGetSubmissions)(request, env);
    if (path.startsWith('/api/submissions/') && method === 'PATCH') return await validate(updateSubmissionSchema, 'body')(handleUpdateSubmission)(request, env);
    if (path.startsWith('/api/files/') && method === 'GET') return await handleGetFile(request, env);

    return errorResponse('API 端点不存在', 404);
  } catch (error) {
    console.error('Request handler error:', error);
    return errorResponse('服务器内部错误', 500);
  }
}
