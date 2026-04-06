/**
 * Client-side: Cloudflare Image Resizing URL for cover images.
 * Use getCoverImageUrl(rawUrl, 'card'|'detail') when building img src.
 */
(function (global) {
  var CF_IMAGE_BASE = 'https://www.jjconnect.jp/cdn-cgi/image';

  function getCoverImageUrl(rawUrl, variant) {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.indexOf('http') !== 0) {
      return rawUrl || '';
    }
    var opts = variant === 'card'
      ? 'width=600,height=340,fit=cover,quality=88,format=auto'
      : 'width=1200,height=630,fit=cover,quality=90,format=auto';
    return CF_IMAGE_BASE + '/' + opts + '/' + rawUrl;
  }

  global.getCoverImageUrl = getCoverImageUrl;
})(typeof window !== 'undefined' ? window : this);
