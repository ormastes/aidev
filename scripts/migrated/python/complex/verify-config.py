#!/usr/bin/env python3
"""
Migrated from: verify-config.sh
Auto-generated Python - 2025-08-16T04:57:27.734Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # TypeScript Configuration Verification Script
    # This script verifies that TypeScript strict mode is properly configured
    subprocess.run("set -euo pipefail", shell=True)
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="${1:-$(pwd)}"", shell=True)
    print("🔍 TypeScript Configuration Verification")
    print("=======================================")
    print("Project: $PROJECT_ROOT")
    print("")
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Check if tsconfig.json exists
    if ! -f "$PROJECT_ROOT/tsconfig.json" :; then
    print("-e ")${RED}❌ No tsconfig.json found${NC}"
    sys.exit(1)
    print("-e ")${GREEN}✓ tsconfig.json found${NC}"
    # Check TypeScript version
    print("")
    print("📦 TypeScript Version:")
    subprocess.run("if command -v tsc &> /dev/null; then", shell=True)
    subprocess.run("tsc --version", shell=True)
    else:
    print("-e ")${YELLOW}⚠️  TypeScript not found globally, checking local installation...${NC}"
    if -f "$PROJECT_ROOT/node_modules/.bin/tsc" :; then
    subprocess.run(""$PROJECT_ROOT/node_modules/.bin/tsc" --version", shell=True)
    else:
    print("-e ")${RED}❌ TypeScript not installed${NC}"
    sys.exit(1)
    # Extract and verify strict mode settings
    print("")
    print("🔒 Strict Mode Settings:")
    subprocess.run("check_setting() {", shell=True)
    subprocess.run("local setting=$1", shell=True)
    subprocess.run("local expected=${2:-true}", shell=True)
    # Extract the setting value from tsconfig.json
    subprocess.run("local value=$(node -p "", shell=True)
    subprocess.run("const fs = require('fs');", shell=True)
    subprocess.run("const content = fs.readFileSync('$PROJECT_ROOT/tsconfig.json', 'utf8');", shell=True)
    subprocess.run("const json = JSON.parse(content.replace(/\\/\\*[\\s\\S]*?\\*\\/|\\/\\/.*/g, ''));", shell=True)
    subprocess.run("const value = json.compilerOptions && json.compilerOptions['$setting'];", shell=True)
    subprocess.run("value === undefined ? 'not set' : value;", shell=True)
    subprocess.run("" 2>/dev/null || echo "error")", shell=True)
    if "$value" = "$expected" :; then
    print("-e ")${GREEN}✓ $setting: $value${NC}"
    elif "$value" = "not set" :; then
    print("-e ")${YELLOW}⚠️  $setting: not set (defaults may apply)${NC}"
    else:
    print("-e ")${RED}❌ $setting: $value (expected: $expected)${NC}"
    subprocess.run("}", shell=True)
    # Check all strict mode flags
    subprocess.run("check_setting "strict"", shell=True)
    subprocess.run("check_setting "noImplicitAny"", shell=True)
    subprocess.run("check_setting "strictNullChecks"", shell=True)
    subprocess.run("check_setting "strictFunctionTypes"", shell=True)
    subprocess.run("check_setting "strictBindCallApply"", shell=True)
    subprocess.run("check_setting "strictPropertyInitialization"", shell=True)
    subprocess.run("check_setting "noImplicitThis"", shell=True)
    subprocess.run("check_setting "useUnknownInCatchVariables"", shell=True)
    subprocess.run("check_setting "alwaysStrict"", shell=True)
    subprocess.run("check_setting "noUnusedLocals"", shell=True)
    subprocess.run("check_setting "noUnusedParameters"", shell=True)
    subprocess.run("check_setting "exactOptionalPropertyTypes" "false"  # Often false for easier migration", shell=True)
    subprocess.run("check_setting "noImplicitReturns"", shell=True)
    subprocess.run("check_setting "noFallthroughCasesInSwitch"", shell=True)
    subprocess.run("check_setting "noUncheckedIndexedAccess"", shell=True)
    subprocess.run("check_setting "noImplicitOverride"", shell=True)
    subprocess.run("check_setting "noPropertyAccessFromIndexSignature"", shell=True)
    # Run type checking
    print("")
    print("🏃 Running Type Check:")
    if -f "$PROJECT_ROOT/node_modules/.bin/tsc" :; then
    subprocess.run("TSC="$PROJECT_ROOT/node_modules/.bin/tsc"", shell=True)
    else:
    subprocess.run("TSC="tsc"", shell=True)
    os.chdir(""$PROJECT_ROOT"")
    # Count errors
    subprocess.run("ERROR_COUNT=0", shell=True)
    subprocess.run("if $TSC --noEmit --pretty false 2>&1 | tee /tmp/tsc-output.txt; then", shell=True)
    print("-e ")${GREEN}✓ No type errors found!${NC}"
    else:
    subprocess.run("ERROR_COUNT=$(cat /tmp/tsc-output.txt | grep -E "error TS[0-9]+" | wc -l || echo "0")", shell=True)
    print("-e ")${RED}❌ Found $ERROR_COUNT type errors${NC}"
    # Categorize errors if any
    if "$ERROR_COUNT" -gt 0 :; then
    print("")
    print("📊 Error Categories:")
    subprocess.run("count_errors() {", shell=True)
    subprocess.run("local pattern=$1", shell=True)
    subprocess.run("local description=$2", shell=True)
    subprocess.run("local count=$(grep -c "$pattern" /tmp/tsc-output.txt || echo "0")", shell=True)
    if "$count" -gt 0 :; then
    print("  - $description: $count")
    subprocess.run("}", shell=True)
    subprocess.run("count_errors "TS7006" "Implicit any"", shell=True)
    subprocess.run("count_errors "TS2531\\|TS2532" "Possibly null or undefined"", shell=True)
    subprocess.run("count_errors "TS6133" "Unused variable"", shell=True)
    subprocess.run("count_errors "TS2339" "Property does not exist"", shell=True)
    subprocess.run("count_errors "TS2366" "Function lacks ending return"", shell=True)
    subprocess.run("count_errors "TS2345" "Argument type mismatch"", shell=True)
    # Check for ESLint configuration
    print("")
    print("🔧 Linting Configuration:")
    if -f "$PROJECT_ROOT/.eslintrc.json" ] || [ -f "$PROJECT_ROOT/.eslintrc.js" :; then
    print("-e ")${GREEN}✓ ESLint configuration found${NC}"
    # Check for TypeScript ESLint plugin
    subprocess.run("if grep -q "@typescript-eslint" "$PROJECT_ROOT/package.json" 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}✓ TypeScript ESLint plugin installed${NC}"
    else:
    print("-e ")${YELLOW}⚠️  TypeScript ESLint plugin not found in package.json${NC}"
    else:
    print("-e ")${YELLOW}⚠️  No ESLint configuration found${NC}"
    # Check build scripts
    print("")
    print("📜 Build Scripts:")
    subprocess.run("check_script() {", shell=True)
    subprocess.run("local script=$1", shell=True)
    subprocess.run("if grep -q "\"$script\":" "$PROJECT_ROOT/package.json" 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}✓ $script script found${NC}"
    else:
    print("-e ")${YELLOW}⚠️  $script script not found${NC}"
    subprocess.run("}", shell=True)
    subprocess.run("check_script "typecheck"", shell=True)
    subprocess.run("check_script "build"", shell=True)
    subprocess.run("check_script "lint"", shell=True)
    # Summary
    print("")
    print("📋 Summary:")
    print("==========")
    if "$ERROR_COUNT" -eq 0 :; then
    print("-e ")${GREEN}✅ TypeScript strict mode is properly configured!${NC}"
    print("Your project is ready for type-safe development.")
    else:
    print("-e ")${YELLOW}⚠️  TypeScript strict mode is configured but there are $ERROR_COUNT errors to fix.${NC}"
    print("Run 'npm run typecheck' to see all errors.")
    print("Consider using the migration script: scripts/migrate-to-strict.ts")
    # Clean up
    subprocess.run("rm -f /tmp/tsc-output.txt", shell=True)
    sys.exit(0)

if __name__ == "__main__":
    main()