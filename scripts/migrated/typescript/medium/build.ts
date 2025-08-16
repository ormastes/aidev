#!/usr/bin/env bun
/**
 * Migrated from: build.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.624Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Build Python package
  await $`set -e`;
  // Activate virtual environment if not already activated
  if ([ "$VIRTUAL_ENV" == "" ]) {; then
  if ([ -f .venv/bin/activate ]) {; then
  await $`source .venv/bin/activate`;
  } else {
  console.log("Virtual environment not found. Run setup.sh first.");
  process.exit(1);
  }
  }
  console.log("Building Python package...");
  // Clean previous builds
  await rm("dist build *.egg-info", { recursive: true, force: true });
  // Install build tools if not present
  await $`uv uv pip install --quiet build`;
  // Build the package
  await $`python -m build`;
  console.log("Package built successfully!");
  console.log("Distribution files available in dist/");
  await $`ls -la dist/`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}