/**
 * Admin Content Editor - same TipTap config as Publish
 * Uses TipTapBasicEditor with toolbar, paste/drop image support
 */

'use client';

import type { Editor } from '@tiptap/core';
import TipTapBasicEditor from '@/src/components/TipTapBasicEditor';

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
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

export default function AdminContentEditor() {
  return (
    <div className="rounded-lg shadow-sm">
      <TipTapBasicEditor
        placeholder="开始写作，支持粘贴或拖拽图片…"
        minHeight="min-h-[400px]"
        renderToolbar={(ed) => <EditorToolbar editor={ed} />}
      />
    </div>
  );
}
