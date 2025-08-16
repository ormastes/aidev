#!/usr/bin/env bun
/**
 * Migrated from: run-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.581Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Test Runner - NO HARDCODED PORTS
  // Uses test-as-manual theme to get ports from portal_security
  console.log("🧪 Running Tests with Proper Port Management");
  console.log("============================================");
  console.log("🔒 Using test-as-manual → portal_security theme chain");
  console.log("");
  // DO NOT SET PORT HERE - it will be allocated by test theme
  // The test will request port from test-as-manual theme
  // Check if server is already running
  if (-n "$TEST_URL" ) {; then
  console.log("✅ Using existing server at: $TEST_URL");
  } else {
  console.log("📋 Tests will allocate ports via test-as-manual theme");
  }
  // Create test directories
  await mkdir("tests/screenshots/feature-coverage-no-hardcode", { recursive: true });
  // Run the tests that use test-as-manual theme
  console.log("");
  console.log("🚀 Starting Playwright tests (ports managed by test theme)...");
  console.log("");
  await $`bunx playwright test tests/system/feature-coverage-no-hardcode.test.ts \`;
  await $`--reporter=list \`;
  await $`--workers=1 \`;
  await $`--timeout=60000 \`;
  await $`--retries=1`;
  await $`TEST_RESULT=$?`;
  console.log("");
  console.log("============================================");
  if ($TEST_RESULT -eq 0 ) {; then
  console.log("✅ All tests passed!");
  console.log("✅ No hardcoded ports used");
  console.log("✅ All ports managed through test-as-manual → portal_security");
  console.log("");
  console.log("📸 Screenshots: tests/screenshots/feature-coverage-no-hardcode/");
  console.log("📄 Coverage report: tests/screenshots/feature-coverage-no-hardcode/click-coverage-report.md");
  } else {
  console.log("❌ Some tests failed");
  console.log("");
  console.log("📸 Debug screenshots: tests/screenshots/feature-coverage-no-hardcode/");
  }
  console.log("");
  console.log("💡 Port Management:");
  console.log("  - No hardcoded ports (3456, 3457, etc.)");
  console.log("  - All ports allocated by test-as-manual theme");
  console.log("  - Security managed by portal_security theme");
  console.log("");
  await $`exit $TEST_RESULT`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}