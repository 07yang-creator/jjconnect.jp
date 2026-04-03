/**
 * Search Page
 * Full-text search across post titles and summaries using Supabase ilike.
 */

import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Post } from '@/types/database';
import { getCoverImageUrl } from '@/lib/cloudflare-image-url';
import { categoryDisplayName } from '@/lib/categories/displayName';

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

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

async function searchPosts(query: string): Promise<PostWithAuthor[]> {
  if (!query.trim()) return [];
  const supabase = await createServerSupabaseClient();
  const term = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles(display_name, avatar_url),
      category:categories(name, slug)
    `)
    .eq('status', 'published')
    .or(`title.ilike.${term},summary.ilike.${term}`)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Search error:', error);
    return [];
  }
  return (data as unknown as PostWithAuthor[]) || [];
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || '';
  return {
    title: query ? `"${query}" 的搜索结果 - JJConnect` : '搜索 - JJConnect',
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || '';
  const results = await searchPosts(query);

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">搜索</h1>
        <form method="get" action="/search" className="flex gap-3">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="搜索文章标题或摘要..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus={!query}
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            搜索
          </button>
        </form>
      </section>

      {/* Results */}
      {query && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {results.length > 0
                ? `"${query}" 的搜索结果（${results.length} 篇）`
                : `未找到与 "${query}" 相关的文章`}
            </h2>
            {results.length > 0 && (
              <Link href="/feed" className="text-sm text-blue-600 hover:underline">
                返回首页
              </Link>
            )}
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((post) => (
                <SearchResultCard key={post.id} post={post} query={query} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500 mb-2">没有找到匹配的文章</p>
              <p className="text-sm text-gray-400">请尝试不同的关键词</p>
            </div>
          )}
        </section>
      )}

      {!query && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p>输入关键词开始搜索</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function highlightMatch(text: string, query: string): string {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-100 text-yellow-900 rounded px-0.5">$1</mark>');
}

function SearchResultCard({ post, query }: { post: PostWithAuthor; query: string }) {
  const highlightedTitle = highlightMatch(post.title, query);
  const highlightedSummary = post.summary ? highlightMatch(post.summary, query) : null;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-200 flex flex-col"
    >
      {/* Cover */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0">
        {post.cover_image ? (
          <img
            src={getCoverImageUrl(post.cover_image, 'card')}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {post.category && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-block bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
              {categoryDisplayName(post.category)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3
          className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors"
          dangerouslySetInnerHTML={{ __html: highlightedTitle }}
        />
        {highlightedSummary && (
          <p
            className="text-sm text-gray-600 line-clamp-2 mb-3 flex-1"
            dangerouslySetInnerHTML={{ __html: highlightedSummary }}
          />
        )}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 text-xs text-gray-400">
          <span>{post.author?.display_name || '匿名用户'}</span>
          <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
    </Link>
  );
}
