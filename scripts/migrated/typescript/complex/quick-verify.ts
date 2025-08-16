#!/usr/bin/env bun
/**
 * Migrated from: quick-verify.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.759Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Quick verification script for Explorer system tests
  // This demonstrates that the Explorer can detect real failures
  await $`set -e`;
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`APP_DIR="$SCRIPT_DIR/../test-apps/vulnerable-app"`;
  await $`PORT=3459`;
  // Colors
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m'`;
  console.log("================================================");
  console.log("    EXPLORER DETECTION VERIFICATION");
  console.log("================================================");
  console.log("");
  // Start vulnerable app
  console.log("🚀 Starting vulnerable test app on port $PORT...");
  process.chdir(""$APP_DIR"");
  await $`PORT=$PORT node server.js > /dev/null 2>&1 &`;
  await $`APP_PID=$!`;
  // Wait for app to start
  await Bun.sleep(2 * 1000);
  // Function to test endpoint
  await $`test_endpoint() {`;
  await $`local url=$1`;
  await $`local description=$2`;
  await $`local check=$3`;
  console.log("-n ");Testing: $description... "
  await $`response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")`;
  await $`http_code=$(echo "$response" | tail -n1)`;
  await $`body=$(echo "$response" | head -n-1)`;
  await $`if eval "$check"; then`;
  console.log("-e ");${GREEN}✅ Bug detected!${NC}"
  await $`return 0`;
  } else {
  console.log("-e ");${RED}❌ Bug not present${NC}"
  await $`return 1`;
  }
  await $`}`;
  console.log("");
  console.log("🔍 Verifying intentional bugs are present:");
  console.log("===========================================");
  // Test 1: Console errors
  console.log("-n ");1. Console errors... "
  await $`if curl -s http://localhost:$PORT/ | grep -q "console.error"; then`;
  console.log("-e ");${GREEN}✅ Present${NC}"
  } else {
  console.log("-e ");${RED}❌ Missing${NC}"
  }
  // Test 2: XSS vulnerability
  console.log("-n ");2. XSS vulnerability... "
  await $`xss_test=$(curl -s "http://localhost:$PORT/search?q=<script>alert(1)</script>")`;
  await $`if echo "$xss_test" | grep -q "<script>alert(1)</script>"; then`;
  console.log("-e ");${GREEN}✅ Present${NC}"
  } else {
  console.log("-e ");${RED}❌ Missing${NC}"
  }
  // Test 3: Stack trace exposure
  console.log("-n ");3. Stack trace exposure... "
  await $`stack_test=$(curl -s http://localhost:$PORT/api/error)`;
  await $`if echo "$stack_test" | grep -q "stack"; then`;
  console.log("-e ");${GREEN}✅ Present${NC}"
  } else {
  console.log("-e ");${RED}❌ Missing${NC}"
  }
  // Test 4: Missing security headers
  console.log("-n ");4. Missing security headers... "
  await $`headers=$(curl -sI http://localhost:$PORT/api/users)`;
  await $`if ! echo "$headers" | grep -q "X-Content-Type-Options"; then`;
  console.log("-e ");${GREEN}✅ Missing (as expected)${NC}"
  } else {
  console.log("-e ");${RED}❌ Headers present${NC}"
  }
  // Test 5: API schema mismatch
  console.log("-n ");5. API schema mismatch... "
  await $`api_response=$(curl -s http://localhost:$PORT/api/users)`;
  await $`if echo "$api_response" | grep -q '"items"' && ! echo "$api_response" | grep -q '"total"'; then`;
  console.log("-e ");${GREEN}✅ Present${NC}"
  } else {
  console.log("-e ");${RED}❌ Missing${NC}"
  }
  // Test 6: 5xx error
  console.log("-n ");6. Server error (5xx)... "
  await $`error_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/crash)`;
  if ("$error_code" = "503" ) {; then
  console.log("-e ");${GREEN}✅ Present${NC}"
  } else {
  console.log("-e ");${RED}❌ Missing${NC}"
  }
  // Test 7: Slow response
  console.log("-n ");7. Slow response (>3s)... "
  await $`start_time=$(date +%s%N)`;
  await $`curl -s -X POST http://localhost:$PORT/login \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{"email":"test@example.com","password":"wrong"}' > /dev/null 2>&1`;
  await $`end_time=$(date +%s%N)`;
  await $`duration=$(( (end_time - start_time) / 1000000 ))`;
  if ($duration -gt 3000 ) {; then
  console.log("-e ");${GREEN}✅ Present (${duration}ms)${NC}"
  } else {
  console.log("-e ");${RED}❌ Too fast (${duration}ms)${NC}"
  }
  // Test 8: PII leak
  console.log("-n ");8. PII leak in errors... "
  await $`pii_test=$(curl -s -X POST http://localhost:$PORT/login \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{"email":"user@test.com","password":"secretpass"}')`;
  await $`if echo "$pii_test" | grep -q "secretpass"; then`;
  console.log("-e ");${GREEN}✅ Present${NC}"
  } else {
  console.log("-e ");${RED}❌ Missing${NC}"
  }
  console.log("");
  console.log("===========================================");
  console.log("-e ");${GREEN}✅ All intentional bugs verified!${NC}"
  console.log("");
  console.log("The Explorer should be able to detect these issues.");
  console.log("Run './run-system-tests.sh' for full test suite.");
  console.log("");
  // Cleanup
  await $`kill $APP_PID 2>/dev/null || true`;
  console.log("Test app stopped.");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}