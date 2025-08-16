#!/usr/bin/env bun
/**
 * Migrated from: start-chat-space-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.604Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Start Chat Space with MCP Integration
  await $`set -e`;
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  process.chdir(""$SCRIPT_DIR"");
  console.log("=========================================");
  console.log("Chat Space with MCP Integration");
  console.log("=========================================");
  // Check if node_modules exists
  if (! -d "node_modules" ) {; then
  console.log("Installing dependencies...");
  await $`npm install`;
  }
  // Configuration
  await $`PORT="${CHAT_PORT:-3456}"`;
  await $`MCP_URL="${MCP_SERVER_URL:-ws://localhost:8080}"`;
  await $`ENABLE_MCP="${ENABLE_MCP:-true}"`;
  console.log("");
  console.log("Configuration:");
  console.log("  Chat Space Port: $PORT");
  console.log("  MCP Server URL: $MCP_URL");
  console.log("  MCP Enabled: $ENABLE_MCP");
  console.log("");
  // Check if MCP server is needed
  if ("$ENABLE_MCP" = "true" ) {; then
  console.log("Checking MCP server availability...");
  // Extract host and port from MCP_URL
  await $`MCP_HOST=$(echo "$MCP_URL" | sed -E 's|^ws://([^:/]+).*|\1|')`;
  await $`MCP_PORT=$(echo "$MCP_URL" | sed -E 's|.*:([0-9]+).*|\1|')`;
  // Default port if not specified
  if (-z "$MCP_PORT" ] || [ "$MCP_PORT" = "$MCP_URL" ) {; then
  await $`MCP_PORT=8080`;
  }
  // Check if MCP server is running
  await $`if nc -z "$MCP_HOST" "$MCP_PORT" 2>/dev/null; then`;
  console.log("✅ MCP server is available at $MCP_URL");
  } else {
  console.log("⚠️  Warning: MCP server not responding at $MCP_URL");
  console.log("Starting local MCP server in strict mode...");
  // Start MCP server in background
  process.chdir("../infra_filesystem-mcp");
  if (-f "mcp-server-strict.js" ) {; then
  await $`node mcp-server-strict.js &`;
  await $`MCP_PID=$!`;
  console.log("Started MCP server (PID: $MCP_PID)");
  await Bun.sleep(2 * 1000);
  } else {
  console.log("MCP server script not found, continuing without MCP");
  await $`ENABLE_MCP="false"`;
  }
  process.chdir(""$SCRIPT_DIR"");
  }
  }
  // Build TypeScript if needed
  if (! -d "dist" ] || [ "src/index.ts" -nt "dist/index.js" ) {; then
  console.log("Building TypeScript...");
  await $`npm run build`;
  }
  // Start Chat Space Server
  console.log("");
  console.log("Starting Chat Space Server...");
  console.log("=========================================");
  if ("$ENABLE_MCP" = "true" ) {; then
  await $`npm run start:mcp -- --port "$PORT" --mcp-url "$MCP_URL"`;
  } else {
  await $`npm run start -- --port "$PORT" --no-mcp`;
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}