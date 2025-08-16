#!/usr/bin/env bun
/**
 * Migrated from: final_demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.610Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("==================================================");
  console.log("DeepSeek R1 C++ Test Generator Demo");
  console.log("==================================================");
  // Check if Ollama is running
  await $`if ! pgrep -x "ollama" > /dev/null; then`;
  console.log("❌ Ollama service is not running!");
  console.log("Starting Ollama...");
  await $`sudo systemctl start ollama`;
  await Bun.sleep(2 * 1000);
  }
  // Verify DeepSeek R1 is available
  await $`if ! ollama list | grep -q "deepseek-r1:7b"; then`;
  console.log("❌ DeepSeek R1 not found!");
  process.exit(1);
  }
  console.log("✅ Ollama with DeepSeek R1 is ready!");
  console.log("");
  // Run the enhanced test generator
  console.log("Generating tests for StringUtils class...");
  console.log("This uses:");
  console.log("- Deep code analysis");
  console.log("- New chat session per file");
  console.log("- DeepSeek R1 for intelligent test generation");
  console.log("");
  process.chdir("/home/ormastes/dev/aidev/demo/test-creator");
  // Run with increased timeout
  await $`python3 test_generator_enhanced.py \`;
  await $`demo_deepseek/StringUtils.h \`;
  await $`-c demo_deepseek/StringUtils.cpp \`;
  await $`-o demo_deepseek/tests_final \`;
  await $`--model deepseek-r1:7b \`;
  await $`-v`;
  console.log("");
  console.log("==================================================");
  console.log("Demo Complete!");
  console.log("==================================================");
  console.log("");
  console.log("Generated test file: demo_deepseek/tests_final/StringUtilsTest.cpp");
  console.log("");
  console.log("The test file includes:");
  console.log("- Detailed method analysis comments");
  console.log("- Verifier: DeepSeek R1 tags");
  console.log("- Comprehensive test implementations");
  console.log("- Edge case coverage");
  console.log("");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}