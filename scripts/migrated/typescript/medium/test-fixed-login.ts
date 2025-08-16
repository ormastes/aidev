#!/usr/bin/env bun
/**
 * Migrated from: test-fixed-login.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.608Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🌐 AI Dev Portal - Fixed Login Test");
  console.log("==================================");
  console.log("");
  console.log("This will open a working login page that connects to your API.");
  console.log("");
  console.log("📍 Make sure the server is running on port 3456");
  console.log("📍 The fixed login page will open in your browser");
  console.log("");
  // Get the directory of this script
  await $`DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  // Check if server is running
  await $`if lsof -i :3456 > /dev/null 2>&1; then`;
  console.log("✅ Server is running on port 3456");
  } else {
  console.log("❌ Server is NOT running on port 3456!");
  console.log("   Please start the server first:");
  console.log("   cd /home/ormastes/dev/aidev/layer/themes/portal_aidev/release/ai_dev_portal_release");
  console.log("   PORT=3456 node server.js");
  process.exit(1);
  }
  console.log("");
  console.log("Opening the fixed login page...");
  console.log("");
  // Try different ways to open the browser
  await $`if command -v xdg-open > /dev/null; then`;
  await $`xdg-open "file://$DIR/fixed-login.html"`;
  await $`elif command -v open > /dev/null; then`;
  await $`open "file://$DIR/fixed-login.html"`;
  await $`elif command -v start > /dev/null; then`;
  await $`start "file://$DIR/fixed-login.html"`;
  } else {
  console.log("Could not open browser automatically.");
  console.log("");
  console.log("📋 Please open this file manually in your browser:");
  console.log("   file://$DIR/fixed-login.html");
  }
  console.log("");
  console.log("🔑 Login credentials:");
  console.log("   Username: admin");
  console.log("   Password: demo123");
  console.log("");
  console.log("This page will:");
  console.log("1. Show a working login form");
  console.log("2. Call the API at http://localhost:3456/api/login");
  console.log("3. Display the dashboard after successful login");
  console.log("4. Show any errors if login fails");
  console.log("");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}