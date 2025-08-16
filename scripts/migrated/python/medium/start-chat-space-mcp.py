#!/usr/bin/env python3
"""
Migrated from: start-chat-space-mcp.sh
Auto-generated Python - 2025-08-16T04:57:27.605Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Start Chat Space with MCP Integration
    subprocess.run("set -e", shell=True)
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    os.chdir(""$SCRIPT_DIR"")
    print("=========================================")
    print("Chat Space with MCP Integration")
    print("=========================================")
    # Check if node_modules exists
    if ! -d "node_modules" :; then
    print("Installing dependencies...")
    subprocess.run("npm install", shell=True)
    # Configuration
    subprocess.run("PORT="${CHAT_PORT:-3456}"", shell=True)
    subprocess.run("MCP_URL="${MCP_SERVER_URL:-ws://localhost:8080}"", shell=True)
    subprocess.run("ENABLE_MCP="${ENABLE_MCP:-true}"", shell=True)
    print("")
    print("Configuration:")
    print("  Chat Space Port: $PORT")
    print("  MCP Server URL: $MCP_URL")
    print("  MCP Enabled: $ENABLE_MCP")
    print("")
    # Check if MCP server is needed
    if "$ENABLE_MCP" = "true" :; then
    print("Checking MCP server availability...")
    # Extract host and port from MCP_URL
    subprocess.run("MCP_HOST=$(echo "$MCP_URL" | sed -E 's|^ws://([^:/]+).*|\1|')", shell=True)
    subprocess.run("MCP_PORT=$(echo "$MCP_URL" | sed -E 's|.*:([0-9]+).*|\1|')", shell=True)
    # Default port if not specified
    if -z "$MCP_PORT" ] || [ "$MCP_PORT" = "$MCP_URL" :; then
    subprocess.run("MCP_PORT=8080", shell=True)
    # Check if MCP server is running
    subprocess.run("if nc -z "$MCP_HOST" "$MCP_PORT" 2>/dev/null; then", shell=True)
    print("✅ MCP server is available at $MCP_URL")
    else:
    print("⚠️  Warning: MCP server not responding at $MCP_URL")
    print("Starting local MCP server in strict mode...")
    # Start MCP server in background
    os.chdir("../infra_filesystem-mcp")
    if -f "mcp-server-strict.js" :; then
    subprocess.run("node mcp-server-strict.js &", shell=True)
    subprocess.run("MCP_PID=$!", shell=True)
    print("Started MCP server (PID: $MCP_PID)")
    time.sleep(2)
    else:
    print("MCP server script not found, continuing without MCP")
    subprocess.run("ENABLE_MCP="false"", shell=True)
    os.chdir(""$SCRIPT_DIR"")
    # Build TypeScript if needed
    if ! -d "dist" ] || [ "src/index.ts" -nt "dist/index.js" :; then
    print("Building TypeScript...")
    subprocess.run("npm run build", shell=True)
    # Start Chat Space Server
    print("")
    print("Starting Chat Space Server...")
    print("=========================================")
    if "$ENABLE_MCP" = "true" :; then
    subprocess.run("npm run start:mcp -- --port "$PORT" --mcp-url "$MCP_URL"", shell=True)
    else:
    subprocess.run("npm run start -- --port "$PORT" --no-mcp", shell=True)

if __name__ == "__main__":
    main()