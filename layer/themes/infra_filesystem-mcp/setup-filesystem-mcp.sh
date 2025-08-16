#!/bin/bash

# Filesystem MCP Setup Script
# Installs and configures the filesystem MCP for this project

echo "╔════════════════════════════════════════════════╗"
echo "║     Filesystem MCP Installation & Setup         ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 MCP directory: $SCRIPT_DIR"
echo ""

# Step 1: Check Bun or Node.js
echo "🔍 Checking JavaScript runtime..."
if command -v bun &> /dev/null; then
    echo -e "${GREEN}✅ Bun $(bun --version) found${NC}"
    RUNTIME="bun"
    INSTALL_CMD="bun install --silent"
elif command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${YELLOW}⚠️  Node.js version is below 18. Some features may not work.${NC}"
    else
        echo -e "${GREEN}✅ Node.js $(node -v) found${NC}"
    fi
    RUNTIME="node"
    INSTALL_CMD="npm install --quiet"
else
    echo -e "${RED}❌ Neither Bun nor Node.js is installed. Please install Bun or Node.js 18+ first.${NC}"
    exit 1
fi

# Step 2: Install dependencies
echo ""
echo "📦 Installing dependencies with $RUNTIME..."
cd "$SCRIPT_DIR"
$INSTALL_CMD

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Step 3: Configure MCP
echo ""
echo "⚙️  Configuring MCP..."

# Update mcp-config.json with correct paths
cat > mcp-config.json << EOF
{
  "mcpServers": {
    "filesystem-mcp": {
      "command": "node",
      "args": [
        "$SCRIPT_DIR/mcp-server.js"
      ],
      "env": {
        "VF_BASE_PATH": "$PROJECT_ROOT",
        "NODE_ENV": "production"
      },
      "description": "Standard filesystem MCP server for virtual file operations"
    },
    "filesystem-mcp-enhanced": {
      "command": "node",
      "args": [
        "$SCRIPT_DIR/mcp-server-enhanced.js"
      ],
      "env": {
        "VF_BASE_PATH": "$PROJECT_ROOT",
        "VF_STRICT_MODE": "true",
        "NODE_ENV": "production"
      },
      "description": "Enhanced filesystem MCP with artifact validation and task queue enforcement"
    }
  },
  "defaultServer": "filesystem-mcp-enhanced",
  "features": {
    "artifactValidation": true,
    "taskDependencyChecking": true,
    "featureTaskLinking": true,
    "adhocJustification": true,
    "lifecycleManagement": true
  }
}
EOF

echo -e "${GREEN}✅ MCP configuration updated${NC}"

# Step 4: Test MCP server
echo ""
echo "🧪 Testing MCP server..."

# Test basic server
timeout 2s node mcp-server.js 2>/dev/null
if [ $? -eq 124 ]; then
    echo -e "${GREEN}✅ Basic MCP server starts successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Basic MCP server test incomplete${NC}"
fi

# Test enhanced server
timeout 2s node mcp-server-enhanced.js 2>/dev/null
if [ $? -eq 124 ]; then
    echo -e "${GREEN}✅ Enhanced MCP server starts successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Enhanced MCP server test incomplete${NC}"
fi

# Step 5: Create Claude configuration
echo ""
echo "🤖 Creating Claude configuration..."

CLAUDE_CONFIG_DIR="$HOME/.config/claude"
mkdir -p "$CLAUDE_CONFIG_DIR"

# Check if claude_desktop_config.json exists
CLAUDE_CONFIG="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
if [ -f "$CLAUDE_CONFIG" ]; then
    echo -e "${YELLOW}⚠️  Claude config already exists. Creating backup...${NC}"
    cp "$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create or update Claude config
cat > "$CLAUDE_CONFIG" << EOF
{
  "mcpServers": {
    "filesystem-mcp": {
      "command": "node",
      "args": [
        "$SCRIPT_DIR/mcp-server.js"
      ],
      "env": {
        "VF_BASE_PATH": "$PROJECT_ROOT"
      }
    },
    "filesystem-mcp-enhanced": {
      "command": "node",
      "args": [
        "$SCRIPT_DIR/mcp-server-enhanced.js"
      ],
      "env": {
        "VF_BASE_PATH": "$PROJECT_ROOT",
        "VF_STRICT_MODE": "true"
      }
    }
  }
}
EOF

