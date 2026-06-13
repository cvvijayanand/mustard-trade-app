#!/usr/bin/env bash
# Production smoke tests for trade-app.mustardliving.com
set -euo pipefail

APP_URL="${APP_URL:-https://trade-app.mustardliving.com}"
DEVSTORE="${DEVSTORE:-mustardliving-devstore.myshopify.com}"
LIVE_STORE="${LIVE_STORE:-www.mustardliving.com}"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

code=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/")
[[ "$code" == "200" ]] && pass "App host root ($code)" || fail "App host root ($code)"

body=$(curl -s "$APP_URL/apps/trade-order/create")
echo "$body" | grep -q '"ok":true' && pass "App proxy health JSON" || fail "App proxy health: $body"

code=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/?shop=${DEVSTORE}")
[[ "$code" == "302" || "$code" == "200" ]] && pass "Shop redirect ($code)" || fail "Shop redirect ($code)"

proxy_body=$(curl -s "https://${DEVSTORE}/apps/trade-order/create" || true)
if echo "$proxy_body" | grep -q '"ok":true'; then
  pass "Devstore app proxy health JSON"
elif echo "$proxy_body" | grep -qi "Something went wrong"; then
  echo "WARN: Devstore proxy returned Shopify error page — redeploy app fixes, then open app in Admin"
else
  echo "WARN: Devstore proxy response: ${proxy_body:0:200}"
fi

post_body=$(curl -s -X POST "https://${DEVSTORE}/apps/trade-order/create" \
  -H "Content-Type: application/json" \
  -d '{}' || true)
if echo "$post_body" | grep -q '"success":false'; then
  pass "Devstore proxy POST returns app JSON"
elif echo "$post_body" | grep -qi "Something went wrong"; then
  echo "WARN: Devstore POST returned Shopify error page — open app in Admin once, then retry"
else
  echo "WARN: Devstore POST response: ${post_body:0:200}"
fi

echo ""
echo "Done. If proxy tests warn, deploy latest code then open Apps → mustard-trade-app in Admin."
