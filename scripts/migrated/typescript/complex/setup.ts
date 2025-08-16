#!/usr/bin/env bun
/**
 * Migrated from: setup.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.792Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup script for aidev environment
  // This is a wrapper that delegates to the setup-folder theme
  // By default installs locally, use --user-wide for system-wide installation
  await $`set -euo pipefail`;
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`AIDEV_PATH="$SCRIPT_DIR"`;
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}=== Aidev Setup ===${NC}"
  console.log("Using setup-folder theme for configuration");
  // Check if setup-folder theme is available
  if ([ ! -d "$AIDEV_PATH/layer/themes/setup-folder" ]) {; then
  console.log("-e ");${RED}[ERROR]${NC} setup-folder theme not found!"
  console.log("Please ensure the aidev folder was properly installed.");
  process.exit(1);
  }
  // Check if Node.js is available
  await $`if ! command -v node &> /dev/null; then`;
  console.log("-e ");${RED}[ERROR]${NC} Node.js is required but not found!"
  console.log("Please install Node.js first.");
  process.exit(1);
  }
  // Navigate to setup-folder theme
  process.chdir(""$AIDEV_PATH/layer/themes/setup-folder"");
  // Install dependencies if needed
  if ([ ! -d "node_modules" ]) {; then
  console.log("-e ");${BLUE}Installing setup-folder dependencies...${NC}"
  await $`npm install`;
  }
  // Build if necessary
  if ([ ! -d "dist" ]] || [[ ! -f "dist/cli.js" ]) {; then
  console.log("-e ");${BLUE}Building setup-folder theme...${NC}"
  await $`npm run build`;
  }
  // Create a setup configuration file
  await $`cat > "$AIDEV_PATH/setup-config.json" << EOJ`;
  await $`{`;
  await $`"targetDir": "$AIDEV_PATH",`;
  await $`"deployedEnvironment": true,`;
  await $`"mode": "$MODE"`;
  await $`}`;
  await $`EOJ`;
  // Run the setup-folder MCP configuration
  console.log("-e ");${BLUE}Running MCP configuration...${NC}"
  // Execute with Node.js directly, passing all arguments
  await $`node "$AIDEV_PATH/layer/themes/setup-folder/dist/cli.js" mcp-config \`;
  await $`--target-dir "$AIDEV_PATH" \`;
  await $`--deployed-environment \`;
  await $`"$@"`;
  // Clean up temporary config
  await $`rm -f "$AIDEV_PATH/setup-config.json"`;
  console.log("-e ");${GREEN}Setup complete!${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}