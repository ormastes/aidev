#!/usr/bin/env bun
/**
 * Migrated from: demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.780Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // CLI Chat Room Demo with Real Claude Agent
  // This demonstrates actual Claude AI integration
  await $`set -e`;
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  process.chdir(""$SCRIPT_DIR"");
  // Colors
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`MAGENTA='\033[0;35m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}🤖 CLI Chat Room with Real Claude Agent${NC}"
  console.log("-e ");${BLUE}======================================${NC}\n"
  // Check for authentication
  console.log("-e ");${YELLOW}🔐 Checking authentication...${NC}"
  await $`bunx ts-node src/cli/claude-auth.ts status`;
  console.log("");
  // Offer to set up auth if not configured
  await $`if ! bunx ts-node src/cli/claude-auth.ts status | grep -q "✓ Authentication is configured"; then`;
  console.log("-e ");${YELLOW}Would you like to set up authentication now? (y/N)${NC}"
  await $`read -r response`;
  if ([ "$response" =~ ^[Yy]$ ]) {; then
  await $`bunx ts-node src/cli/claude-auth.ts setup`;
  console.log("");
  }
  }
  // Cleanup function
  await $`cleanup() {`;
  console.log("-e ");\n${YELLOW}🧹 Cleaning up...${NC}"
  await $`jobs -p | xargs -r kill 2>/dev/null || true`;
  await $`pkill -f "chat-server" 2>/dev/null || true`;
  await $`pkill -f "chat-client" 2>/dev/null || true`;
  await $`pkill -f "claude-coordinator" 2>/dev/null || true`;
  await $`rm -f user_pipe 2>/dev/null`;
  console.log("-e ");${GREEN}✓ Cleanup complete${NC}"
  await $`}`;
  await $`trap cleanup EXIT INT TERM`;
  // Install dependencies
  console.log("-e ");${YELLOW}📦 Installing dependencies...${NC}"
  await $`npm install`;
  console.log("-e ");${GREEN}✓ Dependencies installed${NC}\n"
  // Start server
  console.log("-e ");${YELLOW}🖥️  Starting chat server...${NC}"
  await $`npm run server > server.log 2>&1 &`;
  await $`SERVER_PID=$!`;
  await Bun.sleep(3 * 1000);
  await $`if ps -p $SERVER_PID > /dev/null; then`;
  console.log("-e ");${GREEN}✓ Server started on ws://localhost:3000${NC}\n"
  } else {
  console.log("-e ");${RED}✗ Failed to start server${NC}"
  process.exit(1);
  }
  // Start Claude agent
  console.log("-e ");${YELLOW}🤖 Starting Claude Agent...${NC}"
  await $`npm run claude demo-room "Claude" > claude.log 2>&1 &`;
  await $`CLAUDE_PID=$!`;
  await Bun.sleep(2 * 1000);
  console.log("-e ");${GREEN}✓ Claude agent joined demo-room${NC}\n"
  // Start interactive user
  console.log("-e ");${YELLOW}👤 Starting interactive session...${NC}"
  console.log("-e ");${GREEN}✓ You are now 'Human' in demo-room${NC}\n"
  // Show instructions
  console.log("-e ");${MAGENTA}💡 Try these examples:${NC}"
  console.log("-e ");  • Basic math: ${BLUE}5 + 3${NC}"
  console.log("-e ");  • Complex math: ${BLUE}(10 * 5) / 2${NC}"
  console.log("-e ");  • Questions: ${BLUE}What is your name?${NC}"
  console.log("-e ");  • Help: ${BLUE}@Claude can you help me?${NC}"
  console.log("-e ");  • Commands: ${BLUE}/users${NC}, ${BLUE}/stats${NC}, ${BLUE}/help${NC}"
  console.log("-e ");  • Exit: ${BLUE}/quit${NC} or ${BLUE}Ctrl+C${NC}\n"
  console.log("-e ");${YELLOW}📝 Connecting you to the chat room...${NC}\n"
  // Start the user client interactively
  await $`npm run client Human demo-room`;
  console.log("-e ");\n${GREEN}🎉 Demo completed!${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}