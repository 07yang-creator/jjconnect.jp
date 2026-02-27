import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server';
import type { Post, PostContent } from '@/types/database';
import { tiptapJsonToHtml } from '@/lib/tiptap-json-to-html';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
}

export interface CommentAuthorProfile {
  display_name: string | null;
  avatar_url: string | null;
}

interface CommentNode extends Comment {
  children: CommentNode[];
}

function buildCommentTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach((c) => {
    map.set(c.id, { ...c, children: [] });
  });

  comments.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

async function getPost(id: string): Promise<Post | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return null;
  }

  return data as Post;
}

async function getComments(postId: string): Promise<Comment[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, content, parent_id, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Comment[];
}

async function getProfilesForUserIds(
  userIds: string[]
): Promise<Record<string, CommentAuthorProfile>> {
  if (userIds.length === 0) return {};
  const supabase = await createServerSupabaseClient();
  const unique = [...new Set(userIds)];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', unique);

  if (error || !data) return {};
  const map: Record<string, CommentAuthorProfile> = {};
  for (const row of data as Array<{ id: string; display_name: string | null; avatar_url: string | null }>) {
    map[row.id] = { display_name: row.display_name, avatar_url: row.avatar_url };
  }
  return map;
}

/** Render post body: prefer stored HTML, else TipTap JSON → HTML, else fallback. */
function renderPostContent(content: Post['content']): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  const c = content as PostContent & { html?: string };
  if (c.html && typeof c.html === 'string') return c.html;
  if (c.type === 'doc' && Array.isArray(c.content)) {
    return tiptapJsonToHtml(content);
  }
  return '';
}

async function createComment(formData: FormData) {
  'use server';

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const postId = formData.get('postId') as string | null;
  const rawContent = (formData.get('content') as string | null) ?? '';
  const content = rawContent.trim();
  const parentIdRaw = (formData.get('parentId') as string | null) || null;
  const parentId = parentIdRaw && parentIdRaw.length > 0 ? parentIdRaw : null;

  if (!postId || !content) {
    return;
  }

  // 简单长度限制，防止异常大文本撑爆页面 / 日志
  const MAX_COMMENT_LENGTH = 2000;
  if (content.length > MAX_COMMENT_LENGTH) {
    console.error('Comment too long, skipped insert');
    return;
  }

  const supabase = await createServerSupabaseClient();

  // 简单节流：同一用户 5 秒内只允许一条评论，防止误触连点
  try {
    const { data: recent } = await supabase
      .from('comments')
      .select('id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recent && recent.length > 0 && recent[0].created_at) {
      const last = new Date(recent[0].created_at as unknown as string).getTime();
      const now = Date.now();
      const diffMs = now - last;
      if (diffMs >= 0 && diffMs < 5000) {
        console.warn('Comment throttled: user posting too fast');
        return;
      }
    }
  } catch (throttleError) {
    console.error('Comment throttle check failed:', throttleError);
    // 出错时不阻塞评论，只继续尝试插入
  }

  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    user_id: user.id,
    content,
    parent_id: parentId,
  });

  if (error) {
    console.error('Failed to create comment:', error);
    return;
  }

  revalidatePath(`/posts/${postId}`);
}

interface PostPageProps {
  params: { id: string };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = params;

  const [post, comments, currentUser] = await Promise.all([
    getPost(id),
    getComments(id),
    getCurrentUser(),
  ]);

  if (!post) {
    notFound();
  }

  const commentTree = buildCommentTree(comments);
  const authorIds = [...new Set(comments.map((c) => c.user_id))];
  const profilesMap = await getProfilesForUserIds(authorIds);
  const bodyHtml = renderPostContent(post.content);

  const createdAt = new Date(post.created_at);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10 w-full min-w-0">
        {/* Article content */}
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-10 overflow-hidden">
          <header className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {post.title}
            </h1>
            <p className="text-xs text-gray-500">
              {createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Tokyo' })}
            </p>
          </header>

          {post.cover_image && (
            <div className="mb-6">
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full rounded-lg object-cover"
              />
            </div>
          )}

          {/* Rich text: stored HTML or TipTap JSON → HTML */}
          <div
            className="prose prose-sm sm:prose lg:prose-lg max-w-none text-gray-800 tiptap-content overflow-x-auto"
            dangerouslySetInnerHTML={{
              __html: bodyHtml || '<p class="text-gray-500">本文内容暂时无法展示。</p>',
            }}
          />
        </article>

        {/* Comments section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 overflow-hidden">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">评论</h2>

          {/* New comment form */}
          {currentUser ? (
            <form action={createComment} className="mb-6 space-y-3">
              <input type="hidden" name="postId" value={post.id} />
              <textarea
                name="content"
                rows={3}
                placeholder="发表你的看法……"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  发表评论
                </button>
              </div>
            </form>
          ) : (
            <p className="mb-6 text-sm text-gray-500">
              请先
              <a
                href="/login"
                className="text-blue-600 hover:underline mx-1"
              >
                登录
              </a>
              后再发表评论。
            </p>
          )}

          {/* Comment list */}
          {commentTree.length === 0 ? (
            <p className="text-sm text-gray-500">还没有评论，快来抢沙发～</p>
          ) : (
            <div className="space-y-4">
              {commentTree.map((node) => (
                <CommentItem
                  key={node.id}
                  node={node}
                  depth={0}
                  canReply={!!currentUser}
                  postId={post.id}
                  profilesMap={profilesMap}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  canReply: boolean;
  postId: string;
  profilesMap: Record<string, CommentAuthorProfile>;
}

function CommentItem({ node, depth, canReply, postId, profilesMap }: CommentItemProps) {
  const createdAt = new Date(node.created_at);
  const profile = profilesMap[node.user_id];
  const displayName = profile?.display_name?.trim() || `用户 ${node.user_id.slice(0, 8)}`;
  const avatarUrl = profile?.avatar_url;

  return (
    <div className={depth === 0 ? '' : 'ml-3 sm:ml-6'}>
      <div className="border border-gray-100 rounded-lg p-2.5 sm:p-3 bg-gray-50 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-medium bg-blue-500"
                aria-hidden
              >
                {displayName[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-sm font-medium text-gray-800 truncate">
              {displayName}
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-gray-400 flex-shrink-0">
            {createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Tokyo' })}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap break-words">
          {node.content}
        </p>
        {canReply && depth < 3 && (
          <details className="mt-2">
            <summary className="text-xs text-blue-600 cursor-pointer select-none">
              回复
            </summary>
            <form action={createComment} className="mt-2 space-y-2">
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="parentId" value={node.id} />
              <textarea
                name="content"
                rows={2}
                placeholder="写下你的回复……"
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                >
                  发送
                </button>
              </div>
            </form>
          </details>
        )}
      </div>

      {node.children.length > 0 && (
        <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3 border-l border-gray-200 pl-2 sm:pl-3">
          {node.children.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              depth={depth + 1}
              canReply={canReply}
              postId={postId}
              profilesMap={profilesMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

