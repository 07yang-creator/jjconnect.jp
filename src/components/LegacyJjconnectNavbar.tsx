'use client';

import { useEffect } from 'react';

const NAVBAR_CSS_HREF = '/navbar.css';

declare global {
  interface Window {
    JJCNavbar?: { refresh: () => Promise<void> };
    /** When true, `navbar.js` does not fetch `/api/public-config` (layout already inlined public config). */
    __JJC_SKIP_REMOTE_PUBLIC_CONFIG__?: boolean;
  }
}

function loadScriptOnce(src: string, domId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(domId);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.id = domId;
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

/**
 * Legacy top nav + footer from `public/navbar.js` + `navbar.css`.
 * Mounted in root layout so it appears on all App Router pages (home, articles, login, etc.).
 */
export default function LegacyJjconnectNavbar() {
  useEffect(() => {
    let cancelled = false;

    if (!document.querySelector(`link[href="${NAVBAR_CSS_HREF}"][data-jjc-site-chrome="1"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = NAVBAR_CSS_HREF;
      link.dataset.jjcSiteChrome = '1';
      document.head.appendChild(link);
    }

    (async () => {
      try {
        if (typeof window !== 'undefined' && window.JJCNavbar?.refresh) {
          document.querySelector('.jjc-navbar')?.remove();
          document.querySelector('.jjc-footer')?.remove();
          await window.JJCNavbar.refresh();
          return;
        }
        
        // Remove existing elements even if refresh isn't available yet (to clean up manual injections)
        if (typeof document !== 'undefined') {
          document.querySelector('.jjc-navbar')?.remove();
          document.querySelector('.jjc-footer')?.remove();
        }

        await loadScriptOnce('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'jjc-site-script-supabase');
        if (cancelled) return;
        await loadScriptOnce('/jjc-default-config.js', 'jjc-site-script-config');
        if (cancelled) return;
        await loadScriptOnce('/navbar.js', 'jjc-site-script-navbar');
      } catch (e) {
        console.warn('[LegacyJjconnectNavbar] script load:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
