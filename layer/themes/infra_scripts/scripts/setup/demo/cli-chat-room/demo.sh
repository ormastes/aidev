#!/bin/bash

# CLI Chat Room Demo with Real Claude Agent
# This demonstrates actual Claude AI integration

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}🤖 CLI Chat Room with Real Claude Agent${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Check for authentication
echo -e "${YELLOW}🔐 Checking authentication...${NC}"
bunx ts-node src/cli/claude-auth.ts status
echo ""

# Offer to set up auth if not configured
if ! bunx ts-node src/cli/claude-auth.ts status | grep -q "✓ Authentication is configured"; then
    echo -e "${YELLOW}Would you like to set up authentication now? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        bunx ts-node src/cli/claude-auth.ts setup
        echo ""
    fi
fi

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    jobs -p | xargs -r kill 2>/dev/null || true
    pkill -f "chat-server" 2>/dev/null || true
    pkill -f "chat-client" 2>/dev/null || true
    pkill -f "claude-coordinator" 2>/dev/null || true
    rm -f user_pipe 2>/dev/null
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

trap cleanup EXIT INT TERM

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}\n"

# Start server
echo -e "${YELLOW}🖥️  Starting chat server...${NC}"
npm run server > server.log 2>&1 &
SERVER_PID=$!
sleep 3

if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✓ Server started on ws://localhost:3000${NC}\n"
else
    echo -e "${RED}✗ Failed to start server${NC}"
    exit 1
fi

# Start Claude agent
echo -e "${YELLOW}🤖 Starting Claude Agent...${NC}"
npm run claude demo-room "Claude" > claude.log 2>&1 &
CLAUDE_PID=$!
sleep 2
echo -e "${GREEN}✓ Claude agent joined demo-room${NC}\n"

# Start interactive user
echo -e "${YELLOW}👤 Starting interactive session...${NC}"
echo -e "${GREEN}✓ You are now 'Human' in demo-room${NC}\n"

# Show instructions
echo -e "${MAGENTA}💡 Try these examples:${NC}"
echo -e "  • Basic math: ${BLUE}5 + 3${NC}"
echo -e "  • Complex math: ${BLUE}(10 * 5) / 2${NC}"
echo -e "  • Questions: ${BLUE}What is your name?${NC}"
echo -e "  • Help: ${BLUE}@Claude can you help me?${NC}"
echo -e "  • Commands: ${BLUE}/users${NC}, ${BLUE}/stats${NC}, ${BLUE}/help${NC}"
echo -e "  • Exit: ${BLUE}/quit${NC} or ${BLUE}Ctrl+C${NC}\n"

echo -e "${YELLOW}📝 Connecting you to the chat room...${NC}\n"

# Start the user client interactively
npm run client Human demo-room

echo -e "\n${GREEN}🎉 Demo completed!${NC}"