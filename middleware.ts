import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuth0Enabled } from '@/lib/auth/provider';

const ADMIN_PATHS = new Set([
  '/admin-console.html',
  '/admin_dashboard.html',
  '/admin.html',
  '/admin-test.html',
]);

function redirectToLogin(request: NextRequest) {
  if (isAuth0Enabled()) {
    const target = request.nextUrl.pathname || '/admin-console.html';
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', target);
    return NextResponse.redirect(loginUrl);
  }

  const loginUrl = new URL('/login.html', request.url);
  const target = request.nextUrl.pathname.replace(/^\//, '') || 'admin-console.html';
  loginUrl.searchParams.set('redirect', target);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  if (!isAuth0Enabled()) {
    if (!ADMIN_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    const token = request.cookies.get('jjc_sb_access_token')?.value;
    if (!token) {
      return redirectToLogin(request);
    }

    const authApiBase =
      process.env.JJC_AUTH_API_BASE || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

    try {
      const verifyRes = await fetch(`${authApiBase}/api/my-permissions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${decodeURIComponent(token)}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (!verifyRes.ok) {
        if (isLocalDev) return NextResponse.next();
        return redirectToLogin(request);
      }

      const data = await verifyRes.json();
      const isAdmin =
        data?.success === true &&
        (data?.role_level === 'A' || data?.ui?.canAccessSystemSettings === true);

      if (!isAdmin) {
        return redirectToLogin(request);
      }

      return NextResponse.next();
    } catch (_) {
      if (isLocalDev) return NextResponse.next();
      return redirectToLogin(request);
    }
  }

  const { auth0 } = await import('@/lib/auth0');
  const auth0Response = await auth0.middleware(request);

  if (pathname.startsWith('/auth/')) {
    return auth0Response;
  }

  if (ADMIN_PATHS.has(pathname)) {
    const session = await auth0.getSession(request);
    if (!session?.user) {
      return redirectToLogin(request);
    }
  }

  return auth0Response;
}

/** Auth0 quickstart-style matcher (Next.js 15: `middleware.ts`). Supabase-only requests exit early inside the handler. */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
