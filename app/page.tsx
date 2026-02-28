/**
 * Homepage - Article Listing
 * Displays latest posts with filtering by category
 */

import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Post, Category } from '@/types/database';

// Extend Post type with relations
interface PostWithAuthor extends Post {
  author: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  category?: {
    name: string;
    slug: string;
  } | null;
}

interface CategoryWithPosts extends Category {
  posts: PostWithAuthor[];
}

interface PageProps {
  searchParams: {
    category?: string;
  };
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * 获取最新文章列表
 * @param limit - 返回文章数量，默认 10
 * @param categoryId - 可选的分类 ID 过滤
 */
async function getLatestPosts(
  limit = 10, 
  categoryId?: string
): Promise<PostWithAuthor[]> {
  const supabase = await createServerSupabaseClient();
  
  let query = supabase
    .from('posts')
    .select(`
      *,
      author:profiles(display_name, avatar_url),
      category:categories(name, slug)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  // 如果提供了分类 ID，添加过滤
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch latest posts:', error);
    return [];
  }
  
  return data || [];
}

/**
 * 通过 slug 获取分类信息
 */
async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) {
    console.error('Failed to fetch category:', error);
    return null;
  }
  
  return data;
}

/**
 * 获取分类及其文章列表
 */
async function getCategoriesWithPosts(): Promise<CategoryWithPosts[]> {
  const supabase = await createServerSupabaseClient();
  
  // Get all categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (categoriesError || !categories) {
    console.error('Failed to fetch categories:', categoriesError);
    return [];
  }
  
  // Get posts for each category
  const categoriesWithPosts = await Promise.all(
    categories.map(async (category) => {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(display_name, avatar_url),
          category:categories(name, slug)
        `)
        .eq('status', 'published')
        .eq('category_id', category.id)
        .order('created_at', { ascending: false })
        .limit(4);
      
      return {
        ...category,
        posts: posts || [],
      };
    })
  );
  
  // Filter out categories with no posts
  return categoriesWithPosts.filter(cat => cat.posts.length > 0);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default async function HomePage({ searchParams }: PageProps) {
  // 获取分类过滤参数
  const categorySlug = searchParams.category;
  
  // 如果有分类过滤，先获取分类信息
  let currentCategory: Category | null = null;
  if (categorySlug) {
    currentCategory = await getCategoryBySlug(categorySlug);
  }
  
  // 获取文章列表（如果有分类，则按分类过滤）
  const latestPosts = await getLatestPosts(10, currentCategory?.id);
  
  // 仅在无过滤时获取分类列表
  const categoriesWithPosts = !categorySlug ? await getCategoriesWithPosts() : [];

  return (
    <div className="space-y-8">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
          欢迎来到 JJConnect
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          日本人社区 - 分享知识、交流经验、探索可能
        </p>
      </section>

      {/* Category Filter Indicator */}
      {currentCategory && (
        <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm text-gray-600">
            正在浏览分类：<span className="font-semibold text-gray-900">{currentCategory.name}</span>
          </span>
          <Link
            href="/"
            className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            清除过滤 ×
          </Link>
        </div>
      )}

      {/* Latest Posts Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentCategory ? `${currentCategory.name} - 最新文章` : '最新发布'}
          </h2>
          {!currentCategory && (
            <Link
              href="/posts"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
            >
              查看全部
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
        
        {latestPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {latestPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState message={currentCategory ? `${currentCategory.name} 分类暂无文章` : '暂无文章'} />
        )}
      </section>

      {/* Categories Sections - Only show when not filtering */}
      {!categorySlug && categoriesWithPosts.length > 0 && (
        <>
          {categoriesWithPosts.map((category) => (
            <section key={category.id}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
                <Link
                  href={`/?category=${category.slug}`}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                >
                  查看全部
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {/* CTA Section - Only show when not filtering */}
      {!categorySlug && (
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-center text-white shadow-xl">
          <h2 className="text-3xl font-bold mb-4">
            开始分享你的故事
          </h2>
          <p className="text-lg mb-6 text-blue-100">
            加入我们的社区，与志同道合的朋友交流经验
          </p>
          <Link
            href="/publish"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl"
          >
            发布文章
          </Link>
        </section>
      )}

    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PostCardProps {
  post: PostWithAuthor;
}

function PostCard({ post }: PostCardProps) {
  // 格式化发布时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays} 天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200"
    >
      {/* Cover Image */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* 漂亮的付费阅读标签 - 右上角 */}
        {post.is_paid && (
          <div className="absolute top-3 right-3">
            <div className="relative">
              {/* 发光效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur-md opacity-75"></div>
              {/* 主标签 */}
              <div className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="tracking-wide">付费阅读</span>
              </div>
            </div>
          </div>
        )}

        {/* 分类标签（如果有） */}
        {post.category && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-block bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-medium shadow-md">
              {post.category.name}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* 标题 */}
        <h3 className="font-bold text-gray-900 text-lg line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors leading-snug">
          {post.title}
        </h3>
        
        {/* 摘要 */}
        {post.summary && (
          <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
            {post.summary}
          </p>
        )}

        {/* 底部信息栏 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {/* 作者信息 */}
          <div className="flex items-center gap-2">
            {post.author?.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={post.author.display_name || ''}
                className="w-6 h-6 rounded-full ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {post.author?.display_name?.[0]?.toUpperCase() || '匿'}
              </div>
            )}
            <span className="text-xs text-gray-600 font-medium">
              {post.author?.display_name || '匿名用户'}
            </span>
          </div>
          
          {/* 价格（付费文章） */}
          {post.is_paid && (
            <span className="font-bold text-orange-600 text-sm flex items-center gap-1">
              <span className="text-xs">¥</span>
              {post.price}
            </span>
          )}
        </div>

        {/* 发布时间 */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatDate(post.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 bg-white rounded-lg">
      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
