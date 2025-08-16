#!/usr/bin/env bun
/**
 * Migrated from: run-e2e-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.791Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🧪 Running Improved E2E System Tests for AI Dev Portal");
  console.log("==========================================");
  // Port must come from environment
  if (-z "$PORT" ) {; then
  console.log("❌ ERROR: PORT environment variable is required");
  console.log("Port must be allocated by portal_security theme");
  process.exit(1);
  }
  // Set test environment
  process.env.TEST_URL = ""http://localhost:$PORT"";
  process.env.HEADLESS = ""true"";
  // Check if server is running
  console.log("✅ Checking if server is running on port $PORT...");
  await $`curl -s http://localhost:$PORT/api/health > /dev/null 2>&1`;
  if ($? -ne 0 ) {; then
  console.log("❌ Server is not running on port $PORT");
  console.log("Please start the server first with: ./deploy.sh release");
  process.exit(1);
  }
  console.log("✅ Server is running");
  // Create test directories
  await mkdir("tests/screenshots/e2e-improved", { recursive: true });
  // Run the improved E2E tests
  console.log("");
  console.log("🚀 Starting Playwright tests...");
  console.log("");
  await $`bunx playwright test tests/system/portal-e2e-improved.test.ts \`;
  await $`--reporter=list \`;
  await $`--workers=1 \`;
  await $`--timeout=60000 \`;
  await $`--retries=1`;
  await $`TEST_RESULT=$?`;
  console.log("");
  console.log("==========================================");
  if ($TEST_RESULT -eq 0 ) {; then
  console.log("✅ All E2E tests passed successfully!");
  console.log("");
  console.log("📸 Screenshots saved in: tests/screenshots/e2e-improved/");
  console.log("📄 Test report saved in: tests/screenshots/e2e-improved/test-report.md");
  } else {
  console.log("❌ Some tests failed. Check the output above for details.");
  console.log("");
  console.log("📸 Debug screenshots saved in: tests/screenshots/e2e-improved/");
  }
  console.log("");
  console.log("To run tests in headed mode (with browser visible), use:");
  console.log("HEADLESS=false $0");
  await $`exit $TEST_RESULT`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}