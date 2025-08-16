#!/bin/bash
# Start Story Reporter Server in Release Mode with AI Dev Portal Integration

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STORY_REPORTER_DIR="$PROJECT_ROOT/layer/themes/story-reporter/release/server"

echo "=== Starting Story Reporter Server (Release Mode) ==="
echo "Port: 3401"
echo "Theme: AI Dev Portal"

# Navigate to story reporter directory
cd "$STORY_REPORTER_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Set environment to release
export NODE_ENV=release
export PORT=3401

# Start the server
echo "Starting Story Reporter server on port 3401..."
node src/simple-server.js