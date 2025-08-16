#!/usr/bin/env bun
/**
 * Migrated from: deploy-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.754Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Deploy MCP Server for AI Development Workspace
  await $`set -euo pipefail`;
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}=== Deploying MCP Server for AI Development ===${NC}"
  // Configuration
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"`;
  await $`MCP_DIR="$PROJECT_ROOT/scripts/setup/release/filesystem_mcp"`;
  await $`CONFIG_DIR="$HOME/.config/claude"`;
  // Check if MCP directory exists
  if ([ ! -d "$MCP_DIR" ]) {; then
  console.log("-e ");${RED}Error: MCP directory not found at $MCP_DIR${NC}"
  process.exit(1);
  }
  // Navigate to MCP directory
  process.chdir(""$MCP_DIR"");
  // Check if node_modules exist
  if ([ ! -d "node_modules" ]) {; then
  console.log("-e ");${YELLOW}Installing dependencies...${NC}"
  await $`bun install`;
  }
  // Check if dist folder exists (compiled TypeScript)
  if ([ ! -d "dist" ]) {; then
  console.log("-e ");${YELLOW}No dist folder found. The pre-compiled version will be used.${NC}"
  }
  // Create Claude config directory if it doesn't exist
  await mkdir(""$CONFIG_DIR"", { recursive: true });
  // Create MCP configuration for Claude
  await $`cat > "$CONFIG_DIR/claude_desktop_config.json" << EOF`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"filesystem_mcp": {`;
  await $`"command": "node",`;
  await $`"args": ["$MCP_DIR/mcp-server.js"],`;
  await $`"env": {`;
  await $`"NODE_ENV": "production",`;
  await $`"VF_BASE_PATH": "$PROJECT_ROOT"`;
  await $`}`;
  await $`}`;
  await $`},`;
  await $`"globalShortcuts": {`;
  await $`"vf_read": "filesystem_mcp",`;
  await $`"vf_write": "filesystem_mcp",`;
  await $`"vf_list_features": "filesystem_mcp",`;
  await $`"vf_get_tasks": "filesystem_mcp",`;
  await $`"vf_pop_task": "filesystem_mcp",`;
  await $`"vf_complete_task": "filesystem_mcp",`;
  await $`"vf_push_task": "filesystem_mcp",`;
  await $`"vf_get_name_id": "filesystem_mcp",`;
  await $`"vf_set_name_id": "filesystem_mcp"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  console.log("-e ");${GREEN}✓ MCP configuration created at: $CONFIG_DIR/claude_desktop_config.json${NC}"
  // Test the MCP server
  console.log("-e ");${BLUE}Testing MCP server...${NC}"
  await $`timeout 2s node "$MCP_DIR/mcp-server.js" 2>&1 | head -5 || true`;
  // Create a systemd service file for persistent deployment (optional)
  await $`if command -v systemctl >/dev/null 2>&1; then`;
  console.log("-e ");${BLUE}Creating systemd service file...${NC}"
  await $`cat > "$HOME/.config/systemd/user/filesystem-mcp.service" << EOF`;
  await $`[Unit]`;
  await $`Description=Filesystem MCP Server for AI Development`;
  await $`After=network.target`;
  await $`[Service]`;
  await $`Type=simple`;
  await $`WorkingDirectory=$MCP_DIR`;
  await $`ExecStart=/usr/bin/node $MCP_DIR/mcp-server.js`;
  await $`Restart=on-failure`;
  await $`RestartSec=10`;
  await $`StandardOutput=journal`;
  await $`StandardError=journal`;
  await $`Environment="NODE_ENV=production"`;
  await $`Environment="VF_BASE_PATH=$PROJECT_ROOT"`;
  await $`[Install]`;
  await $`WantedBy=default.target`;
  await $`EOF`;
  console.log("-e ");${GREEN}✓ Systemd service file created${NC}"
  console.log("-e ");${YELLOW}To enable the service, run:${NC}"
  console.log("  systemctl --user daemon-reload");
  console.log("  systemctl --user enable filesystem-mcp");
  console.log("  systemctl --user start filesystem-mcp");
  }
  // Create convenience scripts
  console.log("-e ");${BLUE}Creating convenience scripts...${NC}"
  // Start script
  await $`cat > "$PROJECT_ROOT/start-mcp.sh" << 'EOF'`;
  // Start MCP Server
  await $`MCP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/scripts/setup/release/filesystem_mcp" && pwd)"`;
  process.chdir(""$MCP_DIR"");
  console.log("Starting MCP server...");
  await $`node mcp-server.js`;
  await $`EOF`;
  await $`chmod +x "$PROJECT_ROOT/start-mcp.sh"`;
  // Test script
  await $`cat > "$PROJECT_ROOT/test-mcp.sh" << 'EOF'`;
  // Test MCP Server
  console.log("Testing MCP server connection...");
  console.log("'{");method": "vf_get_tasks", "params": {"file": "TASK_QUEUE.vf.json"}, "id": 1}' | \
  await $`node "$(dirname "${BASH_SOURCE[0]}")/scripts/setup/release/filesystem_mcp/mcp-server.js"`;
  await $`EOF`;
  await $`chmod +x "$PROJECT_ROOT/test-mcp.sh"`;
  console.log("-e ");${GREEN}=== MCP Server Deployment Complete ===${NC}"
  await $`echo`;
  console.log("-e ");${BLUE}MCP Server Details:${NC}"
  console.log("  - Server Path: $MCP_DIR/mcp-server.js");
  console.log("  - Base Path: $PROJECT_ROOT");
  console.log("  - Config File: $CONFIG_DIR/claude_desktop_config.json");
  await $`echo`;
  console.log("-e ");${BLUE}Available Commands:${NC}"
  console.log("  - vf_read: Read virtual files");
  console.log("  - vf_write: Write virtual files");
  console.log("  - vf_list_features: List features from FEATURE.vf.json");
  console.log("  - vf_get_tasks: Get tasks from TASK_QUEUE.vf.json");
  console.log("  - vf_pop_task: Pop a task from the queue");
  console.log("  - vf_complete_task: Mark a task as completed");
  await $`echo`;
  console.log("-e ");${BLUE}Quick Start:${NC}"
  console.log("  ./start-mcp.sh    # Start the MCP server");
  console.log("  ./test-mcp.sh     # Test the MCP server");
  await $`echo`;
  console.log("-e ");${YELLOW}Note: Restart Claude Desktop to load the new MCP configuration${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}