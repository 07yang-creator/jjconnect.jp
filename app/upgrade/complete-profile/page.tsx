'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { SUPPORT_PAGE_PATH } from '@/lib/support';

function safeNextPath(input: string | null, fallback = '/publish'): string {
  if (!input) return fallback;
  if (!input.startsWith('/')) return fallback;
  if (input.startsWith('//')) return fallback;
  return input;
}

export default function UpgradeCompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  const next = safeNextPath(searchParams.get('next'));

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setEmailVerified(Boolean(user.email_confirmed_at));

      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'full_name, phone_number, company_name, address_line1, postal_code, upgrade_profile_completed_at'
        )
        .eq('id', user.id)
        .single();

      if (!mounted) return;

      if (profile) {
        setFullName(profile.full_name ?? '');
        setPhoneNumber(profile.phone_number ?? '');
        setCompanyName(profile.company_name ?? '');
        setAddressLine1(profile.address_line1 ?? '');
        setPostalCode(profile.postal_code ?? '');
        if (profile.upgrade_profile_completed_at) {
          router.replace(next);
          return;
        }
      }

      setLoading(false);
    }

    load().catch((err) => {
      console.error('Failed to load upgrade profile form', err);
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      router.replace('/login');
      return;
    }

    if (!user.email_confirmed_at) {
      setSaving(false);
      setError('Please verify your email before completing paid/granted upgrade.');
      return;
    }

    const payload = {
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      company_name: companyName.trim() || null,
      address_line1: addressLine1.trim(),
      postal_code: postalCode.trim(),
      email_verified_at: user.email_confirmed_at,
      upgrade_profile_completed_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', user.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message || 'Failed to save upgrade profile');
      return;
    }

    router.replace(next);
  }

  if (loading) {
    return <main className="mx-auto max-w-xl px-4 py-12 text-sm text-gray-600">Loading...</main>;
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Complete upgrade profile</h1>
      <p className="mb-6 text-sm text-gray-600">
        Paid or granted members need a complete registration form.
      </p>

      {!emailVerified && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Verify your email first. Check your inbox for the confirmation link.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            maxLength={120}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="mb-1 block text-sm font-medium text-gray-700">
            Phone number
          </label>
          <input
            id="phoneNumber"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            required
            maxLength={40}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-gray-700">
            Company name (optional)
          </label>
          <input
            id="companyName"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            maxLength={160}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="addressLine1" className="mb-1 block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            id="addressLine1"
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
            required
            maxLength={240}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="postalCode" className="mb-1 block text-sm font-medium text-gray-700">
            Postal code
          </label>
          <input
            id="postalCode"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            required
            maxLength={32}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
          disabled={saving || !emailVerified}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Complete upgrade profile'}
        </button>
      </form>
    </main>
  );
}
