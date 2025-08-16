#!/usr/bin/env python3
"""
Migrated from: deploy-enhanced-mcp.sh
Auto-generated Python - 2025-08-16T04:57:27.752Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Deploy Enhanced MCP Server to System
    # This script sets up the enhanced MCP server for production use
    subprocess.run("set -e", shell=True)
    print("🚀 Deploying Enhanced MCP Server to System")
    print("===========================================")
    # Get script directory
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"", shell=True)
    subprocess.run("AIDEV_ROOT="$(dirname "$(dirname "$(dirname "$PROJECT_ROOT")")")"", shell=True)
    print("📁 Project root: $PROJECT_ROOT")
    print("📁 AI Dev root: $AIDEV_ROOT")
    # Check if we're in the right directory
    if ! -f "$PROJECT_ROOT/mcp-server-enhanced.js" :; then
    print("❌ Error: mcp-server-enhanced.js not found!")
    print("   Expected location: $PROJECT_ROOT/mcp-server-enhanced.js")
    sys.exit(1)
    # Check if dist directory exists
    if ! -d "$PROJECT_ROOT/dist" :; then
    print("🔨 Building TypeScript files...")
    os.chdir(""$PROJECT_ROOT"")
    subprocess.run("npm run build || echo "⚠️  Build had some errors, continuing with existing files"", shell=True)
    # Test the enhanced MCP
    print("")
    print("🧪 Running validation tests...")
    subprocess.run("if node "$PROJECT_ROOT/scripts/test-enhanced-mcp.js"; then", shell=True)
    print("✅ All tests passed!")
    else:
    print("❌ Tests failed! Fix issues before deploying.")
    sys.exit(1)
    # Create symlink for global access (optional)
    subprocess.run("GLOBAL_MCP_DIR="$HOME/.local/bin"", shell=True)
    if -d "$GLOBAL_MCP_DIR" :; then
    print("")
    print("📌 Creating global command...")
    subprocess.run("cat > "$GLOBAL_MCP_DIR/mcp-enhanced" << EOF", shell=True)
    subprocess.run("VF_BASE_PATH="\${VF_BASE_PATH:-\$(pwd)}" \\", shell=True)
    subprocess.run("VF_STRICT_MODE="\${VF_STRICT_MODE:-true}" \\", shell=True)
    subprocess.run("node "$PROJECT_ROOT/mcp-server-enhanced.js"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$GLOBAL_MCP_DIR/mcp-enhanced"", shell=True)
    print("✅ Global command created: mcp-enhanced")
    # Create systemd service file (optional)
    subprocess.run("if command -v systemctl &> /dev/null; then", shell=True)
    print("")
    print("📝 Creating systemd service file...")
    subprocess.run("cat > /tmp/mcp-enhanced.service << EOF", shell=True)
    subprocess.run("[Unit]", shell=True)
    subprocess.run("Description=Enhanced MCP Server with Artifact Validation", shell=True)
    subprocess.run("After=network.target", shell=True)
    subprocess.run("[Service]", shell=True)
    subprocess.run("Type=simple", shell=True)
    subprocess.run("User=$USER", shell=True)
    subprocess.run("WorkingDirectory=$AIDEV_ROOT", shell=True)
    subprocess.run("Environment="VF_BASE_PATH=$AIDEV_ROOT"", shell=True)
    subprocess.run("Environment="VF_STRICT_MODE=true"", shell=True)
    subprocess.run("Environment="NODE_ENV=production"", shell=True)
    subprocess.run("ExecStart=/usr/bin/node $PROJECT_ROOT/mcp-server-enhanced.js", shell=True)
    subprocess.run("Restart=on-failure", shell=True)
    subprocess.run("RestartSec=10", shell=True)
    subprocess.run("[Install]", shell=True)
    subprocess.run("WantedBy=multi-user.target", shell=True)
    subprocess.run("EOF", shell=True)
    print("✅ Service file created at: /tmp/mcp-enhanced.service")
    print("   To install: sudo cp /tmp/mcp-enhanced.service /etc/systemd/system/")
    print("   To enable: sudo systemctl enable mcp-enhanced")
    print("   To start: sudo systemctl start mcp-enhanced")
    # Create launcher script
    print("")
    print("📝 Creating launcher script...")
    subprocess.run("cat > "$PROJECT_ROOT/run-enhanced-mcp.sh" << EOF", shell=True)
    # Enhanced MCP Server Launcher
    print("🚀 Starting Enhanced MCP Server")
    print("================================")
    print("Base path: \${VF_BASE_PATH:-$AIDEV_ROOT}")
    print("Strict mode: \${VF_STRICT_MODE:-true}")
    print("")
    print("Features enabled:")
    print("  ✅ Artifact validation")
    print("  ✅ Task dependency checking")
    print("  ✅ Feature-task linking")
    print("  ✅ Adhoc justification")
    print("  ✅ Lifecycle management")
    print("")
    subprocess.run("VF_BASE_PATH="\${VF_BASE_PATH:-$AIDEV_ROOT}" \\", shell=True)
    subprocess.run("VF_STRICT_MODE="\${VF_STRICT_MODE:-true}" \\", shell=True)
    subprocess.run("NODE_ENV="production" \\", shell=True)
    subprocess.run("exec node "$PROJECT_ROOT/mcp-server-enhanced.js"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$PROJECT_ROOT/run-enhanced-mcp.sh"", shell=True)
    # Display deployment summary
    print("")
    print("✅ Deployment Complete!")
    print("=======================")
    print("")
    print("📁 Installation location: $PROJECT_ROOT")
    print("")
    print("To run the enhanced MCP server:")
    print("  1. Direct: npm run mcp-server-enhanced")
    print("  2. Script: $PROJECT_ROOT/run-enhanced-mcp.sh")
    if -f "$GLOBAL_MCP_DIR/mcp-enhanced" :; then
    print("  3. Global: mcp-enhanced")
    print("")
    print("To test the server:")
    print("  npm run mcp-test")
    print("")
    print("MCP Configuration:")
    print("  $PROJECT_ROOT/mcp-config.json")
    print("")
    print("Environment variables:")
    print("  VF_BASE_PATH: Set the base directory (default: $AIDEV_ROOT)")
    print("  VF_STRICT_MODE: Enable/disable strict validation (default: true)")
    print("")
    print("Key features:")
    print("  🛡️  Refuses deployment without proper artifacts")
    print("  🛡️  Refuses refactoring without tests")
    print("  🛡️  Requires justification for adhoc files")
    print("  🛡️  Validates task dependencies")
    print("  🛡️  Enforces artifact lifecycle states")

if __name__ == "__main__":
    main()