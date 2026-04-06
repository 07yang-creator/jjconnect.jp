import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import RightSidebar from '@/src/components/RightSidebar';
import LegacyJjconnectNavbar from '@/src/components/LegacyJjconnectNavbar';
import { getCurrentUser } from '@/lib/auth';
import { getAuthProvider } from '@/lib/auth/provider';
import { getAuth0ConnectionMap, getAuth0DatabaseConnection } from '@/lib/auth0/connections';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  // Avoid preload hints for a font that often sits unused on the static marketing home (rewritten `/` → index.html).
  preload: false,
});

export const metadata: Metadata = {
  title: 'JJConnect — community & stories',
  description: 'Share knowledge, connect with others, and publish your story.',
  icons: {
    icon: [{ url: '/brand/jjconnect-navbar-logo.svg', type: 'image/svg+xml' }],
    shortcut: '/brand/jjconnect-navbar-logo.svg',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const authProvider = getAuthProvider();
  const publicCfg: Record<string, unknown> = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    authProvider,
    nextPublishUrl: (process.env.NEXT_PUBLIC_NEXT_PUBLISH_URL || '').trim(),
  };
  if (authProvider === 'auth0') {
    publicCfg.auth0Connections = getAuth0ConnectionMap();
    publicCfg.auth0DatabaseConnection = getAuth0DatabaseConnection();
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
window.JJCONNECT_CONFIG = Object.assign({}, window.JJCONNECT_CONFIG || {}, ${JSON.stringify(publicCfg)});
window.__JJC_SKIP_REMOTE_PUBLIC_CONFIG__ = true;
`.trim(),
          }}
        />
        <LegacyJjconnectNavbar />
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <div className="flex-1 flex relative">
            <main className="flex-1 md:mr-[260px] transition-all duration-300">
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </div>
            </main>

            <RightSidebar user={user} />
          </div>
        </div>
      </body>
    </html>
  );
}
