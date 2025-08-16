#!/usr/bin/env python3
"""
Migrated from: detailed-security-tests.sh
Auto-generated Python - 2025-08-16T04:57:27.707Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Detailed Security Tests for AI Dev Platform
    subprocess.run("PORT=3465", shell=True)
    subprocess.run("BASE_URL="http://localhost:$PORT"", shell=True)
    print("======================================")
    print("🔒 DETAILED SECURITY VERIFICATION")
    print("======================================")
    print("")
    # Color codes
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Test function
    subprocess.run("test_feature() {", shell=True)
    subprocess.run("local name="$1"", shell=True)
    subprocess.run("local result="$2"", shell=True)
    subprocess.run("local details="$3"", shell=True)
    if "$result" = "PASS" :; then
    print("-e ")${GREEN}✅ $name${NC}: $details"
    else:
    print("-e ")${RED}❌ $name${NC}: $details"
    subprocess.run("}", shell=True)
    print("1️⃣ Testing Security Headers...")
    print("--------------------------------")
    subprocess.run("headers=$(curl -sI $BASE_URL/api/health)", shell=True)
    # Check each header
    subprocess.run("x_content=$(echo "$headers" | grep -i "x-content-type-options" | cut -d' ' -f2)", shell=True)
    if [ "$x_content" == *"nosniff"* ]:; then
    subprocess.run("test_feature "X-Content-Type-Options" "PASS" "$x_content"", shell=True)
    else:
    subprocess.run("test_feature "X-Content-Type-Options" "FAIL" "Missing or incorrect"", shell=True)
    subprocess.run("x_frame=$(echo "$headers" | grep -i "x-frame-options" | cut -d' ' -f2)", shell=True)
    if [ "$x_frame" == *"SAMEORIGIN"* ]] || [[ "$x_frame" == *"DENY"* ]:; then
    subprocess.run("test_feature "X-Frame-Options" "PASS" "$x_frame"", shell=True)
    else:
    subprocess.run("test_feature "X-Frame-Options" "FAIL" "Missing or incorrect"", shell=True)
    subprocess.run("csp=$(echo "$headers" | grep -i "content-security-policy")", shell=True)
    if [ -n "$csp" ]:; then
    subprocess.run("test_feature "Content-Security-Policy" "PASS" "Present"", shell=True)
    else:
    subprocess.run("test_feature "Content-Security-Policy" "FAIL" "Missing"", shell=True)
    subprocess.run("hsts=$(echo "$headers" | grep -i "strict-transport-security")", shell=True)
    if [ -n "$hsts" ]:; then
    subprocess.run("test_feature "HSTS" "PASS" "Present"", shell=True)
    else:
    subprocess.run("test_feature "HSTS" "FAIL" "Missing"", shell=True)
    print("")
    print("2️⃣ Testing CSRF Protection...")
    print("--------------------------------")
    # Get CSRF token
    subprocess.run("csrf_response=$(curl -s $BASE_URL/api/auth/csrf)", shell=True)
    subprocess.run("csrf_token=$(echo $csrf_response | jq -r '.token')", shell=True)
    if [ ${#csrf_token} -gt 32 ]:; then
    subprocess.run("test_feature "CSRF Token Generation" "PASS" "Token length: ${#csrf_token}"", shell=True)
    else:
    subprocess.run("test_feature "CSRF Token Generation" "FAIL" "Token too short or missing"", shell=True)
    # Test login without CSRF
    subprocess.run("no_csrf=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/auth/login \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{"username":"test","password":"test"}')", shell=True)
    if "$no_csrf" = "403" :; then
    subprocess.run("test_feature "CSRF Validation" "PASS" "Blocks requests without token (403)"", shell=True)
    else:
    subprocess.run("test_feature "CSRF Validation" "FAIL" "Status: $no_csrf"", shell=True)
    print("")
    print("3️⃣ Testing Rate Limiting...")
    print("--------------------------------")
    # Make rapid requests
    print("-n ")Making 20 rapid requests... "
    for i in [{1..20}; do]:
    subprocess.run("response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)", shell=True)
    if "$response" = "429" :; then
    subprocess.run("test_feature "Rate Limiting" "PASS" "Triggered at request $i (429)"", shell=True)
    subprocess.run("break", shell=True)
    if "$response" != "429" :; then
    # Check for rate limit headers at least
    subprocess.run("rate_headers=$(curl -sI $BASE_URL/api/health | grep -i "x-ratelimit\|x-rate-limit")", shell=True)
    if [ -n "$rate_headers" ]:; then
    subprocess.run("test_feature "Rate Limiting" "PASS" "Headers present"", shell=True)
    else:
    subprocess.run("test_feature "Rate Limiting" "FAIL" "Not triggered"", shell=True)
    print("")
    print("4️⃣ Testing Authentication Security...")
    print("--------------------------------")
    # Test weak passwords
    subprocess.run("weak_passwords=("admin" "password" "123456" "test")", shell=True)
    for pass in ["${weak_passwords[@]}"; do]:
    subprocess.run("response=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/auth/login \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-H "X-CSRF-Token: $csrf_token" \", shell=True)
    subprocess.run("-d "{\"username\":\"admin\",\"password\":\"$pass\",\"_csrf\":\"$csrf_token\"}")", shell=True)
    if "$response" -ge "400" :; then
    subprocess.run("test_feature "Block weak password: $pass" "PASS" "Status: $response"", shell=True)
    else:
    subprocess.run("test_feature "Block weak password: $pass" "FAIL" "Accepted!"", shell=True)
    print("")
    print("5️⃣ Testing Error Handling...")
    print("--------------------------------")
    # Send malformed JSON
    subprocess.run("error_response=$(curl -s -X POST $BASE_URL/api/auth/login \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d 'malformed')", shell=True)
    # Check for stack traces
    if [ "$error_response" == *".js:"* ]] || [[ "$error_response" == *"at "* ]:; then
    subprocess.run("test_feature "No Stack Traces" "FAIL" "Stack trace exposed"", shell=True)
    else:
    subprocess.run("test_feature "No Stack Traces" "PASS" "Stack traces hidden"", shell=True)
    # Check for request ID
    if [ "$error_response" == *"requestId"* ]:; then
    subprocess.run("test_feature "Request ID in Errors" "PASS" "Present"", shell=True)
    else:
    subprocess.run("test_feature "Request ID in Errors" "FAIL" "Missing"", shell=True)
    print("")
    print("6️⃣ Testing Sensitive File Protection...")
    print("--------------------------------")
    subprocess.run("sensitive_paths=("/.env" "/.git/config" "/config.json" "/package.json" "/.gitignore" "/tsconfig.json")", shell=True)
    for path in ["${sensitive_paths[@]}"; do]:
    subprocess.run("status=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL$path)", shell=True)
    if "$status" = "404" :; then
    subprocess.run("test_feature "Block $path" "PASS" "404 Not Found"", shell=True)
    else:
    subprocess.run("test_feature "Block $path" "FAIL" "Status: $status"", shell=True)
    print("")
    print("7️⃣ Testing XSS Protection...")
    print("--------------------------------")
    # Try XSS in login
    subprocess.run("xss_response=$(curl -s -X POST $BASE_URL/api/auth/login \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-H "X-CSRF-Token: $csrf_token" \", shell=True)
    subprocess.run("-d "{\"username\":\"<script>alert(1)</script>\",\"password\":\"test\",\"_csrf\":\"$csrf_token\"}")", shell=True)
    if [ "$xss_response" == *"<script>"* ]:; then
    subprocess.run("test_feature "XSS Protection" "FAIL" "Script tags not escaped"", shell=True)
    elif [ "$xss_response" == *"&lt;script&gt;"* ]:; then
    subprocess.run("test_feature "XSS Protection" "PASS" "Script tags escaped"", shell=True)
    else:
    subprocess.run("test_feature "XSS Protection" "PASS" "XSS prevented"", shell=True)
    print("")
    print("8️⃣ Testing CORS Configuration...")
    print("--------------------------------")
    subprocess.run("cors_response=$(curl -sI -H "Origin: http://evil.com" $BASE_URL/api/health | grep -i "access-control-allow-origin")", shell=True)
    if [ "$cors_response" == *"*"* ]] || [[ "$cors_response" == *"evil.com"* ]:; then
    subprocess.run("test_feature "CORS Security" "FAIL" "Allows evil origin"", shell=True)
    else:
    subprocess.run("test_feature "CORS Security" "PASS" "Evil origin blocked"", shell=True)
    print("")
    print("9️⃣ Testing Performance...")
    print("--------------------------------")
    # Measure response time
    subprocess.run("start_time=$(date +%s%N)", shell=True)
    subprocess.run("curl -s $BASE_URL/api/health > /dev/null", shell=True)
    subprocess.run("end_time=$(date +%s%N)", shell=True)
    subprocess.run("response_time=$((($end_time - $start_time) / 1000000))", shell=True)
    if $response_time -lt 3000 :; then
    subprocess.run("test_feature "Response Time" "PASS" "${response_time}ms"", shell=True)
    else:
    subprocess.run("test_feature "Response Time" "FAIL" "${response_time}ms (>3000ms)"", shell=True)
    print("")
    print("🔟 Testing Fraud Detection...")
    print("--------------------------------")
    # Test fraud check endpoint
    subprocess.run("fraud_response=$(curl -s -X POST $BASE_URL/api/fraud/check \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{"action":"login","data":{"attempts":5}}')", shell=True)
    if [ "$fraud_response" == *"score"* ]] || [[ "$fraud_response" == *"error"* ]:; then
    subprocess.run("test_feature "Fraud Checker" "PASS" "Endpoint available"", shell=True)
    else:
    subprocess.run("test_feature "Fraud Checker" "PASS" "Not configured (optional)"", shell=True)
    print("")
    print("======================================")
    print("📊 TEST COMPLETE")
    print("======================================")
    print("")
    print("Server running on port $PORT")
    print("All critical security features tested!")

if __name__ == "__main__":
    main()