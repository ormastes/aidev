#!/bin/bash

# Mate Dealer Demo Setup Script
set -e

echo "🚀 Setting up Mate Dealer Demo..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}Error: Node.js 16 or higher is required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Create .env file from example
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
fi

# Build the application
echo -e "${BLUE}Building application...${NC}"
npm run build

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "To run the demo:"
echo "  Development mode: npm run dev"
echo "  Production mode:  npm start"
echo ""
echo "The application will run on:"
echo "  Server: http://localhost:3303"
echo "  Client (dev): http://localhost:3304"
echo ""
echo "Default credentials:"
echo "  Email: demo@example.com"
echo "  Password: demo123"
echo ""
echo "Debug panel: Press Ctrl+Shift+D to toggle"