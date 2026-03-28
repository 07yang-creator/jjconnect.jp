/**
 * Public labels for categories by slug — aligned with home.html CATEGORY_TYPES
 * and English topic-style slugs, so UI matches real names when DB `name` is legacy.
 */

const SLUG_TO_DISPLAY_NAME: Record<string, string> = {
  finance: 'Finance',
  'real-estate': 'Real Estate',
  real_estate: 'Real Estate',
  it: 'IT',
  others: 'Others',
  news: 'News',
  announcement: 'Announcements',
  event: 'Events',
  activity: 'Events',
  misc: 'Misc',
};

/** Legacy matrix labels from home.html (when slug was not synced to English). */
const LEGACY_MATRIX_SUFFIX: Record<string, string> = {
  A: 'Finance',
  B: 'Real Estate',
  C: 'IT',
  D: 'Others',
};

function displayNameFromLegacyMatrixName(name: string): string | null {
  const m = /^分类#@\s*([ABCD])\s*$/i.exec(name.trim());
  if (!m) return null;
  return LEGACY_MATRIX_SUFFIX[m[1].toUpperCase()] ?? null;
}

export function categoryDisplayName(category: { name: string; slug: string }): string {
  const slug = category.slug?.trim().toLowerCase();
  if (slug && SLUG_TO_DISPLAY_NAME[slug]) {
    return SLUG_TO_DISPLAY_NAME[slug];
  }
  const fromLegacy = displayNameFromLegacyMatrixName(category.name ?? '');
  if (fromLegacy) return fromLegacy;
  return category.name;
}
