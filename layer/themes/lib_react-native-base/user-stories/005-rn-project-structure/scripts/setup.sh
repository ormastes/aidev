#!/bin/bash

# React Native Project Setup Script
# This script sets up the React Native development environment

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

echo "🚀 React Native Project Setup"
echo "============================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
echo "📦 Checking Node.js version..."
if command_exists node; then
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    REQUIRED_NODE="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
        echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"
    else
        echo -e "${RED}✗ Node.js $NODE_VERSION is too old. Required: >= $REQUIRED_NODE${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi

# Check npm version
echo "📦 Checking npm version..."
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd "$PROJECT_ROOT"
npm install

# iOS Setup (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "🍎 Setting up iOS environment..."
    
    # Check for Xcode
    if command_exists xcodebuild; then
        XCODE_VERSION=$(xcodebuild -version | head -n1)
        echo -e "${GREEN}✓ $XCODE_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  Xcode not found. Please install from App Store${NC}"
    fi
    
    # Check for CocoaPods
    if command_exists pod; then
        POD_VERSION=$(pod --version)
        echo -e "${GREEN}✓ CocoaPods $POD_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  CocoaPods not found. Installing...${NC}"
        sudo gem install cocoapods
    fi
    
    # Install iOS dependencies
    echo "Installing iOS dependencies..."
    cd ios && pod install && cd ..
else
    echo -e "${YELLOW}ℹ️  Skipping iOS setup (not on macOS)${NC}"
fi

# Android Setup
echo ""
echo "🤖 Checking Android environment..."

# Check for Android Studio / SDK
if [ -n "${ANDROID_HOME:-}" ]; then
    echo -e "${GREEN}✓ ANDROID_HOME is set: $ANDROID_HOME${NC}"
else
    echo -e "${YELLOW}⚠️  ANDROID_HOME not set. Please install Android Studio and set up the environment${NC}"
    echo "   Add to your shell profile:"
    echo "   export ANDROID_HOME=\$HOME/Library/Android/sdk (macOS)"
    echo "   export ANDROID_HOME=\$HOME/Android/Sdk (Linux)"
fi

# Check Java version
if command_exists java; then
    JAVA_VERSION=$(java -version 2>&1 | head -n1)
    echo -e "${GREEN}✓ Java installed: $JAVA_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Java not found. Please install JDK 11 or 17${NC}"
fi

# Create .env file if it doesn't exist
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo ""
    echo "📄 Creating .env file..."
    cat > "$PROJECT_ROOT/.env" << EOF
# Environment Configuration
API_URL=http://localhost:3000
ENV=development
VERSION=1.0.0
BUILD_NUMBER=1
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Setup Git hooks
echo ""
echo "🔗 Setting up Git hooks..."
if [ -d "$PROJECT_ROOT/.git" ]; then
    bunx husky install
    echo -e "${GREEN}✓ Git hooks installed${NC}"
else
    echo -e "${YELLOW}ℹ️  Not a git repository, skipping hooks${NC}"
fi

# Verify TypeScript configuration
echo ""
echo "📘 Verifying TypeScript configuration..."
if bunx tsc --noEmit; then
    echo -e "${GREEN}✓ TypeScript configuration valid${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript errors found. Run 'npm run typecheck' for details${NC}"
fi

# Final instructions
echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. For iOS: Open ios/AIDevApp.xcworkspace in Xcode"
echo "2. For Android: Open android/ in Android Studio"
echo "3. Start Metro: npm start"
echo "4. Run on iOS: npm run ios"
echo "5. Run on Android: npm run android"
echo ""
echo "Happy coding! 🚀"