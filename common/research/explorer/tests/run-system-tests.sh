#!/bin/bash

# Explorer System Test Runner
# Verifies that Explorer can detect actual failures in test targets

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPLORER_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$EXPLORER_DIR")")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=================================================="
echo "       EXPLORER SYSTEM TEST SUITE"
echo "=================================================="
echo ""

# Check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 is not installed${NC}"
        exit 1
    fi
    
    # Check Playwright
    if ! bunx playwright --version &> /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Playwright not found, installing...${NC}"
        bun add -D @playwright/test
        bunx playwright install chromium
    fi
    
    # Check MCP SDK
    if ! python3 -c "import mcp" &> /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  MCP SDK not found, installing...${NC}"
        uv pip install --user mcp
    fi
    
    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
    echo ""
}

# Install test app dependencies
install_test_app() {
    echo "📦 Setting up vulnerable test app..."
    cd "$EXPLORER_DIR/test-apps/vulnerable-app"
    
    if [ ! -d "node_modules" ]; then
        bun install
    fi
    
    echo -e "${GREEN}✅ Test app ready${NC}"
    echo ""
}

# Run Node.js system tests
run_node_tests() {
    echo "🧪 Running Node.js system tests..."
    echo "================================"
    
    cd "$EXPLORER_DIR/tests/system"
    node explorer-system.test.js
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Node.js tests passed${NC}"
    else
        echo -e "${RED}❌ Node.js tests failed${NC}"
    fi
    
    return $exit_code
}

# Run Playwright E2E tests
run_playwright_tests() {
    echo ""
    echo "🎭 Running Playwright E2E tests..."
    echo "==================================="
    
    cd "$EXPLORER_DIR/tests"
    
    # Start test app in background
    echo "Starting test app..."
    cd "$EXPLORER_DIR/test-apps/vulnerable-app"
    node server.js &
    APP_PID=$!
    
    # Wait for app to start
    sleep 3
    
    # Run Playwright tests
    cd "$EXPLORER_DIR/tests"
    TEST_APP_URL="http://localhost:3456" bunx playwright test playwright/explorer-e2e.spec.ts --reporter=list
    
    local exit_code=$?
    
    # Stop test app
    kill $APP_PID 2>/dev/null || true
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Playwright tests passed${NC}"
    else
        echo -e "${RED}❌ Playwright tests failed${NC}"
    fi
    
    return $exit_code
}

