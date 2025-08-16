#!/usr/bin/env python3
"""
Migrated from: install-playwright-mcp.sh
Auto-generated Python - 2025-08-16T04:57:27.702Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Playwright MCP Installation Script
    # Automatically installs and configures Playwright MCP for Explorer testing
    subprocess.run("set -e", shell=True)
    print("🎭 Installing Playwright MCP Server...")
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Check prerequisites
    subprocess.run("check_prerequisites() {", shell=True)
    print("Checking prerequisites...")
    # Check Node.js
    subprocess.run("if ! command -v node &> /dev/null; then", shell=True)
    print("-e ")${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
    sys.exit(1)
    subprocess.run("NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)", shell=True)
    if "$NODE_VERSION" -lt 18 :; then
    print("-e ")${RED}Node.js version 18+ required. Current version: $(node -v)${NC}"
    sys.exit(1)
    # Check Python
    subprocess.run("if ! command -v python3 &> /dev/null; then", shell=True)
    print("-e ")${RED}Python 3 is not installed. Please install Python 3.10+ first.${NC}"
    sys.exit(1)
    print("-e ")${GREEN}Prerequisites satisfied ✓${NC}"
    subprocess.run("}", shell=True)
    # Install Playwright browsers
    subprocess.run("install_playwright_browsers() {", shell=True)
    print("Installing Playwright browsers...")
    subprocess.run("bunx playwright install chromium firefox webkit", shell=True)
    print("-e ")${GREEN}Playwright browsers installed ✓${NC}"
    subprocess.run("}", shell=True)
    # Install MCP servers
    subprocess.run("install_mcp_servers() {", shell=True)
    print("Installing MCP servers...")
    # Install Playwright MCP globally for easy access
    subprocess.run("bun add -g @playwright/mcp@latest", shell=True)
    # Install OpenAPI MCP server
    subprocess.run("uv pip install --user "awslabs.openapi-mcp-server[all]"", shell=True)
    # Install MCP Python SDK for orchestration
    subprocess.run("uv pip install --user mcp", shell=True)
    print("-e ")${GREEN}MCP servers installed ✓${NC}"
    subprocess.run("}", shell=True)
    # Create MCP configuration
    subprocess.run("create_mcp_config() {", shell=True)
    print("Creating MCP configuration...")
    subprocess.run("CONFIG_DIR="$HOME/.config/aidev-explorer"", shell=True)
    Path(""$CONFIG_DIR"").mkdir(parents=True, exist_ok=True)
    subprocess.run("cat > "$CONFIG_DIR/mcp-servers.json" <<'EOF'", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""mcpServers": {", shell=True)
    subprocess.run(""playwright": {", shell=True)
    subprocess.run(""command": "npx",", shell=True)
    subprocess.run(""args": [", shell=True)
    subprocess.run(""@playwright/mcp@latest",", shell=True)
    subprocess.run(""--browser", "chrome",", shell=True)
    subprocess.run(""--block-service-workers",", shell=True)
    subprocess.run(""--caps", "vision,pdf"", shell=True)
    subprocess.run("]", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""playwright-firefox": {", shell=True)
    subprocess.run(""command": "npx",", shell=True)
    subprocess.run(""args": [", shell=True)
    subprocess.run(""@playwright/mcp@latest",", shell=True)
    subprocess.run(""--browser", "firefox"", shell=True)
    subprocess.run("]", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""openapi": {", shell=True)
    subprocess.run(""command": "uvx",", shell=True)
    subprocess.run(""args": ["awslabs.openapi-mcp-server@latest"],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""API_NAME": "aidev",", shell=True)
    subprocess.run(""API_BASE_URL": "${STAGING_URL:-https://staging.aidev.example.com}",", shell=True)
    subprocess.run(""API_SPEC_URL": "${OPENAPI_SPEC_URL:-https://staging.aidev.example.com/openapi.json}",", shell=True)
    subprocess.run(""SERVER_TRANSPORT": "stdio"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""github": {", shell=True)
    subprocess.run(""command": "docker",", shell=True)
    subprocess.run(""args": [", shell=True)
    subprocess.run(""run", "-i", "--rm",", shell=True)
    subprocess.run(""-e", "GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PAT}",", shell=True)
    subprocess.run(""-e", "GITHUB_TOOLSETS=issues",", shell=True)
    subprocess.run(""-e", "GITHUB_READ_ONLY=1",", shell=True)
    subprocess.run(""ghcr.io/github/github-mcp-server"", shell=True)
    subprocess.run("]", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}MCP configuration created at $CONFIG_DIR/mcp-servers.json ✓${NC}"
    subprocess.run("}", shell=True)
    # Create environment template
    subprocess.run("create_env_template() {", shell=True)
    print("Creating environment template...")
    subprocess.run("ENV_FILE=".env.explorer"", shell=True)
    if ! -f "$ENV_FILE" :; then
    subprocess.run("cat > "$ENV_FILE" <<'EOF'", shell=True)
    # Explorer MCP Configuration
    # Copy to .env and fill in your values
    # Required - Staging environment
    subprocess.run("STAGING_URL=https://staging.aidev.example.com", shell=True)
    subprocess.run("OPENAPI_SPEC_URL=https://staging.aidev.example.com/openapi.json", shell=True)
    # GitHub Integration (optional)
    subprocess.run("GITHUB_PAT=ghp_your_token_here", shell=True)
    subprocess.run("GITHUB_REPO=owner/repo", shell=True)
    # Explorer Settings
    subprocess.run("EXPLORER_MAX_RPS=1", shell=True)
    subprocess.run("EXPLORER_TIMEOUT_MS=30000", shell=True)
    subprocess.run("EXPLORER_SCREENSHOT_ON_FAILURE=true", shell=True)
    subprocess.run("EXPLORER_HEADLESS=false", shell=True)
    # Test Accounts (never use production!)
    subprocess.run("TEST_USER_EMAIL=test@example.com", shell=True)
    subprocess.run("TEST_USER_PASSWORD=testpass123", shell=True)
    subprocess.run("TEST_API_KEY=test_api_key_here", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}Environment template created at $ENV_FILE ✓${NC}"
    else:
    print("-e ")${YELLOW}Environment file already exists, skipping...${NC}"
    subprocess.run("}", shell=True)
    # Setup for Claude Code
    subprocess.run("setup_claude_code() {", shell=True)
    print("Configuring for Claude Code...")
    # Check if Claude Code CLI is available
    subprocess.run("if command -v claude &> /dev/null; then", shell=True)
    print("Adding MCP servers to Claude Code...")
    # Add Playwright MCP
    subprocess.run("claude mcp add playwright bunx @playwright/mcp@latest --browser chrome", shell=True)
    # Add OpenAPI MCP with environment variables
    subprocess.run("claude mcp add openapi uvx awslabs.openapi-mcp-server@latest \", shell=True)
    subprocess.run("--env API_NAME=aidev \", shell=True)
    subprocess.run("--env 'API_BASE_URL=${STAGING_URL}' \", shell=True)
    subprocess.run("--env 'API_SPEC_URL=${OPENAPI_SPEC_URL}' \", shell=True)
    subprocess.run("--env SERVER_TRANSPORT=stdio", shell=True)
    print("-e ")${GREEN}Claude Code configured ✓${NC}"
    else:
    print("-e ")${YELLOW}Claude Code CLI not found, skipping configuration${NC}"
    subprocess.run("}", shell=True)
    # Setup for VS Code
    subprocess.run("setup_vscode() {", shell=True)
    print("Configuring for VS Code...")
    subprocess.run("VSCODE_SETTINGS=".vscode/settings.json"", shell=True)
    if -f "$VSCODE_SETTINGS" :; then
    print("-e ")${YELLOW}VS Code settings exist. Add MCP configuration manually.${NC}"
    print("Add this to your .vscode/settings.json:")
    subprocess.run("cat <<'EOF'", shell=True)
    subprocess.run(""github.copilot.agents.mcpServers": {", shell=True)
    subprocess.run(""playwright": {", shell=True)
    subprocess.run(""command": "npx",", shell=True)
    subprocess.run(""args": ["@playwright/mcp@latest", "--browser", "chrome"]", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("}", shell=True)
    # Create helper scripts
    subprocess.run("create_helper_scripts() {", shell=True)
    print("Creating helper scripts...")
    subprocess.run("SCRIPTS_DIR="research/explorer/scripts"", shell=True)
    Path(""$SCRIPTS_DIR"").mkdir(parents=True, exist_ok=True)
    # Create exploration runner
    subprocess.run("cat > "$SCRIPTS_DIR/run-explorer.sh" <<'EOF'", shell=True)
    # Run Explorer agent
    subprocess.run("source .env.explorer 2>/dev/null || true", shell=True)
    print("Starting Explorer agent...")
    subprocess.run("python3 research/explorer/scripts/explorer.py "$@"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$SCRIPTS_DIR/run-explorer.sh"", shell=True)
    # Create test generator
    subprocess.run("cat > "$SCRIPTS_DIR/generate-tests.sh" <<'EOF'", shell=True)
    # Generate Playwright tests from findings
    subprocess.run("FINDINGS_DIR="research/explorer/findings"", shell=True)
    subprocess.run("TESTS_DIR="research/explorer/tests/generated"", shell=True)
    Path(""$TESTS_DIR"").mkdir(parents=True, exist_ok=True)
    for finding in ["$FINDINGS_DIR"/*.md; do]:
    if -f "$finding" :; then
    subprocess.run("basename=$(basename "$finding" .md)", shell=True)
    print("Generating test for $basename...")
    # Extract test code from markdown and save
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$SCRIPTS_DIR/generate-tests.sh"", shell=True)
    print("-e ")${GREEN}Helper scripts created ✓${NC}"
    subprocess.run("}", shell=True)
    # Main installation flow
    subprocess.run("main() {", shell=True)
    print("======================================")
    print("   Playwright MCP Installation")
    print("======================================")
    print("")
    subprocess.run("check_prerequisites", shell=True)
    subprocess.run("install_playwright_browsers", shell=True)
    subprocess.run("install_mcp_servers", shell=True)
    subprocess.run("create_mcp_config", shell=True)
    subprocess.run("create_env_template", shell=True)
    subprocess.run("setup_claude_code", shell=True)
    subprocess.run("setup_vscode", shell=True)
    subprocess.run("create_helper_scripts", shell=True)
    print("")
    print("======================================")
    print("-e ")${GREEN}   Installation Complete! 🎉${NC}"
    print("======================================")
    print("")
    print("Next steps:")
    print("1. Copy .env.explorer to .env and configure")
    print("2. Set your STAGING_URL and OPENAPI_SPEC_URL")
    print("3. (Optional) Set GITHUB_PAT for issue creation")
    print("4. Run: ./research/explorer/scripts/run-explorer.sh")
    print("")
    print("For Claude Code:")
    print("  The MCP servers have been configured automatically")
    print("")
    print("For VS Code:")
    print("  Add the MCP configuration to .vscode/settings.json")
    print("")
    subprocess.run("}", shell=True)
    # Run main installation
    subprocess.run("main "$@"", shell=True)

if __name__ == "__main__":
    main()