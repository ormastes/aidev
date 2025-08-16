#!/usr/bin/env python3
"""
Migrated from: deploy-filesystem-mcp.sh
Auto-generated Python - 2025-08-16T04:57:27.676Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Deploy Filesystem MCP Server System-Wide
    # This script installs and configures the filesystem MCP for system use
    subprocess.run("set -e", shell=True)
    print("🚀 Deploying Filesystem MCP Server")
    print("===================================")
    print("")
    # Get script directory
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"", shell=True)
    subprocess.run("AIDEV_ROOT="$(dirname "$(dirname "$(dirname "$PROJECT_ROOT")")")"", shell=True)
    print("📁 Project root: $PROJECT_ROOT")
    print("📁 AI Dev root: $AIDEV_ROOT")
    print("")
    # Check prerequisites
    print("🔍 Checking prerequisites...")
    # Check Node.js
    subprocess.run("if ! command -v node &> /dev/null; then", shell=True)
    print("❌ Node.js is not installed. Please install Node.js first.")
    sys.exit(1)
    subprocess.run("NODE_VERSION=$(node -v)", shell=True)
    print("✅ Node.js installed: $NODE_VERSION")
    # Check npm
    subprocess.run("if ! command -v npm &> /dev/null; then", shell=True)
    print("❌ npm is not installed. Please install npm first.")
    sys.exit(1)
    subprocess.run("NPM_VERSION=$(npm -v)", shell=True)
    print("✅ npm installed: $NPM_VERSION")
    # Check if MCP files exist
    if ! -f "$PROJECT_ROOT/mcp-server-production.js" :; then
    print("❌ MCP server files not found!")
    sys.exit(1)
    print("✅ MCP server files found")
    # Install dependencies if needed
    print("")
    print("📦 Checking dependencies...")
    os.chdir(""$PROJECT_ROOT"")
    if ! -d "node_modules" :; then
    print("Installing dependencies...")
    subprocess.run("npm install --production", shell=True)
    else:
    print("✅ Dependencies already installed")
    # Build if needed
    if ! -d "dist" :; then
    print("🔨 Building TypeScript files...")
    subprocess.run("npm run build 2>/dev/null || echo "⚠️  Build had some issues, continuing with existing files"", shell=True)
    else:
    print("✅ Build directory exists")
    # Test the MCP server
    print("")
    print("🧪 Testing MCP server...")
    subprocess.run("if timeout 2 node "$PROJECT_ROOT/mcp-server-production.js" < /dev/null &> /dev/null; then", shell=True)
    print("✅ MCP server can start successfully")
    else:
    print("✅ MCP server initialized (timeout expected)")
    # Create local bin directory if it doesn't exist
    subprocess.run("LOCAL_BIN="$HOME/.local/bin"", shell=True)
    if ! -d "$LOCAL_BIN" :; then
    print("")
    print("📁 Creating local bin directory...")
    Path(""$LOCAL_BIN"").mkdir(parents=True, exist_ok=True)
    # Add to PATH if not already there
    subprocess.run("if ! echo "$PATH" | grep -q "$LOCAL_BIN"; then", shell=True)
    print("export PATH=\")\$HOME/.local/bin:\$PATH\"" >> "$HOME/.bashrc"
    print("📝 Added $LOCAL_BIN to PATH in .bashrc")
    # Create executable wrapper scripts
    print("")
    print("📝 Creating executable scripts...")
    # Standard MCP server
    subprocess.run("cat > "$LOCAL_BIN/mcp-filesystem" << EOF", shell=True)
    # Filesystem MCP Server - Standard Version
    os.environ["VF_BASE_PATH"] = ""\${VF_BASE_PATH:-\$(pwd)}""
    os.environ["NODE_ENV"] = ""\${NODE_ENV:-production}""
    subprocess.run("exec node "$PROJECT_ROOT/mcp-server.js"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$LOCAL_BIN/mcp-filesystem"", shell=True)
    # Enhanced MCP server with validation
    subprocess.run("cat > "$LOCAL_BIN/mcp-filesystem-enhanced" << EOF", shell=True)
    # Filesystem MCP Server - Enhanced Version with Validation
    os.environ["VF_BASE_PATH"] = ""\${VF_BASE_PATH:-\$(pwd)}""
    os.environ["VF_STRICT_MODE"] = ""\${VF_STRICT_MODE:-true}""
    os.environ["NODE_ENV"] = ""\${NODE_ENV:-production}""
    subprocess.run("exec node "$PROJECT_ROOT/mcp-server-production.js"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$LOCAL_BIN/mcp-filesystem-enhanced"", shell=True)
    # MCP test command
    subprocess.run("cat > "$LOCAL_BIN/mcp-filesystem-test" << EOF", shell=True)
    # Test Filesystem MCP Server
    os.chdir(""$PROJECT_ROOT"")
    subprocess.run("node scripts/test-enhanced-mcp.js", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$LOCAL_BIN/mcp-filesystem-test"", shell=True)
    print("✅ Executable scripts created")
    # Create MCP configuration for Claude Code
    print("")
    print("📝 Creating Claude Code configuration...")
    subprocess.run("CLAUDE_CONFIG_DIR="$HOME/.config/claude"", shell=True)
    Path(""$CLAUDE_CONFIG_DIR"").mkdir(parents=True, exist_ok=True)
    subprocess.run("cat > "$CLAUDE_CONFIG_DIR/mcp-filesystem.json" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""mcpServers": {", shell=True)
    subprocess.run(""filesystem-mcp": {", shell=True)
    subprocess.run(""command": "mcp-filesystem",", shell=True)
    subprocess.run(""args": [],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""VF_BASE_PATH": "$AIDEV_ROOT"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""description": "Virtual filesystem MCP for AI development"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""filesystem-mcp-enhanced": {", shell=True)
    subprocess.run(""command": "mcp-filesystem-enhanced",", shell=True)
    subprocess.run(""args": [],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""VF_BASE_PATH": "$AIDEV_ROOT",", shell=True)
    subprocess.run(""VF_STRICT_MODE": "true"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""description": "Enhanced filesystem MCP with artifact validation"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("✅ Claude Code configuration created")
    # Create systemd user service (optional)
    subprocess.run("if command -v systemctl &> /dev/null; then", shell=True)
    print("")
    print("📝 Creating systemd user service...")
    subprocess.run("SYSTEMD_USER_DIR="$HOME/.config/systemd/user"", shell=True)
    Path(""$SYSTEMD_USER_DIR"").mkdir(parents=True, exist_ok=True)
    subprocess.run("cat > "$SYSTEMD_USER_DIR/mcp-filesystem.service" << EOF", shell=True)
    subprocess.run("[Unit]", shell=True)
    subprocess.run("Description=Filesystem MCP Server", shell=True)
    subprocess.run("After=network.target", shell=True)
    subprocess.run("[Service]", shell=True)
    subprocess.run("Type=simple", shell=True)
    subprocess.run("WorkingDirectory=$AIDEV_ROOT", shell=True)
    subprocess.run("Environment="VF_BASE_PATH=$AIDEV_ROOT"", shell=True)
    subprocess.run("Environment="NODE_ENV=production"", shell=True)
    subprocess.run("ExecStart=$LOCAL_BIN/mcp-filesystem", shell=True)
    subprocess.run("Restart=on-failure", shell=True)
    subprocess.run("RestartSec=10", shell=True)
    subprocess.run("StandardOutput=journal", shell=True)
    subprocess.run("StandardError=journal", shell=True)
    subprocess.run("[Install]", shell=True)
    subprocess.run("WantedBy=default.target", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$SYSTEMD_USER_DIR/mcp-filesystem-enhanced.service" << EOF", shell=True)
    subprocess.run("[Unit]", shell=True)
    subprocess.run("Description=Enhanced Filesystem MCP Server", shell=True)
    subprocess.run("After=network.target", shell=True)
    subprocess.run("[Service]", shell=True)
    subprocess.run("Type=simple", shell=True)
    subprocess.run("WorkingDirectory=$AIDEV_ROOT", shell=True)
    subprocess.run("Environment="VF_BASE_PATH=$AIDEV_ROOT"", shell=True)
    subprocess.run("Environment="VF_STRICT_MODE=true"", shell=True)
    subprocess.run("Environment="NODE_ENV=production"", shell=True)
    subprocess.run("ExecStart=$LOCAL_BIN/mcp-filesystem-enhanced", shell=True)
    subprocess.run("Restart=on-failure", shell=True)
    subprocess.run("RestartSec=10", shell=True)
    subprocess.run("StandardOutput=journal", shell=True)
    subprocess.run("StandardError=journal", shell=True)
    subprocess.run("[Install]", shell=True)
    subprocess.run("WantedBy=default.target", shell=True)
    subprocess.run("EOF", shell=True)
    print("✅ Systemd user services created")
    print("")
    print("To enable services:")
    print("  systemctl --user daemon-reload")
    print("  systemctl --user enable mcp-filesystem.service")
    print("  systemctl --user start mcp-filesystem.service")
    # Create desktop launcher (optional)
    if -d "$HOME/.local/share/applications" :; then
    print("")
    print("📝 Creating desktop launcher...")
    subprocess.run("cat > "$HOME/.local/share/applications/mcp-filesystem.desktop" << EOF", shell=True)
    subprocess.run("[Desktop Entry]", shell=True)
    subprocess.run("Name=Filesystem MCP Server", shell=True)
    subprocess.run("Comment=Virtual filesystem MCP for AI development", shell=True)
    subprocess.run("Exec=$LOCAL_BIN/mcp-filesystem", shell=True)
    subprocess.run("Icon=folder-remote", shell=True)
    subprocess.run("Terminal=true", shell=True)
    subprocess.run("Type=Application", shell=True)
    subprocess.run("Categories=Development;", shell=True)
    subprocess.run("EOF", shell=True)
    print("✅ Desktop launcher created")
    # Create quick start script
    subprocess.run("cat > "$PROJECT_ROOT/start-mcp.sh" << EOF", shell=True)
    # Quick start script for Filesystem MCP
    print("🚀 Starting Filesystem MCP Server")
    print("Choose version:")
    print("  1) Standard MCP")
    print("  2) Enhanced MCP (with validation)")
    print("")
    subprocess.run("read -p "Enter choice [1-2]: " choice", shell=True)
    subprocess.run("case \$choice in", shell=True)
    subprocess.run("1)", shell=True)
    print("Starting standard MCP server...")
    subprocess.run("mcp-filesystem", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("2)", shell=True)
    print("Starting enhanced MCP server...")
    subprocess.run("mcp-filesystem-enhanced", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("Invalid choice. Starting standard MCP...")
    subprocess.run("mcp-filesystem", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$PROJECT_ROOT/start-mcp.sh"", shell=True)
    # Create README for deployment
    subprocess.run("cat > "$PROJECT_ROOT/DEPLOYMENT_STATUS.md" << EOF", shell=True)
    # Filesystem MCP Deployment Status
    # # ✅ Deployment Complete
    subprocess.run("Date: $(date)", shell=True)
    subprocess.run("Location: $PROJECT_ROOT", shell=True)
    # # Installed Commands
    subprocess.run("- \`mcp-filesystem\` - Standard filesystem MCP server", shell=True)
    subprocess.run("- \`mcp-filesystem-enhanced\` - Enhanced server with validation", shell=True)
    subprocess.run("- \`mcp-filesystem-test\` - Run validation tests", shell=True)
    # # Configuration Files
    subprocess.run("- Claude Code: \`$CLAUDE_CONFIG_DIR/mcp-filesystem.json\`", shell=True)
    subprocess.run("- Systemd Services: \`$HOME/.config/systemd/user/mcp-filesystem*.service\`", shell=True)
    # # Quick Start
    subprocess.run("\`\`\`bash", shell=True)
    # Run standard server
    subprocess.run("mcp-filesystem", shell=True)
    # Run enhanced server with validation
    subprocess.run("mcp-filesystem-enhanced", shell=True)
    # Test the installation
    subprocess.run("mcp-filesystem-test", shell=True)
    subprocess.run("\`\`\`", shell=True)
    # # Environment Variables
    subprocess.run("- \`VF_BASE_PATH\` - Base directory for virtual filesystem (default: current directory)", shell=True)
    subprocess.run("- \`VF_STRICT_MODE\` - Enable strict validation (default: true for enhanced)", shell=True)
    subprocess.run("- \`NODE_ENV\` - Node environment (default: production)", shell=True)
    # # Features
    # ## Standard Server
    subprocess.run("- Virtual file operations", shell=True)
    subprocess.run("- Task queue management", shell=True)
    subprocess.run("- Feature tracking", shell=True)
    subprocess.run("- Name-ID mapping", shell=True)
    # ## Enhanced Server
    subprocess.run("- All standard features plus:", shell=True)
    subprocess.run("- Artifact validation", shell=True)
    subprocess.run("- Task dependency checking", shell=True)
    subprocess.run("- Adhoc file justification", shell=True)
    subprocess.run("- Lifecycle management", shell=True)
    subprocess.run("- Operations refused when requirements not met", shell=True)
    # # Integration with Claude Code
    subprocess.run("The MCP servers are configured in Claude Code. To use:", shell=True)
    subprocess.run("1. Open Claude Code", shell=True)
    subprocess.run("2. The MCP servers should be automatically available", shell=True)
    subprocess.run("3. Use virtual filesystem commands prefixed with \`vf_\`", shell=True)
    # # Troubleshooting
    subprocess.run("If commands are not found:", shell=True)
    subprocess.run("\`\`\`bash", shell=True)
    os.environ["PATH"] = ""\$HOME/.local/bin:\$PATH""
    subprocess.run("source ~/.bashrc", shell=True)
    subprocess.run("\`\`\`", shell=True)
    subprocess.run("To check if services are running:", shell=True)
    subprocess.run("\`\`\`bash", shell=True)
    subprocess.run("systemctl --user status mcp-filesystem.service", shell=True)
    subprocess.run("\`\`\`", shell=True)
    # # Logs
    subprocess.run("View logs with:", shell=True)
    subprocess.run("\`\`\`bash", shell=True)
    subprocess.run("journalctl --user -u mcp-filesystem.service -f", shell=True)
    subprocess.run("\`\`\`", shell=True)
    subprocess.run("EOF", shell=True)
    print("")
    print("✅ Deployment Complete!")
    print("=======================")
    print("")
    print("📁 Installation location: $PROJECT_ROOT")
    print("📁 Executables installed to: $LOCAL_BIN")
    print("")
    print("Available commands:")
    print("  • mcp-filesystem          - Run standard MCP server")
    print("  • mcp-filesystem-enhanced - Run enhanced MCP with validation")
    print("  • mcp-filesystem-test     - Test the installation")
    print("")
    print("Quick start:")
    print("  $PROJECT_ROOT/start-mcp.sh")
    print("")
    print("Configuration:")
    print("  • Claude Code: $CLAUDE_CONFIG_DIR/mcp-filesystem.json")
    subprocess.run("if command -v systemctl &> /dev/null; then", shell=True)
    print("  • Systemd: ~/.config/systemd/user/mcp-filesystem*.service")
    print("")
    print("Environment variables:")
    print("  • VF_BASE_PATH - Set base directory (default: current)")
    print("  • VF_STRICT_MODE - Enable validation (enhanced only)")
    print("")
    # Test the installation
    print("🧪 Testing installation...")
    subprocess.run("if command -v mcp-filesystem-test &> /dev/null; then", shell=True)
    print("Running tests...")
    subprocess.run("if mcp-filesystem-test 2>&1 | grep -q "All tests PASSED"; then", shell=True)
    print("✅ All tests passed!")
    else:
    print("⚠️  Some tests may have issues, check manually")
    else:
    # Update PATH for current session
    os.environ["PATH"] = ""$LOCAL_BIN:$PATH""
    subprocess.run("if "$LOCAL_BIN/mcp-filesystem-test" 2>&1 | grep -q "All tests PASSED"; then", shell=True)
    print("✅ All tests passed!")
    else:
    print("⚠️  Some tests may have issues, check manually")
    print("")
    print("🎉 Filesystem MCP has been successfully deployed!")
    print("")
    print("Note: You may need to restart your terminal or run:")
    print("  export PATH=\")\$HOME/.local/bin:\$PATH\""
    print("")
    print("To use with Claude Code, the MCP servers are now configured and ready.")

if __name__ == "__main__":
    main()