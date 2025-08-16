#!/usr/bin/env bun
/**
 * Migrated from: run-all-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.769Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🧪 Running Complete Test Suite");
  console.log("==============================");
  console.log("");
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Counters
  await $`TOTAL_PASSED=0`;
  await $`TOTAL_FAILED=0`;
  await $`FAILED_FILES=""`;
  // Function to run test file
  await $`run_test() {`;
  await $`local file=$1`;
  await $`local name=$(basename $file)`;
  console.log("-n ");Testing $name... "
  // Run test with timeout
  await $`timeout 30s bunx playwright test "$file" --reporter=json 2>/dev/null > temp_result.json`;
  if ($? -eq 124 ) {; then
  console.log("-e ");${YELLOW}TIMEOUT${NC}"
  await $`TOTAL_FAILED=$((TOTAL_FAILED + 1))`;
  await $`FAILED_FILES="$FAILED_FILES\n  - $name (timeout)"`;
  await $`elif [ -f temp_result.json ] && [ -s temp_result.json ]; then`;
  // Parse results
  await $`PASSED=$(jq -r '.stats.expected // 0' temp_result.json 2>/dev/null || echo 0)`;
  await $`FAILED=$(jq -r '.stats.unexpected // 0' temp_result.json 2>/dev/null || echo 0)`;
  if ("$FAILED" -eq 0 ] && [ "$PASSED" -gt 0 ) {; then
  console.log("-e ");${GREEN}✓ PASSED${NC} ($PASSED tests)"
  await $`TOTAL_PASSED=$((TOTAL_PASSED + PASSED))`;
  await $`elif [ "$FAILED" -gt 0 ]; then`;
  console.log("-e ");${RED}✗ FAILED${NC} ($PASSED passed, $FAILED failed)"
  await $`TOTAL_PASSED=$((TOTAL_PASSED + PASSED))`;
  await $`TOTAL_FAILED=$((TOTAL_FAILED + FAILED))`;
  await $`FAILED_FILES="$FAILED_FILES\n  - $name ($FAILED failed)"`;
  } else {
  console.log("-e ");${YELLOW}⚠ NO TESTS${NC}"
  }
  } else {
  console.log("-e ");${RED}✗ ERROR${NC}"
  await $`TOTAL_FAILED=$((TOTAL_FAILED + 1))`;
  await $`FAILED_FILES="$FAILED_FILES\n  - $name (error)"`;
  }
  await $`rm -f temp_result.json`;
  await $`}`;
  // Test categories
  console.log("📋 Core Tests");
  console.log("-------------");
  for (const file of [test/*.spec.ts; do]) {
  if (-f "$file" ) {; then
  await $`run_test "$file"`;
  }
  }
  console.log("");
  console.log("📋 System Tests");
  console.log("---------------");
  for (const file of [test/system/*.spec.ts; do]) {
  if (-f "$file" ) {; then
  await $`run_test "$file"`;
  }
  }
  // Summary
  console.log("");
  console.log("==============================");
  console.log("📊 TEST SUMMARY");
  console.log("==============================");
  console.log("-e ");${GREEN}✓ Passed:${NC} $TOTAL_PASSED"
  console.log("-e ");${RED}✗ Failed:${NC} $TOTAL_FAILED"
  console.log("-e ");📝 Total: $((TOTAL_PASSED + TOTAL_FAILED))"
  if ("$TOTAL_FAILED" -gt 0 ) {; then
  console.log("");
  console.log("-e ");${RED}Failed Files:${NC}"
  console.log("-e ");$FAILED_FILES"
  }
  // Calculate pass rate
  if ($((TOTAL_PASSED + TOTAL_FAILED)) -gt 0 ) {; then
  await $`PASS_RATE=$(echo "scale=1; $TOTAL_PASSED * 100 / ($TOTAL_PASSED + $TOTAL_FAILED)" | bc)`;
  console.log("");
  console.log("📈 Pass Rate: ${PASS_RATE}%");
  await $`if (( $(echo "$PASS_RATE >= 90" | bc -l) )); then`;
  console.log("🎉 Excellent test coverage!");
  await $`elif (( $(echo "$PASS_RATE >= 70" | bc -l) )); then`;
  console.log("👍 Good coverage, some improvements needed.");
  } else {
  console.log("⚠️  Test coverage needs improvement.");
  }
  }
  await $`exit $TOTAL_FAILED`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}