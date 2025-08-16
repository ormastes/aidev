#!/bin/bash

# Install filesystem-mcp for current and child folders

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Installing filesystem-mcp for AI Development Platform${NC}"
echo "============================================="

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Build filesystem-mcp
echo -e "${YELLOW}Building filesystem-mcp theme...${NC}"
cd "$PROJECT_ROOT/layer/themes/filesystem_mcp"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}Creating package.json for filesystem-mcp...${NC}"
    cat > package.json << 'EOF'
{
  "name": "filesystem-mcp",
  "version": "1.0.0",
  "description": "Filesystem MCP theme for AI Development Platform",
  "main": "mcp-server.js",
  "scripts": {
    "start": "node mcp-server.js",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
EOF
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}Dependencies already installed. Updating...${NC}"
    npm update
else
    npm install
fi

# Build TypeScript files if needed
if [ -f "tsconfig.json" ]; then
    echo -e "${YELLOW}Building TypeScript files...${NC}"
    bunx tsc
fi

# Create MCP server file if it doesn't exist
if [ ! -f "mcp-server.js" ]; then
    echo -e "${YELLOW}Creating MCP server file...${NC}"
    cat > mcp-server.js << 'EOF'
#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const fs = require('fs').promises;
const path = require('path');

// Import VF wrappers
const { VFFileWrapper } = require('./children/VFFileWrapper');
const { VFNameIdWrapper } = require('./children/VFNameIdWrapper');
const { VFTaskQueueWrapper } = require('./children/VFTaskQueueWrapper');
const { VFFileStructureWrapper } = require('./children/VFFileStructureWrapper');

class FileSystemMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'filesystem-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.basePath = process.env.VF_BASE_PATH || process.cwd();
    this.setupHandlers();
  }

  setupHandlers() {
    // VF File operations
    this.server.setRequestHandler('vf_read', async (request) => {
      const { path: filePath } = request.params;
      const wrapper = new VFFileWrapper();
      return { content: await wrapper.read(path.join(this.basePath, filePath)) };
    });

    this.server.setRequestHandler('vf_write', async (request) => {
      const { path: filePath, content } = request.params;
      const wrapper = new VFFileWrapper();
      await wrapper.write(path.join(this.basePath, filePath), content);
      return { success: true };
    });

    // Task Queue operations
    this.server.setRequestHandler('vf_get_tasks', async (request) => {
      const wrapper = new VFTaskQueueWrapper();
      return { tasks: await wrapper.getTasks(this.basePath) };
    });

    this.server.setRequestHandler('vf_push_task', async (request) => {
      const { task } = request.params;
      const wrapper = new VFTaskQueueWrapper();
      await wrapper.pushTask(this.basePath, task);
      return { success: true };
    });

    this.server.setRequestHandler('vf_pop_task', async (request) => {
      const wrapper = new VFTaskQueueWrapper();
      return { task: await wrapper.popTask(this.basePath) };
    });

    this.server.setRequestHandler('vf_complete_task', async (request) => {
      const { taskId } = request.params;
      const wrapper = new VFTaskQueueWrapper();
      await wrapper.completeTask(this.basePath, taskId);
      return { success: true };
    });

    // Name ID operations
    this.server.setRequestHandler('vf_get_name_id', async (request) => {
      const { name } = request.params;
      const wrapper = new VFNameIdWrapper();
      return { data: await wrapper.get(this.basePath, name) };
    });

    this.server.setRequestHandler('vf_set_name_id', async (request) => {
      const { name, data } = request.params;
      const wrapper = new VFNameIdWrapper();
      await wrapper.set(this.basePath, name, data);
      return { success: true };
    });

    // Feature operations
    this.server.setRequestHandler('vf_list_features', async (request) => {
      const featurePath = path.join(this.basePath, 'FEATURE.vf.json');
      try {
        const content = await fs.readFile(featurePath, 'utf-8');
        return { features: JSON.parse(content) };
      } catch (error) {
        return { features: {} };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filesystem MCP Server started');
  }
}

// Start the server
const server = new FileSystemMCPServer();
server.start().catch(console.error);
EOF
    chmod +x mcp-server.js
fi

# Create claude_config.json for current folder
echo -e "${YELLOW}Creating Claude configuration for current folder...${NC}"
CLAUDE_CONFIG_PATH="$PROJECT_ROOT/claude_config.json"
cat > "$CLAUDE_CONFIG_PATH" << EOF
{
  "mcpServers": {
    "filesystem_mcp": {
      "command": "node",
      "args": ["$PROJECT_ROOT/layer/themes/filesystem_mcp/mcp-server.js"],
      "env": {
        "NODE_ENV": "development",
        "VF_BASE_PATH": "$PROJECT_ROOT"
      }
    }
  },
  "globalShortcuts": {
    "vf_read": "filesystem_mcp",
    "vf_write": "filesystem_mcp",
    "vf_list_features": "filesystem_mcp",
    "vf_get_tasks": "filesystem_mcp",
    "vf_pop_task": "filesystem_mcp",
    "vf_complete_task": "filesystem_mcp",
    "vf_push_task": "filesystem_mcp",
    "vf_get_name_id": "filesystem_mcp",
    "vf_set_name_id": "filesystem_mcp"
  }
}
EOF

echo -e "${GREEN}✅ Filesystem-mcp installed successfully!${NC}"
echo -e "${GREEN}📍 Claude configuration created at: $CLAUDE_CONFIG_PATH${NC}"
echo ""
echo -e "${YELLOW}To use filesystem-mcp with Claude:${NC}"
echo "1. Restart Claude Code"
echo "2. The MCP server will start automatically"
echo "3. Use VF commands like vf_read, vf_write, etc."

# Update base setup to include proper MCP paths
echo -e "${YELLOW}Updating base setup configuration...${NC}"
cd "$PROJECT_ROOT"

# Make the script executable
chmod +x "$SCRIPT_DIR/install-filesystem-mcp.sh"

echo -e "${GREEN}✅ Installation complete!${NC}"