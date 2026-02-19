#!/bin/bash

# Worker 网页模式测试脚本
# Test Worker Web Mode Implementation

echo "🧪 Testing Worker Web Mode..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 检查 Worker 文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查核心功能
if grep -q "generateMainPage" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} HTML 页面生成函数存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} HTML 页面生成函数缺失"
    ((FAILED++))
fi

if grep -q "getSupabaseConfig" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Supabase 配置函数存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Supabase 配置函数缺失"
    ((FAILED++))
fi

if grep -q "querySupabase" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Supabase 查询函数存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Supabase 查询函数缺失"
    ((FAILED++))
fi

if grep -q "htmlResponse" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} HTML 响应函数存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} HTML 响应函数缺失"
    ((FAILED++))
fi

if grep -q "/api/posts" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} /api/posts 端点存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} /api/posts 端点缺失"
    ((FAILED++))
fi

if grep -q "/api/categories" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} /api/categories 端点存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} /api/categories 端点缺失"
    ((FAILED++))
fi

if grep -q "JJConnect 网页模式已启动" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} 临时测试文字存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} 临时测试文字缺失"
    ((FAILED++))
fi

if grep -q "React Mount Point\|React 挂载点\|id=\"root\"" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} React 挂载点存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} React 挂载点缺失"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 测试构建"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 构建成功"
    ((PASSED++))
    
    # 检查构建输出
    if [ -f ".wrangler/dist/index.js" ]; then
        FILE_SIZE=$(wc -c < ".wrangler/dist/index.js")
        echo -e "${GREEN}✓${NC} 构建输出存在 (${FILE_SIZE} bytes)"
        ((PASSED++))
        
        if grep -q "generateMainPage" ".wrangler/dist/index.js" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} 构建输出包含 HTML 生成函数"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC} 构建输出缺少 HTML 生成函数"
            ((FAILED++))
        fi
    else
        echo -e "${RED}✗${NC} 构建输出文件不存在"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗${NC} 构建失败"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 检查文档"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "WORKER_WEB_MODE.md" ]; then
    echo -e "${GREEN}✓${NC} WORKER_WEB_MODE.md 文档存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} WORKER_WEB_MODE.md 文档缺失"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 所有测试通过！Worker 网页模式就绪${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📝 快速启动：${NC}"
    echo ""
    echo "  1️⃣  配置环境变量:"
    echo "     echo 'SUPABASE_URL=https://...' > .dev.vars"
    echo "     echo 'SUPABASE_ANON_KEY=...' >> .dev.vars"
    echo ""
    echo "  2️⃣  启动开发服务器:"
    echo "     wrangler dev"
    echo ""
    echo "  3️⃣  访问网页:"
    echo "     open http://localhost:8787/"
    echo ""
    echo "  4️⃣  测试 API:"
    echo "     curl http://localhost:8787/api/posts"
    echo "     curl http://localhost:8787/api/categories"
    echo ""
    echo "  5️⃣  部署到生产:"
    echo "     wrangler deploy"
    echo ""
    echo -e "${BLUE}📚 查看完整文档：${NC}"
    echo "     cat WORKER_WEB_MODE.md"
    echo ""
    echo -e "${YELLOW}🎉 预期效果：${NC}"
    echo "     访问根目录将看到："
    echo "     ✅ Current Backend: Supabase Connection Active"
    echo "     🌸 JJConnect 网页模式已启动"
    echo "     📋 文章列表和分类导航"
    echo ""
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ 测试失败${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}💡 建议：${NC}"
    echo "  - 检查 workers/auth-worker.js 是否完整更新"
    echo "  - 运行 npm run build 重新构建"
    echo "  - 查看 WORKER_WEB_MODE.md 获取详细说明"
    echo ""
    exit 1
fi
