#!/usr/bin/env bun
/**
 * Migrated from: test_config.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.771Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Test Mode Configuration System
  // Supports two modes:
  // - normal: Safe tests that can run on any system
  // - dangerous_virtual_needed: Tests requiring VM/container isolation
  // Detect if running in virtual environment
  await $`detect_virtual_environment() {`;
  // Check for common virtualization indicators
  if (-f /.dockerenv ) {; then
  console.log("docker");
  await $`return 0`;
  }
  if (-n "${KUBERNETES_SERVICE_HOST}" ) {; then
  console.log("kubernetes");
  await $`return 0`;
  }
  await $`if systemd-detect-virt -q 2>/dev/null; then`;
  console.log("$(systemd-detect-virt)");
  await $`return 0`;
  }
  if (-f /proc/1/cgroup ) { && grep -q 'docker\|lxc\|kubepods' /proc/1/cgroup; then
  console.log("container");
  await $`return 0`;
  }
  // Check for VM indicators
  if (-f /sys/class/dmi/id/product_name ) {; then
  await $`product=$(cat /sys/class/dmi/id/product_name 2>/dev/null)`;
  await $`case "$product" in`;
  await $`*VirtualBox*|*VMware*|*KVM*|*Xen*|*Bochs*|*QEMU*)`;
  console.log("vm");
  await $`return 0`;
  await $`;;`;
  await $`esac`;
  }
  // Check for WSL
  await $`if grep -qi microsoft /proc/version 2>/dev/null; then`;
  console.log("wsl");
  await $`return 0`;
  }
  console.log("none");
  await $`return 1`;
  await $`}`;
  // Get test mode based on environment
  await $`get_test_mode() {`;
  // Check explicit environment variable
  if (-n "${TEST_MODE}" ) {; then
  console.log("${TEST_MODE}");
  await $`return`;
  }
  // Check if dangerous mode is explicitly enabled
  if ("${ENABLE_DANGEROUS_TESTS}" = "true" ] || [ "${ENABLE_DANGEROUS_TESTS}" = "1" ) {; then
  console.log("dangerous_virtual_needed");
  await $`return`;
  }
  // Auto-detect based on virtual environment
  await $`virt_type=$(detect_virtual_environment)`;
  if ("$virt_type" != "none" ) {; then
  // Default to dangerous mode in virtual environments
  if ("${DISABLE_DANGEROUS_TESTS}" != "true" ) {; then
  console.log("dangerous_virtual_needed");
  await $`return`;
  }
  }
  console.log("normal");
  await $`}`;
  // Check if a test should run based on its tags
  await $`should_run_test() {`;
  await $`local test_tags="$1"`;
  await $`local mode=$(get_test_mode)`;
  // If test has dangerous_virtual_needed tag
  await $`if echo "$test_tags" | grep -q "dangerous_virtual_needed"; then`;
  if ("$mode" = "dangerous_virtual_needed" ) {; then
  await $`return 0  # Run the test`;
  } else {
  await $`return 1  # Skip the test`;
  }
  }
  // Normal tests always run
  await $`return 0`;
  await $`}`;
  // Print current configuration
  await $`print_test_config() {`;
  console.log("========================================");
  console.log("Test Configuration");
  console.log("========================================");
  console.log("Virtual Environment: $(detect_virtual_environment)");
  console.log("Test Mode: $(get_test_mode)");
  console.log("Environment Variables:");
  console.log("  TEST_MODE: ${TEST_MODE:-<not set>}");
  console.log("  ENABLE_DANGEROUS_TESTS: ${ENABLE_DANGEROUS_TESTS:-<not set>}");
  console.log("  DISABLE_DANGEROUS_TESTS: ${DISABLE_DANGEROUS_TESTS:-<not set>}");
  console.log("========================================");
  await $`}`;
  // Export functions for use in other scripts
  await $`export -f detect_virtual_environment`;
  await $`export -f get_test_mode`;
  await $`export -f should_run_test`;
  await $`export -f print_test_config`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}