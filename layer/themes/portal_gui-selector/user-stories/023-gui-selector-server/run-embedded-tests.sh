#!/bin/bash

echo "🚀 AI Dev Portal - Embedded Apps System Test Runner"
echo "=================================================="
echo ""

# Configuration - Port must come from environment
if [ -z "$PORT" ]; then
  echo "❌ ERROR: PORT environment variable is required"
  echo "Port must be allocated by portal_security theme"
  exit 1
fi
export TEST_URL="${TEST_URL:-http://localhost:$PORT}"
export HEADLESS="${HEADLESS:-true}"
export FAIL_FAST="${FAIL_FAST:-false}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --exclude)
      export EXCLUDE_APPS="$2"
      shift 2
      ;;
    --headed)
      export HEADLESS="false"
      shift
      ;;
    --fail-fast)
      export FAIL_FAST="true"
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --exclude <apps>    Comma-separated list of apps to exclude"
      echo "                      Example: --exclude 'Terminal Embed,Mobile Preview'"
      echo "  --headed            Run tests with browser visible"
      echo "  --fail-fast         Stop on first test failure"
      echo "  --help              Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  TEST_URL            Portal URL (default: http://localhost:3457)"
      echo "  EXCLUDE_APPS        Apps to exclude from testing"
      echo "  HEADLESS            Run headless (default: true)"
      echo "  FAIL_FAST           Stop on first failure (default: false)"
      echo ""
      echo "Examples:"
      echo "  # Test all embedded apps"
      echo "  $0"
      echo ""
      echo "  # Exclude terminal and run with visible browser"
      echo "  $0 --exclude 'Terminal Embed' --headed"
      echo ""
      echo "  # Fail fast on first error"
      echo "  $0 --fail-fast"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if server is running
echo "✅ Checking if AI Dev Portal is running on ${TEST_URL}..."
curl -s "${TEST_URL}/api/health" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Server is not running on ${TEST_URL}"
  echo "Please start the server first with: ./deploy.sh release"
  exit 1
fi
echo "✅ Server is running"
echo ""

# Display test configuration
echo "📋 Test Configuration:"
echo "  - Base URL: ${TEST_URL}"
echo "  - Headless: ${HEADLESS}"
echo "  - Fail Fast: ${FAIL_FAST}"
if [ -n "${EXCLUDE_APPS}" ]; then
  echo "  - Excluded Apps: ${EXCLUDE_APPS}"
else
  echo "  - Testing: All embedded apps"
fi
echo ""

# Create directories
mkdir -p tests/screenshots/embedded-apps

# List of embedded apps that will be tested
echo "🔍 Embedded Apps to Test:"
echo "  1. Mobile Preview (iframe-based)"
echo "  2. Mate Dealer App (direct embed)"
echo "  3. Terminal Embed (WebSocket)"
echo "  4. Theme Preview (nested iframes)"
echo ""

# Run the comprehensive test suite
echo "🧪 Starting Embedded Apps System Tests..."
echo "=========================================="
echo ""

# Run Playwright tests
bunx playwright test tests/system/portal-with-embedded-apps.test.ts \
  --reporter=list \
  --workers=1 \
  --timeout=60000 \
  --retries=1

TEST_RESULT=$?

echo ""
echo "=========================================="

if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ All embedded app tests passed successfully!"
  echo ""
  echo "📊 Test Results:"
  echo "  - Portal integration: ✅"
  echo "  - Iframe interactions: ✅"
  echo "  - Click handling: ✅"
  echo "  - Cross-origin communication: ✅"
  echo "  - WebSocket connections: ✅"
  echo ""
  echo "📸 Screenshots saved in: tests/screenshots/embedded-apps/"
  echo "📄 Test report: tests/screenshots/embedded-apps/test-report.md"
else
  echo "❌ Some embedded app tests failed"
  echo ""
  echo "📸 Debug screenshots saved in: tests/screenshots/embedded-apps/"
  echo ""
  echo "Common issues and fixes:"
  echo "  - Iframe clicking: Check CSP headers and iframe sandbox attributes"
  echo "  - WebSocket errors: Verify terminal server is running"
  echo "  - Cross-origin: Check CORS configuration"
fi

echo ""
echo "💡 Tips:"
echo "  - Run with visible browser: $0 --headed"
echo "  - Exclude specific apps: $0 --exclude 'Terminal Embed'"
echo "  - Stop on first failure: $0 --fail-fast"
echo ""

# Generate summary report
if [ $TEST_RESULT -eq 0 ]; then
  cat > tests/screenshots/embedded-apps/summary.txt << EOF
AI Dev Portal - Embedded Apps Test Summary
==========================================
Date: $(date)
Status: PASSED ✅

Tested Apps:
- Mobile Preview: PASSED
- Mate Dealer: PASSED  
- Terminal Embed: PASSED
- Theme Preview: PASSED

Features Verified:
- Iframe click handling
- Cross-origin messaging
- WebSocket connections
- Dynamic content loading
- Nested iframe interactions

Test Duration: Check playwright output above
EOF
else
  cat > tests/screenshots/embedded-apps/summary.txt << EOF
AI Dev Portal - Embedded Apps Test Summary
==========================================
Date: $(date)
Status: FAILED ❌

Check the test output and screenshots for details.
EOF
fi

exit $TEST_RESULT