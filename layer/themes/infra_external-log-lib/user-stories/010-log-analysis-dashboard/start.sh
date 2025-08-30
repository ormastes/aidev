#!/bin/bash

# Log Analysis Dashboard Startup Script
echo "🚀 Starting Log Analysis Dashboard..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first."
    echo "   Run: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies with Bun..."
    bun install
fi

# Build the frontend
echo "🔨 Building frontend..."
bun run build:frontend

# Start the server
echo "🌐 Starting server on port 3001..."
bun run src/server/index.ts &
SERVER_PID=$!

# Start the frontend dev server (for development)
if [ "$NODE_ENV" != "production" ]; then
    echo "🎨 Starting frontend dev server on port 3000..."
    bun run dev:frontend &
    FRONTEND_PID=$!
fi

echo "✅ Log Analysis Dashboard is running!"
echo "   Server: http://localhost:3001"
echo "   WebSocket: ws://localhost:3002"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait