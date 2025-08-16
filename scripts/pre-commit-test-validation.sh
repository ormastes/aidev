#!/bin/bash

# Pre-commit hook for test validation
# Ensures tests can properly detect failures before committing

set -e

echo "🔍 Running pre-commit test validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we have test files in the commit
TEST_FILES=$(git diff --cached --name-only | grep -E '\.(test|spec)\.(ts|js)$' || true)

if [ -z "$TEST_FILES" ]; then
    echo "No test files in commit, skipping test validation"
    exit 0
fi

echo "Found test files in commit:"
echo "$TEST_FILES" | sed 's/^/  - /'

# Run validation tests first
echo -e "\n${YELLOW}Running validation tests...${NC}"
bunx jest test/validation/ --no-coverage --silent 2>&1 | tail -5

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Validation tests failed!${NC}"
    echo "Please fix validation tests before committing."
    exit 1
fi

# Check for common test anti-patterns
echo -e "\n${YELLOW}Checking for test anti-patterns...${NC}"

ISSUES_FOUND=0

for file in $TEST_FILES; do
    if [ -f "$file" ]; then
        # Check for tests without assertions
        if grep -q "^\s*it\|test\|describe" "$file" && ! grep -q "expect\|assert" "$file"; then
            echo -e "${RED}⚠ Warning: $file may have tests without assertions${NC}"
            ISSUES_FOUND=1
        fi
        
        # Check for commented out tests
        if grep -q "^\s*//\s*it\|^\s*//\s*test\|^\s*//\s*describe" "$file"; then
            echo -e "${YELLOW}⚠ Note: $file has commented out tests${NC}"
        fi
        
        # Check for .only() which shouldn't be committed
        if grep -q "\.only\s*(" "$file"; then
            echo -e "${RED}❌ Error: $file contains .only() - remove before committing${NC}"
            ISSUES_FOUND=1
        fi
        
        # Check for console.log in tests
        if grep -q "console\.log" "$file"; then
            echo -e "${YELLOW}⚠ Note: $file contains console.log statements${NC}"
        fi
    fi
done

if [ $ISSUES_FOUND -eq 1 ]; then
    echo -e "\n${RED}❌ Test validation failed due to anti-patterns${NC}"
    echo "Please fix the issues above before committing."
    exit 1
fi

# Run affected tests
echo -e "\n${YELLOW}Running affected tests...${NC}"

# Get list of test files that correspond to changed source files
SOURCE_FILES=$(git diff --cached --name-only | grep -E '\.(ts|js)$' | grep -v test | grep -v spec || true)

if [ ! -z "$SOURCE_FILES" ]; then
    # Find corresponding test files
    TEST_PATTERNS=""
    for src in $SOURCE_FILES; do
        # Convert source path to test path
        TEST_PATH=$(echo "$src" | sed 's/\.ts$/.test.ts/' | sed 's/\.js$/.test.js/')
        if [ -f "$TEST_PATH" ]; then
            TEST_PATTERNS="$TEST_PATTERNS $TEST_PATH"
        fi
        
        # Also check in tests directory
        BASENAME=$(basename "$src" | sed 's/\.ts$//' | sed 's/\.js$//')
        POSSIBLE_TESTS=$(find . -name "*${BASENAME}*.test.*" -o -name "*${BASENAME}*.spec.*" 2>/dev/null | head -5)
        if [ ! -z "$POSSIBLE_TESTS" ]; then
            TEST_PATTERNS="$TEST_PATTERNS $POSSIBLE_TESTS"
        fi
    done
    
    if [ ! -z "$TEST_PATTERNS" ]; then
        echo "Running tests for modified source files..."
        bunx jest $TEST_PATTERNS --no-coverage --passWithNoTests 2>&1 | grep -E "PASS|FAIL|Tests:" | head -20
        
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            echo -e "${RED}❌ Tests failed for modified files${NC}"
            echo "Please fix failing tests before committing."
            exit 1
        fi
    fi
fi

echo -e "\n${GREEN}✅ All test validations passed!${NC}"
echo "Tests are properly configured to detect failures."

exit 0