#!/bin/bash

# Run Portal Services Dual-Mode Tests
# Tests all portal services in both port and embed modes

echo "🚀 Portal Services Dual-Mode Test Runner"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
MODE="both"
PARALLEL=false
SERVICES=""

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --mode|-m) MODE="$2"; shift ;;
        --parallel|-p) PARALLEL=true ;;
        --services|-s) SERVICES="$2"; shift ;;
        --help|-h) 
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -m, --mode <mode>      Test mode: port, embed, or both (default: both)"
            echo "  -p, --parallel         Run tests in parallel"
            echo "  -s, --services <list>  Comma-separated list of services to test"
            echo "  -h, --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  # Run all tests sequentially"
            echo "  $0"
            echo ""
            echo "  # Run tests in parallel"
            echo "  $0 --parallel"
            echo ""
            echo "  # Test only in port mode"
            echo "  $0 --mode port"
            echo ""
            echo "  # Test specific services"
            echo "  $0 --services \"GUI Selector,Task Queue\""
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed. Please install bun first.${NC}"
    echo "Visit: https://bun.sh"
    exit 1
fi

# Check if the portal is running
echo "Checking if portal is running on port 3156..."
if curl -s http://localhost:3156 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Portal is running${NC}"
else
    echo -e "${YELLOW}⚠️  Portal is not running. Starting it now...${NC}"
    
    # Start the portal in background
    cd layer/themes/init_setup-folder/children/services
    bun run portal-fixed.ts &
    PORTAL_PID=$!
    
    # Wait for portal to start
    echo "Waiting for portal to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3156 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Portal started successfully${NC}"
            break
        fi
        sleep 1
    done
    
    # Check if portal started
    if ! curl -s http://localhost:3156 > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to start portal${NC}"
        exit 1
    fi
    
    cd - > /dev/null
fi

echo ""
echo "Test Configuration:"
echo "  Mode: $MODE"
echo "  Parallel: $PARALLEL"
if [ -n "$SERVICES" ]; then
    echo "  Services: $SERVICES"
else
    echo "  Services: All"
fi
echo ""

# Build test command
TEST_CMD="bun run layer/themes/infra_test-as-manual/children/dual-mode-testing/AllServicesTestRunner.ts"

if [ "$PARALLEL" = true ]; then
    TEST_CMD="$TEST_CMD --parallel"
fi

TEST_CMD="$TEST_CMD --mode $MODE"

if [ -n "$SERVICES" ]; then
    TEST_CMD="$TEST_CMD --services \"$SERVICES\""
fi

# Create test results directory
mkdir -p test-results
mkdir -p gen/doc

# Run the tests
echo "Running tests..."
echo "Command: $TEST_CMD"
echo ""

eval $TEST_CMD
TEST_EXIT_CODE=$?

# Clean up portal if we started it
if [ ! -z "$PORTAL_PID" ]; then
    echo ""
    echo "Stopping portal..."
    kill $PORTAL_PID 2>/dev/null
fi

# Show results
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests completed successfully!${NC}"
    echo ""
    echo "📁 Test reports available at:"
    echo "  - test-results/all-services-test-report-*.json"
    echo "  - gen/doc/all-services-test-summary-*.md"
    echo "  - Individual service reports in test-results/"
    echo "  - Manual test documentation in gen/doc/"
else
    echo -e "${RED}❌ Some tests failed. Check the reports for details.${NC}"
fi

exit $TEST_EXIT_CODE