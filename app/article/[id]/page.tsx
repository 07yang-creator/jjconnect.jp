import Link from 'next/link';
import { notFound } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server';
import { getCoverImageUrl } from '@/lib/cloudflare-image-url';
import { tiptapJsonToHtml } from '@/lib/tiptap-json-to-html';
import type { PostContent } from '@/types/database';
import ArticleToast from './ArticleToast';

type ArticleRow = {
  id: string;
  title: string;
  content: unknown;
  brief: string | null;
  topic: string | null;
  status: string;
  access_tier: string | null;
  author_id: string;
  cover_image: string | null;
  created_at: string;
  author: { display_name: string | null } | null;
};

function renderContent(content: unknown): string {
  if (!content) return '';

  let raw = '';
  if (typeof content === 'string') {
    raw = content;
  } else {
    const c = content as PostContent & { html?: string };
    if (c.html && typeof c.html === 'string') {
      raw = c.html;
    } else if (c.type === 'doc' && Array.isArray(c.content)) {
      raw = tiptapJsonToHtml(content as PostContent);
    }
  }

  if (!raw) return '';

  return sanitizeHtml(raw, {
    allowedTags: [
      'p', 'br',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'strong', 'em', 's', 'u',
      'a', 'img', 'hr',
      'div', 'span',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'class', 'loading'],
      code: ['class'],
      div: ['class'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

async function getCurrentRole(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    return 'ANON';
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('role, role_level')
    .eq('id', user.id)
    .single();

  return (data?.role_level || data?.role || 'T') as string;
}

async function getArticle(id: string): Promise<ArticleRow | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, title, content, brief, topic, status, access_tier, author_id, cover_image, created_at,
      author:profiles(display_name)
    `)
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;
  return data as unknown as ArticleRow;
}

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const [article, role] = await Promise.all([getArticle(id), getCurrentRole()]);

  if (!article) {
    notFound();
  }

  const bodyHtml = renderContent(article.content);
  const showToast = role === 'ANON' || role === 'T';
  const createdAt = new Date(article.created_at);

  return (
    <div className="min-h-screen bg-gray-50">
      <ArticleToast postId={article.id} enabled={showToast} />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Link
          href="/home.html"
          className="mb-6 inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back
        </Link>

        <article className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          {article.cover_image && (
            <img
              src={getCoverImageUrl(article.cover_image, 'detail')}
              alt={article.title}
              className="mb-6 h-auto w-full rounded-lg object-cover"
              loading="lazy"
              decoding="async"
            />
          )}

          <header className="mb-6">
            {article.topic && (
              <span className="mb-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {article.topic}
              </span>
            )}
            <h1 className="mb-3 text-3xl font-bold leading-tight text-gray-900">{article.title}</h1>
            <div className="text-sm text-gray-500">
              <span>{article.author?.display_name || 'Anonymous'}</span>
              <span className="mx-2">•</span>
              <span>{createdAt.toLocaleDateString('en-US')}</span>
            </div>
          </header>

          <div
            className="prose prose-sm sm:prose lg:prose-lg tiptap-content max-w-none text-gray-800"
            dangerouslySetInnerHTML={{
              __html: bodyHtml || '<p class="text-gray-500">This article has no content yet.</p>',
            }}
          />
        </article>
      </main>
    </div>
  );
}
