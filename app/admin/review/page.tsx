/**
 * Admin Review Page
 * 显示所有待审核（review_state = 'pending' 且 status = 'draft'）的文章，
 * 并提供 Approve / Reject 操作。
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient, getCurrentUser, isAuthorizedUser } from '@/lib/supabase/server';

interface ReviewPost {
  id: string;
  title: string;
  category_id: string | null;
  cover_image: string | null;
  created_at: string;
  content: {
    html?: string;
    review_state?: string;
  };
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  category?: {
    name: string;
    slug: string;
  } | null;
}

async function fetchPendingPosts(): Promise<ReviewPost[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
        id,
        title,
        category_id,
        content,
        cover_image,
        created_at,
        author:profiles(display_name, avatar_url),
        category:categories(name, slug)
      `,
    )
    .eq('status', 'draft')
    .filter('content->>review_state', 'eq', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending posts:', error);
    return [];
  }

  return (data as unknown as ReviewPost[]) || [];
}

async function updateReviewStatus(postId: string, action: 'approve' | 'reject', reason?: string | null) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const authorized = await isAuthorizedUser(user.id);
  if (!authorized) {
    redirect('/');
  }

  const supabase = await createServerSupabaseClient();

  // 读取当前内容以更新 review_state
  const { data: existing, error } = await supabase
    .from('posts')
    .select('content')
    .eq('id', postId)
    .single();

  if (error || !existing) {
    console.error('Failed to load post for review update:', error);
    return;
  }

  const currentContent = (existing.content || {}) as any;
  const updatedContent = {
    ...currentContent,
    review_state: action === 'approve' ? 'approved' : 'rejected',
    review_reason: action === 'reject' ? reason || null : currentContent.review_reason ?? null,
  };

  const updateData: any = {
    content: updatedContent,
  };

  if (action === 'approve') {
    updateData.status = 'published';
  } else if (action === 'reject') {
    updateData.status = 'draft';
  }

  const { error: updateError } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId);

  if (updateError) {
    console.error('Failed to update review status:', updateError);
  }
}

export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams?: {
    categoryId?: string;
    author?: string;
  };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const authorized = await isAuthorizedUser(user.id);
  if (!authorized) {
    redirect('/');
  }

  const rawPosts = await fetchPendingPosts();

  const categoryIdFilter = searchParams?.categoryId || '';
  const authorFilter = searchParams?.author?.trim() || '';

  const posts = rawPosts.filter((post) => {
    const byCategory =
      !categoryIdFilter || (post.category_id && post.category_id === categoryIdFilter);
    const byAuthor =
      !authorFilter ||
      (post.author?.display_name &&
        post.author.display_name.toLowerCase().includes(authorFilter.toLowerCase()));
    return byCategory && byAuthor;
  });

  // 过滤选项：从当前待审核文章中提取可选分类和作者
  const uniqueCategories = Array.from(
    new Map(
      posts
        .filter((p) => p.category_id && p.category)
        .map((p) => [p.category_id as string, { id: p.category_id as string, name: p.category!.name }]),
    ).values(),
  );
  const uniqueAuthors = Array.from(
    new Map(
      posts
        .filter((p) => p.author?.display_name)
        .map((p) => [p.author!.display_name as string, p.author!.display_name as string]),
    ).values(),
  );

  async function handleApprove(formData: FormData) {
    'use server';
    const postId = formData.get('postId') as string;
    if (!postId) return;
    await updateReviewStatus(postId, 'approve', null);
  }

  async function handleReject(formData: FormData) {
    'use server';
    const postId = formData.get('postId') as string;
    if (!postId) return;
    const reasonRaw = (formData.get('reason') as string | null) ?? '';
    const reason = reasonRaw.trim() || null;
    await updateReviewStatus(postId, 'reject', reason);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">待审核文章</h1>
              <p className="text-sm text-gray-500 mt-1">
                当前仅显示 review_state = pending 且状态为 draft 的文章。
              </p>
            </div>
          </div>

          {/* 简单的分类 / 作者过滤（基于当前列表） */}
          {(uniqueCategories.length > 0 || uniqueAuthors.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-gray-500">筛选：</span>
              <form className="flex flex-wrap items-center gap-3 w-full sm:w-auto" method="get">
                {uniqueCategories.length > 0 && (
                  <label className="flex items-center gap-2 text-gray-700">
                    <span className="whitespace-nowrap">分类</span>
                    <select
                      name="categoryId"
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      defaultValue={categoryIdFilter}
                    >
                      <option value="">全部</option>
                      {uniqueCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {uniqueAuthors.length > 0 && (
                  <label className="flex items-center gap-2 text-gray-700">
                    <span className="whitespace-nowrap">作者</span>
                    <select
                      name="author"
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      defaultValue={authorFilter}
                    >
                      <option value="">全部</option>
                      {uniqueAuthors.map((name) => (
                        <option key={name} value={name || ''}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </form>
            </div>
          )}
        </header>

        {posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-200 p-10 text-center text-gray-500">
            暂无待审核的文章。
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex gap-4 items-start"
              >
                {post.cover_image && (
                  <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h2 className="font-semibold text-gray-900 truncate">
                      {post.title}
                    </h2>
                    <span className="text-xs text-gray-400">
                      {new Date(post.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>

                  {post.author && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      {post.author.avatar_url ? (
                        <img
                          src={post.author.avatar_url}
                          alt={post.author.display_name || ''}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">
                          {post.author.display_name?.[0]?.toUpperCase() || '匿'}
                        </div>
                      )}
                      <span>{post.author.display_name || '匿名作者'}</span>
                    </div>
                  )}

                  {post.category && (
                    <p className="mt-1 text-xs text-gray-500">
                      分类：<span className="font-medium">{post.category.name}</span>
                    </p>
                  )}

                  {post.content?.html && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {post.content.html.replace(/<[^>]+>/g, '').slice(0, 140)}…
                    </p>
                  )}

                  <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
                    {/* 驳回理由输入框（可选） */}
                    <form action={handleReject} className="flex-1 min-w-0 space-y-2">
                      <input type="hidden" name="postId" value={post.id} />
                      <label className="block text-xs text-gray-600">
                        驳回理由（可选）
                        <textarea
                          name="reason"
                          rows={2}
                          placeholder="例如：内容不符合栏目定位，请调整后再提交。"
                          className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none"
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </form>

                    <form action={handleApprove}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

