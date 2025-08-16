#!/usr/bin/env bun
/**
 * Migrated from: setup_ollama_clean.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.583Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🔧 Setting up Ollama Clean Response Tool...");
  // Create convenient shell function
  await $`cat >> ~/.bashrc << 'EOF'`;
  // Ollama Clean - Query without thinking tags
  await $`ollama-clean() {`;
  await $`python3 /home/ormastes/dev/aidev/ollama_clean.py "$@"`;
  await $`}`;
  // Ollama Chat Clean - Interactive chat without thinking
  await $`ollama-chat() {`;
  await $`python3 /home/ormastes/dev/aidev/ollama_clean.py --chat "$@"`;
  await $`}`;
  // Quick DeepSeek query
  await $`deepseek() {`;
  await $`python3 /home/ormastes/dev/aidev/ollama_clean.py "$1" --model deepseek-r1:32b`;
  await $`}`;
  // DeepSeek with thinking shown
  await $`deepseek-think() {`;
  await $`python3 /home/ormastes/dev/aidev/ollama_clean.py "$1" --model deepseek-r1:32b --show-thinking`;
  await $`}`;
  await $`EOF`;
  console.log("✅ Setup complete!");
  console.log("");
  console.log("Available commands (restart shell or run 'source ~/.bashrc'):");
  console.log("  ollama-clean 'prompt'           # Query without thinking tags");
  console.log("  ollama-chat                     # Interactive chat mode");
  console.log("  deepseek 'prompt'               # Quick DeepSeek query");
  console.log("  deepseek-think 'prompt'         # DeepSeek with thinking shown");
  console.log("");
  console.log("Direct usage:");
  console.log("  ./ollama_clean.py 'prompt'                    # Basic query");
  console.log("  ./ollama_clean.py --chat                      # Chat mode");
  console.log("  ./ollama_clean.py -t 'prompt'                 # Show thinking");
  console.log("  echo 'prompt' | ./ollama_clean.py             # Pipe input");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}