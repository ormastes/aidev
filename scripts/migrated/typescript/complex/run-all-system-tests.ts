#!/usr/bin/env bun
/**
 * Migrated from: run-all-system-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.739Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Run All Filesystem MCP System Tests
  // This script runs all system tests and generates a comprehensive report
  await $`set -e`;
  console.log("=========================================");
  console.log("Filesystem MCP System Tests");
  console.log("=========================================");
  // Configuration
  await $`TEST_DIR="$(dirname "$0")/tests/system"`;
  await $`RESULTS_DIR="$(dirname "$0")/test-results"`;
  await $`TIMESTAMP=$(date +%Y%m%d_%H%M%S)`;
  await $`REPORT_FILE="${RESULTS_DIR}/system-test-report-${TIMESTAMP}.md"`;
  // Create results directory
  await mkdir(""${RESULTS_DIR}"", { recursive: true });
  // Initialize counters
  await $`TOTAL_TESTS=0`;
  await $`PASSED_TESTS=0`;
  await $`FAILED_TESTS=0`;
  await $`SKIPPED_TESTS=0`;
  // Initialize report
  await $`cat > "${REPORT_FILE}" <<EOF`;
  // Filesystem MCP System Test Report
  await $`Generated: $(date -Iseconds)`;
  // # Test Environment
  await $`- Working Directory: $(pwd)`;
  await $`- Node Version: $(node -v)`;
  await $`- NPM Version: $(npm -v)`;
  // # System Tests
  await $`EOF`;
  // Function to run a test file
  await $`run_test() {`;
  await $`local TEST_FILE="$1"`;
  await $`local TEST_NAME=$(basename "$TEST_FILE" .systest.ts)`;
  console.log("");
  console.log("Running: ${TEST_NAME}...");
  console.log("### ${TEST_NAME}"); >> "${REPORT_FILE}"
  console.log(""); >> "${REPORT_FILE}"
  await $`TOTAL_TESTS=$((TOTAL_TESTS + 1))`;
  // Run the test and capture output
  await $`if bunx ts-node "$TEST_FILE" > "${RESULTS_DIR}/${TEST_NAME}.log" 2>&1; then`;
  console.log("  ✅ PASSED");
  console.log("**Status**: ✅ PASSED"); >> "${REPORT_FILE}"
  await $`PASSED_TESTS=$((PASSED_TESTS + 1))`;
  } else {
  await $`EXIT_CODE=$?`;
  if ($EXIT_CODE -eq 130 ] || [ $EXIT_CODE -eq 143 ) {; then
  console.log("  ⚠️  SKIPPED (interrupted)");
  console.log("**Status**: ⚠️ SKIPPED"); >> "${REPORT_FILE}"
  await $`SKIPPED_TESTS=$((SKIPPED_TESTS + 1))`;
  } else {
  console.log("  ❌ FAILED (exit code: $EXIT_CODE)");
  console.log("**Status**: ❌ FAILED (exit code: $EXIT_CODE)"); >> "${REPORT_FILE}"
  await $`FAILED_TESTS=$((FAILED_TESTS + 1))`;
  // Add error details to report
  console.log(""); >> "${REPORT_FILE}"
  console.log("<details>"); >> "${REPORT_FILE}"
  console.log("<summary>Error Details</summary>"); >> "${REPORT_FILE}"
  console.log(""); >> "${REPORT_FILE}"
  console.log("'```' >> ");${REPORT_FILE}"
  await $`tail -20 "${RESULTS_DIR}/${TEST_NAME}.log" >> "${REPORT_FILE}"`;
  console.log("'```' >> ");${REPORT_FILE}"
  console.log("</details>"); >> "${REPORT_FILE}"
  }
  }
  console.log(""); >> "${REPORT_FILE}"
  await $`}`;
  // Find and run all system tests
  console.log("Discovering system tests...");
  await $`SYSTEM_TESTS=$(find "${TEST_DIR}" -name "*.systest.ts" -type f | sort)`;
  if (-z "$SYSTEM_TESTS" ) {; then
  console.log("No system tests found in ${TEST_DIR}");
  process.exit(1);
  }
  console.log("Found $(echo ");$SYSTEM_TESTS" | wc -l) system tests"
  console.log("");
  // Run each test
  for (const TEST_FILE of [$SYSTEM_TESTS; do]) {
  await $`run_test "$TEST_FILE"`;
  }
  // Add protection test
  console.log("");
  console.log("Running: Protection Test...");
  console.log("### Protection Test"); >> "${REPORT_FILE}"
  console.log(""); >> "${REPORT_FILE}"
  await $`if node "$(dirname "$0")/test-protection.js" > "${RESULTS_DIR}/protection-test.log" 2>&1; then`;
  console.log("  ✅ PASSED");
  console.log("**Status**: ✅ PASSED"); >> "${REPORT_FILE}"
  await $`PASSED_TESTS=$((PASSED_TESTS + 1))`;
  } else {
  console.log("  ❌ FAILED");
  console.log("**Status**: ❌ FAILED"); >> "${REPORT_FILE}"
  await $`FAILED_TESTS=$((FAILED_TESTS + 1))`;
  // Extract protection results
  console.log(""); >> "${REPORT_FILE}"
  console.log("Protection Results:"); >> "${REPORT_FILE}"
  await $`grep -E "(Protected|NOT PROTECTED)" "${RESULTS_DIR}/protection-test.log" | head -10 >> "${REPORT_FILE}" || true`;
  }
  await $`TOTAL_TESTS=$((TOTAL_TESTS + 1))`;
  console.log(""); >> "${REPORT_FILE}"
  // Generate summary
  console.log("");
  console.log("=========================================");
  console.log("Test Summary");
  console.log("=========================================");
  await $`cat >> "${REPORT_FILE}" <<EOF`;
  // # Summary
  await $`| Metric | Count | Percentage |`;
  await $`|--------|-------|------------|`;
  await $`| Total Tests | ${TOTAL_TESTS} | 100% |`;
  await $`| Passed | ${PASSED_TESTS} | $(echo "scale=1; ${PASSED_TESTS}*100/${TOTAL_TESTS}" | bc)% |`;
  await $`| Failed | ${FAILED_TESTS} | $(echo "scale=1; ${FAILED_TESTS}*100/${TOTAL_TESTS}" | bc)% |`;
  await $`| Skipped | ${SKIPPED_TESTS} | $(echo "scale=1; ${SKIPPED_TESTS}*100/${TOTAL_TESTS}" | bc)% |`;
  // # Test Categories
  // ## Unit Tests
  await $`- Location: \`tests/unit/\``;
  await $`- Count: $(find tests/unit -name "*.test.ts" 2>/dev/null | wc -l)`;
  // ## Integration Tests
  await $`- Location: \`tests/integration/\``;
  await $`- Count: $(find tests/integration -name "*.itest.ts" 2>/dev/null | wc -l)`;
  // ## System Tests
  await $`- Location: \`tests/system/\``;
  await $`- Count: $(find tests/system -name "*.systest.ts" 2>/dev/null | wc -l)`;
  // ## Environment Tests
  await $`- Location: \`tests/environment/\``;
  await $`- Count: $(find tests/environment -name "*.envtest.ts" 2>/dev/null | wc -l)`;
  // ## External Tests
  await $`- Location: \`tests/external/\``;
  await $`- Count: $(find tests/external -name "*.etest.ts" 2>/dev/null | wc -l)`;
  // # Recommendations
  await $`EOF`;
  if ($FAILED_TESTS -gt 0 ) {; then
  await $`cat >> "${REPORT_FILE}" <<EOF`;
  await $`⚠️ **${FAILED_TESTS} tests failed**. Please review the error details above and fix the issues.`;
  await $`Common issues:`;
  await $`1. Missing dependencies - Run \`npm install\``;
  await $`2. MCP server not running - Start the MCP server in strict mode`;
  await $`3. File permissions - Ensure proper file access permissions`;
  await $`4. TypeScript compilation errors - Check for syntax errors`;
  await $`EOF`;
  } else {
  await $`cat >> "${REPORT_FILE}" <<EOF`;
  await $`✅ **All tests passed successfully!**`;
  await $`The filesystem MCP implementation is working correctly.`;
  await $`EOF`;
  }
  // Display summary
  console.log("Total Tests: ${TOTAL_TESTS}");
  console.log("Passed: ${PASSED_TESTS} ✅");
  console.log("Failed: ${FAILED_TESTS} ❌");
  console.log("Skipped: ${SKIPPED_TESTS} ⚠️");
  console.log("");
  console.log("Report saved to: ${REPORT_FILE}");
  console.log("Test logs saved to: ${RESULTS_DIR}/");
  // Exit with error if any tests failed
  if ($FAILED_TESTS -gt 0 ) {; then
  process.exit(1);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}