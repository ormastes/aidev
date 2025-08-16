#!/usr/bin/env bun
/**
 * Migrated from: migrate-to-vf.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.709Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Migrate all projects to use vf.json format exclusively
  await $`set -e`;
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  console.log("-e ");${YELLOW}Migrating all projects to VF format${NC}"
  console.log("=============================================");
  // Get the script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"`;
  // Function to create TASK_QUEUE.vf.json if missing
  await $`create_task_queue_vf() {`;
  await $`local dir="$1"`;
  if (! -f "$dir/TASK_QUEUE.vf.json" ) {; then
  console.log("-e ");${BLUE}Creating TASK_QUEUE.vf.json in $dir${NC}"
  await $`cat > "$dir/TASK_QUEUE.vf.json" << 'EOF'`;
  await $`{`;
  await $`"workingItem": null,`;
  await $`"queues": {`;
  await $`"high": [],`;
  await $`"medium": [],`;
  await $`"low": []`;
  await $`},`;
  await $`"metadata": {`;
  await $`"processedCount": 0,`;
  await $`"failedCount": 0,`;
  await $`"lastUpdated": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  }
  await $`}`;
  // Function to create FEATURE.vf.json if missing
  await $`create_feature_vf() {`;
  await $`local dir="$1"`;
  await $`local name="$2"`;
  await $`local type="$3"`;
  if (! -f "$dir/FEATURE.vf.json" ) {; then
  console.log("-e ");${BLUE}Creating FEATURE.vf.json in $dir${NC}"
  await $`cat > "$dir/FEATURE.vf.json" << EOF`;
  await $`{`;
  await $`"project": {`;
  await $`"name": "$name",`;
  await $`"description": "$name $type project",`;
  await $`"type": "$type"`;
  await $`},`;
  await $`"features": {},`;
  await $`"metadata": {`;
  await $`"created": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",`;
  await $`"version": "1.0.0"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  }
  await $`}`;
  // Function to create FILE_STRUCTURE.vf.json if missing
  await $`create_file_structure_vf() {`;
  await $`local dir="$1"`;
  if (! -f "$dir/FILE_STRUCTURE.vf.json" ) {; then
  console.log("-e ");${BLUE}Creating FILE_STRUCTURE.vf.json in $dir${NC}"
  await $`cat > "$dir/FILE_STRUCTURE.vf.json" << 'EOF'`;
  await $`{`;
  await $`"structure": {`;
  await $`".": {`;
  await $`"type": "directory",`;
  await $`"description": "Project root",`;
  await $`"children": {`;
  await $`"src": {`;
  await $`"type": "directory",`;
  await $`"description": "Source code"`;
  await $`},`;
  await $`"test": {`;
  await $`"type": "directory",`;
  await $`"description": "Test files"`;
  await $`},`;
  await $`"config": {`;
  await $`"type": "directory",`;
  await $`"description": "Configuration files"`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  }
  await $`}`;
  // Function to create NAME_ID.vf.json if missing
  await $`create_name_id_vf() {`;
  await $`local dir="$1"`;
  if (! -f "$dir/NAME_ID.vf.json" ) {; then
  console.log("-e ");${BLUE}Creating NAME_ID.vf.json in $dir${NC}"
  await $`cat > "$dir/NAME_ID.vf.json" << 'EOF'`;
  await $`{}`;
  await $`EOF`;
  }
  await $`}`;
  // Update root directory
  console.log("-e ");${YELLOW}Updating root directory...${NC}"
  process.chdir(""$PROJECT_ROOT"");
  // Root already has vf.json files, just ensure they're complete
  await $`create_task_queue_vf "$PROJECT_ROOT"`;
  await $`create_feature_vf "$PROJECT_ROOT" "aidev" "platform"`;
  await $`create_file_structure_vf "$PROJECT_ROOT"`;
  await $`create_name_id_vf "$PROJECT_ROOT"`;
  // Update each demo folder
  console.log("-e ");${YELLOW}Updating demo folders...${NC}"
  for (const DEMO_DIR of ["$PROJECT_ROOT"/demo/*/; do]) {
  if (-d "$DEMO_DIR" ) {; then
  await $`DEMO_NAME=$(basename "$DEMO_DIR")`;
  console.log("-e ");${YELLOW}Processing demo: $DEMO_NAME${NC}"
  await $`create_task_queue_vf "$DEMO_DIR"`;
  await $`create_feature_vf "$DEMO_DIR" "$DEMO_NAME" "demo"`;
  await $`create_file_structure_vf "$DEMO_DIR"`;
  await $`create_name_id_vf "$DEMO_DIR"`;
  // Remove old .md files if vf.json exists
  if (-f "$DEMO_DIR/TASK_QUEUE.vf.json" ] && [ -f "$DEMO_DIR/TASK_QUEUE.md" ) {; then
  console.log("-e ");${RED}Removing old TASK_QUEUE.md${NC}"
  await $`rm "$DEMO_DIR/TASK_QUEUE.md"`;
  }
  if (-f "$DEMO_DIR/FEATURE.vf.json" ] && [ -f "$DEMO_DIR/FEATURE.md" ) {; then
  console.log("-e ");${RED}Removing old FEATURE.md${NC}"
  await $`rm "$DEMO_DIR/FEATURE.md"`;
  }
  console.log("-e ");${GREEN}✅ Updated $DEMO_NAME to VF format${NC}"
  }
  }
  // Update release folders
  console.log("-e ");${YELLOW}Updating release folders...${NC}"
  if (-d "$PROJECT_ROOT/release" ) {; then
  for (const RELEASE_DIR of ["$PROJECT_ROOT"/release/*/; do]) {
  if (-d "$RELEASE_DIR" ) {; then
  await $`RELEASE_NAME=$(basename "$RELEASE_DIR")`;
  console.log("-e ");${YELLOW}Processing release: $RELEASE_NAME${NC}"
  await $`create_task_queue_vf "$RELEASE_DIR"`;
  await $`create_feature_vf "$RELEASE_DIR" "$RELEASE_NAME" "release"`;
  await $`create_file_structure_vf "$RELEASE_DIR"`;
  await $`create_name_id_vf "$RELEASE_DIR"`;
  // Create MCP config if missing
  if (! -f "$RELEASE_DIR/claude_config.json" ) {; then
  await $`MCP_SERVER_PATH=$(realpath --relative-to="$RELEASE_DIR" "$PROJECT_ROOT/layer/themes/filesystem_mcp/mcp-server.js")`;
  await $`cat > "$RELEASE_DIR/claude_config.json" << EOF`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"filesystem_mcp": {`;
  await $`"command": "node",`;
  await $`"args": ["$MCP_SERVER_PATH"],`;
  await $`"env": {`;
  await $`"NODE_ENV": "release",`;
  await $`"VF_BASE_PATH": "."`;
  await $`}`;
  await $`}`;
  await $`},`;
  await $`"globalShortcuts": {`;
  await $`"vf_read": "filesystem_mcp",`;
  await $`"vf_write": "filesystem_mcp",`;
  await $`"vf_list_features": "filesystem_mcp",`;
  await $`"vf_get_tasks": "filesystem_mcp",`;
  await $`"vf_pop_task": "filesystem_mcp",`;
  await $`"vf_complete_task": "filesystem_mcp",`;
  await $`"vf_push_task": "filesystem_mcp",`;
  await $`"vf_get_name_id": "filesystem_mcp",`;
  await $`"vf_set_name_id": "filesystem_mcp"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  }
  console.log("-e ");${GREEN}✅ Updated $RELEASE_NAME to VF format${NC}"
  }
  }
  }
  // Special handling for demo/vllm-coordinator-agent_chat-room
  await $`SPECIAL_DEMO="$PROJECT_ROOT/demo/vllm-coordinator-agent_chat-room"`;
  if (-d "$SPECIAL_DEMO" ) {; then
  console.log("-e ");${YELLOW}Special handling for vllm-coordinator-agent_chat-room${NC}"
  await $`create_task_queue_vf "$SPECIAL_DEMO"`;
  await $`create_feature_vf "$SPECIAL_DEMO" "vllm-coordinator-agent_chat-room" "demo"`;
  await $`create_file_structure_vf "$SPECIAL_DEMO"`;
  await $`create_name_id_vf "$SPECIAL_DEMO"`;
  if (-f "$SPECIAL_DEMO/FEATURE.md" ) {; then
  await $`rm "$SPECIAL_DEMO/FEATURE.md"`;
  }
  }
  console.log("-e ");${GREEN}✅ Migration to VF format complete!${NC}"
  console.log("");
  console.log("-e ");${YELLOW}Summary:${NC}"
  console.log("- All projects now have .vf.json files");
  console.log("- Old .md files removed where .vf.json exists");
  console.log("- MCP configurations added to all folders");
  console.log("");
  console.log("-e ");${BLUE}Note: Root directory maintains both formats for compatibility${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}