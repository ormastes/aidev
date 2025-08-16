#!/usr/bin/env python3
"""
Migrated from: install-all.sh
Auto-generated Python - 2025-08-16T04:57:27.767Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # LLM Agent Epic - Complete Installation Script
    subprocess.run("set -e", shell=True)
    print("🚀 LLM Agent Epic - Complete Setup")
    print("==================================")
    # Colors for output
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Get the epic root directory
    subprocess.run("EPIC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"", shell=True)
    subprocess.run("THEMES_ROOT="$(cd "$EPIC_ROOT/../../themes" && pwd)"", shell=True)
    print("-e ")${YELLOW}Epic Root: $EPIC_ROOT${NC}"
    print("-e ")${YELLOW}Themes Root: $THEMES_ROOT${NC}"
    # Function to check if command exists
    subprocess.run("command_exists() {", shell=True)
    subprocess.run("command -v "$1" >/dev/null 2>&1", shell=True)
    subprocess.run("}", shell=True)
    # Function to install theme dependencies
    subprocess.run("install_theme() {", shell=True)
    subprocess.run("local theme_name=$1", shell=True)
    subprocess.run("local theme_path="$THEMES_ROOT/$theme_name"", shell=True)
    if -d "$theme_path" :; then
    print("-e ")\n${GREEN}Installing $theme_name...${NC}"
    os.chdir(""$theme_path"")
    # Install npm dependencies if package.json exists
    if -f "package.json" :; then
    subprocess.run("npm install", shell=True)
    # Run theme-specific setup if exists
    if -f "setup.sh" :; then
    subprocess.run("bash setup.sh", shell=True)
    else:
    print("-e ")${RED}Warning: Theme $theme_name not found at $theme_path${NC}"
    subprocess.run("}", shell=True)
    # Check prerequisites
    print("-e ")\n${YELLOW}Checking prerequisites...${NC}"
    subprocess.run("if ! command_exists node; then", shell=True)
    print("-e ")${RED}Error: Node.js is not installed${NC}"
    print("Please install Node.js 18+ from https://nodejs.org")
    sys.exit(1)
    subprocess.run("if ! command_exists npm; then", shell=True)
    print("-e ")${RED}Error: npm is not installed${NC}"
    sys.exit(1)
    print("-e ")${GREEN}✓ Node.js $(node --version)${NC}"
    print("-e ")${GREEN}✓ npm $(npm --version)${NC}"
    # Install epic-level dependencies
    print("-e ")\n${YELLOW}Installing epic-level dependencies...${NC}"
    os.chdir(""$EPIC_ROOT"")
    if -f "package.json" :; then
    subprocess.run("npm install", shell=True)
    # Install all theme dependencies
    print("-e ")\n${YELLOW}Installing theme dependencies...${NC}"
    # Coordinators
    subprocess.run("install_theme "llm-agent_coordinator-claude"", shell=True)
    subprocess.run("install_theme "llm-agent_coordinator-ollama"", shell=True)
    subprocess.run("install_theme "llm-agent_coordinator-vllm"", shell=True)
    # MCP Protocol
    subprocess.run("install_theme "llm-agent_mcp"", shell=True)
    # User Interfaces
    subprocess.run("install_theme "llm-agent_chat-space"", shell=True)
    subprocess.run("install_theme "llm-agent_pocketflow"", shell=True)
    # Platform-specific installations
    print("-e ")\n${YELLOW}Platform-specific setup...${NC}"
    # Check for Ollama
    subprocess.run("if command_exists ollama; then", shell=True)
    print("-e ")${GREEN}✓ Ollama is installed${NC}"
    else:
    print("-e ")${YELLOW}Ollama not found. Run ./setup/install-ollama.sh to install${NC}"
    # Check for CUDA (for vLLM)
    subprocess.run("if command_exists nvidia-smi; then", shell=True)
    print("-e ")${GREEN}✓ NVIDIA GPU detected${NC}"
    subprocess.run("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader", shell=True)
    else:
    print("-e ")${YELLOW}No NVIDIA GPU detected. vLLM will run in CPU mode${NC}"
    # Create symbolic links for shared types
    print("-e ")\n${YELLOW}Setting up shared types...${NC}"
    os.chdir(""$EPIC_ROOT/init/types"")
    subprocess.run("npm link", shell=True)
    # Link types to each theme
    for theme in [llm-agent_coordinator-claude llm-agent_coordinator-ollama llm-agent_coordinator-vllm llm-agent_mcp llm-agent_chat-space llm-agent_pocketflow; do]:
    if -d "$THEMES_ROOT/$theme" :; then
    os.chdir(""$THEMES_ROOT/$theme"")
    subprocess.run("npm link @llm-agent/types", shell=True)
    # Generate environment template
    print("-e ")\n${YELLOW}Generating environment configuration...${NC}"
    subprocess.run("bash "$EPIC_ROOT/init/setup/generate-env.sh"", shell=True)
    # Build all TypeScript projects
    print("-e ")\n${YELLOW}Building TypeScript projects...${NC}"
    subprocess.run("bash "$EPIC_ROOT/init/setup/build-all.sh"", shell=True)
    print("-e ")\n${GREEN}✅ LLM Agent Epic setup complete!${NC}"
    print("-e ")\nNext steps:"
    print("-e ")1. Configure your environment: ${YELLOW}cp $EPIC_ROOT/init/config/.env.template $EPIC_ROOT/.env${NC}"
    print("-e ")2. Edit the .env file with your API keys and settings"
    print("-e ")3. Run tests: ${YELLOW}npm test${NC}"
    print("-e ")4. Start a coordinator: ${YELLOW}cd $THEMES_ROOT/llm-agent_coordinator-claude && npm start${NC}"

if __name__ == "__main__":
    main()