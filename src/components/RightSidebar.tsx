'use client';

/**
 * Right sidebar: categories, admin shortcuts (authorized users), mobile nav.
 */

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { categoryDisplayName } from '@/lib/categories/displayName';
import type { Category } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

interface RightSidebarProps {
  user?: {
    id: string;
    email?: string;
  } | null;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  is_authorized: boolean;
}

function buildLoginHref(pathname: string, search: string): string {
  const pathWithQuery = pathname + (search ? `?${search}` : '');
  if (pathname === '/login' || pathname === '/login.html') return '/login';
  return `/login?next=${encodeURIComponent(pathWithQuery)}`;
}

function SidebarLoginLink({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const href = buildLoginHref(pathname, searchParams.toString());
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RightSidebar({ user }: RightSidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createBrowserClient();

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

        if (categoriesError) {
          console.error('Failed to fetch categories:', categoriesError);
        } else {
          setCategories(categoriesData || []);
        }

        if (user?.id) {
          const { data: profileData, error: profileError } = await supabase
            .schema('jjc')
            .from('profiles')
            .select('id, display_name, role_level')
            .eq('id', user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Failed to fetch user profile:', profileError);
          } else if (profileData) {
            setUserProfile({
              id: profileData.id,
              display_name: profileData.display_name,
              is_authorized: profileData.role_level === 'A',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user]);

  return (
    <>
      <aside
        className="hidden md:block fixed right-0 top-0 h-screen w-[260px] bg-white/80 backdrop-blur-md border-l border-gray-200/50 shadow-lg overflow-y-auto z-40"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="p-5 space-y-6">

          {!isLoading && categories.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Categories
              </h3>
              <nav className="space-y-1">
                {categories.map((category) => (
                  <a
                    key={category.id}
                    href={`/?category=${category.slug}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50/80 text-gray-700 hover:text-blue-600 transition-all duration-200 group"
                    title={category.description || categoryDisplayName(category)}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 group-hover:scale-125 transition-transform"></span>
                    <span className="text-sm font-medium truncate">
                      {categoryDisplayName(category)}
                    </span>
                  </a>
                ))}
              </nav>
            </section>
          )}

          {!isLoading && user && userProfile?.is_authorized && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin
              </h3>
              <nav className="space-y-1">
                <a
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 hover:text-purple-900 transition-all duration-200 group shadow-sm"
                  title="Dashboard"
                >
                  <svg className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold">Dashboard</span>
                </a>

                <a
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50/80 text-gray-700 hover:text-gray-900 transition-all duration-200 group"
                  title="Admin console"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">Admin console</span>
                </a>
              </nav>
            </section>
          )}

          {!isLoading && !user && (
            <section className="space-y-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-blue-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Join JJConnect</h4>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Sign in to access member content and tools.
                </p>
                <Suspense
                  fallback={
                    <a
                      href="/login"
                      className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all hover:shadow-md"
                    >
                      Sign in
                    </a>
                  }
                >
                  <SidebarLoginLink className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all hover:shadow-md">
                    Sign in
                  </SidebarLoginLink>
                </Suspense>
              </div>
            </section>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg z-50 pb-safe">
        <div className="flex items-center justify-around px-2 py-3">

          <button
            onClick={() => setIsCategoriesModalOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs text-gray-600">Topics</span>
          </button>

          {user ? (
            userProfile?.is_authorized ? (
              <a href="/dashboard" className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-purple-600 font-semibold">Admin</span>
              </a>
            ) : null
          ) : (
            <Suspense
              fallback={
                <a href="/login" className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-xs text-blue-600">Sign in</span>
                </a>
              }
            >
              <SidebarLoginLink className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="text-xs text-blue-600">Sign in</span>
              </SidebarLoginLink>
            </Suspense>
          )}
        </div>
      </nav>

      {isCategoriesModalOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCategoriesModalOpen(false);
          }}
        >
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
              <button
                onClick={() => setIsCategoriesModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-2">
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={`/?category=${category.slug}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={() => setIsCategoriesModalOpen(false)}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-sm font-medium">{categoryDisplayName(category)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
