#!/bin/bash

# 集成验证脚本
# Integration Verification Script

echo "🔍 开始验证集成..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数
PASSED=0
FAILED=0

# 检查函数
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2 - 文件不存在"
        ((FAILED++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $3"
        ((FAILED++))
    fi
}

echo "📁 检查文件结构..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查核心文件
check_file "lib/supabase.ts" "lib/supabase.ts 存在"
check_file "components/RightSidebar.tsx" "components/RightSidebar.tsx 存在"
check_file "app/page.tsx" "app/page.tsx 存在"
check_file "app/layout.tsx" "app/layout.tsx 存在"

echo ""
echo "🔧 检查函数实现..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 Supabase 函数
check_content "lib/supabase.ts" "getSupabaseClient" "getSupabaseClient 函数存在"
check_content "lib/supabase.ts" "getSupabase" "getSupabase 函数存在"
check_content "lib/supabase.ts" "Env" "Env 接口定义存在"

echo ""
echo "🎨 检查 UI 组件..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查右侧边栏功能
check_content "components/RightSidebar.tsx" "搜索" "搜索功能实现"
check_content "components/RightSidebar.tsx" "categories" "分类板块实现"
check_content "components/RightSidebar.tsx" "is_authorized" "授权用户入口实现"
check_content "components/RightSidebar.tsx" "fixed right-0" "固定定位样式"
check_content "components/RightSidebar.tsx" "backdrop-blur" "模糊效果样式"

echo ""
echo "💰 检查付费内容功能..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查付费标识
check_content "app/page.tsx" "is_paid" "付费标识字段"
check_content "app/page.tsx" "付费阅读" "付费徽章显示"
check_content "app/page.tsx" "price" "价格显示"

echo ""
echo "⚙️  检查 Cloudflare Workers 适配..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 Workers 配置
check_content "lib/supabase.ts" "persistSession: false" "Session 持久化禁用"
check_content "lib/supabase.ts" "detectSessionInUrl: false" "URL Session 检测禁用"
check_content "components/RightSidebar.tsx" "'use client'" "客户端组件标记"

echo ""
echo "📊 检查类型定义..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file "types/database.ts" "types/database.ts 存在"
check_content "types/database.ts" "Post" "Post 类型定义"
check_content "types/database.ts" "Category" "Category 类型定义"
check_content "types/database.ts" "Profile" "Profile 类型定义"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 验证结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！集成完成。${NC}"
    echo ""
    echo "📝 下一步："
    echo "  1. 配置环境变量 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    echo "  2. 运行 npm run dev 测试本地环境"
    echo "  3. 部署到 Cloudflare Workers/Pages"
    echo ""
    exit 0
else
    echo -e "${RED}❌ 发现问题，请检查失败项。${NC}"
    echo ""
    echo "💡 提示："
    echo "  - 确保所有文件都已创建"
    echo "  - 检查文件内容是否完整"
    echo "  - 查看 INTEGRATION_COMPLETE.md 获取详细信息"
    echo ""
    exit 1
fi
