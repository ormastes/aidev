#!/usr/bin/env bun
/**
 * Migrated from: analyze-coverage.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.606Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("=== Coverage Analysis Report ===");
  console.log("Date: $(date)");
  console.log("");
  await $`THEMES_DIR="/home/ormastes/dev/aidev/layer/themes"`;
  await $`TOTAL_THEMES=0`;
  await $`THEMES_WITH_TESTS=0`;
  await $`THEMES_WITH_COVERAGE=0`;
  console.log("Analyzing themes...");
  console.log("");
  for (const theme_dir of [$THEMES_DIR/*/; do]) {
  if (-d "$theme_dir" ) {; then
  await $`theme_name=$(basename "$theme_dir")`;
  await $`TOTAL_THEMES=$((TOTAL_THEMES + 1))`;
  if (-f "$theme_dir/package.json" ) {; then
  // Check if test script exists
  await $`if grep -q '"test"' "$theme_dir/package.json" 2>/dev/null; then`;
  await $`THEMES_WITH_TESTS=$((THEMES_WITH_TESTS + 1))`;
  // Check if coverage script exists
  await $`if grep -q '"test:coverage"' "$theme_dir/package.json" 2>/dev/null; then`;
  await $`THEMES_WITH_COVERAGE=$((THEMES_WITH_COVERAGE + 1))`;
  console.log("✅ $theme_name - Has coverage configuration");
  } else {
  console.log("⚠️  $theme_name - Has tests but no coverage");
  }
  } else {
  console.log("❌ $theme_name - No test configuration");
  }
  }
  }
  }
  console.log("");
  console.log("=== Summary ===");
  console.log("Total themes: $TOTAL_THEMES");
  console.log("Themes with tests: $THEMES_WITH_TESTS ($((THEMES_WITH_TESTS * 100 / TOTAL_THEMES))%)");
  console.log("Themes with coverage: $THEMES_WITH_COVERAGE ($((THEMES_WITH_COVERAGE * 100 / TOTAL_THEMES))%)");
  console.log("");
  // Check for existing coverage reports
  console.log("=== Existing Coverage Reports ===");
  for (const coverage_dir of [$THEMES_DIR/*/coverage/; do]) {
  if (-d "$coverage_dir" ) {; then
  await $`theme_name=$(basename $(dirname "$coverage_dir"))`;
  if (-f "$coverage_dir/coverage-summary.json" ) {; then
  console.log("📊 $theme_name has coverage report");
  }
  }
  }
  console.log("");
  console.log("=== Recommendations ===");
  console.log("1. Enable coverage for all themes with existing tests");
  console.log("2. Add test infrastructure to themes without tests");
  console.log("3. Run coverage tests for all configured themes");
  console.log("4. Generate unified coverage report");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}