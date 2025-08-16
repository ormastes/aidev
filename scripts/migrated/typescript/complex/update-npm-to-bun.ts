#!/usr/bin/env bun
/**
 * Migrated from: update-npm-to-bun.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.730Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Script to update all npm references to bun in documentation and scripts
  // This is a comprehensive update tool for the AI Development Platform
  await $`set -euo pipefail`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`CYAN='\033[0;36m'`;
  await $`NC='\033[0m' # No Color`;
  // Logging functions
  await $`log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }`;
  await $`log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }`;
  await $`log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }`;
  await $`log_error() { echo -e "${RED}[ERROR]${NC} $1"; }`;
  // Counter for changes
  await $`TOTAL_FILES=0`;
  await $`TOTAL_CHANGES=0`;
  // Function to update a file
  await $`update_file() {`;
  await $`local file="$1"`;
  await $`local temp_file="${file}.tmp"`;
  await $`local changes=0`;
  // Skip node_modules, release, and .git directories
  if ([ "$file" == *"node_modules"* ]] || [[ "$file" == *"release/"* ]] || [[ "$file" == *".git/"* ]) {; then
  await $`return 0`;
  }
  // Skip the bun migration report itself
  if ([ "$file" == *"bun-migration-report.md" ]) {; then
  await $`return 0`;
  }
  // Create a temporary file with replacements
  await copyFile(""$file"", ""$temp_file"");
  // Replace npm commands with bun equivalents
  // Note: Using word boundaries to avoid replacing things like "npm" in URLs
  await $`sed -i.bak -E \`;
  await $`-e 's/\bnpm install\b/bun install/g' \`;
  await $`-e 's/\bnpm i\b/bun install/g' \`;
  await $`-e 's/\bnpm ci\b/bun install --frozen-lockfile/g' \`;
  await $`-e 's/\bnpm run\b/bun run/g' \`;
  await $`-e 's/\bnpm test\b/bun test/g' \`;
  await $`-e 's/\bnpm start\b/bun start/g' \`;
  await $`-e 's/\bnpm build\b/bun run build/g' \`;
  await $`-e 's/\bnpm audit\b/bun audit/g' \`;
  await $`-e 's/\bnpm update\b/bun update/g' \`;
  await $`-e 's/\bnpm outdated\b/bun outdated/g' \`;
  await $`-e 's/\bnpm publish\b/bun publish/g' \`;
  await $`-e 's/\bnpm link\b/bun link/g' \`;
  await $`-e 's/\bnpm unlink\b/bun unlink/g' \`;
  await $`-e 's/\bnpm list\b/bun pm ls/g' \`;
  await $`-e 's/\bnpm ls\b/bun pm ls/g' \`;
  await $`-e 's/\bnpm prune\b/bun pm prune/g' \`;
  await $`-e 's/\bnpm dedupe\b/bun install/g' \`;
  await $`-e 's/\bnpm init\b/bun init/g' \`;
  await $`-e 's/\bnpm exec\b/bunx/g' \`;
  await $`-e 's/\bnpx\b/bunx/g' \`;
  await $`-e 's/\bnpm install -g\b/bun add -g/g' \`;
  await $`-e 's/\bnpm install --global\b/bun add -g/g' \`;
  await $`-e 's/\bnpm uninstall\b/bun remove/g' \`;
  await $`-e 's/\bnpm rm\b/bun remove/g' \`;
  await $`-e 's/\bnpm config\b/bunfig/g' \`;
  await $`-e 's/package-lock\.json/bun.lockb/g' \`;
  await $`-e 's/npm-debug\.log/bun-debug.log/g' \`;
  await $`-e 's/\.npm\b/.bun/g' \`;
  await $`-e 's/npm 9\.x or later/bun latest version/g' \`;
  await $`-e 's/npm package manager/bun package manager/g' \`;
  await $`"$temp_file"`;
  // Check if file was changed
  await $`if ! diff -q "$file" "$temp_file" > /dev/null 2>&1; then`;
  await rename(""$temp_file"", ""$file"");
  await $`rm -f "${temp_file}.bak"`;
  await $`((TOTAL_CHANGES++))`;
  await $`log_success "Updated: $file"`;
  await $`return 1`;
  } else {
  await $`rm -f "$temp_file" "${temp_file}.bak"`;
  await $`return 0`;
  }
  await $`}`;
  // Function to update markdown files
  await $`update_markdown_files() {`;
  await $`log_info "Updating markdown files..."`;
  while (IFS= read -r -d '' file; do) {
  await $`((TOTAL_FILES++))`;
  await $`update_file "$file" || true`;
  await $`done < <(find . -type f -name "*.md" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)`;
  await $`}`;
  // Function to update shell scripts
  await $`update_shell_scripts() {`;
  await $`log_info "Updating shell scripts..."`;
  while (IFS= read -r -d '' file; do) {
  await $`((TOTAL_FILES++))`;
  await $`update_file "$file" || true`;
  await $`done < <(find . -type f -name "*.sh" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)`;
  await $`}`;
  // Function to update JavaScript/TypeScript files with comments
  await $`update_js_ts_files() {`;
  await $`log_info "Updating JavaScript/TypeScript files (comments only)..."`;
  while (IFS= read -r -d '' file; do) {
  await $`((TOTAL_FILES++))`;
  // Only update comments in JS/TS files, not actual code
  await $`temp_file="${file}.tmp"`;
  await copyFile(""$file"", ""$temp_file"");
  // Update comments that reference npm
  await $`sed -i.bak -E \`;
  await $`-e 's|// npm |// bun |g' \`;
  await $`-e 's|/\* npm |\/* bun |g' \`;
  await $`-e 's|// Run: npm |// Run: bun |g' \`;
  await $`-e 's|// Install: npm |// Install: bun |g' \`;
  await $`-e 's|// Usage: npm |// Usage: bun |g' \`;
  await $`-e 's|// Example: npm |// Example: bun |g' \`;
  await $`"$temp_file"`;
  await $`if ! diff -q "$file" "$temp_file" > /dev/null 2>&1; then`;
  await rename(""$temp_file"", ""$file"");
  await $`rm -f "${temp_file}.bak"`;
  await $`((TOTAL_CHANGES++))`;
  await $`log_success "Updated comments in: $file"`;
  } else {
  await $`rm -f "$temp_file" "${temp_file}.bak"`;
  }
  await $`done < <(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)`;
  await $`}`;
  // Function to update JSON files (package.json scripts descriptions)
  await $`update_json_files() {`;
  await $`log_info "Checking package.json files for documentation updates..."`;
  while (IFS= read -r -d '' file; do) {
  if ([ "$(basename "$file")" == "package.json" ]) {; then
  await $`log_info "Found package.json at: $file"`;
  // Note: package.json scripts themselves don't need updating
  // as they work with both npm and bun
  }
  await $`done < <(find . -type f -name "*.json" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)`;
  await $`}`;
  // Main execution
  await $`main() {`;
  console.log("-e ");${CYAN}=== NPM to Bun Documentation Update ===${NC}"
  console.log("This script will update all npm references to bun in documentation");
  await $`echo`;
  // Confirmation
  await $`read -p "Do you want to proceed with updating all documentation? (y/N): " -n 1 -r`;
  await $`echo`;
  if ([ ! $REPLY =~ ^[Yy]$ ]) {; then
  await $`log_info "Update cancelled"`;
  process.exit(0);
  }
  // Update different file types
  await $`update_markdown_files`;
  await $`update_shell_scripts`;
  await $`update_js_ts_files`;
  await $`update_json_files`;
  // Summary
  await $`echo`;
  console.log("-e ");${CYAN}=== Update Summary ===${NC}"
  console.log("Files processed: $TOTAL_FILES");
  console.log("Files updated: $TOTAL_CHANGES");
  if ([ $TOTAL_CHANGES -gt 0 ]) {; then
  await $`echo`;
  await $`log_success "Successfully updated $TOTAL_CHANGES files to use bun instead of npm"`;
  await $`echo`;
  console.log("Next steps:");
  console.log("1. Review the changes: git diff");
  console.log("2. Test the updated documentation");
  console.log("3. Commit the changes: git add -A && git commit -m 'Update documentation to use bun'");
  } else {
  await $`log_info "No files needed updating"`;
  }
  await $`}`;
  // Run main function
  await $`main "$@"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}