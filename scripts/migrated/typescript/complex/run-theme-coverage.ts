#!/usr/bin/env bun
/**
 * Migrated from: run-theme-coverage.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.784Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Run theme coverage tests with direct root connection
  // No CLI or server dependencies required
  await $`set -e`;
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"`;
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}=== Theme Coverage Runner (Direct Connection) ===${NC}"
  console.log("Running coverage tests for themes with direct root connection...");
  console.log("");
  // Create coverage directory
  await mkdir(""$PROJECT_ROOT/gen/coverage/themes"", { recursive: true });
  // Function to run coverage for a theme
  await $`run_theme_coverage() {`;
  await $`local theme_path="$1"`;
  await $`local theme_name="$(basename "$theme_path")"`;
  console.log("-e ");${BLUE}Testing $theme_name...${NC}"
  if (! -f "$theme_path/jest.config.js" ) {; then
  console.log("-e ");${YELLOW}Skipping $theme_name - no jest config${NC}"
  await $`return`;
  }
  process.chdir(""$theme_path"");
  // Install dependencies if needed
  if (-f "package.json" ] && [ ! -d "node_modules" ) {; then
  console.log("Installing dependencies...");
  await $`bun install --silent`;
  }
  // Run tests with coverage
  await $`if bun test --coverage --silent; then`;
  console.log("-e ");${GREEN}✓ $theme_name coverage complete${NC}"
  // Copy coverage to root
  if (-f "coverage/coverage-final.json" ) {; then
  await copyFile(""coverage/coverage-final.json"", ""$PROJECT_ROOT/gen/coverage/themes/$theme_name-coverage.json"");
  }
  } else {
  console.log("-e ");${RED}✗ $theme_name coverage failed${NC}"
  }
  console.log("");
  await $`}`;
  // Run coverage for priority themes
  await $`PRIORITY_THEMES=(`;
  await $`"pocketflow"`;
  await $`"story-reporter"`;
  await $`"gui-selector"`;
  await $`"chat-space"`;
  await $`)`;
  for (const theme of ["${PRIORITY_THEMES[@]}"; do]) {
  await $`theme_path="$PROJECT_ROOT/layer/themes/$theme"`;
  if (-d "$theme_path" ) {; then
  await $`run_theme_coverage "$theme_path"`;
  }
  }
  console.log("-e ");${GREEN}=== Coverage Complete ===${NC}"
  console.log("Coverage reports saved to: $PROJECT_ROOT/gen/coverage/themes/");
  console.log("");
  console.log("To view aggregated coverage:");
  console.log("  cd $PROJECT_ROOT/layer/themes/coverage-aggregator");
  console.log("  bun run generate-report");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}