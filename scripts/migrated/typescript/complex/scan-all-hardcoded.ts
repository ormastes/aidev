#!/usr/bin/env bun
/**
 * Migrated from: scan-all-hardcoded.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.763Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("=== COMPLETE SCAN: ALL Hardcoded Ports/Localhost Outside Security Theme ===");
  console.log("============================================================");
  console.log("");
  // Colors
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m'`;
  console.log("📊 Scanning entire codebase for hardcoded network references...");
  console.log("");
  // Count total violations
  await $`TOTAL_TS=$(find . -name "*.ts" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/portal_security/*" -exec grep -l "localhost:[0-9]\|:3[0-9][0-9][0-9]\|:4[0-9][0-9][0-9]\|:5[0-9][0-9][0-9]\|:8[0-9][0-9][0-9]" {} \; 2>/dev/null | wc -l)`;
  await $`TOTAL_JS=$(find . -name "*.js" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/portal_security/*" -exec grep -l "localhost:[0-9]\|:3[0-9][0-9][0-9]\|:4[0-9][0-9][0-9]\|:5[0-9][0-9][0-9]\|:8[0-9][0-9][0-9]" {} \; 2>/dev/null | wc -l)`;
  console.log("-e ");${YELLOW}Total TypeScript files with hardcoded ports:${NC} $TOTAL_TS"
  console.log("-e ");${YELLOW}Total JavaScript files with hardcoded ports:${NC} $TOTAL_JS"
  console.log("");
  console.log("-e ");${RED}❌ VIOLATIONS - Files with hardcoded ports NOT using security module:${NC}"
  console.log("==================================================================");
  console.log("");
  console.log("Test Files:");
  console.log("-----------");
  for (const file of [test/system/*.spec.ts test/*.spec.ts; do]) {
  if (-f "$file" ) {; then
  await $`if grep -q "localhost:[0-9]\|3456\|3457\|3410\|3458" "$file" 2>/dev/null; then`;
  await $`if ! grep -q "TestPortManager" "$file" 2>/dev/null; then`;
  console.log("-e ");${RED}❌${NC} $(basename $file)"
  await $`grep "localhost:[0-9]\|3456\|3457\|3410" "$file" 2>/dev/null | head -1 | sed 's/^/     /'`;
  }
  }
  }
  }
  console.log("");
  console.log("JavaScript Files:");
  console.log("-----------------");
  for (const file of [*.js test/*.js; do]) {
  if (-f "$file" ] && [ "$file" != "server.js" ) {; then
  await $`if grep -q "localhost:[0-9]\|3456\|3457" "$file" 2>/dev/null; then`;
  console.log("-e ");${RED}❌${NC} $file"
  await $`grep "localhost:[0-9]\|3456" "$file" 2>/dev/null | head -1 | sed 's/^/     /'`;
  }
  }
  }
  console.log("");
  console.log("Configuration/Helper Files:");
  console.log("---------------------------");
  for (const file of [test/helpers/test-config.ts features/step_definitions/portal_steps.ts run-system-tests.ts; do]) {
  if (-f "$file" ) {; then
  await $`if grep -q "3456\|3457\|3410\|localhost:[0-9]" "$file" 2>/dev/null; then`;
  await $`if ! grep -q "TestPortManager\|EnhancedPortManager" "$file" 2>/dev/null; then`;
  console.log("-e ");${RED}❌${NC} $file"
  await $`grep "3456\|3457\|localhost:[0-9]" "$file" 2>/dev/null | head -1 | sed 's/^/     /'`;
  }
  }
  }
  }
  console.log("");
  console.log("-e ");${GREEN}✅ COMPLIANT - Files properly using security module:${NC}"
  console.log("====================================================");
  for (const file of [server.ts server.js server-postgres.ts config/app.config.ts playwright.config.ts; do]) {
  if (-f "$file" ) {; then
  await $`if grep -q "EnhancedPortManager\|TestPortManager" "$file" 2>/dev/null; then`;
  console.log("-e ");${GREEN}✅${NC} $file"
  }
  }
  }
  console.log("");
  console.log("📋 Other Hardcoded Network References:");
  console.log("--------------------------------------");
  // Check for IP addresses
  console.log("");
  console.log("IP Addresses found:");
  await $`grep -r "127\.0\.0\.1\|192\.168\|10\.0\.\|172\.\|0\.0\.0\.0" . \`;
  await $`--include="*.ts" --include="*.js" --include="*.json" \`;
  await $`--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \`;
  await $`--exclude-dir=portal_security 2>/dev/null | head -5`;
  // Check for other common ports
  console.log("");
  console.log("Other common ports (8080, 8000, 5000, etc.):");
  await $`grep -r ":8080\|:8000\|:5000\|:4200\|:4000\|:9000" . \`;
  await $`--include="*.ts" --include="*.js" \`;
  await $`--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \`;
  await $`--exclude-dir=portal_security 2>/dev/null | head -5`;
  console.log("");
  console.log("==================================================================");
  console.log("-e ");${YELLOW}📊 SUMMARY${NC}"
  console.log("==================================================================");
  console.log("");
  await $`VIOLATIONS=$(find . \( -name "*.ts" -o -name "*.js" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/portal_security/*" -exec grep -l "localhost:[0-9]\|3456\|3457\|3410" {} \; 2>/dev/null | while read file; do`;
  await $`if ! grep -q "TestPortManager\|EnhancedPortManager" "$file" 2>/dev/null; then`;
  console.log("$file");
  }
  await $`done | wc -l)`;
  await $`COMPLIANT=$(find . \( -name "*.ts" -o -name "*.js" \) ! -path "*/node_modules/*" ! -path "*/dist/*" -exec grep -l "TestPortManager\|EnhancedPortManager" {} \; 2>/dev/null | wc -l)`;
  console.log("-e ");Total files with violations: ${RED}$VIOLATIONS${NC}"
  console.log("-e ");Total compliant files: ${GREEN}$COMPLIANT${NC}"
  if ($VIOLATIONS -gt 0 ) {; then
  console.log("");
  console.log("-e ");${RED}⚠️  WARNING: $VIOLATIONS files still have hardcoded ports/localhost!${NC}"
  console.log("-e ");${YELLOW}All ports and domains MUST go through the security module.${NC}"
  } else {
  console.log("");
  console.log("-e ");${GREEN}✅ EXCELLENT! No hardcoded ports found outside security module!${NC}"
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}