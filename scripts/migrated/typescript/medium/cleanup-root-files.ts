#!/usr/bin/env bun
/**
 * Migrated from: cleanup-root-files.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.599Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Cleanup script to move misplaced files from root directory
  // According to CLAUDE.md rules: No files should be created on root
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  console.log("-e ");${YELLOW}Checking for files that violate root directory rules...${NC}"
  // Move documentation files to gen/doc/
  await $`DOCS=(*.md)`;
  for (const doc of ["${DOCS[@]}"; do]) {
  // Skip allowed root files
  if ([ "$doc" == "CLAUDE.md" || "$doc" == "README.md" || "$doc" == "*.md" ]) {; then
  await $`continue`;
  }
  if ([ -f "$doc" ]) {; then
  console.log("-e ");${RED}Found misplaced doc: $doc${NC}"
  await rename(""$doc"", "gen/doc/");
  console.log("-e ");${GREEN}Moved $doc to gen/doc/${NC}"
  }
  }
  // Move screenshot/image files to temp/
  await $`IMAGES=(*.png *.jpg *.jpeg *.gif)`;
  for (const img of ["${IMAGES[@]}"; do]) {
  if ([ -f "$img" ]) {; then
  console.log("-e ");${RED}Found misplaced image: $img${NC}"
  await mkdir("temp/test-screenshots", { recursive: true });
  await rename(""$img"", "temp/test-screenshots/");
  console.log("-e ");${GREEN}Moved $img to temp/test-screenshots/${NC}"
  }
  }
  // Move test files to temp/
  await $`TEST_FILES=(test-*.js test-*.ts)`;
  for (const test of ["${TEST_FILES[@]}"; do]) {
  if ([ -f "$test" ]) {; then
  console.log("-e ");${RED}Found misplaced test file: $test${NC}"
  await mkdir("temp/test-scripts", { recursive: true });
  await rename(""$test"", "temp/test-scripts/");
  console.log("-e ");${GREEN}Moved $test to temp/test-scripts/${NC}"
  }
  }
  // Check for other unexpected files
  console.log("-e ");${YELLOW}Checking for other unexpected root files...${NC}"
  // List allowed files
  await $`ALLOWED_FILES=(`;
  await $`"CLAUDE.md"`;
  await $`"README.md"`;
  await $`"FEATURE.vf.json"`;
  await $`"TASK_QUEUE.vf.json"`;
  await $`"FILE_STRUCTURE.vf.json"`;
  await $`"NAME_ID.vf.json"`;
  await $`"package.json"`;
  await $`"package-lock.json"`;
  await $`"tsconfig.json"`;
  await $`".gitignore"`;
  await $`".prettierrc"`;
  await $`".eslintrc.js"`;
  await $`"jest.config.js"`;
  await $`)`;
  // Check all files in root
  for (const file of [*; do]) {
  if ([ -f "$file" ]) {; then
  // Check if file is in allowed list
  await $`allowed=false`;
  for (const allowed_file of ["${ALLOWED_FILES[@]}"; do]) {
  if ([ "$file" == "$allowed_file" ]) {; then
  await $`allowed=true`;
  await $`break`;
  }
  }
  if ([ "$allowed" == false ]) {; then
  console.log("-e ");${YELLOW}Warning: Unexpected file in root: $file${NC}"
  console.log("  Consider moving this file to an appropriate subdirectory");
  }
  }
  }
  console.log("-e ");${GREEN}Root directory cleanup complete!${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}