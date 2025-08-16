#!/bin/bash

# Test Runner - NO HARDCODED PORTS
# Uses test-as-manual theme to get ports from portal_security

echo "🧪 Running Tests with Proper Port Management"
echo "============================================"
echo "🔒 Using test-as-manual → portal_security theme chain"
echo ""

# DO NOT SET PORT HERE - it will be allocated by test theme
# The test will request port from test-as-manual theme

# Check if server is already running
if [ -n "$TEST_URL" ]; then
  echo "✅ Using existing server at: $TEST_URL"
else
  echo "📋 Tests will allocate ports via test-as-manual theme"
fi

# Create test directories
mkdir -p tests/screenshots/feature-coverage-no-hardcode

# Run the tests that use test-as-manual theme
echo ""
echo "🚀 Starting Playwright tests (ports managed by test theme)..."
echo ""

bunx playwright test tests/system/feature-coverage-no-hardcode.test.ts \
  --reporter=list \
  --workers=1 \
  --timeout=60000 \
  --retries=1

TEST_RESULT=$?

echo ""
echo "============================================"

if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ All tests passed!"
  echo "✅ No hardcoded ports used"
  echo "✅ All ports managed through test-as-manual → portal_security"
  echo ""
  echo "📸 Screenshots: tests/screenshots/feature-coverage-no-hardcode/"
  echo "📄 Coverage report: tests/screenshots/feature-coverage-no-hardcode/click-coverage-report.md"
else
  echo "❌ Some tests failed"
  echo ""
  echo "📸 Debug screenshots: tests/screenshots/feature-coverage-no-hardcode/"
fi

echo ""
echo "💡 Port Management:"
echo "  - No hardcoded ports (3456, 3457, etc.)"
echo "  - All ports allocated by test-as-manual theme"
echo "  - Security managed by portal_security theme"
echo ""

exit $TEST_RESULT