#!/bin/bash

# Wrangler Dev 启动和诊断脚本
# Quick Start and Diagnostic Script for Wrangler Dev

echo "🔍 Wrangler Dev 诊断工具"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. 检查端口是否被占用
echo "📡 检查端口 8787..."
if lsof -i :8787 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️${NC} 端口 8787 已被占用"
    lsof -i :8787
    echo ""
    echo "请先关闭占用端口的进程："
    echo "  lsof -ti :8787 | xargs kill -9"
    exit 1
else
    echo -e "${GREEN}✓${NC} 端口 8787 可用"
fi

echo ""

# 2. 检查环境变量文件
echo "🔑 检查环境变量..."
if [ -f ".dev.vars" ]; then
    echo -e "${GREEN}✓${NC} .dev.vars 文件存在"
    echo "   内容预览："
    head -n 2 .dev.vars | sed 's/=.*/=***/' | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️${NC} .dev.vars 文件不存在"
    echo ""
    echo "创建 .dev.vars 文件（推荐用于本地开发）："
    echo ""
    echo "cat > .dev.vars << 'EOF'"
    echo "SUPABASE_URL=https://your-project.supabase.co"
    echo "SUPABASE_ANON_KEY=your-anon-key-here"
    echo "EOF"
    echo ""
    echo -e "${BLUE}或者${NC} 直接启动（使用生产环境的 secrets）："
    echo "  npx wrangler dev"
    echo ""
    read -p "是否现在创建 .dev.vars? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "请输入 Supabase URL:"
        read SUPABASE_URL
        echo "请输入 Supabase Anon Key:"
        read SUPABASE_KEY
        
        cat > .dev.vars << EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_KEY
EOF
        echo -e "${GREEN}✓${NC} .dev.vars 文件已创建"
    fi
fi

echo ""

# 3. 检查构建
echo "🔨 检查构建..."
if [ -f ".wrangler/dist/index.js" ]; then
    FILE_SIZE=$(wc -c < ".wrangler/dist/index.js" | tr -d ' ')
    echo -e "${GREEN}✓${NC} 构建输出存在 (${FILE_SIZE} bytes)"
else
    echo -e "${YELLOW}⚠️${NC} 构建输出不存在，正在构建..."
    npm run build
fi

echo ""

# 4. 检查 wrangler
echo "⚙️  检查 Wrangler..."
if command -v wrangler > /dev/null 2>&1; then
    VERSION=$(wrangler --version 2>&1 | head -n1)
    echo -e "${GREEN}✓${NC} Wrangler 已安装: $VERSION"
else
    echo -e "${YELLOW}⚠️${NC} Wrangler 未找到，使用 npx"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 诊断完成！准备启动${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}启动选项：${NC}"
echo ""
echo "  1️⃣  启动开发服务器（推荐）："
echo "     npx wrangler dev"
echo ""
echo "  2️⃣  启动并自动打开浏览器："
echo "     npx wrangler dev --open"
echo ""
echo "  3️⃣  使用特定端口："
echo "     npx wrangler dev --port 3000"
echo ""
echo "  4️⃣  启动并查看日志："
echo "     npx wrangler dev --log-level debug"
echo ""
echo -e "${YELLOW}💡 提示：${NC}"
echo "   - 按 Ctrl+C 停止服务器"
echo "   - 访问: http://localhost:8787/"
echo "   - 查看日志: 终端会实时显示请求"
echo ""
read -p "是否现在启动 wrangler dev? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${GREEN}🚀 启动 Wrangler Dev...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    npx wrangler dev
else
    echo ""
    echo "手动启动命令："
    echo "  npx wrangler dev"
    echo ""
fi
