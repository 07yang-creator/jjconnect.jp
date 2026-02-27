/**
 * Article Publishing Page
 * Next.js App Router version with TipTap editor
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/app/actions/posts';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Category, UserCategory } from '@/types/database';

// TipTap Editor imports (install these first)
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

export default function PublishPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryType, setCategoryType] = useState<'official' | 'personal'>('official');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<string>('0');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  // Local draft autosave / restore
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);

  const DRAFT_STORAGE_KEY = 'jjconnect-publish-draft';

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Detect existing draft on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { updatedAt?: number | null };
      if (draft.updatedAt) {
        setLastSavedAt(draft.updatedAt);
      }
      setHasLocalDraft(true);
    } catch (err) {
      console.error('Failed to read draft from localStorage', err);
    }
  }, []);

  // Load categories and check authorization
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createBrowserClient();
    
    try {
      // Load official categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Check user authorization
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_authorized')
          .eq('id', user.id)
          .single();
        
        const authorized = profile?.is_authorized || false;
        setIsAuthorized(authorized);

        // Load user categories if authorized
        if (authorized) {
          const { data: userCategoriesData } = await supabase
            .from('user_categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name');
          
          if (userCategoriesData) {
            setUserCategories(userCategoriesData);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  // Auto-save draft locally every 30s
  useEffect(() => {
    if (!editor) return;
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
          window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
        }
        setLastSavedAt(payload.updatedAt);
        setHasLocalDraft(true);
      } catch (err) {
        console.error('Auto-save draft failed', err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [editor, title, summary, selectedCategory, categoryType, isPaid, price]);

  function formatLastSaved() {
    if (!lastSavedAt) return '';
    try {
      const d = new Date(lastSavedAt);
      return d.toLocaleString('zh-CN', { hour12: false });
    } catch {
      return '';
    }
  }

  function handleRestoreDraft() {
    if (!editor || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
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
        content?: any;
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
        editor.commands.setContent(draft.content, false);
      }
      if (draft.updatedAt) {
        setLastSavedAt(draft.updatedAt);
      }
      alert('本地草稿已恢复。');
    } catch (err) {
      console.error('Failed to restore draft', err);
      alert('恢复草稿失败，请稍后重试。');
    }
  }

  // Handle cover image selection
  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent, publishStatus: 'draft' | 'published') {
    e.preventDefault();
    setLoading(true);

    try {
      if (!editor) {
        throw new Error('Editor not initialized');
      }

      // Prepare content
      const content = {
        type: 'doc',
        content: editor.getJSON().content,
        html: editor.getHTML(),
      };

      // Prepare input
      const input = {
        title: title.trim(),
        content,
        summary: summary.trim() || undefined,
        category_id: categoryType === 'official' ? selectedCategory : undefined,
        user_category_id: categoryType === 'personal' ? selectedCategory : undefined,
        is_paid: isPaid,
        price: isPaid ? parseFloat(price) : 0,
        cover_image: coverFile || undefined,
        status: publishStatus,
      };

      // Call server action
      const result = await createPost(input);

      if (result.success) {
        // Success! Redirect to post or profile
        if (publishStatus === 'published') {
          router.push(`/posts/${result.data?.post_id}`);
        } else {
          router.push('/profile/drafts');
        }
      } else {
        alert(result.error?.message || '发布失败');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert(error instanceof Error ? error.message : '发生错误');
    } finally {
      setLoading(false);
    }
  }

  // 提交审核：状态保持为 draft，但在内容中标记 review_state = 'pending'
  async function handleSubmitForReview(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (!editor) {
        throw new Error('Editor not initialized');
      }

      const json = editor.getJSON();

      const content = {
        type: 'doc',
        content: json.content,
        html: editor.getHTML(),
        review_state: 'pending' as const,
      };

      const input = {
        title: title.trim(),
        content,
        summary: summary.trim() || undefined,
        category_id: categoryType === 'official' ? selectedCategory : undefined,
        user_category_id: categoryType === 'personal' ? selectedCategory : undefined,
        is_paid: isPaid,
        price: isPaid ? parseFloat(price) : 0,
        cover_image: coverFile || undefined,
        status: 'draft' as const,
      };

      const result = await createPost(input);

      if (result.success) {
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
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-3 sm:px-4 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full min-w-0">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">发布文章</h1>
            <p className="text-sm sm:text-base text-gray-600">分享你的想法和经验</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1 text-xs sm:text-sm text-gray-500">
            {lastSavedAt && (
              <span>最近自动保存：{formatLastSaved()}</span>
            )}
            <button
              type="button"
              onClick={handleRestoreDraft}
              disabled={!hasLocalDraft || !editor}
              className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              从草稿恢复
            </button>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, status)} className="space-y-6">
          
          {/* Title Input */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入文章标题..."
              className="w-full text-2xl sm:text-4xl font-bold border-none focus:outline-none focus:ring-0 placeholder-gray-300 min-w-0"
              required
            />
          </div>

          {/* Cover Image */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              封面图片（可选）
            </label>
            
            {coverPreview ? (
              <div className="relative">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview('');
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600"
                >
                  移除
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-600">点击上传封面图片</p>
                <p className="text-xs text-gray-500 mt-1">支持 JPG, PNG, GIF (最大 5MB)</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              摘要（可选）
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="简要描述文章内容..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Category Selection */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              分类
            </label>
            
            {/* Category Type Toggle */}
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-4">
              <button
                type="button"
                onClick={() => {
                  setCategoryType('official');
                  setSelectedCategory('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  categoryType === 'official'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                网站官方板块
              </button>
              
              {isAuthorized && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryType('personal');
                    setSelectedCategory('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    categoryType === 'personal'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  我的个人分类
                </button>
              )}
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择分类...</option>
              {categoryType === 'official'
                ? categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                : userCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
            </select>
          </div>

          {/* Rich Text Editor */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden min-w-0">
            <div className="border-b border-gray-200 p-2 sm:p-4 overflow-x-auto">
              <EditorToolbar editor={editor} />
            </div>
            <div className="min-h-[280px] sm:min-h-[400px] [&_.ProseMirror]:min-h-[260px] sm:[&_.ProseMirror]:min-h-[380px] [&_.ProseMirror]:p-3 sm:[&_.ProseMirror]:p-4 [&_.ProseMirror]:overflow-x-auto">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Paid Content Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">付费内容</h3>
                <p className="text-xs text-gray-500 mt-1">开启后此文章需要付费阅读</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaid(!isPaid)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPaid ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPaid ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {isPaid && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  价格（人民币）
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={isPaid}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  建议定价：9.9 - 99.9 元
                </p>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
              disabled={loading}
            >
              取消
            </button>

            <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
              <button
                type="button"
                onClick={(e) => {
                  if (loading) return;
                  handleSubmitForReview(e);
                }}
                className="px-3 sm:px-6 py-2 text-sm sm:text-base border border-amber-300 text-amber-800 bg-amber-50 rounded-lg hover:bg-amber-100 font-medium disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '提交中...' : '提交审核'}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  setStatus('draft');
                  handleSubmit(e, 'draft');
                }}
                className="px-3 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
                disabled={loading}
              >
                {loading && status === 'draft' ? '保存中...' : '保存草稿'}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  setStatus('published');
                  handleSubmit(e, 'published');
                }}
                className="px-3 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                disabled={loading}
              >
                {loading && status === 'published' ? '发布中...' : '立即发布'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

// Editor Toolbar Component
function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 touch-manipulation ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
        title="粗体"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 touch-manipulation ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
        title="斜体"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>

      <div className="w-px h-6 sm:h-8 bg-gray-300 self-stretch hidden sm:block" aria-hidden></div>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-gray-100 font-semibold text-xs sm:text-base touch-manipulation ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
        title="标题"
      >
        H2
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-gray-100 font-semibold text-xs sm:text-base touch-manipulation ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
        title="副标题"
      >
        H3
      </button>

      <div className="w-px h-6 sm:h-8 bg-gray-300 self-stretch hidden sm:block" aria-hidden></div>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 touch-manipulation ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
        title="无序列表"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 touch-manipulation ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
        title="有序列表"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 sm:p-2 rounded hover:bg-gray-100 touch-manipulation ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
        title="引用"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      <div className="w-px h-6 sm:h-8 bg-gray-300 self-stretch hidden sm:block" aria-hidden></div>

      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-1.5 sm:p-2 rounded hover:bg-gray-100 disabled:opacity-30 touch-manipulation"
        title="撤销"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-1.5 sm:p-2 rounded hover:bg-gray-100 disabled:opacity-30 touch-manipulation"
        title="重做"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
        </svg>
      </button>
    </div>
  );
}
