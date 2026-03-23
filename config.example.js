const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

window.JJCONNECT_CONFIG = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  };
}
