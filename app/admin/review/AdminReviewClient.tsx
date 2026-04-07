'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TipTapBasicEditor from '@/src/components/TipTapBasicEditor';
import type { Editor } from '@tiptap/core';
import type { ReviewPost } from './types';
import { adminUpdatePost } from '@/app/actions/posts';
import { getCoverImageUrl } from '@/lib/cloudflare-image-url';
import type { PostUpdate, PostContent } from '@/types/database';

interface AdminReviewClientProps {
  initialPosts: ReviewPost[];
}

export default function AdminReviewClient({ initialPosts }: AdminReviewClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<ReviewPost[]>(initialPosts);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(initialPosts[0]?.id || null);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'card' | 'full'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const selectedPost = useMemo(() => 
    posts.find(p => p.id === selectedPostId), 
  [posts, selectedPostId]);

  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const handleEditorReady = useCallback((editor: Editor | null) => {
    setEditorInstance(editor);
  }, []);

  const handleSave = async (publish: boolean = false) => {
    if (!selectedPost || isSaving) return;
    setIsSaving(true);

    try {
      let updatedContent = selectedPost.content;
      if (!isJsonMode && editorInstance) {
        updatedContent = editorInstance.getJSON() as PostContent;
      }

      const updateData: PostUpdate = {
        content: {
          ...updatedContent,
          review_state: publish ? 'approved' : 'pending',
          review_reason: publish ? null : selectedPost.content.review_reason,
        } as PostContent,
      };

      if (publish) {
        updateData.status = 'published';
      }

      const res = await adminUpdatePost(selectedPost.id, updateData);
      if (res.success) {
        alert(publish ? 'Post Published!' : 'Changes Saved!');
        if (publish) {
          // Remove from local list
          setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
          setSelectedPostId(posts.find(p => p.id !== selectedPost.id)?.id || null);
        }
        router.refresh();
      } else {
        alert('Failed: ' + res.error?.message);
      }
    } catch {
      alert('Error saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPost || !rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    const res = await adminUpdatePost(selectedPost.id, {
      status: 'draft',
      content: {
        ...selectedPost.content,
        review_state: 'rejected',
        review_reason: rejectReason,
      } as PostContent
    });
    if (res.success) {
      alert('Post Rejected.');
      setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
      setSelectedPostId(posts.find(p => p.id !== selectedPost.id)?.id || null);
      setRejectReason('');
      router.refresh();
    }
  };

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-xl font-medium">No pending articles found.</p>
        <p className="mt-2">The backlog is clean! Type-5 for great success.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Pending List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Backstage Review</h2>
          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {posts.length} PENDING
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {posts.map(post => (
            <button
              key={post.id}
              onClick={() => {
                setSelectedPostId(post.id);
                setPreviewMode('edit');
                setIsJsonMode(false);
              }}
              className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors flex gap-3 ${selectedPostId === post.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : ''}`}
            >
              <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                {post.cover_image && (
                  <img src={getCoverImageUrl(post.cover_image, 'card')} alt={post.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{post.title || 'Untitled'}</h3>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                  By {post.author?.display_name || 'Anonymous'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selectedPost ? (
          <>
            {/* Header / Toolbar */}
            <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setPreviewMode('edit')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${previewMode === 'edit' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Editor
                  </button>
                  <button 
                    onClick={() => setPreviewMode('card')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${previewMode === 'card' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Card View
                  </button>
                  <button 
                    onClick={() => setPreviewMode('full')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${previewMode === 'full' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Full View
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200 mx-2" />

                <button
                  onClick={() => setIsJsonMode(!isJsonMode)}
                  className={`px-3 py-1 rounded border text-[10px] font-bold tracking-tighter uppercase transition-colors ${isJsonMode ? 'bg-purple-600 text-white border-purple-700' : 'text-gray-400 hover:text-gray-600 border-gray-200'}`}
                >
                  {isJsonMode ? 'Visual Mode' : 'JSON Mode'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  Save Edits
                </button>
                <button 
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors shadow-sm shadow-emerald-200"
                >
                  Approve & Publish
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-gray-50/30">
              <div className="w-full max-w-4xl space-y-8">
                {previewMode === 'edit' ? (
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      defaultValue={selectedPost.title}
                      className="w-full text-3xl font-extrabold border-none focus:ring-0 bg-transparent p-0 placeholder-gray-300"
                      placeholder="Article Title..."
                    />
                    
                    {isJsonMode ? (
                      <textarea
                        className="w-full h-[600px] font-mono text-xs p-6 bg-gray-900 text-gray-200 rounded-xl border border-gray-800 shadow-2xl focus:ring-1 focus:ring-purple-500 outline-none"
                        defaultValue={JSON.stringify(selectedPost.content, null, 2)}
                        spellCheck={false}
                        onChange={(e) => {
                          try {
                            const newContent = JSON.parse(e.target.value);
                            setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, content: newContent } : p));
                          } catch {
                            // Silently fail on invalid JSON during typing
                          }
                        }}
                      />
                    ) : (
                      <TipTapBasicEditor 
                        content={selectedPost.content as PostContent}
                        onEditorReady={handleEditorReady}
                        minHeight="min-h-[600px]"
                        className="shadow-sm bg-white"
                        renderToolbar={(editor: Editor | null) => (
                          <div className="flex flex-wrap items-center gap-2 text-gray-400">
                             <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className="p-1 hover:text-gray-900">H1</button>
                             <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="p-1 hover:text-gray-900">H2</button>
                             <button type="button" onClick={() => editor?.chain().focus().setFontFamily('serif').run()} className="p-1 hover:text-gray-900 font-serif font-bold">Aa</button>
                             <button type="button" onClick={() => editor?.chain().focus().unsetFontFamily().run()} className="p-1 hover:text-gray-900 font-sans font-bold">Aa</button>
                             <button type="button" onClick={() => editor?.chain().focus().insertContent({ type: 'paywall' }).run()} className="ml-2 px-2 py-0.5 rounded border border-amber-300 text-amber-600 text-[9px] font-black">PAYWALL</button>
                          </div>
                        )}
                      />
                    )}
                  </div>
                ) : previewMode === 'card' ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="w-[400px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                      <div className="h-48 bg-gray-100">
                        {selectedPost.cover_image && <img src={getCoverImageUrl(selectedPost.cover_image, 'card')} className="w-full h-full object-cover" alt={selectedPost.title} />}
                      </div>
                      <div className="p-6">
                        <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-2">{selectedPost.category?.name || 'Article'}</div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight mb-3 line-clamp-2">{selectedPost.title}</h2>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                             {selectedPost.author?.avatar_url && <img src={selectedPost.author.avatar_url} className="w-full h-full object-cover" alt={selectedPost.author.display_name || 'Author'} />}
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{selectedPost.author?.display_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 prose prose-lg max-w-none">
                    <h1 className="text-5xl font-black text-gray-900 mb-8 tracking-tight">{selectedPost.title}</h1>
                    <div className="tiptap-content prose prose-slate">
                       {/* Simplified preview for the admin */}
                       <p className="text-gray-400 italic mb-8 border-b pb-4">Backstage high-fidelity preview...</p>
                       <div dangerouslySetInnerHTML={{ __html: 'Live HTML Rendering Placeholder' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Tray */}
            <div className="border-t border-gray-200 p-6 bg-gray-50/80 flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Rejection Reason</label>
                <input 
                  type="text" 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Tell the writer why this wasn't approved..."
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all"
                />
              </div>
              <button 
                onClick={handleReject}
                className="mt-5 px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-xl transition-all border border-red-100"
              >
                REJECT SUBMISSION
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a post to begin review
          </div>
        )}
      </div>
    </div>
  );
}
