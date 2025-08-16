#!/usr/bin/env bash
# Deploy MCP Server for AI Development Workspace

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Deploying MCP Server for AI Development ===${NC}"

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_DIR="$PROJECT_ROOT/scripts/setup/release/filesystem_mcp"
CONFIG_DIR="$HOME/.config/claude"

# Check if MCP directory exists
if [[ ! -d "$MCP_DIR" ]]; then
    echo -e "${RED}Error: MCP directory not found at $MCP_DIR${NC}"
    exit 1
fi

# Navigate to MCP directory
cd "$MCP_DIR"

# Check if node_modules exist
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    bun install
fi

# Check if dist folder exists (compiled TypeScript)
if [[ ! -d "dist" ]]; then
    echo -e "${YELLOW}No dist folder found. The pre-compiled version will be used.${NC}"
fi

# Create Claude config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Create MCP configuration for Claude
cat > "$CONFIG_DIR/claude_desktop_config.json" << EOF
{
  "mcpServers": {
    "filesystem_mcp": {
      "command": "node",
      "args": ["$MCP_DIR/mcp-server.js"],
      "env": {
        "NODE_ENV": "production",
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

echo -e "${GREEN}✓ MCP configuration created at: $CONFIG_DIR/claude_desktop_config.json${NC}"

# Test the MCP server
echo -e "${BLUE}Testing MCP server...${NC}"
timeout 2s node "$MCP_DIR/mcp-server.js" 2>&1 | head -5 || true

# Create a systemd service file for persistent deployment (optional)
if command -v systemctl >/dev/null 2>&1; then
    echo -e "${BLUE}Creating systemd service file...${NC}"
    
    cat > "$HOME/.config/systemd/user/filesystem-mcp.service" << EOF
[Unit]
Description=Filesystem MCP Server for AI Development
After=network.target

[Service]
Type=simple
WorkingDirectory=$MCP_DIR
ExecStart=/usr/bin/node $MCP_DIR/mcp-server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"
Environment="VF_BASE_PATH=$PROJECT_ROOT"

[Install]
WantedBy=default.target
EOF

    echo -e "${GREEN}✓ Systemd service file created${NC}"
    echo -e "${YELLOW}To enable the service, run:${NC}"
    echo "  systemctl --user daemon-reload"
    echo "  systemctl --user enable filesystem-mcp"
    echo "  systemctl --user start filesystem-mcp"
fi

# Create convenience scripts
echo -e "${BLUE}Creating convenience scripts...${NC}"

# Start script
cat > "$PROJECT_ROOT/start-mcp.sh" << 'EOF'
#!/usr/bin/env bash
# Start MCP Server

MCP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/scripts/setup/release/filesystem_mcp" && pwd)"
cd "$MCP_DIR"
echo "Starting MCP server..."
node mcp-server.js
EOF
chmod +x "$PROJECT_ROOT/start-mcp.sh"

# Test script
cat > "$PROJECT_ROOT/test-mcp.sh" << 'EOF'
#!/usr/bin/env bash
# Test MCP Server

echo "Testing MCP server connection..."
echo '{"method": "vf_get_tasks", "params": {"file": "TASK_QUEUE.vf.json"}, "id": 1}' | \
  node "$(dirname "${BASH_SOURCE[0]}")/scripts/setup/release/filesystem_mcp/mcp-server.js"
EOF
chmod +x "$PROJECT_ROOT/test-mcp.sh"

echo -e "${GREEN}=== MCP Server Deployment Complete ===${NC}"
echo
echo -e "${BLUE}MCP Server Details:${NC}"
echo "  - Server Path: $MCP_DIR/mcp-server.js"
echo "  - Base Path: $PROJECT_ROOT"
echo "  - Config File: $CONFIG_DIR/claude_desktop_config.json"
echo
echo -e "${BLUE}Available Commands:${NC}"
echo "  - vf_read: Read virtual files"
echo "  - vf_write: Write virtual files"
echo "  - vf_list_features: List features from FEATURE.vf.json"
echo "  - vf_get_tasks: Get tasks from TASK_QUEUE.vf.json"
echo "  - vf_pop_task: Pop a task from the queue"
echo "  - vf_complete_task: Mark a task as completed"
echo
echo -e "${BLUE}Quick Start:${NC}"
echo "  ./start-mcp.sh    # Start the MCP server"
echo "  ./test-mcp.sh     # Test the MCP server"
echo
echo -e "${YELLOW}Note: Restart Claude Desktop to load the new MCP configuration${NC}"