#!/usr/bin/env bun
/**
 * Migrated from: entrypoint.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.628Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  await $`set -e`;
  console.log("Python Test Environment");
  console.log("Python version: $(python --version)");
  console.log("pip version: $(pip --version)");
  console.log("uv version: $(uv --version 2>/dev/null || echo 'not installed')");
  // Execute passed command or default
  if ($# -eq 0 ) {; then
  console.log("Running default tests...");
  process.chdir("/workspace");
  await $`./run_system_tests.sh --filter python`;
  } else {
  await $`exec "$@"`;
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}