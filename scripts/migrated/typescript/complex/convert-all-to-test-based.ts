#!/usr/bin/env bun
/**
 * Migrated from: convert-all-to-test-based.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.765Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Convert all priority-based TASK_QUEUE.vf.json files to test-based format
  await $`set -e`;
  // Color codes for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"`;
  await $`MIGRATION_SCRIPT="$PROJECT_ROOT/layer/themes/infra_filesystem-mcp/scripts/migrate-task-queue.js"`;
  // Counter variables
  await $`TOTAL_FILES=0`;
  await $`CONVERTED_FILES=0`;
  await $`SKIPPED_FILES=0`;
  await $`ERROR_FILES=0`;
  // Function to print colored messages
  await $`print_message() {`;
  await $`local color=$1`;
  await $`local message=$2`;
  console.log("-e ");${color}${message}${NC}"
  await $`}`;
  await $`print_message "$BLUE" "🔄 Converting all TASK_QUEUE.vf.json files to test-based format"`;
  await $`print_message "$BLUE" "=========================================================="`;
  console.log("");
  // Create backup directory
  await $`BACKUP_DIR="$PROJECT_ROOT/gen/task-queue-backups-$(date +%Y%m%d-%H%M%S)"`;
  await mkdir(""$BACKUP_DIR"", { recursive: true });
  await $`print_message "$YELLOW" "📁 Backup directory: $BACKUP_DIR"`;
  console.log("");
  // Find all TASK_QUEUE.vf.json files
  await $`print_message "$BLUE" "🔍 Finding all TASK_QUEUE.vf.json files..."`;
  while (IFS= read -r file; do) {
  await $`TOTAL_FILES=$((TOTAL_FILES + 1))`;
  // Skip node_modules, release, demo directories
  if ([ "$file" == *"node_modules"* ]] || [[ "$file" == *"/release/"* ]] || [[ "$file" == *"/demo/"* ]) {; then
  await $`print_message "$YELLOW" "⏩ Skipping: $file (in excluded directory)"`;
  await $`SKIPPED_FILES=$((SKIPPED_FILES + 1))`;
  await $`continue`;
  }
  // Check if file uses priority-based format (has taskQueues property)
  await $`if grep -q '"taskQueues"' "$file" 2>/dev/null; then`;
  await $`print_message "$GREEN" "✓ Found priority-based: $file"`;
  // Create backup
  await $`BACKUP_FILE="$BACKUP_DIR/$(basename "$(dirname "$file")")-$(basename "$file")"`;
  await copyFile(""$file"", ""$BACKUP_FILE"");
  // Convert to test-based format
  await $`TEMP_FILE="${file}.converted"`;
  await $`if node "$MIGRATION_SCRIPT" "$file" "$TEMP_FILE" --to-test-driven 2>/dev/null; then`;
  // Replace original with converted file
  await rename(""$TEMP_FILE"", ""$file"");
  await $`print_message "$GREEN" "  ✓ Converted successfully"`;
  await $`CONVERTED_FILES=$((CONVERTED_FILES + 1))`;
  } else {
  await $`print_message "$RED" "  ✗ Conversion failed"`;
  await $`rm -f "$TEMP_FILE"`;
  await $`ERROR_FILES=$((ERROR_FILES + 1))`;
  }
  await $`elif grep -q '"queues"' "$file" 2>/dev/null; then`;
  await $`print_message "$YELLOW" "⏩ Already test-based: $file"`;
  await $`SKIPPED_FILES=$((SKIPPED_FILES + 1))`;
  } else {
  await $`print_message "$RED" "❓ Unknown format: $file"`;
  await $`ERROR_FILES=$((ERROR_FILES + 1))`;
  }
  console.log("");
  await $`done < <(find "$PROJECT_ROOT" -name "TASK_QUEUE.vf.json" -type f)`;
  // Summary
  await $`print_message "$BLUE" "📊 Conversion Summary"`;
  await $`print_message "$BLUE" "===================="`;
  await $`print_message "$GREEN" "✓ Total files found: $TOTAL_FILES"`;
  await $`print_message "$GREEN" "✓ Converted: $CONVERTED_FILES files"`;
  await $`print_message "$YELLOW" "⏩ Skipped: $SKIPPED_FILES files (already test-based or excluded)"`;
  if ([ $ERROR_FILES -gt 0 ]) {; then
  await $`print_message "$RED" "✗ Errors: $ERROR_FILES files"`;
  }
  console.log("");
  await $`print_message "$BLUE" "📁 Backups saved to: $BACKUP_DIR"`;
  // Verify conversions
  if ([ $CONVERTED_FILES -gt 0 ]) {; then
  console.log("");
  await $`print_message "$BLUE" "🔍 Verifying conversions..."`;
  await $`VERIFY_SUCCESS=0`;
  await $`VERIFY_FAIL=0`;
  for (const file of [$(find "$PROJECT_ROOT" -name "TASK_QUEUE.vf.json" -type f | grep -v node_modules | grep -v "/release/" | grep -v "/demo/"); do]) {
  await $`if grep -q '"queues"' "$file" 2>/dev/null && grep -q '"working_item"' "$file" 2>/dev/null; then`;
  await $`VERIFY_SUCCESS=$((VERIFY_SUCCESS + 1))`;
  await $`elif grep -q '"taskQueues"' "$file" 2>/dev/null; then`;
  await $`print_message "$RED" "  ✗ Still priority-based: $file"`;
  await $`VERIFY_FAIL=$((VERIFY_FAIL + 1))`;
  }
  }
  await $`print_message "$GREEN" "✓ Verified test-based format: $VERIFY_SUCCESS files"`;
  if ([ $VERIFY_FAIL -gt 0 ]) {; then
  await $`print_message "$RED" "✗ Still priority-based: $VERIFY_FAIL files"`;
  }
  }
  console.log("");
  await $`print_message "$GREEN" "✓ Conversion complete!"`;
  // Instructions for rollback
  console.log("");
  await $`print_message "$BLUE" "📝 To rollback changes:"`;
  console.log("cp $BACKUP_DIR/* <original-locations>");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}