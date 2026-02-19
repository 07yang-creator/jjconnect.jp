#!/bin/bash

# Backend Status 测试脚本
# Test Backend Status Implementation

echo "🧪 Testing Backend Status Implementation..."
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
echo "📋 检查文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 Worker 文件
if grep -q "/api/backend/status" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Worker 文件包含状态端点"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Worker 文件缺少状态端点"
    ((FAILED++))
fi

if grep -q "SUPABASE_URL prefix" "workers/auth-worker.js" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Worker 文件包含调试日志"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Worker 文件缺少调试日志"
    ((FAILED++))
fi

# 检查状态页面
if [ -f "backend-status.html" ]; then
    echo -e "${GREEN}✓${NC} backend-status.html 存在"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} backend-status.html 不存在"
    ((FAILED++))
fi

# 检查构建输出
if [ -f ".wrangler/dist/index.js" ]; then
    echo -e "${GREEN}✓${NC} 构建输出存在"
    ((PASSED++))
    
    if grep -q "/api/backend/status" ".wrangler/dist/index.js" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} 构建输出包含状态端点"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} 构建输出缺少状态端点"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗${NC} 构建输出不存在"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 测试构建"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 构建成功"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} 构建失败"
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
    echo -e "${GREEN}✅ 所有测试通过！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📝 下一步：${NC}"
    echo ""
    echo "  1️⃣  本地测试:"
    echo "     wrangler dev"
    echo "     open http://localhost:8787/backend-status.html"
    echo ""
    echo "  2️⃣  查看日志:"
    echo "     wrangler tail"
    echo ""
    echo "  3️⃣  部署到 Cloudflare:"
    echo "     wrangler deploy"
    echo ""
    echo "  4️⃣  测试 API 端点:"
    echo "     curl https://your-worker.workers.dev/api/backend/status"
    echo ""
    echo -e "${BLUE}📚 查看完整文档：${NC}"
    echo "     cat BACKEND_STATUS_GUIDE.md"
    echo ""
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ 测试失败${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}💡 建议：${NC}"
    echo "  - 检查 workers/auth-worker.js 是否已更新"
    echo "  - 运行 npm run build 重新构建"
    echo "  - 查看 BACKEND_STATUS_GUIDE.md 获取帮助"
    echo ""
    exit 1
fi
