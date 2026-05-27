'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase/client';
import { SUPPORT_PAGE_PATH } from '@/lib/support';

function safeNextPath(raw: string | null): string {
  if (!raw) return '/';
  const t = raw.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return '/';
  if (t.includes('://')) return '/';
  const pathOnly = t.split('?')[0];
  if (pathOnly === '/login' || pathOnly === '/login.html') return '/';
  return t.split('#')[0] || '/';
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

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlErrorMessage = loginErrorQueryMessage(searchParams.get('error'));
  const postAuthNext = safeNextPath(searchParams.get('next') ?? searchParams.get('returnTo'));
  const supabase = useMemo(() => createBrowserClient(), []);

  const [mode, setMode] = useState<'signin' | 'signup'>(searchParams.get('create') ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const loginHint = searchParams.get('login_hint')?.trim() ?? '';
  useEffect(() => {
    if (loginHint) setEmail((prev) => prev || loginHint);
  }, [loginHint]);

  // Already signed in → go straight to the destination (all-public; no gates).
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) router.replace(postAuthNext);
    });
    return () => {
      cancelled = true;
    };
  }, [postAuthNext, router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/supabase-callback?next=${encodeURIComponent(postAuthNext)}`,
        },
      });
      setIsSubmitting(false);
      if (error) {
        setErrorMessage(error.message || 'Could not create your account.');
        return;
      }
      if (data.session) {
        router.push(postAuthNext);
        router.refresh();
      } else {
        setInfoMessage('Check your email to confirm your account, then sign in.');
        setMode('signin');
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.');
      return;
    }
    router.push(postAuthNext);
    router.refresh();
  }

  async function handleGoogle() {
    setErrorMessage(null);
    setIsOAuthSubmitting(true);
    const redirectTo = `${window.location.origin}/auth/supabase-callback?next=${encodeURIComponent(postAuthNext)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setErrorMessage(error.message || 'Google sign-in failed. Please try again.');
      setIsOAuthSubmitting(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailToReset = forgotEmail.trim();
    if (!emailToReset) return;
    setForgotSubmitting(true);
    setForgotError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) setForgotError(error.message || 'Failed to send reset email.');
      else setForgotSuccess(true);
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{mode === 'signup' ? 'Create account' : 'Login'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {urlErrorMessage && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>{urlErrorMessage}</p>
            <p className="mt-2">
              <Link href={SUPPORT_PAGE_PATH} className="font-medium text-amber-950 underline">
                Help &amp; support
              </Link>
            </p>
          </div>
        )}
        {infoMessage && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{infoMessage}</div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {mode === 'signin' && (
            <div className="mt-1 text-right">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setForgotEmail(email);
                  setForgotError(null);
                  setForgotSuccess(false);
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>

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
          {isSubmitting
            ? mode === 'signup'
              ? 'Creating...'
              : 'Signing in...'
            : mode === 'signup'
            ? 'Create account'
            : 'Sign in'}
        </button>

        <div className="border-t border-gray-200 pt-4">
          <p className="mb-3 text-center text-xs text-gray-500">Or continue with</p>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isOAuthSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Image src="/icons/auth/google.svg" alt="" width={16} height={16} aria-hidden="true" className="h-4 w-4" />
            Continue with Google
          </button>
        </div>

        <div className="text-center text-sm text-gray-600">
          {mode === 'signin' ? (
            <p>
              Need an account?{' '}
              <button type="button" onClick={() => { setMode('signup'); setErrorMessage(null); }} className="text-blue-600 hover:underline">
                Create one
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('signin'); setErrorMessage(null); }} className="text-blue-600 hover:underline">
                Sign in
              </button>
            </p>
          )}
        </div>
      </form>

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
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{forgotError}</div>
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
              <p className="mb-4 text-xs text-gray-500">Didn&apos;t receive it? Check your spam folder.</p>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotSuccess(false);
                }}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Back to sign in
              </button>
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
          <p className="text-sm text-gray-600">Loading…</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
