#!/bin/bash

# Comprehensive test runner for coordinator-claude-agent
# Following Mock-Free Test Oriented Development (MFTOD) principles

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Running Coordinator Agent Tests${NC}"
echo "================================="

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local command=$2
    
    echo -e "\n${YELLOW}▶ Running ${suite_name} Tests${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✅ ${suite_name} Tests Passed${NC}"
    else
        echo -e "${RED}❌ ${suite_name} Tests Failed${NC}"
        exit 1
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from coordinator-claude-agent directory${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Clean previous test artifacts
echo -e "${YELLOW}🧹 Cleaning test artifacts...${NC}"
rm -rf coverage .nyc_output test-results playwright-report

# Run TypeScript compilation check
echo -e "\n${YELLOW}📐 Type Checking...${NC}"
npm run typecheck

# Run linting
echo -e "\n${YELLOW}🔍 Linting...${NC}"
npm run lint

# Run different test suites based on MFTOD levels

# Level 1: Unit Tests
run_test_suite "Unit" "npm run test:unit"

# Level 2: Integration Tests
run_test_suite "Integration" "npm run test:integration"

# Level 3: External Tests (only if API key is available)
if [ -n "$CLAUDE_API_KEY" ] || [ -n "$CLAUDE_API_KEY_TEST" ]; then
    run_test_suite "External" "npm run test:external"
else
    echo -e "\n${YELLOW}⚠️  Skipping External Tests (no API key found)${NC}"
fi

# Level 4: System Tests (E2E with Playwright)
if command -v bunx &> /dev/null && bunx playwright --version &> /dev/null; then
    run_test_suite "System (E2E)" "npm run test:system"
else
    echo -e "\n${YELLOW}⚠️  Skipping System Tests (Playwright not installed)${NC}"
fi

# Level 5: Environment Tests
run_test_suite "Environment" "npm run test:env"

# Generate coverage report
echo -e "\n${YELLOW}📊 Generating Coverage Report...${NC}"
npm run test:coverage -- --silent

# Check coverage thresholds
echo -e "\n${YELLOW}📈 Coverage Summary:${NC}"
if [ -f "coverage/lcov-report/index.html" ]; then
    # Extract coverage percentages from lcov.info
    if [ -f "coverage/lcov.info" ]; then
        lines=$(grep -A 1 "LF:" coverage/lcov.info | grep "LH:" | awk '{s+=$2} END {print s}')
        total=$(grep "LF:" coverage/lcov.info | awk '{s+=$2} END {print s}')
        if [ "$total" -gt 0 ]; then
            coverage=$((lines * 100 / total))
            echo -e "Line Coverage: ${coverage}%"
            
            if [ $coverage -ge 80 ]; then
                echo -e "${GREEN}✅ Coverage threshold met!${NC}"
            else
                echo -e "${RED}❌ Coverage below 80% threshold${NC}"
            fi
        fi
    fi
    echo -e "\nDetailed report: file://$(pwd)/coverage/lcov-report/index.html"
fi

# Performance check
echo -e "\n${YELLOW}⚡ Performance Check...${NC}"
if [ -n "$RUN_PERFORMANCE_TESTS" ]; then
    echo "Running performance tests..."
    npm test -- --testNamePattern="performance" --verbose
else
    echo "Set RUN_PERFORMANCE_TESTS=1 to run performance tests"
fi

# Final summary
echo -e "\n${GREEN}════════════════════════════════${NC}"
echo -e "${GREEN}✅ All Tests Completed Successfully!${NC}"
echo -e "${GREEN}════════════════════════════════${NC}"

# Optional: Build check
if [ "$1" = "--with-build" ]; then
    echo -e "\n${YELLOW}🔨 Building Project...${NC}"
    npm run build
    echo -e "${GREEN}✅ Build Successful${NC}"
fi

# Development tips
echo -e "\n${BLUE}💡 Development Tips:${NC}"
echo "• Run 'npm run test:watch' for TDD mode"
echo "• Use 'npm run dev' to start in development mode"
echo "• Check './coordinator-claude start --help' for CLI options"
echo "• Session files are stored in .coordinator-sessions/"

exit 0