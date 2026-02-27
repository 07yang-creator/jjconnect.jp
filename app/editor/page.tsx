/**
 * /editor - 独立编辑器页（用于测试 TipTap 完整功能）
 * 使用 src/components/EditorPage（气泡菜单、斜杠菜单、图片粘贴上传等）
 * 与 /publish 的简化工具栏互为补充。
 */
import dynamic from 'next/dynamic';

const EditorPage = dynamic(
  () => import('@/src/components/EditorPage'),
  { ssr: false }
);

export default function EditorRoutePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto w-full min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">编辑器测试</h1>
          <p className="text-sm text-gray-600 mt-1">支持 / 斜杠菜单、选区气泡菜单、粘贴/拖拽图片上传</p>
        </div>
        <EditorPage />
      </div>
    </div>
  );
}
