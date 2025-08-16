#!/usr/bin/env python3
"""
Migrated from: install-ollama.sh
Auto-generated Python - 2025-08-16T04:57:27.787Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Install Ollama for local LLM inference
    subprocess.run("set -e", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("🦙 Installing Ollama...")
    print("======================")
    # Detect OS
    subprocess.run("OS="$(uname -s)"", shell=True)
    subprocess.run("ARCH="$(uname -m)"", shell=True)
    subprocess.run("case "$OS" in", shell=True)
    subprocess.run("Linux*)", shell=True)
    print("-e ")${GREEN}Detected Linux${NC}"
    # Install using official script
    subprocess.run("curl -fsSL https://ollama.com/install.sh | sh", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("Darwin*)", shell=True)
    print("-e ")${GREEN}Detected macOS${NC}"
    subprocess.run("if command -v brew >/dev/null 2>&1; then", shell=True)
    subprocess.run("brew install ollama", shell=True)
    else:
    print("-e ")${YELLOW}Downloading Ollama for macOS...${NC}"
    subprocess.run("curl -L -o ~/Downloads/Ollama.zip https://ollama.com/download/Ollama-darwin.zip", shell=True)
    print("-e ")${YELLOW}Please unzip and install Ollama from ~/Downloads/Ollama.zip${NC}"
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("-e ")${RED}Unsupported OS: $OS${NC}"
    print("Please visit https://ollama.com for manual installation")
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    # Wait for Ollama to be available
    print("-e ")\n${YELLOW}Waiting for Ollama service...${NC}"
    time.sleep(3)
    # Check if Ollama is running
    subprocess.run("if command -v ollama >/dev/null 2>&1; then", shell=True)
    print("-e ")${GREEN}✓ Ollama installed successfully${NC}"
    # Start Ollama service if not running
    subprocess.run("if ! pgrep -x "ollama" > /dev/null; then", shell=True)
    print("-e ")${YELLOW}Starting Ollama service...${NC}"
    subprocess.run("ollama serve &", shell=True)
    time.sleep(5)
    # Pull default model
    print("-e ")\n${YELLOW}Pulling default model (deepseek-r1:14b)...${NC}"
    print("This may take a while depending on your internet connection...")
    subprocess.run("ollama pull deepseek-r1:14b", shell=True)
    print("-e ")\n${GREEN}✅ Ollama setup complete!${NC}"
    print("-e ")Installed models:"
    subprocess.run("ollama list", shell=True)
    else:
    print("-e ")${RED}Ollama installation failed${NC}"
    sys.exit(1)

if __name__ == "__main__":
    main()