#!/usr/bin/env bun
/**
 * Migrated from: entrypoint.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.594Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  await $`set -e`;
  console.log("GUI Test Environment");
  console.log("Display: $DISPLAY");
  console.log("X11 status: $(xdpyinfo -display $DISPLAY 2>/dev/null | head -n1 || echo 'not running')");
  // Start window manager
  await $`fluxbox &`;
  // Execute passed command or default
  if ($# -eq 0 ) {; then
  console.log("Running default GUI tests...");
  process.chdir("/workspace");
  await $`./run_system_tests.sh --filter gui`;
  } else {
  await $`exec "$@"`;
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}