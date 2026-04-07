import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuth0Enabled } from '@/lib/auth/provider';
import { createClient } from '@supabase/supabase-js';

const ADMIN_PATHS = new Set([
  '/admin-console.html',
  '/admin_dashboard.html',
  '/admin.html',
]);

const PROFILE_GATE_EXEMPT_PREFIXES = [
  '/auth/',
  '/api/',
  '/_next/',
  '/wp-content/',
  '/wp-includes/',
  '/brand/',
  '/icons/',
];
const PROFILE_GATE_EXEMPT_PATHS = new Set([
  '/',
  '/feed',
  '/login',
  '/login.html',
  '/onboarding',
  '/upgrade/complete-profile',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]);

/** Static files must bypass the onboarding/profile gate — otherwise `/navbar.css` etc. redirect to HTML and break Chrome + avatar load. */
const STATIC_ASSET_EXACT = new Set([
  '/navbar.css',
  '/navbar.js',
  '/jjc-default-config.js',
  '/config.js',
]);

function isStaticAssetPath(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return false;
  if (STATIC_ASSET_EXACT.has(pathname)) return true;
  if (
    ['/wp-content/', '/wp-includes/', '/brand/', '/icons/'].some((p) => pathname.startsWith(p))
  ) {
    return true;
  }
  return /\.(css|js|mjs|map|ico|svg|png|jpe?g|gif|webp|avif|woff2?|ttf|eot|txt|xml)$/i.test(
    pathname
  );
}

function isProfileGateExemptPath(pathname: string): boolean {
  if (PROFILE_GATE_EXEMPT_PATHS.has(pathname)) return true;
  return PROFILE_GATE_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function trimmed(v: string | null | undefined): string {
  return (v ?? '').trim();
}

/** Production apex must not serve the app — only 308 to canonical `www` (also avoids Auth0 inferring the wrong `redirect_uri`). */
const JJCONNECT_APEX_HOST = 'jjconnect.jp';
const JJCONNECT_CANONICAL_HOST = 'www.jjconnect.jp';

function redirectJjconnectApexToWww(request: NextRequest): NextResponse | null {
  const reqHost = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (reqHost !== JJCONNECT_APEX_HOST) return null;
  const url = request.nextUrl.clone();
  url.hostname = JJCONNECT_CANONICAL_HOST;
  url.protocol = 'https:';
  return NextResponse.redirect(url, 308);
}

async function readAuth0MappedProfile(auth0Sub: string, sessionUserEmail?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: identity } = await admin
    .from('external_identities')
    .select('supabase_user_id')
    .eq('provider', 'auth0')
    .eq('external_user_id', auth0Sub)
    .maybeSingle();

  const supabaseUserId = identity?.supabase_user_id;
  if (!supabaseUserId) return null;

  if (sessionUserEmail) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(supabaseUserId);
      if (userData?.user && userData.user.user_metadata?.jjc_email !== sessionUserEmail) {
        await admin.auth.admin.updateUserById(supabaseUserId, {
          user_metadata: { ...userData.user.user_metadata, jjc_email: sessionUserEmail }
        });
      }
    } catch (e) {
      // Avoid breaking auth if email sync fails
      console.error('Failed to sync auth0 email to Supabase metadata', e);
    }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role, country_region, preferred_language, call_name, upgrade_profile_completed_at')
    .eq('id', supabaseUserId)
    .maybeSingle();

  return profile ?? null;
}

function redirectToLogin(request: NextRequest) {
  if (isAuth0Enabled()) {
    const target = request.nextUrl.pathname || '/admin-console.html';
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', target);
    return NextResponse.redirect(loginUrl);
  }

  const loginUrl = new URL('/login.html', request.url);
  const target = request.nextUrl.pathname.replace(/^\//, '') || 'admin-console.html';
  loginUrl.searchParams.set('next', target);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const apexRedirect = redirectJjconnectApexToWww(request);
  if (apexRedirect) return apexRedirect;

  const { pathname, hostname } = request.nextUrl;

  if (!isAuth0Enabled()) {
    // `/auth/*` is handled by Auth0 SDK only when JJC_AUTH_PROVIDER=auth0. Otherwise these URLs 404.
    if (pathname === '/auth/login' || pathname === '/auth/login/') {
      const dest = new URL('/login', request.url);
      const sp = request.nextUrl.searchParams;
      const returnTo = sp.get('returnTo') ?? sp.get('next');
      if (returnTo) dest.searchParams.set('next', returnTo);
      const loginHint = sp.get('login_hint');
      if (loginHint) dest.searchParams.set('login_hint', loginHint);
      const connection = sp.get('connection');
      if (connection) dest.searchParams.set('connection', connection);
      return NextResponse.redirect(dest);
    }

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
        const unauthUrl = new URL('/unauthorized.html', request.url);
        return NextResponse.redirect(unauthUrl);
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

  if (!isProfileGateExemptPath(pathname) && !isStaticAssetPath(pathname)) {
    const session = await auth0.getSession(request);
    if (session?.user?.sub) {
      const profile = await readAuth0MappedProfile(session.user.sub, session.user.email);
      // TEMPORARY BYPASS FOR TESTING: Skip onboarding redirect for admin paths
      if (!profile && !ADMIN_PATHS.has(pathname)) {
        const onboardingUrl = new URL('/onboarding', request.url);
        onboardingUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
        return NextResponse.redirect(onboardingUrl);
      }

      if (profile) {
        const basicComplete =
          Boolean(trimmed(profile.country_region)) &&
          Boolean(trimmed(profile.preferred_language)) &&
          Boolean(trimmed(profile.call_name));
        const role = profile.role ?? 'T';
        const upgradeComplete = Boolean(profile.upgrade_profile_completed_at);

        // TEMPORARY BYPASS FOR TESTING: Skip onboarding redirect for admin paths
        if (!basicComplete && !ADMIN_PATHS.has(pathname)) {
          const onboardingUrl = new URL('/onboarding', request.url);
          onboardingUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
          return NextResponse.redirect(onboardingUrl);
        }

        if (role !== 'T' && !upgradeComplete && pathname !== '/upgrade/complete-profile' && !ADMIN_PATHS.has(pathname)) {
          const upgradeUrl = new URL('/upgrade/complete-profile', request.url);
          upgradeUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
          return NextResponse.redirect(upgradeUrl);
        }
      }
    }
  }

  if (ADMIN_PATHS.has(pathname)) {
    // TEMPORARY BYPASS FOR TESTING: Allow access without checking Auth0 session to prevent loops
    /*
    const session = await auth0.getSession(request);
    if (!session?.user) {
      return redirectToLogin(request);
    }
    */
  }

  return auth0Response;
}

/**
 * - Apex host: every path (including `/_next/static`, `favicon.ico`) must hit middleware so
 *   `jjconnect.jp` is never served as a 200 — only 308 to `www`.
 * - Canonical host: skip static assets to limit work (same as Auth0 quickstart-style matcher).
 */
export const config = {
  matcher: [
    // Must be a string literal (Next parses `config` statically); keep in sync with JJCONNECT_APEX_HOST.
    { source: '/:path*', has: [{ type: 'host', value: 'jjconnect.jp' }] },
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
