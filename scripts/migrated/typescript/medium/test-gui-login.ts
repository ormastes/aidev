#!/usr/bin/env bun
/**
 * Migrated from: test-gui-login.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.597Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("=== GUI Selector Login Test ===");
  console.log("");
  // Test 1: Check login page is shown
  console.log("Test 1: Checking if login page is shown when not authenticated...");
  await $`TITLE=$(curl -s http://localhost:3456/ | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g')`;
  if ([ "$TITLE" == "Login - GUI Template Selector" ]) {; then
  console.log("✓ PASS: Login page is shown");
  } else {
  console.log("✗ FAIL: Expected login page, got: $TITLE");
  }
  console.log("");
  // Test 2: Check API requires authentication
  console.log("Test 2: Checking if API requires authentication...");
  await $`API_RESPONSE=$(curl -s http://localhost:3456/api/templates)`;
  if ([ "$API_RESPONSE" == *"Authentication required"* ]) {; then
  console.log("✓ PASS: API is protected");
  } else {
  console.log("✗ FAIL: API is not protected. Response: $API_RESPONSE");
  }
  console.log("");
  // Test 3: Test login with valid credentials
  console.log("Test 3: Testing login with valid credentials...");
  await $`LOGIN_RESPONSE=$(curl -s -X POST \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{"username":"admin","password":"admin123"}' \`;
  await $`-c /tmp/gui-cookies.txt \`;
  await $`http://localhost:3456/api/auth/login)`;
  if ([ "$LOGIN_RESPONSE" == *"Login successful"* ]) {; then
  console.log("✓ PASS: Login successful");
  console.log("Response: $LOGIN_RESPONSE");
  } else {
  console.log("✗ FAIL: Login failed. Response: $LOGIN_RESPONSE");
  }
  console.log("");
  // Test 4: Check session after login
  console.log("Test 4: Checking session after login...");
  await $`SESSION_RESPONSE=$(curl -s -b /tmp/gui-cookies.txt http://localhost:3456/api/auth/session)`;
  if ([ "$SESSION_RESPONSE" == *"authenticated\":true"* ]) {; then
  console.log("✓ PASS: Session is authenticated");
  console.log("Response: $SESSION_RESPONSE");
  } else {
  console.log("✗ FAIL: Session not authenticated. Response: $SESSION_RESPONSE");
  }
  console.log("");
  // Test 5: Access protected API with session
  console.log("Test 5: Accessing protected API with session...");
  await $`TEMPLATES_COUNT=$(curl -s -b /tmp/gui-cookies.txt http://localhost:3456/api/templates | jq '. | length' 2>/dev/null || echo "error")`;
  if ([ "$TEMPLATES_COUNT" != "error" ]] && [[ "$TEMPLATES_COUNT" -ge 0 ]) {; then
  console.log("✓ PASS: Can access protected API. Found $TEMPLATES_COUNT templates");
  } else {
  console.log("✗ FAIL: Cannot access protected API");
  }
  console.log("");
  // Test 6: Access main page with session
  console.log("Test 6: Accessing main page with session...");
  await $`MAIN_TITLE=$(curl -s -b /tmp/gui-cookies.txt http://localhost:3456/ | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g')`;
  if ([ "$MAIN_TITLE" == "GUI Template Selector - AI Dev Portal" ]) {; then
  console.log("✓ PASS: Main page accessible with session");
  } else {
  console.log("✗ FAIL: Cannot access main page. Got: $MAIN_TITLE");
  }
  console.log("");
  // Test 7: Test invalid credentials
  console.log("Test 7: Testing login with invalid credentials...");
  await $`INVALID_RESPONSE=$(curl -s -X POST \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{"username":"wronguser","password":"wrongpass"}' \`;
  await $`http://localhost:3456/api/auth/login)`;
  if ([ "$INVALID_RESPONSE" == *"Invalid credentials"* ]) {; then
  console.log("✓ PASS: Invalid credentials rejected");
  } else {
  console.log("✗ FAIL: Invalid credentials not handled properly. Response: $INVALID_RESPONSE");
  }
  console.log("");
  // Clean up
  await $`rm -f /tmp/gui-cookies.txt`;
  console.log("=== Test Complete ===");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}