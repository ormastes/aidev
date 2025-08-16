#!/usr/bin/env bun
/**
 * Migrated from: setup_deepseek_r1.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.773Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup script for DeepSeek R1 Test Generator Demo
  console.log("==========================================");
  console.log("DeepSeek R1 Test Generator Setup");
  console.log("==========================================");
  // Check if running on Linux/Mac
  if ([ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]) {; then
  console.log("✓ Compatible OS detected: $OSTYPE");
  } else {
  console.log("⚠ Warning: This script is designed for Linux/Mac. Windows users should use WSL.");
  }
  // Step 1: Check Python
  console.log("-e ");\n[1/5] Checking Python installation..."
  await $`if command -v python3 &> /dev/null; then`;
  await $`PYTHON_VERSION=$(python3 --version)`;
  console.log("✓ Python installed: $PYTHON_VERSION");
  } else {
  console.log("✗ Python 3 not found. Please install Python 3.8 or higher.");
  process.exit(1);
  }
  // Step 2: Install Python dependencies
  console.log("-e ");\n[2/5] Installing Python dependencies..."
  await $`uv pip install --user libclang 2>/dev/null || echo "⚠ libclang installation failed (optional)"`;
  // Step 3: Check/Install Ollama
  console.log("-e ");\n[3/5] Checking Ollama installation..."
  await $`if command -v ollama &> /dev/null; then`;
  console.log("✓ Ollama is already installed");
  } else {
  console.log("✗ Ollama not found. Installing...");
  console.log("Please visit https://ollama.ai for installation instructions");
  console.log("");
  console.log("Quick install for Linux/Mac:");
  console.log("curl -fsSL https://ollama.ai/install.sh | sh");
  console.log("");
  await $`read -p "Press Enter after installing Ollama to continue..."`;
  }
  // Step 4: Pull DeepSeek R1 model
  console.log("-e ");\n[4/5] Pulling DeepSeek R1 model..."
  await $`if command -v ollama &> /dev/null; then`;
  console.log("This will download the DeepSeek R1 7B model (~4GB)");
  await $`read -p "Continue? (y/n) " -n 1 -r`;
  await $`echo`;
  if ([ $REPLY =~ ^[Yy]$ ]) {; then
  await $`ollama pull deepseek-r1:7b`;
  if ($? -eq 0 ) {; then
  console.log("✓ DeepSeek R1 model downloaded successfully");
  } else {
  console.log("✗ Failed to download model. Please check your internet connection.");
  }
  } else {
  console.log("⚠ Skipping model download. You'll need to run: ollama pull deepseek-r1:7b");
  }
  } else {
  console.log("⚠ Ollama not available. Skipping model download.");
  }
  // Step 5: Verify setup
  console.log("-e ");\n[5/5] Verifying setup..."
  console.log("Checking components:");
  // Check Python
  await $`python3 -c "print('✓ Python: OK')" 2>/dev/null || echo "✗ Python: FAILED"`;
  // Check Ollama
  await $`if command -v ollama &> /dev/null; then`;
  console.log("✓ Ollama: OK");
  // Check if model is available
  await $`if ollama list | grep -q "deepseek-r1:7b"; then`;
  console.log("✓ DeepSeek R1 Model: OK");
  } else {
  console.log("✗ DeepSeek R1 Model: NOT FOUND");
  }
  } else {
  console.log("✗ Ollama: NOT FOUND");
  }
  // Check test generator
  if (-f "../test_case_generator_llm.py" ) {; then
  console.log("✓ Test Generator: OK");
  } else {
  console.log("✗ Test Generator: NOT FOUND");
  }
  console.log("-e ");\n=========================================="
  console.log("Setup Complete!");
  console.log("==========================================");
  console.log("");
  console.log("To run the demo:");
  console.log("  ./run_demo.sh");
  console.log("");
  console.log("To manually test:");
  console.log("  python3 ../test_case_generator_llm.py -t src -m mocks -o output");
  console.log("");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}