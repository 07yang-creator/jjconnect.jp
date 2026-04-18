import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  /**
   * Backup apex → www (middleware does this first for all paths on `jjconnect.jp`, including `/_next/static`).
   * Keep Vercel Domains apex configured to redirect as well.
   */
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
