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
import Placeholder from '@tiptap/extension-placeholder';
import FileHandler from '@tiptap/extension-file-handler';

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
}

export default function TipTapBasicEditor({
  content = '',
  editable = true,
  placeholder = '开始写作，支持粘贴或拖拽图片…',
  className = '',
  minHeight = 'min-h-[200px]',
  onEditorReady,
  renderToolbar,
  onUploadImage,
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
      }),
      Image.configure({
        allowBase64: true,
        inline: false,
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      FileHandler.configure({
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        onPaste: (editor, files) => {
          void insertImageFiles(editor, files);
        },
        onDrop: (editor, files, pos) => {
          void insertImageFiles(editor, files, pos);
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none ${minHeight} p-4`,
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
    <div className={`tiptap-basic-editor border border-gray-200 rounded-lg bg-white overflow-hidden ${className}`}>
      {renderToolbar && (
        <div className="border-b border-gray-200 p-2 sm:p-4 overflow-x-auto">
          {renderToolbar(editor)}
        </div>
      )}
      <div className={`min-h-[280px] sm:min-h-[400px] [&_.ProseMirror]:min-h-[260px] sm:[&_.ProseMirror]:min-h-[380px] [&_.ProseMirror]:overflow-x-auto [&_.ProseMirror]:p-3 sm:[&_.ProseMirror]:p-4`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
