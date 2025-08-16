#!/bin/bash

# Quick setup script for Coordinator Claude Agent

set -e

echo "🚀 Setting up Coordinator Claude Agent"
echo "====================================="

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Error: Node.js 16+ required (found v$NODE_VERSION)"
    exit 1
fi
echo "✅ Node.js version check passed"

# Install dependencies
echo "\n📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "\n📝 Creating .env file from template..."
    cp .env.example .env
    echo "ℹ️  .env file created. API key is optional if Claude CLI is authenticated."
fi

# Check for Claude authentication
echo "\n🔐 Checking authentication options..."
if [ -f "$HOME/.claude/.credentials.json" ]; then
    echo "✅ Found local Claude credentials"
    echo "   You can start the coordinator without an API key"
else
    echo "❌ No local Claude credentials found"
    echo "   You'll need to provide an API key or authenticate with Claude CLI"
fi

# Check for API key in environment
if [ -n "$CLAUDE_API_KEY" ]; then
    echo "✅ CLAUDE_API_KEY environment variable is set"
else
    echo "ℹ️  CLAUDE_API_KEY not set (optional if using local auth)"
fi

# Create session directory
echo "\n📁 Creating session directory..."
mkdir -p .coordinator-sessions

# Build the project
echo "\n🔨 Building project..."
npm run build

# Run tests to verify setup
echo "\n🧪 Running verification tests..."
npm run test:env

# Create example task queue if it doesn't exist
if [ ! -f "TASK_QUEUE.md" ]; then
    echo "\n📋 Creating example TASK_QUEUE.md..."
    cat > TASK_QUEUE.md << 'EOF'
# Task Queue

## Pending

- [ ] [high] Example Task 1 (id: task-example-001)
  Description: This is an example high-priority task
  Status: pending

- [ ] [medium] Example Task 2 (id: task-example-002)
  Description: This task depends on the first one
  Status: pending
  Dependencies: task-example-001

## In Progress

## Completed

EOF
fi

# Make scripts executable
chmod +x scripts/*.sh

# Final instructions
echo "\n✅ Setup complete!"
echo "\n📚 Next steps:"
if [ -f "$HOME/.claude/.credentials.json" ]; then
    echo "1. Start coordinator: npm run dev -- start"
    echo "2. Or use: ./dist/index.js start"
    echo "3. Run tests: npm test"
else
    echo "1. Authenticate with Claude CLI or set CLAUDE_API_KEY"
    echo "2. Start coordinator: npm run dev -- start"
    echo "3. Run tests: npm test"
fi
echo "\n💡 Tips:"
echo "- Use './scripts/run-tests.sh' for comprehensive testing"
echo "- Run './examples/auth-demo.js' to see authentication options"
echo "- Sessions are stored in .coordinator-sessions/"
echo "- Check docs/ for detailed documentation"
echo "\nHappy coordinating! 🎉"