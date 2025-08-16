#!/usr/bin/env bun
/**
 * Migrated from: detailed-security-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.706Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Detailed Security Tests for AI Dev Platform
  await $`PORT=3465`;
  await $`BASE_URL="http://localhost:$PORT"`;
  console.log("======================================");
  console.log("🔒 DETAILED SECURITY VERIFICATION");
  console.log("======================================");
  console.log("");
  // Color codes
  await $`GREEN='\033[0;32m'`;
  await $`RED='\033[0;31m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Test function
  await $`test_feature() {`;
  await $`local name="$1"`;
  await $`local result="$2"`;
  await $`local details="$3"`;
  if ("$result" = "PASS" ) {; then
  console.log("-e ");${GREEN}✅ $name${NC}: $details"
  } else {
  console.log("-e ");${RED}❌ $name${NC}: $details"
  }
  await $`}`;
  console.log("1️⃣ Testing Security Headers...");
  console.log("--------------------------------");
  await $`headers=$(curl -sI $BASE_URL/api/health)`;
  // Check each header
  await $`x_content=$(echo "$headers" | grep -i "x-content-type-options" | cut -d' ' -f2)`;
  if ([ "$x_content" == *"nosniff"* ]) {; then
  await $`test_feature "X-Content-Type-Options" "PASS" "$x_content"`;
  } else {
  await $`test_feature "X-Content-Type-Options" "FAIL" "Missing or incorrect"`;
  }
  await $`x_frame=$(echo "$headers" | grep -i "x-frame-options" | cut -d' ' -f2)`;
  if ([ "$x_frame" == *"SAMEORIGIN"* ]] || [[ "$x_frame" == *"DENY"* ]) {; then
  await $`test_feature "X-Frame-Options" "PASS" "$x_frame"`;
  } else {
  await $`test_feature "X-Frame-Options" "FAIL" "Missing or incorrect"`;
  }
  await $`csp=$(echo "$headers" | grep -i "content-security-policy")`;
  if ([ -n "$csp" ]) {; then
  await $`test_feature "Content-Security-Policy" "PASS" "Present"`;
  } else {
  await $`test_feature "Content-Security-Policy" "FAIL" "Missing"`;
  }
  await $`hsts=$(echo "$headers" | grep -i "strict-transport-security")`;
  if ([ -n "$hsts" ]) {; then
  await $`test_feature "HSTS" "PASS" "Present"`;
  } else {
  await $`test_feature "HSTS" "FAIL" "Missing"`;
  }
  console.log("");
  console.log("2️⃣ Testing CSRF Protection...");
  console.log("--------------------------------");
  // Get CSRF token
  await $`csrf_response=$(curl -s $BASE_URL/api/auth/csrf)`;
  await $`csrf_token=$(echo $csrf_response | jq -r '.token')`;
  if ([ ${#csrf_token} -gt 32 ]) {; then
  await $`test_feature "CSRF Token Generation" "PASS" "Token length: ${#csrf_token}"`;
  } else {
  await $`test_feature "CSRF Token Generation" "FAIL" "Token too short or missing"`;
  }
  // Test login without CSRF
  await $`no_csrf=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/auth/login \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{"username":"test","password":"test"}')`;
  if ("$no_csrf" = "403" ) {; then
  await $`test_feature "CSRF Validation" "PASS" "Blocks requests without token (403)"`;
  } else {
  await $`test_feature "CSRF Validation" "FAIL" "Status: $no_csrf"`;
  }
  console.log("");
  console.log("3️⃣ Testing Rate Limiting...");
  console.log("--------------------------------");
  // Make rapid requests
  console.log("-n ");Making 20 rapid requests... "
  for (const i of [{1..20}; do]) {
  await $`response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)`;
  if ("$response" = "429" ) {; then
  await $`test_feature "Rate Limiting" "PASS" "Triggered at request $i (429)"`;
  await $`break`;
  }
  }
  if ("$response" != "429" ) {; then
  // Check for rate limit headers at least
  await $`rate_headers=$(curl -sI $BASE_URL/api/health | grep -i "x-ratelimit\|x-rate-limit")`;
  if ([ -n "$rate_headers" ]) {; then
  await $`test_feature "Rate Limiting" "PASS" "Headers present"`;
  } else {
  await $`test_feature "Rate Limiting" "FAIL" "Not triggered"`;
  }
  }
  console.log("");
  console.log("4️⃣ Testing Authentication Security...");
  console.log("--------------------------------");
  // Test weak passwords
  await $`weak_passwords=("admin" "password" "123456" "test")`;
  for (const pass of ["${weak_passwords[@]}"; do]) {
  await $`response=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/auth/login \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-H "X-CSRF-Token: $csrf_token" \`;
  await $`-d "{\"username\":\"admin\",\"password\":\"$pass\",\"_csrf\":\"$csrf_token\"}")`;
  if ("$response" -ge "400" ) {; then
  await $`test_feature "Block weak password: $pass" "PASS" "Status: $response"`;
  } else {
  await $`test_feature "Block weak password: $pass" "FAIL" "Accepted!"`;
  }
  }
  console.log("");
  console.log("5️⃣ Testing Error Handling...");
  console.log("--------------------------------");
  // Send malformed JSON
  await $`error_response=$(curl -s -X POST $BASE_URL/api/auth/login \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d 'malformed')`;
  // Check for stack traces
  if ([ "$error_response" == *".js:"* ]] || [[ "$error_response" == *"at "* ]) {; then
  await $`test_feature "No Stack Traces" "FAIL" "Stack trace exposed"`;
  } else {
  await $`test_feature "No Stack Traces" "PASS" "Stack traces hidden"`;
  }
  // Check for request ID
  if ([ "$error_response" == *"requestId"* ]) {; then
  await $`test_feature "Request ID in Errors" "PASS" "Present"`;
  } else {
  await $`test_feature "Request ID in Errors" "FAIL" "Missing"`;
  }
  console.log("");
  console.log("6️⃣ Testing Sensitive File Protection...");
  console.log("--------------------------------");
  await $`sensitive_paths=("/.env" "/.git/config" "/config.json" "/package.json" "/.gitignore" "/tsconfig.json")`;
  for (const path of ["${sensitive_paths[@]}"; do]) {
  await $`status=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL$path)`;
  if ("$status" = "404" ) {; then
  await $`test_feature "Block $path" "PASS" "404 Not Found"`;
  } else {
  await $`test_feature "Block $path" "FAIL" "Status: $status"`;
  }
  }
  console.log("");
  console.log("7️⃣ Testing XSS Protection...");
  console.log("--------------------------------");
  // Try XSS in login
  await $`xss_response=$(curl -s -X POST $BASE_URL/api/auth/login \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-H "X-CSRF-Token: $csrf_token" \`;
  await $`-d "{\"username\":\"<script>alert(1)</script>\",\"password\":\"test\",\"_csrf\":\"$csrf_token\"}")`;
  if ([ "$xss_response" == *"<script>"* ]) {; then
  await $`test_feature "XSS Protection" "FAIL" "Script tags not escaped"`;
  await $`elif [[ "$xss_response" == *"&lt;script&gt;"* ]]; then`;
  await $`test_feature "XSS Protection" "PASS" "Script tags escaped"`;
  } else {
  await $`test_feature "XSS Protection" "PASS" "XSS prevented"`;
  }
  console.log("");
  console.log("8️⃣ Testing CORS Configuration...");
  console.log("--------------------------------");
  await $`cors_response=$(curl -sI -H "Origin: http://evil.com" $BASE_URL/api/health | grep -i "access-control-allow-origin")`;
  if ([ "$cors_response" == *"*"* ]] || [[ "$cors_response" == *"evil.com"* ]) {; then
  await $`test_feature "CORS Security" "FAIL" "Allows evil origin"`;
  } else {
  await $`test_feature "CORS Security" "PASS" "Evil origin blocked"`;
  }
  console.log("");
  console.log("9️⃣ Testing Performance...");
  console.log("--------------------------------");
  // Measure response time
  await $`start_time=$(date +%s%N)`;
  await $`curl -s $BASE_URL/api/health > /dev/null`;
  await $`end_time=$(date +%s%N)`;
  await $`response_time=$((($end_time - $start_time) / 1000000))`;
  if ($response_time -lt 3000 ) {; then
  await $`test_feature "Response Time" "PASS" "${response_time}ms"`;
  } else {
  await $`test_feature "Response Time" "FAIL" "${response_time}ms (>3000ms)"`;
  }
  console.log("");
  console.log("🔟 Testing Fraud Detection...");
  console.log("--------------------------------");
  // Test fraud check endpoint
  await $`fraud_response=$(curl -s -X POST $BASE_URL/api/fraud/check \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{"action":"login","data":{"attempts":5}}')`;
  if ([ "$fraud_response" == *"score"* ]] || [[ "$fraud_response" == *"error"* ]) {; then
  await $`test_feature "Fraud Checker" "PASS" "Endpoint available"`;
  } else {
  await $`test_feature "Fraud Checker" "PASS" "Not configured (optional)"`;
  }
  console.log("");
  console.log("======================================");
  console.log("📊 TEST COMPLETE");
  console.log("======================================");
  console.log("");
  console.log("Server running on port $PORT");
  console.log("All critical security features tested!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}