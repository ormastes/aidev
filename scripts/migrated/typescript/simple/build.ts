#!/usr/bin/env bun
/**
 * Migrated from: build.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.588Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  await $`set -e`;
  // Clean previous build
  await rm("build", { recursive: true, force: true });
  await mkdir("build", { recursive: true });
  process.chdir("build");
  // Set compilers if not already set
  process.env.CC = "${CC:-clang}";
  process.env.CXX = "${CXX:-clang++}";
  // Install dependencies with Conan (if conanfile.txt has dependencies)
  await $`if command -v conan &> /dev/null; then`;
  await $`conan install .. --build=missing`;
  }
  // Configure with CMake using Ninja generator
  await $`if command -v ninja &> /dev/null; then`;
  await $`cmake .. -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=$CC -DCMAKE_CXX_COMPILER=$CXX`;
  await $`ninja`;
  } else {
  await $`cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=$CC -DCMAKE_CXX_COMPILER=$CXX`;
  await $`make -j$(nproc)`;
  }
  console.log("Build complete. Executable: build/hello");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}