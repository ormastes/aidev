#!/usr/bin/env python3
"""
Migrated from: setup.sh
Auto-generated Python - 2025-08-16T04:57:27.792Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Setup script for aidev environment
    # This is a wrapper that delegates to the setup-folder theme
    # By default installs locally, use --user-wide for system-wide installation
    subprocess.run("set -euo pipefail", shell=True)
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("AIDEV_PATH="$SCRIPT_DIR"", shell=True)
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${BLUE}=== Aidev Setup ===${NC}"
    print("Using setup-folder theme for configuration")
    # Check if setup-folder theme is available
    if [ ! -d "$AIDEV_PATH/layer/themes/setup-folder" ]:; then
    print("-e ")${RED}[ERROR]${NC} setup-folder theme not found!"
    print("Please ensure the aidev folder was properly installed.")
    sys.exit(1)
    # Check if Node.js is available
    subprocess.run("if ! command -v node &> /dev/null; then", shell=True)
    print("-e ")${RED}[ERROR]${NC} Node.js is required but not found!"
    print("Please install Node.js first.")
    sys.exit(1)
    # Navigate to setup-folder theme
    os.chdir(""$AIDEV_PATH/layer/themes/setup-folder"")
    # Install dependencies if needed
    if [ ! -d "node_modules" ]:; then
    print("-e ")${BLUE}Installing setup-folder dependencies...${NC}"
    subprocess.run("npm install", shell=True)
    # Build if necessary
    if [ ! -d "dist" ]] || [[ ! -f "dist/cli.js" ]:; then
    print("-e ")${BLUE}Building setup-folder theme...${NC}"
    subprocess.run("npm run build", shell=True)
    # Create a setup configuration file
    subprocess.run("cat > "$AIDEV_PATH/setup-config.json" << EOJ", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""targetDir": "$AIDEV_PATH",", shell=True)
    subprocess.run(""deployedEnvironment": true,", shell=True)
    subprocess.run(""mode": "$MODE"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOJ", shell=True)
    # Run the setup-folder MCP configuration
    print("-e ")${BLUE}Running MCP configuration...${NC}"
    # Execute with Node.js directly, passing all arguments
    subprocess.run("node "$AIDEV_PATH/layer/themes/setup-folder/dist/cli.js" mcp-config \", shell=True)
    subprocess.run("--target-dir "$AIDEV_PATH" \", shell=True)
    subprocess.run("--deployed-environment \", shell=True)
    subprocess.run(""$@"", shell=True)
    # Clean up temporary config
    subprocess.run("rm -f "$AIDEV_PATH/setup-config.json"", shell=True)
    print("-e ")${GREEN}Setup complete!${NC}"

if __name__ == "__main__":
    main()