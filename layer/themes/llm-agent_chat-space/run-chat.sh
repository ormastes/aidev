#!/bin/bash

# Chat Interface Launcher
echo "🤖 AI Chat Launcher"
echo "==================="
echo ""

# Check if Ollama is running
OLLAMA_STATUS="❌ Not running"
DEEPSEEK_STATUS="❌ Not installed"

if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    OLLAMA_STATUS="✅ Running"
    
    # Check for DeepSeek model
    if curl -s http://localhost:11434/api/tags | grep -q "deepseek"; then
        DEEPSEEK_STATUS="✅ Available"
    fi
fi

echo "Status:"
echo "  Ollama: $OLLAMA_STATUS"
echo "  DeepSeek R1: $DEEPSEEK_STATUS"
echo ""

# Check which mode to use
echo "Select chat mode:"
echo "1) Claude Only (Always works)"
echo "2) DeepSeek R1 Only (Requires Ollama)"
echo "3) Hybrid Mode (Both Claude + DeepSeek) ← RECOMMENDED"
echo "4) Quick Test (Test all modes)"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo "Starting Claude simulation chat..."
        node chat-with-claude.js
        ;;
    2)
        echo "Starting DeepSeek R1 chat..."
        node chat-with-local-llm.js
        ;;
    3)
        echo "Starting hybrid chat (Claude + DeepSeek)..."
        node chat-hybrid.js
        ;;
    4)
        echo "Running quick test..."
        node chat-hybrid.js --test
        ;;
    *)
        echo "Starting hybrid mode (recommended)..."
        node chat-hybrid.js
        ;;
esac