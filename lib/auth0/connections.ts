/**
 * Auth0 connection names as configured in the Auth0 Dashboard.
 * Override via AUTH0_CONNECTION_* (server) or NEXT_PUBLIC_AUTH0_CONNECTION_* (browser build).
 */

const DEFAULTS = {
  google: 'google-oauth2',
  facebook: 'facebook',
  line: 'line',
  yahoo: 'yahoo',
} as const;

export type Auth0ProviderKey = keyof typeof DEFAULTS;

function pick(key: Auth0ProviderKey): string {
  const suffix = key.toUpperCase();
  const pub = process.env[`NEXT_PUBLIC_AUTH0_CONNECTION_${suffix}`];
  const server = process.env[`AUTH0_CONNECTION_${suffix}`];
  return (typeof pub === 'string' && pub.trim()) || (typeof server === 'string' && server.trim()) || DEFAULTS[key];
}

/** Map UI keys to Auth0 connection names (for /auth/login?connection=). */
export function getAuth0ConnectionMap(): Record<Auth0ProviderKey, string> {
  return {
    google: pick('google'),
    facebook: pick('facebook'),
    line: pick('line'),
    yahoo: pick('yahoo'),
  };
}

export function getAuth0ConnectionForProvider(provider: string): string | null {
  const map = getAuth0ConnectionMap();
  if (provider in map) return map[provider as Auth0ProviderKey];
  return null;
}