echo -e "${GREEN}✅ Claude configuration created at $CLAUDE_CONFIG${NC}"

# Step 6: Deploy schema files to project root
echo ""
echo "📝 Deploying .vf.json schema files to project root..."

# Use the deployment script to set up VF schema files
DEPLOY_SCRIPT="$SCRIPT_DIR/scripts/deploy-vf-schemas.sh"

if [ -f "$DEPLOY_SCRIPT" ]; then
    # Run deployment script in init mode
    bash "$DEPLOY_SCRIPT" init
else
    echo -e "${YELLOW}⚠️  Deployment script not found, using fallback method${NC}"
    
    # Fallback: Deploy vf.json files from schemas folder to project root
    SCHEMA_DIR="$SCRIPT_DIR/schemas"
    
    # List of vf.json files to deploy
    VF_FILES=("TASK_QUEUE.vf.json" "FEATURE.vf.json" "FILE_STRUCTURE.vf.json" "NAME_ID.vf.json")
    
    for VF_FILE in "${VF_FILES[@]}"; do
        if [ -f "$SCHEMA_DIR/$VF_FILE" ]; then
            if [ ! -f "$PROJECT_ROOT/$VF_FILE" ]; then
                echo "  Deploying $VF_FILE to project root..."
                cp "$SCHEMA_DIR/$VF_FILE" "$PROJECT_ROOT/$VF_FILE"
                echo -e "${GREEN}  ✅ Deployed $VF_FILE${NC}"
            else
                echo -e "${YELLOW}  ⚠️  $VF_FILE already exists in project root, skipping${NC}"
            fi
        else
            echo -e "${YELLOW}  ⚠️  $VF_FILE not found in schemas folder${NC}"
        fi
    done
fi

# Create test directory
TEST_DIR="$PROJECT_ROOT/test-vf-files"
mkdir -p "$TEST_DIR"

# Create test file
cat > "$TEST_DIR/test.vf.json" << EOF
{
  "metadata": {
    "level": "test",
    "path": "/test-vf-files/test.vf.json",
    "version": "1.0.0",
    "created_at": "$(date -Iseconds)",
    "updated_at": "$(date -Iseconds)"
  },
  "content": {
    "message": "This is a test virtual file",
    "created_by": "setup script"
  }
}
EOF

echo -e "${GREEN}✅ Test files created${NC}"

# Step 7: Summary
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║           Installation Complete! 🎉             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "📋 Summary:"
echo "  • MCP servers installed at: $SCRIPT_DIR"
echo "  • Configuration file: $SCRIPT_DIR/mcp-config.json"
echo "  • Claude config: $CLAUDE_CONFIG"
echo "  • Test files: $TEST_DIR"
echo ""
echo "🚀 To use the filesystem MCP:"
echo ""
echo "  1. With Claude Desktop:"
echo "     - Restart Claude Desktop to load the new configuration"
echo "     - The MCP tools will be available automatically"
echo ""
echo "  2. Manually start the server:"
echo "     cd $SCRIPT_DIR"
echo "     node mcp-server.js          # Basic server"
echo "     node mcp-server-enhanced.js # Enhanced server"
echo ""
echo "  3. Available MCP tools:"
echo "     • read_vf_file     - Read .vf.json files"
echo "     • write_vf_file    - Write .vf.json files"
echo "     • list_vf_files    - List .vf.json files"
echo "     • read_task_queue  - Read TASK_QUEUE.vf.json"
echo "     • add_task         - Add tasks to queue"
echo "     • read_features    - Read FEATURE.vf.json"
echo "     • search_vf_content - Search in .vf.json files"
echo ""
echo "📚 Documentation: $SCRIPT_DIR/README.md"
echo ""