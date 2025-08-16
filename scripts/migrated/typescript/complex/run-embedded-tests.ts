#!/usr/bin/env bun
/**
 * Migrated from: run-embedded-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.724Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🚀 AI Dev Portal - Embedded Apps System Test Runner");
  console.log("==================================================");
  console.log("");
  // Configuration - Port must come from environment
  if (-z "$PORT" ) {; then
  console.log("❌ ERROR: PORT environment variable is required");
  console.log("Port must be allocated by portal_security theme");
  process.exit(1);
  }
  process.env.TEST_URL = ""${TEST_URL:-http://localhost:$PORT}"";
  process.env.HEADLESS = ""${HEADLESS:-true}"";
  process.env.FAIL_FAST = ""${FAIL_FAST:-false}"";
  // Parse command line arguments
  while ([[ $# -gt 0 ]]; do) {
  await $`case $1 in`;
  await $`--exclude)`;
  process.env.EXCLUDE_APPS = ""$2"";
  await $`shift 2`;
  await $`;;`;
  await $`--headed)`;
  process.env.HEADLESS = ""false"";
  await $`shift`;
  await $`;;`;
  await $`--fail-fast)`;
  process.env.FAIL_FAST = ""true"";
  await $`shift`;
  await $`;;`;
  await $`--help)`;
  console.log("Usage: $0 [options]");
  console.log("");
  console.log("Options:");
  console.log("  --exclude <apps>    Comma-separated list of apps to exclude");
  console.log("                      Example: --exclude 'Terminal Embed,Mobile Preview'");
  console.log("  --headed            Run tests with browser visible");
  console.log("  --fail-fast         Stop on first test failure");
  console.log("  --help              Show this help message");
  console.log("");
  console.log("Environment Variables:");
  console.log("  TEST_URL            Portal URL (default: http://localhost:3457)");
  console.log("  EXCLUDE_APPS        Apps to exclude from testing");
  console.log("  HEADLESS            Run headless (default: true)");
  console.log("  FAIL_FAST           Stop on first failure (default: false)");
  console.log("");
  console.log("Examples:");
  console.log("  # Test all embedded apps");
  console.log("  $0");
  console.log("");
  console.log("  # Exclude terminal and run with visible browser");
  console.log("  $0 --exclude 'Terminal Embed' --headed");
  console.log("");
  console.log("  # Fail fast on first error");
  console.log("  $0 --fail-fast");
  process.exit(0);
  await $`;;`;
  await $`*)`;
  console.log("Unknown option: $1");
  console.log("Use --help for usage information");
  process.exit(1);
  await $`;;`;
  await $`esac`;
  }
  // Check if server is running
  console.log("✅ Checking if AI Dev Portal is running on ${TEST_URL}...");
  await $`curl -s "${TEST_URL}/api/health" > /dev/null 2>&1`;
  if ($? -ne 0 ) {; then
  console.log("❌ Server is not running on ${TEST_URL}");
  console.log("Please start the server first with: ./deploy.sh release");
  process.exit(1);
  }
  console.log("✅ Server is running");
  console.log("");
  // Display test configuration
  console.log("📋 Test Configuration:");
  console.log("  - Base URL: ${TEST_URL}");
  console.log("  - Headless: ${HEADLESS}");
  console.log("  - Fail Fast: ${FAIL_FAST}");
  if (-n "${EXCLUDE_APPS}" ) {; then
  console.log("  - Excluded Apps: ${EXCLUDE_APPS}");
  } else {
  console.log("  - Testing: All embedded apps");
  }
  console.log("");
  // Create directories
  await mkdir("tests/screenshots/embedded-apps", { recursive: true });
  // List of embedded apps that will be tested
  console.log("🔍 Embedded Apps to Test:");
  console.log("  1. Mobile Preview (iframe-based)");
  console.log("  2. Mate Dealer App (direct embed)");
  console.log("  3. Terminal Embed (WebSocket)");
  console.log("  4. Theme Preview (nested iframes)");
  console.log("");
  // Run the comprehensive test suite
  console.log("🧪 Starting Embedded Apps System Tests...");
  console.log("==========================================");
  console.log("");
  // Run Playwright tests
  await $`bunx playwright test tests/system/portal-with-embedded-apps.test.ts \`;
  await $`--reporter=list \`;
  await $`--workers=1 \`;
  await $`--timeout=60000 \`;
  await $`--retries=1`;
  await $`TEST_RESULT=$?`;
  console.log("");
  console.log("==========================================");
  if ($TEST_RESULT -eq 0 ) {; then
  console.log("✅ All embedded app tests passed successfully!");
  console.log("");
  console.log("📊 Test Results:");
  console.log("  - Portal integration: ✅");
  console.log("  - Iframe interactions: ✅");
  console.log("  - Click handling: ✅");
  console.log("  - Cross-origin communication: ✅");
  console.log("  - WebSocket connections: ✅");
  console.log("");
  console.log("📸 Screenshots saved in: tests/screenshots/embedded-apps/");
  console.log("📄 Test report: tests/screenshots/embedded-apps/test-report.md");
  } else {
  console.log("❌ Some embedded app tests failed");
  console.log("");
  console.log("📸 Debug screenshots saved in: tests/screenshots/embedded-apps/");
  console.log("");
  console.log("Common issues and fixes:");
  console.log("  - Iframe clicking: Check CSP headers and iframe sandbox attributes");
  console.log("  - WebSocket errors: Verify terminal server is running");
  console.log("  - Cross-origin: Check CORS configuration");
  }
  console.log("");
  console.log("💡 Tips:");
  console.log("  - Run with visible browser: $0 --headed");
  console.log("  - Exclude specific apps: $0 --exclude 'Terminal Embed'");
  console.log("  - Stop on first failure: $0 --fail-fast");
  console.log("");
  // Generate summary report
  if ($TEST_RESULT -eq 0 ) {; then
  await $`cat > tests/screenshots/embedded-apps/summary.txt << EOF`;
  await $`AI Dev Portal - Embedded Apps Test Summary`;
  await $`==========================================`;
  await $`Date: $(date)`;
  await $`Status: PASSED ✅`;
  await $`Tested Apps:`;
  await $`- Mobile Preview: PASSED`;
  await $`- Mate Dealer: PASSED`;
  await $`- Terminal Embed: PASSED`;
  await $`- Theme Preview: PASSED`;
  await $`Features Verified:`;
  await $`- Iframe click handling`;
  await $`- Cross-origin messaging`;
  await $`- WebSocket connections`;
  await $`- Dynamic content loading`;
  await $`- Nested iframe interactions`;
  await $`Test Duration: Check playwright output above`;
  await $`EOF`;
  } else {
  await $`cat > tests/screenshots/embedded-apps/summary.txt << EOF`;
  await $`AI Dev Portal - Embedded Apps Test Summary`;
  await $`==========================================`;
  await $`Date: $(date)`;
  await $`Status: FAILED ❌`;
  await $`Check the test output and screenshots for details.`;
  await $`EOF`;
  }
  await $`exit $TEST_RESULT`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}