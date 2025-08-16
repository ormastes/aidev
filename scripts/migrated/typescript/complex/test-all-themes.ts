#!/usr/bin/env bun
/**
 * Migrated from: test-all-themes.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.703Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Unified Theme Test Runner with Coverage Aggregation
  // Runs tests for all themes in both root and setup folders
  // Usage: ./test-all-themes.sh [--coverage] [--setup-only] [--root-only]
  await $`set -e`;
  // Get script directory and project root
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`CYAN='\033[0;36m'`;
  await $`NC='\033[0m' # No Color`;
  // Configuration
  await $`COVERAGE_ENABLED=false`;
  await $`SETUP_ONLY=false`;
  await $`ROOT_ONLY=false`;
  await $`FAILED_THEMES=()`;
  await $`TESTED_THEMES=()`;
  // Parse arguments
  while ([[ $# -gt 0 ]]; do) {
  await $`case $1 in`;
  await $`--coverage)`;
  await $`COVERAGE_ENABLED=true`;
  await $`shift`;
  await $`;;`;
  await $`--setup-only)`;
  await $`SETUP_ONLY=true`;
  await $`shift`;
  await $`;;`;
  await $`--root-only)`;
  await $`ROOT_ONLY=true`;
  await $`shift`;
  await $`;;`;
  await $`*)`;
  console.log("-e ");${RED}Unknown option: $1${NC}"
  process.exit(1);
  await $`;;`;
  await $`esac`;
  }
  // Logging functions
  await $`log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }`;
  await $`log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }`;
  await $`log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }`;
  await $`log_error() { echo -e "${RED}[ERROR]${NC} $1"; }`;
  await $`log_theme() { echo -e "${CYAN}[THEME]${NC} $1"; }`;
  // Test a single theme
  await $`test_theme() {`;
  await $`local theme_path="$1"`;
  await $`local theme_name="$2"`;
  await $`local theme_type="$3"  # root or setup`;
  await $`log_theme "Testing $theme_type theme: $theme_name"`;
  // Check if theme has tests
  if ([ ! -d "$theme_path/tests" ]] && [[ ! -d "$theme_path/user-stories" ]) {; then
  await $`log_warning "No tests found for $theme_name"`;
  await $`return 0`;
  }
  // Check for jest.config.js
  if ([ ! -f "$theme_path/jest.config.js" ]] && [[ ! -f "$theme_path/package.json" ]) {; then
  await $`log_warning "No test configuration found for $theme_name"`;
  await $`return 0`;
  }
  process.chdir(""$theme_path"");
  // Install dependencies if needed
  if ([ -f "package.json" ]] && [[ ! -d "node_modules" ]) {; then
  await $`log_info "Installing dependencies for $theme_name..."`;
  await $`if command -v bun &> /dev/null; then`;
  await $`bun install --silent`;
  } else {
  await $`bun install --silent`;
  }
  }
  // Run tests
  await $`local test_cmd="bun test"`;
  if ([ "$COVERAGE_ENABLED" == true ]) {; then
  await $`test_cmd="bun test --coverage"`;
  }
  await $`if $test_cmd; then`;
  await $`log_success "$theme_name tests passed"`;
  await $`TESTED_THEMES+=("$theme_type:$theme_name")`;
  // Copy coverage data to aggregation directory if coverage is enabled
  if ([ "$COVERAGE_ENABLED" == true ]] && [[ -f "coverage/coverage-final.json" ]) {; then
  await $`local agg_dir="$PROJECT_ROOT/gen/coverage/themes/$theme_type/$theme_name"`;
  await mkdir(""$agg_dir"", { recursive: true });
  await copyFile("-r coverage/*", ""$agg_dir/"");
  await $`log_info "Coverage data copied for $theme_name"`;
  }
  await $`return 0`;
  } else {
  await $`log_error "$theme_name tests failed"`;
  await $`FAILED_THEMES+=("$theme_type:$theme_name")`;
  await $`return 1`;
  }
  await $`}`;
  // Test all themes in a directory
  await $`test_themes_in_directory() {`;
  await $`local base_dir="$1"`;
  await $`local type="$2"`;
  if ([ ! -d "$base_dir" ]) {; then
  await $`log_warning "Directory not found: $base_dir"`;
  await $`return`;
  }
  await $`log_info "Scanning $type themes in: $base_dir"`;
  for (const theme_dir of ["$base_dir"/*; do]) {
  if ([ -d "$theme_dir" ]] && [[ "$(basename "$theme_dir")" != "shared" ]) {; then
  await $`local theme_name=$(basename "$theme_dir")`;
  await $`test_theme "$theme_dir" "$theme_name" "$type" || true`;
  }
  }
  await $`}`;
  // Test root themes
  await $`test_root_themes() {`;
  await $`log_info "Testing root themes..."`;
  await $`test_themes_in_directory "$PROJECT_ROOT/layer/themes" "root"`;
  await $`}`;
  // Test setup themes
  await $`test_setup_themes() {`;
  await $`log_info "Testing setup themes..."`;
  // Test demo themes
  for (const demo_dir of ["$PROJECT_ROOT/scripts/setup/demo"/*; do]) {
  if ([ -d "$demo_dir" ]] && [[ -f "$demo_dir/package.json" ]) {; then
  await $`local demo_name=$(basename "$demo_dir")`;
  await $`test_theme "$demo_dir" "$demo_name" "setup-demo" || true`;
  }
  }
  // Test release themes
  for (const release_dir of ["$PROJECT_ROOT/scripts/setup/release"/*; do]) {
  if ([ -d "$release_dir" ]] && [[ -f "$release_dir/package.json" ]) {; then
  await $`local release_name=$(basename "$release_dir")`;
  await $`test_theme "$release_dir" "$release_name" "setup-release" || true`;
  }
  }
  await $`}`;
  // Aggregate coverage reports
  await $`aggregate_coverage() {`;
  await $`log_info "Aggregating coverage reports..."`;
  // Use coverage-aggregator theme if available
  await $`local aggregator_path="$PROJECT_ROOT/layer/themes/coverage-aggregator/user-stories/001-app-level-coverage"`;
  if ([ -d "$aggregator_path" ]) {; then
  process.chdir(""$aggregator_path"");
  // Install dependencies if needed
  if ([ ! -d "node_modules" ]) {; then
  await $`if command -v bun &> /dev/null; then`;
  await $`bun install --silent`;
  } else {
  await $`bun install --silent`;
  }
  }
  // Run aggregation
  if ([ -f "scripts/generate-coverage-report.ts" ]) {; then
  await $`if command -v bun &> /dev/null; then`;
  await $`bunx ts-node scripts/generate-coverage-report.ts "$PROJECT_ROOT/layer" "$PROJECT_ROOT/gen/doc/coverage"`;
  } else {
  await $`bunx ts-node scripts/generate-coverage-report.ts "$PROJECT_ROOT/layer" "$PROJECT_ROOT/gen/doc/coverage"`;
  }
  await $`log_success "Coverage aggregation completed"`;
  } else {
  await $`log_warning "Coverage aggregator script not found"`;
  }
  } else {
  await $`log_warning "Coverage aggregator theme not found"`;
  }
  await $`}`;
  // Main execution
  await $`main() {`;
  console.log("-e ");${CYAN}=== Unified Theme Test Runner ===${NC}"
  console.log("Coverage: $([ ");$COVERAGE_ENABLED" == true ] && echo "ENABLED" || echo "DISABLED")"
  await $`echo`;
  // Create coverage directory if needed
  if ([ "$COVERAGE_ENABLED" == true ]) {; then
  await mkdir(""$PROJECT_ROOT/gen/coverage/themes"", { recursive: true });
  }
  // Run tests based on options
  if ([ "$SETUP_ONLY" != true ]) {; then
  await $`test_root_themes`;
  }
  if ([ "$ROOT_ONLY" != true ]) {; then
  await $`test_setup_themes`;
  }
  // Aggregate coverage if enabled
  if ([ "$COVERAGE_ENABLED" == true ]) {; then
  await $`aggregate_coverage`;
  }
  // Summary
  await $`echo`;
  console.log("-e ");${CYAN}=== Test Summary ===${NC}"
  console.log("Tested themes: ${#TESTED_THEMES[@]}");
  console.log("Failed themes: ${#FAILED_THEMES[@]}");
  if ([ ${#TESTED_THEMES[@]} -gt 0 ]) {; then
  await $`echo`;
  console.log("-e ");${GREEN}Tested themes:${NC}"
  for (const theme of ["${TESTED_THEMES[@]}"; do]) {
  console.log("  ✓ $theme");
  }
  }
  if ([ ${#FAILED_THEMES[@]} -gt 0 ]) {; then
  await $`echo`;
  console.log("-e ");${RED}Failed themes:${NC}"
  for (const theme of ["${FAILED_THEMES[@]}"; do]) {
  console.log("  ✗ $theme");
  }
  process.exit(1);
  } else {
  await $`echo`;
  console.log("-e ");${GREEN}All tests passed!${NC}"
  if ([ "$COVERAGE_ENABLED" == true ]) {; then
  console.log("-e ");${GREEN}Coverage reports generated in: $PROJECT_ROOT/gen/doc/coverage${NC}"
  }
  }
  await $`}`;
  // Run main function
  await $`main`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}