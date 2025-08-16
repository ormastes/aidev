#!/usr/bin/env bun
/**
 * Migrated from: install-uv.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.615Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // UV Installation Script
  // Installs UV - the fast Python package installer and resolver
  await $`set -e`;
  console.log("Installing UV Python package manager...");
  // Detect OS
  await $`OS="$(uname -s)"`;
  await $`ARCH="$(uname -m)"`;
  // Check if UV is already installed
  await $`if command -v uv &> /dev/null; then`;
  console.log("UV is already installed: $(uv --version)");
  process.exit(0);
  }
  // Install UV using the official installer
  console.log("Downloading and installing UV...");
  if ("$OS" = "Darwin" ] || [ "$OS" = "Linux" ) {; then
  // Unix-like systems
  await $`curl -LsSf https://astral.sh/uv/install.sh | sh`;
  // Add to PATH if not already there
  if ([ ":$PATH:" != *":$HOME/.cargo/bin:"* ]) {; then
  console.log("'export PATH=");$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
  console.log("'export PATH=");$HOME/.cargo/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
  process.env.PATH = ""$HOME/.cargo/bin:$PATH"";
  }
  await $`elif [ "$OS" = "Windows_NT" ]; then`;
  // Windows (Git Bash/WSL)
  await $`powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`;
  } else {
  console.log("Unsupported operating system: $OS");
  console.log("Please install UV manually from: https://github.com/astral-sh/uv");
  process.exit(1);
  }
  // Verify installation
  await $`if command -v uv &> /dev/null; then`;
  console.log("UV successfully installed: $(uv --version)");
  // Configure UV settings
  console.log("Configuring UV...");
  await $`uv config set python-preference only-managed`;
  await $`uv config set cache-dir .uv-cache`;
  console.log("UV installation complete!");
  } else {
  console.log("UV installation failed. Please install manually from: https://github.com/astral-sh/uv");
  process.exit(1);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}