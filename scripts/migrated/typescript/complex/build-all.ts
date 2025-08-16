#!/usr/bin/env bun
/**
 * Migrated from: build-all.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.788Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Build all TypeScript projects in the LLM Agent Epic
  await $`set -e`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  console.log("🔨 Building all TypeScript projects...");
  console.log("=====================================");
  await $`EPIC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"`;
  await $`THEMES_ROOT="$(cd "$EPIC_ROOT/../../themes" && pwd)"`;
  // Function to build a theme
  await $`build_theme() {`;
  await $`local theme_name=$1`;
  await $`local theme_path="$THEMES_ROOT/$theme_name"`;
  if (-d "$theme_path" ) {; then
  console.log("-e ");\n${YELLOW}Building $theme_name...${NC}"
  process.chdir(""$theme_path"");
  if (-f "tsconfig.json" ] && [ -f "package.json" ) {; then
  // Check if build script exists
  await $`if npm run | grep -q "build"; then`;
  await $`npm run build`;
  console.log("-e ");${GREEN}✓ Built $theme_name${NC}"
  } else {
  console.log("-e ");${YELLOW}No build script found for $theme_name${NC}"
  }
  } else {
  console.log("-e ");${YELLOW}No TypeScript configuration found for $theme_name${NC}"
  }
  } else {
  console.log("-e ");${RED}Theme $theme_name not found${NC}"
  }
  await $`}`;
  // Build shared types first
  console.log("-e ");${YELLOW}Building shared types...${NC}"
  process.chdir(""$EPIC_ROOT/init/types"");
  if (-f "tsconfig.json" ) {; then
  await $`npm run build`;
  console.log("-e ");${GREEN}✓ Built shared types${NC}"
  }
  // Build epic core
  console.log("-e ");\n${YELLOW}Building epic core...${NC}"
  process.chdir(""$EPIC_ROOT"");
  if (-f "tsconfig.json" ) {; then
  await $`npm run build`;
  console.log("-e ");${GREEN}✓ Built epic core${NC}"
  }
  // Build all themes
  await $`build_theme "llm-agent_coordinator-claude"`;
  await $`build_theme "llm-agent_coordinator-ollama"`;
  await $`build_theme "llm-agent_coordinator-vllm"`;
  await $`build_theme "llm-agent_mcp"`;
  await $`build_theme "llm-agent_chat-space"`;
  await $`build_theme "llm-agent_pocketflow"`;
  console.log("-e ");\n${GREEN}✅ All builds complete!${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}