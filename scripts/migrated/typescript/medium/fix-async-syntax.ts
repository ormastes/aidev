#!/usr/bin/env bun
/**
 * Migrated from: fix-async-syntax.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.628Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Fix async syntax errors in TypeScript files
  console.log("Fixing async syntax errors...");
  // Find all TypeScript files and fix common async syntax errors
  await $`find layer/ -name "*.ts" -type f -exec sed -i \`;
  await $`-e 's/async if/if/g' \`;
  await $`-e 's/async for/for/g' \`;
  await $`-e 's/async while/while/g' \`;
  await $`-e 's/async switch/switch/g' \`;
  await $`-e 's/async try/try/g' \`;
  await $`-e 's/async catch/catch/g' \`;
  await $`-e 's/async constructor/constructor/g' \`;
  await $`-e 's/await await/await/g' \`;
  await $`{} \;`;
  console.log("Fixed async syntax errors in TypeScript files");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}