#!/usr/bin/env bun
/**
 * Migrated from: setup-uv.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.793Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup script for Explorer project using uv
  // Migrates from pip to uv for Python dependency management
  await $`set -e`;
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  console.log("==========================================");
  console.log("   Explorer Setup with UV");
  console.log("==========================================");
  // Check if uv is installed
  await $`if ! command -v uv &> /dev/null; then`;
  console.log("📦 Installing uv...");
  await $`curl -LsSf https://astral.sh/uv/install.sh | sh`;
  await $`source "$HOME/.cargo/env"`;
  }
  console.log("✅ UV is available: $(uv --version)");
  // Create virtual environment
  console.log("🔧 Creating virtual environment...");
  await $`uv venv`;
  // Activate virtual environment
  await $`source .venv/bin/activate`;
  // Install dependencies from pyproject.toml
  console.log("📦 Installing dependencies...");
  await $`uv pip install -e .`;
  // Install development dependencies
  console.log("📦 Installing development dependencies...");
  await $`uv pip install -e ".[dev]"`;
  // Verify installation
  console.log("");
  console.log("🔍 Verifying installation...");
  await $`python3 -c "import mcp; print('✅ MCP SDK installed')"`;
  await $`python3 -c "import yaml; print('✅ PyYAML installed')"`;
  console.log("");
  console.log("==========================================");
  console.log("✅ Explorer setup complete with UV!");
  console.log("");
  console.log("To activate the environment, run:");
  console.log("  source $SCRIPT_DIR/.venv/bin/activate");
  console.log("");
  console.log("To run Explorer:");
  console.log("  python3 scripts/explorer.py");
  console.log("==========================================");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}