#!/usr/bin/env python3
"""
Migrated from: install.sh
Auto-generated Python - 2025-08-16T04:57:27.705Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Install filesystem-mcp for current and child folders
    subprocess.run("set -e", shell=True)
    # Colors for output
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    print("-e ")${YELLOW}Installing filesystem-mcp for AI Development Platform${NC}"
    print("=============================================")
    # Get the script directory
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"", shell=True)
    # Build filesystem-mcp
    print("-e ")${YELLOW}Building filesystem-mcp theme...${NC}"
    os.chdir(""$PROJECT_ROOT/layer/themes/filesystem_mcp"")
    # Check if package.json exists
    if ! -f "package.json" :; then
    print("-e ")${YELLOW}Creating package.json for filesystem-mcp...${NC}"
    subprocess.run("cat > package.json << 'EOF'", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""name": "filesystem-mcp",", shell=True)
    subprocess.run(""version": "1.0.0",", shell=True)
    subprocess.run(""description": "Filesystem MCP theme for AI Development Platform",", shell=True)
    subprocess.run(""main": "mcp-server.js",", shell=True)
    subprocess.run(""scripts": {", shell=True)
    subprocess.run(""start": "node mcp-server.js",", shell=True)
    subprocess.run(""test": "jest"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""dependencies": {", shell=True)
    subprocess.run(""@modelcontextprotocol/sdk": "^0.5.0",", shell=True)
    subprocess.run(""zod": "^3.22.0"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""devDependencies": {", shell=True)
    subprocess.run(""@types/node": "^20.0.0",", shell=True)
    subprocess.run(""typescript": "^5.0.0"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Install dependencies
    print("-e ")${YELLOW}Installing dependencies...${NC}"
    if -d "node_modules" :; then
    print("-e ")${GREEN}Dependencies already installed. Updating...${NC}"
    subprocess.run("npm update", shell=True)
    else:
    subprocess.run("npm install", shell=True)
    # Build TypeScript files if needed
    if -f "tsconfig.json" :; then
    print("-e ")${YELLOW}Building TypeScript files...${NC}"
    subprocess.run("bunx tsc", shell=True)
    # Create MCP server file if it doesn't exist
    if ! -f "mcp-server.js" :; then
    print("-e ")${YELLOW}Creating MCP server file...${NC}"
    subprocess.run("cat > mcp-server.js << 'EOF'", shell=True)
    subprocess.run("const { Server } = require('@modelcontextprotocol/sdk/server/index.js');", shell=True)
    subprocess.run("const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');", shell=True)
    subprocess.run("const { z } = require('zod');", shell=True)
    subprocess.run("const fs = require('fs').promises;", shell=True)
    subprocess.run("const path = require('path');", shell=True)
    subprocess.run("// Import VF wrappers", shell=True)
    subprocess.run("const { VFFileWrapper } = require('./children/VFFileWrapper');", shell=True)
    subprocess.run("const { VFNameIdWrapper } = require('./children/VFNameIdWrapper');", shell=True)
    subprocess.run("const { VFTaskQueueWrapper } = require('./children/VFTaskQueueWrapper');", shell=True)
    subprocess.run("const { VFFileStructureWrapper } = require('./children/VFFileStructureWrapper');", shell=True)
    subprocess.run("class FileSystemMCPServer {", shell=True)
    subprocess.run("constructor() {", shell=True)
    subprocess.run("this.server = new Server(", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run("name: 'filesystem-mcp',", shell=True)
    subprocess.run("version: '1.0.0',", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run("capabilities: {", shell=True)
    subprocess.run("tools: {},", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run(");", shell=True)
    subprocess.run("this.basePath = process.env.VF_BASE_PATH || process.cwd();", shell=True)
    subprocess.run("this.setupHandlers();", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("setupHandlers() {", shell=True)
    subprocess.run("// VF File operations", shell=True)
    subprocess.run("this.server.setRequestHandler('vf_read', async (request) => {", shell=True)
    subprocess.run("const { path: filePath } = request.params;", shell=True)
    subprocess.run("const wrapper = new VFFileWrapper();", shell=True)
    subprocess.run("return { content: await wrapper.read(path.join(this.basePath, filePath)) };", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("this.server.setRequestHandler('vf_write', async (request) => {", shell=True)
    subprocess.run("const { path: filePath, content } = request.params;", shell=True)
    subprocess.run("const wrapper = new VFFileWrapper();", shell=True)
    subprocess.run("await wrapper.write(path.join(this.basePath, filePath), content);", shell=True)
    subprocess.run("return { success: true };", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("// Task Queue operations", shell=True)
    subprocess.run("this.server.setRequestHandler('vf_get_tasks', async (request) => {", shell=True)
    subprocess.run("const wrapper = new VFTaskQueueWrapper();", shell=True)
    subprocess.run("return { tasks: await wrapper.getTasks(this.basePath) };", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("this.server.setRequestHandler('vf_push_task', async (request) => {", shell=True)
    subprocess.run("const { task } = request.params;", shell=True)
    subprocess.run("const wrapper = new VFTaskQueueWrapper();", shell=True)
    subprocess.run("await wrapper.pushTask(this.basePath, task);", shell=True)
    subprocess.run("return { success: true };", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("this.server.setRequestHandler('vf_pop_task', async (request) => {", shell=True)
    subprocess.run("const wrapper = new VFTaskQueueWrapper();", shell=True)
    subprocess.run("return { task: await wrapper.popTask(this.basePath) };", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("this.server.setRequestHandler('vf_complete_task', async (request) => {", shell=True)
    subprocess.run("const { taskId } = request.params;", shell=True)
    subprocess.run("const wrapper = new VFTaskQueueWrapper();", shell=True)
    subprocess.run("await wrapper.completeTask(this.basePath, taskId);", shell=True)
    subprocess.run("return { success: true };", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("// Name ID operations", shell=True)
    subprocess.run("this.server.setRequestHandler('vf_get_name_id', async (request) => {", shell=True)
    subprocess.run("const { name } = request.params;", shell=True)
    subprocess.run("const wrapper = new VFNameIdWrapper();", shell=True)
    subprocess.run("return { data: await wrapper.get(this.basePath, name) };", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("this.server.setRequestHandler('vf_set_name_id', async (request) => {", shell=True)
    subprocess.run("const { name, data } = request.params;", shell=True)
    subprocess.run("const wrapper = new VFNameIdWrapper();", shell=True)
    subprocess.run("await wrapper.set(this.basePath, name, data);", shell=True)
    subprocess.run("return { success: true };", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("// Feature operations", shell=True)
    subprocess.run("this.server.setRequestHandler('vf_list_features', async (request) => {", shell=True)
    subprocess.run("const featurePath = path.join(this.basePath, 'FEATURE.vf.json');", shell=True)
    subprocess.run("try {", shell=True)
    subprocess.run("const content = await fs.readFile(featurePath, 'utf-8');", shell=True)
    subprocess.run("return { features: JSON.parse(content) };", shell=True)
    subprocess.run("} catch (error) {", shell=True)
    subprocess.run("return { features: {} };", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("async start() {", shell=True)
    subprocess.run("const transport = new StdioServerTransport();", shell=True)
    subprocess.run("await this.server.connect(transport);", shell=True)
    subprocess.run("console.error('Filesystem MCP Server started');", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("// Start the server", shell=True)
    subprocess.run("const server = new FileSystemMCPServer();", shell=True)
    subprocess.run("server.start().catch(console.error);", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x mcp-server.js", shell=True)
    # Create claude_config.json for current folder
    print("-e ")${YELLOW}Creating Claude configuration for current folder...${NC}"
    subprocess.run("CLAUDE_CONFIG_PATH="$PROJECT_ROOT/claude_config.json"", shell=True)
    subprocess.run("cat > "$CLAUDE_CONFIG_PATH" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""mcpServers": {", shell=True)
    subprocess.run(""filesystem_mcp": {", shell=True)
    subprocess.run(""command": "node",", shell=True)
    subprocess.run(""args": ["$PROJECT_ROOT/layer/themes/filesystem_mcp/mcp-server.js"],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""NODE_ENV": "development",", shell=True)
    subprocess.run(""VF_BASE_PATH": "$PROJECT_ROOT"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""globalShortcuts": {", shell=True)
    subprocess.run(""vf_read": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_write": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_list_features": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_get_tasks": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_pop_task": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_complete_task": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_push_task": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_get_name_id": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_set_name_id": "filesystem_mcp"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✅ Filesystem-mcp installed successfully!${NC}"
    print("-e ")${GREEN}📍 Claude configuration created at: $CLAUDE_CONFIG_PATH${NC}"
    print("")
    print("-e ")${YELLOW}To use filesystem-mcp with Claude:${NC}"
    print("1. Restart Claude Code")
    print("2. The MCP server will start automatically")
    print("3. Use VF commands like vf_read, vf_write, etc.")
    # Update base setup to include proper MCP paths
    print("-e ")${YELLOW}Updating base setup configuration...${NC}"
    os.chdir(""$PROJECT_ROOT"")
    # Make the script executable
    subprocess.run("chmod +x "$SCRIPT_DIR/install-filesystem-mcp.sh"", shell=True)
    print("-e ")${GREEN}✅ Installation complete!${NC}"

if __name__ == "__main__":
    main()