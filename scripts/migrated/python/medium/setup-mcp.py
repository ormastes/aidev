#!/usr/bin/env python3
"""
Migrated from: setup-mcp.sh
Auto-generated Python - 2025-08-16T04:57:27.617Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Setup MCP server for test-demo-app
    subprocess.run("set -euo pipefail", shell=True)
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("AIDEV_PATH="$SCRIPT_DIR"", shell=True)
    print("Setting up MCP server for Claude Desktop...")
    # Detect OS and Claude config directory
    if [ "$OSTYPE" == "darwin"* ]:; then
    subprocess.run("CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"", shell=True)
    elif [ "$OSTYPE" == "linux-gnu"* ]:; then
    subprocess.run("CLAUDE_CONFIG_DIR="$HOME/.config/Claude"", shell=True)
    else:
    print("Unsupported OS: $OSTYPE")
    sys.exit(1)
    Path(""$CLAUDE_CONFIG_DIR"").mkdir(parents=True, exist_ok=True)
    # Backup existing config
    if [ -f "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" ]:; then
    shutil.copy2(""$CLAUDE_CONFIG_DIR/claude_desktop_config.json"", ""$CLAUDE_CONFIG_DIR/claude_desktop_config.json.backup"")
    # Create MCP configuration
    subprocess.run("cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << EOL", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""mcpServers": {", shell=True)
    subprocess.run(""test-demo-app": {", shell=True)
    subprocess.run(""command": "npx",", shell=True)
    subprocess.run(""args": ["-y", "@modelcontextprotocol/server-filesystem", "$AIDEV_PATH"]", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOL", shell=True)
    print("✅ MCP configuration installed")
    print("✅ Restart Claude Desktop to use MCP with test-demo-app")

if __name__ == "__main__":
    main()