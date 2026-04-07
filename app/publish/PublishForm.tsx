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
  theme: string;
  setTheme: (v: string) => void;
  viewMode: 'edit' | 'preview';
  setViewMode: (v: 'edit' | 'preview') => void;
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
  theme,
  setTheme,
  viewMode,
  setViewMode,
  readOnly = false,
}: SettingsPanelProps) {
  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* View Mode Toggle */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">View Mode</label>
        <div className="flex p-1 bg-[var(--hover)] rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'edit' ? 'bg-white shadow-sm text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'preview' ? 'bg-white shadow-sm text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor Theme */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Editor Theme</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'light', label: 'Day', color: 'bg-white border-gray-200' },
            { id: 'night', label: 'Night', color: 'bg-gray-900 border-gray-700' },
            { id: 'emerald', label: 'Green', color: 'bg-emerald-900 border-emerald-800' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all ${theme === t.id ? 'border-blue-500 bg-blue-50/10' : 'border-transparent hover:bg-[var(--hover)]'}`}
            >
              <div className={`w-8 h-8 rounded-full border ${t.color}`} />
              <span className="text-[10px] font-medium uppercase">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-[var(--border)] opacity-50" />

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Cover Image</label>
        {coverPreview ? (
          <div className="relative group">
            <img src={coverPreview} alt="Cover preview" className="w-full h-40 object-cover rounded-[var(--radius)] shadow-sm" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[var(--radius)]">
              <button type="button" onClick={onCoverRemove} className="bg-red-500 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">Remove</button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] rounded-[var(--radius)] cursor-pointer hover:border-blue-400 hover:bg-blue-50/5 transition-all">
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-xs font-medium text-[var(--text-secondary)]">Click to upload</span>
            <input type="file" accept="image/*" onChange={onCoverChange} className="hidden" disabled={readOnly} />
          </label>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Short Summary</label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A brief description of your story..." rows={3} readOnly={readOnly} className="w-full border border-[var(--border)] bg-[var(--bg-page)] rounded-[var(--radius)] px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Category</label>
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => { setCategoryType('official'); setSelectedCategory(''); }} className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-tighter transition-all ${categoryType === 'official' ? 'bg-blue-600 text-white shadow-md' : 'bg-[var(--hover)] text-[var(--text-secondary)]'}`}>Official</button>
          {isAuthorized && <button type="button" onClick={() => { setCategoryType('personal'); setSelectedCategory(''); }} className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-tighter transition-all ${categoryType === 'personal' ? 'bg-blue-600 text-white shadow-md' : 'bg-[var(--hover)] text-[var(--text-secondary)]'}`}>Personal</button>}
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} disabled={readOnly} className="w-full border border-[var(--border)] bg-[var(--bg-page)] rounded-[var(--radius)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">Choose category...</option>
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
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Paid Content</span>
          <button type="button" onClick={() => setIsPaid(!isPaid)} disabled={readOnly} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPaid ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {isPaid && (
          <div className="relative animate-in slide-in-from-top-2 duration-200">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold">¥</span>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="0.01" required={isPaid} readOnly={readOnly} className="w-full pl-7 pr-3 py-2 border border-[var(--border)] bg-[var(--bg-page)] rounded-[var(--radius)] text-sm outline-none focus:ring-2 focus:ring-blue-400" />
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
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [theme, setTheme] = useState('light');
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
      return new Date(lastSavedAt).toLocaleString('en-US', { hour12: false });
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
        alert('No local draft found to restore.');
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
      alert('Local draft restored.');
    } catch (err) {
      console.error('Failed to restore draft', err);
      alert('Failed to restore draft. Please try again.');
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
        alert(result.error?.message || 'Save failed');
      }
    } catch (error) {
      console.error('Save draft error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishNow(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!canPublishDirectly) {
      alert('You do not have permission to publish directly. Please use "Submit for Review".');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a story title');
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
        alert(result.error?.message || 'Publish failed');
      }
    } catch (error) {
      console.error('Publish error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForReview(e: React.SyntheticEvent) {
    e.preventDefault();
    if (reviewPending) {
      alert('This story is already under review.');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a story title');
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
        alert('Story submitted for review. It will be public once approved by an admin.');
        router.push('/profile/drafts');
      } else {
        alert(result.error?.message || 'Failed to submit for review');
      }
    } catch (error) {
      console.error('Submit for review error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] overflow-x-hidden">
      <form onSubmit={(e) => e.preventDefault()}>
        {/* Notion-style top bar */}
        <header className="sticky top-0 z-[30] flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 py-3 bg-[var(--bg-sidebar)] border-b border-[var(--border)] shadow-sm">
          <div className="flex items-center gap-4 min-w-0">
            <button type="button" onClick={() => router.back()} className="p-2 rounded-full hover:bg-[var(--hover)] text-[var(--text-secondary)] transition-colors" title="Go Back">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Status</span>
              <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                {reviewPending
                  ? 'Under Review (Locked)'
                  : lastSavedAt
                    ? `Saved at ${formatLastSaved()}`
                    : 'Unsaved Draft'}
              </span>
            </div>
            {reviewReason ? (
              <div className="flex flex-col border-l border-red-200 pl-4 ml-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Rejected</span>
                <span className="text-xs text-red-600 truncate max-w-[12rem]" title={reviewReason}>
                  {reviewReason}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => void handleSaveDraftServer(e)}
              disabled={loading || reviewPending}
              className="px-4 py-1.5 rounded-lg border border-[var(--border)] text-sm font-bold hover:bg-[var(--hover)] transition-all disabled:opacity-50"
            >
              Save Draft
            </button>

            {canPublishDirectly ? (
              <button
                type="button"
                onClick={(e) => void handlePublishNow(e)}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-md hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                Publish Now
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => void handleSubmitForReview(e)}
                disabled={loading || reviewPending}
                className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-bold shadow-md hover:bg-amber-700 transition-all disabled:opacity-50"
              >
                Submit for Review
              </button>
            )}

            <div className="w-px h-6 bg-[var(--border)] mx-1" />

            <button type="button" onClick={() => setSettingsOpen(!settingsOpen)} className="lg:hidden p-2 rounded-lg hover:bg-[var(--hover)] text-[var(--text-secondary)]" title="Settings">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
          {/* Main editor area */}
          <div className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-8 py-8 lg:py-12 bg-[var(--bg-page)] custom-scrollbar">
            <div className={`max-w-4xl mx-auto transition-all duration-300 ${viewMode === 'preview' ? 'translate-y-4' : ''}`}>
              {viewMode === 'edit' ? (
                <>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your title here..."
                    readOnly={reviewPending}
                    className="w-full text-4xl sm:text-5xl font-extrabold border-none bg-transparent focus:outline-none placeholder-gray-300 text-[var(--text-primary)] mb-8 read-only:opacity-70 tracking-tight"
                  />
                  <div className="rounded-xl border border-[var(--border)] shadow-xl overflow-hidden min-w-0">
                    <TipTapBasicEditor
                      placeholder="Start sharing your thoughts..."
                      minHeight="min-h-[500px]"
                      editable={editorEditable}
                      onEditorReady={setEditor}
                      themeClass={
                        theme === 'night' 
                          ? 'bg-gray-900 text-gray-100 selection:bg-blue-500/30' 
                          : theme === 'emerald' 
                            ? 'bg-[#064e3b] text-emerald-50 selection:bg-emerald-400/30' 
                            : 'bg-white text-gray-900'
                      }
                      renderToolbar={(ed) => (
                        <div className="bg-[var(--bg-sidebar)] px-2 py-1.5 border-b border-[var(--border)]">
                          <EditorToolbar editor={ed} disabled={reviewPending} />
                        </div>
                      )}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button type="button" onClick={handleRestoreDraft} disabled={!hasLocalDraft || !editor || reviewPending} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 disabled:opacity-40 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      Restore from Local Draft
                    </button>
                    <div className="flex items-center gap-4">
                      <Link href="/profile/drafts" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">My Drafts</Link>
                      <Link href={SUPPORT_PAGE_PATH} className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors">Help</Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] mb-8 tracking-tight">{title || 'Untitled'}</h1>
                  {coverPreview && (
                    <img src={coverPreview} alt="Cover" className="w-full h-[400px] object-cover rounded-2xl mb-12 shadow-2xl" />
                  )}
                  <div
                    className="prose prose-lg sm:prose-xl max-w-none text-[var(--text-primary)] font-serif leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-400 font-sans italic text-center py-20 border-2 border-dashed border-[var(--border)] rounded-2xl">Start writing to see the magic happen here...</p>' }}
                  />
                  <div className="mt-20 pt-12 border-t border-[var(--border)] flex justify-center">
                    <button 
                      type="button" 
                      onClick={() => setViewMode('edit')}
                      className="px-8 py-3 bg-[var(--hover)] text-[var(--text-primary)] rounded-full font-bold hover:shadow-lg transition-all"
                    >
                      Return to Editor
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar - desktop */}
          <aside className="hidden lg:block w-[320px] shrink-0 border-l border-[var(--border)] bg-[var(--bg-sidebar)] p-6 overflow-y-auto custom-scrollbar z-20">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-8">Article Settings</h3>
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
              theme={theme}
              setTheme={setTheme}
              viewMode={viewMode}
              setViewMode={setViewMode}
              readOnly={reviewPending}
            />
          </aside>

          {/* Mobile settings drawer */}
          {settingsOpen && (
            <>
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] lg:hidden" onClick={() => setSettingsOpen(false)} aria-hidden />
              <aside className="fixed right-0 top-0 bottom-0 w-[min(340px,90vw)] bg-[var(--bg-sidebar)] border-l border-[var(--border)] p-6 overflow-y-auto z-[50] lg:hidden animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-primary)]">Settings</h3>
                  <button type="button" onClick={() => setSettingsOpen(false)} className="p-2 rounded-full hover:bg-[var(--hover)] text-xl transition-colors">×</button>
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
                  theme={theme}
                  setTheme={setTheme}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
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
    <div className={`flex flex-wrap items-center gap-1 sm:gap-1.5 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      {/* Basic Styles */}
      <div className="flex items-center bg-black/5 rounded-md p-0.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('bold') ? 'bg-white shadow-sm text-blue-600' : ''}`} title="Bold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2/0.8} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /></svg>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('italic') ? 'bg-white shadow-sm text-blue-600' : ''}`} title="Italic">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('underline') ? 'bg-white shadow-sm text-blue-600' : ''}`} title="Underline">
          <span className="font-serif font-bold underline leading-none">U</span>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('strike') ? 'bg-white shadow-sm text-blue-600' : ''}`} title="Strike">
          <span className="font-serif font-bold line-through leading-none">S</span>
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" aria-hidden />

      {/* Alignment */}
      <div className="flex items-center bg-black/5 rounded-md p-0.5">
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive({ textAlign: 'left' }) ? 'bg-white shadow-sm text-blue-600' : ''}`} title="Align Left">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" /></svg>
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive({ textAlign: 'center' }) ? 'bg-white shadow-sm text-blue-600' : ''}`} title="Align Center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" /></svg>
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive({ textAlign: 'right' }) ? 'bg-white shadow-sm text-blue-600' : ''}`} title="Align Right">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" /></svg>
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" aria-hidden />

      {/* Headings & Blocks */}
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1.5 rounded hover:bg-gray-100 font-bold text-xs ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-blue-600' : ''}`} title="Heading 2">H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`px-2 py-1.5 rounded hover:bg-gray-100 font-bold text-xs ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 text-blue-600' : ''}`} title="Heading 3">H3</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('blockquote') ? 'bg-gray-200 text-blue-600' : ''}`} title="Blockquote">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('highlight') ? 'bg-yellow-200' : ''}`} title="Highlight">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" aria-hidden />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`} title="Bullet List">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`} title="Ordered List">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('taskList') ? 'bg-gray-200' : ''}`} title="Task List">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        </button>
      </div>

      <div className="flex-1" />

      {/* History */}
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="Undo">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="Redo">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
        </button>
      </div>
    </div>
  );
}
