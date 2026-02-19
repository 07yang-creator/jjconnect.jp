#!/bin/bash

# 修复 Wrangler Dev 启动问题
# Fix Wrangler Dev Startup Issues

echo "🔧 修复 Wrangler Dev 启动问题..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 诊断问题"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 检查文件描述符限制
echo "1. 检查文件描述符限制..."
CURRENT_LIMIT=$(ulimit -n)
echo "   当前限制: $CURRENT_LIMIT"

if [ "$CURRENT_LIMIT" -lt 4096 ]; then
    echo -e "   ${YELLOW}⚠️${NC} 限制过低，正在提高..."
    ulimit -n 4096
    NEW_LIMIT=$(ulimit -n)
    echo -e "   ${GREEN}✓${NC} 新限制: $NEW_LIMIT"
else
    echo -e "   ${GREEN}✓${NC} 限制正常"
fi

echo ""

# 2. 创建 .dev.vars 如果不存在
echo "2. 检查环境变量文件..."
if [ ! -f ".dev.vars" ]; then
    echo -e "   ${YELLOW}⚠️${NC} .dev.vars 不存在，创建模板文件..."
    cat > .dev.vars << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
EOF
    echo -e "   ${GREEN}✓${NC} 已创建 .dev.vars（请编辑填入真实值）"
    echo ""
    echo -e "   ${BLUE}请编辑 .dev.vars 文件，填入你的 Supabase 配置：${NC}"
    echo "   nano .dev.vars"
    echo ""
else
    echo -e "   ${GREEN}✓${NC} .dev.vars 已存在"
fi

echo ""

# 3. 清理旧的构建
echo "3. 清理旧的构建..."
if [ -d ".wrangler" ]; then
    echo "   清理 .wrangler 目录..."
    rm -rf .wrangler
    echo -e "   ${GREEN}✓${NC} 清理完成"
else
    echo -e "   ${GREEN}✓${NC} 无需清理"
fi

echo ""

# 4. 重新构建
echo "4. 重新构建项目..."
if npm run build > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} 构建成功"
else
    echo -e "   ${RED}✗${NC} 构建失败"
    exit 1
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 修复完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📝 启动选项：${NC}"
echo ""
echo "  选项 1: 使用生产环境（推荐 - 无需本地运行）"
echo "  ────────────────────────────────────────"
echo "  你的 Worker 已部署到："
echo -e "  ${GREEN}https://jjconnect-auth-worker.07-yang.workers.dev/${NC}"
echo ""
echo "  直接访问："
echo "  open https://jjconnect-auth-worker.07-yang.workers.dev/"
echo ""
echo "  查看实时日志："
echo "  npx wrangler tail"
echo ""
echo ""
echo "  选项 2: 本地开发（需要修复系统限制）"
echo "  ────────────────────────────────────────"
echo "  A. 使用简化启动模式（推荐）："
echo "     npx wrangler dev --local --port 8787"
echo ""
echo "  B. 使用远程模式："
echo "     npx wrangler dev --remote --port 8787"
echo ""
echo "  C. 跳过日志记录："
echo "     npx wrangler dev --port 8787 --no-bundle 2>/dev/null"
echo ""
echo ""
echo -e "${YELLOW}💡 推荐做法：${NC}"
echo "   先使用生产环境测试功能，然后再解决本地开发环境的问题。"
echo ""
echo "   访问: https://jjconnect-auth-worker.07-yang.workers.dev/"
echo ""
