#!/usr/bin/env bun
/**
 * Migrated from: verify-build.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.618Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Verify the CLI framework build
  await $`set -e`;
  console.log("Verifying CLI Framework Build...");
  await $`echo`;
  // Check if build was successful
  if (-d "dist" ) {; then
  console.log("✓ Build directory exists");
  } else {
  console.log("✗ Build directory not found");
  process.exit(1);
  }
  // Check main files
  await $`files=(`;
  await $`"dist/index.js"`;
  await $`"dist/index.d.ts"`;
  await $`"dist/domain/command.js"`;
  await $`"dist/domain/types.js"`;
  await $`"dist/application/cli.js"`;
  await $`"dist/application/parser.js"`;
  await $`"dist/utils/string.js"`;
  await $`)`;
  for (const file of ["${files[@]}"; do]) {
  if (-f "$file" ) {; then
  console.log("✓ $file exists");
  } else {
  console.log("✗ $file not found");
  process.exit(1);
  }
  }
  await $`echo`;
  console.log("✓ All build artifacts verified!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}