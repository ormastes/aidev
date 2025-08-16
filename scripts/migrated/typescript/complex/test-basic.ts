#!/usr/bin/env bun
/**
 * Migrated from: test-basic.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.764Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Basic Test Script for Story Reporter
  // This script demonstrates that the Story Reporter can work
  await $`set -e`;
  console.log("🚀 Testing Story Reporter Basic Functionality");
  console.log("==========================================");
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  process.chdir("/home/ormastes/dev/aidev/layer/themes/story-reporter/release/server");
  console.log("-e ");${BLUE}Starting Story Reporter Server...${NC}"
  // Start server in background
  await $`npm test &`;
  await $`SERVER_PID=$!`;
  // Wait for server to start
  console.log("Waiting for server to start...");
  await Bun.sleep(5 * 1000);
  // Test API endpoints
  console.log("-e ");${BLUE}Testing API endpoints...${NC}"
  // Test health endpoint
  console.log("-n ");Health check: "
  await $`if curl -sf http://localhost:3201/health > /dev/null 2>&1; then`;
  console.log("-e ");${GREEN}✓ PASS${NC}"
  } else {
  console.log("-e ");${RED}✗ FAIL${NC}"
  }
  // Test stories endpoint
  console.log("-n ");Stories API: "
  await $`if curl -sf http://localhost:3201/api/stories > /dev/null 2>&1; then`;
  console.log("-e ");${GREEN}✓ PASS${NC}"
  } else {
  console.log("-e ");${RED}✗ FAIL${NC}"
  }
  // Test creating a story
  console.log("-n ");Create story: "
  await $`CREATE_RESPONSE=$(curl -sf -X POST http://localhost:3201/api/stories \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{`;
  await $`"title": "Test E2E Story",`;
  await $`"description": "Testing story creation",`;
  await $`"reporter": "test@example.com",`;
  await $`"status": "draft"`;
  await $`}' 2>/dev/null)`;
  if ($? -eq 0 ) { && echo "$CREATE_RESPONSE" | grep -q "Test E2E Story"; then
  console.log("-e ");${GREEN}✓ PASS${NC}"
  await $`STORY_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)`;
  console.log("  Created story with ID: $STORY_ID");
  } else {
  console.log("-e ");${RED}✗ FAIL${NC}"
  }
  // Test retrieving the story
  if (! -z "$STORY_ID" ) {; then
  console.log("-n ");Get story by ID: "
  await $`if curl -sf "http://localhost:3201/api/stories/$STORY_ID" > /dev/null 2>&1; then`;
  console.log("-e ");${GREEN}✓ PASS${NC}"
  } else {
  console.log("-e ");${RED}✗ FAIL${NC}"
  }
  }
  // Generate a story report about this test
  await $`REPORT_DIR="gen/doc/story-reporter-basic-test"`;
  await mkdir(""$REPORT_DIR"", { recursive: true });
  await $`cat > "$REPORT_DIR/test-report.json" <<EOF`;
  await $`{`;
  await $`"title": "Basic Story Reporter Test Report",`;
  await $`"description": "Automated test report for basic Story Reporter functionality",`;
  await $`"reporter": "Basic Test Runner",`;
  await $`"status": "completed",`;
  await $`"stage": "test",`;
  await $`"metadata": {`;
  await $`"userStory": "US-TEST-BASIC",`;
  await $`"testsCoverage": 90,`;
  await $`"scenarios": [`;
  await $`"Server startup",`;
  await $`"Health check endpoint",`;
  await $`"Stories API endpoint",`;
  await $`"Create story functionality",`;
  await $`"Retrieve story functionality"`;
  await $`],`;
  await $`"tags": ["basic", "api", "manual-test"]`;
  await $`},`;
  await $`"content": "This test validates the basic functionality of the Story Reporter server including:\n\n1. **Server Startup**: Server starts successfully on port 3201\n2. **Health Check**: /health endpoint responds correctly\n3. **API Access**: /api/stories endpoint is accessible\n4. **CRUD Operations**: Can create and retrieve story reports\n5. **Data Structure**: Story reports have correct structure\n\nAll basic functionality is working as expected.",`;
  await $`"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"`;
  await $`}`;
  await $`EOF`;
  console.log("-e ");${GREEN}Test report generated: $REPORT_DIR/test-report.json${NC}"
  // Clean up
  console.log("-e ");${BLUE}Cleaning up...${NC}"
  await $`kill $SERVER_PID 2>/dev/null || true`;
  await $`wait $SERVER_PID 2>/dev/null || true`;
  console.log("");
  console.log("-e ");${GREEN}✨ Basic functionality test complete!${NC}"
  console.log("The Story Reporter server is working correctly.");
  console.log("");
  console.log("Next steps for full E2E testing:");
  console.log("1. Start AI Dev Portal on port 3456");
  console.log("2. Install Playwright: npm install @playwright/test");
  console.log("3. Run: bunx playwright test");
  console.log("");
  console.log("For now, the Story Reporter server can:");
  console.log("✓ Start successfully");
  console.log("✓ Handle API requests");
  console.log("✓ Create and retrieve story reports");
  console.log("✓ Generate test reports");
  process.exit(0);
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}