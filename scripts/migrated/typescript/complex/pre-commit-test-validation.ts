#!/usr/bin/env bun
/**
 * Migrated from: pre-commit-test-validation.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.774Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Pre-commit hook for test validation
  // Ensures tests can properly detect failures before committing
  await $`set -e`;
  console.log("🔍 Running pre-commit test validation...");
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Check if we have test files in the commit
  await $`TEST_FILES=$(git diff --cached --name-only | grep -E '\.(test|spec)\.(ts|js)$' || true)`;
  if (-z "$TEST_FILES" ) {; then
  console.log("No test files in commit, skipping test validation");
  process.exit(0);
  }
  console.log("Found test files in commit:");
  console.log("$TEST_FILES"); | sed 's/^/  - /'
  // Run validation tests first
  console.log("-e ");\n${YELLOW}Running validation tests...${NC}"
  await $`bunx jest test/validation/ --no-coverage --silent 2>&1 | tail -5`;
  if ($? -ne 0 ) {; then
  console.log("-e ");${RED}❌ Validation tests failed!${NC}"
  console.log("Please fix validation tests before committing.");
  process.exit(1);
  }
  // Check for common test anti-patterns
  console.log("-e ");\n${YELLOW}Checking for test anti-patterns...${NC}"
  await $`ISSUES_FOUND=0`;
  for (const file of [$TEST_FILES; do]) {
  if (-f "$file" ) {; then
  // Check for tests without assertions
  await $`if grep -q "^\s*it\|test\|describe" "$file" && ! grep -q "expect\|assert" "$file"; then`;
  console.log("-e ");${RED}⚠ Warning: $file may have tests without assertions${NC}"
  await $`ISSUES_FOUND=1`;
  }
  // Check for commented out tests
  await $`if grep -q "^\s*//\s*it\|^\s*//\s*test\|^\s*//\s*describe" "$file"; then`;
  console.log("-e ");${YELLOW}⚠ Note: $file has commented out tests${NC}"
  }
  // Check for .only() which shouldn't be committed
  await $`if grep -q "\.only\s*(" "$file"; then`;
  console.log("-e ");${RED}❌ Error: $file contains .only() - remove before committing${NC}"
  await $`ISSUES_FOUND=1`;
  }
  // Check for console.log in tests
  await $`if grep -q "console\.log" "$file"; then`;
  console.log("-e ");${YELLOW}⚠ Note: $file contains console.log statements${NC}"
  }
  }
  }
  if ($ISSUES_FOUND -eq 1 ) {; then
  console.log("-e ");\n${RED}❌ Test validation failed due to anti-patterns${NC}"
  console.log("Please fix the issues above before committing.");
  process.exit(1);
  }
  // Run affected tests
  console.log("-e ");\n${YELLOW}Running affected tests...${NC}"
  // Get list of test files that correspond to changed source files
  await $`SOURCE_FILES=$(git diff --cached --name-only | grep -E '\.(ts|js)$' | grep -v test | grep -v spec || true)`;
  if (! -z "$SOURCE_FILES" ) {; then
  // Find corresponding test files
  await $`TEST_PATTERNS=""`;
  for (const src of [$SOURCE_FILES; do]) {
  // Convert source path to test path
  await $`TEST_PATH=$(echo "$src" | sed 's/\.ts$/.test.ts/' | sed 's/\.js$/.test.js/')`;
  if (-f "$TEST_PATH" ) {; then
  await $`TEST_PATTERNS="$TEST_PATTERNS $TEST_PATH"`;
  }
  // Also check in tests directory
  await $`BASENAME=$(basename "$src" | sed 's/\.ts$//' | sed 's/\.js$//')`;
  await $`POSSIBLE_TESTS=$(find . -name "*${BASENAME}*.test.*" -o -name "*${BASENAME}*.spec.*" 2>/dev/null | head -5)`;
  if (! -z "$POSSIBLE_TESTS" ) {; then
  await $`TEST_PATTERNS="$TEST_PATTERNS $POSSIBLE_TESTS"`;
  }
  }
  if (! -z "$TEST_PATTERNS" ) {; then
  console.log("Running tests for modified source files...");
  await $`bunx jest $TEST_PATTERNS --no-coverage --passWithNoTests 2>&1 | grep -E "PASS|FAIL|Tests:" | head -20`;
  if (${PIPESTATUS[0]} -ne 0 ) {; then
  console.log("-e ");${RED}❌ Tests failed for modified files${NC}"
  console.log("Please fix failing tests before committing.");
  process.exit(1);
  }
  }
  }
  console.log("-e ");\n${GREEN}✅ All test validations passed!${NC}"
  console.log("Tests are properly configured to detect failures.");
  process.exit(0);
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}