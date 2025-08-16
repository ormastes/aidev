#!/usr/bin/env bun
/**
 * Migrated from: run_system_tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.736Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  await $`set -e`;
  // System Test Runner with Mode Support
  // Runs tests based on current mode (normal/dangerous_virtual_needed)
  // Load test configuration
  await $`source "$(dirname "$0")/test_config.sh"`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Test results
  await $`PASSED_TESTS=()`;
  await $`FAILED_TESTS=()`;
  await $`SKIPPED_TESTS=()`;
  // Print header
  await $`print_header() {`;
  console.log("-e ");${BLUE}========================================${NC}"
  console.log("-e ");${BLUE}System Test Runner${NC}"
  console.log("-e ");${BLUE}========================================${NC}"
  await $`print_test_config`;
  await $`}`;
  // Run a single test
  await $`run_test() {`;
  await $`local test_name="$1"`;
  await $`local test_script="$2"`;
  await $`local test_tags="${3:-}"`;
  // Check if test should run
  await $`if ! should_run_test "$test_tags"; then`;
  console.log("-e ");${YELLOW}[SKIP]${NC} $test_name (requires: $test_tags)"
  await $`SKIPPED_TESTS+=("$test_name")`;
  await $`return`;
  }
  console.log("-e ");${BLUE}[RUN]${NC} $test_name"
  if (-f "$test_script" ) {; then
  // Change to test directory if needed
  await $`test_dir=$(dirname "$test_script")`;
  await $`test_file=$(basename "$test_script")`;
  await $`if (cd "$test_dir" && bash "$test_file" > /tmp/test_output_$$.txt 2>&1); then`;
  console.log("-e ");${GREEN}[PASS]${NC} $test_name"
  await $`PASSED_TESTS+=("$test_name")`;
  } else {
  console.log("-e ");${RED}[FAIL]${NC} $test_name"
  console.log("Output:");
  await $`cat /tmp/test_output_$$.txt | sed 's/^/  /'`;
  await $`FAILED_TESTS+=("$test_name")`;
  }
  await $`rm -f /tmp/test_output_$$.txt`;
  } else {
  console.log("-e ");${RED}[ERROR]${NC} Test script not found: $test_script"
  await $`FAILED_TESTS+=("$test_name")`;
  }
  await $`}`;
  // Define tests with tags
  await $`declare -A TESTS`;
  await $`declare -A TEST_TAGS`;
  // Normal tests (safe to run anywhere)
  await $`TESTS["hello_world_cpp"]="hello_world_tests/cpp-cli/test.sh"`;
  await $`TEST_TAGS["hello_world_cpp"]=""`;
  await $`TESTS["hello_world_bash"]="hello_world_tests/bash-cli/test.sh"`;
  await $`TEST_TAGS["hello_world_bash"]=""`;
  await $`TESTS["cmake_build"]="tests/test_cmake_build.sh"`;
  await $`TEST_TAGS["cmake_build"]=""`;
  // Dangerous tests (require VM/container)
  await $`TESTS["docker_build"]="hello_world_tests/docker-app/test.sh"`;
  await $`TEST_TAGS["docker_build"]="dangerous_virtual_needed"`;
  await $`TESTS["system_modification"]="tests/test_system_modification.sh"`;
  await $`TEST_TAGS["system_modification"]="dangerous_virtual_needed"`;
  await $`TESTS["kernel_module"]="tests/test_kernel_module.sh"`;
  await $`TEST_TAGS["kernel_module"]="dangerous_virtual_needed"`;
  await $`TESTS["network_isolation"]="tests/test_network_isolation.sh"`;
  await $`TEST_TAGS["network_isolation"]="dangerous_virtual_needed"`;
  await $`TESTS["qemu_emulation"]="tests/test_qemu_emulation.sh"`;
  await $`TEST_TAGS["qemu_emulation"]="dangerous_virtual_needed"`;
  // New dangerous tests for features
  await $`TESTS["typescript_cli"]="tests/test_typescript_cli.sh"`;
  await $`TEST_TAGS["typescript_cli"]="dangerous_virtual_needed"`;
  await $`TESTS["python_web"]="tests/test_python_web.sh"`;
  await $`TEST_TAGS["python_web"]="dangerous_virtual_needed"`;
  await $`TESTS["cpp_library"]="tests/test_cpp_library.sh"`;
  await $`TEST_TAGS["cpp_library"]="dangerous_virtual_needed"`;
  await $`TESTS["electron_gui"]="tests/test_electron_gui.sh"`;
  await $`TEST_TAGS["electron_gui"]="dangerous_virtual_needed"`;
  await $`TESTS["react_native"]="tests/test_react_native.sh"`;
  await $`TEST_TAGS["react_native"]="dangerous_virtual_needed"`;
  // Main test execution
  await $`main() {`;
  await $`print_header`;
  console.log("-e ");\n${BLUE}Running Tests...${NC}\n"
  // Run all tests
  for (const test_name of ["${!TESTS[@]}"; do]) {
  await $`run_test "$test_name" "${TESTS[$test_name]}" "${TEST_TAGS[$test_name]}"`;
  }
  // Print summary
  console.log("-e ");\n${BLUE}========================================${NC}"
  console.log("-e ");${BLUE}Test Summary${NC}"
  console.log("-e ");${BLUE}========================================${NC}"
  console.log("-e ");${GREEN}Passed: ${#PASSED_TESTS[@]}${NC}"
  if (${#PASSED_TESTS[@]} -gt 0 ) {; then
  for (const test of ["${PASSED_TESTS[@]}"; do]) {
  console.log("-e ");  ✓ $test"
  }
  }
  console.log("-e ");${RED}Failed: ${#FAILED_TESTS[@]}${NC}"
  if (${#FAILED_TESTS[@]} -gt 0 ) {; then
  for (const test of ["${FAILED_TESTS[@]}"; do]) {
  console.log("-e ");  ✗ $test"
  }
  }
  console.log("-e ");${YELLOW}Skipped: ${#SKIPPED_TESTS[@]}${NC}"
  if (${#SKIPPED_TESTS[@]} -gt 0 ) {; then
  for (const test of ["${SKIPPED_TESTS[@]}"; do]) {
  console.log("-e ");  - $test"
  }
  }
  console.log("-e ");${BLUE}========================================${NC}"
  // Exit with error if any tests failed
  if (${#FAILED_TESTS[@]} -gt 0 ) {; then
  process.exit(1);
  }
  await $`}`;
  // Handle command line arguments
  while ([[ $# -gt 0 ]]; do) {
  await $`case $1 in`;
  await $`--mode)`;
  process.env.TEST_MODE = ""$2"";
  await $`shift 2`;
  await $`;;`;
  await $`--enable-dangerous)`;
  process.env.ENABLE_DANGEROUS_TESTS = ""true"";
  await $`shift`;
  await $`;;`;
  await $`--disable-dangerous)`;
  process.env.DISABLE_DANGEROUS_TESTS = ""true"";
  await $`shift`;
  await $`;;`;
  await $`--help)`;
  console.log("Usage: $0 [OPTIONS]");
  console.log("Options:");
  console.log("  --mode MODE              Set test mode (normal|dangerous_virtual_needed)");
  console.log("  --enable-dangerous       Enable dangerous tests");
  console.log("  --disable-dangerous      Disable dangerous tests even in VMs");
  console.log("  --help                   Show this help message");
  process.exit(0);
  await $`;;`;
  await $`*)`;
  console.log("Unknown option: $1");
  console.log("Use --help for usage information");
  process.exit(1);
  await $`;;`;
  await $`esac`;
  }
  await $`main`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}