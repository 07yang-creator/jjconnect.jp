import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

/** jjconnect.jp is trilingual; Japanese is the default. Locale comes from a cookie
 *  (no path-based /[locale] routing yet — that lands in Movement C4 when the
 *  brochure/content pages are React). The C1c language switcher sets the cookie. */
export const locales = ['ja', 'zh', 'en'] as const;
export const defaultLocale = 'ja' as const;
export type Locale = (typeof locales)[number];

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = (locales as readonly string[]).includes(cookieLocale ?? '')
    ? (cookieLocale as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
