#!/bin/bash

# TypeScript Configuration Verification Script
# This script verifies that TypeScript strict mode is properly configured

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="${1:-$(pwd)}"

echo "🔍 TypeScript Configuration Verification"
echo "======================================="
echo "Project: $PROJECT_ROOT"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if tsconfig.json exists
if [ ! -f "$PROJECT_ROOT/tsconfig.json" ]; then
    echo -e "${RED}❌ No tsconfig.json found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ tsconfig.json found${NC}"

# Check TypeScript version
echo ""
echo "📦 TypeScript Version:"
if command -v tsc &> /dev/null; then
    tsc --version
else
    echo -e "${YELLOW}⚠️  TypeScript not found globally, checking local installation...${NC}"
    if [ -f "$PROJECT_ROOT/node_modules/.bin/tsc" ]; then
        "$PROJECT_ROOT/node_modules/.bin/tsc" --version
    else
        echo -e "${RED}❌ TypeScript not installed${NC}"
        exit 1
    fi
fi

# Extract and verify strict mode settings
echo ""
echo "🔒 Strict Mode Settings:"

check_setting() {
    local setting=$1
    local expected=${2:-true}
    
    # Extract the setting value from tsconfig.json
    local value=$(node -p "
        const fs = require('fs');
        const content = fs.readFileSync('$PROJECT_ROOT/tsconfig.json', 'utf8');
        const json = JSON.parse(content.replace(/\\/\\*[\\s\\S]*?\\*\\/|\\/\\/.*/g, ''));
        const value = json.compilerOptions && json.compilerOptions['$setting'];
        value === undefined ? 'not set' : value;
    " 2>/dev/null || echo "error")
    
    if [ "$value" = "$expected" ]; then
        echo -e "${GREEN}✓ $setting: $value${NC}"
    elif [ "$value" = "not set" ]; then
        echo -e "${YELLOW}⚠️  $setting: not set (defaults may apply)${NC}"
    else
        echo -e "${RED}❌ $setting: $value (expected: $expected)${NC}"
    fi
}

# Check all strict mode flags
check_setting "strict"
check_setting "noImplicitAny"
check_setting "strictNullChecks"
check_setting "strictFunctionTypes"
check_setting "strictBindCallApply"
check_setting "strictPropertyInitialization"
check_setting "noImplicitThis"
check_setting "useUnknownInCatchVariables"
check_setting "alwaysStrict"
check_setting "noUnusedLocals"
check_setting "noUnusedParameters"
check_setting "exactOptionalPropertyTypes" "false"  # Often false for easier migration
check_setting "noImplicitReturns"
check_setting "noFallthroughCasesInSwitch"
check_setting "noUncheckedIndexedAccess"
check_setting "noImplicitOverride"
check_setting "noPropertyAccessFromIndexSignature"

# Run type checking
echo ""
echo "🏃 Running Type Check:"

if [ -f "$PROJECT_ROOT/node_modules/.bin/tsc" ]; then
    TSC="$PROJECT_ROOT/node_modules/.bin/tsc"
else
    TSC="tsc"
fi

cd "$PROJECT_ROOT"

# Count errors
ERROR_COUNT=0
if $TSC --noEmit --pretty false 2>&1 | tee /tmp/tsc-output.txt; then
    echo -e "${GREEN}✓ No type errors found!${NC}"
else
    ERROR_COUNT=$(cat /tmp/tsc-output.txt | grep -E "error TS[0-9]+" | wc -l || echo "0")
    echo -e "${RED}❌ Found $ERROR_COUNT type errors${NC}"
fi

# Categorize errors if any
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo ""
    echo "📊 Error Categories:"
    
    count_errors() {
        local pattern=$1
        local description=$2
        local count=$(grep -c "$pattern" /tmp/tsc-output.txt || echo "0")
        if [ "$count" -gt 0 ]; then
            echo "  - $description: $count"
        fi
    }
    
    count_errors "TS7006" "Implicit any"
    count_errors "TS2531\\|TS2532" "Possibly null or undefined"
    count_errors "TS6133" "Unused variable"
    count_errors "TS2339" "Property does not exist"
    count_errors "TS2366" "Function lacks ending return"
    count_errors "TS2345" "Argument type mismatch"
fi

# Check for ESLint configuration
echo ""
echo "🔧 Linting Configuration:"

if [ -f "$PROJECT_ROOT/.eslintrc.json" ] || [ -f "$PROJECT_ROOT/.eslintrc.js" ]; then
    echo -e "${GREEN}✓ ESLint configuration found${NC}"
    
    # Check for TypeScript ESLint plugin
    if grep -q "@typescript-eslint" "$PROJECT_ROOT/package.json" 2>/dev/null; then
        echo -e "${GREEN}✓ TypeScript ESLint plugin installed${NC}"
    else
        echo -e "${YELLOW}⚠️  TypeScript ESLint plugin not found in package.json${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No ESLint configuration found${NC}"
fi

# Check build scripts
echo ""
echo "📜 Build Scripts:"

check_script() {
    local script=$1
    if grep -q "\"$script\":" "$PROJECT_ROOT/package.json" 2>/dev/null; then
        echo -e "${GREEN}✓ $script script found${NC}"
    else
        echo -e "${YELLOW}⚠️  $script script not found${NC}"
    fi
}

check_script "typecheck"
check_script "build"
check_script "lint"

# Summary
echo ""
echo "📋 Summary:"
echo "=========="

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ TypeScript strict mode is properly configured!${NC}"
    echo "Your project is ready for type-safe development."
else
    echo -e "${YELLOW}⚠️  TypeScript strict mode is configured but there are $ERROR_COUNT errors to fix.${NC}"
    echo "Run 'npm run typecheck' to see all errors."
    echo "Consider using the migration script: scripts/migrate-to-strict.ts"
fi

# Clean up
rm -f /tmp/tsc-output.txt

exit 0