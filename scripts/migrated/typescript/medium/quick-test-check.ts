#!/usr/bin/env bun
/**
 * Migrated from: quick-test-check.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.613Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🧪 Quick Test Check - Running sample tests from each category");
  console.log("=============================================================");
  console.log("");
  // Test samples
  await $`TEST_FILES=(`;
  await $`"test/app-selection.spec.ts"`;
  await $`"test/security-issues.spec.ts"`;
  await $`"test/system/embedded-apps-simple.spec.ts"`;
  await $`"test/system/portal-system-fixed.spec.ts"`;
  await $`"test/system/web-comprehensive-system.spec.ts"`;
  await $`)`;
  await $`PASSED=0`;
  await $`FAILED=0`;
  for (const file of ["${TEST_FILES[@]}"; do]) {
  if (-f "$file" ) {; then
  console.log("-n ");Testing $(basename $file)... "
  // Run first test only with short timeout
  await $`OUTPUT=$(timeout 20s bunx playwright test "$file" --grep "should" --reporter=json 2>/dev/null | head -1000)`;
  if ($? -eq 0 ) { && echo "$OUTPUT" | grep -q "expected"; then
  console.log("✓ PASSED");
  await $`PASSED=$((PASSED + 1))`;
  await $`elif [ $? -eq 124 ]; then`;
  console.log("⚠ TIMEOUT");
  await $`FAILED=$((FAILED + 1))`;
  } else {
  console.log("✗ FAILED");
  await $`FAILED=$((FAILED + 1))`;
  }
  } else {
  console.log("$(basename $file) - NOT FOUND");
  }
  }
  console.log("");
  console.log("Summary: $PASSED passed, $FAILED failed/timeout");
  if ($FAILED -eq 0 ) {; then
  console.log("✅ All sample tests passed!");
  } else {
  console.log("⚠️  Some tests need attention");
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}