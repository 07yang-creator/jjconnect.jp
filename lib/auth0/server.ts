import { isAuth0Enabled } from '@/lib/auth/provider';

export interface Auth0SessionUser {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  email_verified: boolean;
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
    picture: user.picture ?? null,
    email_verified: user.email_verified === true,
  };
}
