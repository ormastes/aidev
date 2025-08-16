#!/bin/bash
# QEMU Image Builder - Shell wrapper for TypeScript image builder
# This script calls the TypeScript implementation for actual logic

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_SCRIPT="$PROJECT_ROOT/src/cli/build-image.ts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js to use the image builder"
    exit 1
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${YELLOW}Warning: bun not found, installing dependencies...${NC}"
    cd "$PROJECT_ROOT"
    bun install
fi

# Install dependencies if package.json exists but node_modules doesn't
if [ -f "$PROJECT_ROOT/package.json" ] && [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    cd "$PROJECT_ROOT"
    bun install
fi

# Create package.json if it doesn't exist
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${BLUE}Initializing project...${NC}"
    cat > "$PROJECT_ROOT/package.json" << 'EOF'
{
  "name": "init-qemu",
  "version": "1.0.0",
  "description": "QEMU initialization and image building tools",
  "scripts": {
    "build": "tsc",
    "build-image": "ts-node src/cli/build-image.ts"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^4.1.2",
    "ora": "^5.4.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0"
  }
}
EOF
    cd "$PROJECT_ROOT"
    bun install
fi

# Run the TypeScript CLI
cd "$PROJECT_ROOT"
bun run ts-node "$CLI_SCRIPT" "$@"