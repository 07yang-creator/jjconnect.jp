function normalizedAuthToken(v: string | undefined): string | null {
  const t = v?.trim().toLowerCase();
  if (t === 'auth0' || t === 'supabase') return t;
  return null;
}

/**
 * Effective auth provider for server-side code and `/api/public-config`.
 *
 * Precedence: explicit `JJC_AUTH_PROVIDER` (`auth0` | `supabase`) wins; if unset or
 * unrecognized, falls back to `NEXT_PUBLIC_AUTH_PROVIDER`. Keeps middleware, Supabase
 * server helpers, and static HTML config aligned.
 */
export function getAuthProvider(): 'supabase' | 'auth0' {
  const jjc = normalizedAuthToken(process.env.JJC_AUTH_PROVIDER);
  if (jjc) return jjc;
  const pub = normalizedAuthToken(process.env.NEXT_PUBLIC_AUTH_PROVIDER);
  if (pub) return pub;
  return 'supabase';
}

export function isAuth0Enabled(): boolean {
  return getAuthProvider() === 'auth0';
}

/** True when both env vars are set to conflicting explicit providers. */
export function authProviderEnvMismatch(): boolean {
  const jjc = normalizedAuthToken(process.env.JJC_AUTH_PROVIDER);
  const pub = normalizedAuthToken(process.env.NEXT_PUBLIC_AUTH_PROVIDER);
  return jjc !== null && pub !== null && jjc !== pub;
}
