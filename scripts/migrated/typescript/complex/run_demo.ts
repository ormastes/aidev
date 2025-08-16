#!/usr/bin/env bun
/**
 * Migrated from: run_demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.792Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("==================================================");
  console.log("DeepSeek R1 Test Generator Demo");
  console.log("==================================================");
  // Check if Ollama is installed
  await $`if ! command -v ollama &> /dev/null; then`;
  console.log("❌ Ollama is not installed!");
  console.log("");
  console.log("To install Ollama:");
  console.log("  curl -fsSL https://ollama.ai/install.sh | sh");
  console.log("");
  console.log("After installing, run:");
  console.log("  ollama pull deepseek-r1:7b");
  process.exit(1);
  }
  // Check if DeepSeek R1 is available
  await $`if ! ollama list | grep -q "deepseek-r1:7b"; then`;
  console.log("❌ DeepSeek R1 model not found!");
  console.log("");
  console.log("To download the model (4GB):");
  console.log("  ollama pull deepseek-r1:7b");
  console.log("");
  console.log("This will download the DeepSeek R1 7B model.");
  process.exit(1);
  }
  console.log("✅ Ollama and DeepSeek R1 are ready!");
  console.log("");
  // Run the test generator
  console.log("Generating tests for StringUtils class...");
  await $`python3 ../test_generator_simple.py StringUtils.h -c StringUtils.cpp -o tests_generated -v`;
  console.log("");
  console.log("==================================================");
  console.log("Demo Complete!");
  console.log("==================================================");
  console.log("");
  console.log("Generated test file: tests_generated/StringUtilsTest.cpp");
  console.log("");
  console.log("To compile and run the tests:");
  console.log("  g++ -std=c++14 tests_generated/StringUtilsTest.cpp StringUtils.cpp -lgtest -lgtest_main -pthread -o run_tests");
  console.log("  ./run_tests");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}