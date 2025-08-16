#!/usr/bin/env bun
/**
 * Migrated from: fix-test-imports.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.600Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🔧 Updating all test files to use TestPortManager from infra_test-as-manual");
  console.log("==========================================================================");
  console.log("");
  // Files to update
  await $`FILES=(`;
  await $`"validate-test-security.ts"`;
  await $`"playwright.config.secure.ts"`;
  await $`"secure-test-runner.ts"`;
  await $`"playwright.config.ts"`;
  await $`"test/security-issues.spec.ts"`;
  await $`"test/deployment-tests.spec.ts"`;
  await $`"test/system/file-management.spec.ts"`;
  await $`"test/system/accessibility-system.spec.ts"`;
  await $`"test/system/portal-system-fixed.spec.ts"`;
  await $`"test/system/portal-system.spec.ts"`;
  await $`"test/system/mcp-integration-system.spec.ts"`;
  await $`"test/system/web-comprehensive-system.spec.ts"`;
  await $`"test/system/embedded-apps-simple.spec.ts"`;
  await $`"test/system/embedded-apps-system.spec.ts"`;
  await $`"test/system/cross-browser-compatibility.spec.ts"`;
  await $`"test/system/performance-load-testing.spec.ts"`;
  await $`"test/system/data-import-export-system.spec.ts"`;
  await $`"test/system/release-deployment-system.spec.ts"`;
  await $`"test/system/realtime-updates-system.spec.ts"`;
  await $`"test/system/security-advanced.spec.ts"`;
  await $`"test/system/web-app-system.spec.ts"`;
  await $`"test/system/notifications.spec.ts"`;
  await $`"test/helpers/test-config.ts"`;
  await $`"features/step_definitions/portal_steps.ts"`;
  await $`)`;
  // JavaScript files
  await $`JS_FILES=(`;
  await $`"test-backend-api.js"`;
  await $`"test-portal-simple.js"`;
  await $`"test_web_link.js"`;
  await $`)`;
  console.log("Updating TypeScript files...");
  for (const file of ["${FILES[@]}"; do]) {
  if (-f "$file" ) {; then
  console.log("  Updating: $file");
  // Replace portal_security imports with infra_test-as-manual
  if ([ "$file" == test/system/* ]) {; then
  // For files in test/system/ directory (5 levels up)
  await $`sed -i "s|from '../../../../../portal_security/children/TestPortManager'|from '../../../../../infra_test-as-manual/pipe'|g" "$file"`;
  await $`elif [[ "$file" == test/* ]]; then`;
  // For files in test/ directory (4 levels up)
  await $`sed -i "s|from '../../../../portal_security/children/TestPortManager'|from '../../../../infra_test-as-manual/pipe'|g" "$file"`;
  await $`elif [[ "$file" == features/step_definitions/* ]]; then`;
  // For feature files (6 levels up)
  await $`sed -i "s|from '../../../../../../portal_security/children/TestPortManager'|from '../../../../../../infra_test-as-manual/pipe'|g" "$file"`;
  } else {
  // For root level files (3 levels up)
  await $`sed -i "s|from '../../../portal_security/children/TestPortManager'|from '../../../infra_test-as-manual/pipe'|g" "$file"`;
  }
  // Also update if it's importing from portal_security/pipe
  await $`sed -i "s|from '[^']*portal_security/pipe'|from '../../../infra_test-as-manual/pipe'|g" "$file"`;
  }
  }
  console.log("");
  console.log("Updating JavaScript files...");
  for (const file of ["${JS_FILES[@]}"; do]) {
  if (-f "$file" ) {; then
  console.log("  Updating: $file");
  // Replace require statements
  await $`sed -i "s|require('../../../../portal_security/children/TestPortManager')|require('../../../../infra_test-as-manual/pipe')|g" "$file"`;
  await $`sed -i "s|require('[^']*portal_security/children/TestPortManager')|require('../../../../infra_test-as-manual/pipe')|g" "$file"`;
  }
  }
  console.log("");
  console.log("✅ All files updated to use TestPortManager from infra_test-as-manual/pipe");
  console.log("");
  console.log("Note: The infra_test-as-manual theme acts as the intermediary between tests and the security theme.");
  console.log("This ensures all test port allocation goes through the proper test infrastructure.");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}