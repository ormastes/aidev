#!/usr/bin/env bun
/**
 * Migrated from: run-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.766Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Comprehensive test runner for coordinator-claude-agent
  // Following Mock-Free Test Oriented Development (MFTOD) principles
  await $`set -e`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[0;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  console.log("-e ");${BLUE}🧪 Running Coordinator Agent Tests${NC}"
  console.log("=================================");
  // Function to run a test suite
  await $`run_test_suite() {`;
  await $`local suite_name=$1`;
  await $`local command=$2`;
  console.log("-e ");\n${YELLOW}▶ Running ${suite_name} Tests${NC}"
  await $`if eval "$command"; then`;
  console.log("-e ");${GREEN}✅ ${suite_name} Tests Passed${NC}"
  } else {
  console.log("-e ");${RED}❌ ${suite_name} Tests Failed${NC}"
  process.exit(1);
  }
  await $`}`;
  // Check if we're in the right directory
  if (! -f "package.json" ) {; then
  console.log("-e ");${RED}Error: Must run from coordinator-claude-agent directory${NC}"
  process.exit(1);
  }
  // Install dependencies if needed
  if (! -d "node_modules" ) {; then
  console.log("-e ");${YELLOW}📦 Installing dependencies...${NC}"
  await $`npm install`;
  }
  // Clean previous test artifacts
  console.log("-e ");${YELLOW}🧹 Cleaning test artifacts...${NC}"
  await rm("coverage .nyc_output test-results playwright-report", { recursive: true, force: true });
  // Run TypeScript compilation check
  console.log("-e ");\n${YELLOW}📐 Type Checking...${NC}"
  await $`npm run typecheck`;
  // Run linting
  console.log("-e ");\n${YELLOW}🔍 Linting...${NC}"
  await $`npm run lint`;
  // Run different test suites based on MFTOD levels
  // Level 1: Unit Tests
  await $`run_test_suite "Unit" "npm run test:unit"`;
  // Level 2: Integration Tests
  await $`run_test_suite "Integration" "npm run test:integration"`;
  // Level 3: External Tests (only if API key is available)
  if (-n "$CLAUDE_API_KEY" ] || [ -n "$CLAUDE_API_KEY_TEST" ) {; then
  await $`run_test_suite "External" "npm run test:external"`;
  } else {
  console.log("-e ");\n${YELLOW}⚠️  Skipping External Tests (no API key found)${NC}"
  }
  // Level 4: System Tests (E2E with Playwright)
  await $`if command -v bunx &> /dev/null && bunx playwright --version &> /dev/null; then`;
  await $`run_test_suite "System (E2E)" "npm run test:system"`;
  } else {
  console.log("-e ");\n${YELLOW}⚠️  Skipping System Tests (Playwright not installed)${NC}"
  }
  // Level 5: Environment Tests
  await $`run_test_suite "Environment" "npm run test:env"`;
  // Generate coverage report
  console.log("-e ");\n${YELLOW}📊 Generating Coverage Report...${NC}"
  await $`npm run test:coverage -- --silent`;
  // Check coverage thresholds
  console.log("-e ");\n${YELLOW}📈 Coverage Summary:${NC}"
  if (-f "coverage/lcov-report/index.html" ) {; then
  // Extract coverage percentages from lcov.info
  if (-f "coverage/lcov.info" ) {; then
  await $`lines=$(grep -A 1 "LF:" coverage/lcov.info | grep "LH:" | awk '{s+=$2} END {print s}')`;
  await $`total=$(grep "LF:" coverage/lcov.info | awk '{s+=$2} END {print s}')`;
  if ("$total" -gt 0 ) {; then
  await $`coverage=$((lines * 100 / total))`;
  console.log("-e ");Line Coverage: ${coverage}%"
  if ($coverage -ge 80 ) {; then
  console.log("-e ");${GREEN}✅ Coverage threshold met!${NC}"
  } else {
  console.log("-e ");${RED}❌ Coverage below 80% threshold${NC}"
  }
  }
  }
  console.log("-e ");\nDetailed report: file://$(pwd)/coverage/lcov-report/index.html"
  }
  // Performance check
  console.log("-e ");\n${YELLOW}⚡ Performance Check...${NC}"
  if (-n "$RUN_PERFORMANCE_TESTS" ) {; then
  console.log("Running performance tests...");
  await $`npm test -- --testNamePattern="performance" --verbose`;
  } else {
  console.log("Set RUN_PERFORMANCE_TESTS=1 to run performance tests");
  }
  // Final summary
  console.log("-e ");\n${GREEN}════════════════════════════════${NC}"
  console.log("-e ");${GREEN}✅ All Tests Completed Successfully!${NC}"
  console.log("-e ");${GREEN}════════════════════════════════${NC}"
  // Optional: Build check
  if ("$1" = "--with-build" ) {; then
  console.log("-e ");\n${YELLOW}🔨 Building Project...${NC}"
  await $`npm run build`;
  console.log("-e ");${GREEN}✅ Build Successful${NC}"
  }
  // Development tips
  console.log("-e ");\n${BLUE}💡 Development Tips:${NC}"
  console.log("• Run 'npm run test:watch' for TDD mode");
  console.log("• Use 'npm run dev' to start in development mode");
  console.log("• Check './coordinator-claude start --help' for CLI options");
  console.log("• Session files are stored in .coordinator-sessions/");
  process.exit(0);
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}