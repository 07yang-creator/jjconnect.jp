/**
 * Auth provider — **Supabase only** (Auth0 was removed in Movement B).
 *
 * These helpers are kept (returning constants) so existing imports keep resolving
 * while the dead Auth0 branches are cleaned up incrementally. The return type stays
 * a union so `=== 'auth0'` comparisons elsewhere remain type-valid (just always false).
 */
export function getAuthProvider(): 'supabase' | 'auth0' {
  return 'supabase';
}

export function isAuth0Enabled(): boolean {
  return false;
}

export function authProviderEnvMismatch(): boolean {
  return false;
}
