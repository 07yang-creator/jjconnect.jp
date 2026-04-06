/**
 * Normalize Auth0-related env values (Vercel/UI paste often adds spaces or wrapping quotes).
 */
export function auth0CredentialFromEnv(key: string): string | undefined {
  const raw = process.env[key];
  if (raw == null) return undefined;
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.length ? v : undefined;
}
