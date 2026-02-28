/**
 * JJConnect Web Application Worker
 * Handles web pages, API routes, and Supabase integration
 *
 * Routes:
 * - GET / - Main web application (React mount point)
 * - GET /api/* - API endpoints
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

import { route } from './router.js';

export default {
  async fetch(request, env, ctx) {
    return route(request, env);
  },
};
