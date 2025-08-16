#!/usr/bin/env python3
"""
Migrated from: quick-verify.sh
Auto-generated Python - 2025-08-16T04:57:27.759Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Quick verification script for Explorer system tests
    # This demonstrates that the Explorer can detect real failures
    subprocess.run("set -e", shell=True)
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("APP_DIR="$SCRIPT_DIR/../test-apps/vulnerable-app"", shell=True)
    subprocess.run("PORT=3459", shell=True)
    # Colors
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("================================================")
    print("    EXPLORER DETECTION VERIFICATION")
    print("================================================")
    print("")
    # Start vulnerable app
    print("🚀 Starting vulnerable test app on port $PORT...")
    os.chdir(""$APP_DIR"")
    subprocess.run("PORT=$PORT node server.js > /dev/null 2>&1 &", shell=True)
    subprocess.run("APP_PID=$!", shell=True)
    # Wait for app to start
    time.sleep(2)
    # Function to test endpoint
    subprocess.run("test_endpoint() {", shell=True)
    subprocess.run("local url=$1", shell=True)
    subprocess.run("local description=$2", shell=True)
    subprocess.run("local check=$3", shell=True)
    print("-n ")Testing: $description... "
    subprocess.run("response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")", shell=True)
    subprocess.run("http_code=$(echo "$response" | tail -n1)", shell=True)
    subprocess.run("body=$(echo "$response" | head -n-1)", shell=True)
    subprocess.run("if eval "$check"; then", shell=True)
    print("-e ")${GREEN}✅ Bug detected!${NC}"
    subprocess.run("return 0", shell=True)
    else:
    print("-e ")${RED}❌ Bug not present${NC}"
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    print("")
    print("🔍 Verifying intentional bugs are present:")
    print("===========================================")
    # Test 1: Console errors
    print("-n ")1. Console errors... "
    subprocess.run("if curl -s http://localhost:$PORT/ | grep -q "console.error"; then", shell=True)
    print("-e ")${GREEN}✅ Present${NC}"
    else:
    print("-e ")${RED}❌ Missing${NC}"
    # Test 2: XSS vulnerability
    print("-n ")2. XSS vulnerability... "
    subprocess.run("xss_test=$(curl -s "http://localhost:$PORT/search?q=<script>alert(1)</script>")", shell=True)
    subprocess.run("if echo "$xss_test" | grep -q "<script>alert(1)</script>"; then", shell=True)
    print("-e ")${GREEN}✅ Present${NC}"
    else:
    print("-e ")${RED}❌ Missing${NC}"
    # Test 3: Stack trace exposure
    print("-n ")3. Stack trace exposure... "
    subprocess.run("stack_test=$(curl -s http://localhost:$PORT/api/error)", shell=True)
    subprocess.run("if echo "$stack_test" | grep -q "stack"; then", shell=True)
    print("-e ")${GREEN}✅ Present${NC}"
    else:
    print("-e ")${RED}❌ Missing${NC}"
    # Test 4: Missing security headers
    print("-n ")4. Missing security headers... "
    subprocess.run("headers=$(curl -sI http://localhost:$PORT/api/users)", shell=True)
    subprocess.run("if ! echo "$headers" | grep -q "X-Content-Type-Options"; then", shell=True)
    print("-e ")${GREEN}✅ Missing (as expected)${NC}"
    else:
    print("-e ")${RED}❌ Headers present${NC}"
    # Test 5: API schema mismatch
    print("-n ")5. API schema mismatch... "
    subprocess.run("api_response=$(curl -s http://localhost:$PORT/api/users)", shell=True)
    subprocess.run("if echo "$api_response" | grep -q '"items"' && ! echo "$api_response" | grep -q '"total"'; then", shell=True)
    print("-e ")${GREEN}✅ Present${NC}"
    else:
    print("-e ")${RED}❌ Missing${NC}"
    # Test 6: 5xx error
    print("-n ")6. Server error (5xx)... "
    subprocess.run("error_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/crash)", shell=True)
    if "$error_code" = "503" :; then
    print("-e ")${GREEN}✅ Present${NC}"
    else:
    print("-e ")${RED}❌ Missing${NC}"
    # Test 7: Slow response
    print("-n ")7. Slow response (>3s)... "
    subprocess.run("start_time=$(date +%s%N)", shell=True)
    subprocess.run("curl -s -X POST http://localhost:$PORT/login \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{"email":"test@example.com","password":"wrong"}' > /dev/null 2>&1", shell=True)
    subprocess.run("end_time=$(date +%s%N)", shell=True)
    subprocess.run("duration=$(( (end_time - start_time) / 1000000 ))", shell=True)
    if $duration -gt 3000 :; then
    print("-e ")${GREEN}✅ Present (${duration}ms)${NC}"
    else:
    print("-e ")${RED}❌ Too fast (${duration}ms)${NC}"
    # Test 8: PII leak
    print("-n ")8. PII leak in errors... "
    subprocess.run("pii_test=$(curl -s -X POST http://localhost:$PORT/login \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{"email":"user@test.com","password":"secretpass"}')", shell=True)
    subprocess.run("if echo "$pii_test" | grep -q "secretpass"; then", shell=True)
    print("-e ")${GREEN}✅ Present${NC}"
    else:
    print("-e ")${RED}❌ Missing${NC}"
    print("")
    print("===========================================")
    print("-e ")${GREEN}✅ All intentional bugs verified!${NC}"
    print("")
    print("The Explorer should be able to detect these issues.")
    print("Run './run-system-tests.sh' for full test suite.")
    print("")
    # Cleanup
    subprocess.run("kill $APP_PID 2>/dev/null || true", shell=True)
    print("Test app stopped.")

if __name__ == "__main__":
    main()