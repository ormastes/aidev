#!/bin/bash
# LLM Agent Epic - Complete Installation Script

set -e

echo "🚀 LLM Agent Epic - Complete Setup"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the epic root directory
EPIC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
THEMES_ROOT="$(cd "$EPIC_ROOT/../../themes" && pwd)"

echo -e "${YELLOW}Epic Root: $EPIC_ROOT${NC}"
echo -e "${YELLOW}Themes Root: $THEMES_ROOT${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install theme dependencies
install_theme() {
    local theme_name=$1
    local theme_path="$THEMES_ROOT/$theme_name"
    
    if [ -d "$theme_path" ]; then
        echo -e "\n${GREEN}Installing $theme_name...${NC}"
        cd "$theme_path"
        
        # Install npm dependencies if package.json exists
        if [ -f "package.json" ]; then
            npm install
        fi
        
        # Run theme-specific setup if exists
        if [ -f "setup.sh" ]; then
            bash setup.sh
        fi
    else
        echo -e "${RED}Warning: Theme $theme_name not found at $theme_path${NC}"
    fi
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Install epic-level dependencies
echo -e "\n${YELLOW}Installing epic-level dependencies...${NC}"
cd "$EPIC_ROOT"
if [ -f "package.json" ]; then
    npm install
fi

# Install all theme dependencies
echo -e "\n${YELLOW}Installing theme dependencies...${NC}"

# Coordinators
install_theme "llm-agent_coordinator-claude"
install_theme "llm-agent_coordinator-ollama"
install_theme "llm-agent_coordinator-vllm"

# MCP Protocol
install_theme "llm-agent_mcp"

# User Interfaces
install_theme "llm-agent_chat-space"
install_theme "llm-agent_pocketflow"

# Platform-specific installations
echo -e "\n${YELLOW}Platform-specific setup...${NC}"

# Check for Ollama
if command_exists ollama; then
    echo -e "${GREEN}✓ Ollama is installed${NC}"
else
    echo -e "${YELLOW}Ollama not found. Run ./setup/install-ollama.sh to install${NC}"
fi

# Check for CUDA (for vLLM)
if command_exists nvidia-smi; then
    echo -e "${GREEN}✓ NVIDIA GPU detected${NC}"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
    echo -e "${YELLOW}No NVIDIA GPU detected. vLLM will run in CPU mode${NC}"
fi

# Create symbolic links for shared types
echo -e "\n${YELLOW}Setting up shared types...${NC}"
cd "$EPIC_ROOT/init/types"
npm link

# Link types to each theme
for theme in llm-agent_coordinator-claude llm-agent_coordinator-ollama llm-agent_coordinator-vllm llm-agent_mcp llm-agent_chat-space llm-agent_pocketflow; do
    if [ -d "$THEMES_ROOT/$theme" ]; then
        cd "$THEMES_ROOT/$theme"
        npm link @llm-agent/types
    fi
done

# Generate environment template
echo -e "\n${YELLOW}Generating environment configuration...${NC}"
bash "$EPIC_ROOT/init/setup/generate-env.sh"

# Build all TypeScript projects
echo -e "\n${YELLOW}Building TypeScript projects...${NC}"
bash "$EPIC_ROOT/init/setup/build-all.sh"

echo -e "\n${GREEN}✅ LLM Agent Epic setup complete!${NC}"
echo -e "\nNext steps:"
echo -e "1. Configure your environment: ${YELLOW}cp $EPIC_ROOT/init/config/.env.template $EPIC_ROOT/.env${NC}"
echo -e "2. Edit the .env file with your API keys and settings"
echo -e "3. Run tests: ${YELLOW}npm test${NC}"
echo -e "4. Start a coordinator: ${YELLOW}cd $THEMES_ROOT/llm-agent_coordinator-claude && npm start${NC}"