#!/bin/bash

# E2E Test Runner for Mate Dealer Demo
set -e

echo "🧪 Running Mate Dealer E2E Tests..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if servers are running
check_server() {
    local port=$1
    local name=$2
    
    if curl -s http://localhost:$port/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $name is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}✗ $name is not running on port $port${NC}"
        return 1
    fi
}

# Start servers if not running
echo -e "${BLUE}Checking servers...${NC}"

SERVER_RUNNING=false
if check_server 3303 "Mate Dealer Server"; then
    SERVER_RUNNING=true
fi

GUI_RUNNING=false
if check_server 3456 "GUI Selector Server"; then
    GUI_RUNNING=true
fi

# Start servers if needed
if [ "$SERVER_RUNNING" = false ]; then
    echo -e "${YELLOW}Starting Mate Dealer server...${NC}"
    cd "$(dirname "$0")"
    npm run build:server > /dev/null 2>&1
    NODE_ENV=test npm start > /tmp/mate-dealer-test.log 2>&1 &
    SERVER_PID=$!
    sleep 5
    
    if check_server 3303 "Mate Dealer Server"; then
        echo -e "${GREEN}✓ Server started successfully${NC}"
    else
        echo -e "${RED}Failed to start server. Check /tmp/mate-dealer-test.log${NC}"
        exit 1
    fi
fi

# Install browsers if needed
echo -e "${BLUE}Checking Playwright browsers...${NC}"
bunx playwright install chromium

# Run tests
echo ""
echo -e "${BLUE}Running E2E tests...${NC}"
echo ""

# Run specific test file
if [ "$1" = "complete" ]; then
    bunx playwright test tests/e2e/mate-dealer-complete.spec.ts --reporter=list
else
    bunx playwright test --reporter=list
fi

TEST_EXIT_CODE=$?

# Cleanup
if [ "$SERVER_RUNNING" = false ] && [ ! -z "$SERVER_PID" ]; then
    echo ""
    echo -e "${BLUE}Stopping test server...${NC}"
    kill $SERVER_PID 2>/dev/null || true
fi

# Summary
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All E2E tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed. Check the output above.${NC}"
    echo ""
    echo "To debug failing tests:"
    echo "  - Run with UI mode: npm run test:e2e:ui"
    echo "  - Check screenshots in: test-results/"
    echo "  - View traces: bunx playwright show-trace"
fi

exit $TEST_EXIT_CODE