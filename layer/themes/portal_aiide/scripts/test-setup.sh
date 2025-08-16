#!/bin/bash

# AIIDE Setup Test Script
# Tests all components and reports status

set -e

echo "🔍 AIIDE Setup Verification Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test a condition
test_condition() {
    local test_name="$1"
    local command="$2"
    
    echo -n "Testing $test_name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    nc -z localhost $port
}

echo "1. Checking Dependencies"
echo "------------------------"
test_condition "Node.js installed" "which node"
test_condition "npm installed" "which npm"
test_condition "Node version >= 18" "[[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -ge 18 ]]"
echo ""

echo "2. Checking Project Structure"
echo "-----------------------------"
test_condition "package.json exists" "[[ -f package.json ]]"
test_condition "node_modules exists" "[[ -d node_modules ]]"
test_condition "children directory exists" "[[ -d children ]]"
test_condition "server directory exists" "[[ -d server ]]"
test_condition "workspace directory exists" "[[ -d workspace ]]"
echo ""

echo "3. Checking Environment"
echo "-----------------------"
test_condition ".env file exists" "[[ -f .env ]]"
test_condition ".env.example exists" "[[ -f .env.example ]]"
echo ""

echo "4. Checking Services"
echo "-------------------"
test_condition "Frontend running (port 5173)" "check_port 5173"
test_condition "Backend running (port 3457)" "check_port 3457"
echo ""

echo "5. Testing API Endpoints"
echo "-----------------------"
test_condition "Health check" "curl -s http://localhost:3457/api/health | grep -q 'ok'"
test_condition "Providers endpoint" "curl -s http://localhost:3457/api/providers | grep -q 'claude'"
test_condition "File tree endpoint" "curl -s 'http://localhost:3457/api/files/tree?path=workspace' | grep -q 'workspace'"
echo ""

echo "6. Checking Build"
echo "----------------"
test_condition "dist directory exists" "[[ -d dist ]]"
test_condition "Build files present" "[[ -f dist/index.html ]]"
echo ""

echo "7. Testing File Operations"
echo "-------------------------"
# Create test file
TEST_FILE="workspace/test-$(date +%s).txt"
test_condition "Create file via API" "curl -s -X POST http://localhost:3457/api/files/create \
    -H 'Content-Type: application/json' \
    -d '{\"path\":\"$TEST_FILE\",\"content\":\"test\",\"type\":\"file\"}' | grep -q 'success'"

# Read test file
test_condition "Read file via API" "curl -s 'http://localhost:3457/api/files/read?path=$TEST_FILE' | grep -q 'test'"

# Delete test file
test_condition "Delete file via API" "curl -s -X DELETE 'http://localhost:3457/api/files/delete?path=$TEST_FILE' | grep -q 'success'"
echo ""

echo "8. Checking Documentation"
echo "------------------------"
test_condition "README.md exists" "[[ -f README.md ]]"
test_condition "DEPLOYMENT.md exists" "[[ -f DEPLOYMENT.md ]]"
test_condition "API.md exists" "[[ -f API.md ]]"
test_condition "QUICK_START.md exists" "[[ -f QUICK_START.md ]]"
echo ""

echo "=================================="
echo "📊 Test Results"
echo "=================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 All tests passed! AIIDE is properly set up.${NC}"
    echo ""
    echo "You can now access AIIDE at:"
    echo "  • Frontend: http://localhost:5173"
    echo "  • Backend API: http://localhost:3457"
    echo "  • API Docs: http://localhost:3457/api-docs"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please check the setup.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  • Run 'npm install' to install dependencies"
    echo "  • Run 'npm start' to start services"
    echo "  • Check .env file for API keys"
    echo "  • Run 'npm run build' to create production build"
    exit 1
fi