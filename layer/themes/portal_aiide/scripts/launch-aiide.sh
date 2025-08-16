#!/bin/bash

# AIIDE Launch Script
# Starts both the backend server and frontend development server

echo "🚀 Launching AIIDE - AI Integrated Development Environment"
echo "==========================================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check environment variables
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please configure your API keys."
fi

# Start backend server in background
echo "🔧 Starting backend server..."
npm run server &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 3

# Check if server is running
if ! curl -s http://localhost:3457/api/providers > /dev/null; then
    echo "❌ Backend server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend server running on http://localhost:3457"

# Start frontend dev server
echo "🎨 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
sleep 5

echo ""
echo "✅ AIIDE is running!"
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend:  http://localhost:3457"
echo "📍 API Docs: http://localhost:3457/api-docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping AIIDE services..."
    kill $SERVER_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ AIIDE stopped"
    exit 0
}

# Set up trap to handle Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for processes
wait $SERVER_PID $FRONTEND_PID