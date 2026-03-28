/**
 * Homepage — article listing with optional category filter.
 */

import Link from 'next/link';
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server';
import type { Post, Category } from '@/types/database';
import { getCoverImageUrl } from '@/lib/cloudflare-image-url';
import { categoryDisplayName } from '@/lib/categories/displayName';

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
  searchParams: Promise<{
    category?: string;
  }>;
}

// ============================================================================
// Data fetching
// ============================================================================

/** Latest published posts, optionally filtered by category id. */
async function getLatestPosts(
  limit = 10, 
  categoryId?: string
): Promise<PostWithAuthor[]> {
  const supabase = await createServerSupabaseClient();
  
  let query = supabase
    .from('posts')
    .select(`
      id,
      title,
      brief,
      topic,
      status,
      cover_image,
      created_at,
      author_id
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch latest posts:', error);
    return [];
  }

  return (data as unknown as PostWithAuthor[]) || [];
}

/** Category row by slug. */
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

/** Categories that have at least one published post, with a few posts each. */
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
          id,
          title,
          brief,
          topic,
          status,
          cover_image,
          created_at,
          author_id
        `)
        .eq('status', 'published')
        .eq('category_id', category.id)
        .order('created_at', { ascending: false })
        .limit(4);
      
      return {
        ...category,
        posts: (posts as unknown as PostWithAuthor[]) || [],
      };
    })
  );
  
  return categoriesWithPosts.filter(cat => cat.posts.length > 0);
}

const PUBLISH_PATH = '/publish';

function postStoryHref(isLoggedIn: boolean): string {
  return isLoggedIn
    ? PUBLISH_PATH
    : `/login?next=${encodeURIComponent(PUBLISH_PATH)}`;
}

// ============================================================================
// Page
// ============================================================================

export default async function HomePage({ searchParams }: PageProps) {
  const { category: categorySlug } = await searchParams;

  let currentCategory: Category | null = null;
  if (categorySlug) {
    currentCategory = await getCategoryBySlug(categorySlug);
  }

  const latestPosts = await getLatestPosts(10, currentCategory?.id);
  const categoriesWithPosts = !categorySlug ? await getCategoriesWithPosts() : [];

  const user = await getCurrentUser();
  const isLoggedIn = Boolean(user);

  return (
    <div className="space-y-8">
      
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
          Welcome to JJConnect
        </h1>
        <p className="text-lg text-gray-600">
          A community for sharing knowledge, swapping ideas, and exploring what&apos;s possible together.
        </p>
      </section>

      {currentCategory && (
        <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm text-gray-600">
            Viewing category:{' '}
            <span className="font-semibold text-gray-900">
              {categoryDisplayName(currentCategory)}
            </span>
          </span>
          <Link
            href="/"
            className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filter ×
          </Link>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentCategory
              ? `${categoryDisplayName(currentCategory)} — latest`
              : 'Latest posts'}
          </h2>
        </div>

        {latestPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {latestPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState
            message={
              currentCategory
                ? `No posts in ${categoryDisplayName(currentCategory)} yet.`
                : 'No posts yet.'
            }
            isLoggedIn={isLoggedIn}
          />
        )}
      </section>

      {!categorySlug && categoriesWithPosts.length > 0 && (
        <>
          {categoriesWithPosts.map((category) => (
            <section key={category.id}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {categoryDisplayName(category)}
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
                  View all
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

      {!categorySlug && (
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl py-6 px-6 md:py-8 md:px-8 text-center text-white shadow-lg">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Share your story
          </h2>
          <p className="text-sm md:text-base mb-4 text-blue-100 max-w-xl mx-auto">
            Join the community and connect with people who care about the same topics.
          </p>
          <Link
            href={postStoryHref(isLoggedIn)}
            className="inline-block bg-white text-blue-600 text-sm font-semibold px-4 py-2 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
          >
            Post my story now
          </Link>
        </section>
      )}

    </div>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

interface PostCardProps {
  post: PostWithAuthor;
}

function PostCard({ post }: PostCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200"
    >
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {post.cover_image ? (
          <img
            src={getCoverImageUrl(post.cover_image, 'card')}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {post.is_paid && (
          <div className="absolute top-3 right-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur-md opacity-75"></div>
              <div className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="tracking-wide">Paid</span>
              </div>
            </div>
          </div>
        )}

        {post.category && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-block bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-medium shadow-md">
              {categoryDisplayName(post.category)}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors leading-snug">
          {post.title}
        </h3>

        {post.summary && (
          <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
            {post.summary}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {post.author?.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={post.author.display_name || ''}
                className="w-6 h-6 rounded-full ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {post.author?.display_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-xs text-gray-600 font-medium">
              {post.author?.display_name || 'Anonymous'}
            </span>
          </div>
          
          {post.is_paid && (
            <span className="font-bold text-orange-600 text-sm flex items-center gap-1">
              <span className="text-xs">¥</span>
              {post.price}
            </span>
          )}
        </div>

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

function EmptyState({ message, isLoggedIn }: { message: string; isLoggedIn: boolean }) {
  return (
    <div className="text-center py-12 bg-white rounded-lg">
      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-gray-500 mb-6">{message}</p>
      <Link
        href={postStoryHref(isLoggedIn)}
        className="inline-block bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        Post my story now
      </Link>
    </div>
  );
}
