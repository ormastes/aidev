#!/usr/bin/env bun
/**
 * Migrated from: deploy-enhanced-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.752Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Deploy Enhanced MCP Server to System
  // This script sets up the enhanced MCP server for production use
  await $`set -e`;
  console.log("🚀 Deploying Enhanced MCP Server to System");
  console.log("===========================================");
  // Get script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"`;
  await $`AIDEV_ROOT="$(dirname "$(dirname "$(dirname "$PROJECT_ROOT")")")"`;
  console.log("📁 Project root: $PROJECT_ROOT");
  console.log("📁 AI Dev root: $AIDEV_ROOT");
  // Check if we're in the right directory
  if (! -f "$PROJECT_ROOT/mcp-server-enhanced.js" ) {; then
  console.log("❌ Error: mcp-server-enhanced.js not found!");
  console.log("   Expected location: $PROJECT_ROOT/mcp-server-enhanced.js");
  process.exit(1);
  }
  // Check if dist directory exists
  if (! -d "$PROJECT_ROOT/dist" ) {; then
  console.log("🔨 Building TypeScript files...");
  process.chdir(""$PROJECT_ROOT"");
  await $`npm run build || echo "⚠️  Build had some errors, continuing with existing files"`;
  }
  // Test the enhanced MCP
  console.log("");
  console.log("🧪 Running validation tests...");
  await $`if node "$PROJECT_ROOT/scripts/test-enhanced-mcp.js"; then`;
  console.log("✅ All tests passed!");
  } else {
  console.log("❌ Tests failed! Fix issues before deploying.");
  process.exit(1);
  }
  // Create symlink for global access (optional)
  await $`GLOBAL_MCP_DIR="$HOME/.local/bin"`;
  if (-d "$GLOBAL_MCP_DIR" ) {; then
  console.log("");
  console.log("📌 Creating global command...");
  await $`cat > "$GLOBAL_MCP_DIR/mcp-enhanced" << EOF`;
  await $`VF_BASE_PATH="\${VF_BASE_PATH:-\$(pwd)}" \\`;
  await $`VF_STRICT_MODE="\${VF_STRICT_MODE:-true}" \\`;
  await $`node "$PROJECT_ROOT/mcp-server-enhanced.js"`;
  await $`EOF`;
  await $`chmod +x "$GLOBAL_MCP_DIR/mcp-enhanced"`;
  console.log("✅ Global command created: mcp-enhanced");
  }
  // Create systemd service file (optional)
  await $`if command -v systemctl &> /dev/null; then`;
  console.log("");
  console.log("📝 Creating systemd service file...");
  await $`cat > /tmp/mcp-enhanced.service << EOF`;
  await $`[Unit]`;
  await $`Description=Enhanced MCP Server with Artifact Validation`;
  await $`After=network.target`;
  await $`[Service]`;
  await $`Type=simple`;
  await $`User=$USER`;
  await $`WorkingDirectory=$AIDEV_ROOT`;
  await $`Environment="VF_BASE_PATH=$AIDEV_ROOT"`;
  await $`Environment="VF_STRICT_MODE=true"`;
  await $`Environment="NODE_ENV=production"`;
  await $`ExecStart=/usr/bin/node $PROJECT_ROOT/mcp-server-enhanced.js`;
  await $`Restart=on-failure`;
  await $`RestartSec=10`;
  await $`[Install]`;
  await $`WantedBy=multi-user.target`;
  await $`EOF`;
  console.log("✅ Service file created at: /tmp/mcp-enhanced.service");
  console.log("   To install: sudo cp /tmp/mcp-enhanced.service /etc/systemd/system/");
  console.log("   To enable: sudo systemctl enable mcp-enhanced");
  console.log("   To start: sudo systemctl start mcp-enhanced");
  }
  // Create launcher script
  console.log("");
  console.log("📝 Creating launcher script...");
  await $`cat > "$PROJECT_ROOT/run-enhanced-mcp.sh" << EOF`;
  // Enhanced MCP Server Launcher
  console.log("🚀 Starting Enhanced MCP Server");
  console.log("================================");
  console.log("Base path: \${VF_BASE_PATH:-$AIDEV_ROOT}");
  console.log("Strict mode: \${VF_STRICT_MODE:-true}");
  console.log("");
  console.log("Features enabled:");
  console.log("  ✅ Artifact validation");
  console.log("  ✅ Task dependency checking");
  console.log("  ✅ Feature-task linking");
  console.log("  ✅ Adhoc justification");
  console.log("  ✅ Lifecycle management");
  console.log("");
  await $`VF_BASE_PATH="\${VF_BASE_PATH:-$AIDEV_ROOT}" \\`;
  await $`VF_STRICT_MODE="\${VF_STRICT_MODE:-true}" \\`;
  await $`NODE_ENV="production" \\`;
  await $`exec node "$PROJECT_ROOT/mcp-server-enhanced.js"`;
  await $`EOF`;
  await $`chmod +x "$PROJECT_ROOT/run-enhanced-mcp.sh"`;
  // Display deployment summary
  console.log("");
  console.log("✅ Deployment Complete!");
  console.log("=======================");
  console.log("");
  console.log("📁 Installation location: $PROJECT_ROOT");
  console.log("");
  console.log("To run the enhanced MCP server:");
  console.log("  1. Direct: npm run mcp-server-enhanced");
  console.log("  2. Script: $PROJECT_ROOT/run-enhanced-mcp.sh");
  if (-f "$GLOBAL_MCP_DIR/mcp-enhanced" ) {; then
  console.log("  3. Global: mcp-enhanced");
  }
  console.log("");
  console.log("To test the server:");
  console.log("  npm run mcp-test");
  console.log("");
  console.log("MCP Configuration:");
  console.log("  $PROJECT_ROOT/mcp-config.json");
  console.log("");
  console.log("Environment variables:");
  console.log("  VF_BASE_PATH: Set the base directory (default: $AIDEV_ROOT)");
  console.log("  VF_STRICT_MODE: Enable/disable strict validation (default: true)");
  console.log("");
  console.log("Key features:");
  console.log("  🛡️  Refuses deployment without proper artifacts");
  console.log("  🛡️  Refuses refactoring without tests");
  console.log("  🛡️  Requires justification for adhoc files");
  console.log("  🛡️  Validates task dependencies");
  console.log("  🛡️  Enforces artifact lifecycle states");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}