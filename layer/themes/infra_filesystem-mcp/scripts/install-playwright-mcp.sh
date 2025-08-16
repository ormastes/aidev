#!/bin/bash

# Playwright MCP Installation Script
# Automatically installs and configures Playwright MCP for Explorer testing

set -e

echo "🎭 Installing Playwright MCP Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}Node.js version 18+ required. Current version: $(node -v)${NC}"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Python 3 is not installed. Please install Python 3.10+ first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Prerequisites satisfied ✓${NC}"
}

# Install Playwright browsers
install_playwright_browsers() {
    echo "Installing Playwright browsers..."
    bunx playwright install chromium firefox webkit
    echo -e "${GREEN}Playwright browsers installed ✓${NC}"
}

# Install MCP servers
install_mcp_servers() {
    echo "Installing MCP servers..."
    
    # Install Playwright MCP globally for easy access
    bun add -g @playwright/mcp@latest
    
    # Install OpenAPI MCP server
    uv pip install --user "awslabs.openapi-mcp-server[all]"
    
    # Install MCP Python SDK for orchestration
    uv pip install --user mcp
    
    echo -e "${GREEN}MCP servers installed ✓${NC}"
}

# Create MCP configuration
create_mcp_config() {
    echo "Creating MCP configuration..."
    
    CONFIG_DIR="$HOME/.config/aidev-explorer"
    mkdir -p "$CONFIG_DIR"
    
    cat > "$CONFIG_DIR/mcp-servers.json" <<'EOF'
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser", "chrome",
        "--block-service-workers",
        "--caps", "vision,pdf"
      ]
    },
    "playwright-firefox": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser", "firefox"
      ]
    },
    "openapi": {
      "command": "uvx",
      "args": ["awslabs.openapi-mcp-server@latest"],
      "env": {
        "API_NAME": "aidev",
        "API_BASE_URL": "${STAGING_URL:-https://staging.aidev.example.com}",
        "API_SPEC_URL": "${OPENAPI_SPEC_URL:-https://staging.aidev.example.com/openapi.json}",
        "SERVER_TRANSPORT": "stdio"
      }
    },
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PAT}",
        "-e", "GITHUB_TOOLSETS=issues",
        "-e", "GITHUB_READ_ONLY=1",
        "ghcr.io/github/github-mcp-server"
      ]
    }
  }
}
EOF
    
    echo -e "${GREEN}MCP configuration created at $CONFIG_DIR/mcp-servers.json ✓${NC}"
}

# Create environment template
create_env_template() {
    echo "Creating environment template..."
    
    ENV_FILE=".env.explorer"
    
    if [ ! -f "$ENV_FILE" ]; then
        cat > "$ENV_FILE" <<'EOF'
# Explorer MCP Configuration
# Copy to .env and fill in your values

# Required - Staging environment
STAGING_URL=https://staging.aidev.example.com
OPENAPI_SPEC_URL=https://staging.aidev.example.com/openapi.json

# GitHub Integration (optional)
GITHUB_PAT=ghp_your_token_here
GITHUB_REPO=owner/repo

# Explorer Settings
EXPLORER_MAX_RPS=1
EXPLORER_TIMEOUT_MS=30000
EXPLORER_SCREENSHOT_ON_FAILURE=true
EXPLORER_HEADLESS=false

# Test Accounts (never use production!)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpass123
TEST_API_KEY=test_api_key_here
EOF
        echo -e "${GREEN}Environment template created at $ENV_FILE ✓${NC}"
    else
        echo -e "${YELLOW}Environment file already exists, skipping...${NC}"
    fi
}

# Setup for Claude Code
setup_claude_code() {
    echo "Configuring for Claude Code..."
    
    # Check if Claude Code CLI is available
    if command -v claude &> /dev/null; then
        echo "Adding MCP servers to Claude Code..."
        
        # Add Playwright MCP
        claude mcp add playwright bunx @playwright/mcp@latest --browser chrome
        
        # Add OpenAPI MCP with environment variables
        claude mcp add openapi uvx awslabs.openapi-mcp-server@latest \
            --env API_NAME=aidev \
            --env 'API_BASE_URL=${STAGING_URL}' \
            --env 'API_SPEC_URL=${OPENAPI_SPEC_URL}' \
            --env SERVER_TRANSPORT=stdio
        
        echo -e "${GREEN}Claude Code configured ✓${NC}"
    else
        echo -e "${YELLOW}Claude Code CLI not found, skipping configuration${NC}"
    fi
}

# Setup for VS Code
setup_vscode() {
    echo "Configuring for VS Code..."
    
    VSCODE_SETTINGS=".vscode/settings.json"
    
    if [ -f "$VSCODE_SETTINGS" ]; then
        echo -e "${YELLOW}VS Code settings exist. Add MCP configuration manually.${NC}"
        echo "Add this to your .vscode/settings.json:"
        cat <<'EOF'

  "github.copilot.agents.mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser", "chrome"]
    }
  }
EOF
    fi
}

# Create helper scripts
create_helper_scripts() {
    echo "Creating helper scripts..."
    
    SCRIPTS_DIR="research/explorer/scripts"
    mkdir -p "$SCRIPTS_DIR"
    
    # Create exploration runner
    cat > "$SCRIPTS_DIR/run-explorer.sh" <<'EOF'
#!/bin/bash
# Run Explorer agent

source .env.explorer 2>/dev/null || true

echo "Starting Explorer agent..."
python3 research/explorer/scripts/explorer.py "$@"
EOF
    chmod +x "$SCRIPTS_DIR/run-explorer.sh"
    
    # Create test generator
    cat > "$SCRIPTS_DIR/generate-tests.sh" <<'EOF'
#!/bin/bash
# Generate Playwright tests from findings

FINDINGS_DIR="research/explorer/findings"
TESTS_DIR="research/explorer/tests/generated"

mkdir -p "$TESTS_DIR"

for finding in "$FINDINGS_DIR"/*.md; do
    if [ -f "$finding" ]; then
        basename=$(basename "$finding" .md)
        echo "Generating test for $basename..."
        # Extract test code from markdown and save
    fi
done
EOF
    chmod +x "$SCRIPTS_DIR/generate-tests.sh"
    
    echo -e "${GREEN}Helper scripts created ✓${NC}"
}

# Main installation flow
main() {
    echo "======================================"
    echo "   Playwright MCP Installation"
    echo "======================================"
    echo ""
    
    check_prerequisites
    install_playwright_browsers
    install_mcp_servers
    create_mcp_config
    create_env_template
    setup_claude_code
    setup_vscode
    create_helper_scripts
    
    echo ""
    echo "======================================"
    echo -e "${GREEN}   Installation Complete! 🎉${NC}"
    echo "======================================"
    echo ""
    echo "Next steps:"
    echo "1. Copy .env.explorer to .env and configure"
    echo "2. Set your STAGING_URL and OPENAPI_SPEC_URL"
    echo "3. (Optional) Set GITHUB_PAT for issue creation"
    echo "4. Run: ./research/explorer/scripts/run-explorer.sh"
    echo ""
    echo "For Claude Code:"
    echo "  The MCP servers have been configured automatically"
    echo ""
    echo "For VS Code:"
    echo "  Add the MCP configuration to .vscode/settings.json"
    echo ""
}

# Run main installation
main "$@"