#!/bin/bash

# wrangler.toml 配置验证脚本
# Wrangler Configuration Verification Script

echo "🔍 验证 wrangler.toml 配置..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# 检查函数
check_config() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $3"
        ((FAILED++))
    fi
}

check_not_exists() {
    if ! grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $3 - 仍然存在"
        ((FAILED++))
    fi
}

echo "📋 检查 wrangler.toml 配置..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 main 配置
check_config "wrangler.toml" 'main = ".wrangler/dist/index.js"' "main 指向构建输出"

# 检查 [build] 配置
check_config "wrangler.toml" '\[build\]' "[build] 配置存在"
check_config "wrangler.toml" 'command = "npm run build"' "build 命令配置正确"

# 检查 D1 相关内容已删除
check_not_exists "wrangler.toml" "D1" "D1 数据库引用已删除"
check_not_exists "wrangler.toml" "DATABASE_PASSWORD" "DATABASE_PASSWORD 引用已删除"

echo ""
echo "📦 检查 package.json..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_config "package.json" '"build":' "build 脚本存在"

echo ""
echo "🔨 测试构建流程..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 测试构建
echo -n "执行 npm run build... "
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# 检查构建输出
if [ -f ".wrangler/dist/index.js" ]; then
    echo -e "${GREEN}✓${NC} 构建输出文件存在 (.wrangler/dist/index.js)"
    ((PASSED++))
    
    # 检查文件大小
    FILE_SIZE=$(wc -c < ".wrangler/dist/index.js")
    if [ "$FILE_SIZE" -gt 100 ]; then
        echo -e "${GREEN}✓${NC} 构建输出文件有效 (${FILE_SIZE} bytes)"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} 构建输出文件太小"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗${NC} 构建输出文件不存在"
    ((FAILED++))
fi

echo ""
echo "🔍 检查配置完整性..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查必要的配置项
check_config "wrangler.toml" 'name = "jjconnect-auth-worker"' "Worker 名称配置"
check_config "wrangler.toml" 'compatibility_date' "兼容性日期配置"
check_config "wrangler.toml" 'workers_dev = true' "开发环境配置"
check_config "wrangler.toml" '\[env.production\]' "生产环境配置"
check_config "wrangler.toml" '\[dev\]' "开发服务器配置"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 验证结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 所有检查通过！配置正确。${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📝 下一步：${NC}"
    echo "  1. 配置环境变量（创建 .dev.vars 文件）"
    echo "  2. 测试本地开发: npm run dev"
    echo "  3. 部署到 Cloudflare: wrangler deploy"
    echo ""
    echo -e "${BLUE}📚 相关文档：${NC}"
    echo "  - WRANGLER_CONFIG_UPDATE.md - 配置说明"
    echo "  - DEPLOYMENT_READY.md - 部署指南"
    echo ""
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ 发现问题，请检查失败项。${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}💡 建议：${NC}"
    echo "  - 检查 wrangler.toml 文件内容"
    echo "  - 确保 package.json 包含 build 脚本"
    echo "  - 运行 npm install 安装依赖"
    echo "  - 查看 WRANGLER_CONFIG_UPDATE.md 获取详细说明"
    echo ""
    exit 1
fi
