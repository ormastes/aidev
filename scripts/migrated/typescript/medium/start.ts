#!/usr/bin/env bun
/**
 * Migrated from: start.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.623Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🌟 Starting AI Dev Portal");
  console.log("=========================");
  // Check if node_modules exists
  if (! -d "node_modules" ) {; then
  console.log("📦 Installing dependencies...");
  await $`npm install --production`;
  }
  // Initialize database if needed
  if (! -f "data/ai_dev_portal.db" ) {; then
  console.log("🗄️ Initializing database...");
  await $`node init-db.js`;
  }
  // Start the server
  console.log("🚀 Starting server on port 3400...");
  console.log("📍 Access the portal at: http://localhost:3400");
  console.log("👤 Demo users: admin, developer, tester (password: demo123)");
  console.log("");
  console.log("Press Ctrl+C to stop the server");
  await $`node server.js`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}