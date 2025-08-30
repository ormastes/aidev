#!/bin/bash

# Playwright Test Runner Script
# Runs click-based tests for AI Dev Portal

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎭 Playwright Click-Based Test Runner${NC}\n"

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTAL_DIR="$PROJECT_ROOT/layer/themes/init_setup-folder"
TEST_RESULTS="$PROJECT_ROOT/test-results"

# Parse arguments
RUN_MODE="${1:-headless}"
TEST_FILTER="${2:-}"

# Create test results directory
mkdir -p "$TEST_RESULTS"
mkdir -p "$TEST_RESULTS/visual"

# Function to check if portal is running
check_portal() {
    echo -e "${YELLOW}Checking if portal is running...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3156 | grep -q "200"; then
        echo -e "${GREEN}✅ Portal is already running${NC}"
        return 0
    else
        echo -e "${YELLOW}Portal not running${NC}"
        return 1
    fi
}

# Function to start portal
start_portal() {
    echo -e "${YELLOW}Starting AI Dev Portal...${NC}"
    cd "$PORTAL_DIR"
    DEPLOY_TYPE=local bun run ./start-project-portal.ts > /dev/null 2>&1 &
    PORTAL_PID=$!
    
    # Wait for portal to start
    for i in {1..30}; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3156 | grep -q "200"; then
            echo -e "${GREEN}✅ Portal started (PID: $PORTAL_PID)${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ Portal failed to start${NC}"
    return 1
}

# Check or start portal
PORTAL_STARTED=false
if ! check_portal; then
    if start_portal; then
        PORTAL_STARTED=true
    else
        exit 1
    fi
fi

# Prepare Playwright command
cd "$PROJECT_ROOT"

if [ "$RUN_MODE" = "headed" ]; then
    echo -e "${YELLOW}Running tests in headed mode (browser visible)${NC}"
    PLAYWRIGHT_CMD="bunx playwright test --headed"
elif [ "$RUN_MODE" = "debug" ]; then
    echo -e "${YELLOW}Running tests in debug mode${NC}"
    PLAYWRIGHT_CMD="bunx playwright test --debug"
elif [ "$RUN_MODE" = "ui" ]; then
    echo -e "${YELLOW}Opening Playwright UI${NC}"
    PLAYWRIGHT_CMD="bunx playwright test --ui"
else
    echo -e "${YELLOW}Running tests in headless mode${NC}"
    PLAYWRIGHT_CMD="bunx playwright test"
fi

# Add test filter if provided
if [ -n "$TEST_FILTER" ]; then
    echo -e "${YELLOW}Filter: $TEST_FILTER${NC}"
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --grep \"$TEST_FILTER\""
fi

# Run tests
echo -e "\n${BLUE}Running Playwright tests...${NC}"
echo -e "${YELLOW}Command: $PLAYWRIGHT_CMD${NC}\n"

if eval $PLAYWRIGHT_CMD; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    TEST_RESULT=0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    TEST_RESULT=1
fi

# Show test results location
echo -e "\n${BLUE}Test Results:${NC}"
echo -e "  Screenshots: ${TEST_RESULTS}/"
echo -e "  HTML Report: playwright-report/index.html"
echo -e "  Visual Regression: ${TEST_RESULTS}/visual/"

# Open HTML report if tests were run (not UI mode)
if [ "$RUN_MODE" != "ui" ]; then
    echo -e "\n${YELLOW}Opening HTML report...${NC}"
    bunx playwright show-report || true
fi

# Cleanup
if [ "$PORTAL_STARTED" = true ] && [ -n "$PORTAL_PID" ]; then
    echo -e "\n${YELLOW}Stopping portal (PID: $PORTAL_PID)...${NC}"
    kill $PORTAL_PID 2>/dev/null || true
fi

exit $TEST_RESULT