#!/usr/bin/env python3
"""
Migrated from: demo.sh
Auto-generated Python - 2025-08-16T04:57:27.602Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Demonstration of init_setup-folder capabilities
    # Setup QEMU, build programs, and enable remote debugging
    subprocess.run("set -e", shell=True)
    # Colors
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("CYAN='\033[0;36m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    print("-e ")${CYAN}     Init Setup-Folder Theme - QEMU & Debug Demo${NC}"
    print("-e ")${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    print("")
    # Step 1: Initialize setup folder
    print("-e ")${BLUE}1. Initializing setup folder...${NC}"
    subprocess.run("npm run init", shell=True)
    print("-e ")${GREEN}✓ Setup folder initialized${NC}\n"
    # Step 2: Setup QEMU environment
    print("-e ")${BLUE}2. Setting up QEMU environment...${NC}"
    subprocess.run("bunx ts-node src/cli/setup-env.ts qemu demo-vm \", shell=True)
    subprocess.run("--platform x86_64 \", shell=True)
    subprocess.run("--memory 4G \", shell=True)
    subprocess.run("--cores 2 \", shell=True)
    subprocess.run("--debug \", shell=True)
    subprocess.run("--port 1234", shell=True)
    print("-e ")${GREEN}✓ QEMU environment configured${NC}\n"
    # Step 3: Setup Docker environment
    print("-e ")${BLUE}3. Setting up Docker environment...${NC}"
    subprocess.run("bunx ts-node src/cli/setup-env.ts docker demo-container \", shell=True)
    subprocess.run("--image ubuntu:22.04 \", shell=True)
    subprocess.run("--debug", shell=True)
    print("-e ")${GREEN}✓ Docker environment configured${NC}\n"
    # Step 4: Setup UV Python environment
    print("-e ")${BLUE}4. Setting up UV Python environment...${NC}"
    subprocess.run("bunx ts-node src/cli/setup-env.ts uv demo-python \", shell=True)
    subprocess.run("--version 3.11 \", shell=True)
    subprocess.run("--debug", shell=True)
    print("-e ")${GREEN}✓ UV Python environment configured${NC}\n"
    # Step 5: Build hello world programs
    print("-e ")${BLUE}5. Building hello world programs...${NC}"
    print("-e ")${YELLOW}  Building C version...${NC}"
    subprocess.run("bunx ts-node src/cli/setup-env.ts build --language c --env qemu", shell=True)
    print("-e ")${YELLOW}  Building C++ version...${NC}"
    subprocess.run("bunx ts-node src/cli/setup-env.ts build --language cpp --env qemu", shell=True)
    print("-e ")${YELLOW}  Building Python version...${NC}"
    subprocess.run("bunx ts-node src/cli/setup-env.ts build --language python --env qemu", shell=True)
    print("-e ")${GREEN}✓ All programs built${NC}\n"
    # Step 6: List configured environments
    print("-e ")${BLUE}6. Listing configured environments...${NC}"
    subprocess.run("bunx ts-node src/cli/setup-env.ts list", shell=True)
    print("")
    # Step 7: Show generated configuration
    print("-e ")${BLUE}7. Generated configuration files:${NC}"
    print("-e ")${YELLOW}Setup directory structure:${NC}"
    subprocess.run("find .setup -type f -name "*.json" -o -name "*.sh" | head -10", shell=True)
    print("")
    print("-e ")${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    print("-e ")${GREEN}✨ Demo completed successfully!${NC}"
    print("-e ")${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    print("")
    print("-e ")${YELLOW}📋 What was demonstrated:${NC}"
    print("-e ")  • Setup folder initialization"
    print("-e ")  • QEMU environment with debugging support"
    print("-e ")  • Docker environment configuration"
    print("-e ")  • UV Python environment setup"
    print("-e ")  • Building programs in multiple languages"
    print("-e ")  • Environment management and listing"
    print("")
    print("-e ")${YELLOW}🚀 Next steps:${NC}"
    print("-e ")  • Run the system test: ${CYAN}npm run test:system${NC}"
    print("-e ")  • Start QEMU instance: ${CYAN}.setup/scripts/run-demo-vm.sh${NC}"
    print("-e ")  • Debug with GDB: ${CYAN}.setup/scripts/debug-demo-vm.sh${NC}"
    print("")

if __name__ == "__main__":
    main()