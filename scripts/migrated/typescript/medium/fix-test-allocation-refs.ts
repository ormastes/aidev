#!/usr/bin/env bun
/**
 * Migrated from: fix-test-allocation-refs.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.612Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Fix test allocation references to be consistent
  console.log("🔧 Fixing test allocation references...");
  // Fix all test files to use testAllocation consistently
  for (const file of [test/system/*.spec.ts test/*.spec.ts; do]) {
  if (-f "$file" ) {; then
  console.log("Processing: $file");
  // First ensure testAllocation is declared
  await $`if ! grep -q "let testAllocation:" "$file"; then`;
  // Add testAllocation declaration after testPort
  await $`sed -i '/let testPort: number;/a\  let testAllocation: any;' "$file"`;
  }
  // Fix the allocation assignment - update allocateTestPort to registerTestSuite
  await $`sed -i "s/testPort = await testManager\.allocateTestPort('\([^']*\)');/testAllocation = await testManager.registerTestSuite({ suiteName: '\1', testType: 'e2e', framework: 'playwright' });\n    testPort = testAllocation.port;/g" "$file"`;
  // Fix references to use testAllocation
  await $`sed -i "s/process\.env\.TEST_PORT = String(testPort);/process.env.TEST_PORT = String(testAllocation.port);/g" "$file"`;
  // Ensure proper import
  await $`if ! grep -q "TestPortAllocation" "$file"; then`;
  await $`sed -i "s/import { TestPortManager }/import { TestPortManager, TestPortAllocation }/g" "$file"`;
  }
  }
  }
  // Special fix for mcp-integration-system.spec.ts - has hardcoded MCP URLs
  if (-f "test/system/mcp-integration-system.spec.ts" ) {; then
  console.log("Special fix for MCP integration test...");
  // Get domain from test-as-manual for MCP URLs too
  await $`cat > temp_mcp_fix.txt << 'EOF'`;
  // Get MCP test ports from test-as-manual
  await $`const mcpPrimaryAllocation = await testManager.registerTestSuite({`;
  await $`suiteName: 'mcp-primary',`;
  await $`testType: 'integration',`;
  await $`framework: 'playwright'`;
  await $`});`;
  await $`const mcpSecondaryAllocation = await testManager.registerTestSuite({`;
  await $`suiteName: 'mcp-secondary',`;
  await $`testType: 'integration',`;
  await $`framework: 'playwright'`;
  await $`});`;
  await $`const MCP_API_URL = `${mcpPrimaryAllocation.baseUrl}/api/mcp`;`;
  await $`const MCP_PRIMARY_WS = `ws://${mcpPrimaryAllocation.baseUrl.replace('http://', '')}/mcp`;`;
  await $`const MCP_SECONDARY_WS = `ws://${mcpSecondaryAllocation.baseUrl.replace('http://', '')}/mcp`;`;
  await $`EOF`;
  // Replace hardcoded MCP URLs
  await $`sed -i "s|const MCP_API_URL = 'http://localhost:3458/api/mcp';|// MCP URLs will be set dynamically|g" "test/system/mcp-integration-system.spec.ts"`;
  await $`sed -i "s|ws://localhost:3458/mcp|' + MCP_PRIMARY_WS + '|g" "test/system/mcp-integration-system.spec.ts"`;
  await $`sed -i "s|ws://localhost:3459/mcp|' + MCP_SECONDARY_WS + '|g" "test/system/mcp-integration-system.spec.ts"`;
  await $`sed -i "s|ws://localhost:9999/mcp|ws://invalid.test:9999/mcp|g" "test/system/mcp-integration-system.spec.ts"`;
  }
  console.log("✅ Test allocation references fixed!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}