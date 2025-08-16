#!/bin/bash

# Mobile Hello World Demo Setup Script
echo "📱 Setting up Mobile Hello World Demo..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if GUI Selector server is running
echo "🔍 Checking GUI Selector server..."
if curl -s http://localhost:3456/api/health > /dev/null; then
    echo "✅ GUI Selector server is running"
else
    echo "⚠️  GUI Selector server is not running. Starting it..."
    cd ../../../layer/themes/gui-selector/user-stories/023-gui-selector-server
    npm run build && NODE_ENV=production npm start &
    sleep 3
    cd - > /dev/null
fi

# Start the development server
echo "🚀 Starting mobile demo server..."
echo "📱 Mobile app will be available at: http://localhost:3457"
echo "🌐 GUI Selector portal: http://localhost:3456"
echo ""
echo "🎯 Usage Instructions:"
echo "1. Open http://localhost:3456 in your browser"
echo "2. Navigate to the '📱 Mobile Demo' tab"
echo "3. Click '🚀 Start Demo App' to load the mobile app"
echo "4. Try saving messages and syncing themes!"
echo ""
echo "Press Ctrl+C to stop the server"

npm run dev