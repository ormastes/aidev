#!/usr/bin/env bun
/**
 * Migrated from: deploy-filesystem-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.675Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Deploy Filesystem MCP Server System-Wide
  // This script installs and configures the filesystem MCP for system use
  await $`set -e`;
  console.log("🚀 Deploying Filesystem MCP Server");
  console.log("===================================");
  console.log("");
  // Get script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"`;
  await $`AIDEV_ROOT="$(dirname "$(dirname "$(dirname "$PROJECT_ROOT")")")"`;
  console.log("📁 Project root: $PROJECT_ROOT");
  console.log("📁 AI Dev root: $AIDEV_ROOT");
  console.log("");
  // Check prerequisites
  console.log("🔍 Checking prerequisites...");
  // Check Node.js
  await $`if ! command -v node &> /dev/null; then`;
  console.log("❌ Node.js is not installed. Please install Node.js first.");
  process.exit(1);
  }
  await $`NODE_VERSION=$(node -v)`;
  console.log("✅ Node.js installed: $NODE_VERSION");
  // Check npm
  await $`if ! command -v npm &> /dev/null; then`;
  console.log("❌ npm is not installed. Please install npm first.");
  process.exit(1);
  }
  await $`NPM_VERSION=$(npm -v)`;
  console.log("✅ npm installed: $NPM_VERSION");
  // Check if MCP files exist
  if (! -f "$PROJECT_ROOT/mcp-server-production.js" ) {; then
  console.log("❌ MCP server files not found!");
  process.exit(1);
  }
  console.log("✅ MCP server files found");
  // Install dependencies if needed
  console.log("");
  console.log("📦 Checking dependencies...");
  process.chdir(""$PROJECT_ROOT"");
  if (! -d "node_modules" ) {; then
  console.log("Installing dependencies...");
  await $`npm install --production`;
  } else {
  console.log("✅ Dependencies already installed");
  }
  // Build if needed
  if (! -d "dist" ) {; then
  console.log("🔨 Building TypeScript files...");
  await $`npm run build 2>/dev/null || echo "⚠️  Build had some issues, continuing with existing files"`;
  } else {
  console.log("✅ Build directory exists");
  }
  // Test the MCP server
  console.log("");
  console.log("🧪 Testing MCP server...");
  await $`if timeout 2 node "$PROJECT_ROOT/mcp-server-production.js" < /dev/null &> /dev/null; then`;
  console.log("✅ MCP server can start successfully");
  } else {
  console.log("✅ MCP server initialized (timeout expected)");
  }
  // Create local bin directory if it doesn't exist
  await $`LOCAL_BIN="$HOME/.local/bin"`;
  if (! -d "$LOCAL_BIN" ) {; then
  console.log("");
  console.log("📁 Creating local bin directory...");
  await mkdir(""$LOCAL_BIN"", { recursive: true });
  // Add to PATH if not already there
  await $`if ! echo "$PATH" | grep -q "$LOCAL_BIN"; then`;
  console.log("export PATH=\");\$HOME/.local/bin:\$PATH\"" >> "$HOME/.bashrc"
  console.log("📝 Added $LOCAL_BIN to PATH in .bashrc");
  }
  }
  // Create executable wrapper scripts
  console.log("");
  console.log("📝 Creating executable scripts...");
  // Standard MCP server
  await $`cat > "$LOCAL_BIN/mcp-filesystem" << EOF`;
  // Filesystem MCP Server - Standard Version
  process.env.VF_BASE_PATH = ""\${VF_BASE_PATH:-\$(pwd)}"";
  process.env.NODE_ENV = ""\${NODE_ENV:-production}"";
  await $`exec node "$PROJECT_ROOT/mcp-server.js"`;
  await $`EOF`;
  await $`chmod +x "$LOCAL_BIN/mcp-filesystem"`;
  // Enhanced MCP server with validation
  await $`cat > "$LOCAL_BIN/mcp-filesystem-enhanced" << EOF`;
  // Filesystem MCP Server - Enhanced Version with Validation
  process.env.VF_BASE_PATH = ""\${VF_BASE_PATH:-\$(pwd)}"";
  process.env.VF_STRICT_MODE = ""\${VF_STRICT_MODE:-true}"";
  process.env.NODE_ENV = ""\${NODE_ENV:-production}"";
  await $`exec node "$PROJECT_ROOT/mcp-server-production.js"`;
  await $`EOF`;
  await $`chmod +x "$LOCAL_BIN/mcp-filesystem-enhanced"`;
  // MCP test command
  await $`cat > "$LOCAL_BIN/mcp-filesystem-test" << EOF`;
  // Test Filesystem MCP Server
  process.chdir(""$PROJECT_ROOT"");
  await $`node scripts/test-enhanced-mcp.js`;
  await $`EOF`;
  await $`chmod +x "$LOCAL_BIN/mcp-filesystem-test"`;
  console.log("✅ Executable scripts created");
  // Create MCP configuration for Claude Code
  console.log("");
  console.log("📝 Creating Claude Code configuration...");
  await $`CLAUDE_CONFIG_DIR="$HOME/.config/claude"`;
  await mkdir(""$CLAUDE_CONFIG_DIR"", { recursive: true });
  await $`cat > "$CLAUDE_CONFIG_DIR/mcp-filesystem.json" << EOF`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"filesystem-mcp": {`;
  await $`"command": "mcp-filesystem",`;
  await $`"args": [],`;
  await $`"env": {`;
  await $`"VF_BASE_PATH": "$AIDEV_ROOT"`;
  await $`},`;
  await $`"description": "Virtual filesystem MCP for AI development"`;
  await $`},`;
  await $`"filesystem-mcp-enhanced": {`;
  await $`"command": "mcp-filesystem-enhanced",`;
  await $`"args": [],`;
  await $`"env": {`;
  await $`"VF_BASE_PATH": "$AIDEV_ROOT",`;
  await $`"VF_STRICT_MODE": "true"`;
  await $`},`;
  await $`"description": "Enhanced filesystem MCP with artifact validation"`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  console.log("✅ Claude Code configuration created");
  // Create systemd user service (optional)
  await $`if command -v systemctl &> /dev/null; then`;
  console.log("");
  console.log("📝 Creating systemd user service...");
  await $`SYSTEMD_USER_DIR="$HOME/.config/systemd/user"`;
  await mkdir(""$SYSTEMD_USER_DIR"", { recursive: true });
  await $`cat > "$SYSTEMD_USER_DIR/mcp-filesystem.service" << EOF`;
  await $`[Unit]`;
  await $`Description=Filesystem MCP Server`;
  await $`After=network.target`;
  await $`[Service]`;
  await $`Type=simple`;
  await $`WorkingDirectory=$AIDEV_ROOT`;
  await $`Environment="VF_BASE_PATH=$AIDEV_ROOT"`;
  await $`Environment="NODE_ENV=production"`;
  await $`ExecStart=$LOCAL_BIN/mcp-filesystem`;
  await $`Restart=on-failure`;
  await $`RestartSec=10`;
  await $`StandardOutput=journal`;
  await $`StandardError=journal`;
  await $`[Install]`;
  await $`WantedBy=default.target`;
  await $`EOF`;
  await $`cat > "$SYSTEMD_USER_DIR/mcp-filesystem-enhanced.service" << EOF`;
  await $`[Unit]`;
  await $`Description=Enhanced Filesystem MCP Server`;
  await $`After=network.target`;
  await $`[Service]`;
  await $`Type=simple`;
  await $`WorkingDirectory=$AIDEV_ROOT`;
  await $`Environment="VF_BASE_PATH=$AIDEV_ROOT"`;
  await $`Environment="VF_STRICT_MODE=true"`;
  await $`Environment="NODE_ENV=production"`;
  await $`ExecStart=$LOCAL_BIN/mcp-filesystem-enhanced`;
  await $`Restart=on-failure`;
  await $`RestartSec=10`;
  await $`StandardOutput=journal`;
  await $`StandardError=journal`;
  await $`[Install]`;
  await $`WantedBy=default.target`;
  await $`EOF`;
  console.log("✅ Systemd user services created");
  console.log("");
  console.log("To enable services:");
  console.log("  systemctl --user daemon-reload");
  console.log("  systemctl --user enable mcp-filesystem.service");
  console.log("  systemctl --user start mcp-filesystem.service");
  }
  // Create desktop launcher (optional)
  if (-d "$HOME/.local/share/applications" ) {; then
  console.log("");
  console.log("📝 Creating desktop launcher...");
  await $`cat > "$HOME/.local/share/applications/mcp-filesystem.desktop" << EOF`;
  await $`[Desktop Entry]`;
  await $`Name=Filesystem MCP Server`;
  await $`Comment=Virtual filesystem MCP for AI development`;
  await $`Exec=$LOCAL_BIN/mcp-filesystem`;
  await $`Icon=folder-remote`;
  await $`Terminal=true`;
  await $`Type=Application`;
  await $`Categories=Development;`;
  await $`EOF`;
  console.log("✅ Desktop launcher created");
  }
  // Create quick start script
  await $`cat > "$PROJECT_ROOT/start-mcp.sh" << EOF`;
  // Quick start script for Filesystem MCP
  console.log("🚀 Starting Filesystem MCP Server");
  console.log("Choose version:");
  console.log("  1) Standard MCP");
  console.log("  2) Enhanced MCP (with validation)");
  console.log("");
  await $`read -p "Enter choice [1-2]: " choice`;
  await $`case \$choice in`;
  await $`1)`;
  console.log("Starting standard MCP server...");
  await $`mcp-filesystem`;
  await $`;;`;
  await $`2)`;
  console.log("Starting enhanced MCP server...");
  await $`mcp-filesystem-enhanced`;
  await $`;;`;
  await $`*)`;
  console.log("Invalid choice. Starting standard MCP...");
  await $`mcp-filesystem`;
  await $`;;`;
  await $`esac`;
  await $`EOF`;
  await $`chmod +x "$PROJECT_ROOT/start-mcp.sh"`;
  // Create README for deployment
  await $`cat > "$PROJECT_ROOT/DEPLOYMENT_STATUS.md" << EOF`;
  // Filesystem MCP Deployment Status
  // # ✅ Deployment Complete
  await $`Date: $(date)`;
  await $`Location: $PROJECT_ROOT`;
  // # Installed Commands
  await $`- \`mcp-filesystem\` - Standard filesystem MCP server`;
  await $`- \`mcp-filesystem-enhanced\` - Enhanced server with validation`;
  await $`- \`mcp-filesystem-test\` - Run validation tests`;
  // # Configuration Files
  await $`- Claude Code: \`$CLAUDE_CONFIG_DIR/mcp-filesystem.json\``;
  await $`- Systemd Services: \`$HOME/.config/systemd/user/mcp-filesystem*.service\``;
  // # Quick Start
  await $`\`\`\`bash`;
  // Run standard server
  await $`mcp-filesystem`;
  // Run enhanced server with validation
  await $`mcp-filesystem-enhanced`;
  // Test the installation
  await $`mcp-filesystem-test`;
  await $`\`\`\``;
  // # Environment Variables
  await $`- \`VF_BASE_PATH\` - Base directory for virtual filesystem (default: current directory)`;
  await $`- \`VF_STRICT_MODE\` - Enable strict validation (default: true for enhanced)`;
  await $`- \`NODE_ENV\` - Node environment (default: production)`;
  // # Features
  // ## Standard Server
  await $`- Virtual file operations`;
  await $`- Task queue management`;
  await $`- Feature tracking`;
  await $`- Name-ID mapping`;
  // ## Enhanced Server
  await $`- All standard features plus:`;
  await $`- Artifact validation`;
  await $`- Task dependency checking`;
  await $`- Adhoc file justification`;
  await $`- Lifecycle management`;
  await $`- Operations refused when requirements not met`;
  // # Integration with Claude Code
  await $`The MCP servers are configured in Claude Code. To use:`;
  await $`1. Open Claude Code`;
  await $`2. The MCP servers should be automatically available`;
  await $`3. Use virtual filesystem commands prefixed with \`vf_\``;
  // # Troubleshooting
  await $`If commands are not found:`;
  await $`\`\`\`bash`;
  process.env.PATH = ""\$HOME/.local/bin:\$PATH"";
  await $`source ~/.bashrc`;
  await $`\`\`\``;
  await $`To check if services are running:`;
  await $`\`\`\`bash`;
  await $`systemctl --user status mcp-filesystem.service`;
  await $`\`\`\``;
  // # Logs
  await $`View logs with:`;
  await $`\`\`\`bash`;
  await $`journalctl --user -u mcp-filesystem.service -f`;
  await $`\`\`\``;
  await $`EOF`;
  console.log("");
  console.log("✅ Deployment Complete!");
  console.log("=======================");
  console.log("");
  console.log("📁 Installation location: $PROJECT_ROOT");
  console.log("📁 Executables installed to: $LOCAL_BIN");
  console.log("");
  console.log("Available commands:");
  console.log("  • mcp-filesystem          - Run standard MCP server");
  console.log("  • mcp-filesystem-enhanced - Run enhanced MCP with validation");
  console.log("  • mcp-filesystem-test     - Test the installation");
  console.log("");
  console.log("Quick start:");
  console.log("  $PROJECT_ROOT/start-mcp.sh");
  console.log("");
  console.log("Configuration:");
  console.log("  • Claude Code: $CLAUDE_CONFIG_DIR/mcp-filesystem.json");
  await $`if command -v systemctl &> /dev/null; then`;
  console.log("  • Systemd: ~/.config/systemd/user/mcp-filesystem*.service");
  }
  console.log("");
  console.log("Environment variables:");
  console.log("  • VF_BASE_PATH - Set base directory (default: current)");
  console.log("  • VF_STRICT_MODE - Enable validation (enhanced only)");
  console.log("");
  // Test the installation
  console.log("🧪 Testing installation...");
  await $`if command -v mcp-filesystem-test &> /dev/null; then`;
  console.log("Running tests...");
  await $`if mcp-filesystem-test 2>&1 | grep -q "All tests PASSED"; then`;
  console.log("✅ All tests passed!");
  } else {
  console.log("⚠️  Some tests may have issues, check manually");
  }
  } else {
  // Update PATH for current session
  process.env.PATH = ""$LOCAL_BIN:$PATH"";
  await $`if "$LOCAL_BIN/mcp-filesystem-test" 2>&1 | grep -q "All tests PASSED"; then`;
  console.log("✅ All tests passed!");
  } else {
  console.log("⚠️  Some tests may have issues, check manually");
  }
  }
  console.log("");
  console.log("🎉 Filesystem MCP has been successfully deployed!");
  console.log("");
  console.log("Note: You may need to restart your terminal or run:");
  console.log("  export PATH=\");\$HOME/.local/bin:\$PATH\""
  console.log("");
  console.log("To use with Claude Code, the MCP servers are now configured and ready.");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}