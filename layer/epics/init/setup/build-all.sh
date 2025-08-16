#!/bin/bash
# Build all TypeScript projects in the LLM Agent Epic

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔨 Building all TypeScript projects..."
echo "====================================="

EPIC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
THEMES_ROOT="$(cd "$EPIC_ROOT/../../themes" && pwd)"

# Function to build a theme
build_theme() {
    local theme_name=$1
    local theme_path="$THEMES_ROOT/$theme_name"
    
    if [ -d "$theme_path" ]; then
        echo -e "\n${YELLOW}Building $theme_name...${NC}"
        cd "$theme_path"
        
        if [ -f "tsconfig.json" ] && [ -f "package.json" ]; then
            # Check if build script exists
            if npm run | grep -q "build"; then
                npm run build
                echo -e "${GREEN}✓ Built $theme_name${NC}"
            else
                echo -e "${YELLOW}No build script found for $theme_name${NC}"
            fi
        else
            echo -e "${YELLOW}No TypeScript configuration found for $theme_name${NC}"
        fi
    else
        echo -e "${RED}Theme $theme_name not found${NC}"
    fi
}

# Build shared types first
echo -e "${YELLOW}Building shared types...${NC}"
cd "$EPIC_ROOT/init/types"
if [ -f "tsconfig.json" ]; then
    npm run build
    echo -e "${GREEN}✓ Built shared types${NC}"
fi

# Build epic core
echo -e "\n${YELLOW}Building epic core...${NC}"
cd "$EPIC_ROOT"
if [ -f "tsconfig.json" ]; then
    npm run build
    echo -e "${GREEN}✓ Built epic core${NC}"
fi

# Build all themes
build_theme "llm-agent_coordinator-claude"
build_theme "llm-agent_coordinator-ollama"
build_theme "llm-agent_coordinator-vllm"
build_theme "llm-agent_mcp"
build_theme "llm-agent_chat-space"
build_theme "llm-agent_pocketflow"

echo -e "\n${GREEN}✅ All builds complete!${NC}"