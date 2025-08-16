#!/usr/bin/env bun
/**
 * Migrated from: start-coordinator.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.781Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Quick start script for the coordinator-claude-agent
  // Automatically detects authentication and starts the coordinator
  await $`set -e`;
  console.log("🚀 Coordinator Claude Agent - Quick Start");
  console.log("========================================");
  // Check if built
  if (! -f "./dist/index.js" ) {; then
  console.log("📦 Building coordinator...");
  await $`npm run build`;
  }
  // Make executable if needed
  if (! -x "./dist/index.js" ) {; then
  await $`chmod +x ./dist/index.js`;
  }
  // Check authentication status
  console.log("");
  console.log("🔍 Checking authentication...");
  await $`node test-auth.js`;
  // Ask user how they want to start
  console.log("");
  console.log("🎯 How would you like to start the coordinator?");
  console.log("1. Auto-detect authentication (recommended)");
  console.log("2. Use API key");
  console.log("3. Use local auth only");
  console.log("4. Exit");
  console.log("");
  await $`read -p "Choose option (1-4): " choice`;
  await $`case $choice in`;
  await $`1)`;
  console.log("");
  console.log("🚀 Starting with auto-detected authentication...");
  await $`./dist/index.js start`;
  await $`;;`;
  await $`2)`;
  await $`read -p "Enter your Claude API key: " api_key`;
  if (-z "$api_key" ) {; then
  console.log("❌ No API key provided");
  process.exit(1);
  }
  console.log("");
  console.log("🚀 Starting with API key authentication...");
  await $`./dist/index.js start --api-key "$api_key"`;
  await $`;;`;
  await $`3)`;
  console.log("");
  console.log("🚀 Starting with local authentication only...");
  await $`if ./dist/index.js start --no-local-auth 2>/dev/null; then`;
  console.log("✅ Started successfully");
  } else {
  console.log("❌ Local authentication failed. Try option 2 with an API key.");
  process.exit(1);
  }
  await $`;;`;
  await $`4)`;
  console.log("👋 Goodbye!");
  process.exit(0);
  await $`;;`;
  await $`*)`;
  console.log("❌ Invalid option. Please choose 1-4.");
  process.exit(1);
  await $`;;`;
  await $`esac`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}