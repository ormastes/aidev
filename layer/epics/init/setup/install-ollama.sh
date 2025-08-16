#!/bin/bash
# Install Ollama for local LLM inference

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🦙 Installing Ollama..."
echo "======================"

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Linux*)
        echo -e "${GREEN}Detected Linux${NC}"
        # Install using official script
        curl -fsSL https://ollama.com/install.sh | sh
        ;;
    Darwin*)
        echo -e "${GREEN}Detected macOS${NC}"
        if command -v brew >/dev/null 2>&1; then
            brew install ollama
        else
            echo -e "${YELLOW}Downloading Ollama for macOS...${NC}"
            curl -L -o ~/Downloads/Ollama.zip https://ollama.com/download/Ollama-darwin.zip
            echo -e "${YELLOW}Please unzip and install Ollama from ~/Downloads/Ollama.zip${NC}"
        fi
        ;;
    *)
        echo -e "${RED}Unsupported OS: $OS${NC}"
        echo "Please visit https://ollama.com for manual installation"
        exit 1
        ;;
esac

# Wait for Ollama to be available
echo -e "\n${YELLOW}Waiting for Ollama service...${NC}"
sleep 3

# Check if Ollama is running
if command -v ollama >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama installed successfully${NC}"
    
    # Start Ollama service if not running
    if ! pgrep -x "ollama" > /dev/null; then
        echo -e "${YELLOW}Starting Ollama service...${NC}"
        ollama serve &
        sleep 5
    fi
    
    # Pull default model
    echo -e "\n${YELLOW}Pulling default model (deepseek-r1:14b)...${NC}"
    echo "This may take a while depending on your internet connection..."
    ollama pull deepseek-r1:14b
    
    echo -e "\n${GREEN}✅ Ollama setup complete!${NC}"
    echo -e "Installed models:"
    ollama list
else
    echo -e "${RED}Ollama installation failed${NC}"
    exit 1
fi