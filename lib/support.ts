/** Public help page path — same URL as Auth0 Tenant Settings → Support URL (on the app origin). */
export const SUPPORT_PAGE_PATH = '/support' as const;

export function supportPageHref(search?: Record<string, string>): string {
  if (!search || Object.keys(search).length === 0) return SUPPORT_PAGE_PATH;
  const q = new URLSearchParams(search).toString();
  return `${SUPPORT_PAGE_PATH}?${q}`;
}
