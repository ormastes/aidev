#!/usr/bin/env bun
/**
 * Migrated from: install.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.704Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Install filesystem-mcp for current and child folders
  await $`set -e`;
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m' # No Color`;
  console.log("-e ");${YELLOW}Installing filesystem-mcp for AI Development Platform${NC}"
  console.log("=============================================");
  // Get the script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"`;
  // Build filesystem-mcp
  console.log("-e ");${YELLOW}Building filesystem-mcp theme...${NC}"
  process.chdir(""$PROJECT_ROOT/layer/themes/filesystem_mcp"");
  // Check if package.json exists
  if (! -f "package.json" ) {; then
  console.log("-e ");${YELLOW}Creating package.json for filesystem-mcp...${NC}"
  await $`cat > package.json << 'EOF'`;
  await $`{`;
  await $`"name": "filesystem-mcp",`;
  await $`"version": "1.0.0",`;
  await $`"description": "Filesystem MCP theme for AI Development Platform",`;
  await $`"main": "mcp-server.js",`;
  await $`"scripts": {`;
  await $`"start": "node mcp-server.js",`;
  await $`"test": "jest"`;
  await $`},`;
  await $`"dependencies": {`;
  await $`"@modelcontextprotocol/sdk": "^0.5.0",`;
  await $`"zod": "^3.22.0"`;
  await $`},`;
  await $`"devDependencies": {`;
  await $`"@types/node": "^20.0.0",`;
  await $`"typescript": "^5.0.0"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  }
  // Install dependencies
  console.log("-e ");${YELLOW}Installing dependencies...${NC}"
  if (-d "node_modules" ) {; then
  console.log("-e ");${GREEN}Dependencies already installed. Updating...${NC}"
  await $`npm update`;
  } else {
  await $`npm install`;
  }
  // Build TypeScript files if needed
  if (-f "tsconfig.json" ) {; then
  console.log("-e ");${YELLOW}Building TypeScript files...${NC}"
  await $`bunx tsc`;
  }
  // Create MCP server file if it doesn't exist
  if (! -f "mcp-server.js" ) {; then
  console.log("-e ");${YELLOW}Creating MCP server file...${NC}"
  await $`cat > mcp-server.js << 'EOF'`;
  await $`const { Server } = require('@modelcontextprotocol/sdk/server/index.js');`;
  await $`const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');`;
  await $`const { z } = require('zod');`;
  await $`const fs = require('fs').promises;`;
  await $`const path = require('path');`;
  // Import VF wrappers
  await $`const { VFFileWrapper } = require('./children/VFFileWrapper');`;
  await $`const { VFNameIdWrapper } = require('./children/VFNameIdWrapper');`;
  await $`const { VFTaskQueueWrapper } = require('./children/VFTaskQueueWrapper');`;
  await $`const { VFFileStructureWrapper } = require('./children/VFFileStructureWrapper');`;
  await $`class FileSystemMCPServer {`;
  await $`constructor() {`;
  await $`this.server = new Server(`;
  await $`{`;
  await $`name: 'filesystem-mcp',`;
  await $`version: '1.0.0',`;
  await $`},`;
  await $`{`;
  await $`capabilities: {`;
  await $`tools: {},`;
  await $`},`;
  await $`}`;
  await $`);`;
  await $`this.basePath = process.env.VF_BASE_PATH || process.cwd();`;
  await $`this.setupHandlers();`;
  await $`}`;
  await $`setupHandlers() {`;
  // VF File operations
  await $`this.server.setRequestHandler('vf_read', async (request) => {`;
  await $`const { path: filePath } = request.params;`;
  await $`const wrapper = new VFFileWrapper();`;
  await $`return { content: await wrapper.read(path.join(this.basePath, filePath)) };`;
  await $`});`;
  await $`this.server.setRequestHandler('vf_write', async (request) => {`;
  await $`const { path: filePath, content } = request.params;`;
  await $`const wrapper = new VFFileWrapper();`;
  await $`await wrapper.write(path.join(this.basePath, filePath), content);`;
  await $`return { success: true };`;
  await $`});`;
  // Task Queue operations
  await $`this.server.setRequestHandler('vf_get_tasks', async (request) => {`;
  await $`const wrapper = new VFTaskQueueWrapper();`;
  await $`return { tasks: await wrapper.getTasks(this.basePath) };`;
  await $`});`;
  await $`this.server.setRequestHandler('vf_push_task', async (request) => {`;
  await $`const { task } = request.params;`;
  await $`const wrapper = new VFTaskQueueWrapper();`;
  await $`await wrapper.pushTask(this.basePath, task);`;
  await $`return { success: true };`;
  await $`});`;
  await $`this.server.setRequestHandler('vf_pop_task', async (request) => {`;
  await $`const wrapper = new VFTaskQueueWrapper();`;
  await $`return { task: await wrapper.popTask(this.basePath) };`;
  await $`});`;
  await $`this.server.setRequestHandler('vf_complete_task', async (request) => {`;
  await $`const { taskId } = request.params;`;
  await $`const wrapper = new VFTaskQueueWrapper();`;
  await $`await wrapper.completeTask(this.basePath, taskId);`;
  await $`return { success: true };`;
  await $`});`;
  // Name ID operations
  await $`this.server.setRequestHandler('vf_get_name_id', async (request) => {`;
  await $`const { name } = request.params;`;
  await $`const wrapper = new VFNameIdWrapper();`;
  await $`return { data: await wrapper.get(this.basePath, name) };`;
  await $`});`;
  await $`this.server.setRequestHandler('vf_set_name_id', async (request) => {`;
  await $`const { name, data } = request.params;`;
  await $`const wrapper = new VFNameIdWrapper();`;
  await $`await wrapper.set(this.basePath, name, data);`;
  await $`return { success: true };`;
  await $`});`;
  // Feature operations
  await $`this.server.setRequestHandler('vf_list_features', async (request) => {`;
  await $`const featurePath = path.join(this.basePath, 'FEATURE.vf.json');`;
  await $`try {`;
  await $`const content = await fs.readFile(featurePath, 'utf-8');`;
  await $`return { features: JSON.parse(content) };`;
  await $`} catch (error) {`;
  await $`return { features: {} };`;
  await $`}`;
  await $`});`;
  await $`}`;
  await $`async start() {`;
  await $`const transport = new StdioServerTransport();`;
  await $`await this.server.connect(transport);`;
  await $`console.error('Filesystem MCP Server started');`;
  await $`}`;
  await $`}`;
  // Start the server
  await $`const server = new FileSystemMCPServer();`;
  await $`server.start().catch(console.error);`;
  await $`EOF`;
  await $`chmod +x mcp-server.js`;
  }
  // Create claude_config.json for current folder
  console.log("-e ");${YELLOW}Creating Claude configuration for current folder...${NC}"
  await $`CLAUDE_CONFIG_PATH="$PROJECT_ROOT/claude_config.json"`;
  await $`cat > "$CLAUDE_CONFIG_PATH" << EOF`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"filesystem_mcp": {`;
  await $`"command": "node",`;
  await $`"args": ["$PROJECT_ROOT/layer/themes/filesystem_mcp/mcp-server.js"],`;
  await $`"env": {`;
  await $`"NODE_ENV": "development",`;
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
  console.log("-e ");${GREEN}✅ Filesystem-mcp installed successfully!${NC}"
  console.log("-e ");${GREEN}📍 Claude configuration created at: $CLAUDE_CONFIG_PATH${NC}"
  console.log("");
  console.log("-e ");${YELLOW}To use filesystem-mcp with Claude:${NC}"
  console.log("1. Restart Claude Code");
  console.log("2. The MCP server will start automatically");
  console.log("3. Use VF commands like vf_read, vf_write, etc.");
  // Update base setup to include proper MCP paths
  console.log("-e ");${YELLOW}Updating base setup configuration...${NC}"
  process.chdir(""$PROJECT_ROOT"");
  // Make the script executable
  await $`chmod +x "$SCRIPT_DIR/install-filesystem-mcp.sh"`;
  console.log("-e ");${GREEN}✅ Installation complete!${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}