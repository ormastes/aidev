#!/usr/bin/env bun
/**
 * Migrated from: setup-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.617Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup MCP server for test-demo-app
  await $`set -euo pipefail`;
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`AIDEV_PATH="$SCRIPT_DIR"`;
  console.log("Setting up MCP server for Claude Desktop...");
  // Detect OS and Claude config directory
  if ([ "$OSTYPE" == "darwin"* ]) {; then
  await $`CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"`;
  await $`elif [[ "$OSTYPE" == "linux-gnu"* ]]; then`;
  await $`CLAUDE_CONFIG_DIR="$HOME/.config/Claude"`;
  } else {
  console.log("Unsupported OS: $OSTYPE");
  process.exit(1);
  }
  await mkdir(""$CLAUDE_CONFIG_DIR"", { recursive: true });
  // Backup existing config
  if ([ -f "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" ]) {; then
  await copyFile(""$CLAUDE_CONFIG_DIR/claude_desktop_config.json"", ""$CLAUDE_CONFIG_DIR/claude_desktop_config.json.backup"");
  }
  // Create MCP configuration
  await $`cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << EOL`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"test-demo-app": {`;
  await $`"command": "npx",`;
  await $`"args": ["-y", "@modelcontextprotocol/server-filesystem", "$AIDEV_PATH"]`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`EOL`;
  console.log("✅ MCP configuration installed");
  console.log("✅ Restart Claude Desktop to use MCP with test-demo-app");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}