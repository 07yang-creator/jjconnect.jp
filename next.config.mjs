import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  /** Backup if a request reaches the app on apex; Vercel Domains should also 308 jjconnect.jp → www. */
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'jjconnect.jp' }],
        destination: 'https://www.jjconnect.jp/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      // Browsers request /favicon.ico by default; serve the same mark as the navbar SVG.
      { source: '/favicon.ico', destination: '/brand/jjconnect-navbar-logo.svg' },
    ];
  },
  async headers() {
    return [
      {
        source: '/admin_dashboard.html',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/admin-console.html',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
