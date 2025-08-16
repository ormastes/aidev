#!/usr/bin/env bun
/**
 * Migrated from: setup-filesystem-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.699Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Filesystem MCP Setup Script
  // Installs and configures the filesystem MCP for this project
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║     Filesystem MCP Installation & Setup         ║");
  console.log("╚════════════════════════════════════════════════╝");
  console.log("");
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Get script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"`;
  console.log("📁 Project root: $PROJECT_ROOT");
  console.log("📁 MCP directory: $SCRIPT_DIR");
  console.log("");
  // Step 1: Check Bun or Node.js
  console.log("🔍 Checking JavaScript runtime...");
  await $`if command -v bun &> /dev/null; then`;
  console.log("-e ");${GREEN}✅ Bun $(bun --version) found${NC}"
  await $`RUNTIME="bun"`;
  await $`INSTALL_CMD="bun install --silent"`;
  await $`elif command -v node &> /dev/null; then`;
  await $`NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)`;
  if ("$NODE_VERSION" -lt 18 ) {; then
  console.log("-e ");${YELLOW}⚠️  Node.js version is below 18. Some features may not work.${NC}"
  } else {
  console.log("-e ");${GREEN}✅ Node.js $(node -v) found${NC}"
  }
  await $`RUNTIME="node"`;
  await $`INSTALL_CMD="npm install --quiet"`;
  } else {
  console.log("-e ");${RED}❌ Neither Bun nor Node.js is installed. Please install Bun or Node.js 18+ first.${NC}"
  process.exit(1);
  }
  // Step 2: Install dependencies
  console.log("");
  console.log("📦 Installing dependencies with $RUNTIME...");
  process.chdir(""$SCRIPT_DIR"");
  await $`$INSTALL_CMD`;
  if ($? -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ Dependencies installed successfully${NC}"
  } else {
  console.log("-e ");${RED}❌ Failed to install dependencies${NC}"
  process.exit(1);
  }
  // Step 3: Configure MCP
  console.log("");
  console.log("⚙️  Configuring MCP...");
  // Update mcp-config.json with correct paths
  await $`cat > mcp-config.json << EOF`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"filesystem-mcp": {`;
  await $`"command": "node",`;
  await $`"args": [`;
  await $`"$SCRIPT_DIR/mcp-server.js"`;
  await $`],`;
  await $`"env": {`;
  await $`"VF_BASE_PATH": "$PROJECT_ROOT",`;
  await $`"NODE_ENV": "production"`;
  await $`},`;
  await $`"description": "Standard filesystem MCP server for virtual file operations"`;
  await $`},`;
  await $`"filesystem-mcp-enhanced": {`;
  await $`"command": "node",`;
  await $`"args": [`;
  await $`"$SCRIPT_DIR/mcp-server-enhanced.js"`;
  await $`],`;
  await $`"env": {`;
  await $`"VF_BASE_PATH": "$PROJECT_ROOT",`;
  await $`"VF_STRICT_MODE": "true",`;
  await $`"NODE_ENV": "production"`;
  await $`},`;
  await $`"description": "Enhanced filesystem MCP with artifact validation and task queue enforcement"`;
  await $`}`;
  await $`},`;
  await $`"defaultServer": "filesystem-mcp-enhanced",`;
  await $`"features": {`;
  await $`"artifactValidation": true,`;
  await $`"taskDependencyChecking": true,`;
  await $`"featureTaskLinking": true,`;
  await $`"adhocJustification": true,`;
  await $`"lifecycleManagement": true`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  console.log("-e ");${GREEN}✅ MCP configuration updated${NC}"
  // Step 4: Test MCP server
  console.log("");
  console.log("🧪 Testing MCP server...");
  // Test basic server
  await $`timeout 2s node mcp-server.js 2>/dev/null`;
  if ($? -eq 124 ) {; then
  console.log("-e ");${GREEN}✅ Basic MCP server starts successfully${NC}"
  } else {
  console.log("-e ");${YELLOW}⚠️  Basic MCP server test incomplete${NC}"
  }
  // Test enhanced server
  await $`timeout 2s node mcp-server-enhanced.js 2>/dev/null`;
  if ($? -eq 124 ) {; then
  console.log("-e ");${GREEN}✅ Enhanced MCP server starts successfully${NC}"
  } else {
  console.log("-e ");${YELLOW}⚠️  Enhanced MCP server test incomplete${NC}"
  }
  // Step 5: Create Claude configuration
  console.log("");
  console.log("🤖 Creating Claude configuration...");
  await $`CLAUDE_CONFIG_DIR="$HOME/.config/claude"`;
  await mkdir(""$CLAUDE_CONFIG_DIR"", { recursive: true });
  // Check if claude_desktop_config.json exists
  await $`CLAUDE_CONFIG="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"`;
  if (-f "$CLAUDE_CONFIG" ) {; then
  console.log("-e ");${YELLOW}⚠️  Claude config already exists. Creating backup...${NC}"
  await copyFile(""$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup.$(date", "+%Y%m%d_%H%M%S)"");
  }
  // Create or update Claude config
  await $`cat > "$CLAUDE_CONFIG" << EOF`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"filesystem-mcp": {`;
  await $`"command": "node",`;
  await $`"args": [`;
  await $`"$SCRIPT_DIR/mcp-server.js"`;
  await $`],`;
  await $`"env": {`;
  await $`"VF_BASE_PATH": "$PROJECT_ROOT"`;
  await $`}`;
  await $`},`;
  await $`"filesystem-mcp-enhanced": {`;
  await $`"command": "node",`;
  await $`"args": [`;
  await $`"$SCRIPT_DIR/mcp-server-enhanced.js"`;
  await $`],`;
  await $`"env": {`;
  await $`"VF_BASE_PATH": "$PROJECT_ROOT",`;
  await $`"VF_STRICT_MODE": "true"`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  console.log("-e ");${GREEN}✅ Claude configuration created at $CLAUDE_CONFIG${NC}"
  // Step 6: Deploy schema files to project root
  console.log("");
  console.log("📝 Deploying .vf.json schema files to project root...");
  // Use the deployment script to set up VF schema files
  await $`DEPLOY_SCRIPT="$SCRIPT_DIR/scripts/deploy-vf-schemas.sh"`;
  if (-f "$DEPLOY_SCRIPT" ) {; then
  // Run deployment script in init mode
  await $`bash "$DEPLOY_SCRIPT" init`;
  } else {
  console.log("-e ");${YELLOW}⚠️  Deployment script not found, using fallback method${NC}"
  // Fallback: Deploy vf.json files from schemas folder to project root
  await $`SCHEMA_DIR="$SCRIPT_DIR/schemas"`;
  // List of vf.json files to deploy
  await $`VF_FILES=("TASK_QUEUE.vf.json" "FEATURE.vf.json" "FILE_STRUCTURE.vf.json" "NAME_ID.vf.json")`;
  for (const VF_FILE of ["${VF_FILES[@]}"; do]) {
  if (-f "$SCHEMA_DIR/$VF_FILE" ) {; then
  if (! -f "$PROJECT_ROOT/$VF_FILE" ) {; then
  console.log("  Deploying $VF_FILE to project root...");
  await copyFile(""$SCHEMA_DIR/$VF_FILE"", ""$PROJECT_ROOT/$VF_FILE"");
  console.log("-e ");${GREEN}  ✅ Deployed $VF_FILE${NC}"
  } else {
  console.log("-e ");${YELLOW}  ⚠️  $VF_FILE already exists in project root, skipping${NC}"
  }
  } else {
  console.log("-e ");${YELLOW}  ⚠️  $VF_FILE not found in schemas folder${NC}"
  }
  }
  }
  // Create test directory
  await $`TEST_DIR="$PROJECT_ROOT/test-vf-files"`;
  await mkdir(""$TEST_DIR"", { recursive: true });
  // Create test file
  await $`cat > "$TEST_DIR/test.vf.json" << EOF`;
  await $`{`;
  await $`"metadata": {`;
  await $`"level": "test",`;
  await $`"path": "/test-vf-files/test.vf.json",`;
  await $`"version": "1.0.0",`;
  await $`"created_at": "$(date -Iseconds)",`;
  await $`"updated_at": "$(date -Iseconds)"`;
  await $`},`;
  await $`"content": {`;
  await $`"message": "This is a test virtual file",`;
  await $`"created_by": "setup script"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  console.log("-e ");${GREEN}✅ Test files created${NC}"
  // Step 7: Summary
  console.log("");
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║           Installation Complete! 🎉             ║");
  console.log("╚════════════════════════════════════════════════╝");
  console.log("");
  console.log("📋 Summary:");
  console.log("  • MCP servers installed at: $SCRIPT_DIR");
  console.log("  • Configuration file: $SCRIPT_DIR/mcp-config.json");
  console.log("  • Claude config: $CLAUDE_CONFIG");
  console.log("  • Test files: $TEST_DIR");
  console.log("");
  console.log("🚀 To use the filesystem MCP:");
  console.log("");
  console.log("  1. With Claude Desktop:");
  console.log("     - Restart Claude Desktop to load the new configuration");
  console.log("     - The MCP tools will be available automatically");
  console.log("");
  console.log("  2. Manually start the server:");
  console.log("     cd $SCRIPT_DIR");
  console.log("     node mcp-server.js          # Basic server");
  console.log("     node mcp-server-enhanced.js # Enhanced server");
  console.log("");
  console.log("  3. Available MCP tools:");
  console.log("     • read_vf_file     - Read .vf.json files");
  console.log("     • write_vf_file    - Write .vf.json files");
  console.log("     • list_vf_files    - List .vf.json files");
  console.log("     • read_task_queue  - Read TASK_QUEUE.vf.json");
  console.log("     • add_task         - Add tasks to queue");
  console.log("     • read_features    - Read FEATURE.vf.json");
  console.log("     • search_vf_content - Search in .vf.json files");
  console.log("");
  console.log("📚 Documentation: $SCRIPT_DIR/README.md");
  console.log("");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}