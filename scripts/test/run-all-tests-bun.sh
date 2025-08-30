#!/usr/bin/env bash

# AI Development Platform - Unified Bun Test Runner
# Runs all tests using Bun with coverage reporting

set -e

echo "🚀 AI Development Platform - Bun Test Runner"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Function to run tests for a specific directory
run_tests() {
    local name=$1
    local path=$2
    local pattern=${3:-"**/*.test.ts"}
    
    echo -e "${YELLOW}Testing $name...${NC}"
    
    if [ -d "$path" ]; then
        cd "$path"
        
        if bun test $pattern --coverage 2>&1 | tee test-output.tmp; then
            local test_count=$(grep -E "Ran [0-9]+ test" test-output.tmp | grep -oE "[0-9]+" | head -1 || echo "0")
            TOTAL_TESTS=$((TOTAL_TESTS + test_count))
            PASSED_TESTS=$((PASSED_TESTS + test_count))
            echo -e "${GREEN}✅ $name: $test_count tests passed${NC}\n"
        else
            echo -e "${RED}❌ $name: Some tests failed${NC}\n"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
        
        rm -f test-output.tmp
        cd "$PROJECT_ROOT"
    else
        echo "⏭️  $name: Directory not found\n"
    fi
}

# Run tests for each theme
echo "🧪 Running Theme Tests..."
echo "-------------------------"

# Story Reporter Theme
run_tests "Story Reporter" "layer/themes/infra_story-reporter" "user-stories/**/*.test.ts"

# External Log Lib Theme
run_tests "External Log Lib" "layer/themes/infra_external-log-lib" "**/*.test.ts"

# Filesystem MCP Theme
run_tests "Filesystem MCP" "layer/themes/infra_filesystem-mcp" "**/*.test.ts"

# Run other test patterns
echo ""
echo "🧪 Running Other Test Types..."
echo "------------------------------"

# External tests
if find . -name "*.etest.ts" -not -path "*/node_modules/*" | grep -q .; then
    run_tests "External Tests" "." "**/*.etest.ts"
fi

# Spec tests
if find . -name "*.spec.ts" -not -path "*/node_modules/*" | grep -q .; then
    run_tests "Spec Tests" "." "**/*.spec.ts"
fi

# Summary
echo ""
echo "============================================="
echo "📊 Test Summary"
echo "============================================="
echo -e "Total tests run: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✨ All tests passed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the output above.${NC}"
    exit 1
fi