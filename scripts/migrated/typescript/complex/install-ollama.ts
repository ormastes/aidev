#!/usr/bin/env bun
/**
 * Migrated from: install-ollama.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.786Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Install Ollama for local LLM inference
  await $`set -e`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  console.log("🦙 Installing Ollama...");
  console.log("======================");
  // Detect OS
  await $`OS="$(uname -s)"`;
  await $`ARCH="$(uname -m)"`;
  await $`case "$OS" in`;
  await $`Linux*)`;
  console.log("-e ");${GREEN}Detected Linux${NC}"
  // Install using official script
  await $`curl -fsSL https://ollama.com/install.sh | sh`;
  await $`;;`;
  await $`Darwin*)`;
  console.log("-e ");${GREEN}Detected macOS${NC}"
  await $`if command -v brew >/dev/null 2>&1; then`;
  await $`brew install ollama`;
  } else {
  console.log("-e ");${YELLOW}Downloading Ollama for macOS...${NC}"
  await $`curl -L -o ~/Downloads/Ollama.zip https://ollama.com/download/Ollama-darwin.zip`;
  console.log("-e ");${YELLOW}Please unzip and install Ollama from ~/Downloads/Ollama.zip${NC}"
  }
  await $`;;`;
  await $`*)`;
  console.log("-e ");${RED}Unsupported OS: $OS${NC}"
  console.log("Please visit https://ollama.com for manual installation");
  process.exit(1);
  await $`;;`;
  await $`esac`;
  // Wait for Ollama to be available
  console.log("-e ");\n${YELLOW}Waiting for Ollama service...${NC}"
  await Bun.sleep(3 * 1000);
  // Check if Ollama is running
  await $`if command -v ollama >/dev/null 2>&1; then`;
  console.log("-e ");${GREEN}✓ Ollama installed successfully${NC}"
  // Start Ollama service if not running
  await $`if ! pgrep -x "ollama" > /dev/null; then`;
  console.log("-e ");${YELLOW}Starting Ollama service...${NC}"
  await $`ollama serve &`;
  await Bun.sleep(5 * 1000);
  }
  // Pull default model
  console.log("-e ");\n${YELLOW}Pulling default model (deepseek-r1:14b)...${NC}"
  console.log("This may take a while depending on your internet connection...");
  await $`ollama pull deepseek-r1:14b`;
  console.log("-e ");\n${GREEN}✅ Ollama setup complete!${NC}"
  console.log("-e ");Installed models:"
  await $`ollama list`;
  } else {
  console.log("-e ");${RED}Ollama installation failed${NC}"
  process.exit(1);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}