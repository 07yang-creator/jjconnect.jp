'use client';

import { useState } from 'react';
import Link from 'next/link';
import { submitPublishAccessRequestAction } from '@/app/actions/publishAccessRequest';

const ORG_OPTIONS: { value: string; label: string }[] = [
  { value: 'company', label: 'Company' },
  { value: 'individual', label: 'Individual creator' },
  { value: 'media', label: 'Media' },
  { value: 'academic', label: 'Academic' },
  { value: 'government', label: 'Government' },
  { value: 'npo', label: 'NPO / nonprofit' },
  { value: 'other', label: 'Other' },
];

const EXP_OPTIONS: { value: string; label: string }[] = [
  { value: 'first_time', label: 'First time publishing online' },
  { value: 'occasional', label: 'Occasionally' },
  { value: 'regular', label: 'Regularly' },
  { value: 'professional', label: 'Professional / editorial' },
];

export default function RequestAccessForm({
  defaultFullName,
  userEmail,
}: {
  defaultFullName: string;
  userEmail: string;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await submitPublishAccessRequestAction(fd);
    setPending(false);
    if (res.ok) {
      setDone(true);
    } else {
      setError(res.error);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Thank you</h2>
        <p className="text-sm text-gray-700 mb-4">
          We received your request. Our team will review it and you will hear from us at{' '}
          <span className="font-medium">{userEmail || 'your account email'}</span> when your account is ready to
          publish.
        </p>
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      {error && (
        <div className="rounded-lg bg-red-50 text-red-800 text-sm px-3 py-2" role="alert">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={userEmail}
          readOnly
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
        />
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          maxLength={200}
          defaultValue={defaultFullName}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="org_name" className="block text-sm font-medium text-gray-700 mb-1">
          Organization name <span className="text-red-500">*</span>
        </label>
        <input
          id="org_name"
          name="org_name"
          required
          maxLength={200}
          placeholder="Company, school, media outlet, etc."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="org_type" className="block text-sm font-medium text-gray-700 mb-1">
          Organization type <span className="text-red-500">*</span>
        </label>
        <select
          id="org_type"
          name="org_type"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select…</option>
          {ORG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="role_in_org" className="block text-sm font-medium text-gray-700 mb-1">
          Your role there <span className="text-red-500">*</span>
        </label>
        <input
          id="role_in_org"
          name="role_in_org"
          required
          maxLength={200}
          placeholder="e.g. Editor, founder, student"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="org_url" className="block text-sm font-medium text-gray-700 mb-1">
          Website or profile (optional)
        </label>
        <input
          id="org_url"
          name="org_url"
          type="url"
          maxLength={2000}
          placeholder="https://…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="intent_summary" className="block text-sm font-medium text-gray-700 mb-1">
          What do you want to publish? <span className="text-red-500">*</span>
        </label>
        <textarea
          id="intent_summary"
          name="intent_summary"
          required
          rows={5}
          minLength={20}
          maxLength={8000}
          placeholder="Topics, audience, and a sample of what you plan to share."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />
      </div>

      <div>
        <label htmlFor="publishing_experience" className="block text-sm font-medium text-gray-700 mb-1">
          Publishing experience <span className="text-red-500">*</span>
        </label>
        <select
          id="publishing_experience"
          name="publishing_experience"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select…</option>
          {EXP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="language_pref" className="block text-sm font-medium text-gray-700 mb-1">
          Preferred writing language (optional)
        </label>
        <input
          id="language_pref"
          name="language_pref"
          maxLength={50}
          placeholder="e.g. English, Japanese"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" name="attestation_accepted" required className="mt-1 rounded border-gray-300" />
        <span>I confirm the information above is accurate.</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 text-white font-semibold py-3 text-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
