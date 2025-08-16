#!/usr/bin/env bun
/**
 * Migrated from: test.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.587Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  await $`set -e`;
  // Build with new toolchain
  await $`./build.sh`;
  // Run the executable
  if (-f build/hello ) {; then
  await $`output=$(./build/hello)`;
  await $`elif [ -f hello ]; then`;
  // Fallback to old Makefile build
  await $`make clean && make`;
  await $`output=$(./hello)`;
  } else {
  console.log("Error: No executable found");
  process.exit(1);
  }
  await $`if echo "$output" | grep -q "Hello from C++"; then`;
  console.log("Test passed!");
  process.exit(0);
  } else {
  console.log("Test failed!");
  process.exit(1);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}