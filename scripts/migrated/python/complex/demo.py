#!/usr/bin/env python3
"""
Migrated from: demo.sh
Auto-generated Python - 2025-08-16T04:57:27.780Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # CLI Chat Room Demo with Real Claude Agent
    # This demonstrates actual Claude AI integration
    subprocess.run("set -e", shell=True)
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    os.chdir(""$SCRIPT_DIR"")
    # Colors
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("MAGENTA='\033[0;35m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${BLUE}🤖 CLI Chat Room with Real Claude Agent${NC}"
    print("-e ")${BLUE}======================================${NC}\n"
    # Check for authentication
    print("-e ")${YELLOW}🔐 Checking authentication...${NC}"
    subprocess.run("bunx ts-node src/cli/claude-auth.ts status", shell=True)
    print("")
    # Offer to set up auth if not configured
    subprocess.run("if ! bunx ts-node src/cli/claude-auth.ts status | grep -q "✓ Authentication is configured"; then", shell=True)
    print("-e ")${YELLOW}Would you like to set up authentication now? (y/N)${NC}"
    subprocess.run("read -r response", shell=True)
    if [ "$response" =~ ^[Yy]$ ]:; then
    subprocess.run("bunx ts-node src/cli/claude-auth.ts setup", shell=True)
    print("")
    # Cleanup function
    subprocess.run("cleanup() {", shell=True)
    print("-e ")\n${YELLOW}🧹 Cleaning up...${NC}"
    subprocess.run("jobs -p | xargs -r kill 2>/dev/null || true", shell=True)
    subprocess.run("pkill -f "chat-server" 2>/dev/null || true", shell=True)
    subprocess.run("pkill -f "chat-client" 2>/dev/null || true", shell=True)
    subprocess.run("pkill -f "claude-coordinator" 2>/dev/null || true", shell=True)
    subprocess.run("rm -f user_pipe 2>/dev/null", shell=True)
    print("-e ")${GREEN}✓ Cleanup complete${NC}"
    subprocess.run("}", shell=True)
    subprocess.run("trap cleanup EXIT INT TERM", shell=True)
    # Install dependencies
    print("-e ")${YELLOW}📦 Installing dependencies...${NC}"
    subprocess.run("npm install", shell=True)
    print("-e ")${GREEN}✓ Dependencies installed${NC}\n"
    # Start server
    print("-e ")${YELLOW}🖥️  Starting chat server...${NC}"
    subprocess.run("npm run server > server.log 2>&1 &", shell=True)
    subprocess.run("SERVER_PID=$!", shell=True)
    time.sleep(3)
    subprocess.run("if ps -p $SERVER_PID > /dev/null; then", shell=True)
    print("-e ")${GREEN}✓ Server started on ws://localhost:3000${NC}\n"
    else:
    print("-e ")${RED}✗ Failed to start server${NC}"
    sys.exit(1)
    # Start Claude agent
    print("-e ")${YELLOW}🤖 Starting Claude Agent...${NC}"
    subprocess.run("npm run claude demo-room "Claude" > claude.log 2>&1 &", shell=True)
    subprocess.run("CLAUDE_PID=$!", shell=True)
    time.sleep(2)
    print("-e ")${GREEN}✓ Claude agent joined demo-room${NC}\n"
    # Start interactive user
    print("-e ")${YELLOW}👤 Starting interactive session...${NC}"
    print("-e ")${GREEN}✓ You are now 'Human' in demo-room${NC}\n"
    # Show instructions
    print("-e ")${MAGENTA}💡 Try these examples:${NC}"
    print("-e ")  • Basic math: ${BLUE}5 + 3${NC}"
    print("-e ")  • Complex math: ${BLUE}(10 * 5) / 2${NC}"
    print("-e ")  • Questions: ${BLUE}What is your name?${NC}"
    print("-e ")  • Help: ${BLUE}@Claude can you help me?${NC}"
    print("-e ")  • Commands: ${BLUE}/users${NC}, ${BLUE}/stats${NC}, ${BLUE}/help${NC}"
    print("-e ")  • Exit: ${BLUE}/quit${NC} or ${BLUE}Ctrl+C${NC}\n"
    print("-e ")${YELLOW}📝 Connecting you to the chat room...${NC}\n"
    # Start the user client interactively
    subprocess.run("npm run client Human demo-room", shell=True)
    print("-e ")\n${GREEN}🎉 Demo completed!${NC}"

if __name__ == "__main__":
    main()