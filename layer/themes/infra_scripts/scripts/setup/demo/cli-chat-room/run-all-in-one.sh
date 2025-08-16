#!/bin/bash

# Kill any existing process on port 3000
kill $(lsof -ti:3000) 2>/dev/null || true
sleep 1

echo "🚀 Starting All-in-One Chat Room with Claude Coordinator..."
echo ""

# Start all-in-one mode
npm run all-in-one "$@"