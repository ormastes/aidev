#!/usr/bin/env bun
/**
 * Migrated from: verify-release.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.762Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Verify Mate Dealer Release
  await $`set -e`;
  console.log("🔍 Verifying Mate Dealer Release Setup");
  console.log("=====================================");
  console.log("");
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m' # No Color`;
  // Check current directory
  console.log("-e ");${BLUE}Current Location:${NC} $(pwd)"
  console.log("");
  // Check environment file
  if (-f ".env" ) {; then
  console.log("-e ");${GREEN}✓${NC} Environment file exists"
  await $`if grep -q "NODE_ENV=release" .env; then`;
  console.log("-e ");${GREEN}✓${NC} NODE_ENV set to release"
  } else {
  console.log("-e ");${RED}✗${NC} NODE_ENV not set to release"
  }
  } else {
  console.log("-e ");${RED}✗${NC} Environment file missing"
  }
  // Check dependencies
  console.log("");
  console.log("-e ");${BLUE}Checking dependencies...${NC}"
  if (-d "node_modules" ) {; then
  console.log("-e ");${GREEN}✓${NC} Dependencies installed"
  } else {
  console.log("-e ");${YELLOW}⚠${NC} Dependencies not installed - run: npm install"
  }
  // Check build
  console.log("");
  console.log("-e ");${BLUE}Checking build...${NC}"
  if (-d "dist" ) {; then
  console.log("-e ");${GREEN}✓${NC} Build directory exists"
  if (-f "dist/server.js" ) {; then
  console.log("-e ");${GREEN}✓${NC} Server compiled"
  } else {
  console.log("-e ");${RED}✗${NC} Server not compiled"
  }
  } else {
  console.log("-e ");${YELLOW}⚠${NC} Not built - run: npm run build"
  }
  // Check data directory
  console.log("");
  console.log("-e ");${BLUE}Checking data directory...${NC}"
  if (-d "data" ) {; then
  console.log("-e ");${GREEN}✓${NC} Data directory exists"
  } else {
  console.log("-e ");${YELLOW}⚠${NC} Data directory will be created on first run"
  }
  // Check logs directory
  if (-d "logs" ) {; then
  console.log("-e ");${GREEN}✓${NC} Logs directory exists"
  } else {
  console.log("-e ");${YELLOW}⚠${NC} Logs directory will be created on first run"
  }
  // Check release scripts
  console.log("");
  console.log("-e ");${BLUE}Checking release scripts...${NC}"
  if (-x "start-release.sh" ) {; then
  console.log("-e ");${GREEN}✓${NC} start-release.sh is executable"
  } else {
  console.log("-e ");${RED}✗${NC} start-release.sh not executable"
  }
  if (-f "ecosystem.config.js" ) {; then
  console.log("-e ");${GREEN}✓${NC} PM2 configuration exists"
  } else {
  console.log("-e ");${RED}✗${NC} PM2 configuration missing"
  }
  // Test build process
  console.log("");
  console.log("-e ");${BLUE}Testing build process...${NC}"
  await $`if npm run build > /dev/null 2>&1; then`;
  console.log("-e ");${GREEN}✓${NC} Build successful"
  } else {
  console.log("-e ");${RED}✗${NC} Build failed"
  }
  // Check server health
  console.log("");
  console.log("-e ");${BLUE}Quick server test...${NC}"
  await $`if lsof -Pi :3303 -sTCP:LISTEN -t >/dev/null ; then`;
  console.log("-e ");${YELLOW}⚠${NC} Port 3303 already in use"
  // Try health check
  await $`if curl -s http://localhost:3303/api/health > /dev/null; then`;
  console.log("-e ");${GREEN}✓${NC} Health check passed"
  await $`HEALTH=$(curl -s http://localhost:3303/api/health)`;
  console.log("  Response: $HEALTH");
  }
  } else {
  console.log("-e ");${GREEN}✓${NC} Port 3303 is available"
  // Quick start test
  console.log("-e ");${BLUE}Starting server for quick test...${NC}"
  await $`NODE_ENV=release timeout 5 node dist/server.js > /tmp/mate-test.log 2>&1 &`;
  await $`TEST_PID=$!`;
  await Bun.sleep(3 * 1000);
  await $`if curl -s http://localhost:3303/api/health > /dev/null; then`;
  console.log("-e ");${GREEN}✓${NC} Server starts successfully"
  } else {
  console.log("-e ");${RED}✗${NC} Server failed to start"
  await $`cat /tmp/mate-test.log`;
  }
  await $`kill $TEST_PID 2>/dev/null || true`;
  }
  console.log("");
  console.log("=====================================");
  console.log("-e ");${GREEN}Verification complete!${NC}"
  console.log("");
  console.log("To start the release server:");
  console.log("  ./start-release.sh");
  console.log("");
  console.log("Or with PM2:");
  console.log("  pm2 start ecosystem.config.js");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}