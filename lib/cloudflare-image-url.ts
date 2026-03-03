/**
 * Cloudflare Image Resizing URLs for cover images.
 * Display time: transform raw Supabase Storage URL into CDN image URL.
 * See plan: 方案B — Cloudflare Image Resizing.
 */

const CF_IMAGE_BASE = 'https://jjconnect.jp/cdn-cgi/image';

export type CoverVariant = 'card' | 'detail';

/**
 * Returns a Cloudflare Image Resizing URL for the given raw cover image URL.
 * - card: 600×340, fit=cover, quality=88 (lists, cards)
 * - detail: 1200×630, fit=cover, quality=90 (article detail)
 * If the URL is empty or not usable, returns the original URL.
 */
export function getCoverImageUrl(rawUrl: string | null | undefined, variant: CoverVariant): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) {
    return rawUrl ?? '';
  }
  const opts =
    variant === 'card'
      ? 'width=600,height=340,fit=cover,quality=88,format=auto'
      : 'width=1200,height=630,fit=cover,quality=90,format=auto';
  return `${CF_IMAGE_BASE}/${opts}/${rawUrl}`;
}
