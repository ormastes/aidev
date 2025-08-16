#!/usr/bin/env bun
/**
 * Migrated from: test-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.597Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Use full path to Bun or find it
  await $`BUN_PATH="${BUN_PATH:-$HOME/.bun/bin/bun}"`;
  if (! -f "$BUN_PATH" ) {; then
  await $`BUN_PATH=$(which bun)`;
  }
  console.log("=== Testing MCP Server with Bun ===");
  console.log("");
  console.log("Bun version:");
  await $`$BUN_PATH --version`;
  console.log("");
  console.log("TypeScript version:");
  await $`$BUN_PATH x tsc --version`;
  console.log("");
  console.log("Testing TypeScript compilation:");
  await $`$BUN_PATH run build:mcp`;
  if ($? -eq 0 ) {; then
  console.log("✅ TypeScript compilation successful");
  } else {
  console.log("❌ TypeScript compilation failed");
  process.exit(1);
  }
  console.log("");
  console.log("Testing MCP server startup:");
  await $`timeout 5 $BUN_PATH dist/mcp-main.js 2>&1 | head -5`;
  if (${PIPESTATUS[0]} -eq 124 ) {; then
  console.log("✅ MCP server started successfully (timeout expected)");
  } else {
  console.log("⚠️ MCP server exited unexpectedly");
  }
  console.log("");
  console.log("Testing direct TypeScript execution with Bun:");
  await $`timeout 5 $BUN_PATH src/mcp-bun.ts 2>&1 | head -5`;
  if (${PIPESTATUS[0]} -eq 124 ) {; then
  console.log("✅ Direct TypeScript execution works");
  } else {
  console.log("⚠️ Direct TypeScript execution failed");
  }
  console.log("");
  console.log("Checking compiled output:");
  if (-f dist/mcp-main.js ) {; then
  console.log("✅ Compiled JavaScript exists");
  await $`ls -la dist/*.js`;
  } else {
  console.log("❌ Compiled JavaScript not found");
  }
  console.log("");
  console.log("Testing file operations security:");
  await $`cat > test-security.js << 'EOF'`;
  await $`const path = require('path');`;
  // Test path traversal protection
  await $`const tests = [`;
  await $`{ path: '../../../etc/passwd', should: 'block' },`;
  await $`{ path: 'test.vf.json', should: 'allow' },`;
  await $`{ path: '/etc/passwd', should: 'block' },`;
  await $`{ path: './valid/path.vf.json', should: 'allow' }`;
  await $`];`;
  await $`tests.forEach(test => {`;
  await $`const fullPath = path.join(process.env.VF_BASE_PATH || '.', test.path);`;
  await $`const isBlocked = !fullPath.startsWith(process.env.VF_BASE_PATH || '.') ||`;
  await $`test.path.includes('../');`;
  await $`const expected = test.should === 'block';`;
  await $`const result = isBlocked === expected ? '✅' : '❌';`;
  await $`console.log(`${result} ${test.path} - ${test.should} (${isBlocked ? 'blocked' : 'allowed'})`);`;
  await $`});`;
  await $`EOF`;
  await $`VF_BASE_PATH=/app $BUN_PATH test-security.js`;
  console.log("");
  console.log("=== All Tests Complete ===");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}