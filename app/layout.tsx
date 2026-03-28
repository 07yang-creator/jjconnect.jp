import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import RightSidebar from '@/src/components/RightSidebar';
import LegacyJjconnectNavbar from '@/src/components/LegacyJjconnectNavbar';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JJConnect — community & stories',
  description: 'Share knowledge, connect with others, and publish your story.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className={inter.className}>
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
