#!/bin/bash

# vLLM Coordinator Agent Demo Runner

echo "🚀 vLLM Coordinator Agent Chat Room Demo"
echo "========================================"
echo ""
echo "This demo will:"
echo "1. Install dependencies"
echo "2. Build TypeScript files"
echo "3. Run the vLLM chat room demo"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}📝 Creating .env file...${NC}"
    cat > .env << EOF
# vLLM Configuration
VLLM_SERVER_URL=http://localhost:8000
VLLM_MODEL=deepseek-r1:32b

# Chat Server
CHAT_SERVER_PORT=3303
CHAT_ROOM_ID=vllm-demo-room
EOF
fi

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Choose a demo to run:${NC}"
echo "1) Full vLLM Chat Room Demo (recommended)"
echo "2) OpenAI API Demo"
echo "3) Exit"
echo ""
echo -n "Enter your choice (1-3): "
read choice

case $choice in
    1)
        echo -e "${BLUE}🚀 Starting vLLM Chat Room Demo...${NC}"
        echo -e "${YELLOW}Note: This will auto-install vLLM if needed (requires Python 3.8+)${NC}"
        npm run vllm-demo
        ;;
    2)
        echo -e "${BLUE}🚀 Starting OpenAI API Demo...${NC}"
        npm run openai-demo
        ;;
    3)
        echo -e "${GREEN}👋 Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac