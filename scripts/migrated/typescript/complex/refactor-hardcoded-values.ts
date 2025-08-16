#!/usr/bin/env bun
/**
 * Migrated from: refactor-hardcoded-values.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.770Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🔧 Refactoring Hardcoded Values");
  console.log("================================");
  console.log("");
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m' # No Color`;
  // Counter for changes
  await $`CHANGES=0`;
  console.log("📋 This script will help identify and update hardcoded values.");
  console.log("   It will NOT automatically modify files, but show what needs updating.");
  console.log("");
  // Function to check file for hardcoded values
  await $`check_file() {`;
  await $`local file=$1`;
  await $`local found=false`;
  // Check for hardcoded ports
  await $`if grep -q "3456\|3457\|3410\|3400\|3401" "$file" 2>/dev/null; then`;
  await $`found=true`;
  }
  // Check for hardcoded localhost
  await $`if grep -q "localhost:[0-9]\+" "$file" 2>/dev/null; then`;
  await $`found=true`;
  }
  if ("$found" = true ) {; then
  console.log("-e ");${YELLOW}⚠️  $file${NC}"
  await $`CHANGES=$((CHANGES + 1))`;
  // Show the lines with issues
  await $`grep -n "3456\|3457\|3410\|3400\|3401\|localhost:[0-9]\+" "$file" 2>/dev/null | head -3`;
  console.log("");
  }
  await $`}`;
  console.log("🔍 Checking TypeScript files...");
  console.log("-------------------------------");
  for (const file of [$(find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" 2>/dev/null); do]) {
  await $`check_file "$file"`;
  }
  console.log("🔍 Checking JavaScript files...");
  console.log("-------------------------------");
  for (const file of [$(find . -name "*.js" -not -path "./node_modules/*" -not -path "./dist/*" 2>/dev/null); do]) {
  await $`check_file "$file"`;
  }
  console.log("🔍 Checking Shell scripts...");
  console.log("----------------------------");
  for (const file of [$(find . -name "*.sh" -not -path "./node_modules/*" 2>/dev/null); do]) {
  await $`check_file "$file"`;
  }
  console.log("");
  console.log("================================");
  console.log("📊 Summary");
  console.log("================================");
  console.log("-e ");Found ${YELLOW}$CHANGES${NC} files with hardcoded values"
  console.log("");
  if ($CHANGES -gt 0 ) {; then
  console.log("📝 Recommended Actions:");
  console.log("------------------------");
  console.log("1. Update server files to use config/app.config.ts");
  console.log("2. Update test files to use test/helpers/test-config.ts");
  console.log("3. Use environment variables from .env file");
  console.log("4. Replace hardcoded URLs with dynamic values");
  console.log("");
  console.log("Example replacements:");
  console.log("  Before: const PORT = 3456;");
  console.log("  After:  const PORT = AppConfig.APP_PORT;");
  console.log("");
  console.log("  Before: const BASE_URL = 'http://localhost:3456';");
  console.log("  After:  const BASE_URL = getBaseUrl();");
  console.log("");
  console.log("📄 Configuration files created:");
  console.log("  - config/app.config.ts (central configuration)");
  console.log("  - test/helpers/test-config.ts (test configuration)");
  console.log("  - .env.example (environment variables template)");
  } else {
  console.log("-e ");${GREEN}✅ No hardcoded values found!${NC}"
  }
  console.log("");
  console.log("🔒 Security Note:");
  console.log("-----------------");
  console.log("Hardcoded values can expose your application to security risks:");
  console.log("- Makes port scanning easier for attackers");
  console.log("- Prevents proper environment separation");
  console.log("- Can leak internal architecture details");
  console.log("");
  console.log("Always use configuration files and environment variables!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}