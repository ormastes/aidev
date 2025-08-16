#!/usr/bin/env bun
/**
 * Migrated from: build_and_test.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.606Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Build and test script for GTest CTest demo
  console.log("=== GTest CTest Integration Demo ===");
  await $`echo`;
  // Check if build directory exists
  if (-d "build" ) {; then
  console.log("Cleaning existing build directory...");
  await rm("build", { recursive: true, force: true });
  }
  // Create build directory
  console.log("Creating build directory...");
  await $`mkdir build`;
  process.chdir("build");
  // Configure with CMake
  console.log("Configuring with CMake...");
  await $`cmake .. -DCMAKE_BUILD_TYPE=Debug`;
  // Build the project
  console.log("Building project...");
  await $`cmake --build . --config Debug`;
  // List available tests
  await $`echo`;
  console.log("=== Available CTest tests ===");
  await $`ctest --show-only=json-v1 | python3 -m json.tool | grep -E '"name"|"command"' | head -20`;
  // Run all tests
  await $`echo`;
  console.log("=== Running all tests ===");
  await $`ctest --output-on-failure -V`;
  // Run specific test by name
  await $`echo`;
  console.log("=== Running specific test: MathOperationsTest.AddPositiveNumbers ===");
  await $`ctest -R "MathOperationsTest.AddPositiveNumbers" -V`;
  // Show test results summary
  await $`echo`;
  console.log("=== Test Summary ===");
  await $`ctest --show-only=json-v1 | python3 -c "`;
  await $`import json`;
  await $`import sys`;
  await $`data = json.load(sys.stdin)`;
  await $`if 'tests' in data:`;
  await $`print(f'Total tests discovered: {len(data[\"tests\"])}')`;
  await $`suites = set()`;
  for (const test of [data['tests']:]) {
  await $`if '.' in test['name']:`;
  await $`suite = test['name'].split('.')[0]`;
  await $`suites.add(suite)`;
  await $`print(f'Test suites: {len(suites)}')`;
  for (const suite of [sorted(suites):]) {
  await $`suite_tests = [t for t in data['tests'] if t['name'].startswith(suite + '.')]`;
  await $`print(f'  - {suite}: {len(suite_tests)} tests')`;
  await $`"`;
  await $`echo`;
  console.log("=== Demo complete ===");
  console.log("To use with VSCode extension:");
  console.log("1. Open the demo/gtest-example folder in VSCode");
  console.log("2. Open Test Explorer (testing icon in sidebar)");
  console.log("3. Look for 'CTest GTest' controller");
  console.log("4. Click refresh to discover tests");
  console.log("5. Run individual tests or all tests");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}