#!/bin/bash
# Demonstration of init_setup-folder capabilities
# Setup QEMU, build programs, and enable remote debugging

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}     Init Setup-Folder Theme - QEMU & Debug Demo${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Initialize setup folder
echo -e "${BLUE}1. Initializing setup folder...${NC}"
npm run init
echo -e "${GREEN}✓ Setup folder initialized${NC}\n"

# Step 2: Setup QEMU environment
echo -e "${BLUE}2. Setting up QEMU environment...${NC}"
bunx ts-node src/cli/setup-env.ts qemu demo-vm \
  --platform x86_64 \
  --memory 4G \
  --cores 2 \
  --debug \
  --port 1234
echo -e "${GREEN}✓ QEMU environment configured${NC}\n"

# Step 3: Setup Docker environment
echo -e "${BLUE}3. Setting up Docker environment...${NC}"
bunx ts-node src/cli/setup-env.ts docker demo-container \
  --image ubuntu:22.04 \
  --debug
echo -e "${GREEN}✓ Docker environment configured${NC}\n"

# Step 4: Setup UV Python environment
echo -e "${BLUE}4. Setting up UV Python environment...${NC}"
bunx ts-node src/cli/setup-env.ts uv demo-python \
  --version 3.11 \
  --debug
echo -e "${GREEN}✓ UV Python environment configured${NC}\n"

# Step 5: Build hello world programs
echo -e "${BLUE}5. Building hello world programs...${NC}"

echo -e "${YELLOW}  Building C version...${NC}"
bunx ts-node src/cli/setup-env.ts build --language c --env qemu

echo -e "${YELLOW}  Building C++ version...${NC}"
bunx ts-node src/cli/setup-env.ts build --language cpp --env qemu

echo -e "${YELLOW}  Building Python version...${NC}"
bunx ts-node src/cli/setup-env.ts build --language python --env qemu

echo -e "${GREEN}✓ All programs built${NC}\n"

# Step 6: List configured environments
echo -e "${BLUE}6. Listing configured environments...${NC}"
bunx ts-node src/cli/setup-env.ts list
echo ""

# Step 7: Show generated configuration
echo -e "${BLUE}7. Generated configuration files:${NC}"
echo -e "${YELLOW}Setup directory structure:${NC}"
find .setup -type f -name "*.json" -o -name "*.sh" | head -10
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Demo completed successfully!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 What was demonstrated:${NC}"
echo -e "  • Setup folder initialization"
echo -e "  • QEMU environment with debugging support"
echo -e "  • Docker environment configuration"
echo -e "  • UV Python environment setup"
echo -e "  • Building programs in multiple languages"
echo -e "  • Environment management and listing"
echo ""
echo -e "${YELLOW}🚀 Next steps:${NC}"
echo -e "  • Run the system test: ${CYAN}npm run test:system${NC}"
echo -e "  • Start QEMU instance: ${CYAN}.setup/scripts/run-demo-vm.sh${NC}"
echo -e "  • Debug with GDB: ${CYAN}.setup/scripts/debug-demo-vm.sh${NC}"
echo ""