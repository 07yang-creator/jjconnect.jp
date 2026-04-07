/**
 * Publish Form - Client component for article publishing
 * Requires authenticated user (checked by parent page)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';
import {
  createPost,
  savePublishDraft,
  submitPostForReview,
  updatePost,
  type AuthorEditablePost,
} from '@/app/actions/posts';
import { SUPPORT_PAGE_PATH } from '@/lib/support';
import { createBrowserClient } from '@/lib/supabase/client';
import { categoryDisplayName } from '@/lib/categories/displayName';
import type { Category, UserCategory } from '@/types/database';
import TipTapBasicEditor from '@/src/components/TipTapBasicEditor';
import type { Editor, JSONContent } from '@tiptap/core';

// ============================================================================
// SETTINGS PANEL (hoisted outside PublishForm to avoid remount on every render)
// ============================================================================

interface SettingsPanelProps {
  coverPreview: string;
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverRemove: () => void;
  summary: string;
  setSummary: (v: string) => void;
  categoryType: 'official' | 'personal';
  setCategoryType: (v: 'official' | 'personal') => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  categories: Category[];
  userCategories: UserCategory[];
  isAuthorized: boolean;
  isPaid: boolean;
  setIsPaid: (v: boolean) => void;
  price: string;
  setPrice: (v: string) => void;
  readOnly?: boolean;
}

function SettingsPanel({
  coverPreview,
  onCoverChange,
  onCoverRemove,
  summary,
  setSummary,
  categoryType,
  setCategoryType,
  selectedCategory,
  setSelectedCategory,
  categories,
  userCategories,
  isAuthorized,
  isPaid,
  setIsPaid,
  price,
  setPrice,
  readOnly = false,
}: SettingsPanelProps) {
  return (
    <div className={`space-y-4 ${readOnly ? 'opacity-70 pointer-events-none' : ''}`}>
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">封面图片</label>
        {coverPreview ? (
          <div className="relative">
            <img src={coverPreview} alt="Cover preview" className="w-full h-40 object-cover rounded-[var(--radius)]" />
            <button type="button" onClick={onCoverRemove} className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">移除</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] rounded-[var(--radius)] cursor-pointer hover:border-blue-400 transition-colors">
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-xs text-[var(--text-secondary)]">点击上传</span>
            <input type="file" accept="image/*" onChange={onCoverChange} className="hidden" disabled={readOnly} />
          </label>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">摘要</label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="简要描述..." rows={2} readOnly={readOnly} className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">分类</label>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => { setCategoryType('official'); setSelectedCategory(''); }} className={`flex-1 py-1.5 px-3 rounded-[var(--radius)] text-sm font-medium ${categoryType === 'official' ? 'bg-blue-600 text-white' : 'bg-[var(--hover)] text-[var(--text-primary)]'}`}>官方</button>
          {isAuthorized && <button type="button" onClick={() => { setCategoryType('personal'); setSelectedCategory(''); }} className={`flex-1 py-1.5 px-3 rounded-[var(--radius)] text-sm font-medium ${categoryType === 'personal' ? 'bg-blue-600 text-white' : 'bg-[var(--hover)] text-[var(--text-primary)]'}`}>个人</button>}
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} disabled={readOnly} className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm">
          <option value="">请选择...</option>
          {categoryType === 'official'
            ? categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryDisplayName(c)}
                </option>
              ))
            : userCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">付费内容</span>
          <button type="button" onClick={() => setIsPaid(!isPaid)} disabled={readOnly} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPaid ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isPaid ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
        {isPaid && (
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="0.01" required={isPaid} readOnly={readOnly} className="w-full pl-6 pr-2 py-1.5 border border-[var(--border)] rounded-[var(--radius)] text-sm" />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PublishForm({
  useAuth0Identity = false,
  canPublishDirectly = false,
  initialPost = null,
}: {
  /** Server-resolved: when true, always load identity from `/api/me` (Auth0-mapped user). */
  useAuth0Identity?: boolean;
  /** Admins may publish without going through review. */
  canPublishDirectly?: boolean;
  /** Hydrate editor from an existing draft (`/publish?edit=…`). */
  initialPost?: AuthorEditablePost | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryType, setCategoryType] = useState<'official' | 'personal'>('official');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<string>('0');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [dbPostId, setDbPostId] = useState<string | null>(initialPost?.id ?? null);
  const [reviewState, setReviewState] = useState<AuthorEditablePost['review_state']>(
    initialPost?.review_state ?? null
  );
  const [reviewReason, setReviewReason] = useState<string | null>(initialPost?.review_reason ?? null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRev, setPreviewRev] = useState(0);
  const serverHydratedRef = useRef(false);

  // Draft storage key is user-scoped to prevent cross-user data leakage
  const getDraftKey = (uid: string) => `jjconnect-publish-draft-${uid}`;

  const reviewPending = reviewState === 'pending';
  const editorEditable = !reviewPending;

  useEffect(() => {
    setDbPostId(initialPost?.id ?? null);
    setReviewState(initialPost?.review_state ?? null);
    setReviewReason(initialPost?.review_reason ?? null);
    serverHydratedRef.current = false;
  }, [initialPost?.id, initialPost?.review_state, initialPost?.review_reason]);

  useEffect(() => {
    if (!editor || !initialPost || serverHydratedRef.current) return;
    serverHydratedRef.current = true;
    setTitle(initialPost.title === 'Untitled' ? '' : initialPost.title);
    setSummary(initialPost.summary || '');
    if (initialPost.user_category_id) {
      setCategoryType('personal');
      setSelectedCategory(initialPost.user_category_id);
    } else {
      setCategoryType('official');
      setSelectedCategory(initialPost.category_id || '');
    }
    setIsPaid(initialPost.is_paid);
    setPrice(String(initialPost.price ?? 0));
    if (initialPost.cover_image) {
      setCoverPreview(initialPost.cover_image);
    }
    const docContent = initialPost.content?.content;
    const doc: JSONContent =
      Array.isArray(docContent) && docContent.length > 0
        ? { type: 'doc', content: docContent as JSONContent[] }
        : { type: 'doc', content: [] };
    editor.commands.setContent(doc, { emitUpdate: false });
  }, [editor, initialPost]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => setPreviewRev((n) => n + 1);
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor]);

  let previewHtml = '';
  if (editor && showPreview) {
    void previewRev;
    previewHtml = sanitizeHtml(editor.getHTML(), {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title', 'width', 'height'],
        a: ['href', 'name', 'target', 'rel'],
      },
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createBrowserClient();
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (categoriesData) setCategories(categoriesData);

      const { data: { user } } = await supabase.auth.getUser();
      let resolvedUserId: string | null = user?.id ?? null;
      let resolvedAuthorized = false;
      let resolvedUserCategories: UserCategory[] = [];

      if (!resolvedUserId || useAuth0Identity) {
        const meRes = await fetch('/api/me', { credentials: 'include' });
        if (meRes.ok) {
          const meJson = await meRes.json();
          resolvedUserId = meJson?.userData?.id ?? null;
          resolvedAuthorized = meJson?.userData?.is_authorized === true;
          resolvedUserCategories = (meJson?.userCategories ?? []) as UserCategory[];
        }
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_authorized')
          .eq('id', resolvedUserId)
          .single();
        resolvedAuthorized = profile?.is_authorized || false;
        if (resolvedAuthorized) {
          const { data: userCategoriesData } = await supabase
            .from('user_categories')
            .select('*')
            .eq('user_id', resolvedUserId)
            .order('name');
          resolvedUserCategories = userCategoriesData ?? [];
        }
      }

      if (resolvedUserId) {
        setUserId(resolvedUserId);
        setIsAuthorized(resolvedAuthorized);
        setUserCategories(resolvedUserCategories);

        // Check for existing draft now that we have the user ID
        try {
          const raw = window.localStorage.getItem(getDraftKey(resolvedUserId));
          if (raw) {
            const draft = JSON.parse(raw) as { updatedAt?: number | null };
            if (draft.updatedAt) setLastSavedAt(draft.updatedAt);
            setHasLocalDraft(true);
          }
        } catch {
          // ignore malformed draft
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  useEffect(() => {
    if (!editor || !userId || reviewPending) return;
    const draftKey = getDraftKey(userId);
    const interval = setInterval(() => {
      try {
        const json = editor.getJSON();
        const payload = {
          title,
          summary,
          selectedCategory,
          categoryType,
          isPaid,
          price,
          content: json,
          updatedAt: Date.now(),
        };
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(draftKey, JSON.stringify(payload));
        }
        setLastSavedAt(payload.updatedAt);
        setHasLocalDraft(true);
      } catch (err) {
        console.error('Auto-save draft failed', err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [editor, userId, title, summary, selectedCategory, categoryType, isPaid, price, reviewPending]);

  function formatLastSaved() {
    if (!lastSavedAt) return '';
    try {
      return new Date(lastSavedAt).toLocaleString('zh-CN', { hour12: false });
    } catch {
      return '';
    }
  }

  function clearDraft() {
    if (!userId || typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(getDraftKey(userId));
      setHasLocalDraft(false);
      setLastSavedAt(null);
    } catch {
      // ignore
    }
  }

  function handleRestoreDraft() {
    if (!editor || typeof window === 'undefined' || !userId) return;
    try {
      const raw = window.localStorage.getItem(getDraftKey(userId));
      if (!raw) {
        alert('当前没有可恢复的草稿。');
        return;
      }
      const draft = JSON.parse(raw) as {
        title?: string;
        summary?: string;
        selectedCategory?: string;
        categoryType?: 'official' | 'personal';
        isPaid?: boolean;
        price?: string | number;
        content?: unknown;
        updatedAt?: number;
      };
      if (draft.title) setTitle(draft.title);
      if (typeof draft.summary === 'string') setSummary(draft.summary);
      if (draft.categoryType === 'official' || draft.categoryType === 'personal') {
        setCategoryType(draft.categoryType);
      }
      if (typeof draft.selectedCategory === 'string') {
        setSelectedCategory(draft.selectedCategory);
      }
      if (typeof draft.isPaid === 'boolean') setIsPaid(draft.isPaid);
      if (typeof draft.price === 'string' || typeof draft.price === 'number') {
        setPrice(String(draft.price));
      }
      if (draft.content) {
        editor.commands.setContent(draft.content, { emitUpdate: false });
      }
      if (draft.updatedAt) setLastSavedAt(draft.updatedAt);
      alert('本地草稿已恢复。');
    } catch (err) {
      console.error('Failed to restore draft', err);
      alert('恢复草稿失败，请稍后重试。');
    }
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function coverImagePayload(): File | string | undefined {
    if (coverFile) return coverFile;
    if (coverPreview.startsWith('http://') || coverPreview.startsWith('https://')) {
      return coverPreview;
    }
    return undefined;
  }

  async function handleSaveDraftServer(e: React.SyntheticEvent) {
    e.preventDefault();
    if (reviewPending || !editor) return;
    setLoading(true);
    try {
      const content = {
        type: 'doc',
        content: editor.getJSON().content,
        html: editor.getHTML(),
      };
      const result = await savePublishDraft({
        post_id: dbPostId,
        title,
        content,
        summary: summary.trim() || undefined,
        category_id: categoryType === 'official' ? selectedCategory || undefined : undefined,
        user_category_id: categoryType === 'personal' ? selectedCategory || undefined : undefined,
        is_paid: isPaid,
        price: isPaid ? parseFloat(price) : 0,
        cover_image: coverImagePayload(),
      });
      if (result.success && result.data?.post_id) {
        const pid = result.data.post_id;
        setDbPostId(pid);
        setLastSavedAt(Date.now());
        if (!dbPostId) {
          router.replace(`/publish?edit=${encodeURIComponent(pid)}`);
        }
      } else {
        alert(result.error?.message || '保存失败');
      }
    } catch (error) {
      console.error('Save draft error:', error);
      alert(error instanceof Error ? error.message : '发生错误');
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishNow(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!canPublishDirectly) {
      alert('无直接发布权限，请使用「提交审核」。');
      return;
    }
    if (!title.trim()) {
      alert('请输入文章标题');
      return;
    }
    setLoading(true);
    try {
      if (!editor) throw new Error('Editor not initialized');
      const content = {
        type: 'doc',
        content: editor.getJSON().content,
        html: editor.getHTML(),
      };
      const base = {
        title: title.trim(),
        content,
        summary: summary.trim() || undefined,
        category_id: categoryType === 'official' ? selectedCategory || undefined : undefined,
        user_category_id: categoryType === 'personal' ? selectedCategory || undefined : undefined,
        is_paid: isPaid,
        price: isPaid ? parseFloat(price) : 0,
        cover_image: coverImagePayload(),
        status: 'published' as const,
      };
      const result = dbPostId
        ? await updatePost(dbPostId, base)
        : await createPost(base);
      if (result.success) {
        clearDraft();
        const pid = result.data?.post_id ?? dbPostId;
        if (pid) router.push(`/posts/${pid}`);
      } else {
        alert(result.error?.message || '发布失败');
      }
    } catch (error) {
      console.error('Publish error:', error);
      alert(error instanceof Error ? error.message : '发生错误');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForReview(e: React.SyntheticEvent) {
    e.preventDefault();
    if (reviewPending) {
      alert('此文已在审核中，请等待管理员处理。');
      return;
    }
    if (!title.trim()) {
      alert('请输入文章标题');
      return;
    }
    setLoading(true);
    try {
      if (!editor) throw new Error('Editor not initialized');
      const content = {
        type: 'doc',
        content: editor.getJSON().content,
        html: editor.getHTML(),
      };
      const result = await submitPostForReview({
        post_id: dbPostId,
        title: title.trim(),
        content,
        summary: summary.trim() || undefined,
        category_id: categoryType === 'official' ? selectedCategory || undefined : undefined,
        user_category_id: categoryType === 'personal' ? selectedCategory || undefined : undefined,
        is_paid: isPaid,
        price: isPaid ? parseFloat(price) : 0,
        cover_image: coverImagePayload(),
        status: 'draft',
      });
      if (result.success) {
        clearDraft();
        if (result.data?.post_id) setDbPostId(result.data.post_id);
        setReviewState('pending');
        setReviewReason(null);
        alert('已提交审核，管理员通过后将自动公开。');
        router.push('/profile/drafts');
      } else {
        alert(result.error?.message || '提交审核失败');
      }
    } catch (error) {
      console.error('Submit for review error:', error);
      alert(error instanceof Error ? error.message : '发生错误');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] overflow-x-hidden">
      <form onSubmit={(e) => e.preventDefault()}>
        {/* Notion-style top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-6 py-3 bg-[var(--bg-sidebar)] border-b border-[var(--border)]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button type="button" onClick={() => router.back()} className="p-1.5 rounded-[var(--radius)] hover:bg-[var(--hover)] text-[var(--text-secondary)] shrink-0" title="返回">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xs text-[var(--text-secondary)] truncate">
              {reviewPending
                ? '审核中，正文已锁定'
                : lastSavedAt
                  ? `已保存 ${formatLastSaved()}`
                  : '未保存'}
            </span>
            {reviewReason ? (
              <span className="text-xs text-red-600 truncate max-w-[10rem] sm:max-w-xs" title={reviewReason}>
                驳回：{reviewReason.slice(0, 24)}
                {reviewReason.length > 24 ? '…' : ''}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="text-xs text-blue-600 hover:underline shrink-0"
            >
              {showPreview ? '关闭预览' : '预览'}
            </button>
            <button type="button" onClick={handleRestoreDraft} disabled={!hasLocalDraft || !editor || reviewPending} className="text-xs text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline shrink-0">从草稿恢复</button>
            <div className="relative ml-auto sm:ml-2">
              <button type="button" onClick={() => setActionsOpen(!actionsOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--hover)] text-sm text-[var(--text-primary)]">
                分享 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {actionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} aria-hidden />
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 z-20 w-48 py-1 bg-white rounded-[var(--radius)] shadow-lg border border-[var(--border)]">
                    <button type="button" onClick={(e) => { setActionsOpen(false); if (!loading) void handleSubmitForReview(e); }} disabled={loading || reviewPending} className="w-full px-4 py-2 text-left text-sm text-amber-800 hover:bg-amber-50 disabled:opacity-40">提交审核</button>
                    <button type="button" onClick={(e) => { setActionsOpen(false); if (!loading) void handleSaveDraftServer(e); }} disabled={loading || reviewPending} className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-40">保存草稿</button>
                    {canPublishDirectly ? (
                      <button type="button" onClick={(e) => { setActionsOpen(false); if (!loading) void handlePublishNow(e); }} disabled={loading} className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 font-medium">立即发布</button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={() => setSettingsOpen(!settingsOpen)} className="md:hidden p-2 rounded-[var(--radius)] hover:bg-[var(--hover)] text-[var(--text-secondary)] shrink-0" title="设置">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
          <div className="flex items-center shrink-0 gap-2">
            <Link
              href="/profile/drafts"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1.5 whitespace-nowrap"
            >
              我的草稿
            </Link>
            <Link
              href={SUPPORT_PAGE_PATH}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline px-2 py-1.5 whitespace-nowrap"
            >
              Help &amp; support
            </Link>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row">
          {/* Main editor area */}
          <div className="flex-1 min-w-0 px-3 sm:px-6 lg:pr-6 py-6">
            <div className="max-w-3xl mx-auto">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled"
                readOnly={reviewPending}
                className="w-full text-3xl sm:text-4xl font-bold border-none bg-transparent focus:outline-none placeholder-[var(--text-secondary)] text-[var(--text-primary)] mb-4 read-only:opacity-70"
              />
              <div className={`grid gap-4 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-sidebar)] overflow-hidden min-w-0">
                  <TipTapBasicEditor
                    placeholder="开始写作，支持粘贴或拖拽图片…"
                    minHeight="min-h-[400px]"
                    editable={editorEditable}
                    onEditorReady={setEditor}
                    renderToolbar={(ed) => <EditorToolbar editor={ed} disabled={reviewPending} />}
                  />
                </div>
                {showPreview ? (
                  <div
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-4 overflow-auto max-h-[min(70vh,560px)] prose prose-sm max-w-none text-[var(--text-primary)]"
                    dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-400">（暂无内容）</p>' }}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {/* Right sidebar - desktop */}
          <aside className="hidden lg:block w-[var(--sidebar-width)] shrink-0 border-l border-[var(--border)] bg-[var(--bg-sidebar)] p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">设置</h3>
            <SettingsPanel
              coverPreview={coverPreview}
              onCoverChange={handleCoverChange}
              onCoverRemove={() => { setCoverFile(null); setCoverPreview(''); }}
              summary={summary}
              setSummary={setSummary}
              categoryType={categoryType}
              setCategoryType={setCategoryType}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categories={categories}
              userCategories={userCategories}
              isAuthorized={isAuthorized}
              isPaid={isPaid}
              setIsPaid={setIsPaid}
              price={price}
              setPrice={setPrice}
              readOnly={reviewPending}
            />
          </aside>

          {/* Mobile settings drawer */}
          {settingsOpen && (
            <>
              <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSettingsOpen(false)} aria-hidden />
              <aside className="fixed right-0 top-0 bottom-0 w-[min(320px,90vw)] bg-[var(--bg-sidebar)] border-l border-[var(--border)] p-4 overflow-y-auto z-40 lg:hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">设置</h3>
                  <button type="button" onClick={() => setSettingsOpen(false)} className="p-1 rounded-[var(--radius)] hover:bg-[var(--hover)]">×</button>
                </div>
                <SettingsPanel
                  coverPreview={coverPreview}
                  onCoverChange={handleCoverChange}
                  onCoverRemove={() => { setCoverFile(null); setCoverPreview(''); }}
                  summary={summary}
                  setSummary={setSummary}
                  categoryType={categoryType}
                  setCategoryType={setCategoryType}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  categories={categories}
                  userCategories={userCategories}
                  isAuthorized={isAuthorized}
                  isPaid={isPaid}
                  setIsPaid={setIsPaid}
                  price={price}
                  setPrice={setPrice}
                  readOnly={reviewPending}
                />
              </aside>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function EditorToolbar({ editor, disabled = false }: { editor: Editor | null; disabled?: boolean }) {
  if (!editor) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 sm:gap-2 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`} title="粗体">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`} title="斜体">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
      </button>
      <div className="w-px h-6 sm:h-8 bg-gray-300 self-stretch hidden sm:block" aria-hidden />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-gray-100 font-semibold text-xs sm:text-base ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`} title="标题">H2</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-gray-100 font-semibold text-xs sm:text-base ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`} title="副标题">H3</button>
      <div className="w-px h-6 sm:h-8 bg-gray-300 self-stretch hidden sm:block" aria-hidden />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`} title="无序列表">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`} title="有序列表">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`} title="引用">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      </button>
      <div className="w-px h-6 sm:h-8 bg-gray-300 self-stretch hidden sm:block" aria-hidden />
      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 sm:p-2 rounded hover:bg-gray-100 disabled:opacity-30" title="撤销">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 sm:p-2 rounded hover:bg-gray-100 disabled:opacity-30" title="重做">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
      </button>
    </div>
  );
}
