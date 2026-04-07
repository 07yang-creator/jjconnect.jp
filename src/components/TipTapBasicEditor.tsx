/**
 * TipTapBasicEditor - 基础富文本编辑器
 *
 * 集成：
 * - StarterKit（段落、标题、列表等）
 * - Image 扩展（支持粘贴/拖拽插入图片）
 * - Link 扩展
 * - FileHandler 扩展（处理粘贴和拖放文件事件）
 */

'use client';

import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import FileHandler from '@tiptap/extension-file-handler';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Node, mergeAttributes } from '@tiptap/core';

/** Custom Paywall Marker Node */
const PaywallMarker = Node.create({
  name: 'paywall',
  group: 'block',
  selectable: true,
  draggable: true,
  parseHTML() {
    return [{ tag: 'hr[data-role="paywall"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-role': 'paywall', class: 'paywall-divider' })];
  },
});

/** 将 File 转为 base64 data URL */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface TipTapBasicEditorProps {
  /** 初始内容（HTML 或 JSON） */
  content?: string;
  /** 是否可编辑（例如审核中只读） */
  editable?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 编辑器容器 class */
  className?: string;
  /** 编辑区最小高度，如 '400px' 或 'min-h-[400px]' */
  minHeight?: string;
  /** 编辑器就绪时回调，用于获取 editor 实例（提交、草稿恢复等） */
  onEditorReady?: (editor: Editor | null) => void;
  /** 自定义工具栏渲染 */
  renderToolbar?: (editor: Editor | null) => React.ReactNode;
  /** 自定义图片上传：返回图片 URL。不传则使用 base64 */
  onUploadImage?: (file: File) => Promise<string>;
  /** Theme classes for the editor wrapper */
  themeClass?: string;
}

export default function TipTapBasicEditor({
  content = '',
  editable = true,
  placeholder = 'Start writing, paste or drag and drop images...',
  className = '',
  minHeight = 'min-h-[200px]',
  onEditorReady,
  renderToolbar,
  onUploadImage,
  themeClass = 'bg-white text-[var(--text-primary)]',
}: TipTapBasicEditorProps) {
  const insertImageFiles = useCallback(
    async (editor: Editor, files: File[], pos?: number) => {
      if (!editor || !files.length) return;

      const imageFiles = files.filter((f) =>
        /^image\/(jpeg|png|gif|webp)$/i.test(f.type)
      );
      if (!imageFiles.length) return;

      for (const file of imageFiles) {
        try {
          let src: string;
          if (onUploadImage) {
            src = await onUploadImage(file);
          } else {
            src = await fileToDataUrl(file);
          }

          const imageNode = editor.schema.nodes.image.create({ src });
          const insertPos =
            typeof pos === 'number' ? pos : editor.state.selection.from;
          editor.view.dispatch(
            editor.state.tr.insert(insertPos, imageNode)
          );
        } catch (err) {
          console.error('Failed to insert image:', err);
        }
      }
    },
    [onUploadImage]
  );

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        allowBase64: true,
        inline: false,
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      PaywallMarker,
      FileHandler.configure({
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        onPaste: (editorInstance: Editor, files: File[]) => {
          void insertImageFiles(editorInstance, files);
        },
        onDrop: (editorInstance: Editor, files: File[], pos: number) => {
          void insertImageFiles(editorInstance, files, pos);
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none ${minHeight} p-4 prose-invert-inherit overflow-y-auto`,
      },
    },
  });

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  return (
    <div className={`tiptap-basic-editor border border-[var(--border)] rounded-[var(--radius)] overflow-hidden ${themeClass} ${className}`}>
      {renderToolbar && (
        <div className="border-b border-[var(--border)] p-2 sm:p-4 overflow-x-auto bg-[var(--bg-sidebar)]">
          {renderToolbar(editor)}
        </div>
      )}
      <div className={`${minHeight} [&_.ProseMirror]:min-h-full [&_.ProseMirror]:p-3 sm:[&_.ProseMirror]:p-4`}>
        <style dangerouslySetInnerHTML={{ __html: `
          .ProseMirror .paywall-divider {
            border: none;
            border-top: 2px dashed #f59e0b;
            margin: 3rem 0;
            position: relative;
            overflow: visible;
          }
          .ProseMirror .paywall-divider::after {
            content: 'PAYWALL';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: inherit;
            padding: 0 1rem;
            color: #f59e0b;
            font-size: 0.7rem;
            font-weight: 900;
            letter-spacing: 0.2em;
          }
          .ProseMirror span[style*="font-family: serif"] {
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          }
        `}} />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
