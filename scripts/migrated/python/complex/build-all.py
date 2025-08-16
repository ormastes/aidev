#!/usr/bin/env python3
"""
Migrated from: build-all.sh
Auto-generated Python - 2025-08-16T04:57:27.789Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Build all TypeScript projects in the LLM Agent Epic
    subprocess.run("set -e", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("🔨 Building all TypeScript projects...")
    print("=====================================")
    subprocess.run("EPIC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"", shell=True)
    subprocess.run("THEMES_ROOT="$(cd "$EPIC_ROOT/../../themes" && pwd)"", shell=True)
    # Function to build a theme
    subprocess.run("build_theme() {", shell=True)
    subprocess.run("local theme_name=$1", shell=True)
    subprocess.run("local theme_path="$THEMES_ROOT/$theme_name"", shell=True)
    if -d "$theme_path" :; then
    print("-e ")\n${YELLOW}Building $theme_name...${NC}"
    os.chdir(""$theme_path"")
    if -f "tsconfig.json" ] && [ -f "package.json" :; then
    # Check if build script exists
    subprocess.run("if npm run | grep -q "build"; then", shell=True)
    subprocess.run("npm run build", shell=True)
    print("-e ")${GREEN}✓ Built $theme_name${NC}"
    else:
    print("-e ")${YELLOW}No build script found for $theme_name${NC}"
    else:
    print("-e ")${YELLOW}No TypeScript configuration found for $theme_name${NC}"
    else:
    print("-e ")${RED}Theme $theme_name not found${NC}"
    subprocess.run("}", shell=True)
    # Build shared types first
    print("-e ")${YELLOW}Building shared types...${NC}"
    os.chdir(""$EPIC_ROOT/init/types"")
    if -f "tsconfig.json" :; then
    subprocess.run("npm run build", shell=True)
    print("-e ")${GREEN}✓ Built shared types${NC}"
    # Build epic core
    print("-e ")\n${YELLOW}Building epic core...${NC}"
    os.chdir(""$EPIC_ROOT"")
    if -f "tsconfig.json" :; then
    subprocess.run("npm run build", shell=True)
    print("-e ")${GREEN}✓ Built epic core${NC}"
    # Build all themes
    subprocess.run("build_theme "llm-agent_coordinator-claude"", shell=True)
    subprocess.run("build_theme "llm-agent_coordinator-ollama"", shell=True)
    subprocess.run("build_theme "llm-agent_coordinator-vllm"", shell=True)
    subprocess.run("build_theme "llm-agent_mcp"", shell=True)
    subprocess.run("build_theme "llm-agent_chat-space"", shell=True)
    subprocess.run("build_theme "llm-agent_pocketflow"", shell=True)
    print("-e ")\n${GREEN}✅ All builds complete!${NC}"

if __name__ == "__main__":
    main()