#!/usr/bin/env bun
/**
 * Migrated from: run-quality-scan.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.626Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Run Project Quality Scanner
  // This script runs the comprehensive quality and fraud detection scanner
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`THEME_DIR="$(dirname "$SCRIPT_DIR")"`;
  await $`PROJECT_ROOT="$(cd "$THEME_DIR/../../../.." && pwd)"`;
  console.log("🔍 Project Quality Scanner");
  console.log("=========================");
  console.log("Project Root: $PROJECT_ROOT");
  console.log("");
  // Change to project root
  process.chdir(""$PROJECT_ROOT"");
  // Check if ts-node is available
  await $`if ! command -v ts-node &> /dev/null; then`;
  console.log("⚠️  ts-node not found. Installing...");
  await $`npm install -g ts-node typescript`;
  }
  // Run the scanner
  console.log("Starting comprehensive project scan...");
  await $`ts-node "$THEME_DIR/src/cli/project-quality-scanner.ts" "$@"`;
  await $`exit $?`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}