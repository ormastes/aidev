#!/usr/bin/env bun
/**
 * Migrated from: test-health-check.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.732Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Test Health Check Script for AI Development Platform
  // Analyzes and reports test status for all themes
  console.log("================================================");
  console.log("AI Development Platform - Test Health Check");
  console.log("Date: $(date)");
  console.log("================================================");
  console.log("");
  // Color codes for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Base directory
  await $`BASE_DIR="/home/ormastes/dev/aidev/layer/themes"`;
  // Counters
  await $`TOTAL_THEMES=0`;
  await $`PASSING_THEMES=0`;
  await $`FAILING_THEMES=0`;
  await $`NO_TEST_THEMES=0`;
  await $`TIMEOUT_THEMES=0`;
  // Results array
  await $`declare -A TEST_RESULTS`;
  // Function to check if package.json exists
  await $`check_package_json() {`;
  await $`local theme_dir=$1`;
  if (-f "$theme_dir/package.json" ) {; then
  await $`return 0`;
  }
  await $`return 1`;
  await $`}`;
  // Function to run tests with timeout
  await $`run_tests() {`;
  await $`local theme_dir=$1`;
  await $`local theme_name=$2`;
  process.chdir(""$theme_dir" || return 1");
  // Run tests with timeout
  await $`timeout 20s bun test --silent 2>&1 | head -100`;
  await $`local exit_code=$?`;
  if ($exit_code -eq 124 ) {; then
  console.log("TIMEOUT");
  await $`return 124`;
  await $`elif [ $exit_code -eq 0 ]; then`;
  console.log("PASS");
  await $`return 0`;
  } else {
  console.log("FAIL");
  await $`return 1`;
  }
  await $`}`;
  // Function to check test coverage
  await $`check_coverage() {`;
  await $`local theme_dir=$1`;
  process.chdir(""$theme_dir" || return");
  // Try to get coverage if tests pass
  await $`bun test --coverage --silent 2>&1 | grep -A 5 "Coverage" || echo "No coverage data"`;
  await $`}`;
  // Main analysis loop
  console.log("Analyzing themes...");
  console.log("==================");
  console.log("");
  for (const theme_path of ["$BASE_DIR"/*; do]) {
  if (-d "$theme_path" ) {; then
  await $`theme_name=$(basename "$theme_path")`;
  // Skip non-theme directories
  if ([ "$theme_name" == "temp" ]] || [[ "$theme_name" == ".vscode" ]) {; then
  await $`continue`;
  }
  await $`TOTAL_THEMES=$((TOTAL_THEMES + 1))`;
  console.log("-n ");Testing $theme_name... "
  await $`if ! check_package_json "$theme_path"; then`;
  console.log("-e ");${YELLOW}NO PACKAGE.JSON${NC}"
  await $`NO_TEST_THEMES=$((NO_TEST_THEMES + 1))`;
  await $`TEST_RESULTS["$theme_name"]="NO_PACKAGE"`;
  await $`continue`;
  }
  // Check if test script exists in package.json
  await $`if ! grep -q '"test"' "$theme_path/package.json"; then`;
  console.log("-e ");${YELLOW}NO TEST SCRIPT${NC}"
  await $`NO_TEST_THEMES=$((NO_TEST_THEMES + 1))`;
  await $`TEST_RESULTS["$theme_name"]="NO_TEST_SCRIPT"`;
  await $`continue`;
  }
  // Run tests
  await $`test_output=$(run_tests "$theme_path" "$theme_name")`;
  if ([ "$test_output" == "TIMEOUT" ]) {; then
  console.log("-e ");${YELLOW}TIMEOUT${NC}"
  await $`TIMEOUT_THEMES=$((TIMEOUT_THEMES + 1))`;
  await $`TEST_RESULTS["$theme_name"]="TIMEOUT"`;
  await $`elif [[ "$test_output" == "PASS" ]]; then`;
  console.log("-e ");${GREEN}PASS${NC}"
  await $`PASSING_THEMES=$((PASSING_THEMES + 1))`;
  await $`TEST_RESULTS["$theme_name"]="PASS"`;
  } else {
  console.log("-e ");${RED}FAIL${NC}"
  await $`FAILING_THEMES=$((FAILING_THEMES + 1))`;
  await $`TEST_RESULTS["$theme_name"]="FAIL"`;
  }
  }
  }
  // Summary Report
  console.log("");
  console.log("================================================");
  console.log("TEST HEALTH SUMMARY");
  console.log("================================================");
  console.log("");
  console.log("-e ");Total Themes:    ${BLUE}$TOTAL_THEMES${NC}"
  console.log("-e ");Passing:         ${GREEN}$PASSING_THEMES${NC} ($(( PASSING_THEMES * 100 / TOTAL_THEMES ))%)"
  console.log("-e ");Failing:         ${RED}$FAILING_THEMES${NC} ($(( FAILING_THEMES * 100 / TOTAL_THEMES ))%)"
  console.log("-e ");Timeout:         ${YELLOW}$TIMEOUT_THEMES${NC} ($(( TIMEOUT_THEMES * 100 / TOTAL_THEMES ))%)"
  console.log("-e ");No Tests:        ${YELLOW}$NO_TEST_THEMES${NC} ($(( NO_TEST_THEMES * 100 / TOTAL_THEMES ))%)"
  console.log("");
  // Platform Health Score
  await $`HEALTH_SCORE=$(( PASSING_THEMES * 100 / TOTAL_THEMES ))`;
  console.log("-n ");Platform Health Score: "
  if ($HEALTH_SCORE -ge 80 ) {; then
  console.log("-e ");${GREEN}$HEALTH_SCORE/100 (HEALTHY)${NC}"
  await $`elif [ $HEALTH_SCORE -ge 50 ]; then`;
  console.log("-e ");${YELLOW}$HEALTH_SCORE/100 (NEEDS ATTENTION)${NC}"
  } else {
  console.log("-e ");${RED}$HEALTH_SCORE/100 (CRITICAL)${NC}"
  }
  console.log("");
  console.log("================================================");
  console.log("DETAILED RESULTS");
  console.log("================================================");
  console.log("");
  // List themes by status
  console.log("-e ");${GREEN}PASSING THEMES:${NC}"
  for (const theme of ["${!TEST_RESULTS[@]}"; do]) {
  if ([ "${TEST_RESULTS[$theme]}" == "PASS" ]) {; then
  console.log("  ✓ $theme");
  }
  }
  console.log("");
  console.log("-e ");${RED}FAILING THEMES:${NC}"
  for (const theme of ["${!TEST_RESULTS[@]}"; do]) {
  if ([ "${TEST_RESULTS[$theme]}" == "FAIL" ]) {; then
  console.log("  ✗ $theme");
  }
  }
  console.log("");
  console.log("-e ");${YELLOW}TIMEOUT THEMES:${NC}"
  for (const theme of ["${!TEST_RESULTS[@]}"; do]) {
  if ([ "${TEST_RESULTS[$theme]}" == "TIMEOUT" ]) {; then
  console.log("  ⏱ $theme");
  }
  }
  console.log("");
  console.log("-e ");${YELLOW}NO TEST THEMES:${NC}"
  for (const theme of ["${!TEST_RESULTS[@]}"; do]) {
  if ([ "${TEST_RESULTS[$theme]}" == "NO_PACKAGE" ]] || [[ "${TEST_RESULTS[$theme]}" == "NO_TEST_SCRIPT" ]) {; then
  console.log("  ⚠ $theme (${TEST_RESULTS[$theme]})");
  }
  }
  console.log("");
  console.log("================================================");
  console.log("Report complete. Check individual themes for details.");
  console.log("================================================");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}