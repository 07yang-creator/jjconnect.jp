/**
 * EditorPage - 基于 TipTap 的富文本编辑器
 *
 * 功能：
 * - 集成 StarterKit / Image / Link / Placeholder
 * - Notion / Medium 风格排版（最大宽度 800px 居中）
 * - 选区气泡菜单（加粗、斜体、链接）
 * - 斜杠菜单（/）快速插入标题、列表、图片
 * - Image 扩展支持 float-left / float-right 类名，实现图文环绕
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { BubbleMenu } from '@tiptap/react/menus';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

// ---------------- Image 扩展：支持 float-left / float-right ----------------

const FloatImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        renderHTML: attributes => ({
          class: attributes.class,
        }),
      },
      // 用于异步上传后定位对应图片节点
      'data-upload-id': {
        default: null,
        renderHTML: attributes =>
          attributes['data-upload-id']
            ? { 'data-upload-id': attributes['data-upload-id'] }
            : {},
      },
    };
  },
});

// ---------------- Slash Command 扩展 ----------------

type SlashCommandItem = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  command: (props: { editor: any; range: { from: number; to: number } }) => void;
};

const slashItems: SlashCommandItem[] = [
  {
    title: '大标题',
    description: '插入一级标题',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 1 })
        .run();
    },
  },
  {
    title: '小标题',
    description: '插入二级标题',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 2 })
        .run();
    },
  },
  {
    title: '项目列表',
    description: '插入无序列表',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBulletList()
        .run();
    },
  },
  {
    title: '有序列表',
    description: '插入有序列表',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleOrderedList()
        .run();
    },
  },
  {
    title: '图片（左浮动）',
    description: '插入一张左侧环绕图片',
    command: ({ editor, range }) => {
      const url = window.prompt('请输入图片 URL');
      if (!url) return;
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setImage({ src: url, class: 'float-left' })
        .run();
    },
  },
  {
    title: '图片（右浮动）',
    description: '插入一张右侧环绕图片',
    command: ({ editor, range }) => {
      const url = window.prompt('请输入图片 URL');
      if (!url) return;
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setImage({ src: url, class: 'float-right' })
        .run();
    },
  },
];

const SlashCommand = Extension.create({
  name: 'slash-command',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        items: ({ query }: { query: string }) => {
          if (!query) return slashItems;
          return slashItems.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase()),
          );
        },
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    // @ts-ignore - Suggestion 类型定义与 TipTap 版本可能略有差异
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

// ---------------- React 组件：Slash 命令面板 ----------------

interface SlashMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

function SlashMenu({ items, command }: SlashMenuProps) {
  if (!items.length) return null;

  return (
    <div className="tiptap-slash-menu shadow-lg border border-gray-200 bg-white rounded-xl py-2 text-sm">
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          className="w-full px-3 py-2 flex flex-col text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          onClick={() => command(item)}
        >
          <span className="font-medium text-gray-900">{item.title}</span>
          {item.description && (
            <span className="text-xs text-gray-500 mt-0.5">
              {item.description}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------- EditorPage 主组件 ----------------

const DRAFT_STORAGE_KEY = 'jjconnect-editor-draft';

async function uploadImageToApi(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Upload failed');
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

export default function EditorPage() {
  const [title, setTitle] = useState('');
  const [slashState, setSlashState] = useState<{
    isOpen: boolean;
    items: SlashCommandItem[];
    clientRect: DOMRect | null;
    range: { from: number; to: number } | null;
  }>({
    isOpen: false,
    items: [],
    clientRect: null,
    range: null,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      FloatImage,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder: '开始写作，支持 / 斜杠菜单与图文混排…',
      }),
      SlashCommand.configure({
        suggestion: {
          render: () => {
            let component: HTMLElement | null = null;

            return {
              onStart: (props: any) => {
                setSlashState({
                  isOpen: true,
                  items: props.items,
                  clientRect: props.clientRect?.() ?? null,
                  range: props.range,
                });

                if (!component) {
                  component = document.createElement('div');
                  document.body.appendChild(component);
                }
              },
              onUpdate(props: any) {
                setSlashState(prev => ({
                  ...prev,
                  items: props.items,
                  clientRect: props.clientRect?.() ?? null,
                  range: props.range,
                }));
              },
              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  setSlashState(prev => ({ ...prev, isOpen: false }));
                  return true;
                }
                return false;
              },
              onExit() {
                setSlashState(prev => ({ ...prev, isOpen: false }));
              },
            };
          },
        },
      }),
    ],
    content: `
      <h1>欢迎使用 JJConnect 编辑器</h1>
      <p>这是一个基于 TipTap 的富文本编辑器示例，支持 Notion / Medium 风格写作体验。</p>
      <p>试试选择文本，会出现气泡菜单；输入 <code>/</code> 体验斜杠菜单。</p>
    `,
    editorProps: {
      attributes: {
        class:
          'tiptap-content prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[400px] px-4 py-3',
      },
      handlePaste(view, event) {
        const clipboardData = event.clipboardData;
        const items = clipboardData
          ? Array.from(clipboardData.items || [])
          : [];
        const files = items
          .filter(item => item.kind === 'file')
          .map(item => item.getAsFile())
          .filter((file): file is File => !!file && file.type.startsWith('image/'));

        if (!files.length) return false;
        event.preventDefault();

        void (async () => {
          for (const file of files) {
            const uploadId = `upload-${Date.now()}-${Math.random()}`;
            const tempUrl = URL.createObjectURL(file);

            // 先插入本地预览
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({
                  src: tempUrl,
                  class: 'float-left',
                  'data-upload-id': uploadId,
                }),
              ),
            );

            try {
              const url = await uploadImageToApi(file);
              const { state } = view;
              const tr = state.tr;

              state.doc.descendants((node, pos) => {
                if (
                  node.type.name === 'image' &&
                  node.attrs['data-upload-id'] === uploadId
                ) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    src: url,
                  });
                }
              });

              view.dispatch(tr);
            } catch (err) {
              console.error('Image upload failed', err);
            }
          }
        })();

        return true;
      },
      handleDrop(view, event, _slice, _moved) {
        const dt = event.dataTransfer;
        const files = dt
          ? Array.from(dt.files || []).filter(file =>
              file.type.startsWith('image/'),
            )
          : [];

        if (!files.length) return false;
        event.preventDefault();

        const { state, dispatch } = view;
        const coords = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });

        if (!coords) return false;

        void (async () => {
          for (const file of files) {
            const uploadId = `upload-${Date.now()}-${Math.random()}`;
            const tempUrl = URL.createObjectURL(file);

            let tr = state.tr.insert(
              coords.pos,
              state.schema.nodes.image.create({
                src: tempUrl,
                class: 'float-left',
                'data-upload-id': uploadId,
              }),
            );
            dispatch(tr);

            try {
              const url = await uploadImageToApi(file);
              const currentState = view.state;
              tr = currentState.tr;

              currentState.doc.descendants((node, pos) => {
                if (
                  node.type.name === 'image' &&
                  node.attrs['data-upload-id'] === uploadId
                ) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    src: url,
                  });
                }
              });

              view.dispatch(tr);
            } catch (err) {
              console.error('Image upload failed', err);
            }
          }
        })();

        return true;
      },
    },
  });

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  // 自动保存到 localStorage
  useEffect(() => {
    if (!editor) return;

    const interval = setInterval(() => {
      try {
        const json = editor.getJSON();
        const payload = {
          title,
          content: json,
          updatedAt: Date.now(),
        };
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify(payload),
          );
        }
      } catch (err) {
        console.error('Auto-save failed', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [editor, title]);

  // 初始化时检查是否有草稿
  useEffect(() => {
    if (!editor || typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;

      const draft = JSON.parse(raw) as {
        title?: string;
        content?: any;
      };

      if (!draft.content) return;

      const shouldRestore = window.confirm('检测到未发布草稿，是否恢复？');
      if (!shouldRestore) return;

      if (draft.title) setTitle(draft.title);
      editor.commands.setContent(draft.content, false);
    } catch (err) {
      console.error('Failed to restore draft', err);
    }
  }, [editor]);

  const applySlashCommand = useCallback(
    (item: SlashCommandItem) => {
      if (!editor || !slashState.range) return;
      item.command({ editor, range: slashState.range });
      setSlashState(prev => ({ ...prev, isOpen: false }));
    },
    [editor, slashState.range],
  );

  if (!editor) return null;

  return (
    <div className="w-full flex justify-center">
      {/* 外层容器：最大宽度 800px，仿 Notion/Medium 居中 */}
      <div className="tiptap-editor-wrapper w-full max-w-3xl mx-auto">
        {/* 顶部标题栏 + 标题输入 */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                编辑器示例
              </h1>
              <p className="text-xs text-gray-500">
                支持气泡菜单、斜杠菜单、图片上传与自动保存
              </p>
            </div>
          </div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="在这里输入文章标题…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
          />
        </div>

        {/* 编辑器卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 工具栏占位（后续可以扩展） */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 text-sm text-gray-500">
            <span>输入 / 打开命令菜单 · 选中文字查看浮动工具条</span>
          </div>

          <div className="relative">
            {/* 气泡菜单 */}
            <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }}>
              <div className="tiptap-bubble-menu shadow-md border border-gray-200 bg-white rounded-full px-2 py-1 flex items-center gap-1 text-sm">
                <button
                  type="button"
                  className={`tiptap-bubble-button ${
                    editor.isActive('bold') ? 'is-active' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  B
                </button>
                <button
                  type="button"
                  className={`tiptap-bubble-button ${
                    editor.isActive('italic') ? 'is-active' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  I
                </button>
                <button
                  type="button"
                  className={`tiptap-bubble-button ${
                    editor.isActive('link') ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    const previousUrl = editor.getAttributes('link').href;
                    const url = window.prompt('请输入链接地址', previousUrl);
                    if (url === null) return;
                    if (url === '') {
                      editor.chain().focus().extendMarkRange('link').unsetLink().run();
                      return;
                    }
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange('link')
                      .setLink({ href: url })
                      .run();
                  }}
                >
                  链接
                </button>
              </div>
            </BubbleMenu>

            {/* 主编辑区域 */}
            <EditorContent editor={editor} className="tiptap-editor px-2 py-3" />

            {/* 斜杠菜单浮层 */}
            {slashState.isOpen && slashState.clientRect && (
              <div
                className="tiptap-slash-menu-container"
                style={{
                  position: 'fixed',
                  top: slashState.clientRect.bottom + 8,
                  left: slashState.clientRect.left,
                  zIndex: 50,
                }}
              >
                <SlashMenu
                  items={slashState.items}
                  command={applySlashCommand}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

