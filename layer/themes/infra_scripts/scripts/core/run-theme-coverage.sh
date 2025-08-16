#!/bin/bash

# Run theme coverage tests with direct root connection
# No CLI or server dependencies required

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Theme Coverage Runner (Direct Connection) ===${NC}"
echo "Running coverage tests for themes with direct root connection..."
echo ""

# Create coverage directory
mkdir -p "$PROJECT_ROOT/gen/coverage/themes"

# Function to run coverage for a theme
run_theme_coverage() {
    local theme_path="$1"
    local theme_name="$(basename "$theme_path")"
    
    echo -e "${BLUE}Testing $theme_name...${NC}"
    
    if [ ! -f "$theme_path/jest.config.js" ]; then
        echo -e "${YELLOW}Skipping $theme_name - no jest config${NC}"
        return
    fi
    
    cd "$theme_path"
    
    # Install dependencies if needed
    if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        bun install --silent
    fi
    
    # Run tests with coverage
    if bun test --coverage --silent; then
        echo -e "${GREEN}✓ $theme_name coverage complete${NC}"
        
        # Copy coverage to root
        if [ -f "coverage/coverage-final.json" ]; then
            cp "coverage/coverage-final.json" "$PROJECT_ROOT/gen/coverage/themes/$theme_name-coverage.json"
        fi
    else
        echo -e "${RED}✗ $theme_name coverage failed${NC}"
    fi
    
    echo ""
}

# Run coverage for priority themes
PRIORITY_THEMES=(
    "pocketflow"
    "story-reporter" 
    "gui-selector"
    "chat-space"
)

for theme in "${PRIORITY_THEMES[@]}"; do
    theme_path="$PROJECT_ROOT/layer/themes/$theme"
    if [ -d "$theme_path" ]; then
        run_theme_coverage "$theme_path"
    fi
done

echo -e "${GREEN}=== Coverage Complete ===${NC}"
echo "Coverage reports saved to: $PROJECT_ROOT/gen/coverage/themes/"
echo ""
echo "To view aggregated coverage:"
echo "  cd $PROJECT_ROOT/layer/themes/coverage-aggregator"
echo "  bun run generate-report"