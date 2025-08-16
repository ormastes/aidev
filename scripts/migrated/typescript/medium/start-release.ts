#!/usr/bin/env bun
/**
 * Migrated from: start-release.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.623Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Start Story Reporter Server in Release Mode with AI Dev Portal Integration
  await $`set -e`;
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"`;
  await $`STORY_REPORTER_DIR="$PROJECT_ROOT/layer/themes/story-reporter/release/server"`;
  console.log("=== Starting Story Reporter Server (Release Mode) ===");
  console.log("Port: 3401");
  console.log("Theme: AI Dev Portal");
  // Navigate to story reporter directory
  process.chdir(""$STORY_REPORTER_DIR"");
  // Install dependencies if needed
  if (! -d "node_modules" ) {; then
  console.log("Installing dependencies...");
  await $`npm install`;
  }
  // Set environment to release
  process.env.NODE_ENV = "release";
  process.env.PORT = "3401";
  // Start the server
  console.log("Starting Story Reporter server on port 3401...");
  await $`node src/simple-server.js`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}