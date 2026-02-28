/**
 * Re-export Supabase Workers client from lib/supabase
 * Use this in Next.js client components that need env-based Supabase (e.g. RightSidebar)
 */

export {
  getSupabaseClient,
  getSupabaseClientWithAuth,
  extractTokenFromRequest,
  isSupabaseConfigured,
  type Env,
} from '../../lib/supabase';
