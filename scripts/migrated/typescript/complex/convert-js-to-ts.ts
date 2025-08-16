#!/usr/bin/env bun
/**
 * Migrated from: convert-js-to-ts.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.767Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Script to convert JavaScript files to TypeScript
  // Handles special cases and reports files that cannot be converted
  console.log("JavaScript to TypeScript Conversion Analysis");
  console.log("============================================");
  // Create report directory
  await $`REPORT_DIR="gen/doc/js-to-ts-conversion-$(date +%Y%m%d-%H%M%S)"`;
  await mkdir(""$REPORT_DIR"", { recursive: true });
  // Files that should remain as JS (config files that tools expect as .js)
  await $`KEEP_AS_JS=(`;
  await $`"jest.config.js"`;
  await $`"cucumber.js"`;
  await $`"webpack.config.js"`;
  await $`"babel.config.js"`;
  await $`".eslintrc.js"`;
  await $`"rollup.config.js"`;
  await $`"playwright.config.js"`;
  await $`)`;
  // Function to check if file should remain JS
  await $`should_keep_js() {`;
  await $`local file=$1`;
  await $`local basename=$(basename "$file")`;
  for (const pattern of ["${KEEP_AS_JS[@]}"; do]) {
  if ([ "$basename" == "$pattern" ]) {; then
  await $`return 0`;
  }
  }
  await $`return 1`;
  await $`}`;
  // Find all JS files
  console.log("Finding all JavaScript files...");
  await $`JS_FILES=$(find . -name "*.js" \`;
  await $`-not -path "./node_modules/*" \`;
  await $`-not -path "./.venv/*" \`;
  await $`-not -path "*/node_modules/*" \`;
  await $`-not -path "*/dist/*" \`;
  await $`-not -path "*/build/*" \`;
  await $`-not -path "*/.next/*" \`;
  await $`-not -path "*/coverage/*" \`;
  await $`-not -path "*/compiled/*" \`;
  await $`-type f)`;
  // Categorize files
  await $`CONVERTIBLE=()`;
  await $`CONFIG_FILES=()`;
  await $`TEST_FILES=()`;
  await $`CANNOT_CONVERT=()`;
  for (const file of [$JS_FILES; do]) {
  await $`if should_keep_js "$file"; then`;
  await $`CONFIG_FILES+=("$file")`;
  await $`elif [[ "$file" == *".test.js" ]] || [[ "$file" == *".spec.js" ]]; then`;
  await $`TEST_FILES+=("$file")`;
  await $`elif [[ "$file" == *"compiled"* ]] || [[ "$file" == *"generated"* ]]; then`;
  await $`CANNOT_CONVERT+=("$file")`;
  } else {
  await $`CONVERTIBLE+=("$file")`;
  }
  }
  // Generate report
  await $`cat > "$REPORT_DIR/conversion-report.md" << EOF`;
  // JavaScript to TypeScript Conversion Report
  await $`Generated: $(date)`;
  // # Summary
  await $`- Total JS files found: $(echo "$JS_FILES" | wc -l)`;
  await $`- Convertible to TS: ${#CONVERTIBLE[@]}`;
  await $`- Test files to convert: ${#TEST_FILES[@]}`;
  await $`- Config files (keep as JS): ${#CONFIG_FILES[@]}`;
  await $`- Cannot convert: ${#CANNOT_CONVERT[@]}`;
  // # Files to Convert to TypeScript
  // ## Source Files (${#CONVERTIBLE[@]} files)
  await $`EOF`;
  for (const file of ["${CONVERTIBLE[@]}"; do]) {
  console.log("- $file"); >> "$REPORT_DIR/conversion-report.md"
  }
  await $`cat >> "$REPORT_DIR/conversion-report.md" << EOF`;
  // ## Test Files (${#TEST_FILES[@]} files)
  await $`EOF`;
  for (const file of ["${TEST_FILES[@]}"; do]) {
  console.log("- $file"); >> "$REPORT_DIR/conversion-report.md"
  }
  await $`cat >> "$REPORT_DIR/conversion-report.md" << EOF`;
  // # Files to Keep as JavaScript
  // ## Configuration Files (${#CONFIG_FILES[@]} files)
  await $`These files should remain as .js because tools expect them in JavaScript format:`;
  await $`EOF`;
  for (const file of ["${CONFIG_FILES[@]}"; do]) {
  console.log("- $file"); >> "$REPORT_DIR/conversion-report.md"
  }
  await $`cat >> "$REPORT_DIR/conversion-report.md" << EOF`;
  // # Files That Cannot Be Converted (${#CANNOT_CONVERT[@]} files)
  await $`These are generated or compiled files:`;
  await $`EOF`;
  for (const file of ["${CANNOT_CONVERT[@]}"; do]) {
  console.log("- $file"); >> "$REPORT_DIR/conversion-report.md"
  }
  console.log("");
  console.log("Report generated at: $REPORT_DIR/conversion-report.md");
  console.log("");
  console.log("Summary:");
  console.log("- Convertible source files: ${#CONVERTIBLE[@]}");
  console.log("- Test files to convert: ${#TEST_FILES[@]}");
  console.log("- Config files (keep as JS): ${#CONFIG_FILES[@]}");
  console.log("- Cannot convert: ${#CANNOT_CONVERT[@]}");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}