#!/usr/bin/env bun
/**
 * Migrated from: build-qemu-image.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.784Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // QEMU Image Builder - Shell wrapper for TypeScript image builder
  // This script calls the TypeScript implementation for actual logic
  await $`set -e`;
  // Configuration
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"`;
  await $`CLI_SCRIPT="$PROJECT_ROOT/src/cli/build-image.ts"`;
  // Colors
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m'`;
  // Check if Node.js is installed
  await $`if ! command -v node &> /dev/null; then`;
  console.log("-e ");${RED}Error: Node.js is not installed${NC}"
  console.log("Please install Node.js to use the image builder");
  process.exit(1);
  }
  // Check if bun is installed
  await $`if ! command -v bun &> /dev/null; then`;
  console.log("-e ");${YELLOW}Warning: bun not found, installing dependencies...${NC}"
  process.chdir(""$PROJECT_ROOT"");
  await $`bun install`;
  }
  // Install dependencies if package.json exists but node_modules doesn't
  if (-f "$PROJECT_ROOT/package.json" ] && [ ! -d "$PROJECT_ROOT/node_modules" ) {; then
  console.log("-e ");${BLUE}Installing dependencies...${NC}"
  process.chdir(""$PROJECT_ROOT"");
  await $`bun install`;
  }
  // Create package.json if it doesn't exist
  if (! -f "$PROJECT_ROOT/package.json" ) {; then
  console.log("-e ");${BLUE}Initializing project...${NC}"
  await $`cat > "$PROJECT_ROOT/package.json" << 'EOF'`;
  await $`{`;
  await $`"name": "init-qemu",`;
  await $`"version": "1.0.0",`;
  await $`"description": "QEMU initialization and image building tools",`;
  await $`"scripts": {`;
  await $`"build": "tsc",`;
  await $`"build-image": "ts-node src/cli/build-image.ts"`;
  await $`},`;
  await $`"dependencies": {`;
  await $`"commander": "^11.0.0",`;
  await $`"chalk": "^4.1.2",`;
  await $`"ora": "^5.4.1"`;
  await $`},`;
  await $`"devDependencies": {`;
  await $`"@types/node": "^20.0.0",`;
  await $`"typescript": "^5.0.0",`;
  await $`"ts-node": "^10.9.0"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  process.chdir(""$PROJECT_ROOT"");
  await $`bun install`;
  }
  // Run the TypeScript CLI
  process.chdir(""$PROJECT_ROOT"");
  await $`bun run ts-node "$CLI_SCRIPT" "$@"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}