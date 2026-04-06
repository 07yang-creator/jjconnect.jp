import { isAuth0Enabled } from '@/lib/auth/provider';

export interface Auth0SessionUser {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  email_verified: boolean;
}

function coercePictureUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length ? t : null;
}

/** OIDC uses `picture`; some IdPs / claim layouts use alternates. */
export function pictureFromAuth0SessionUser(user: {
  picture?: string;
  [key: string]: unknown;
}): string | null {
  const keys = ['picture', 'picture_url', 'avatar', 'photo', 'image'] as const;
  for (const k of keys) {
    const v = coercePictureUrl(user[k]);
    if (v) return v;
  }
  return null;
}

export async function getAuth0SessionUser(): Promise<Auth0SessionUser | null> {
  if (!isAuth0Enabled()) return null;

  const { auth0 } = await import('@/lib/auth0');
  const session = await auth0.getSession();
  const user = session?.user;
  if (!user?.sub) return null;

  return {
    sub: user.sub,
    email: user.email ?? null,
    name: user.name ?? null,
    picture: pictureFromAuth0SessionUser(user),
    email_verified: user.email_verified === true,
  };
}
