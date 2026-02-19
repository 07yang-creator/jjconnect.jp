#!/bin/bash

# Supabase 客户端测试脚本
# 用于验证 Supabase 配置是否正确

set -e

echo "🔍 检查 Supabase 客户端配置..."
echo ""

# 检查必需的文件
echo "📁 检查文件..."
files=(
  "lib/supabase.ts"
  "types/database.types.ts"
  ".dev.vars"
)

all_files_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (缺失)"
    all_files_exist=false
  fi
done

if [ "$all_files_exist" = false ]; then
  echo ""
  echo "⚠️  警告: 部分文件缺失，请先创建所需文件"
  exit 1
fi

echo ""
echo "📦 检查 npm 依赖..."
if npm list @supabase/supabase-js > /dev/null 2>&1; then
  echo "  ✅ @supabase/supabase-js 已安装"
else
  echo "  ❌ @supabase/supabase-js 未安装"
  echo "     运行: npm install @supabase/supabase-js"
  exit 1
fi

echo ""
echo "🔐 检查环境变量配置..."
if [ -f ".dev.vars" ]; then
  if grep -q "你的Supabase项目URL" .dev.vars || grep -q "你的Supabase公共匿名Key" .dev.vars; then
    echo "  ⚠️  .dev.vars 包含占位符，请填入实际的 Supabase 凭证"
    echo ""
    echo "     1. 登录 https://supabase.com/dashboard"
    echo "     2. 选择您的项目"
    echo "     3. 进入 Settings → API"
    echo "     4. 复制 Project URL 和 anon/public key"
    echo "     5. 更新 .dev.vars 文件"
  else
    echo "  ✅ .dev.vars 已配置"
  fi
fi

echo ""
echo "🧪 运行类型检查..."
if command -v tsc &> /dev/null; then
  # 简单检查语法
  echo "  ⏭️  跳过详细的 TypeScript 检查 (可手动运行: npx tsc --noEmit)"
else
  echo "  ⏭️  跳过 (未安装 TypeScript)"
fi

echo ""
echo "📚 可用的文档:"
echo "  - lib/SUPABASE_CLIENT_GUIDE.md (详细指南)"
echo "  - lib/SUPABASE_QUICK_REF.md (快速参考)"
echo "  - lib/supabase-worker-example.ts (完整示例)"
echo ""

echo "🚀 下一步操作:"
echo "  1. 配置 .dev.vars 文件（如果尚未配置）"
echo "  2. 运行: wrangler dev"
echo "  3. 测试您的 Worker 端点"
echo ""

echo "✅ Supabase 客户端配置检查完成！"
