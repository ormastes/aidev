#!/usr/bin/env bun
/**
 * Migrated from: install-playwright-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.701Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Playwright MCP Installation Script
  // Automatically installs and configures Playwright MCP for Explorer testing
  await $`set -e`;
  console.log("🎭 Installing Playwright MCP Server...");
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Check prerequisites
  await $`check_prerequisites() {`;
  console.log("Checking prerequisites...");
  // Check Node.js
  await $`if ! command -v node &> /dev/null; then`;
  console.log("-e ");${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
  process.exit(1);
  }
  await $`NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)`;
  if ("$NODE_VERSION" -lt 18 ) {; then
  console.log("-e ");${RED}Node.js version 18+ required. Current version: $(node -v)${NC}"
  process.exit(1);
  }
  // Check Python
  await $`if ! command -v python3 &> /dev/null; then`;
  console.log("-e ");${RED}Python 3 is not installed. Please install Python 3.10+ first.${NC}"
  process.exit(1);
  }
  console.log("-e ");${GREEN}Prerequisites satisfied ✓${NC}"
  await $`}`;
  // Install Playwright browsers
  await $`install_playwright_browsers() {`;
  console.log("Installing Playwright browsers...");
  await $`bunx playwright install chromium firefox webkit`;
  console.log("-e ");${GREEN}Playwright browsers installed ✓${NC}"
  await $`}`;
  // Install MCP servers
  await $`install_mcp_servers() {`;
  console.log("Installing MCP servers...");
  // Install Playwright MCP globally for easy access
  await $`bun add -g @playwright/mcp@latest`;
  // Install OpenAPI MCP server
  await $`uv pip install --user "awslabs.openapi-mcp-server[all]"`;
  // Install MCP Python SDK for orchestration
  await $`uv pip install --user mcp`;
  console.log("-e ");${GREEN}MCP servers installed ✓${NC}"
  await $`}`;
  // Create MCP configuration
  await $`create_mcp_config() {`;
  console.log("Creating MCP configuration...");
  await $`CONFIG_DIR="$HOME/.config/aidev-explorer"`;
  await mkdir(""$CONFIG_DIR"", { recursive: true });
  await $`cat > "$CONFIG_DIR/mcp-servers.json" <<'EOF'`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"playwright": {`;
  await $`"command": "npx",`;
  await $`"args": [`;
  await $`"@playwright/mcp@latest",`;
  await $`"--browser", "chrome",`;
  await $`"--block-service-workers",`;
  await $`"--caps", "vision,pdf"`;
  await $`]`;
  await $`},`;
  await $`"playwright-firefox": {`;
  await $`"command": "npx",`;
  await $`"args": [`;
  await $`"@playwright/mcp@latest",`;
  await $`"--browser", "firefox"`;
  await $`]`;
  await $`},`;
  await $`"openapi": {`;
  await $`"command": "uvx",`;
  await $`"args": ["awslabs.openapi-mcp-server@latest"],`;
  await $`"env": {`;
  await $`"API_NAME": "aidev",`;
  await $`"API_BASE_URL": "${STAGING_URL:-https://staging.aidev.example.com}",`;
  await $`"API_SPEC_URL": "${OPENAPI_SPEC_URL:-https://staging.aidev.example.com/openapi.json}",`;
  await $`"SERVER_TRANSPORT": "stdio"`;
  await $`}`;
  await $`},`;
  await $`"github": {`;
  await $`"command": "docker",`;
  await $`"args": [`;
  await $`"run", "-i", "--rm",`;
  await $`"-e", "GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PAT}",`;
  await $`"-e", "GITHUB_TOOLSETS=issues",`;
  await $`"-e", "GITHUB_READ_ONLY=1",`;
  await $`"ghcr.io/github/github-mcp-server"`;
  await $`]`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  console.log("-e ");${GREEN}MCP configuration created at $CONFIG_DIR/mcp-servers.json ✓${NC}"
  await $`}`;
  // Create environment template
  await $`create_env_template() {`;
  console.log("Creating environment template...");
  await $`ENV_FILE=".env.explorer"`;
  if (! -f "$ENV_FILE" ) {; then
  await $`cat > "$ENV_FILE" <<'EOF'`;
  // Explorer MCP Configuration
  // Copy to .env and fill in your values
  // Required - Staging environment
  await $`STAGING_URL=https://staging.aidev.example.com`;
  await $`OPENAPI_SPEC_URL=https://staging.aidev.example.com/openapi.json`;
  // GitHub Integration (optional)
  await $`GITHUB_PAT=ghp_your_token_here`;
  await $`GITHUB_REPO=owner/repo`;
  // Explorer Settings
  await $`EXPLORER_MAX_RPS=1`;
  await $`EXPLORER_TIMEOUT_MS=30000`;
  await $`EXPLORER_SCREENSHOT_ON_FAILURE=true`;
  await $`EXPLORER_HEADLESS=false`;
  // Test Accounts (never use production!)
  await $`TEST_USER_EMAIL=test@example.com`;
  await $`TEST_USER_PASSWORD=testpass123`;
  await $`TEST_API_KEY=test_api_key_here`;
  await $`EOF`;
  console.log("-e ");${GREEN}Environment template created at $ENV_FILE ✓${NC}"
  } else {
  console.log("-e ");${YELLOW}Environment file already exists, skipping...${NC}"
  }
  await $`}`;
  // Setup for Claude Code
  await $`setup_claude_code() {`;
  console.log("Configuring for Claude Code...");
  // Check if Claude Code CLI is available
  await $`if command -v claude &> /dev/null; then`;
  console.log("Adding MCP servers to Claude Code...");
  // Add Playwright MCP
  await $`claude mcp add playwright bunx @playwright/mcp@latest --browser chrome`;
  // Add OpenAPI MCP with environment variables
  await $`claude mcp add openapi uvx awslabs.openapi-mcp-server@latest \`;
  await $`--env API_NAME=aidev \`;
  await $`--env 'API_BASE_URL=${STAGING_URL}' \`;
  await $`--env 'API_SPEC_URL=${OPENAPI_SPEC_URL}' \`;
  await $`--env SERVER_TRANSPORT=stdio`;
  console.log("-e ");${GREEN}Claude Code configured ✓${NC}"
  } else {
  console.log("-e ");${YELLOW}Claude Code CLI not found, skipping configuration${NC}"
  }
  await $`}`;
  // Setup for VS Code
  await $`setup_vscode() {`;
  console.log("Configuring for VS Code...");
  await $`VSCODE_SETTINGS=".vscode/settings.json"`;
  if (-f "$VSCODE_SETTINGS" ) {; then
  console.log("-e ");${YELLOW}VS Code settings exist. Add MCP configuration manually.${NC}"
  console.log("Add this to your .vscode/settings.json:");
  await $`cat <<'EOF'`;
  await $`"github.copilot.agents.mcpServers": {`;
  await $`"playwright": {`;
  await $`"command": "npx",`;
  await $`"args": ["@playwright/mcp@latest", "--browser", "chrome"]`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  }
  await $`}`;
  // Create helper scripts
  await $`create_helper_scripts() {`;
  console.log("Creating helper scripts...");
  await $`SCRIPTS_DIR="research/explorer/scripts"`;
  await mkdir(""$SCRIPTS_DIR"", { recursive: true });
  // Create exploration runner
  await $`cat > "$SCRIPTS_DIR/run-explorer.sh" <<'EOF'`;
  // Run Explorer agent
  await $`source .env.explorer 2>/dev/null || true`;
  console.log("Starting Explorer agent...");
  await $`python3 research/explorer/scripts/explorer.py "$@"`;
  await $`EOF`;
  await $`chmod +x "$SCRIPTS_DIR/run-explorer.sh"`;
  // Create test generator
  await $`cat > "$SCRIPTS_DIR/generate-tests.sh" <<'EOF'`;
  // Generate Playwright tests from findings
  await $`FINDINGS_DIR="research/explorer/findings"`;
  await $`TESTS_DIR="research/explorer/tests/generated"`;
  await mkdir(""$TESTS_DIR"", { recursive: true });
  for (const finding of ["$FINDINGS_DIR"/*.md; do]) {
  if (-f "$finding" ) {; then
  await $`basename=$(basename "$finding" .md)`;
  console.log("Generating test for $basename...");
  // Extract test code from markdown and save
  }
  }
  await $`EOF`;
  await $`chmod +x "$SCRIPTS_DIR/generate-tests.sh"`;
  console.log("-e ");${GREEN}Helper scripts created ✓${NC}"
  await $`}`;
  // Main installation flow
  await $`main() {`;
  console.log("======================================");
  console.log("   Playwright MCP Installation");
  console.log("======================================");
  console.log("");
  await $`check_prerequisites`;
  await $`install_playwright_browsers`;
  await $`install_mcp_servers`;
  await $`create_mcp_config`;
  await $`create_env_template`;
  await $`setup_claude_code`;
  await $`setup_vscode`;
  await $`create_helper_scripts`;
  console.log("");
  console.log("======================================");
  console.log("-e ");${GREEN}   Installation Complete! 🎉${NC}"
  console.log("======================================");
  console.log("");
  console.log("Next steps:");
  console.log("1. Copy .env.explorer to .env and configure");
  console.log("2. Set your STAGING_URL and OPENAPI_SPEC_URL");
  console.log("3. (Optional) Set GITHUB_PAT for issue creation");
  console.log("4. Run: ./research/explorer/scripts/run-explorer.sh");
  console.log("");
  console.log("For Claude Code:");
  console.log("  The MCP servers have been configured automatically");
  console.log("");
  console.log("For VS Code:");
  console.log("  Add the MCP configuration to .vscode/settings.json");
  console.log("");
  await $`}`;
  // Run main installation
  await $`main "$@"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}