#!/usr/bin/env python3
"""
Migrated from: test-all-themes.sh
Auto-generated Python - 2025-08-16T04:57:27.704Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Unified Theme Test Runner with Coverage Aggregation
    # Runs tests for all themes in both root and setup folders
    # Usage: ./test-all-themes.sh [--coverage] [--setup-only] [--root-only]
    subprocess.run("set -e", shell=True)
    # Get script directory and project root
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"", shell=True)
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("CYAN='\033[0;36m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Configuration
    subprocess.run("COVERAGE_ENABLED=false", shell=True)
    subprocess.run("SETUP_ONLY=false", shell=True)
    subprocess.run("ROOT_ONLY=false", shell=True)
    subprocess.run("FAILED_THEMES=()", shell=True)
    subprocess.run("TESTED_THEMES=()", shell=True)
    # Parse arguments
    while [[ $# -gt 0 ]]; do:
    subprocess.run("case $1 in", shell=True)
    subprocess.run("--coverage)", shell=True)
    subprocess.run("COVERAGE_ENABLED=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--setup-only)", shell=True)
    subprocess.run("SETUP_ONLY=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--root-only)", shell=True)
    subprocess.run("ROOT_ONLY=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("-e ")${RED}Unknown option: $1${NC}"
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    # Logging functions
    subprocess.run("log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }", shell=True)
    subprocess.run("log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }", shell=True)
    subprocess.run("log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }", shell=True)
    subprocess.run("log_error() { echo -e "${RED}[ERROR]${NC} $1"; }", shell=True)
    subprocess.run("log_theme() { echo -e "${CYAN}[THEME]${NC} $1"; }", shell=True)
    # Test a single theme
    subprocess.run("test_theme() {", shell=True)
    subprocess.run("local theme_path="$1"", shell=True)
    subprocess.run("local theme_name="$2"", shell=True)
    subprocess.run("local theme_type="$3"  # root or setup", shell=True)
    subprocess.run("log_theme "Testing $theme_type theme: $theme_name"", shell=True)
    # Check if theme has tests
    if [ ! -d "$theme_path/tests" ]] && [[ ! -d "$theme_path/user-stories" ]:; then
    subprocess.run("log_warning "No tests found for $theme_name"", shell=True)
    subprocess.run("return 0", shell=True)
    # Check for jest.config.js
    if [ ! -f "$theme_path/jest.config.js" ]] && [[ ! -f "$theme_path/package.json" ]:; then
    subprocess.run("log_warning "No test configuration found for $theme_name"", shell=True)
    subprocess.run("return 0", shell=True)
    os.chdir(""$theme_path"")
    # Install dependencies if needed
    if [ -f "package.json" ]] && [[ ! -d "node_modules" ]:; then
    subprocess.run("log_info "Installing dependencies for $theme_name..."", shell=True)
    subprocess.run("if command -v bun &> /dev/null; then", shell=True)
    subprocess.run("bun install --silent", shell=True)
    else:
    subprocess.run("bun install --silent", shell=True)
    # Run tests
    subprocess.run("local test_cmd="bun test"", shell=True)
    if [ "$COVERAGE_ENABLED" == true ]:; then
    subprocess.run("test_cmd="bun test --coverage"", shell=True)
    subprocess.run("if $test_cmd; then", shell=True)
    subprocess.run("log_success "$theme_name tests passed"", shell=True)
    subprocess.run("TESTED_THEMES+=("$theme_type:$theme_name")", shell=True)
    # Copy coverage data to aggregation directory if coverage is enabled
    if [ "$COVERAGE_ENABLED" == true ]] && [[ -f "coverage/coverage-final.json" ]:; then
    subprocess.run("local agg_dir="$PROJECT_ROOT/gen/coverage/themes/$theme_type/$theme_name"", shell=True)
    Path(""$agg_dir"").mkdir(parents=True, exist_ok=True)
    shutil.copy2("-r coverage/*", ""$agg_dir/"")
    subprocess.run("log_info "Coverage data copied for $theme_name"", shell=True)
    subprocess.run("return 0", shell=True)
    else:
    subprocess.run("log_error "$theme_name tests failed"", shell=True)
    subprocess.run("FAILED_THEMES+=("$theme_type:$theme_name")", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Test all themes in a directory
    subprocess.run("test_themes_in_directory() {", shell=True)
    subprocess.run("local base_dir="$1"", shell=True)
    subprocess.run("local type="$2"", shell=True)
    if [ ! -d "$base_dir" ]:; then
    subprocess.run("log_warning "Directory not found: $base_dir"", shell=True)
    subprocess.run("return", shell=True)
    subprocess.run("log_info "Scanning $type themes in: $base_dir"", shell=True)
    for theme_dir in ["$base_dir"/*; do]:
    if [ -d "$theme_dir" ]] && [[ "$(basename "$theme_dir")" != "shared" ]:; then
    subprocess.run("local theme_name=$(basename "$theme_dir")", shell=True)
    subprocess.run("test_theme "$theme_dir" "$theme_name" "$type" || true", shell=True)
    subprocess.run("}", shell=True)
    # Test root themes
    subprocess.run("test_root_themes() {", shell=True)
    subprocess.run("log_info "Testing root themes..."", shell=True)
    subprocess.run("test_themes_in_directory "$PROJECT_ROOT/layer/themes" "root"", shell=True)
    subprocess.run("}", shell=True)
    # Test setup themes
    subprocess.run("test_setup_themes() {", shell=True)
    subprocess.run("log_info "Testing setup themes..."", shell=True)
    # Test demo themes
    for demo_dir in ["$PROJECT_ROOT/scripts/setup/demo"/*; do]:
    if [ -d "$demo_dir" ]] && [[ -f "$demo_dir/package.json" ]:; then
    subprocess.run("local demo_name=$(basename "$demo_dir")", shell=True)
    subprocess.run("test_theme "$demo_dir" "$demo_name" "setup-demo" || true", shell=True)
    # Test release themes
    for release_dir in ["$PROJECT_ROOT/scripts/setup/release"/*; do]:
    if [ -d "$release_dir" ]] && [[ -f "$release_dir/package.json" ]:; then
    subprocess.run("local release_name=$(basename "$release_dir")", shell=True)
    subprocess.run("test_theme "$release_dir" "$release_name" "setup-release" || true", shell=True)
    subprocess.run("}", shell=True)
    # Aggregate coverage reports
    subprocess.run("aggregate_coverage() {", shell=True)
    subprocess.run("log_info "Aggregating coverage reports..."", shell=True)
    # Use coverage-aggregator theme if available
    subprocess.run("local aggregator_path="$PROJECT_ROOT/layer/themes/coverage-aggregator/user-stories/001-app-level-coverage"", shell=True)
    if [ -d "$aggregator_path" ]:; then
    os.chdir(""$aggregator_path"")
    # Install dependencies if needed
    if [ ! -d "node_modules" ]:; then
    subprocess.run("if command -v bun &> /dev/null; then", shell=True)
    subprocess.run("bun install --silent", shell=True)
    else:
    subprocess.run("bun install --silent", shell=True)
    # Run aggregation
    if [ -f "scripts/generate-coverage-report.ts" ]:; then
    subprocess.run("if command -v bun &> /dev/null; then", shell=True)
    subprocess.run("bunx ts-node scripts/generate-coverage-report.ts "$PROJECT_ROOT/layer" "$PROJECT_ROOT/gen/doc/coverage"", shell=True)
    else:
    subprocess.run("bunx ts-node scripts/generate-coverage-report.ts "$PROJECT_ROOT/layer" "$PROJECT_ROOT/gen/doc/coverage"", shell=True)
    subprocess.run("log_success "Coverage aggregation completed"", shell=True)
    else:
    subprocess.run("log_warning "Coverage aggregator script not found"", shell=True)
    else:
    subprocess.run("log_warning "Coverage aggregator theme not found"", shell=True)
    subprocess.run("}", shell=True)
    # Main execution
    subprocess.run("main() {", shell=True)
    print("-e ")${CYAN}=== Unified Theme Test Runner ===${NC}"
    print("Coverage: $([ ")$COVERAGE_ENABLED" == true ] && echo "ENABLED" || echo "DISABLED")"
    subprocess.run("echo", shell=True)
    # Create coverage directory if needed
    if [ "$COVERAGE_ENABLED" == true ]:; then
    Path(""$PROJECT_ROOT/gen/coverage/themes"").mkdir(parents=True, exist_ok=True)
    # Run tests based on options
    if [ "$SETUP_ONLY" != true ]:; then
    subprocess.run("test_root_themes", shell=True)
    if [ "$ROOT_ONLY" != true ]:; then
    subprocess.run("test_setup_themes", shell=True)
    # Aggregate coverage if enabled
    if [ "$COVERAGE_ENABLED" == true ]:; then
    subprocess.run("aggregate_coverage", shell=True)
    # Summary
    subprocess.run("echo", shell=True)
    print("-e ")${CYAN}=== Test Summary ===${NC}"
    print("Tested themes: ${#TESTED_THEMES[@]}")
    print("Failed themes: ${#FAILED_THEMES[@]}")
    if [ ${#TESTED_THEMES[@]} -gt 0 ]:; then
    subprocess.run("echo", shell=True)
    print("-e ")${GREEN}Tested themes:${NC}"
    for theme in ["${TESTED_THEMES[@]}"; do]:
    print("  ✓ $theme")
    if [ ${#FAILED_THEMES[@]} -gt 0 ]:; then
    subprocess.run("echo", shell=True)
    print("-e ")${RED}Failed themes:${NC}"
    for theme in ["${FAILED_THEMES[@]}"; do]:
    print("  ✗ $theme")
    sys.exit(1)
    else:
    subprocess.run("echo", shell=True)
    print("-e ")${GREEN}All tests passed!${NC}"
    if [ "$COVERAGE_ENABLED" == true ]:; then
    print("-e ")${GREEN}Coverage reports generated in: $PROJECT_ROOT/gen/doc/coverage${NC}"
    subprocess.run("}", shell=True)
    # Run main function
    subprocess.run("main", shell=True)

if __name__ == "__main__":
    main()