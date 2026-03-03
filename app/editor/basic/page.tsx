/**
 * /editor/basic - 基础 TipTap 编辑器（Image + FileHandler）
 */
'use client';

import dynamic from 'next/dynamic';

const TipTapBasicEditor = dynamic(
  () => import('@/src/components/TipTapBasicEditor'),
  { ssr: false }
);

export default function BasicEditorPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto w-full min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">基础编辑器</h1>
          <p className="text-sm text-gray-600 mt-1">
            支持粘贴或拖拽插入图片（Image + FileHandler 扩展）
          </p>
        </div>
        <TipTapBasicEditor
          placeholder="开始写作，支持粘贴或拖拽图片…"
          className="shadow-sm"
        />
      </div>
    </div>
  );
}
