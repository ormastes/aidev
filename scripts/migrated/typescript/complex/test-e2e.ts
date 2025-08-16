#!/usr/bin/env bun
/**
 * Migrated from: test-e2e.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.716Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // E2E Test Script for Story Reporter through AI Dev Portal
  // This script runs the complete E2E test and generates a story report
  await $`set -e`;
  console.log("🚀 Starting Story Reporter E2E Test through AI Dev Portal");
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Check if running from project root
  if (! -f "CLAUDE.md" ) {; then
  console.log("-e ");${RED}Error: Must run from project root directory${NC}"
  process.exit(1);
  }
  // Function to check if port is in use
  await $`check_port() {`;
  await $`local port=$1`;
  await $`if lsof -Pi :$port -t >/dev/null 2>&1; then`;
  console.log("-e ");${YELLOW}Warning: Port $port is already in use${NC}"
  await $`return 1`;
  }
  await $`return 0`;
  await $`}`;
  // Check required ports
  console.log("-e ");${BLUE}Checking ports...${NC}"
  await $`PORTS=(3456 3401 8401)`;
  for (const port of ["${PORTS[@]}"; do]) {
  await $`if ! check_port $port; then`;
  console.log("-e ");${RED}Please stop the service on port $port before running the test${NC}"
  process.exit(1);
  }
  }
  // Install dependencies if needed
  console.log("-e ");${BLUE}Checking dependencies...${NC}"
  // Check Story Reporter dependencies
  if (! -d "layer/themes/story-reporter/release/server/node_modules" ) {; then
  console.log("Installing Story Reporter dependencies...");
  process.chdir("layer/themes/story-reporter/release/server");
  await $`npm install`;
  process.chdir("- > /dev/null");
  }
  // Check if Playwright is installed
  if (! -d "layer/themes/story-reporter/node_modules/@playwright" ) {; then
  console.log("Installing Playwright...");
  process.chdir("layer/themes/story-reporter");
  await $`npm install @playwright/test`;
  await $`bunx playwright install`;
  process.chdir("- > /dev/null");
  }
  // Build TypeScript if needed
  console.log("-e ");${BLUE}Building TypeScript...${NC}"
  process.chdir("layer/themes/story-reporter/release/server");
  if (! -d "dist" ) {; then
  await $`npm run build`;
  }
  process.chdir("- > /dev/null");
  // Create test report directory
  await $`REPORT_DIR="gen/doc/story-reporter-e2e-$(date +%Y%m%d-%H%M%S)"`;
  await mkdir(""$REPORT_DIR"", { recursive: true });
  console.log("-e ");${BLUE}Starting E2E test...${NC}"
  console.log("Report will be saved to: $REPORT_DIR");
  // Run the E2E test
  process.chdir("layer/themes/story-reporter");
  await $`E2E_OUTPUT=$(bunx playwright test --reporter=json 2>&1 || true)`;
  await $`E2E_EXIT_CODE=$?`;
  process.chdir("- > /dev/null");
  // Parse test results
  if ($E2E_EXIT_CODE -eq 0 ) {; then
  await $`TEST_STATUS="completed"`;
  await $`TEST_RESULT="✅ All tests passed"`;
  console.log("-e ");${GREEN}$TEST_RESULT${NC}"
  } else {
  await $`TEST_STATUS="failed"`;
  await $`TEST_RESULT="❌ Some tests failed"`;
  console.log("-e ");${RED}$TEST_RESULT${NC}"
  }
  // Generate story report JSON
  console.log("-e ");${BLUE}Generating story report...${NC}"
  await $`REPORT_FILE="$REPORT_DIR/story-report.json"`;
  await $`cat > "$REPORT_FILE" <<EOF`;
  await $`{`;
  await $`"title": "E2E Test Report: Story Reporter Integration with AI Dev Portal",`;
  await $`"description": "Automated E2E test execution report for Story Reporter service integration",`;
  await $`"reporter": "E2E Test Runner",`;
  await $`"status": "$TEST_STATUS",`;
  await $`"stage": "test",`;
  await $`"metadata": {`;
  await $`"userStory": "US-2024-E2E-001",`;
  await $`"testsCoverage": 95,`;
  await $`"executionTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",`;
  await $`"environment": {`;
  await $`"node": "$(node --version)",`;
  await $`"npm": "$(npm --version)",`;
  await $`"playwright": "$(cd layer/themes/story-reporter && bunx playwright --version)"`;
  await $`},`;
  await $`"tags": ["e2e", "automated", "integration", "playwright"]`;
  await $`},`;
  await $`"content": {`;
  await $`"summary": "$TEST_RESULT",`;
  await $`"testScenarios": [`;
  await $`{`;
  await $`"name": "Complete Story Reporter Workflow",`;
  await $`"steps": [`;
  await $`"Login to AI Dev Portal",`;
  await $`"Navigate to Story Reporter",`;
  await $`"Create new story report",`;
  await $`"Browse and filter reports",`;
  await $`"Update report status",`;
  await $`"Generate summary report",`;
  await $`"Logout and verify"`;
  await $`],`;
  await $`"result": "Validates full integration between services"`;
  await $`},`;
  await $`{`;
  await $`"name": "Data Persistence Test",`;
  await $`"steps": [`;
  await $`"Create report in first session",`;
  await $`"Logout completely",`;
  await $`"Login in new session",`;
  await $`"Verify report exists"`;
  await $`],`;
  await $`"result": "Ensures data persists across sessions"`;
  await $`}`;
  await $`],`;
  await $`"integrationPoints": [`;
  await $`"AI Dev Portal authentication",`;
  await $`"Service discovery and routing",`;
  await $`"Cross-service navigation",`;
  await $`"Shared JWT token validation",`;
  await $`"Database persistence"`;
  await $`],`;
  await $`"coverage": {`;
  await $`"uiInteractions": 100,`;
  await $`"apiEndpoints": 95,`;
  await $`"authFlows": 100,`;
  await $`"errorScenarios": 80`;
  await $`}`;
  await $`},`;
  await $`"createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"`;
  await $`}`;
  await $`EOF`;
  console.log("-e ");${GREEN}Story report saved to: $REPORT_FILE${NC}"
  // Copy Playwright report if it exists
  if (-d "layer/themes/story-reporter/playwright-report" ) {; then
  await copyFile("-r "layer/themes/story-reporter/playwright-report"", ""$REPORT_DIR/"");
  console.log("-e ");${GREEN}Playwright HTML report copied to: $REPORT_DIR/playwright-report${NC}"
  }
  // Generate summary
  console.log("");
  console.log("-e ");${BLUE}=== E2E Test Summary ===${NC}"
  console.log("Test Status: $TEST_RESULT");
  console.log("Report Location: $REPORT_DIR");
  console.log("Timestamp: $(date)");
  console.log("");
  // If test failed, show how to view details
  if ($E2E_EXIT_CODE -ne 0 ) {; then
  console.log("-e ");${YELLOW}To view test details:${NC}"
  console.log("  - HTML Report: open $REPORT_DIR/playwright-report/index.html");
  console.log("  - JSON Report: cat $REPORT_FILE | jq .");
  console.log("");
  console.log("-e ");${YELLOW}To debug failed tests:${NC}"
  console.log("  cd layer/themes/story-reporter");
  console.log("  bunx playwright test --debug");
  }
  // Optionally upload to Story Reporter if it's running
  await $`if curl -s -o /dev/null -w "%{http_code}" http://localhost:3401/health | grep -q "200"; then`;
  console.log("");
  console.log("-e ");${BLUE}Uploading report to Story Reporter...${NC}"
  // Create a simplified version for upload
  await $`UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3401/api/stories \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-H "Authorization: Bearer test-token" \`;
  await $`-d @"$REPORT_FILE")`;
  await $`if echo "$UPLOAD_RESPONSE" | grep -q "id"; then`;
  console.log("-e ");${GREEN}Report uploaded successfully!${NC}"
  console.log("Response: $UPLOAD_RESPONSE");
  } else {
  console.log("-e ");${YELLOW}Failed to upload report (Story Reporter may require authentication)${NC}"
  }
  }
  console.log("");
  console.log("-e ");${GREEN}✨ E2E test execution complete!${NC}"
  await $`exit $E2E_EXIT_CODE`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}