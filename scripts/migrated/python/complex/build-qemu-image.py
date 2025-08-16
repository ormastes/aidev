#!/usr/bin/env python3
"""
Migrated from: build-qemu-image.sh
Auto-generated Python - 2025-08-16T04:57:27.785Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # QEMU Image Builder - Shell wrapper for TypeScript image builder
    # This script calls the TypeScript implementation for actual logic
    subprocess.run("set -e", shell=True)
    # Configuration
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"", shell=True)
    subprocess.run("CLI_SCRIPT="$PROJECT_ROOT/src/cli/build-image.ts"", shell=True)
    # Colors
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    # Check if Node.js is installed
    subprocess.run("if ! command -v node &> /dev/null; then", shell=True)
    print("-e ")${RED}Error: Node.js is not installed${NC}"
    print("Please install Node.js to use the image builder")
    sys.exit(1)
    # Check if bun is installed
    subprocess.run("if ! command -v bun &> /dev/null; then", shell=True)
    print("-e ")${YELLOW}Warning: bun not found, installing dependencies...${NC}"
    os.chdir(""$PROJECT_ROOT"")
    subprocess.run("bun install", shell=True)
    # Install dependencies if package.json exists but node_modules doesn't
    if -f "$PROJECT_ROOT/package.json" ] && [ ! -d "$PROJECT_ROOT/node_modules" :; then
    print("-e ")${BLUE}Installing dependencies...${NC}"
    os.chdir(""$PROJECT_ROOT"")
    subprocess.run("bun install", shell=True)
    # Create package.json if it doesn't exist
    if ! -f "$PROJECT_ROOT/package.json" :; then
    print("-e ")${BLUE}Initializing project...${NC}"
    subprocess.run("cat > "$PROJECT_ROOT/package.json" << 'EOF'", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""name": "init-qemu",", shell=True)
    subprocess.run(""version": "1.0.0",", shell=True)
    subprocess.run(""description": "QEMU initialization and image building tools",", shell=True)
    subprocess.run(""scripts": {", shell=True)
    subprocess.run(""build": "tsc",", shell=True)
    subprocess.run(""build-image": "ts-node src/cli/build-image.ts"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""dependencies": {", shell=True)
    subprocess.run(""commander": "^11.0.0",", shell=True)
    subprocess.run(""chalk": "^4.1.2",", shell=True)
    subprocess.run(""ora": "^5.4.1"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""devDependencies": {", shell=True)
    subprocess.run(""@types/node": "^20.0.0",", shell=True)
    subprocess.run(""typescript": "^5.0.0",", shell=True)
    subprocess.run(""ts-node": "^10.9.0"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    os.chdir(""$PROJECT_ROOT"")
    subprocess.run("bun install", shell=True)
    # Run the TypeScript CLI
    os.chdir(""$PROJECT_ROOT"")
    subprocess.run("bun run ts-node "$CLI_SCRIPT" "$@"", shell=True)

if __name__ == "__main__":
    main()