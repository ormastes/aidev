#!/usr/bin/env bun
/**
 * Migrated from: build_manual.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.586Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Manual build script for bypass-build-demo (when cmake is not available)
  console.log("=== Manual Build Script for Bypass Build Demo ===");
  // Create build directory
  await mkdir("build", { recursive: true });
  process.chdir("build");
  console.log("Building hello_world executable...");
  await $`g++ -std=c++17 -I../include ../src/main.cpp ../src/hello.cpp -o hello_world`;
  console.log("Building hello_tests executable...");
  await $`g++ -std=c++17 -I../include ../src/test_main.cpp ../src/hello.cpp -o hello_tests`;
  console.log("Testing executables...");
  console.log("--- Testing hello_world ---");
  await $`./hello_world`;
  console.log("");
  console.log("--- Testing hello_tests (list tests) ---");
  await $`./hello_tests GetTcList:`;
  console.log("");
  console.log("--- Testing hello_tests (run specific test) ---");
  await $`./hello_tests "TC/HelloSuite::BasicGreeting"`;
  console.log("");
  console.log("=== Build and Test Complete ===");
  console.log("Executables created:");
  await $`ls -la hello_world hello_tests`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}