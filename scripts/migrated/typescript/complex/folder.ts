#!/usr/bin/env bun
/**
 * Migrated from: folder.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.654Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup script for deploying aidev folder structure with MCP configuration
  // This script creates a complete aidev environment for demo/release purposes
  await $`set -euo pipefail`;
  // Configuration
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"`;
  await $`TARGET_DIR="${1:-./aidev}"`;
  await $`MODE="${2:-demo}" # demo or release`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Logging functions
  await $`log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }`;
  await $`log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }`;
  await $`log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }`;
  await $`log_error() { echo -e "${RED}[ERROR]${NC} $1"; }`;
  // Check if target directory already exists
  await $`check_target_directory() {`;
  if ([ -d "$TARGET_DIR" ]) {; then
  await $`log_warning "Target directory $TARGET_DIR already exists"`;
  await $`read -p "Do you want to overwrite it? (y/N): " -n 1 -r`;
  await $`echo`;
  if ([ ! $REPLY =~ ^[Yy]$ ]) {; then
  await $`log_info "Aborting setup"`;
  process.exit(1);
  }
  await rm(""$TARGET_DIR"", { recursive: true, force: true });
  }
  await $`}`;
  // Create directory structure
  await $`create_directory_structure() {`;
  await $`log_info "Creating directory structure at $TARGET_DIR"`;
  // Core directories
  await mkdir(""$TARGET_DIR"/{scripts,config,docs,llm_rules,templates,gen,layer,src,tests}", { recursive: true });
  await mkdir(""$TARGET_DIR"/scripts/{core,setup,utils}", { recursive: true });
  await mkdir(""$TARGET_DIR"/config/{mcp,typescript,testing}", { recursive: true });
  await mkdir(""$TARGET_DIR"/gen/{doc,history/retrospect}", { recursive: true });
  await mkdir(""$TARGET_DIR"/layer/themes", { recursive: true });
  await mkdir(""$TARGET_DIR"/templates/llm_rules", { recursive: true });
  await $`log_success "Directory structure created"`;
  await $`}`;
  // Copy essential files
  await $`copy_essential_files() {`;
  await $`log_info "Copying essential files"`;
  // Copy CLAUDE.md
  if ([ -f "$PROJECT_ROOT/CLAUDE.md" ]) {; then
  await copyFile(""$PROJECT_ROOT/CLAUDE.md"", ""$TARGET_DIR/"");
  await $`log_success "Copied CLAUDE.md"`;
  } else {
  await $`log_error "CLAUDE.md not found in source"`;
  }
  // Copy llm_rules directory
  if ([ -d "$PROJECT_ROOT/llm_rules" ]) {; then
  await copyFile("-r "$PROJECT_ROOT/llm_rules"", ""$TARGET_DIR/"");
  await $`log_success "Copied llm_rules directory"`;
  } else {
  await $`log_warning "llm_rules directory not found in source"`;
  }
  // Copy other essential files
  for (const file of [README.md FEATURE.vf.json TASK_QUEUE.vf.json FILE_STRUCTURE.vf.json NAME_ID.vf.json; do]) {
  if ([ -f "$PROJECT_ROOT/$file" ]) {; then
  await copyFile(""$PROJECT_ROOT/$file"", ""$TARGET_DIR/"");
  await $`log_success "Copied $file"`;
  } else {
  await $`log_warning "$file not found in source"`;
  }
  }
  // Copy documentation
  if ([ -d "$PROJECT_ROOT/docs" ]) {; then
  await copyFile("-r "$PROJECT_ROOT/docs"", ""$TARGET_DIR/"");
  await $`log_success "Copied documentation"`;
  }
  // Copy templates
  if ([ -d "$PROJECT_ROOT/templates" ]) {; then
  await copyFile("-r "$PROJECT_ROOT/templates"", ""$TARGET_DIR/"");
  await $`log_success "Copied templates"`;
  }
  // Copy setup-folder theme
  if ([ -d "$PROJECT_ROOT/layer/themes/setup-folder" ]) {; then
  await mkdir(""$TARGET_DIR/layer/themes"", { recursive: true });
  await copyFile("-r "$PROJECT_ROOT/layer/themes/setup-folder"", ""$TARGET_DIR/layer/themes/"");
  await $`log_success "Copied setup-folder theme"`;
  } else {
  await $`log_warning "setup-folder theme not found in source"`;
  }
  await $`}`;
  // Create MCP configuration
  await $`create_mcp_configuration() {`;
  await $`log_info "Creating MCP configuration"`;
  // Create Claude Desktop configuration directory
  await $`CLAUDE_CONFIG_DIR="$TARGET_DIR/config/claude"`;
  await mkdir(""$CLAUDE_CONFIG_DIR"", { recursive: true });
  // Create MCP server configuration
  await $`cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << 'EOF'`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"aidev": {`;
  await $`"command": "node",`;
  await $`"args": ["${AIDEV_PATH}/scripts/mcp-server.js"],`;
  await $`"env": {`;
  await $`"AIDEV_ROOT": "${AIDEV_PATH}"`;
  await $`}`;
  await $`},`;
  await $`"filesystem": {`;
  await $`"command": "bunx",`;
  await $`"args": ["@modelcontextprotocol/server-filesystem", "${AIDEV_PATH}"]`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  // Create MCP agent configuration
  await $`cat > "$TARGET_DIR/config/mcp/mcp-agent.json" << 'EOF'`;
  await $`{`;
  await $`"agents": {`;
  await $`"architect": {`;
  await $`"description": "System architecture and design",`;
  await $`"capabilities": ["design", "architecture", "patterns"],`;
  await $`"tools": ["filesystem", "search", "edit"]`;
  await $`},`;
  await $`"developer": {`;
  await $`"description": "Implementation and coding",`;
  await $`"capabilities": ["coding", "testing", "debugging"],`;
  await $`"tools": ["filesystem", "edit", "bash", "git"]`;
  await $`},`;
  await $`"tester": {`;
  await $`"description": "Testing and quality assurance",`;
  await $`"capabilities": ["testing", "coverage", "e2e"],`;
  await $`"tools": ["filesystem", "bash", "playwright"]`;
  await $`},`;
  await $`"gui": {`;
  await $`"description": "GUI design and implementation",`;
  await $`"capabilities": ["ui", "ux", "design"],`;
  await $`"tools": ["filesystem", "edit", "preview"]`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  await $`log_success "Created MCP configuration"`;
  await $`}`;
  // Create setup script
  await $`create_setup_script() {`;
  await $`log_info "Creating setup.sh script"`;
  await $`cat > "$TARGET_DIR/setup.sh" << 'EOF'`;
  // Setup script for aidev environment
  // This is a wrapper that delegates to the setup-folder theme
  // By default installs locally, use --user-wide for system-wide installation
  await $`set -euo pipefail`;
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`AIDEV_PATH="$SCRIPT_DIR"`;
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}=== Aidev Setup ===${NC}"
  console.log("Using setup-folder theme for configuration");
  // Check if setup-folder theme is available
  if ([ ! -d "$AIDEV_PATH/layer/themes/setup-folder" ]) {; then
  console.log("-e ");${RED}[ERROR]${NC} setup-folder theme not found!"
  console.log("Please ensure the aidev folder was properly installed.");
  process.exit(1);
  }
  // Check if bun is available
  await $`if ! command -v bun &> /dev/null; then`;
  console.log("-e ");${RED}[ERROR]${NC} Bun is required but not found!"
  console.log("Please install bun: curl -fsSL https://bun.sh/install | bash");
  process.exit(1);
  }
  await $`PACKAGE_MANAGER="bun"`;
  console.log("-e ");${GREEN}Using bun as package manager${NC}"
  // Navigate to setup-folder theme
  process.chdir(""$AIDEV_PATH/layer/themes/setup-folder"");
  // Install dependencies if needed
  if ([ ! -d "node_modules" ]) {; then
  console.log("-e ");${BLUE}Installing setup-folder dependencies...${NC}"
  await $`bun install`;
  }
  // Build if necessary
  if ([ ! -d "dist" ]] || [[ ! -f "dist/cli.js" ]) {; then
  console.log("-e ");${BLUE}Building setup-folder theme...${NC}"
  await $`bun run build`;
  }
  // Create a setup configuration file
  await $`cat > "$AIDEV_PATH/setup-config.json" << EOJ`;
  await $`{`;
  await $`"targetDir": "$AIDEV_PATH",`;
  await $`"deployedEnvironment": true,`;
  await $`"mode": "$MODE"`;
  await $`}`;
  await $`EOJ`;
  // Run the setup-folder MCP configuration
  console.log("-e ");${BLUE}Running MCP configuration...${NC}"
  // Execute with bun, passing all arguments
  await $`bun run "$AIDEV_PATH/layer/themes/setup-folder/dist/cli.js" mcp-config \`;
  await $`--target-dir "$AIDEV_PATH" \`;
  await $`--deployed-environment \`;
  await $`"$@"`;
  // Clean up temporary config
  await $`rm -f "$AIDEV_PATH/setup-config.json"`;
  console.log("-e ");${GREEN}Setup complete!${NC}"
  await $`EOF`;
  await $`chmod +x "$TARGET_DIR/setup.sh"`;
  await $`log_success "Created setup.sh script"`;
  await $`}`;
  // Create MCP server script
  await $`create_mcp_server() {`;
  await $`log_info "Creating MCP server script"`;
  await $`cat > "$TARGET_DIR/scripts/mcp-server.js" << 'EOF'`;
  // MCP Server for aidev
  // This server provides tools for Claude to interact with the aidev environment
  await $`const { Server } = require('@modelcontextprotocol/sdk/server/index.js');`;
  await $`const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');`;
  await $`const { readFile, writeFile, readdir } = require('fs').promises;`;
  await $`const path = require('path');`;
  await $`const AIDEV_ROOT = process.env.AIDEV_ROOT || __dirname;`;
  await $`class AidevMcpServer {`;
  await $`constructor() {`;
  await $`this.server = new Server(`;
  await $`{`;
  await $`name: 'aidev-mcp-server',`;
  await $`version: '1.0.0',`;
  await $`},`;
  await $`{`;
  await $`capabilities: {`;
  await $`tools: {},`;
  await $`},`;
  await $`}`;
  await $`);`;
  await $`this.setupHandlers();`;
  await $`}`;
  await $`setupHandlers() {`;
  // List available tools
  await $`this.server.setRequestHandler('tools/list', async () => ({`;
  await $`tools: [`;
  await $`{`;
  await $`name: 'read_task_queue',`;
  await $`description: 'Read the current task queue',`;
  await $`inputSchema: {`;
  await $`type: 'object',`;
  await $`properties: {},`;
  await $`},`;
  await $`},`;
  await $`{`;
  await $`name: 'read_feature_backlog',`;
  await $`description: 'Read the feature backlog',`;
  await $`inputSchema: {`;
  await $`type: 'object',`;
  await $`properties: {},`;
  await $`},`;
  await $`},`;
  await $`{`;
  await $`name: 'read_llm_rule',`;
  await $`description: 'Read a specific LLM rule',`;
  await $`inputSchema: {`;
  await $`type: 'object',`;
  await $`properties: {`;
  await $`ruleName: {`;
  await $`type: 'string',`;
  await $`description: 'Name of the rule file (without .md extension)',`;
  await $`},`;
  await $`},`;
  await $`required: ['ruleName'],`;
  await $`},`;
  await $`},`;
  await $`{`;
  await $`name: 'list_llm_rules',`;
  await $`description: 'List all available LLM rules',`;
  await $`inputSchema: {`;
  await $`type: 'object',`;
  await $`properties: {},`;
  await $`},`;
  await $`},`;
  await $`],`;
  await $`}));`;
  // Handle tool calls
  await $`this.server.setRequestHandler('tools/call', async (request) => {`;
  await $`const { name, arguments: args } = request.params;`;
  await $`switch (name) {`;
  await $`case 'read_task_queue':`;
  await $`return await this.readTaskQueue();`;
  await $`case 'read_feature_backlog':`;
  await $`return await this.readFeatureBacklog();`;
  await $`case 'read_llm_rule':`;
  await $`return await this.readLlmRule(args.ruleName);`;
  await $`case 'list_llm_rules':`;
  await $`return await this.listLlmRules();`;
  await $`default:`;
  await $`throw new Error(`Unknown tool: ${name}`);`;
  await $`}`;
  await $`});`;
  await $`}`;
  await $`async readTaskQueue() {`;
  await $`try {`;
  await $`const content = await readFile(`;
  await $`path.join(AIDEV_ROOT, 'TASK_QUEUE.vf.json'),`;
  await $`'utf-8'`;
  await $`);`;
  await $`return {`;
  await $`content: [`;
  await $`{`;
  await $`type: 'text',`;
  await $`text: content,`;
  await $`},`;
  await $`],`;
  await $`};`;
  await $`} catch (error) {`;
  await $`return {`;
  await $`content: [`;
  await $`{`;
  await $`type: 'text',`;
  await $`text: `Error reading task queue: ${error.message}`,`;
  await $`},`;
  await $`],`;
  await $`};`;
  await $`}`;
  await $`}`;
  await $`async readFeatureBacklog() {`;
  await $`try {`;
  await $`const content = await readFile(`;
  await $`path.join(AIDEV_ROOT, 'FEATURE.vf.json'),`;
  await $`'utf-8'`;
  await $`);`;
  await $`return {`;
  await $`content: [`;
  await $`{`;
  await $`type: 'text',`;
  await $`text: content,`;
  await $`},`;
  await $`],`;
  await $`};`;
  await $`} catch (error) {`;
  await $`return {`;
  await $`content: [`;
  await $`{`;
  await $`type: 'text',`;
  await $`text: `Error reading feature backlog: ${error.message}`,`;
  await $`},`;
  await $`],`;
  await $`};`;
  await $`}`;
  await $`}`;
  await $`async readLlmRule(ruleName) {`;
  await $`try {`;
  await $`const content = await readFile(`;
  await $`path.join(AIDEV_ROOT, 'llm_rules', `${ruleName}.md`),`;
  await $`'utf-8'`;
  await $`);`;
  await $`return {`;
  await $`content: [`;
  await $`{`;
  await $`type: 'text',`;
  await $`text: content,`;
  await $`},`;
  await $`],`;
  await $`};`;
  await $`} catch (error) {`;
  await $`return {`;
  await $`content: [`;
  await $`{`;
  await $`type: 'text',`;
  await $`text: `Error reading LLM rule: ${error.message}`,`;
  await $`},`;
  await $`],`;
  await $`};`;
  await $`}`;
  await $`}`;
  await $`async listLlmRules() {`;
  await $`try {`;
  await $`const files = await readdir(path.join(AIDEV_ROOT, 'llm_rules'));`;
  await $`const rules = files`;
  await $`.filter((file) => file.endsWith('.md'))`;
  await $`.map((file) => file.replace('.md', ''));`;
  await $`return {`;
  await $`content: [`;
  await $`{`;
  await $`type: 'text',`;
  await $`text: `Available LLM rules:\n${rules.join('\n')}`,`;
  await $`},`;
  await $`],`;
  await $`};`;
  await $`} catch (error) {`;
  await $`return {`;
  await $`content: [`;
  await $`{`;
  await $`type: 'text',`;
  await $`text: `Error listing LLM rules: ${error.message}`,`;
  await $`},`;
  await $`],`;
  await $`};`;
  await $`}`;
  await $`}`;
  await $`async run() {`;
  await $`const transport = new StdioServerTransport();`;
  await $`await this.server.connect(transport);`;
  await $`console.error('Aidev MCP server running');`;
  await $`}`;
  await $`}`;
  await $`const server = new AidevMcpServer();`;
  await $`server.run().catch(console.error);`;
  await $`EOF`;
  await $`chmod +x "$TARGET_DIR/scripts/mcp-server.js"`;
  await $`log_success "Created MCP server script"`;
  await $`}`;
  // Create package.json for MCP server
  await $`create_package_json() {`;
  await $`log_info "Creating package.json for MCP server"`;
  await $`cat > "$TARGET_DIR/scripts/package.json" << 'EOF'`;
  await $`{`;
  await $`"name": "aidev-mcp-server",`;
  await $`"version": "1.0.0",`;
  await $`"description": "MCP server for aidev environment",`;
  await $`"main": "mcp-server.js",`;
  await $`"scripts": {`;
  await $`"start": "node mcp-server.js"`;
  await $`},`;
  await $`"dependencies": {`;
  await $`"@modelcontextprotocol/sdk": "^0.5.0"`;
  await $`},`;
  await $`"engines": {`;
  await $`"node": ">=18.0.0"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  await $`log_success "Created package.json"`;
  await $`}`;
  // Install dependencies if in release mode
  await $`install_dependencies() {`;
  if ([ "$MODE" == "release" ]) {; then
  await $`log_info "Installing MCP server dependencies"`;
  process.chdir(""$TARGET_DIR/scripts"");
  await $`if command -v bun &> /dev/null; then`;
  await $`bun install`;
  await $`log_success "Dependencies installed with bun"`;
  } else {
  await $`log_warning "Bun not found, skipping dependency installation"`;
  }
  process.chdir("- > /dev/null");
  }
  await $`}`;
  // Main execution
  await $`main() {`;
  console.log("-e ");${BLUE}=== Aidev Folder Setup ===${NC}"
  console.log("Target directory: $TARGET_DIR");
  console.log("Mode: $MODE");
  await $`echo`;
  await $`check_target_directory`;
  await $`create_directory_structure`;
  await $`copy_essential_files`;
  await $`create_mcp_configuration`;
  await $`create_setup_script`;
  await $`create_mcp_server`;
  await $`create_package_json`;
  await $`install_dependencies`;
  await $`echo`;
  console.log("-e ");${GREEN}=== Setup Complete ===${NC}"
  console.log("-e ");${GREEN}✅ Aidev environment created at: $TARGET_DIR${NC}"
  await $`echo`;
  console.log("Next steps:");
  console.log("1. cd $TARGET_DIR");
  console.log("2. ./setup.sh");
  console.log("3. Restart Claude Desktop");
  await $`echo`;
  if ([ "$MODE" == "demo" ]) {; then
  console.log("This is a DEMO setup - perfect for testing and evaluation");
  } else {
  console.log("This is a RELEASE setup - ready for production deployment");
  }
  await $`}`;
  // Run main function
  await $`main`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}