import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PATHS = new Set([
  '/admin-console.html',
  '/admin_dashboard.html',
  '/admin.html',
  '/admin-test.html',
]);

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login.html', request.url);
  const target = request.nextUrl.pathname.replace(/^\//, '') || 'admin-console.html';
  loginUrl.searchParams.set('redirect', target);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
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

export const config = {
  matcher: ['/admin-console.html', '/admin_dashboard.html', '/admin.html', '/admin-test.html'],
};
