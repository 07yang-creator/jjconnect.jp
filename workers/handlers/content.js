/**
 * Content API handlers: posts, categories, backend status, health
 */

import { jsonResponse } from '../lib/http.js';
import { getSupabaseConfig, querySupabase } from '../lib/supabase.js';

export async function handleBackendStatus(env) {
  const supabaseUrlPrefix = env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 5) : 'NOT_SET';
  const supabaseKeyPrefix = env.SUPABASE_ANON_KEY ? env.SUPABASE_ANON_KEY.substring(0, 5) : 'NOT_SET';

  return jsonResponse({
    success: true,
    message: 'Current Backend: Supabase Connection Active',
    data: {
      status: 'active',
      backend: 'Supabase',
      connection: env.SUPABASE_URL && env.SUPABASE_ANON_KEY ? 'Active' : 'Inactive',
      supabaseUrlPrefix,
      supabaseKeyPrefix,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function handleGetPosts(env) {
  const supabase = getSupabaseConfig(env);
  if (!supabase) {
    return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);
  }
  try {
    const posts = await querySupabase(supabase, 'posts', {
      select: '*,author:profiles(display_name,avatar_url),category:categories(name,slug)',
      eq: { status: 'published' },
      order: 'created_at.desc',
      limit: '20',
    });
    return jsonResponse({ success: true, data: posts });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function handleGetCategories(env) {
  const supabase = getSupabaseConfig(env);
  if (!supabase) {
    return jsonResponse({ success: false, error: 'Supabase not configured' }, 500);
  }
  try {
    const categories = await querySupabase(supabase, 'categories', {
      select: '*',
      order: 'name.asc',
    });
    return jsonResponse({ success: true, data: categories });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function handleHealth() {
  return jsonResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
