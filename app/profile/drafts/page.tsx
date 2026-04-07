/**
 * Author draft list — edit, submit flow continues at /publish?edit=…
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { deletePost } from '@/app/actions/posts';
import { getCoverImageUrl } from '@/lib/cloudflare-image-url';
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server';
import type { PostContent } from '@/types/database';

async function withdrawDraft(formData: FormData) {
  'use server';
  const id = (formData.get('postId') as string)?.trim();
  if (!id) return;
  const result = await deletePost(id);
  if (!result.success) {
    console.error('withdrawDraft:', result.error);
  }
}

function reviewLabel(content: unknown): { text: string; className: string } {
  const rs = (content as PostContent | null)?.review_state;
  if (rs === 'pending') return { text: '审核中', className: 'bg-amber-100 text-amber-900' };
  if (rs === 'rejected') return { text: '已驳回', className: 'bg-red-100 text-red-800' };
  return { text: '草稿', className: 'bg-gray-100 text-gray-700' };
}

export default async function ProfileDraftsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=%2Fprofile%2Fdrafts');
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, content, updated_at, cover_image')
    .eq('author_id', user.id)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('profile/drafts:', error);
  }

  const rows = data ?? [];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">我的草稿</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              保存与修改在写作页完成；提交审核后请等待管理员处理。
            </p>
          </div>
          <Link
            href="/publish"
            className="shrink-0 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            新建文章
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-secondary)]">
            暂无草稿。
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const r = row as {
                id: string;
                title: string;
                content: unknown;
                updated_at: string;
                cover_image: string | null;
              };
              const badge = reviewLabel(r.content);
              const reason = (r.content as PostContent)?.review_reason;
              return (
                <li
                  key={r.id}
                  className="flex gap-4 items-start rounded-xl border border-[var(--border)] bg-[var(--bg-sidebar)] p-4"
                >
                  {r.cover_image ? (
                    <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <img
                        src={getCoverImageUrl(r.cover_image, 'card')}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-16 rounded-lg bg-gray-100 shrink-0" aria-hidden />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${badge.className}`}>
                        {badge.text}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {new Date(r.updated_at).toLocaleString('zh-CN', { hour12: false })}
                      </span>
                    </div>
                    <h2 className="font-semibold text-[var(--text-primary)] truncate">{r.title || 'Untitled'}</h2>
                    {reason ? (
                      <p className="text-xs text-red-600 mt-1 line-clamp-2">驳回说明：{reason}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/publish?edit=${encodeURIComponent(r.id)}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        继续编辑
                      </Link>
                      <form action={withdrawDraft}>
                        <input type="hidden" name="postId" value={r.id} />
                        <button
                          type="submit"
                          className="text-sm font-medium text-red-600 hover:underline"
                          title="删除此草稿"
                        >
                          撤回并删除
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
