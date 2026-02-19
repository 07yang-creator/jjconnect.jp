#!/bin/bash

# Cloudflare Worker 测试脚本
# 用于快速测试 Worker API 端点

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API 端点
API_ENDPOINT="http://localhost:8787"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  JJConnect Worker API 测试工具${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 Worker 是否运行
echo -e "${YELLOW}1. 检查 Worker 健康状态...${NC}"
HEALTH_RESPONSE=$(curl -s "${API_ENDPOINT}/api/health")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Worker 正在运行${NC}"
    echo "   响应: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Worker 未运行${NC}"
    echo -e "${YELLOW}   请先运行: npm run dev${NC}"
    exit 1
fi
echo ""

# 测试登录 - Admin
echo -e "${YELLOW}2. 测试登录 (Admin)...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Admin 登录成功${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${TOKEN:0:50}..."
else
    echo -e "${RED}✗ Admin 登录失败${NC}"
    echo "   响应: $LOGIN_RESPONSE"
fi
echo ""

# 测试认证检查
if [ ! -z "$TOKEN" ]; then
    echo -e "${YELLOW}3. 测试认证检查...${NC}"
    AUTH_RESPONSE=$(curl -s "${API_ENDPOINT}/api/auth/check" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$AUTH_RESPONSE" | grep -q '"authenticated":true'; then
        echo -e "${GREEN}✓ Token 验证成功${NC}"
        echo "   响应: $AUTH_RESPONSE"
    else
        echo -e "${RED}✗ Token 验证失败${NC}"
        echo "   响应: $AUTH_RESPONSE"
    fi
    echo ""
    
    # 测试获取用户列表
    echo -e "${YELLOW}4. 测试获取用户列表 (需要 Admin 权限)...${NC}"
    USERS_RESPONSE=$(curl -s "${API_ENDPOINT}/api/users" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$USERS_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ 获取用户列表成功${NC}"
        echo "   响应: $USERS_RESPONSE"
    else
        echo -e "${RED}✗ 获取用户列表失败${NC}"
        echo "   响应: $USERS_RESPONSE"
    fi
    echo ""
fi

# 测试登录 - Editor
echo -e "${YELLOW}5. 测试登录 (Editor)...${NC}"
EDITOR_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"editor","password":"editor123"}')

if echo "$EDITOR_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Editor 登录成功${NC}"
    EDITOR_TOKEN=$(echo "$EDITOR_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    # 测试 Editor 访问用户列表（应该失败）
    echo -e "${YELLOW}6. 测试 Editor 访问用户列表（应该被拒绝）...${NC}"
    EDITOR_USERS=$(curl -s "${API_ENDPOINT}/api/users" \
      -H "Authorization: Bearer $EDITOR_TOKEN")
    
    if echo "$EDITOR_USERS" | grep -q '"error".*"权限不足"'; then
        echo -e "${GREEN}✓ 权限控制正常工作${NC}"
        echo "   响应: $EDITOR_USERS"
    else
        echo -e "${RED}✗ 权限控制异常${NC}"
        echo "   响应: $EDITOR_USERS"
    fi
else
    echo -e "${RED}✗ Editor 登录失败${NC}"
    echo "   响应: $EDITOR_RESPONSE"
fi
echo ""

# 测试错误情况
echo -e "${YELLOW}7. 测试错误处理（错误密码）...${NC}"
ERROR_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpassword"}')

if echo "$ERROR_RESPONSE" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ 错误处理正常${NC}"
    echo "   响应: $ERROR_RESPONSE"
else
    echo -e "${RED}✗ 错误处理异常${NC}"
    echo "   响应: $ERROR_RESPONSE"
fi
echo ""

# 测试登出
echo -e "${YELLOW}8. 测试登出...${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}/api/auth/logout")

if echo "$LOGOUT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ 登出成功${NC}"
    echo "   响应: $LOGOUT_RESPONSE"
else
    echo -e "${RED}✗ 登出失败${NC}"
    echo "   响应: $LOGOUT_RESPONSE"
fi
echo ""

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  测试完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}测试账号信息：${NC}"
echo "  Admin:  username=admin,  password=admin123"
echo "  Editor: username=editor, password=editor123"
echo "  Viewer: username=viewer, password=viewer123"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo "  1. 在浏览器中打开 login.html"
echo "  2. 使用测试账号登录"
echo "  3. 查看浏览器控制台的网络请求"
echo ""
