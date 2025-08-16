#!/usr/bin/env bun
/**
 * Migrated from: build_and_run.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.582Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Build and run Cucumber-CPP examples
  console.log("============================================");
  console.log("  Building Cucumber-CPP Examples");
  console.log("============================================");
  // Create build directory
  await mkdir("build", { recursive: true });
  process.chdir("build");
  // Configure with CMake
  console.log("Configuring with CMake...");
  await $`cmake ..`;
  // Build the examples
  console.log("Building examples...");
  await $`make -j4`;
  console.log("");
  console.log("============================================");
  console.log("  Running Simple Demo");
  console.log("============================================");
  if (-f simple_demo ) {; then
  await $`./simple_demo`;
  } else {
  console.log("simple_demo not found, building separately...");
  await $`g++ -std=c++17 ../simple_demo.cpp ../../src/gherkin_parser.cpp ../../src/manual_generator.cpp -I../../include -o simple_demo`;
  await $`./simple_demo`;
  }
  console.log("");
  console.log("============================================");
  console.log("  Running Manual Test Generator");
  console.log("============================================");
  if (-f manual_test_example ) {; then
  await $`./manual_test_example`;
  } else {
  console.log("Manual test example not built");
  }
  console.log("");
  console.log("============================================");
  console.log("  Generated Files");
  console.log("============================================");
  await $`ls -la *.md *.html *.json 2>/dev/null || echo "No documentation files generated yet"`;
  console.log("");
  console.log("============================================");
  console.log("  Build Complete!");
  console.log("============================================");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}