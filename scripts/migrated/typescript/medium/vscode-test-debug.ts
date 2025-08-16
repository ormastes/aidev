#!/usr/bin/env bun
/**
 * Migrated from: vscode-test-debug.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.629Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Open VS Code Server for test-debug
  await $`URL="http://localhost:8080"`;
  console.log("Opening VS Code Server at: $URL");
  console.log("Default password: changeme");
  console.log("");
  // Try to open in browser
  await $`if command -v xdg-open > /dev/null; then`;
  await $`xdg-open "$URL"`;
  await $`elif command -v open > /dev/null; then`;
  await $`open "$URL"`;
  } else {
  console.log("Please open your browser and navigate to: $URL");
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}