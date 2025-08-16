#!/bin/bash

echo "🚀 Building Mate Dealer for Web..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build for web
echo "🔨 Building web version..."
bunx expo build:web

# Copy to GUI selector public directory
echo "📋 Copying to GUI selector..."
DEST_DIR="../../portal_gui-selector/user-stories/023-gui-selector-server/public/mate-dealer"
rm -rf $DEST_DIR
mkdir -p $DEST_DIR
cp -r web-build/* $DEST_DIR/

echo "✅ Build complete! Access at: http://localhost:3256/mate-dealer/"