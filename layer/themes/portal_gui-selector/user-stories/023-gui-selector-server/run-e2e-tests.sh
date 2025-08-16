#!/bin/bash

echo "🧪 Running Improved E2E System Tests for AI Dev Portal"
echo "=========================================="

# Port must come from environment
if [ -z "$PORT" ]; then
  echo "❌ ERROR: PORT environment variable is required"
  echo "Port must be allocated by portal_security theme"
  exit 1
fi

# Set test environment
export TEST_URL="http://localhost:$PORT"
export HEADLESS="true"

# Check if server is running
echo "✅ Checking if server is running on port $PORT..."
curl -s http://localhost:$PORT/api/health > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Server is not running on port $PORT"
  echo "Please start the server first with: ./deploy.sh release"
  exit 1
fi

echo "✅ Server is running"

# Create test directories
mkdir -p tests/screenshots/e2e-improved

# Run the improved E2E tests
echo ""
echo "🚀 Starting Playwright tests..."
echo ""

bunx playwright test tests/system/portal-e2e-improved.test.ts \
  --reporter=list \
  --workers=1 \
  --timeout=60000 \
  --retries=1

TEST_RESULT=$?

echo ""
echo "=========================================="

if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ All E2E tests passed successfully!"
  echo ""
  echo "📸 Screenshots saved in: tests/screenshots/e2e-improved/"
  echo "📄 Test report saved in: tests/screenshots/e2e-improved/test-report.md"
else
  echo "❌ Some tests failed. Check the output above for details."
  echo ""
  echo "📸 Debug screenshots saved in: tests/screenshots/e2e-improved/"
fi

echo ""
echo "To run tests in headed mode (with browser visible), use:"
echo "HEADLESS=false $0"

exit $TEST_RESULT