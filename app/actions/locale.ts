'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, locales, defaultLocale, type Locale } from '@/i18n/request';

/** Persist the chosen UI locale in a cookie; the client refreshes to re-render. */
export async function setLocale(locale: string) {
  const next: Locale = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
  const store = await cookies();
  store.set(LOCALE_COOKIE, next, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
