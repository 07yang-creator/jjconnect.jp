'use client';

/**
 * Right Sidebar Component
 * 
 * 功能：
 * - 搜索栏
 * - 官方分类导航（从 categories 表读取）
 * - 授权用户管理入口
 * - 响应式设计（移动端隐藏）
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient, Env } from '@/src/lib/supabase';
import type { Category, Profile } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

interface RightSidebarProps {
  env: Env;
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RightSidebar({ env, user }: RightSidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 获取分类和用户信息
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = getSupabaseClient(env);

        // 获取官方分类
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

        if (categoriesError) {
          console.error('Failed to fetch categories:', categoriesError);
        } else {
          setCategories(categoriesData || []);
        }

        // 如果用户已登录，获取用户资料
        if (user?.id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, is_authorized')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Failed to fetch user profile:', profileError);
          } else {
            setUserProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [env, user]);

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      {/* 桌面端右侧边栏 - 固定位置，透明模糊背景 */}
      <aside 
        className="hidden md:block fixed right-0 top-0 h-screen w-[260px] bg-white/80 backdrop-blur-md border-l border-gray-200/50 shadow-lg overflow-y-auto z-40"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="p-5 space-y-6">
          
          {/* 搜索栏 */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              搜索
            </h3>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索内容..."
                className="w-full px-4 py-2.5 pl-10 text-sm bg-white/90 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
              />
              <button
                type="submit"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                aria-label="搜索"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </section>

          {/* 官方板块分类 */}
          {!isLoading && categories.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                官方板块
              </h3>
            <nav className="space-y-1">
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={`/?category=${category.slug}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50/80 text-gray-700 hover:text-blue-600 transition-all duration-200 group"
                  title={category.description || category.name}
                >
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 group-hover:scale-125 transition-transform"></span>
                    <span className="text-sm font-medium truncate">
                      {category.name}
                    </span>
                  </a>
                ))}
              </nav>
            </section>
          )}

          {/* 授权用户入口 */}
          {user && userProfile?.is_authorized && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                管理中心
              </h3>
              <nav className="space-y-1">
                <a
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 hover:text-purple-900 transition-all duration-200 group shadow-sm"
                  title="我的管理主页"
                >
                  <svg className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold">
                    我的管理主页
                  </span>
                </a>

                <a
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50/80 text-gray-700 hover:text-gray-900 transition-all duration-200 group"
                  title="管理后台"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">
                    管理后台
                  </span>
                </a>

                <a
                  href="/publish"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-green-50/80 text-gray-700 hover:text-green-600 transition-all duration-200 group"
                  title="发布内容"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">
                    发布内容
                  </span>
                </a>
              </nav>
            </section>
          )}

          {/* 登录提示（未登录用户） */}
          {!user && (
            <section className="space-y-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-blue-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  加入我们
                </h4>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  登录后即可发布内容、关注作者、参与讨论
                </p>
                <a
                  href="/login.html"
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all hover:shadow-md"
                >
                  立即登录
                </a>
              </div>
            </section>
          )}

          {/* 用户信息（已登录但非授权用户） */}
          {user && !userProfile?.is_authorized && (
            <section className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {userProfile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userProfile?.display_name || '用户'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <a
                  href="/profile"
                  className="block w-full text-center bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg border border-gray-300 transition-all"
                >
                  个人中心
                </a>
              </div>
            </section>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

        </div>
      </aside>

      {/* 移动端底部导航栏（替代右侧边栏） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-3">
          
          {/* 首页 */}
          <a
            href="/"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-gray-600">首页</span>
          </a>

          {/* 分类 */}
          <button
            onClick={() => {
              // 可以实现一个弹出的分类菜单
              const modal = document.getElementById('mobile-categories-modal');
              if (modal) modal.classList.remove('hidden');
            }}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs text-gray-600">分类</span>
          </button>

          {/* 搜索 */}
          <a
            href="/search"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs text-gray-600">搜索</span>
          </a>

          {/* 我的 / 登录 */}
          {user ? (
            userProfile?.is_authorized ? (
              <a
                href="/dashboard"
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-purple-600 font-semibold">管理</span>
              </a>
            ) : (
              <a
                href="/profile"
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs text-gray-600">我的</span>
              </a>
            )
          ) : (
            <a
              href="/login.html"
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="text-xs text-blue-600">登录</span>
            </a>
          )}
        </div>
      </nav>

      {/* 移动端分类模态框 */}
      <div
        id="mobile-categories-modal"
        className="md:hidden hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.classList.add('hidden');
          }
        }}
      >
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto animate-slide-up">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">官方分类</h3>
            <button
              onClick={() => {
                const modal = document.getElementById('mobile-categories-modal');
                if (modal) modal.classList.add('hidden');
              }}
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
                href={`/category/${category.slug}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-sm font-medium">{category.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
