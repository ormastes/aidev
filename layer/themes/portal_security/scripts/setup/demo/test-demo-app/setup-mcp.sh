#!/usr/bin/env bash
# Setup MCP server for test-demo-app

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIDEV_PATH="$SCRIPT_DIR"

echo "Setting up MCP server for Claude Desktop..."

# Detect OS and Claude config directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

mkdir -p "$CLAUDE_CONFIG_DIR"

# Backup existing config
if [[ -f "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" ]]; then
    cp "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" "$CLAUDE_CONFIG_DIR/claude_desktop_config.json.backup"
fi

# Create MCP configuration
cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << EOL
{
  "mcpServers": {
    "test-demo-app": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "$AIDEV_PATH"]
    }
  }
}
EOL

echo "✅ MCP configuration installed"
echo "✅ Restart Claude Desktop to use MCP with test-demo-app"
