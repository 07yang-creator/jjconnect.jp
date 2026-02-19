/**
 * Right Sidebar Component
 * Displays search, categories, user shortcuts, and featured content
 */

import { createServerSupabaseClient, getCurrentUser, isAuthorizedUser } from '@/lib/supabase/server';
import type { Category } from '@/types/database';

// ============================================================================
// DATA FETCHING
// ============================================================================

async function getCategories(): Promise<Category[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getFeaturedPaidPosts() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        price,
        cover_image,
        author:profiles(display_name, avatar_url)
      `)
      .eq('status', 'published')
      .eq('is_paid', true)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Failed to fetch featured posts:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    return [];
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export async function RightSidebar() {
  const user = await getCurrentUser();
  const isAuthorized = user ? await isAuthorizedUser(user.id) : false;
  const categories = await getCategories();
  const featuredPosts = await getFeaturedPaidPosts();

  return (
    <aside className="fixed right-0 top-0 h-screen w-20 md:w-64 lg:w-80 bg-white border-l border-gray-200 overflow-y-auto z-40 transition-all duration-300">
      <div className="p-4 space-y-6">
        
        {/* Search Section */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:block">
            搜索
          </h3>
          <SearchBox />
        </section>

        {/* Categories Section */}
        {categories.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:block">
              官方分类
            </h3>
            <nav className="space-y-1">
              {categories.map((category) => (
                <CategoryLink key={category.id} category={category} />
              ))}
            </nav>
          </section>
        )}

        {/* User Shortcuts (if authorized) */}
        {user && isAuthorized && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:block">
              快捷入口
            </h3>
            <nav className="space-y-1">
              <a
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors group"
                title="管理我的记录"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium hidden md:block">
                  管理我的记录
                </span>
              </a>
              
              <a
                href="/posts/new"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-600 transition-colors group"
                title="发布文章"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium hidden md:block">
                  发布文章
                </span>
              </a>

              <a
                href="/profile/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors group"
                title="个人设置"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium hidden md:block">
                  个人设置
                </span>
              </a>
            </nav>
          </section>
        )}

        {/* Featured Paid Content */}
        {featuredPosts.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:block">
              精选专栏
            </h3>
            <div className="space-y-2">
              {featuredPosts.map((post) => (
                <FeaturedPostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* Login Prompt (if not logged in) */}
        {!user && (
          <section className="space-y-2">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 hidden md:block">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                加入我们
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                登录后即可发布内容、关注作者、参与讨论
              </p>
              <a
                href="/login.html"
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                立即登录
              </a>
            </div>
            
            {/* Mobile login icon */}
            <a
              href="/login.html"
              className="flex items-center justify-center md:hidden w-12 h-12 mx-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
              title="登录"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </a>
          </section>
        )}

      </div>
    </aside>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SearchBox() {
  return (
    <form action="/search" method="GET" className="relative">
      <input
        type="search"
        name="q"
        placeholder="搜索..."
        className="w-full px-3 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent hidden md:block"
      />
      <button
        type="submit"
        className="md:absolute md:left-3 md:top-1/2 md:-translate-y-1/2 w-12 h-12 md:w-auto md:h-auto mx-auto flex items-center justify-center md:inline-flex text-gray-400 hover:text-gray-600 bg-gray-100 md:bg-transparent rounded-full md:rounded-none"
        aria-label="搜索"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </form>
  );
}

interface CategoryLinkProps {
  category: Category;
}

function CategoryLink({ category }: CategoryLinkProps) {
  return (
    <a
      href={`/?category=${category.slug}`}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors group"
      title={category.description || category.name}
    >
      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
      <span className="text-sm font-medium truncate hidden md:block">
        {category.name}
      </span>
    </a>
  );
}

interface FeaturedPostCardProps {
  post: any;
}

function FeaturedPostCard({ post }: FeaturedPostCardProps) {
  return (
    <a
      href={`/posts/${post.id}`}
      className="block group hover:bg-gray-50 rounded-lg p-2 transition-colors hidden md:block"
    >
      {post.cover_image && (
        <div className="aspect-video w-full mb-2 rounded overflow-hidden bg-gray-200">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
        {post.title}
      </h4>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">
          {post.author?.display_name || '匿名'}
        </span>
        <span className="font-semibold text-orange-600">
          ¥{post.price}
        </span>
      </div>
    </a>
  );
}

// ============================================================================
// CLIENT-SIDE VERSION (for use in HTML files)
// ============================================================================

export function RightSidebarHTML() {
  return `
    <aside id="right-sidebar" class="fixed right-0 top-0 h-screen w-20 md:w-64 lg:w-80 bg-white border-l border-gray-200 overflow-y-auto z-40 transition-all duration-300">
      <div class="p-4 space-y-6">
        
        <!-- Search Section -->
        <section class="space-y-2">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:block">
            搜索
          </h3>
          <form action="/search" method="GET" class="relative">
            <input
              type="search"
              name="q"
              placeholder="搜索..."
              class="w-full px-3 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent hidden md:block"
            />
            <button
              type="submit"
              class="md:absolute md:left-3 md:top-1/2 md:-translate-y-1/2 w-12 h-12 md:w-auto md:h-auto mx-auto flex items-center justify-center md:inline-flex text-gray-400 hover:text-gray-600 bg-gray-100 md:bg-transparent rounded-full md:rounded-none"
              aria-label="搜索"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </section>

        <!-- Categories Section (populated by JS) -->
        <section class="space-y-2" id="categories-section">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:block">
            官方分类
          </h3>
          <nav class="space-y-1" id="categories-list">
            <!-- Categories will be loaded here -->
          </nav>
        </section>

        <!-- User Shortcuts (shown if authorized) -->
        <section class="space-y-2 hidden" id="user-shortcuts">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:block">
            快捷入口
          </h3>
          <nav class="space-y-1">
            <a href="/dashboard" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="text-sm font-medium hidden md:block">管理我的记录</span>
            </a>
            <a href="/posts/new" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-600 transition-colors">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span class="text-sm font-medium hidden md:block">发布文章</span>
            </a>
            <a href="/profile/settings" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="text-sm font-medium hidden md:block">个人设置</span>
            </a>
          </nav>
        </section>

        <!-- Featured Content (populated by JS) -->
        <section class="space-y-2" id="featured-section">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:block">
            精选专栏
          </h3>
          <div class="space-y-2" id="featured-list">
            <!-- Featured posts will be loaded here -->
          </div>
        </section>

        <!-- Login Prompt -->
        <section class="space-y-2" id="login-prompt">
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 hidden md:block">
            <h4 class="text-sm font-semibold text-gray-900 mb-2">加入我们</h4>
            <p class="text-xs text-gray-600 mb-3">登录后即可发布内容、关注作者、参与讨论</p>
            <a href="/login.html" class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
              立即登录
            </a>
          </div>
          <a href="/login.html" class="flex items-center justify-center md:hidden w-12 h-12 mx-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors" title="登录">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </a>
        </section>

      </div>
    </aside>
  `;
}
