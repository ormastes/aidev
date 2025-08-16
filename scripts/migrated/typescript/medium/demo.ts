#!/usr/bin/env bun
/**
 * Migrated from: demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.601Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Demonstration of init_setup-folder capabilities
  // Setup QEMU, build programs, and enable remote debugging
  await $`set -e`;
  // Colors
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`CYAN='\033[0;36m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  console.log("-e ");${CYAN}     Init Setup-Folder Theme - QEMU & Debug Demo${NC}"
  console.log("-e ");${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  console.log("");
  // Step 1: Initialize setup folder
  console.log("-e ");${BLUE}1. Initializing setup folder...${NC}"
  await $`npm run init`;
  console.log("-e ");${GREEN}✓ Setup folder initialized${NC}\n"
  // Step 2: Setup QEMU environment
  console.log("-e ");${BLUE}2. Setting up QEMU environment...${NC}"
  await $`bunx ts-node src/cli/setup-env.ts qemu demo-vm \`;
  await $`--platform x86_64 \`;
  await $`--memory 4G \`;
  await $`--cores 2 \`;
  await $`--debug \`;
  await $`--port 1234`;
  console.log("-e ");${GREEN}✓ QEMU environment configured${NC}\n"
  // Step 3: Setup Docker environment
  console.log("-e ");${BLUE}3. Setting up Docker environment...${NC}"
  await $`bunx ts-node src/cli/setup-env.ts docker demo-container \`;
  await $`--image ubuntu:22.04 \`;
  await $`--debug`;
  console.log("-e ");${GREEN}✓ Docker environment configured${NC}\n"
  // Step 4: Setup UV Python environment
  console.log("-e ");${BLUE}4. Setting up UV Python environment...${NC}"
  await $`bunx ts-node src/cli/setup-env.ts uv demo-python \`;
  await $`--version 3.11 \`;
  await $`--debug`;
  console.log("-e ");${GREEN}✓ UV Python environment configured${NC}\n"
  // Step 5: Build hello world programs
  console.log("-e ");${BLUE}5. Building hello world programs...${NC}"
  console.log("-e ");${YELLOW}  Building C version...${NC}"
  await $`bunx ts-node src/cli/setup-env.ts build --language c --env qemu`;
  console.log("-e ");${YELLOW}  Building C++ version...${NC}"
  await $`bunx ts-node src/cli/setup-env.ts build --language cpp --env qemu`;
  console.log("-e ");${YELLOW}  Building Python version...${NC}"
  await $`bunx ts-node src/cli/setup-env.ts build --language python --env qemu`;
  console.log("-e ");${GREEN}✓ All programs built${NC}\n"
  // Step 6: List configured environments
  console.log("-e ");${BLUE}6. Listing configured environments...${NC}"
  await $`bunx ts-node src/cli/setup-env.ts list`;
  console.log("");
  // Step 7: Show generated configuration
  console.log("-e ");${BLUE}7. Generated configuration files:${NC}"
  console.log("-e ");${YELLOW}Setup directory structure:${NC}"
  await $`find .setup -type f -name "*.json" -o -name "*.sh" | head -10`;
  console.log("");
  console.log("-e ");${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  console.log("-e ");${GREEN}✨ Demo completed successfully!${NC}"
  console.log("-e ");${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  console.log("");
  console.log("-e ");${YELLOW}📋 What was demonstrated:${NC}"
  console.log("-e ");  • Setup folder initialization"
  console.log("-e ");  • QEMU environment with debugging support"
  console.log("-e ");  • Docker environment configuration"
  console.log("-e ");  • UV Python environment setup"
  console.log("-e ");  • Building programs in multiple languages"
  console.log("-e ");  • Environment management and listing"
  console.log("");
  console.log("-e ");${YELLOW}🚀 Next steps:${NC}"
  console.log("-e ");  • Run the system test: ${CYAN}npm run test:system${NC}"
  console.log("-e ");  • Start QEMU instance: ${CYAN}.setup/scripts/run-demo-vm.sh${NC}"
  console.log("-e ");  • Debug with GDB: ${CYAN}.setup/scripts/debug-demo-vm.sh${NC}"
  console.log("");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}