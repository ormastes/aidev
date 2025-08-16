#!/usr/bin/env bun
/**
 * Migrated from: safe-cleanup.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.621Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Safe cleanup script for compiled files
  // Only removes .js/.d.ts files where .ts source exists
  console.log("🧹 Starting safe cleanup of compiled files...");
  // Counter
  await $`count=0`;
  // Find and remove compiled files
  for (const file of [$(find . -type f \( -name "*.js" -o -name "*.d.ts" -o -name "*.js.map" -o -name "*.d.ts.map" \) 2>/dev/null); do]) {
  // Skip node_modules
  if ([ $file == *"node_modules"* ]) {; then
  await $`continue`;
  }
  // Skip dist directories
  if ([ $file == *"/dist/"* ]) {; then
  await $`continue`;
  }
  // Get base name without extension
  await $`base="${file%.js}"`;
  await $`base="${base%.d.ts}"`;
  await $`base="${base%.map}"`;
  await $`base="${base%.d}"`;
  // Check if TypeScript source exists
  if (-f "${base}.ts" ] || [ -f "${base}.tsx" ) {; then
  console.log("Removing: $file");
  await $`rm "$file"`;
  await $`((count++))`;
  }
  }
  console.log("✅ Removed $count compiled files");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}