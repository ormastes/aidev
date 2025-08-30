#!/usr/bin/env bash

# AI Development Platform - Unified Test Runner
# Runs all tests from root using Bun as primary runner

set -e

echo "🚀 AI Development Platform - Running All Tests"
echo "========================================="
echo "Using Bun as primary test runner"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
FAILED_TESTS=()
PASSED_TESTS=()

# Function to run tests and capture results
run_test_suite() {
    local name=$1
    local command=$2
    
    echo -e "${YELLOW}Running $name tests...${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ $name tests PASSED${NC}\n"
        PASSED_TESTS+=("$name")
    else
        echo -e "${RED}❌ $name tests FAILED${NC}\n"
        FAILED_TESTS+=("$name")
    fi
}

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies with Bun..."
    bun install
fi

# TypeScript/JavaScript tests with Bun
run_test_suite "TypeScript/JavaScript" "bun test"

# External tests (.etest.ts files)
if find . -name "*.etest.ts" -not -path "./node_modules/*" -not -path "./dist/*" | grep -q .; then
    run_test_suite "External Tests" "bun test **/*.etest.ts"
fi

# Cucumber/BDD tests
if [ -f "scripts/bun-cucumber-runner.ts" ]; then
    run_test_suite "Cucumber/BDD" "bun run scripts/bun-cucumber-runner.ts"
fi

# Python tests
if command -v python3 &> /dev/null && find . -name "*_test.py" -o -name "test_*.py" | grep -q .; then
    run_test_suite "Python" "python3 -m pytest -v"
fi

# Story Reporter tests
if [ -d "layer/themes/infra_story-reporter" ]; then
    run_test_suite "Story Reporter" "cd layer/themes/infra_story-reporter && bun test"
fi

# Test setup folder tests
if [ -d "setup" ] && [ -f "setup/package.json" ]; then
    run_test_suite "Setup Tests" "cd setup && bun test"
fi

# Summary
echo ""
echo "========================================="
echo "📊 Test Results Summary"
echo "========================================="

if [ ${#PASSED_TESTS[@]} -gt 0 ]; then
    echo -e "${GREEN}Passed Tests:${NC}"
    for test in "${PASSED_TESTS[@]}"; do
        echo -e "  ✅ $test"
    done
fi

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo -e "\n${RED}Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  ❌ $test"
    done
    echo ""
    echo -e "${RED}Some tests failed. Please check the output above.${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}✨ All tests passed successfully!${NC}"
fi
