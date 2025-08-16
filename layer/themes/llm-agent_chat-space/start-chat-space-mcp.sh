#!/bin/bash

# Start Chat Space with MCP Integration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================="
echo "Chat Space with MCP Integration"
echo "========================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Configuration
PORT="${CHAT_PORT:-3456}"
MCP_URL="${MCP_SERVER_URL:-ws://localhost:8080}"
ENABLE_MCP="${ENABLE_MCP:-true}"

echo ""
echo "Configuration:"
echo "  Chat Space Port: $PORT"
echo "  MCP Server URL: $MCP_URL"
echo "  MCP Enabled: $ENABLE_MCP"
echo ""

# Check if MCP server is needed
if [ "$ENABLE_MCP" = "true" ]; then
    echo "Checking MCP server availability..."
    
    # Extract host and port from MCP_URL
    MCP_HOST=$(echo "$MCP_URL" | sed -E 's|^ws://([^:/]+).*|\1|')
    MCP_PORT=$(echo "$MCP_URL" | sed -E 's|.*:([0-9]+).*|\1|')
    
    # Default port if not specified
    if [ -z "$MCP_PORT" ] || [ "$MCP_PORT" = "$MCP_URL" ]; then
        MCP_PORT=8080
    fi
    
    # Check if MCP server is running
    if nc -z "$MCP_HOST" "$MCP_PORT" 2>/dev/null; then
        echo "✅ MCP server is available at $MCP_URL"
    else
        echo "⚠️  Warning: MCP server not responding at $MCP_URL"
        echo "Starting local MCP server in strict mode..."
        
        # Start MCP server in background
        cd ../infra_filesystem-mcp
        if [ -f "mcp-server-strict.js" ]; then
            node mcp-server-strict.js &
            MCP_PID=$!
            echo "Started MCP server (PID: $MCP_PID)"
            sleep 2
        else
            echo "MCP server script not found, continuing without MCP"
            ENABLE_MCP="false"
        fi
        cd "$SCRIPT_DIR"
    fi
fi

# Build TypeScript if needed
if [ ! -d "dist" ] || [ "src/index.ts" -nt "dist/index.js" ]; then
    echo "Building TypeScript..."
    npm run build
fi

# Start Chat Space Server
echo ""
echo "Starting Chat Space Server..."
echo "========================================="

if [ "$ENABLE_MCP" = "true" ]; then
    npm run start:mcp -- --port "$PORT" --mcp-url "$MCP_URL"
else
    npm run start -- --port "$PORT" --no-mcp
fi