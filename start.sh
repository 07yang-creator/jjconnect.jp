#!/bin/bash
# 模块化多产品矩阵 - 快速启动脚本

echo "🚀 JJConnect 模块化产品矩阵 - 启动脚本"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "navbar.js" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "✅ 检测到项目文件"
echo ""

# 检查 Node.js 和 wrangler
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ 错误: npx 未找到"
    exit 1
fi

echo "✅ Node.js 环境正常"
echo ""

# 检查 wrangler.toml
if [ ! -f "wrangler.toml" ]; then
    echo "⚠️  警告: wrangler.toml 未找到"
    echo "   请确保已正确配置 Cloudflare Worker"
fi

echo "📦 正在检查数据库..."
echo ""

# 询问是否初始化数据库
read -p "是否需要初始化/重置数据库? (y/N): " init_db

if [[ $init_db =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔨 正在初始化数据库..."
    npx wrangler d1 execute jjconnect-db --local --file=schema.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ 数据库初始化成功"
    else
        echo "❌ 数据库初始化失败，但将继续启动 Worker"
    fi
fi

echo ""
echo "🌐 正在启动 Cloudflare Worker..."
echo "   API 端点: http://localhost:8787"
echo ""
echo "   可用路由:"
echo "   - POST /api/login       (登录)"
echo "   - POST /api/register    (注册)"
echo "   - GET  /api/auth/check  (验证)"
echo "   - POST /api/logout      (登出)"
echo "   - GET  /api/users       (用户列表, 需要管理员权限)"
echo "   - GET  /api/health      (健康检查)"
echo ""
echo "📄 产品页面:"
echo "   - index.html              (首页)"
echo "   - about.html              (关于我们 + 产品索引)"
echo "   - raft_home.html          (RAFT2.03 - 蓝色)"
echo "   - mansion_home.html       (Mansion管理主任 - 青色)"
echo "   - property_report.html    (地产报告 - 橙色)"
echo "   - login.html              (登录/注册)"
echo "   - admin.html              (管理后台)"
echo ""
echo "💡 提示:"
echo "   1. 打开浏览器访问任意 HTML 页面"
echo "   2. 导航栏会自动加载并检测登录状态"
echo "   3. 点击产品卡片或'立即访问'按钮测试模态框登录"
echo ""
echo "⚠️  注意: 请使用本地 Web 服务器打开 HTML 文件"
echo "   推荐: python3 -m http.server 8080"
echo "   或使用 VS Code 的 Live Server 扩展"
echo ""
echo "按 Ctrl+C 停止 Worker"
echo "=========================================="
echo ""

# 启动 Worker
npx wrangler dev workers/auth-worker.js
