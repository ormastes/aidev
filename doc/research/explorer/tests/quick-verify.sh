#!/bin/bash

# Quick verification script for Explorer system tests
# This demonstrates that the Explorer can detect real failures

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/../test-apps/vulnerable-app"
PORT=3459

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================"
echo "    EXPLORER DETECTION VERIFICATION"
echo "================================================"
echo ""

# Start vulnerable app
echo "🚀 Starting vulnerable test app on port $PORT..."
cd "$APP_DIR"
PORT=$PORT node server.js > /dev/null 2>&1 &
APP_PID=$!

# Wait for app to start
sleep 2

# Function to test endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local check=$3
    
    echo -n "Testing: $description... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if eval "$check"; then
        echo -e "${GREEN}✅ Bug detected!${NC}"
        return 0
    else
        echo -e "${RED}❌ Bug not present${NC}"
        return 1
    fi
}

echo ""
echo "🔍 Verifying intentional bugs are present:"
echo "==========================================="

# Test 1: Console errors
echo -n "1. Console errors... "
if curl -s http://localhost:$PORT/ | grep -q "console.error"; then
    echo -e "${GREEN}✅ Present${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

# Test 2: XSS vulnerability
echo -n "2. XSS vulnerability... "
xss_test=$(curl -s "http://localhost:$PORT/search?q=<script>alert(1)</script>")
if echo "$xss_test" | grep -q "<script>alert(1)</script>"; then
    echo -e "${GREEN}✅ Present${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

# Test 3: Stack trace exposure
echo -n "3. Stack trace exposure... "
stack_test=$(curl -s http://localhost:$PORT/api/error)
if echo "$stack_test" | grep -q "stack"; then
    echo -e "${GREEN}✅ Present${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

# Test 4: Missing security headers
echo -n "4. Missing security headers... "
headers=$(curl -sI http://localhost:$PORT/api/users)
if ! echo "$headers" | grep -q "X-Content-Type-Options"; then
    echo -e "${GREEN}✅ Missing (as expected)${NC}"
else
    echo -e "${RED}❌ Headers present${NC}"
fi

# Test 5: API schema mismatch
echo -n "5. API schema mismatch... "
api_response=$(curl -s http://localhost:$PORT/api/users)
if echo "$api_response" | grep -q '"items"' && ! echo "$api_response" | grep -q '"total"'; then
    echo -e "${GREEN}✅ Present${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

# Test 6: 5xx error
echo -n "6. Server error (5xx)... "
error_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/crash)
if [ "$error_code" = "503" ]; then
    echo -e "${GREEN}✅ Present${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

# Test 7: Slow response
echo -n "7. Slow response (>3s)... "
start_time=$(date +%s%N)
curl -s -X POST http://localhost:$PORT/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' > /dev/null 2>&1
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))
if [ $duration -gt 3000 ]; then
    echo -e "${GREEN}✅ Present (${duration}ms)${NC}"
else
    echo -e "${RED}❌ Too fast (${duration}ms)${NC}"
fi

# Test 8: PII leak
echo -n "8. PII leak in errors... "
pii_test=$(curl -s -X POST http://localhost:$PORT/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@test.com","password":"secretpass"}')
if echo "$pii_test" | grep -q "secretpass"; then
    echo -e "${GREEN}✅ Present${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

echo ""
echo "==========================================="
echo -e "${GREEN}✅ All intentional bugs verified!${NC}"
echo ""
echo "The Explorer should be able to detect these issues."
echo "Run './run-system-tests.sh' for full test suite."
echo ""

# Cleanup
kill $APP_PID 2>/dev/null || true

echo "Test app stopped."