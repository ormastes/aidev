#!/usr/bin/env bun
/**
 * Migrated from: pre-commit-file-api.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.779Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Pre-commit hook for File Creation API enforcement
  // This script checks for direct file system access in staged files
  console.log("🔍 Checking for direct file system access violations...");
  // Get list of staged TypeScript/JavaScript files
  await $`STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')`;
  if (-z "$STAGED_FILES" ) {; then
  console.log("✅ No JavaScript/TypeScript files to check");
  process.exit(0);
  }
  await $`VIOLATIONS=0`;
  await $`VIOLATION_FILES=""`;
  // Patterns to check for
  await $`PATTERNS=(`;
  await $`"fs\.writeFileSync"`;
  await $`"fs\.writeFile"`;
  await $`"fs\.promises\.writeFile"`;
  await $`"fs\.mkdirSync"`;
  await $`"fs\.mkdir"`;
  await $`"fs\.promises\.mkdir"`;
  await $`"fs\.appendFileSync"`;
  await $`"fs\.appendFile"`;
  await $`"fs\.createWriteStream"`;
  await $`)`;
  // Check each staged file
  for (const FILE of [$STAGED_FILES; do]) {
  // Skip test files
  if ([ "$FILE" == *".test."* ]] || [[ "$FILE" == *".spec."* ]] || [[ "$FILE" == *"/test/"* ]) {; then
  await $`continue`;
  }
  // Skip external-log-lib implementation files
  if ([ "$FILE" == *"infra_external-log-lib/src/file-manager"* ]) { || \
  await $`[[ "$FILE" == *"infra_external-log-lib/src/fraud-detector"* ]] || \`;
  await $`[[ "$FILE" == *"infra_external-log-lib/src/interceptors"* ]]; then`;
  await $`continue`;
  }
  // Check for violations
  await $`FILE_VIOLATIONS=0`;
  for (const PATTERN of ["${PATTERNS[@]}"; do]) {
  await $`COUNT=$(grep -c "$PATTERN" "$FILE" 2>/dev/null || echo 0)`;
  if ("$COUNT" -gt 0 ) {; then
  await $`FILE_VIOLATIONS=$((FILE_VIOLATIONS + COUNT))`;
  }
  }
  if ("$FILE_VIOLATIONS" -gt 0 ) {; then
  await $`VIOLATIONS=$((VIOLATIONS + FILE_VIOLATIONS))`;
  await $`VIOLATION_FILES="$VIOLATION_FILES\n  - $FILE ($FILE_VIOLATIONS violations)"`;
  }
  }
  if ("$VIOLATIONS" -gt 0 ) {; then
  console.log("");
  console.log("❌ Direct file system access violations found!");
  console.log("");
  console.log("Files with violations:");
  console.log("-e ");$VIOLATION_FILES"
  console.log("");
  console.log("Please use FileCreationAPI instead:");
  console.log("  import { getFileAPI, FileType } from '@external-log-lib/pipe';");
  console.log("  const fileAPI = getFileAPI();");
  console.log("");
  console.log("Examples:");
  console.log("  - Replace: fs.writeFileSync(path, data)");
  console.log("    With:    await fileAPI.createFile(path, data, { type: FileType.TEMPORARY })");
  console.log("");
  console.log("  - Replace: fs.mkdirSync(path)");
  console.log("    With:    await fileAPI.createDirectory(path)");
  console.log("");
  console.log("To bypass (not recommended):");
  console.log("  git commit --no-verify");
  console.log("");
  process.exit(1);
  }
  console.log("✅ No direct file system access violations found");
  process.exit(0);
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}