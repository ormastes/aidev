#!/bin/bash

# Deploy Enhanced MCP Server to System
# This script sets up the enhanced MCP server for production use

set -e

echo "🚀 Deploying Enhanced MCP Server to System"
echo "==========================================="

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AIDEV_ROOT="$(dirname "$(dirname "$(dirname "$PROJECT_ROOT")")")"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 AI Dev root: $AIDEV_ROOT"

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/mcp-server-enhanced.js" ]; then
  echo "❌ Error: mcp-server-enhanced.js not found!"
  echo "   Expected location: $PROJECT_ROOT/mcp-server-enhanced.js"
  exit 1
fi

# Check if dist directory exists
if [ ! -d "$PROJECT_ROOT/dist" ]; then
  echo "🔨 Building TypeScript files..."
  cd "$PROJECT_ROOT"
  npm run build || echo "⚠️  Build had some errors, continuing with existing files"
fi

# Test the enhanced MCP
echo ""
echo "🧪 Running validation tests..."
if node "$PROJECT_ROOT/scripts/test-enhanced-mcp.js"; then
  echo "✅ All tests passed!"
else
  echo "❌ Tests failed! Fix issues before deploying."
  exit 1
fi

# Create symlink for global access (optional)
GLOBAL_MCP_DIR="$HOME/.local/bin"
if [ -d "$GLOBAL_MCP_DIR" ]; then
  echo ""
  echo "📌 Creating global command..."
  cat > "$GLOBAL_MCP_DIR/mcp-enhanced" << EOF
#!/bin/bash
VF_BASE_PATH="\${VF_BASE_PATH:-\$(pwd)}" \\
VF_STRICT_MODE="\${VF_STRICT_MODE:-true}" \\
node "$PROJECT_ROOT/mcp-server-enhanced.js"
EOF
  chmod +x "$GLOBAL_MCP_DIR/mcp-enhanced"
  echo "✅ Global command created: mcp-enhanced"
fi

# Create systemd service file (optional)
if command -v systemctl &> /dev/null; then
  echo ""
  echo "📝 Creating systemd service file..."
  cat > /tmp/mcp-enhanced.service << EOF
[Unit]
Description=Enhanced MCP Server with Artifact Validation
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$AIDEV_ROOT
Environment="VF_BASE_PATH=$AIDEV_ROOT"
Environment="VF_STRICT_MODE=true"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node $PROJECT_ROOT/mcp-server-enhanced.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
  echo "✅ Service file created at: /tmp/mcp-enhanced.service"
  echo "   To install: sudo cp /tmp/mcp-enhanced.service /etc/systemd/system/"
  echo "   To enable: sudo systemctl enable mcp-enhanced"
  echo "   To start: sudo systemctl start mcp-enhanced"
fi

# Create launcher script
echo ""
echo "📝 Creating launcher script..."
cat > "$PROJECT_ROOT/run-enhanced-mcp.sh" << EOF
#!/bin/bash
# Enhanced MCP Server Launcher

echo "🚀 Starting Enhanced MCP Server"
echo "================================"
echo "Base path: \${VF_BASE_PATH:-$AIDEV_ROOT}"
echo "Strict mode: \${VF_STRICT_MODE:-true}"
echo ""
echo "Features enabled:"
echo "  ✅ Artifact validation"
echo "  ✅ Task dependency checking"
echo "  ✅ Feature-task linking"
echo "  ✅ Adhoc justification"
echo "  ✅ Lifecycle management"
echo ""

VF_BASE_PATH="\${VF_BASE_PATH:-$AIDEV_ROOT}" \\
VF_STRICT_MODE="\${VF_STRICT_MODE:-true}" \\
NODE_ENV="production" \\
exec node "$PROJECT_ROOT/mcp-server-enhanced.js"
EOF
chmod +x "$PROJECT_ROOT/run-enhanced-mcp.sh"

# Display deployment summary
echo ""
echo "✅ Deployment Complete!"
echo "======================="
echo ""
echo "📁 Installation location: $PROJECT_ROOT"
echo ""
echo "To run the enhanced MCP server:"
echo "  1. Direct: npm run mcp-server-enhanced"
echo "  2. Script: $PROJECT_ROOT/run-enhanced-mcp.sh"
if [ -f "$GLOBAL_MCP_DIR/mcp-enhanced" ]; then
  echo "  3. Global: mcp-enhanced"
fi
echo ""
echo "To test the server:"
echo "  npm run mcp-test"
echo ""
echo "MCP Configuration:"
echo "  $PROJECT_ROOT/mcp-config.json"
echo ""
echo "Environment variables:"
echo "  VF_BASE_PATH: Set the base directory (default: $AIDEV_ROOT)"
echo "  VF_STRICT_MODE: Enable/disable strict validation (default: true)"
echo ""
echo "Key features:"
echo "  🛡️  Refuses deployment without proper artifacts"
echo "  🛡️  Refuses refactoring without tests"
echo "  🛡️  Requires justification for adhoc files"
echo "  🛡️  Validates task dependencies"
echo "  🛡️  Enforces artifact lifecycle states"