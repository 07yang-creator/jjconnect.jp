/**
 * Page generation for JJConnect Worker
 */

/**
 * Generate main application page with React mount point
 */
export function generateMainPage(env) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JJConnect - 日本人社区平台</title>
    <meta name="description" content="JJConnect - 专业的日本人社区平台，分享知识、交流经验、探索可能">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- React & ReactDOM CDN -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    
    <!-- Supabase Client CDN -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        #root { min-height: 100vh; }
        .pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .slide-in { animation: slideIn 0.5s ease-out; }
        @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
</head>
<body>
    <div id="backend-status" class="fixed top-0 left-0 right-0 bg-green-600 text-white px-4 py-2 text-center text-sm font-semibold z-50 slide-in">
        <span class="pulse inline-block mr-2">●</span>
        <span>Current Backend: Supabase Connection Active</span>
    </div>
    
    <div id="root" class="pt-10"></div>
    
    <script>
        window.JJCONNECT_CONFIG = { supabaseUrl: '${supabaseUrl}', supabaseKey: '${supabaseKey}', apiEndpoint: '/api', version: '1.0.0' };
        if (window.supabase && window.JJCONNECT_CONFIG.supabaseUrl) {
            window.supabaseClient = window.supabase.createClient(window.JJCONNECT_CONFIG.supabaseUrl, window.JJCONNECT_CONFIG.supabaseKey);
            console.log('[INFO] Supabase client initialized');
        }
    </script>
    
    <script>
        const { useState, useEffect } = React;
        function App() {
            const [posts, setPosts] = useState([]);
            const [categories, setCategories] = useState([]);
            const [loading, setLoading] = useState(true);
            const [activeCategory, setActiveCategory] = useState(null);
            useEffect(() => { loadData(); }, []);
            async function loadData() {
                try {
                    const categoriesRes = await fetch('/api/categories');
                    const categoriesData = await categoriesRes.json();
                    if (categoriesData.success) setCategories(categoriesData.data);
                    const postsRes = await fetch('/api/posts');
                    const postsData = await postsRes.json();
                    if (postsData.success) setPosts(postsData.data);
                } catch (error) { console.error('[ERROR] Failed to load data:', error); } finally { setLoading(false); }
            }
            const filteredPosts = activeCategory ? posts.filter(post => post.category_id === activeCategory) : posts;
            return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
                React.createElement('header', { className: 'bg-white shadow-sm' },
                    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-6' },
                        React.createElement('h1', { className: 'text-3xl font-bold text-gray-900' }, '🌸 JJConnect 网页模式已启动'),
                        React.createElement('p', { className: 'mt-2 text-gray-600' }, '欢迎来到 JJConnect - 日本人社区平台'))),
                React.createElement('main', { className: 'max-w-7xl mx-auto px-4 py-8' },
                    React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-4 gap-6' },
                        React.createElement('aside', { className: 'lg:col-span-1' },
                            React.createElement('div', { className: 'bg-white rounded-lg shadow p-6 sticky top-24' },
                                React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, '分类板块'),
                                React.createElement('div', { className: 'space-y-2' },
                                    React.createElement('button', { className: 'w-full text-left px-3 py-2 rounded hover:bg-blue-50 ' + (!activeCategory ? 'bg-blue-100 text-blue-700' : ''), onClick: () => setActiveCategory(null) }, '📋 全部'),
                                    categories.map(cat => React.createElement('button', { key: cat.id, className: 'w-full text-left px-3 py-2 rounded hover:bg-blue-50 ' + (activeCategory === cat.id ? 'bg-blue-100 text-blue-700' : ''), onClick: () => setActiveCategory(cat.id) }, '• ' + cat.name))))),
                        React.createElement('div', { className: 'lg:col-span-3' },
                            loading ? React.createElement('div', { className: 'text-center py-12' }, React.createElement('div', { className: 'inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent' }))
                                : React.createElement('div', { className: 'grid gap-6' },
                                    filteredPosts.length === 0 ? React.createElement('div', { className: 'text-center py-12 bg-white rounded-lg shadow' }, React.createElement('p', { className: 'text-gray-500' }, '暂无文章'))
                                        : filteredPosts.map(post => React.createElement('article', { key: post.id, className: 'bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6' },
                                            React.createElement('div', { className: 'flex items-start justify-between' },
                                                React.createElement('div', { className: 'flex-1' },
                                                    React.createElement('h3', { className: 'text-xl font-semibold text-gray-900 mb-2' }, post.title),
                                                    post.summary && React.createElement('p', { className: 'text-gray-600 mb-4' }, post.summary),
                                                    React.createElement('div', { className: 'flex items-center gap-4 text-sm text-gray-500' },
                                                        post.category && React.createElement('span', { className: 'bg-blue-100 text-blue-800 px-2 py-1 rounded' }, post.category.name),
                                                        post.author && React.createElement('span', {}, '作者: ' + (post.author.display_name || '匿名')),
                                                        React.createElement('span', {}, new Date(post.created_at).toLocaleDateString('zh-CN')))),
                                                post.is_paid && React.createElement('div', { className: 'ml-4 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold' }, '💰 付费阅读'))))))))),
                React.createElement('footer', { className: 'bg-white border-t mt-12' },
                    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-6 text-center text-gray-600' }, React.createElement('p', {}, '© 2026 JJConnect. All rights reserved.'))));
        }
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
        console.log('[INFO] JJConnect App initialized');
    </script>
</body>
</html>`;
}
