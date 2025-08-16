#!/usr/bin/env bun
/**
 * Migrated from: lint.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.588Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Lint and format Python code
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
  console.log("Running Python linters and formatters...");
  // Format with black
  console.log("Formatting with black...");
  await $`black src tests features --check --diff`;
  // Lint with ruff
  console.log("Linting with ruff...");
  await $`ruff check src tests features`;
  // Type check with mypy
  console.log("Type checking with mypy...");
  await $`mypy src`;
  console.log("Linting complete!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}