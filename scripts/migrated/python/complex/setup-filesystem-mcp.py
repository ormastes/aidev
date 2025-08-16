#!/usr/bin/env python3
"""
Migrated from: setup-filesystem-mcp.sh
Auto-generated Python - 2025-08-16T04:57:27.699Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Filesystem MCP Setup Script
    # Installs and configures the filesystem MCP for this project
    print("╔════════════════════════════════════════════════╗")
    print("║     Filesystem MCP Installation & Setup         ║")
    print("╚════════════════════════════════════════════════╝")
    print("")
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Get script directory
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"", shell=True)
    print("📁 Project root: $PROJECT_ROOT")
    print("📁 MCP directory: $SCRIPT_DIR")
    print("")
    # Step 1: Check Bun or Node.js
    print("🔍 Checking JavaScript runtime...")
    subprocess.run("if command -v bun &> /dev/null; then", shell=True)
    print("-e ")${GREEN}✅ Bun $(bun --version) found${NC}"
    subprocess.run("RUNTIME="bun"", shell=True)
    subprocess.run("INSTALL_CMD="bun install --silent"", shell=True)
    subprocess.run("elif command -v node &> /dev/null; then", shell=True)
    subprocess.run("NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)", shell=True)
    if "$NODE_VERSION" -lt 18 :; then
    print("-e ")${YELLOW}⚠️  Node.js version is below 18. Some features may not work.${NC}"
    else:
    print("-e ")${GREEN}✅ Node.js $(node -v) found${NC}"
    subprocess.run("RUNTIME="node"", shell=True)
    subprocess.run("INSTALL_CMD="npm install --quiet"", shell=True)
    else:
    print("-e ")${RED}❌ Neither Bun nor Node.js is installed. Please install Bun or Node.js 18+ first.${NC}"
    sys.exit(1)
    # Step 2: Install dependencies
    print("")
    print("📦 Installing dependencies with $RUNTIME...")
    os.chdir(""$SCRIPT_DIR"")
    subprocess.run("$INSTALL_CMD", shell=True)
    if $? -eq 0 :; then
    print("-e ")${GREEN}✅ Dependencies installed successfully${NC}"
    else:
    print("-e ")${RED}❌ Failed to install dependencies${NC}"
    sys.exit(1)
    # Step 3: Configure MCP
    print("")
    print("⚙️  Configuring MCP...")
    # Update mcp-config.json with correct paths
    subprocess.run("cat > mcp-config.json << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""mcpServers": {", shell=True)
    subprocess.run(""filesystem-mcp": {", shell=True)
    subprocess.run(""command": "node",", shell=True)
    subprocess.run(""args": [", shell=True)
    subprocess.run(""$SCRIPT_DIR/mcp-server.js"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""VF_BASE_PATH": "$PROJECT_ROOT",", shell=True)
    subprocess.run(""NODE_ENV": "production"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""description": "Standard filesystem MCP server for virtual file operations"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""filesystem-mcp-enhanced": {", shell=True)
    subprocess.run(""command": "node",", shell=True)
    subprocess.run(""args": [", shell=True)
    subprocess.run(""$SCRIPT_DIR/mcp-server-enhanced.js"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""VF_BASE_PATH": "$PROJECT_ROOT",", shell=True)
    subprocess.run(""VF_STRICT_MODE": "true",", shell=True)
    subprocess.run(""NODE_ENV": "production"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""description": "Enhanced filesystem MCP with artifact validation and task queue enforcement"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""defaultServer": "filesystem-mcp-enhanced",", shell=True)
    subprocess.run(""features": {", shell=True)
    subprocess.run(""artifactValidation": true,", shell=True)
    subprocess.run(""taskDependencyChecking": true,", shell=True)
    subprocess.run(""featureTaskLinking": true,", shell=True)
    subprocess.run(""adhocJustification": true,", shell=True)
    subprocess.run(""lifecycleManagement": true", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✅ MCP configuration updated${NC}"
    # Step 4: Test MCP server
    print("")
    print("🧪 Testing MCP server...")
    # Test basic server
    subprocess.run("timeout 2s node mcp-server.js 2>/dev/null", shell=True)
    if $? -eq 124 :; then
    print("-e ")${GREEN}✅ Basic MCP server starts successfully${NC}"
    else:
    print("-e ")${YELLOW}⚠️  Basic MCP server test incomplete${NC}"
    # Test enhanced server
    subprocess.run("timeout 2s node mcp-server-enhanced.js 2>/dev/null", shell=True)
    if $? -eq 124 :; then
    print("-e ")${GREEN}✅ Enhanced MCP server starts successfully${NC}"
    else:
    print("-e ")${YELLOW}⚠️  Enhanced MCP server test incomplete${NC}"
    # Step 5: Create Claude configuration
    print("")
    print("🤖 Creating Claude configuration...")
    subprocess.run("CLAUDE_CONFIG_DIR="$HOME/.config/claude"", shell=True)
    Path(""$CLAUDE_CONFIG_DIR"").mkdir(parents=True, exist_ok=True)
    # Check if claude_desktop_config.json exists
    subprocess.run("CLAUDE_CONFIG="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"", shell=True)
    if -f "$CLAUDE_CONFIG" :; then
    print("-e ")${YELLOW}⚠️  Claude config already exists. Creating backup...${NC}"
    shutil.copy2(""$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup.$(date", "+%Y%m%d_%H%M%S)"")
    # Create or update Claude config
    subprocess.run("cat > "$CLAUDE_CONFIG" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""mcpServers": {", shell=True)
    subprocess.run(""filesystem-mcp": {", shell=True)
    subprocess.run(""command": "node",", shell=True)
    subprocess.run(""args": [", shell=True)
    subprocess.run(""$SCRIPT_DIR/mcp-server.js"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""VF_BASE_PATH": "$PROJECT_ROOT"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""filesystem-mcp-enhanced": {", shell=True)
    subprocess.run(""command": "node",", shell=True)
    subprocess.run(""args": [", shell=True)
    subprocess.run(""$SCRIPT_DIR/mcp-server-enhanced.js"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""VF_BASE_PATH": "$PROJECT_ROOT",", shell=True)
    subprocess.run(""VF_STRICT_MODE": "true"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✅ Claude configuration created at $CLAUDE_CONFIG${NC}"
    # Step 6: Deploy schema files to project root
    print("")
    print("📝 Deploying .vf.json schema files to project root...")
    # Use the deployment script to set up VF schema files
    subprocess.run("DEPLOY_SCRIPT="$SCRIPT_DIR/scripts/deploy-vf-schemas.sh"", shell=True)
    if -f "$DEPLOY_SCRIPT" :; then
    # Run deployment script in init mode
    subprocess.run("bash "$DEPLOY_SCRIPT" init", shell=True)
    else:
    print("-e ")${YELLOW}⚠️  Deployment script not found, using fallback method${NC}"
    # Fallback: Deploy vf.json files from schemas folder to project root
    subprocess.run("SCHEMA_DIR="$SCRIPT_DIR/schemas"", shell=True)
    # List of vf.json files to deploy
    subprocess.run("VF_FILES=("TASK_QUEUE.vf.json" "FEATURE.vf.json" "FILE_STRUCTURE.vf.json" "NAME_ID.vf.json")", shell=True)
    for VF_FILE in ["${VF_FILES[@]}"; do]:
    if -f "$SCHEMA_DIR/$VF_FILE" :; then
    if ! -f "$PROJECT_ROOT/$VF_FILE" :; then
    print("  Deploying $VF_FILE to project root...")
    shutil.copy2(""$SCHEMA_DIR/$VF_FILE"", ""$PROJECT_ROOT/$VF_FILE"")
    print("-e ")${GREEN}  ✅ Deployed $VF_FILE${NC}"
    else:
    print("-e ")${YELLOW}  ⚠️  $VF_FILE already exists in project root, skipping${NC}"
    else:
    print("-e ")${YELLOW}  ⚠️  $VF_FILE not found in schemas folder${NC}"
    # Create test directory
    subprocess.run("TEST_DIR="$PROJECT_ROOT/test-vf-files"", shell=True)
    Path(""$TEST_DIR"").mkdir(parents=True, exist_ok=True)
    # Create test file
    subprocess.run("cat > "$TEST_DIR/test.vf.json" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""metadata": {", shell=True)
    subprocess.run(""level": "test",", shell=True)
    subprocess.run(""path": "/test-vf-files/test.vf.json",", shell=True)
    subprocess.run(""version": "1.0.0",", shell=True)
    subprocess.run(""created_at": "$(date -Iseconds)",", shell=True)
    subprocess.run(""updated_at": "$(date -Iseconds)"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""content": {", shell=True)
    subprocess.run(""message": "This is a test virtual file",", shell=True)
    subprocess.run(""created_by": "setup script"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✅ Test files created${NC}"
    # Step 7: Summary
    print("")
    print("╔════════════════════════════════════════════════╗")
    print("║           Installation Complete! 🎉             ║")
    print("╚════════════════════════════════════════════════╝")
    print("")
    print("📋 Summary:")
    print("  • MCP servers installed at: $SCRIPT_DIR")
    print("  • Configuration file: $SCRIPT_DIR/mcp-config.json")
    print("  • Claude config: $CLAUDE_CONFIG")
    print("  • Test files: $TEST_DIR")
    print("")
    print("🚀 To use the filesystem MCP:")
    print("")
    print("  1. With Claude Desktop:")
    print("     - Restart Claude Desktop to load the new configuration")
    print("     - The MCP tools will be available automatically")
    print("")
    print("  2. Manually start the server:")
    print("     cd $SCRIPT_DIR")
    print("     node mcp-server.js          # Basic server")
    print("     node mcp-server-enhanced.js # Enhanced server")
    print("")
    print("  3. Available MCP tools:")
    print("     • read_vf_file     - Read .vf.json files")
    print("     • write_vf_file    - Write .vf.json files")
    print("     • list_vf_files    - List .vf.json files")
    print("     • read_task_queue  - Read TASK_QUEUE.vf.json")
    print("     • add_task         - Add tasks to queue")
    print("     • read_features    - Read FEATURE.vf.json")
    print("     • search_vf_content - Search in .vf.json files")
    print("")
    print("📚 Documentation: $SCRIPT_DIR/README.md")
    print("")

if __name__ == "__main__":
    main()