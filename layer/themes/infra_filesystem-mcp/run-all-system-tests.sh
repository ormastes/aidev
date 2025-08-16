#!/bin/bash

# Run All Filesystem MCP System Tests
# This script runs all system tests and generates a comprehensive report

set -e

echo "========================================="
echo "Filesystem MCP System Tests"
echo "========================================="

# Configuration
TEST_DIR="$(dirname "$0")/tests/system"
RESULTS_DIR="$(dirname "$0")/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${RESULTS_DIR}/system-test-report-${TIMESTAMP}.md"

# Create results directory
mkdir -p "${RESULTS_DIR}"

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Initialize report
cat > "${REPORT_FILE}" <<EOF
# Filesystem MCP System Test Report

Generated: $(date -Iseconds)

## Test Environment
- Working Directory: $(pwd)
- Node Version: $(node -v)
- NPM Version: $(npm -v)

## System Tests

EOF

# Function to run a test file
run_test() {
    local TEST_FILE="$1"
    local TEST_NAME=$(basename "$TEST_FILE" .systest.ts)
    
    echo ""
    echo "Running: ${TEST_NAME}..."
    echo "### ${TEST_NAME}" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Run the test and capture output
    if bunx ts-node "$TEST_FILE" > "${RESULTS_DIR}/${TEST_NAME}.log" 2>&1; then
        echo "  ✅ PASSED"
        echo "**Status**: ✅ PASSED" >> "${REPORT_FILE}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 130 ] || [ $EXIT_CODE -eq 143 ]; then
            echo "  ⚠️  SKIPPED (interrupted)"
            echo "**Status**: ⚠️ SKIPPED" >> "${REPORT_FILE}"
            SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
        else
            echo "  ❌ FAILED (exit code: $EXIT_CODE)"
            echo "**Status**: ❌ FAILED (exit code: $EXIT_CODE)" >> "${REPORT_FILE}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            
            # Add error details to report
            echo "" >> "${REPORT_FILE}"
            echo "<details>" >> "${REPORT_FILE}"
            echo "<summary>Error Details</summary>" >> "${REPORT_FILE}"
            echo "" >> "${REPORT_FILE}"
            echo '```' >> "${REPORT_FILE}"
            tail -20 "${RESULTS_DIR}/${TEST_NAME}.log" >> "${REPORT_FILE}"
            echo '```' >> "${REPORT_FILE}"
            echo "</details>" >> "${REPORT_FILE}"
        fi
    fi
    
    echo "" >> "${REPORT_FILE}"
}

# Find and run all system tests
echo "Discovering system tests..."
SYSTEM_TESTS=$(find "${TEST_DIR}" -name "*.systest.ts" -type f | sort)

if [ -z "$SYSTEM_TESTS" ]; then
    echo "No system tests found in ${TEST_DIR}"
    exit 1
fi

echo "Found $(echo "$SYSTEM_TESTS" | wc -l) system tests"
echo ""

# Run each test
for TEST_FILE in $SYSTEM_TESTS; do
    run_test "$TEST_FILE"
done

# Add protection test
echo ""
echo "Running: Protection Test..."
echo "### Protection Test" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

if node "$(dirname "$0")/test-protection.js" > "${RESULTS_DIR}/protection-test.log" 2>&1; then
    echo "  ✅ PASSED"
    echo "**Status**: ✅ PASSED" >> "${REPORT_FILE}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "  ❌ FAILED"
    echo "**Status**: ❌ FAILED" >> "${REPORT_FILE}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    
    # Extract protection results
    echo "" >> "${REPORT_FILE}"
    echo "Protection Results:" >> "${REPORT_FILE}"
    grep -E "(Protected|NOT PROTECTED)" "${RESULTS_DIR}/protection-test.log" | head -10 >> "${REPORT_FILE}" || true
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo "" >> "${REPORT_FILE}"

# Generate summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="

cat >> "${REPORT_FILE}" <<EOF

## Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Tests | ${TOTAL_TESTS} | 100% |
| Passed | ${PASSED_TESTS} | $(echo "scale=1; ${PASSED_TESTS}*100/${TOTAL_TESTS}" | bc)% |
| Failed | ${FAILED_TESTS} | $(echo "scale=1; ${FAILED_TESTS}*100/${TOTAL_TESTS}" | bc)% |
| Skipped | ${SKIPPED_TESTS} | $(echo "scale=1; ${SKIPPED_TESTS}*100/${TOTAL_TESTS}" | bc)% |

## Test Categories

### Unit Tests
- Location: \`tests/unit/\`
- Count: $(find tests/unit -name "*.test.ts" 2>/dev/null | wc -l)

### Integration Tests  
- Location: \`tests/integration/\`
- Count: $(find tests/integration -name "*.itest.ts" 2>/dev/null | wc -l)

### System Tests
- Location: \`tests/system/\`
- Count: $(find tests/system -name "*.systest.ts" 2>/dev/null | wc -l)

### Environment Tests
- Location: \`tests/environment/\`
- Count: $(find tests/environment -name "*.envtest.ts" 2>/dev/null | wc -l)

### External Tests
- Location: \`tests/external/\`
- Count: $(find tests/external -name "*.etest.ts" 2>/dev/null | wc -l)

## Recommendations

EOF

if [ $FAILED_TESTS -gt 0 ]; then
    cat >> "${REPORT_FILE}" <<EOF
⚠️ **${FAILED_TESTS} tests failed**. Please review the error details above and fix the issues.

Common issues:
1. Missing dependencies - Run \`npm install\`
2. MCP server not running - Start the MCP server in strict mode
3. File permissions - Ensure proper file access permissions
4. TypeScript compilation errors - Check for syntax errors

EOF
else
    cat >> "${REPORT_FILE}" <<EOF
✅ **All tests passed successfully!**

The filesystem MCP implementation is working correctly.
EOF
fi

# Display summary
echo "Total Tests: ${TOTAL_TESTS}"
echo "Passed: ${PASSED_TESTS} ✅"
echo "Failed: ${FAILED_TESTS} ❌"
echo "Skipped: ${SKIPPED_TESTS} ⚠️"
echo ""
echo "Report saved to: ${REPORT_FILE}"
echo "Test logs saved to: ${RESULTS_DIR}/"

# Exit with error if any tests failed
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
fi