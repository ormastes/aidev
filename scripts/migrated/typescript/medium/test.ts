#!/usr/bin/env bun
/**
 * Migrated from: test.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.620Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Run Python tests with coverage
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
  console.log("Running Python tests with coverage...");
  // Run pytest with coverage
  await $`pytest \`;
  await $`--cov=src \`;
  await $`--cov-branch \`;
  await $`--cov-report=term-missing \`;
  await $`--cov-report=html \`;
  await $`--cov-report=json \`;
  await $`-v`;
  // Run coverage analyzer
  console.log("Analyzing coverage metrics...");
  await $`python src/coverage_analyzer.py`;
  // Run BDD tests with behave
  console.log("Running BDD tests...");
  await $`behave --junit --junit-directory test-results/behave`;
  console.log("Tests complete!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}