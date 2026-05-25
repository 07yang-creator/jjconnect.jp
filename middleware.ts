import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/** Static admin pages — gated to jjconnect.jp admins (jjc.profiles.role_level === 'A'). */
const ADMIN_PATHS = new Set([
  '/admin-console.html',
  '/admin_dashboard.html',
  '/admin.html',
]);

/** Production apex must 308 to canonical www — the apex is never served as the app. */
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

export async function middleware(request: NextRequest) {
  const apexRedirect = redirectJjconnectApexToWww(request);
  if (apexRedirect) return apexRedirect;

  const { pathname } = request.nextUrl;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Refresh the Supabase session and forward cookies (standard @supabase/ssr pattern).
  let response = NextResponse.next({ request });

  // If Supabase isn't configured yet (e.g. an unconfigured preview), don't gate.
  if (!supabaseUrl || !supabaseAnon) return response;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // jjconnect.jp is all-public for now — the only gate is the static admin pages.
  if (ADMIN_PATHS.has(pathname)) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const { data: profile } = await supabase
      .schema('jjc')
      .from('profiles')
      .select('role_level')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role_level !== 'A') {
      // Signed in but not an admin → send home (no public unauthorized page yet).
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Apex host: every path hits middleware so jjconnect.jp is never served 200 (only 308 → www).
    { source: '/:path*', has: [{ type: 'host', value: 'jjconnect.jp' }] },
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
