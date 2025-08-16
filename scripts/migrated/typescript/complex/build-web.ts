#!/usr/bin/env bun
/**
 * Migrated from: build-web.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.795Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🚀 Building Mate Dealer for Web...");
  // Install dependencies if needed
  if (! -d "node_modules" ) {; then
  console.log("📦 Installing dependencies...");
  await $`npm install`;
  }
  // Build for web
  console.log("🔨 Building web version...");
  await $`bunx expo build:web`;
  // Copy to GUI selector public directory
  console.log("📋 Copying to GUI selector...");
  await $`DEST_DIR="../../portal_gui-selector/user-stories/023-gui-selector-server/public/mate-dealer"`;
  await rm("$DEST_DIR", { recursive: true, force: true });
  await mkdir("$DEST_DIR", { recursive: true });
  await copyFile("-r web-build/*", "$DEST_DIR/");
  console.log("✅ Build complete! Access at: http://localhost:3256/mate-dealer/");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}