#!/usr/bin/env bash
# Setup script for aidev environment
# This script configures the MCP server for Claude Desktop

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIDEV_PATH="$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting up aidev environment...${NC}"

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    OS="windows"
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

echo "Detected OS: $OS"
echo "Claude config directory: $CLAUDE_CONFIG_DIR"

# Create Claude config directory if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

# Backup existing config if present
if [[ -f "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" ]]; then
    echo "Backing up existing configuration..."
    cp "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" "$CLAUDE_CONFIG_DIR/claude_desktop_config.json.backup"
fi

# Generate configuration with actual path
cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << EOL
{
  "mcpServers": {
    "aidev": {
      "command": "node",
      "args": ["$AIDEV_PATH/scripts/mcp-server.js"],
      "env": {
        "AIDEV_ROOT": "$AIDEV_PATH"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "$AIDEV_PATH"]
    }
  }
}
EOL

echo -e "${GREEN}✅ MCP configuration installed${NC}"
echo -e "${GREEN}✅ aidev environment ready at: $AIDEV_PATH${NC}"
echo
echo "Next steps:"
echo "1. Restart Claude Desktop"
echo "2. The aidev MCP server will be available"
echo "3. Start using the aidev tools!"
echo
echo "To verify installation, check for MCP icon in Claude Desktop"
