// Prefer `npm run generate:public-config` → public/jjc-default-config.js (synced to site root on build).
// This file is a hand-copy template if you are not using the generator.

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

window.JJCONNECT_CONFIG = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  // Must match deploy: 'supabase' | 'auth0'. On Next origin, navbar/login can merge /api/public-config.
  authProvider: 'supabase'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  };
}
