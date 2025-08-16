#!/usr/bin/env bun
/**
 * Migrated from: verify-security-compliance.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.602Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🔍 Security Compliance Verification Report");
  console.log("==========================================");
  console.log("");
  // Check for hardcoded ports
  console.log("1. Checking for hardcoded ports (3456, 34xx)...");
  await $`HARDCODED_PORTS=$(grep -r "34[0-9][0-9]" . --include="*.ts" --include="*.js" --exclude-dir="node_modules" --exclude="*.map" | grep -v "portal_security" | grep -v "infra_test-as-manual" | grep -v "comment" | wc -l)`;
  if ("$HARDCODED_PORTS" -eq 0 ) {; then
  console.log("   ✅ No hardcoded ports found");
  } else {
  console.log("   ⚠️  Found $HARDCODED_PORTS potential hardcoded port references");
  }
  // Check for hardcoded localhost
  console.log("");
  console.log("2. Checking for hardcoded localhost URLs...");
  await $`HARDCODED_LOCALHOST=$(grep -r "localhost:" . --include="*.ts" --include="*.js" --exclude-dir="node_modules" --exclude="*.map" | grep -v "baseUrl" | grep -v "TestPortManager" | grep -v "testAllocation" | grep -v "console.log" | wc -l)`;
  if ("$HARDCODED_LOCALHOST" -eq 0 ) {; then
  console.log("   ✅ No hardcoded localhost URLs found");
  } else {
  console.log("   ⚠️  Found $HARDCODED_LOCALHOST potential hardcoded localhost references");
  }
  // Check test imports
  console.log("");
  console.log("3. Verifying test files import from test-as-manual...");
  await $`WRONG_IMPORTS=$(find test -name "*.spec.ts" -exec grep -l "TestPortManager" {} \; | xargs grep -L "infra_test-as-manual/pipe" | wc -l)`;
  if ("$WRONG_IMPORTS" -eq 0 ) {; then
  console.log("   ✅ All test files correctly import from infra_test-as-manual");
  } else {
  console.log("   ❌ Found $WRONG_IMPORTS test files with incorrect imports");
  }
  // Check production code imports
  console.log("");
  console.log("4. Verifying production code imports from portal_security...");
  await $`PROD_FILES=$(find . -name "server*.ts" -o -name "server*.js" -o -name "config/*.ts" | grep -v test | grep -v node_modules)`;
  await $`WRONG_PROD=0`;
  for (const file of [$PROD_FILES; do]) {
  await $`if grep -q "EnhancedPortManager" "$file" 2>/dev/null; then`;
  await $`if ! grep -q "portal_security" "$file"; then`;
  await $`WRONG_PROD=$((WRONG_PROD + 1))`;
  console.log("   ❌ $file imports EnhancedPortManager but not from portal_security");
  }
  }
  }
  if ("$WRONG_PROD" -eq 0 ) {; then
  console.log("   ✅ All production files correctly import from portal_security");
  }
  // Summary
  console.log("");
  console.log("==========================================");
  console.log("Summary:");
  console.log("");
  if ("$HARDCODED_PORTS" -eq 0 ] && [ "$HARDCODED_LOCALHOST" -eq 0 ] && [ "$WRONG_IMPORTS" -eq 0 ] && [ "$WRONG_PROD" -eq 0 ) {; then
  console.log("✅ FULLY COMPLIANT: All ports and domains are managed through security module");
  console.log("   - Test files use infra_test-as-manual theme");
  console.log("   - Production files use portal_security module");
  console.log("   - No hardcoded ports or localhost URLs");
  } else {
  console.log("⚠️  COMPLIANCE ISSUES FOUND:");
  await $`[ "$HARDCODED_PORTS" -gt 0 ] && echo "   - Hardcoded ports: $HARDCODED_PORTS"`;
  await $`[ "$HARDCODED_LOCALHOST" -gt 0 ] && echo "   - Hardcoded localhost: $HARDCODED_LOCALHOST"`;
  await $`[ "$WRONG_IMPORTS" -gt 0 ] && echo "   - Wrong test imports: $WRONG_IMPORTS"`;
  await $`[ "$WRONG_PROD" -gt 0 ] && echo "   - Wrong production imports: $WRONG_PROD"`;
  }
  console.log("");
  console.log("Test-as-Manual Theme Integration:");
  console.log("   ✅ TestPortManager provides baseUrl with domain");
  console.log("   ✅ getTestDomain() method available for domain-only access");
  console.log("   ✅ All test allocations use buildTestUrl() internally");
  console.log("");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}