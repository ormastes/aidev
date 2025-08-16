#!/usr/bin/env bun
/**
 * Migrated from: check-architecture.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.618Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Architecture Check Bypass Script
  // Delegates to fraud-checker theme for actual logic
  await $`set -e`;
  // Get the script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"`;
  // Path to fraud-checker theme - use existing Python scripts for now
  await $`FRAUD_CHECKER_PATH="$PROJECT_ROOT/layer/themes/fraud-checker/scripts"`;
  console.log("🔧 Starting Architecture Refactoring Check");
  console.log("===========================================");
  // Check if fraud-checker scripts exist
  if (! -d "$FRAUD_CHECKER_PATH" ) {; then
  console.log("Error: Fraud-checker scripts not found at $FRAUD_CHECKER_PATH");
  process.exit(1);
  }
  // Run comprehensive analysis
  console.log("");
  console.log("1. Running fraud detection analysis...");
  if (-f "$FRAUD_CHECKER_PATH/fix-all-frauds.py" ) {; then
  await $`python3 "$FRAUD_CHECKER_PATH/fix-all-frauds.py" --check-only`;
  } else {
  console.log("⚠️  fix-all-frauds.py not found");
  }
  console.log("");
  console.log("2. Running MFTOD compliance check...");
  if (-f "$FRAUD_CHECKER_PATH/MFTOD-compliant.sh" ) {; then
  await $`bash "$FRAUD_CHECKER_PATH/MFTOD-compliant.sh"`;
  } else {
  console.log("⚠️  MFTOD-compliant.sh not found");
  }
  console.log("");
  console.log("3. Architecture analysis complete");
  console.log("Check the fraud detection output above for issues to refactor.");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}