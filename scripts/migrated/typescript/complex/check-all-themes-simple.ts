#!/usr/bin/env bun
/**
 * Migrated from: check-all-themes-simple.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.793Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Simple script to run fraud checks on all themes
  console.log("🔍 Running Fraud Checks on All Themes");
  console.log("====================================");
  console.log("");
  // Create output directory
  await mkdir("gen/doc/fraud-reports", { recursive: true });
  // Get all theme directories
  await $`themes_dir="layer/themes"`;
  await $`themes=$(ls -d $themes_dir/*/ | grep -v "temp/" | sort)`;
  // Summary counters
  await $`total_themes=0`;
  await $`passed_themes=0`;
  await $`failed_themes=0`;
  // Run fraud check on each theme
  for (const theme_path of [$themes; do]) {
  await $`theme_name=$(basename "$theme_path")`;
  console.log("Checking $theme_name...");
  // Skip if no test files
  await $`if ! find "$theme_path" -name "*.test.ts" -o -name "*.spec.ts" | grep -q .; then`;
  console.log("  ⏭️  No test files found, skipping");
  await $`continue`;
  }
  // Run the fraud checker using node directly
  await $`output_file="gen/doc/fraud-reports/${theme_name}-fraud-report.json"`;
  // Use node to run the compiled JavaScript
  await $`if node layer/themes/fraud-checker/dist/scripts/check-fraud.js "$theme_path" -o "$output_file" 2>/dev/null; then`;
  console.log("  ✅ PASSED");
  await $`((passed_themes++))`;
  } else {
  console.log("  ❌ FAILED");
  await $`((failed_themes++))`;
  }
  await $`((total_themes++))`;
  }
  console.log("");
  console.log("📊 Summary");
  console.log("=========");
  console.log("Total themes checked: $total_themes");
  console.log("Passed: $passed_themes");
  console.log("Failed: $failed_themes");
  console.log("");
  console.log("Reports saved in: gen/doc/fraud-reports/");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}