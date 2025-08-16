#!/usr/bin/env bun
/**
 * Migrated from: setup-task-queue-hierarchy.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.669Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup Task Queue Hierarchy for New Themes
  // Automatically creates and registers task queues with parent-child relationships
  await $`set -e`;
  // Color codes for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"`;
  await $`HIERARCHY_SCRIPT="$PROJECT_ROOT/layer/themes/infra_filesystem-mcp/scripts/manage-task-queue-hierarchy.js"`;
  // Function to print colored messages
  await $`print_message() {`;
  await $`local color=$1`;
  await $`local message=$2`;
  console.log("-e ");${color}${message}${NC}"
  await $`}`;
  // Function to create task queue for theme
  await $`create_theme_queue() {`;
  await $`local theme_path=$1`;
  await $`local theme_name=$(basename "$theme_path")`;
  await $`local queue_path="$theme_path/TASK_QUEUE.vf.json"`;
  await $`print_message "$BLUE" "📁 Creating task queue for theme: $theme_name"`;
  // Check if queue already exists
  if ([ -f "$queue_path" ]) {; then
  await $`print_message "$YELLOW" "  Queue already exists, updating parent..."`;
  } else {
  // Create queue template
  await $`cat > "$queue_path" << EOF`;
  await $`{`;
  await $`"metadata": {`;
  await $`"version": "1.0.0",`;
  await $`"created_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",`;
  await $`"updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",`;
  await $`"total_items": 0,`;
  await $`"description": "Task queue for $theme_name theme"`;
  await $`},`;
  await $`"parentQueue": "/TASK_QUEUE.vf.json",`;
  await $`"theme": "$theme_name",`;
  await $`"working_item": null,`;
  await $`"queues": {`;
  await $`"adhoc_temp_user_request": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Add urgent tasks specific to $theme_name",`;
  await $`"pop_comment": "🎯 Handle $theme_name urgent request"`;
  await $`},`;
  await $`"user_story": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Add user stories for $theme_name features",`;
  await $`"pop_comment": "🎯 Implement $theme_name user story"`;
  await $`},`;
  await $`"scenarios": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Add scenarios for $theme_name",`;
  await $`"pop_comment": "🎯 Process $theme_name scenario"`;
  await $`},`;
  await $`"environment_tests": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Add environment tests for $theme_name",`;
  await $`"pop_comment": "🎯 Run $theme_name environment test"`;
  await $`},`;
  await $`"external_tests": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Add external tests for $theme_name",`;
  await $`"pop_comment": "🎯 Run $theme_name external test"`;
  await $`},`;
  await $`"system_tests_implement": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Add system tests for $theme_name",`;
  await $`"pop_comment": "🎯 Implement $theme_name system test"`;
  await $`},`;
  await $`"integration_tests_implement": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Add integration tests for $theme_name",`;
  await $`"pop_comment": "🎯 Implement $theme_name integration test"`;
  await $`},`;
  await $`"unit_tests": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Add unit tests for $theme_name",`;
  await $`"pop_comment": "🎯 Implement $theme_name unit test"`;
  await $`},`;
  await $`"integration_tests_verify": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Verify integration tests for $theme_name",`;
  await $`"pop_comment": "🎯 Verify $theme_name integration test"`;
  await $`},`;
  await $`"system_tests_verify": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Verify system tests for $theme_name",`;
  await $`"pop_comment": "🎯 Verify $theme_name system test"`;
  await $`},`;
  await $`"coverage_duplication": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Check coverage for $theme_name",`;
  await $`"pop_comment": "🎯 Analyze $theme_name coverage"`;
  await $`},`;
  await $`"retrospective": {`;
  await $`"items": [],`;
  await $`"insert_comment": "📋 Add retrospective for $theme_name",`;
  await $`"pop_comment": "🎯 Process $theme_name retrospective"`;
  await $`}`;
  await $`},`;
  await $`"global_config": {`;
  await $`"seldom_display_default": 5,`;
  await $`"operation_counters": {}`;
  await $`},`;
  await $`"priority_order": [`;
  await $`"adhoc_temp_user_request",`;
  await $`"environment_tests",`;
  await $`"external_tests",`;
  await $`"system_tests_implement",`;
  await $`"integration_tests_implement",`;
  await $`"unit_tests",`;
  await $`"integration_tests_verify",`;
  await $`"system_tests_verify",`;
  await $`"scenarios",`;
  await $`"user_story",`;
  await $`"coverage_duplication",`;
  await $`"retrospective"`;
  await $`]`;
  await $`}`;
  await $`EOF`;
  await $`print_message "$GREEN" "  ✓ Created queue: $queue_path"`;
  }
  // Register with hierarchy manager
  await $`local relative_path="${queue_path#$PROJECT_ROOT/}"`;
  if ([ -f "$HIERARCHY_SCRIPT" ]) {; then
  await $`node "$HIERARCHY_SCRIPT" add "$relative_path" "/TASK_QUEUE.vf.json"`;
  }
  await $`}`;
  // Function to create sub-theme queue
  await $`create_subtheme_queue() {`;
  await $`local parent_theme=$1`;
  await $`local subtheme_path=$2`;
  await $`local subtheme_name=$(basename "$subtheme_path")`;
  await $`local queue_path="$subtheme_path/TASK_QUEUE.vf.json"`;
  await $`local parent_queue_path="/layer/themes/$parent_theme/TASK_QUEUE.vf.json"`;
  await $`print_message "$BLUE" "  📂 Creating sub-queue for: $subtheme_name"`;
  if ([ ! -f "$queue_path" ]) {; then
  // Create minimal sub-queue
  await $`cat > "$queue_path" << EOF`;
  await $`{`;
  await $`"metadata": {`;
  await $`"version": "1.0.0",`;
  await $`"created_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",`;
  await $`"updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",`;
  await $`"total_items": 0,`;
  await $`"description": "Sub-queue for $subtheme_name under $parent_theme"`;
  await $`},`;
  await $`"parentQueue": "$parent_queue_path",`;
  await $`"parentTheme": "$parent_theme",`;
  await $`"theme": "$parent_theme",`;
  await $`"subtheme": "$subtheme_name",`;
  await $`"working_item": null,`;
  await $`"queues": {`;
  await $`"adhoc_temp_user_request": { "items": [] },`;
  await $`"user_story": { "items": [] },`;
  await $`"scenarios": { "items": [] },`;
  await $`"environment_tests": { "items": [] },`;
  await $`"external_tests": { "items": [] },`;
  await $`"system_tests_implement": { "items": [] },`;
  await $`"integration_tests_implement": { "items": [] },`;
  await $`"unit_tests": { "items": [] },`;
  await $`"integration_tests_verify": { "items": [] },`;
  await $`"system_tests_verify": { "items": [] },`;
  await $`"coverage_duplication": { "items": [] },`;
  await $`"retrospective": { "items": [] }`;
  await $`},`;
  await $`"global_config": {`;
  await $`"seldom_display_default": 5,`;
  await $`"operation_counters": {}`;
  await $`},`;
  await $`"priority_order": [`;
  await $`"adhoc_temp_user_request",`;
  await $`"environment_tests",`;
  await $`"external_tests",`;
  await $`"system_tests_implement",`;
  await $`"integration_tests_implement",`;
  await $`"unit_tests",`;
  await $`"integration_tests_verify",`;
  await $`"system_tests_verify",`;
  await $`"scenarios",`;
  await $`"user_story",`;
  await $`"coverage_duplication",`;
  await $`"retrospective"`;
  await $`]`;
  await $`}`;
  await $`EOF`;
  await $`print_message "$GREEN" "    ✓ Created sub-queue"`;
  }
  // Register with hierarchy
  await $`local relative_path="${queue_path#$PROJECT_ROOT/}"`;
  if ([ -f "$HIERARCHY_SCRIPT" ]) {; then
  await $`node "$HIERARCHY_SCRIPT" add "$relative_path" "$parent_queue_path"`;
  }
  await $`}`;
  // Function to setup hierarchy for all themes
  await $`setup_all_themes() {`;
  await $`print_message "$BLUE" "🔄 Setting up task queue hierarchy for all themes"`;
  await $`print_message "$BLUE" "================================================"`;
  console.log("");
  await $`local themes_dir="$PROJECT_ROOT/layer/themes"`;
  if ([ ! -d "$themes_dir" ]) {; then
  await $`print_message "$RED" "✗ Themes directory not found: $themes_dir"`;
  process.exit(1);
  }
  // Process each theme
  for (const theme_dir of ["$themes_dir"/*; do]) {
  if ([ -d "$theme_dir" ]) {; then
  await $`local theme_name=$(basename "$theme_dir")`;
  // Skip if not a valid theme directory
  if ([ "$theme_name" == ".*" ]] || [[ "$theme_name" == "node_modules" ]) {; then
  await $`continue`;
  }
  // Create main theme queue
  await $`create_theme_queue "$theme_dir"`;
  // Check for sub-directories that might need queues
  for (const subdir of ["$theme_dir"/*; do]) {
  if ([ -d "$subdir" ]) {; then
  await $`local subdir_name=$(basename "$subdir")`;
  // Check if it's a known sub-theme pattern
  await $`case "$subdir_name" in`;
  await $`user-stories|children|pipe|scripts|docs|tests)`;
  // These typically don't need their own queue
  await $`;;`;
  await $`layer)`;
  // This might have nested themes
  if ([ -d "$subdir/themes" ]) {; then
  for (const nested_theme of ["$subdir/themes"/*; do]) {
  if ([ -d "$nested_theme" ]) {; then
  await $`create_subtheme_queue "$theme_name" "$nested_theme"`;
  }
  }
  }
  await $`;;`;
  await $`*)`;
  // Check if it looks like it needs a queue
  if ([ -f "$subdir/package.json" ]] || [[ -f "$subdir/tsconfig.json" ]) {; then
  await $`create_subtheme_queue "$theme_name" "$subdir"`;
  }
  await $`;;`;
  await $`esac`;
  }
  }
  }
  }
  await $`}`;
  // Function to update registry
  await $`update_registry() {`;
  await $`print_message "$BLUE" "\n📊 Updating Task Queue Registry..."`;
  // Compile TypeScript if needed
  if ([ ! -f "$HIERARCHY_SCRIPT" ]) {; then
  await $`print_message "$YELLOW" "Compiling hierarchy manager..."`;
  process.chdir(""$(dirname "$HIERARCHY_SCRIPT")"");
  await $`bunx tsc manage-task-queue-hierarchy.ts`;
  }
  // Run discovery
  await $`node "$HIERARCHY_SCRIPT" discover`;
  await $`}`;
  // Function to validate hierarchy
  await $`validate_hierarchy() {`;
  await $`print_message "$BLUE" "\n🔍 Validating Hierarchy..."`;
  if ([ -f "$HIERARCHY_SCRIPT" ]) {; then
  await $`node "$HIERARCHY_SCRIPT" validate`;
  } else {
  await $`print_message "$RED" "✗ Hierarchy script not found"`;
  }
  await $`}`;
  // Function to show hierarchy
  await $`show_hierarchy() {`;
  if ([ -f "$HIERARCHY_SCRIPT" ]) {; then
  await $`node "$HIERARCHY_SCRIPT" show`;
  } else {
  await $`print_message "$RED" "✗ Hierarchy script not found"`;
  }
  await $`}`;
  // Main execution
  await $`case "${1:-setup}" in`;
  await $`setup)`;
  await $`setup_all_themes`;
  await $`update_registry`;
  await $`show_hierarchy`;
  await $`;;`;
  await $`validate)`;
  await $`validate_hierarchy`;
  await $`;;`;
  await $`show)`;
  await $`show_hierarchy`;
  await $`;;`;
  await $`fix)`;
  if ([ -f "$HIERARCHY_SCRIPT" ]) {; then
  await $`node "$HIERARCHY_SCRIPT" fix`;
  }
  await $`;;`;
  await $`add)`;
  if ([ -z "$2" ]) {; then
  await $`print_message "$RED" "Usage: $0 add <theme-path>"`;
  process.exit(1);
  }
  await $`create_theme_queue "$2"`;
  await $`update_registry`;
  await $`;;`;
  await $`help)`;
  await $`print_message "$BLUE" "Task Queue Hierarchy Setup"`;
  console.log("");
  console.log("Usage: $0 [command]");
  console.log("");
  console.log("Commands:");
  console.log("  setup    - Setup queues for all themes (default)");
  console.log("  validate - Validate parent-child relationships");
  console.log("  show     - Display current hierarchy");
  console.log("  fix      - Fix orphaned queues");
  console.log("  add <p>  - Add queue for specific theme");
  console.log("  help     - Show this help");
  await $`;;`;
  await $`*)`;
  await $`print_message "$RED" "Unknown command: $1"`;
  console.log("Run '$0 help' for usage");
  process.exit(1);
  await $`;;`;
  await $`esac`;
  await $`print_message "$GREEN" "\n✓ Task queue hierarchy setup complete!"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}