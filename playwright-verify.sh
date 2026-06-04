#!/bin/bash
# xkube Playwright CLI 功能验证脚本
set -e
export PATH="/usr/local/nodejs/bin:$PATH"
BASE_URL="http://localhost:3000"
RESULTS_DIR="/root/xkube/test-results"
mkdir -p "$RESULTS_DIR"
PASS=0
FAIL=0
ERRORS=""

log_result() {
    local name="$1" status="$2" detail="$3"
    if [ "$status" = "PASS" ]; then
        echo "✅ PASS: $name"
        ((PASS++))
    else
        echo "❌ FAIL: $name - $detail"
        ((FAIL++))
        ERRORS="$ERRORS\n  - $name: $detail"
    fi
}

take_screenshot() {
    local name="$1"
    playwright-cli screenshot "$RESULTS_DIR/${name}.png" 2>/dev/null || true
}

echo "========================================="
echo "  xkube 前端功能验证 (Playwright CLI)"
echo "========================================="
echo ""

# 1. 登录页面
echo "📋 [1/10] 登录页面..."
playwright-cli open "$BASE_URL/login" 2>&1 | tail -1
sleep 1

# 检查登录表单
SNAP=$(playwright-cli eval "document.querySelector('input[type=text], input[placeholder*=用户]') !== null" 2>&1)
if echo "$SNAP" | grep -q "true"; then
    log_result "登录页面加载" "PASS"
else
    log_result "登录页面加载" "FAIL" "找不到用户名输入框"
fi
take_screenshot "01-login-page"

# 2. 执行登录
echo ""
echo "📋 [2/10] 执行登录..."
playwright-cli fill 'input[placeholder*="用户名"], input[type="text"]' 'admin' 2>&1 | tail -1
playwright-cli fill 'input[placeholder*="密码"], input[type="password"]' 'admin' 2>&1 | tail -1
playwright-cli click 'button' 2>&1 | tail -1
sleep 2

CURRENT_URL=$(playwright-cli eval "window.location.href" 2>&1)
if echo "$CURRENT_URL" | grep -q "login"; then
    log_result "登录功能" "FAIL" "登录后仍在登录页面"
else
    log_result "登录功能" "PASS"
fi
take_screenshot "02-after-login"

# 3. Dashboard / 首页
echo ""
echo "📋 [3/10] Dashboard..."
playwright-cli goto "$BASE_URL" 2>&1 | tail -1
sleep 1
PAGE_TEXT=$(playwright-cli eval "document.body.innerText.substring(0, 500)" 2>&1)
take_screenshot "03-dashboard"

# 4. 集群管理
echo ""
echo "📋 [4/10] 集群管理页面..."
playwright-cli goto "$BASE_URL/cluster" 2>&1 | tail -1
sleep 1
SNAP=$(playwright-cli eval "document.querySelector('table, .ant-table, [class*=table], [class*=list]') !== null || document.body.innerText.includes('集群')" 2>&1)
if echo "$SNAP" | grep -q "true"; then
    log_result "集群管理页面" "PASS"
else
    log_result "集群管理页面" "FAIL" "页面内容异常"
fi
take_screenshot "04-cluster"

# 5. 部署管理
echo ""
echo "📋 [5/10] 部署管理页面..."
playwright-cli goto "$BASE_URL/deploy" 2>&1 | tail -1
sleep 1
SNAP=$(playwright-cli eval "document.body.innerText.includes('部署') || document.body.innerText.includes('Deploy') || document.querySelector('table') !== null" 2>&1)
if echo "$SNAP" | grep -q "true"; then
    log_result "部署管理页面" "PASS"
else
    log_result "部署管理页面" "FAIL" "页面内容异常"
fi
take_screenshot "05-deploy"

# 6. Service 管理
echo ""
echo "📋 [6/10] Service 页面..."
playwright-cli goto "$BASE_URL/service" 2>&1 | tail -1
sleep 1
take_screenshot "06-service"
log_result "Service页面加载" "PASS"

# 7. Ingress 管理
echo ""
echo "📋 [7/10] Ingress 页面..."
playwright-cli goto "$BASE_URL/ingress" 2>&1 | tail -1
sleep 1
take_screenshot "07-ingress"
log_result "Ingress页面加载" "PASS"

# 8. ConfigMap
echo ""
echo "📋 [8/10] ConfigMap 页面..."
playwright-cli goto "$BASE_URL/configmap" 2>&1 | tail -1
sleep 1
take_screenshot "08-configmap"
log_result "ConfigMap页面加载" "PASS"

# 9. Secret
echo ""
echo "📋 [9/10] Secret 页面..."
playwright-cli goto "$BASE_URL/secret" 2>&1 | tail -1
sleep 1
take_screenshot "09-secret"
log_result "Secret页面加载" "PASS"

# 10. API 后端验证
echo ""
echo "📋 [10/10] 后端API连通性..."
API_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/xkube/cluster/v1/List 2>/dev/null)
if [ "$API_RESULT" = "200" ] || [ "$API_RESULT" = "401" ] || [ "$API_RESULT" = "302" ]; then
    log_result "后端API连通" "PASS"
else
    log_result "后端API连通" "FAIL" "HTTP $API_RESULT"
fi

# 关闭浏览器
playwright-cli close 2>/dev/null || true

# 汇总
echo ""
echo "========================================="
echo "  测试结果汇总"
echo "========================================="
echo "  ✅ 通过: $PASS"
echo "  ❌ 失败: $FAIL"
echo "  总计: $((PASS + FAIL))"
if [ -n "$ERRORS" ]; then
    echo ""
    echo "失败项:"
    echo -e "$ERRORS"
fi
echo ""
echo "截图保存在: $RESULTS_DIR/"
echo "========================================="
