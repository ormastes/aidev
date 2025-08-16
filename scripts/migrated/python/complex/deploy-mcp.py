#!/usr/bin/env python3
"""
Migrated from: deploy-mcp.sh
Auto-generated Python - 2025-08-16T04:57:27.754Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Deploy MCP Server for AI Development Workspace
    subprocess.run("set -euo pipefail", shell=True)
    # Colors for output
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${BLUE}=== Deploying MCP Server for AI Development ===${NC}"
    # Configuration
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"", shell=True)
    subprocess.run("MCP_DIR="$PROJECT_ROOT/scripts/setup/release/filesystem_mcp"", shell=True)
    subprocess.run("CONFIG_DIR="$HOME/.config/claude"", shell=True)
    # Check if MCP directory exists
    if [ ! -d "$MCP_DIR" ]:; then
    print("-e ")${RED}Error: MCP directory not found at $MCP_DIR${NC}"
    sys.exit(1)
    # Navigate to MCP directory
    os.chdir(""$MCP_DIR"")
    # Check if node_modules exist
    if [ ! -d "node_modules" ]:; then
    print("-e ")${YELLOW}Installing dependencies...${NC}"
    subprocess.run("bun install", shell=True)
    # Check if dist folder exists (compiled TypeScript)
    if [ ! -d "dist" ]:; then
    print("-e ")${YELLOW}No dist folder found. The pre-compiled version will be used.${NC}"
    # Create Claude config directory if it doesn't exist
    Path(""$CONFIG_DIR"").mkdir(parents=True, exist_ok=True)
    # Create MCP configuration for Claude
    subprocess.run("cat > "$CONFIG_DIR/claude_desktop_config.json" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""mcpServers": {", shell=True)
    subprocess.run(""filesystem_mcp": {", shell=True)
    subprocess.run(""command": "node",", shell=True)
    subprocess.run(""args": ["$MCP_DIR/mcp-server.js"],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""NODE_ENV": "production",", shell=True)
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
    print("-e ")${GREEN}✓ MCP configuration created at: $CONFIG_DIR/claude_desktop_config.json${NC}"
    # Test the MCP server
    print("-e ")${BLUE}Testing MCP server...${NC}"
    subprocess.run("timeout 2s node "$MCP_DIR/mcp-server.js" 2>&1 | head -5 || true", shell=True)
    # Create a systemd service file for persistent deployment (optional)
    subprocess.run("if command -v systemctl >/dev/null 2>&1; then", shell=True)
    print("-e ")${BLUE}Creating systemd service file...${NC}"
    subprocess.run("cat > "$HOME/.config/systemd/user/filesystem-mcp.service" << EOF", shell=True)
    subprocess.run("[Unit]", shell=True)
    subprocess.run("Description=Filesystem MCP Server for AI Development", shell=True)
    subprocess.run("After=network.target", shell=True)
    subprocess.run("[Service]", shell=True)
    subprocess.run("Type=simple", shell=True)
    subprocess.run("WorkingDirectory=$MCP_DIR", shell=True)
    subprocess.run("ExecStart=/usr/bin/node $MCP_DIR/mcp-server.js", shell=True)
    subprocess.run("Restart=on-failure", shell=True)
    subprocess.run("RestartSec=10", shell=True)
    subprocess.run("StandardOutput=journal", shell=True)
    subprocess.run("StandardError=journal", shell=True)
    subprocess.run("Environment="NODE_ENV=production"", shell=True)
    subprocess.run("Environment="VF_BASE_PATH=$PROJECT_ROOT"", shell=True)
    subprocess.run("[Install]", shell=True)
    subprocess.run("WantedBy=default.target", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✓ Systemd service file created${NC}"
    print("-e ")${YELLOW}To enable the service, run:${NC}"
    print("  systemctl --user daemon-reload")
    print("  systemctl --user enable filesystem-mcp")
    print("  systemctl --user start filesystem-mcp")
    # Create convenience scripts
    print("-e ")${BLUE}Creating convenience scripts...${NC}"
    # Start script
    subprocess.run("cat > "$PROJECT_ROOT/start-mcp.sh" << 'EOF'", shell=True)
    # Start MCP Server
    subprocess.run("MCP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/scripts/setup/release/filesystem_mcp" && pwd)"", shell=True)
    os.chdir(""$MCP_DIR"")
    print("Starting MCP server...")
    subprocess.run("node mcp-server.js", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$PROJECT_ROOT/start-mcp.sh"", shell=True)
    # Test script
    subprocess.run("cat > "$PROJECT_ROOT/test-mcp.sh" << 'EOF'", shell=True)
    # Test MCP Server
    print("Testing MCP server connection...")
    print("'{")method": "vf_get_tasks", "params": {"file": "TASK_QUEUE.vf.json"}, "id": 1}' | \
    subprocess.run("node "$(dirname "${BASH_SOURCE[0]}")/scripts/setup/release/filesystem_mcp/mcp-server.js"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$PROJECT_ROOT/test-mcp.sh"", shell=True)
    print("-e ")${GREEN}=== MCP Server Deployment Complete ===${NC}"
    subprocess.run("echo", shell=True)
    print("-e ")${BLUE}MCP Server Details:${NC}"
    print("  - Server Path: $MCP_DIR/mcp-server.js")
    print("  - Base Path: $PROJECT_ROOT")
    print("  - Config File: $CONFIG_DIR/claude_desktop_config.json")
    subprocess.run("echo", shell=True)
    print("-e ")${BLUE}Available Commands:${NC}"
    print("  - vf_read: Read virtual files")
    print("  - vf_write: Write virtual files")
    print("  - vf_list_features: List features from FEATURE.vf.json")
    print("  - vf_get_tasks: Get tasks from TASK_QUEUE.vf.json")
    print("  - vf_pop_task: Pop a task from the queue")
    print("  - vf_complete_task: Mark a task as completed")
    subprocess.run("echo", shell=True)
    print("-e ")${BLUE}Quick Start:${NC}"
    print("  ./start-mcp.sh    # Start the MCP server")
    print("  ./test-mcp.sh     # Test the MCP server")
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}Note: Restart Claude Desktop to load the new MCP configuration${NC}"

if __name__ == "__main__":
    main()