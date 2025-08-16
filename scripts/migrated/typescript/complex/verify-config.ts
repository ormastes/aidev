#!/usr/bin/env bun
/**
 * Migrated from: verify-config.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.733Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // TypeScript Configuration Verification Script
  // This script verifies that TypeScript strict mode is properly configured
  await $`set -euo pipefail`;
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="${1:-$(pwd)}"`;
  console.log("🔍 TypeScript Configuration Verification");
  console.log("=======================================");
  console.log("Project: $PROJECT_ROOT");
  console.log("");
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Check if tsconfig.json exists
  if (! -f "$PROJECT_ROOT/tsconfig.json" ) {; then
  console.log("-e ");${RED}❌ No tsconfig.json found${NC}"
  process.exit(1);
  }
  console.log("-e ");${GREEN}✓ tsconfig.json found${NC}"
  // Check TypeScript version
  console.log("");
  console.log("📦 TypeScript Version:");
  await $`if command -v tsc &> /dev/null; then`;
  await $`tsc --version`;
  } else {
  console.log("-e ");${YELLOW}⚠️  TypeScript not found globally, checking local installation...${NC}"
  if (-f "$PROJECT_ROOT/node_modules/.bin/tsc" ) {; then
  await $`"$PROJECT_ROOT/node_modules/.bin/tsc" --version`;
  } else {
  console.log("-e ");${RED}❌ TypeScript not installed${NC}"
  process.exit(1);
  }
  }
  // Extract and verify strict mode settings
  console.log("");
  console.log("🔒 Strict Mode Settings:");
  await $`check_setting() {`;
  await $`local setting=$1`;
  await $`local expected=${2:-true}`;
  // Extract the setting value from tsconfig.json
  await $`local value=$(node -p "`;
  await $`const fs = require('fs');`;
  await $`const content = fs.readFileSync('$PROJECT_ROOT/tsconfig.json', 'utf8');`;
  await $`const json = JSON.parse(content.replace(/\\/\\*[\\s\\S]*?\\*\\/|\\/\\/.*/g, ''));`;
  await $`const value = json.compilerOptions && json.compilerOptions['$setting'];`;
  await $`value === undefined ? 'not set' : value;`;
  await $`" 2>/dev/null || echo "error")`;
  if ("$value" = "$expected" ) {; then
  console.log("-e ");${GREEN}✓ $setting: $value${NC}"
  await $`elif [ "$value" = "not set" ]; then`;
  console.log("-e ");${YELLOW}⚠️  $setting: not set (defaults may apply)${NC}"
  } else {
  console.log("-e ");${RED}❌ $setting: $value (expected: $expected)${NC}"
  }
  await $`}`;
  // Check all strict mode flags
  await $`check_setting "strict"`;
  await $`check_setting "noImplicitAny"`;
  await $`check_setting "strictNullChecks"`;
  await $`check_setting "strictFunctionTypes"`;
  await $`check_setting "strictBindCallApply"`;
  await $`check_setting "strictPropertyInitialization"`;
  await $`check_setting "noImplicitThis"`;
  await $`check_setting "useUnknownInCatchVariables"`;
  await $`check_setting "alwaysStrict"`;
  await $`check_setting "noUnusedLocals"`;
  await $`check_setting "noUnusedParameters"`;
  await $`check_setting "exactOptionalPropertyTypes" "false"  # Often false for easier migration`;
  await $`check_setting "noImplicitReturns"`;
  await $`check_setting "noFallthroughCasesInSwitch"`;
  await $`check_setting "noUncheckedIndexedAccess"`;
  await $`check_setting "noImplicitOverride"`;
  await $`check_setting "noPropertyAccessFromIndexSignature"`;
  // Run type checking
  console.log("");
  console.log("🏃 Running Type Check:");
  if (-f "$PROJECT_ROOT/node_modules/.bin/tsc" ) {; then
  await $`TSC="$PROJECT_ROOT/node_modules/.bin/tsc"`;
  } else {
  await $`TSC="tsc"`;
  }
  process.chdir(""$PROJECT_ROOT"");
  // Count errors
  await $`ERROR_COUNT=0`;
  await $`if $TSC --noEmit --pretty false 2>&1 | tee /tmp/tsc-output.txt; then`;
  console.log("-e ");${GREEN}✓ No type errors found!${NC}"
  } else {
  await $`ERROR_COUNT=$(cat /tmp/tsc-output.txt | grep -E "error TS[0-9]+" | wc -l || echo "0")`;
  console.log("-e ");${RED}❌ Found $ERROR_COUNT type errors${NC}"
  }
  // Categorize errors if any
  if ("$ERROR_COUNT" -gt 0 ) {; then
  console.log("");
  console.log("📊 Error Categories:");
  await $`count_errors() {`;
  await $`local pattern=$1`;
  await $`local description=$2`;
  await $`local count=$(grep -c "$pattern" /tmp/tsc-output.txt || echo "0")`;
  if ("$count" -gt 0 ) {; then
  console.log("  - $description: $count");
  }
  await $`}`;
  await $`count_errors "TS7006" "Implicit any"`;
  await $`count_errors "TS2531\\|TS2532" "Possibly null or undefined"`;
  await $`count_errors "TS6133" "Unused variable"`;
  await $`count_errors "TS2339" "Property does not exist"`;
  await $`count_errors "TS2366" "Function lacks ending return"`;
  await $`count_errors "TS2345" "Argument type mismatch"`;
  }
  // Check for ESLint configuration
  console.log("");
  console.log("🔧 Linting Configuration:");
  if (-f "$PROJECT_ROOT/.eslintrc.json" ] || [ -f "$PROJECT_ROOT/.eslintrc.js" ) {; then
  console.log("-e ");${GREEN}✓ ESLint configuration found${NC}"
  // Check for TypeScript ESLint plugin
  await $`if grep -q "@typescript-eslint" "$PROJECT_ROOT/package.json" 2>/dev/null; then`;
  console.log("-e ");${GREEN}✓ TypeScript ESLint plugin installed${NC}"
  } else {
  console.log("-e ");${YELLOW}⚠️  TypeScript ESLint plugin not found in package.json${NC}"
  }
  } else {
  console.log("-e ");${YELLOW}⚠️  No ESLint configuration found${NC}"
  }
  // Check build scripts
  console.log("");
  console.log("📜 Build Scripts:");
  await $`check_script() {`;
  await $`local script=$1`;
  await $`if grep -q "\"$script\":" "$PROJECT_ROOT/package.json" 2>/dev/null; then`;
  console.log("-e ");${GREEN}✓ $script script found${NC}"
  } else {
  console.log("-e ");${YELLOW}⚠️  $script script not found${NC}"
  }
  await $`}`;
  await $`check_script "typecheck"`;
  await $`check_script "build"`;
  await $`check_script "lint"`;
  // Summary
  console.log("");
  console.log("📋 Summary:");
  console.log("==========");
  if ("$ERROR_COUNT" -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ TypeScript strict mode is properly configured!${NC}"
  console.log("Your project is ready for type-safe development.");
  } else {
  console.log("-e ");${YELLOW}⚠️  TypeScript strict mode is configured but there are $ERROR_COUNT errors to fix.${NC}"
  console.log("Run 'npm run typecheck' to see all errors.");
  console.log("Consider using the migration script: scripts/migrate-to-strict.ts");
  }
  // Clean up
  await $`rm -f /tmp/tsc-output.txt`;
  process.exit(0);
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}