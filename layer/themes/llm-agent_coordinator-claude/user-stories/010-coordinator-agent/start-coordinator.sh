#!/bin/bash

# Quick start script for the coordinator-claude-agent
# Automatically detects authentication and starts the coordinator

set -e

echo "🚀 Coordinator Claude Agent - Quick Start"
echo "========================================"

# Check if built
if [ ! -f "./dist/index.js" ]; then
    echo "📦 Building coordinator..."
    npm run build
fi

# Make executable if needed
if [ ! -x "./dist/index.js" ]; then
    chmod +x ./dist/index.js
fi

# Check authentication status
echo ""
echo "🔍 Checking authentication..."
node test-auth.js

# Ask user how they want to start
echo ""
echo "🎯 How would you like to start the coordinator?"
echo "1. Auto-detect authentication (recommended)"
echo "2. Use API key"
echo "3. Use local auth only"
echo "4. Exit"
echo ""

read -p "Choose option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting with auto-detected authentication..."
        ./dist/index.js start
        ;;
    2)
        read -p "Enter your Claude API key: " api_key
        if [ -z "$api_key" ]; then
            echo "❌ No API key provided"
            exit 1
        fi
        echo ""
        echo "🚀 Starting with API key authentication..."
        ./dist/index.js start --api-key "$api_key"
        ;;
    3)
        echo ""
        echo "🚀 Starting with local authentication only..."
        if ./dist/index.js start --no-local-auth 2>/dev/null; then
            echo "✅ Started successfully"
        else
            echo "❌ Local authentication failed. Try option 2 with an API key."
            exit 1
        fi
        ;;
    4)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please choose 1-4."
        exit 1
        ;;
esac