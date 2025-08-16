#!/usr/bin/env bun
/**
 * Migrated from: integrate-setup.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.593Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Integration script to use setup features from the theme
  await $`set -e`;
  console.log("Setup features are now integrated into the filesystem-mcp theme");
  console.log("Usage:");
  console.log("  - Configuration templates: children/setup/templates/");
  console.log("  - Docker environments: docker/");
  console.log("  - QEMU environments: qemu/");
  console.log("  - Examples: examples/hello-world/");
  console.log("");
  console.log("To use setup features:");
  console.log("  1. Import SetupManager from children/setup/SetupManager.ts");
  console.log("  2. Configure using templates in children/setup/templates/");
  console.log("  3. Run verification with examples/hello-world/");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}