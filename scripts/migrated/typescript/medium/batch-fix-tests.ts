#!/usr/bin/env bun
/**
 * Migrated from: batch-fix-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.614Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🔧 Batch fixing all test files to use TestPortManager");
  console.log("=====================================================");
  console.log("");
  // List of test files that need fixing
  await $`TEST_FILES=(`;
  await $`"test/system/accessibility-system.spec.ts"`;
  await $`"test/system/cross-browser-compatibility.spec.ts"`;
  await $`"test/system/data-import-export-system.spec.ts"`;
  await $`"test/system/embedded-apps-simple.spec.ts"`;
  await $`"test/system/file-management.spec.ts"`;
  await $`"test/system/mcp-integration-system.spec.ts"`;
  await $`"test/system/notifications.spec.ts"`;
  await $`"test/system/performance-load-testing.spec.ts"`;
  await $`"test/system/portal-system-fixed.spec.ts"`;
  await $`"test/system/realtime-updates-system.spec.ts"`;
  await $`"test/system/release-deployment-system.spec.ts"`;
  await $`"test/system/security-advanced.spec.ts"`;
  await $`"test/system/web-comprehensive-system.spec.ts"`;
  await $`"test/deployment-tests.spec.ts"`;
  await $`"test/security-issues.spec.ts"`;
  await $`)`;
  for (const file of ["${TEST_FILES[@]}"; do]) {
  if (-f "$file" ) {; then
  console.log("Fixing: $file");
  // Check if file already has TestPortManager import
  await $`if ! grep -q "TestPortManager" "$file"; then`;
  // Add import at the beginning after playwright import
  await $`sed -i "/^import.*playwright/a import { TestPortManager } from '../../../../../portal_security/children/TestPortManager';" "$file"`;
  }
  // Replace hardcoded URLs with dynamic ones
  await $`sed -i "s/const PORTAL_URL = 'http:\/\/localhost:3456';/let PORTAL_URL: string;/g" "$file"`;
  await $`sed -i "s/const BASE_URL = 'http:\/\/localhost:3456';/let BASE_URL: string;/g" "$file"`;
  console.log("  ✅ Updated URL declarations");
  } else {
  console.log("  ❌ File not found: $file");
  }
  }
  console.log("");
  console.log("Note: Files need manual updates for beforeAll/afterAll hooks to allocate/release ports");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}