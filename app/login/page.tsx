'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase/client';
import { SUPPORT_PAGE_PATH } from '@/lib/support';

function safeNextPathForCreate(raw: string | null): string {
  if (!raw) return '/';
  const t = raw.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return '/';
  if (t.includes('://')) return '/';
  const pathOnly = t.split('?')[0];
  if (pathOnly === '/login' || pathOnly === '/login.html') return '/';
  const noHash = t.split('#')[0];
  return noHash || '/';
}

function loginErrorQueryMessage(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    missing_code: 'Sign-in was cancelled or the link was incomplete. Please try again.',
    oauth_callback_failed:
      'We could not finish sign-in with your provider. Please try again or use another method.',
    session_missing: 'Your session could not be established. Please sign in again.',
  };
  return map[code] ?? 'Sign-in could not be completed. Please try again.';
}

type ConnectionMap = Partial<Record<'google' | 'facebook' | 'line' | 'yahoo', string>>;

const FALLBACK_CONNECTIONS: Required<ConnectionMap> = {
  google: 'google-oauth2',
  facebook: 'facebook',
  line: 'line',
  yahoo: 'yahoo',
};

function SocialIcon({ provider }: { provider: 'google' | 'facebook' | 'line' | 'yahoo' }) {
  const srcMap = {
    google: '/icons/auth/google.svg',
    facebook: '/icons/auth/facebook.svg',
    line: '/icons/auth/line.svg',
    yahoo: '/icons/auth/yahoo.svg',
  } as const;

  return <Image src={srcMap[provider]} alt="" width={16} height={16} aria-hidden="true" className="h-4 w-4" />;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlErrorMessage = loginErrorQueryMessage(searchParams.get('error'));
  const postAuthNext = safeNextPathForCreate(searchParams.get('next') ?? searchParams.get('returnTo'));
  const createAccountHref = `/login.html?create=1&next=${encodeURIComponent(postAuthNext)}`;
  const supabase = useMemo(() => createBrowserClient(), []);
  /** Resolved from `/api/public-config` so it matches server (JJC_AUTH_PROVIDER precedence). */
  const [authMode, setAuthMode] = useState<'loading' | 'auth0' | 'supabase'>('loading');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionMap | null>(null);
  /** Auth0 Database connection name (public config); required so “Continue” uses the same path as social `connection=` links. */
  const [auth0DatabaseConnection, setAuth0DatabaseConnection] = useState('Username-Password-Authentication');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const loginHintFromUrl = searchParams.get('login_hint')?.trim() ?? '';
  useEffect(() => {
    if (!loginHintFromUrl) return;
    queueMicrotask(() => {
      setEmail((prev) => prev || loginHintFromUrl);
    });
  }, [loginHintFromUrl]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((me) => {
        if (cancelled || !me?.isLoggedIn) return;
        const n = postAuthNext;
        const enc = encodeURIComponent(n);
        if (!me.userData.basic_complete) {
          router.replace(`/onboarding?next=${enc}`);
          return;
        }
        if (me.userData.role !== 'T' && !me.userData.upgrade_complete) {
          router.replace(`/upgrade/complete-profile?next=${enc}`);
          return;
        }
        router.replace(n);
      });
    return () => {
      cancelled = true;
    };
  }, [postAuthNext, router]);

  useEffect(() => {
    type WinCfg = Window & {
      __JJC_SKIP_REMOTE_PUBLIC_CONFIG__?: boolean;
      JJCONNECT_CONFIG?: {
        authProvider?: string;
        auth0Connections?: ConnectionMap;
        auth0DatabaseConnection?: string;
      };
    };
    const w = window as WinCfg;
    if (w.__JJC_SKIP_REMOTE_PUBLIC_CONFIG__ === true && typeof w.JJCONNECT_CONFIG?.authProvider === 'string') {
      const cfg = w.JJCONNECT_CONFIG;
      queueMicrotask(() => {
        const isA = cfg.authProvider === 'auth0';
        setAuthMode(isA ? 'auth0' : 'supabase');
        if (isA) {
          const c = cfg.auth0Connections;
          setConnections(c && typeof c === 'object' ? c : FALLBACK_CONNECTIONS);
          if (typeof cfg.auth0DatabaseConnection === 'string') {
            const t = cfg.auth0DatabaseConnection.trim();
            if (t) setAuth0DatabaseConnection(t);
          }
        }
      });
      return;
    }

    fetch('/api/public-config', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json || typeof json.authProvider !== 'string') {
          const fb = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'auth0' ? 'auth0' : 'supabase';
          setAuthMode(fb);
          if (fb === 'auth0') setConnections(FALLBACK_CONNECTIONS);
          return;
        }
        const isA = json.authProvider === 'auth0';
        setAuthMode(isA ? 'auth0' : 'supabase');
        if (isA) {
          if (json.auth0Connections && typeof json.auth0Connections === 'object') {
            setConnections(json.auth0Connections as ConnectionMap);
          } else {
            setConnections(FALLBACK_CONNECTIONS);
          }
          const dbConn = json.auth0DatabaseConnection;
          if (typeof dbConn === 'string' && dbConn.trim()) {
            setAuth0DatabaseConnection(dbConn.trim());
          }
        }
      })
      .catch(() => {
        const fb = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'auth0' ? 'auth0' : 'supabase';
        setAuthMode(fb);
        if (fb === 'auth0') setConnections(FALLBACK_CONNECTIONS);
      });
  }, []);

  const isAuth0 = authMode === 'auth0';

  function connectionFor(key: keyof typeof FALLBACK_CONNECTIONS): string {
    return connections?.[key]?.trim() || FALLBACK_CONNECTIONS[key];
  }

  function authLoginUrl(params: Record<string, string>) {
    const u = new URL('/auth/login', window.location.origin);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.pathname + u.search;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    if (authMode === 'loading') return;
    setIsSubmitting(true);

    if (isAuth0) {
      const loginHint = email.trim();
      window.location.href = authLoginUrl({
        returnTo: postAuthNext,
        connection: auth0DatabaseConnection,
        ...(loginHint ? { login_hint: loginHint } : {}),
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.');
      return;
    }

    const user = data.user;
    if (!user) {
      router.push(postAuthNext);
      router.refresh();
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, country_region, preferred_language, call_name, upgrade_profile_completed_at')
      .eq('id', user.id)
      .single();

    const basicComplete = Boolean(
      profile?.country_region?.trim() &&
        profile?.preferred_language?.trim() &&
        profile?.call_name?.trim()
    );
    const upgradedRole = Boolean(profile?.role && profile.role !== 'T');
    const nextEnc = encodeURIComponent(postAuthNext);

    if (!basicComplete) {
      router.push(`/onboarding?next=${nextEnc}`);
      router.refresh();
      return;
    }

    if (upgradedRole && (!profile?.upgrade_profile_completed_at || !user.email_confirmed_at)) {
      router.push(`/upgrade/complete-profile?next=${nextEnc}`);
      router.refresh();
      return;
    }

    router.push(postAuthNext);
    router.refresh();
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    if (authMode === 'loading') return;
    if (isAuth0) {
      const connection = connectionFor(provider);
      window.location.href = authLoginUrl({
        returnTo: postAuthNext,
        connection,
      });
      return;
    }

    setErrorMessage(null);
    setIsOAuthSubmitting(true);

    const redirectTo = `${window.location.origin}/auth/supabase-callback?next=${encodeURIComponent(postAuthNext)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      setErrorMessage(error.message || 'OAuth login failed. Please try again.');
      setIsOAuthSubmitting(false);
    }
  }

  function goAuth0Social(key: keyof typeof FALLBACK_CONNECTIONS) {
    const connection = connectionFor(key);
    window.location.href = authLoginUrl({
      returnTo: postAuthNext,
      connection,
    });
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailToReset = forgotEmail.trim();
    if (!emailToReset) return;
    setForgotSubmitting(true);
    setForgotError(null);
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, { redirectTo });
      if (error) {
        setForgotError(error.message || 'Failed to send reset email.');
      } else {
        setForgotSuccess(true);
      }
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotSubmitting(false);
    }
  }

  if (authMode === 'loading') {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Login</h1>
        <p className="text-sm text-gray-600">Loading sign-in options…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Login</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {urlErrorMessage && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>{urlErrorMessage}</p>
            <p className="mt-2">
              <Link href={SUPPORT_PAGE_PATH} className="font-medium text-amber-950 underline decoration-amber-950/30 hover:decoration-amber-950">
                Help &amp; support
              </Link>
            </p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required={!isAuth0}
            autoComplete="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {!isAuth0 && (
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-1 text-right">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setForgotEmail(email); setForgotError(null); setForgotSuccess(false); }}
                className="text-xs text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="space-y-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{errorMessage}</p>
            <p>
              <Link href={SUPPORT_PAGE_PATH} className="font-medium text-red-800 underline">
                Help &amp; support
              </Link>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAuth0 ? 'Continue' : isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="border-t border-gray-200 pt-4">
          <p className="mb-3 text-center text-xs text-gray-500">Or continue with social account</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={isOAuthSubmitting || (isAuth0 && !connections)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SocialIcon provider="google" />
              Continue with Google
            </button>
            {isAuth0 && (
              <>
                <button
                  type="button"
                  onClick={() => goAuth0Social('line')}
                  disabled={!connections}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SocialIcon provider="line" />
                  Continue with LINE
                </button>
                <button
                  type="button"
                  onClick={() => goAuth0Social('yahoo')}
                  disabled={!connections}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SocialIcon provider="yahoo" />
                  Continue with Yahoo
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2 text-center text-sm text-gray-600">
          <p>
            Need help signing in?{' '}
            <Link href={SUPPORT_PAGE_PATH} className="text-blue-600 hover:underline">
              Help &amp; support
            </Link>
          </p>
          <p>
            Need full registration form?{' '}
            <a href={createAccountHref} className="text-blue-600 hover:underline">
              Create one
            </a>
          </p>
        </div>
      </form>

      {/* Forgot Password Overlay */}
      {showForgotPassword && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {!forgotSuccess ? (
            <>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Reset your password</h2>
              <p className="mb-4 text-sm text-gray-600">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div>
                  <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="your.email@example.com"
                  />
                </div>
                {forgotError && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {forgotError}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="rounded-md px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {forgotSubmitting ? 'Sending...' : 'Send reset link'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
                ✓
              </div>
              <h2 className="mb-1 text-lg font-semibold text-gray-900">Check your email</h2>
              <p className="mb-2 text-sm text-gray-600">
                We&apos;ve sent a password reset link to <strong>{forgotEmail}</strong>.
              </p>
              <p className="mb-4 text-xs text-gray-500">
                Didn&apos;t receive it? Check your spam folder.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setForgotSuccess(false); }}
                  className="rounded-md px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Back to sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setForgotSuccess(false); }}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Resend email
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-12">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Login</h1>
          <p className="text-sm text-gray-600">Loading sign-in options…</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
