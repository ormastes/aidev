#!/bin/bash
# Quick start script for Filesystem MCP

echo "🚀 Starting Filesystem MCP Server"
echo "Choose version:"
echo "  1) Standard MCP"
echo "  2) Enhanced MCP (with validation)"
echo ""
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo "Starting standard MCP server..."
        mcp-filesystem
        ;;
    2)
        echo "Starting enhanced MCP server..."
        mcp-filesystem-enhanced
        ;;
    *)
        echo "Invalid choice. Starting standard MCP..."
        mcp-filesystem
        ;;
esac
