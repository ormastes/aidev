#!/usr/bin/env bun
/**
 * Migrated from: fix-test-credentials.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.607Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🔐 Fixing hardcoded credentials in test files...");
  console.log("=============================================");
  // Count initial violations
  await $`INITIAL_COUNT=$(grep -r "'admin'\\|'demo123'\\|'tester'\\|'test123'" test --include="*.spec.ts" --include="*.js" | wc -l)`;
  console.log("Found $INITIAL_COUNT hardcoded credential references");
  // Fix TypeScript test files
  for (const file of [test/**/*.spec.ts test/*.spec.ts; do]) {
  if (-f "$file" ) {; then
  console.log("Processing: $file");
  // Check if file already imports credentials
  await $`if ! grep -q "getTestCredentials" "$file"; then`;
  // Add import if TestPortManager is already imported
  await $`if grep -q "import.*TestPortManager.*from.*infra_test-as-manual" "$file"; then`;
  await $`sed -i "s/import { TestPortManager/import { TestPortManager, getTestCredentials/g" "$file"`;
  }
  }
  // Replace hardcoded admin credentials
  await $`sed -i "s/await page\.fill('#username', 'admin');/const adminCreds = getTestCredentials('admin');\n    await page.fill('#username', adminCreds.username);/g" "$file"`;
  await $`sed -i "s/await page\.fill('#password', 'demo123');/await page.fill('#password', adminCreds.password);/g" "$file"`;
  // Replace inline admin credentials
  await $`sed -i "s/'admin'/'adminCreds.username'/g" "$file" 2>/dev/null || true`;
  await $`sed -i "s/'demo123'/'adminCreds.password'/g" "$file" 2>/dev/null || true`;
  // Replace hardcoded tester credentials
  await $`sed -i "s/await page\.fill('#username', 'tester');/const userCreds = getTestCredentials('user');\n    await page.fill('#username', userCreds.username);/g" "$file"`;
  await $`sed -i "s/await page\.fill('#password', 'test123');/await page.fill('#password', userCreds.password);/g" "$file"`;
  }
  }
  // Fix JavaScript test files
  for (const file of [test-*.js; do]) {
  if (-f "$file" ) {; then
  console.log("Processing: $file");
  // Add credential import if not present
  await $`if ! grep -q "getTestCredentials" "$file"; then`;
  await $`if grep -q "TestPortManager" "$file"; then`;
  await $`sed -i "s/const { TestPortManager }/const { TestPortManager, getTestCredentials }/g" "$file"`;
  }
  }
  // Replace hardcoded credentials in JS files
  await $`sed -i "s/username: 'admin'/username: getTestCredentials('admin').username/g" "$file"`;
  await $`sed -i "s/password: 'demo123'/password: getTestCredentials('admin').password/g" "$file"`;
  await $`sed -i "s/username: 'tester'/username: getTestCredentials('user').username/g" "$file"`;
  await $`sed -i "s/password: 'test123'/password: getTestCredentials('user').password/g" "$file"`;
  }
  }
  // Count remaining violations
  await $`FINAL_COUNT=$(grep -r "'admin'\\|'demo123'\\|'tester'\\|'test123'" test --include="*.spec.ts" --include="*.js" 2>/dev/null | wc -l)`;
  console.log("");
  console.log("=============================================");
  console.log("✅ Credential fixing complete!");
  console.log("   Initial violations: $INITIAL_COUNT");
  console.log("   Remaining violations: $FINAL_COUNT");
  console.log("   Fixed: $((INITIAL_COUNT - FINAL_COUNT)) references");
  if ("$FINAL_COUNT" -gt 0 ) {; then
  console.log("");
  console.log("⚠️  Some hardcoded credentials remain. Manual review needed for:");
  await $`grep -r "'admin'\\|'demo123'\\|'tester'\\|'test123'" test --include="*.spec.ts" --include="*.js" 2>/dev/null | cut -d: -f1 | sort -u`;
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}