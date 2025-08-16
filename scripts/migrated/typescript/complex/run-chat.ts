#!/usr/bin/env bun
/**
 * Migrated from: run-chat.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.789Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Chat Interface Launcher
  console.log("🤖 AI Chat Launcher");
  console.log("===================");
  console.log("");
  // Check if Ollama is running
  await $`OLLAMA_STATUS="❌ Not running"`;
  await $`DEEPSEEK_STATUS="❌ Not installed"`;
  await $`if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then`;
  await $`OLLAMA_STATUS="✅ Running"`;
  // Check for DeepSeek model
  await $`if curl -s http://localhost:11434/api/tags | grep -q "deepseek"; then`;
  await $`DEEPSEEK_STATUS="✅ Available"`;
  }
  }
  console.log("Status:");
  console.log("  Ollama: $OLLAMA_STATUS");
  console.log("  DeepSeek R1: $DEEPSEEK_STATUS");
  console.log("");
  // Check which mode to use
  console.log("Select chat mode:");
  console.log("1) Claude Only (Always works)");
  console.log("2) DeepSeek R1 Only (Requires Ollama)");
  console.log("3) Hybrid Mode (Both Claude + DeepSeek) ← RECOMMENDED");
  console.log("4) Quick Test (Test all modes)");
  console.log("");
  await $`read -p "Enter choice [1-4]: " choice`;
  await $`case $choice in`;
  await $`1)`;
  console.log("Starting Claude simulation chat...");
  await $`node chat-with-claude.js`;
  await $`;;`;
  await $`2)`;
  console.log("Starting DeepSeek R1 chat...");
  await $`node chat-with-local-llm.js`;
  await $`;;`;
  await $`3)`;
  console.log("Starting hybrid chat (Claude + DeepSeek)...");
  await $`node chat-hybrid.js`;
  await $`;;`;
  await $`4)`;
  console.log("Running quick test...");
  await $`node chat-hybrid.js --test`;
  await $`;;`;
  await $`*)`;
  console.log("Starting hybrid mode (recommended)...");
  await $`node chat-hybrid.js`;
  await $`;;`;
  await $`esac`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}