#!/usr/bin/env bun
/**
 * Migrated from: install-all.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.766Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // LLM Agent Epic - Complete Installation Script
  await $`set -e`;
  console.log("🚀 LLM Agent Epic - Complete Setup");
  console.log("==================================");
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m' # No Color`;
  // Get the epic root directory
  await $`EPIC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"`;
  await $`THEMES_ROOT="$(cd "$EPIC_ROOT/../../themes" && pwd)"`;
  console.log("-e ");${YELLOW}Epic Root: $EPIC_ROOT${NC}"
  console.log("-e ");${YELLOW}Themes Root: $THEMES_ROOT${NC}"
  // Function to check if command exists
  await $`command_exists() {`;
  await $`command -v "$1" >/dev/null 2>&1`;
  await $`}`;
  // Function to install theme dependencies
  await $`install_theme() {`;
  await $`local theme_name=$1`;
  await $`local theme_path="$THEMES_ROOT/$theme_name"`;
  if (-d "$theme_path" ) {; then
  console.log("-e ");\n${GREEN}Installing $theme_name...${NC}"
  process.chdir(""$theme_path"");
  // Install npm dependencies if package.json exists
  if (-f "package.json" ) {; then
  await $`npm install`;
  }
  // Run theme-specific setup if exists
  if (-f "setup.sh" ) {; then
  await $`bash setup.sh`;
  }
  } else {
  console.log("-e ");${RED}Warning: Theme $theme_name not found at $theme_path${NC}"
  }
  await $`}`;
  // Check prerequisites
  console.log("-e ");\n${YELLOW}Checking prerequisites...${NC}"
  await $`if ! command_exists node; then`;
  console.log("-e ");${RED}Error: Node.js is not installed${NC}"
  console.log("Please install Node.js 18+ from https://nodejs.org");
  process.exit(1);
  }
  await $`if ! command_exists npm; then`;
  console.log("-e ");${RED}Error: npm is not installed${NC}"
  process.exit(1);
  }
  console.log("-e ");${GREEN}✓ Node.js $(node --version)${NC}"
  console.log("-e ");${GREEN}✓ npm $(npm --version)${NC}"
  // Install epic-level dependencies
  console.log("-e ");\n${YELLOW}Installing epic-level dependencies...${NC}"
  process.chdir(""$EPIC_ROOT"");
  if (-f "package.json" ) {; then
  await $`npm install`;
  }
  // Install all theme dependencies
  console.log("-e ");\n${YELLOW}Installing theme dependencies...${NC}"
  // Coordinators
  await $`install_theme "llm-agent_coordinator-claude"`;
  await $`install_theme "llm-agent_coordinator-ollama"`;
  await $`install_theme "llm-agent_coordinator-vllm"`;
  // MCP Protocol
  await $`install_theme "llm-agent_mcp"`;
  // User Interfaces
  await $`install_theme "llm-agent_chat-space"`;
  await $`install_theme "llm-agent_pocketflow"`;
  // Platform-specific installations
  console.log("-e ");\n${YELLOW}Platform-specific setup...${NC}"
  // Check for Ollama
  await $`if command_exists ollama; then`;
  console.log("-e ");${GREEN}✓ Ollama is installed${NC}"
  } else {
  console.log("-e ");${YELLOW}Ollama not found. Run ./setup/install-ollama.sh to install${NC}"
  }
  // Check for CUDA (for vLLM)
  await $`if command_exists nvidia-smi; then`;
  console.log("-e ");${GREEN}✓ NVIDIA GPU detected${NC}"
  await $`nvidia-smi --query-gpu=name,memory.total --format=csv,noheader`;
  } else {
  console.log("-e ");${YELLOW}No NVIDIA GPU detected. vLLM will run in CPU mode${NC}"
  }
  // Create symbolic links for shared types
  console.log("-e ");\n${YELLOW}Setting up shared types...${NC}"
  process.chdir(""$EPIC_ROOT/init/types"");
  await $`npm link`;
  // Link types to each theme
  for (const theme of [llm-agent_coordinator-claude llm-agent_coordinator-ollama llm-agent_coordinator-vllm llm-agent_mcp llm-agent_chat-space llm-agent_pocketflow; do]) {
  if (-d "$THEMES_ROOT/$theme" ) {; then
  process.chdir(""$THEMES_ROOT/$theme"");
  await $`npm link @llm-agent/types`;
  }
  }
  // Generate environment template
  console.log("-e ");\n${YELLOW}Generating environment configuration...${NC}"
  await $`bash "$EPIC_ROOT/init/setup/generate-env.sh"`;
  // Build all TypeScript projects
  console.log("-e ");\n${YELLOW}Building TypeScript projects...${NC}"
  await $`bash "$EPIC_ROOT/init/setup/build-all.sh"`;
  console.log("-e ");\n${GREEN}✅ LLM Agent Epic setup complete!${NC}"
  console.log("-e ");\nNext steps:"
  console.log("-e ");1. Configure your environment: ${YELLOW}cp $EPIC_ROOT/init/config/.env.template $EPIC_ROOT/.env${NC}"
  console.log("-e ");2. Edit the .env file with your API keys and settings"
  console.log("-e ");3. Run tests: ${YELLOW}npm test${NC}"
  console.log("-e ");4. Start a coordinator: ${YELLOW}cd $THEMES_ROOT/llm-agent_coordinator-claude && npm start${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}