#!/usr/bin/env bun
/**
 * Migrated from: fix-localhost-urls.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.619Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Fix localhost URLs in test files to use baseUrl from TestPortManager
  console.log("🔧 Fixing localhost URLs in test files...");
  // Fix TypeScript test files
  for (const file of [test/system/*.spec.ts test/*.spec.ts; do]) {
  if (-f "$file" ) {; then
  console.log("Processing: $file");
  // Replace localhost URL construction with baseUrl from allocation
  await $`sed -i "s/PORTAL_URL = \`http:\/\/localhost:\${testPort}\`;/PORTAL_URL = testAllocation.baseUrl;/g" "$file"`;
  await $`sed -i "s/BASE_URL = \`http:\/\/localhost:\${testPort}\`;/BASE_URL = testAllocation.baseUrl;/g" "$file"`;
  // Update the allocateTestPort pattern to registerTestSuite
  await $`sed -i "s/const testPort = await testManager\.allocateTestPort('\([^']*\)');/const testAllocation = await testManager.registerTestSuite({ suiteName: '\1', testType: 'e2e', framework: 'playwright' });/g" "$file"`;
  // Update releasePort to releaseTestPort
  await $`sed -i "s/await testManager\.releasePort(testPort);/await testManager.releaseTestPort(testAllocation.appId);/g" "$file"`;
  // Fix testPort references to use testAllocation.port
  await $`sed -i "s/port: testPort,/port: testAllocation.port,/g" "$file"`;
  await $`sed -i "s/testPort}/testAllocation.port}/g" "$file"`;
  }
  }
  // Fix run-system-tests.ts
  if (-f "run-system-tests.ts" ) {; then
  console.log("Processing: run-system-tests.ts");
  await $`sed -i "s/process\.env\.PORTAL_URL = \`http:\/\/localhost:\${testAllocation\.port}\`;/process.env.PORTAL_URL = testAllocation.baseUrl;/g" "run-system-tests.ts"`;
  await $`sed -i "s/http\.get(\`http:\/\/localhost:\${port}\`, /http.get(testAllocation.baseUrl, /g" "run-system-tests.ts"`;
  }
  // Fix fix-all-violations.ts
  if (-f "fix-all-violations.ts" ) {; then
  console.log("Processing: fix-all-violations.ts");
  await $`sed -i "s/PORTAL_URL = \`http:\/\/localhost:\${testPort}\`;/PORTAL_URL = testAllocation.baseUrl;/g" "fix-all-violations.ts"`;
  await $`sed -i "s/BASE_URL = \`http:\/\/localhost:\${testPort}\`;/BASE_URL = testAllocation.baseUrl;/g" "fix-all-violations.ts"`;
  }
  console.log("✅ Localhost URLs fixed to use TestPortManager baseUrl!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}