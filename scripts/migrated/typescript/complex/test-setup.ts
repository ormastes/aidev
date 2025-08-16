#!/usr/bin/env bun
/**
 * Migrated from: test-setup.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.761Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // AIIDE Setup Test Script
  // Tests all components and reports status
  await $`set -e`;
  console.log("🔍 AIIDE Setup Verification Script");
  console.log("==================================");
  console.log("");
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Test results
  await $`TESTS_PASSED=0`;
  await $`TESTS_FAILED=0`;
  // Function to test a condition
  await $`test_condition() {`;
  await $`local test_name="$1"`;
  await $`local command="$2"`;
  console.log("-n ");Testing $test_name... "
  await $`if eval "$command" > /dev/null 2>&1; then`;
  console.log("-e ");${GREEN}✓ PASSED${NC}"
  await $`((TESTS_PASSED++))`;
  await $`return 0`;
  } else {
  console.log("-e ");${RED}✗ FAILED${NC}"
  await $`((TESTS_FAILED++))`;
  await $`return 1`;
  }
  await $`}`;
  // Function to check port
  await $`check_port() {`;
  await $`local port=$1`;
  await $`nc -z localhost $port`;
  await $`}`;
  console.log("1. Checking Dependencies");
  console.log("------------------------");
  await $`test_condition "Node.js installed" "which node"`;
  await $`test_condition "npm installed" "which npm"`;
  await $`test_condition "Node version >= 18" "[[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -ge 18 ]]"`;
  console.log("");
  console.log("2. Checking Project Structure");
  console.log("-----------------------------");
  await $`test_condition "package.json exists" "[[ -f package.json ]]"`;
  await $`test_condition "node_modules exists" "[[ -d node_modules ]]"`;
  await $`test_condition "children directory exists" "[[ -d children ]]"`;
  await $`test_condition "server directory exists" "[[ -d server ]]"`;
  await $`test_condition "workspace directory exists" "[[ -d workspace ]]"`;
  console.log("");
  console.log("3. Checking Environment");
  console.log("-----------------------");
  await $`test_condition ".env file exists" "[[ -f .env ]]"`;
  await $`test_condition ".env.example exists" "[[ -f .env.example ]]"`;
  console.log("");
  console.log("4. Checking Services");
  console.log("-------------------");
  await $`test_condition "Frontend running (port 5173)" "check_port 5173"`;
  await $`test_condition "Backend running (port 3457)" "check_port 3457"`;
  console.log("");
  console.log("5. Testing API Endpoints");
  console.log("-----------------------");
  await $`test_condition "Health check" "curl -s http://localhost:3457/api/health | grep -q 'ok'"`;
  await $`test_condition "Providers endpoint" "curl -s http://localhost:3457/api/providers | grep -q 'claude'"`;
  await $`test_condition "File tree endpoint" "curl -s 'http://localhost:3457/api/files/tree?path=workspace' | grep -q 'workspace'"`;
  console.log("");
  console.log("6. Checking Build");
  console.log("----------------");
  await $`test_condition "dist directory exists" "[[ -d dist ]]"`;
  await $`test_condition "Build files present" "[[ -f dist/index.html ]]"`;
  console.log("");
  console.log("7. Testing File Operations");
  console.log("-------------------------");
  // Create test file
  await $`TEST_FILE="workspace/test-$(date +%s).txt"`;
  await $`test_condition "Create file via API" "curl -s -X POST http://localhost:3457/api/files/create \`;
  await $`-H 'Content-Type: application/json' \`;
  await $`-d '{\"path\":\"$TEST_FILE\",\"content\":\"test\",\"type\":\"file\"}' | grep -q 'success'"`;
  // Read test file
  await $`test_condition "Read file via API" "curl -s 'http://localhost:3457/api/files/read?path=$TEST_FILE' | grep -q 'test'"`;
  // Delete test file
  await $`test_condition "Delete file via API" "curl -s -X DELETE 'http://localhost:3457/api/files/delete?path=$TEST_FILE' | grep -q 'success'"`;
  console.log("");
  console.log("8. Checking Documentation");
  console.log("------------------------");
  await $`test_condition "README.md exists" "[[ -f README.md ]]"`;
  await $`test_condition "DEPLOYMENT.md exists" "[[ -f DEPLOYMENT.md ]]"`;
  await $`test_condition "API.md exists" "[[ -f API.md ]]"`;
  await $`test_condition "QUICK_START.md exists" "[[ -f QUICK_START.md ]]"`;
  console.log("");
  console.log("==================================");
  console.log("📊 Test Results");
  console.log("==================================");
  console.log("-e ");${GREEN}Passed: $TESTS_PASSED${NC}"
  console.log("-e ");${RED}Failed: $TESTS_FAILED${NC}"
  console.log("");
  if ([ $TESTS_FAILED -eq 0 ]) {; then
  console.log("-e ");${GREEN}🎉 All tests passed! AIIDE is properly set up.${NC}"
  console.log("");
  console.log("You can now access AIIDE at:");
  console.log("  • Frontend: http://localhost:5173");
  console.log("  • Backend API: http://localhost:3457");
  console.log("  • API Docs: http://localhost:3457/api-docs");
  process.exit(0);
  } else {
  console.log("-e ");${YELLOW}⚠️  Some tests failed. Please check the setup.${NC}"
  console.log("");
  console.log("Common fixes:");
  console.log("  • Run 'npm install' to install dependencies");
  console.log("  • Run 'npm start' to start services");
  console.log("  • Check .env file for API keys");
  console.log("  • Run 'npm run build' to create production build");
  process.exit(1);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}