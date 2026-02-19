/**
 * Authentication Utilities
 * Re-exports authentication-related functions for easier imports
 */

export { 
  createServerSupabaseClient,
  getCurrentUser,
  isAuthorizedUser 
} from './supabase/server';
