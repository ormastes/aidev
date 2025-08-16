#!/usr/bin/env python3
"""
Migrated from: test-setup.sh
Auto-generated Python - 2025-08-16T04:57:27.762Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # AIIDE Setup Test Script
    # Tests all components and reports status
    subprocess.run("set -e", shell=True)
    print("🔍 AIIDE Setup Verification Script")
    print("==================================")
    print("")
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Test results
    subprocess.run("TESTS_PASSED=0", shell=True)
    subprocess.run("TESTS_FAILED=0", shell=True)
    # Function to test a condition
    subprocess.run("test_condition() {", shell=True)
    subprocess.run("local test_name="$1"", shell=True)
    subprocess.run("local command="$2"", shell=True)
    print("-n ")Testing $test_name... "
    subprocess.run("if eval "$command" > /dev/null 2>&1; then", shell=True)
    print("-e ")${GREEN}✓ PASSED${NC}"
    subprocess.run("((TESTS_PASSED++))", shell=True)
    subprocess.run("return 0", shell=True)
    else:
    print("-e ")${RED}✗ FAILED${NC}"
    subprocess.run("((TESTS_FAILED++))", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Function to check port
    subprocess.run("check_port() {", shell=True)
    subprocess.run("local port=$1", shell=True)
    subprocess.run("nc -z localhost $port", shell=True)
    subprocess.run("}", shell=True)
    print("1. Checking Dependencies")
    print("------------------------")
    subprocess.run("test_condition "Node.js installed" "which node"", shell=True)
    subprocess.run("test_condition "npm installed" "which npm"", shell=True)
    subprocess.run("test_condition "Node version >= 18" "[[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -ge 18 ]]"", shell=True)
    print("")
    print("2. Checking Project Structure")
    print("-----------------------------")
    subprocess.run("test_condition "package.json exists" "[[ -f package.json ]]"", shell=True)
    subprocess.run("test_condition "node_modules exists" "[[ -d node_modules ]]"", shell=True)
    subprocess.run("test_condition "children directory exists" "[[ -d children ]]"", shell=True)
    subprocess.run("test_condition "server directory exists" "[[ -d server ]]"", shell=True)
    subprocess.run("test_condition "workspace directory exists" "[[ -d workspace ]]"", shell=True)
    print("")
    print("3. Checking Environment")
    print("-----------------------")
    subprocess.run("test_condition ".env file exists" "[[ -f .env ]]"", shell=True)
    subprocess.run("test_condition ".env.example exists" "[[ -f .env.example ]]"", shell=True)
    print("")
    print("4. Checking Services")
    print("-------------------")
    subprocess.run("test_condition "Frontend running (port 5173)" "check_port 5173"", shell=True)
    subprocess.run("test_condition "Backend running (port 3457)" "check_port 3457"", shell=True)
    print("")
    print("5. Testing API Endpoints")
    print("-----------------------")
    subprocess.run("test_condition "Health check" "curl -s http://localhost:3457/api/health | grep -q 'ok'"", shell=True)
    subprocess.run("test_condition "Providers endpoint" "curl -s http://localhost:3457/api/providers | grep -q 'claude'"", shell=True)
    subprocess.run("test_condition "File tree endpoint" "curl -s 'http://localhost:3457/api/files/tree?path=workspace' | grep -q 'workspace'"", shell=True)
    print("")
    print("6. Checking Build")
    print("----------------")
    subprocess.run("test_condition "dist directory exists" "[[ -d dist ]]"", shell=True)
    subprocess.run("test_condition "Build files present" "[[ -f dist/index.html ]]"", shell=True)
    print("")
    print("7. Testing File Operations")
    print("-------------------------")
    # Create test file
    subprocess.run("TEST_FILE="workspace/test-$(date +%s).txt"", shell=True)
    subprocess.run("test_condition "Create file via API" "curl -s -X POST http://localhost:3457/api/files/create \", shell=True)
    subprocess.run("-H 'Content-Type: application/json' \", shell=True)
    subprocess.run("-d '{\"path\":\"$TEST_FILE\",\"content\":\"test\",\"type\":\"file\"}' | grep -q 'success'"", shell=True)
    # Read test file
    subprocess.run("test_condition "Read file via API" "curl -s 'http://localhost:3457/api/files/read?path=$TEST_FILE' | grep -q 'test'"", shell=True)
    # Delete test file
    subprocess.run("test_condition "Delete file via API" "curl -s -X DELETE 'http://localhost:3457/api/files/delete?path=$TEST_FILE' | grep -q 'success'"", shell=True)
    print("")
    print("8. Checking Documentation")
    print("------------------------")
    subprocess.run("test_condition "README.md exists" "[[ -f README.md ]]"", shell=True)
    subprocess.run("test_condition "DEPLOYMENT.md exists" "[[ -f DEPLOYMENT.md ]]"", shell=True)
    subprocess.run("test_condition "API.md exists" "[[ -f API.md ]]"", shell=True)
    subprocess.run("test_condition "QUICK_START.md exists" "[[ -f QUICK_START.md ]]"", shell=True)
    print("")
    print("==================================")
    print("📊 Test Results")
    print("==================================")
    print("-e ")${GREEN}Passed: $TESTS_PASSED${NC}"
    print("-e ")${RED}Failed: $TESTS_FAILED${NC}"
    print("")
    if [ $TESTS_FAILED -eq 0 ]:; then
    print("-e ")${GREEN}🎉 All tests passed! AIIDE is properly set up.${NC}"
    print("")
    print("You can now access AIIDE at:")
    print("  • Frontend: http://localhost:5173")
    print("  • Backend API: http://localhost:3457")
    print("  • API Docs: http://localhost:3457/api-docs")
    sys.exit(0)
    else:
    print("-e ")${YELLOW}⚠️  Some tests failed. Please check the setup.${NC}"
    print("")
    print("Common fixes:")
    print("  • Run 'npm install' to install dependencies")
    print("  • Run 'npm start' to start services")
    print("  • Check .env file for API keys")
    print("  • Run 'npm run build' to create production build")
    sys.exit(1)

if __name__ == "__main__":
    main()