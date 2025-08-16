#!/usr/bin/env python3
"""
Migrated from: pre-commit-test-validation.sh
Auto-generated Python - 2025-08-16T04:57:27.775Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Pre-commit hook for test validation
    # Ensures tests can properly detect failures before committing
    subprocess.run("set -e", shell=True)
    print("🔍 Running pre-commit test validation...")
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Check if we have test files in the commit
    subprocess.run("TEST_FILES=$(git diff --cached --name-only | grep -E '\.(test|spec)\.(ts|js)$' || true)", shell=True)
    if -z "$TEST_FILES" :; then
    print("No test files in commit, skipping test validation")
    sys.exit(0)
    print("Found test files in commit:")
    print("$TEST_FILES") | sed 's/^/  - /'
    # Run validation tests first
    print("-e ")\n${YELLOW}Running validation tests...${NC}"
    subprocess.run("bunx jest test/validation/ --no-coverage --silent 2>&1 | tail -5", shell=True)
    if $? -ne 0 :; then
    print("-e ")${RED}❌ Validation tests failed!${NC}"
    print("Please fix validation tests before committing.")
    sys.exit(1)
    # Check for common test anti-patterns
    print("-e ")\n${YELLOW}Checking for test anti-patterns...${NC}"
    subprocess.run("ISSUES_FOUND=0", shell=True)
    for file in [$TEST_FILES; do]:
    if -f "$file" :; then
    # Check for tests without assertions
    subprocess.run("if grep -q "^\s*it\|test\|describe" "$file" && ! grep -q "expect\|assert" "$file"; then", shell=True)
    print("-e ")${RED}⚠ Warning: $file may have tests without assertions${NC}"
    subprocess.run("ISSUES_FOUND=1", shell=True)
    # Check for commented out tests
    subprocess.run("if grep -q "^\s*//\s*it\|^\s*//\s*test\|^\s*//\s*describe" "$file"; then", shell=True)
    print("-e ")${YELLOW}⚠ Note: $file has commented out tests${NC}"
    # Check for .only() which shouldn't be committed
    subprocess.run("if grep -q "\.only\s*(" "$file"; then", shell=True)
    print("-e ")${RED}❌ Error: $file contains .only() - remove before committing${NC}"
    subprocess.run("ISSUES_FOUND=1", shell=True)
    # Check for console.log in tests
    subprocess.run("if grep -q "console\.log" "$file"; then", shell=True)
    print("-e ")${YELLOW}⚠ Note: $file contains console.log statements${NC}"
    if $ISSUES_FOUND -eq 1 :; then
    print("-e ")\n${RED}❌ Test validation failed due to anti-patterns${NC}"
    print("Please fix the issues above before committing.")
    sys.exit(1)
    # Run affected tests
    print("-e ")\n${YELLOW}Running affected tests...${NC}"
    # Get list of test files that correspond to changed source files
    subprocess.run("SOURCE_FILES=$(git diff --cached --name-only | grep -E '\.(ts|js)$' | grep -v test | grep -v spec || true)", shell=True)
    if ! -z "$SOURCE_FILES" :; then
    # Find corresponding test files
    subprocess.run("TEST_PATTERNS=""", shell=True)
    for src in [$SOURCE_FILES; do]:
    # Convert source path to test path
    subprocess.run("TEST_PATH=$(echo "$src" | sed 's/\.ts$/.test.ts/' | sed 's/\.js$/.test.js/')", shell=True)
    if -f "$TEST_PATH" :; then
    subprocess.run("TEST_PATTERNS="$TEST_PATTERNS $TEST_PATH"", shell=True)
    # Also check in tests directory
    subprocess.run("BASENAME=$(basename "$src" | sed 's/\.ts$//' | sed 's/\.js$//')", shell=True)
    subprocess.run("POSSIBLE_TESTS=$(find . -name "*${BASENAME}*.test.*" -o -name "*${BASENAME}*.spec.*" 2>/dev/null | head -5)", shell=True)
    if ! -z "$POSSIBLE_TESTS" :; then
    subprocess.run("TEST_PATTERNS="$TEST_PATTERNS $POSSIBLE_TESTS"", shell=True)
    if ! -z "$TEST_PATTERNS" :; then
    print("Running tests for modified source files...")
    subprocess.run("bunx jest $TEST_PATTERNS --no-coverage --passWithNoTests 2>&1 | grep -E "PASS|FAIL|Tests:" | head -20", shell=True)
    if ${PIPESTATUS[0]} -ne 0 :; then
    print("-e ")${RED}❌ Tests failed for modified files${NC}"
    print("Please fix failing tests before committing.")
    sys.exit(1)
    print("-e ")\n${GREEN}✅ All test validations passed!${NC}"
    print("Tests are properly configured to detect failures.")
    sys.exit(0)

if __name__ == "__main__":
    main()