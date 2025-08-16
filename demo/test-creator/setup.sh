#!/usr/bin/env bash
# Setup script for aidev environment
# This is a wrapper that delegates to the setup-folder theme
# By default installs locally, use --user-wide for system-wide installation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIDEV_PATH="$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Aidev Setup ===${NC}"
echo "Using setup-folder theme for configuration"

# Check if setup-folder theme is available
if [[ ! -d "$AIDEV_PATH/layer/themes/setup-folder" ]]; then
    echo -e "${RED}[ERROR]${NC} setup-folder theme not found!"
    echo "Please ensure the aidev folder was properly installed."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is required but not found!"
    echo "Please install Node.js first."
    exit 1
fi

# Navigate to setup-folder theme
cd "$AIDEV_PATH/layer/themes/setup-folder"

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo -e "${BLUE}Installing setup-folder dependencies...${NC}"
    npm install
fi

# Build if necessary
if [[ ! -d "dist" ]] || [[ ! -f "dist/cli.js" ]]; then
    echo -e "${BLUE}Building setup-folder theme...${NC}"
    npm run build
fi

# Create a setup configuration file
cat > "$AIDEV_PATH/setup-config.json" << EOJ
{
  "targetDir": "$AIDEV_PATH",
  "deployedEnvironment": true,
  "mode": "$MODE"
}
EOJ

# Run the setup-folder MCP configuration
echo -e "${BLUE}Running MCP configuration...${NC}"

# Execute with Node.js directly, passing all arguments
node "$AIDEV_PATH/layer/themes/setup-folder/dist/cli.js" mcp-config \
    --target-dir "$AIDEV_PATH" \
    --deployed-environment \
    "$@"

# Clean up temporary config
rm -f "$AIDEV_PATH/setup-config.json"

echo -e "${GREEN}Setup complete!${NC}"
