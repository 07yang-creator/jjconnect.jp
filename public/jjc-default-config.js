/* eslint-disable */
// Public defaults for static HTML (navbar, product pages). Run `npm run generate:public-config`
// to overwrite from .env. Merge preserves values set earlier (e.g. Next root layout inline script).
window.JJCONNECT_CONFIG = Object.assign(
  {},
  {
    supabaseUrl: '',
    supabaseAnonKey: '',
    authProvider: 'supabase',
  },
  window.JJCONNECT_CONFIG || {}
);
