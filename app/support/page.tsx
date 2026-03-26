import type { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_PAGE_PATH } from '@/lib/support';

export const metadata: Metadata = {
  title: 'Help & support | JJConnect',
  description:
    'Help with JJConnect sign-in, account access, and common issues. Official support contact for login problems.',
  robots: { index: true, follow: true },
  alternates: { canonical: SUPPORT_PAGE_PATH },
};

/** Public page — Auth0 Support URL = origin + {@link SUPPORT_PAGE_PATH} (e.g. https://www.jjconnect.jp/support). */
export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-gray-900">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Help &amp; support</h1>
      <p className="mb-8 text-gray-600">
        If you are having trouble signing in or using your account, try the steps below. For anything else,
        contact us and we will help.
      </p>

      <section className="mb-10 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Sign-in problems</h2>
        <ul className="list-inside list-disc space-y-2 text-gray-700">
          <li>
            Use the same sign-in method each time (for example the same social account or email flow you used
            when you registered).
          </li>
          <li>
            Open the site in a private or incognito window, or clear cookies for this site, then try again.
          </li>
          <li>
            Check that you are on the real JJConnect website (correct address in the browser bar) before
            entering credentials.
          </li>
          <li>
            If you use a work or school device, a firewall or browser extension may block login. Try another
            network or device.
          </li>
        </ul>
        <p className="text-sm text-gray-600">
          JJConnect sign-in is handled securely by our authentication provider. If you see an error on their
          page, note the message (or take a screenshot) before contacting support.
        </p>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Contact us</h2>
        <p className="text-gray-700">
          Email:{' '}
          <a
            href="mailto:support@jjconnect.jp?subject=JJConnect%20login%20help"
            className="text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:decoration-blue-600"
          >
            support@jjconnect.jp
          </a>
        </p>
        <p className="text-sm text-gray-600">
          Include what you were trying to do, which browser and device you use, and any error text you saw.
          Do not send passwords.
        </p>
      </section>

      <p className="text-sm text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to home
        </Link>
        {' · '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
