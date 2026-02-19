import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import RightSidebar from '@/src/components/RightSidebar';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JJConnect - 日本人コミュニティ',
  description: '日本人のための情報交流プラットフォーム',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 获取当前用户信息
  const user = await getCurrentUser();

  // Supabase 环境变量配置
  const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };

  return (
    <html lang="ja">
      <body className={inter.className}>
        {/* 使用 Flex 布局实现左右分栏 */}
        <div className="min-h-screen bg-gray-50 flex flex-col">
          
          {/* 主内容容器 */}
          <div className="flex-1 flex relative">
            
            {/* 左侧：主内容区 - 为右侧边栏预留空间 */}
            <main className="flex-1 md:mr-[260px] transition-all duration-300">
              {/* 内容包装器，添加适当的内边距 */}
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </div>
            </main>

            {/* 右侧：固定边栏 */}
            <RightSidebar env={env} user={user} />
          </div>
        </div>
      </body>
    </html>
  );
}
