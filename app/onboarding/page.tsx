'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { SUPPORT_PAGE_PATH } from '@/lib/support';

function safeNextPath(input: string | null, fallback = '/'): string {
  if (!input) return fallback;
  if (!input.startsWith('/')) return fallback;
  if (input.startsWith('//')) return fallback;
  return input;
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [countryRegion, setCountryRegion] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [callName, setCallName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('T');
  const [upgradeComplete, setUpgradeComplete] = useState(false);

  const next = safeNextPath(searchParams.get('next'));

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select(
            'country_region, preferred_language, call_name, role, basic_profile_completed_at, upgrade_profile_completed_at'
          )
          .eq('id', user.id)
          .single();

        if (!mounted) return;

        if (profile) {
          setCountryRegion(profile.country_region ?? '');
          setPreferredLanguage(profile.preferred_language ?? '');
          setCallName(profile.call_name ?? '');
          setRole(profile.role ?? 'T');
          setUpgradeComplete(Boolean(profile.upgrade_profile_completed_at));
          if (profile.basic_profile_completed_at) {
            if ((profile.role ?? 'T') !== 'T' && !profile.upgrade_profile_completed_at) {
              router.replace(`/upgrade/complete-profile?next=${encodeURIComponent(next)}`);
            } else {
              router.replace(next);
            }
            return;
          }
        }

        setLoading(false);
        return;
      }

      const meRes = await fetch('/api/me', { credentials: 'include' });
      const me = await meRes.json();

      if (!mounted) return;

      if (!me?.isLoggedIn || !me?.userData?.id) {
        router.replace('/login');
        return;
      }

      const ud = me.userData;
      setCountryRegion(ud.country_region ?? '');
      setPreferredLanguage(ud.preferred_language ?? '');
      setCallName(ud.call_name ?? '');
      setRole(ud.role ?? 'T');
      setUpgradeComplete(Boolean(ud.upgrade_complete));

      if (ud.basic_profile_completed_at) {
        if ((ud.role ?? 'T') !== 'T' && !ud.upgrade_complete) {
          router.replace(`/upgrade/complete-profile?next=${encodeURIComponent(next)}`);
        } else {
          router.replace(next);
        }
        return;
      }

      setLoading(false);
    }

    load().catch((err) => {
      console.error('Failed to load onboarding profile', err);
      setError('Failed to load profile data. Please refresh and try again.');
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [next, router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      country_region: countryRegion.trim(),
      preferred_language: preferredLanguage.trim(),
      call_name: callName.trim(),
      basic_profile_completed_at: new Date().toISOString(),
    };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', user.id);
      setSaving(false);
      if (updateError) {
        setError(updateError.message || 'Failed to save profile');
        return;
      }
    } else {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok) {
        setError(typeof body.error === 'string' ? body.error : 'Failed to save profile');
        return;
      }
    }

    if (role !== 'T' && !upgradeComplete) {
      router.replace(`/upgrade/complete-profile?next=${encodeURIComponent(next)}`);
      return;
    }

    router.replace(next);
  }

  if (loading) {
    return <main className="mx-auto max-w-lg px-4 py-12 text-sm text-gray-600">Loading profile...</main>;
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Complete quick profile</h1>
      <p className="mb-6 text-sm text-gray-600">
        Just 3 quick questions before you start using JJConnect.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="countryRegion" className="mb-1 block text-sm font-medium text-gray-700">
            Where are you from? (country / region)
          </label>
          <input
            id="countryRegion"
            value={countryRegion}
            onChange={(event) => setCountryRegion(event.target.value)}
            required
            maxLength={80}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Japan / Tokyo"
          />
        </div>

        <div>
          <label htmlFor="preferredLanguage" className="mb-1 block text-sm font-medium text-gray-700">
            Preferred language
          </label>
          <select
            id="preferredLanguage"
            value={preferredLanguage}
            onChange={(event) => setPreferredLanguage(event.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select language</option>
            <option value="ja">Japanese</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="ko">Korean</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="callName" className="mb-1 block text-sm font-medium text-gray-700">
            How should we call you?
          </label>
          <input
            id="callName"
            value={callName}
            onChange={(event) => setCallName(event.target.value)}
            required
            maxLength={80}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Your nickname"
          />
        </div>

        {error && (
          <div className="space-y-2">
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            <p className="text-sm text-gray-600">
              Still stuck?{' '}
              <Link href={SUPPORT_PAGE_PATH} className="text-blue-600 hover:underline">
                Help &amp; support
              </Link>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </main>
  );
}
