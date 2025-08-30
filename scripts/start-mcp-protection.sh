#!/bin/bash

# MCP Protection Server Startup Script
# This script starts the MCP protection server for the AI Development Platform

echo "========================================="
echo "Starting MCP Protection Server"
echo "========================================="

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MCP SDK is installed
if [ ! -d "node_modules/@modelcontextprotocol" ]; then
    echo "📦 Installing MCP SDK dependencies..."
    npm install @modelcontextprotocol/sdk
fi

# Set environment variables
export VF_BASE_PATH="$PROJECT_ROOT"
export MCP_MODE="strict"
export PROTECTION_ENABLED="true"

echo "Configuration:"
echo "  Base Path: $VF_BASE_PATH"
echo "  Mode: $MCP_MODE"
echo "  Protection: $PROTECTION_ENABLED"
echo ""

# Start the server
echo "Starting server..."
node mcp-protection-server.js

# If server crashes, provide help
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Server failed to start."
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if all dependencies are installed: npm install"
    echo "2. Make sure you're in the project root directory"
    echo "3. Check the server logs above for specific errors"
    echo ""
    echo "For manual testing, run:"
    echo "  node mcp-protection-server.js"
fi