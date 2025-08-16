#!/usr/bin/env bun
/**
 * Migrated from: setup.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.626Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup Python environment with uv
  await $`set -e`;
  console.log("Setting up Python environment...");
  // Check if uv is installed
  await $`if ! command -v uv &> /dev/null; then`;
  console.log("Installing uv...");
  await $`curl -LsSf https://astral.sh/uv/install.sh | sh`;
  await $`source $HOME/.local/bin/env`;
  }
  // Create virtual environment
  console.log("Creating virtual environment...");
  await $`uv venv`;
  // Install dependencies
  console.log("Installing dependencies...");
  await $`uv uv pip install -e .`;
  await $`uv uv pip install -e ".[dev,test,docs]"`;
  console.log("Python environment setup complete!");
  console.log("Activate with: source .venv/bin/activate");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}