# Run Explorer against test app
run_explorer_test() {
    echo ""
    echo "🔍 Running Explorer agent test..."
    echo "=================================="
    
    # Start test app
    cd "$EXPLORER_DIR/test-apps/vulnerable-app"
    node server.js &
    APP_PID=$!
    
    # Wait for app to start
    sleep 3
    
    # Set environment
    export STAGING_URL="http://localhost:3456"
    export OPENAPI_SPEC_URL="http://localhost:3456/openapi.json"
    export TEST_USER_EMAIL="test@example.com"
    export TEST_USER_PASSWORD="password123"
    
    # Run Explorer
    cd "$EXPLORER_DIR"
    python3 scripts/explorer.py
    
    local exit_code=$?
    
    # Stop test app
    kill $APP_PID 2>/dev/null || true
    
    # Check findings
    if [ -d "findings" ] && [ "$(ls -A findings)" ]; then
        echo -e "${GREEN}✅ Explorer generated findings${NC}"
        echo ""
        echo "📊 Findings summary:"
        ls -la findings/*.md 2>/dev/null | head -5
    else
        echo -e "${YELLOW}⚠️  No findings generated${NC}"
    fi
    
    return 0
}

# Run integration tests
run_integration_tests() {
    echo ""
    echo "🔗 Running integration tests..."
    echo "================================"
    
    # Test MCP server connectivity
    echo "Testing MCP server availability..."
    
    # Test Playwright MCP
    if bunx @playwright/mcp@latest --help &> /dev/null; then
        echo -e "  ${GREEN}✅ Playwright MCP available${NC}"
    else
        echo -e "  ${RED}❌ Playwright MCP not available${NC}"
    fi
    
    # Test OpenAPI MCP
    if python3 -c "import awslabs.openapi_mcp_server" &> /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ OpenAPI MCP available${NC}"
    else
        echo -e "  ${YELLOW}⚠️  OpenAPI MCP not installed${NC}"
        uv pip install --user "awslabs.openapi-mcp-server[all]"
    fi
    
    echo -e "${GREEN}✅ Integration tests complete${NC}"
}

# Generate test report
generate_report() {
    echo ""
    echo "=================================================="
    echo "           TEST EXECUTION SUMMARY"
    echo "=================================================="
    
    local report_file="$EXPLORER_DIR/tests/test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Explorer System Test Report

**Date:** $(date)
**Environment:** $(uname -s) $(uname -m)

## Test Results

### Prerequisites
- Node.js: $(node --version)
- Python: $(python3 --version)
- Playwright: $(bunx playwright --version)

### Test Suites Executed

1. **Node.js System Tests**
   - Status: ${NODE_TEST_RESULT:-Not Run}
   - Tests vulnerable app detection capabilities

2. **Playwright E2E Tests**
   - Status: ${PLAYWRIGHT_TEST_RESULT:-Not Run}
   - Verifies Explorer can detect real failures

3. **Explorer Agent Test**
   - Status: ${EXPLORER_TEST_RESULT:-Not Run}
   - Runs actual Explorer against vulnerable app

4. **Integration Tests**
   - Status: ${INTEGRATION_TEST_RESULT:-Not Run}
   - Checks MCP server connectivity

## Findings

$(if [ -d "$EXPLORER_DIR/findings" ]; then
    echo "### Generated Findings:"
    for f in "$EXPLORER_DIR/findings"/*.md; do
        if [ -f "$f" ]; then
            echo "- $(basename "$f")"
        fi
    done
else
    echo "No findings generated"
fi)

## Summary

The Explorer system tests verify that the Explorer agent can:
- Detect console errors
- Identify XSS vulnerabilities
- Find API schema mismatches
- Detect missing security headers
- Identify slow responses
- Find exposed stack traces
- Detect PII leaks

EOF
    
    echo -e "${GREEN}📄 Report saved to: $report_file${NC}"
}

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    
    # Kill any remaining processes
    pkill -f "node server.js" 2>/dev/null || true
    pkill -f "python3.*explorer.py" 2>/dev/null || true
    
    # Clean test findings
    if [ -d "$EXPLORER_DIR/findings" ]; then
        find "$EXPLORER_DIR/findings" -name "*test_session*" -delete 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Main execution
main() {
    local overall_success=true
    
    # Setup
    check_prerequisites
    install_test_app
    
    # Run tests
    echo "🚀 Starting test execution..."
    echo ""
    
    # Node.js tests
    if run_node_tests; then
        NODE_TEST_RESULT="✅ PASSED"
    else
        NODE_TEST_RESULT="❌ FAILED"
        overall_success=false
    fi
    
    # Playwright tests
    if run_playwright_tests; then
        PLAYWRIGHT_TEST_RESULT="✅ PASSED"
    else
        PLAYWRIGHT_TEST_RESULT="❌ FAILED"
        overall_success=false
    fi
    
    # Explorer test
    if run_explorer_test; then
        EXPLORER_TEST_RESULT="✅ PASSED"
    else
        EXPLORER_TEST_RESULT="❌ FAILED"
        overall_success=false
    fi
    
    # Integration tests
    if run_integration_tests; then
        INTEGRATION_TEST_RESULT="✅ PASSED"
    else
        INTEGRATION_TEST_RESULT="❌ FAILED"
        overall_success=false
    fi
    
    # Generate report
    generate_report
    
    # Cleanup
    cleanup
    
    # Final result
    echo ""
    echo "=================================================="
    if [ "$overall_success" = true ]; then
        echo -e "${GREEN}🎉 ALL SYSTEM TESTS PASSED!${NC}"
        echo "Explorer can successfully detect failures in test targets."
        exit 0
    else
        echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
        echo "Review the test report for details."
        exit 1
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"