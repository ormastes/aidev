#!/usr/bin/env python3
"""
Migrated from: migrate-to-vf.sh
Auto-generated Python - 2025-08-16T04:57:27.709Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Migrate all projects to use vf.json format exclusively
    subprocess.run("set -e", shell=True)
    # Colors for output
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    print("-e ")${YELLOW}Migrating all projects to VF format${NC}"
    print("=============================================")
    # Get the script directory
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"", shell=True)
    # Function to create TASK_QUEUE.vf.json if missing
    subprocess.run("create_task_queue_vf() {", shell=True)
    subprocess.run("local dir="$1"", shell=True)
    if ! -f "$dir/TASK_QUEUE.vf.json" :; then
    print("-e ")${BLUE}Creating TASK_QUEUE.vf.json in $dir${NC}"
    subprocess.run("cat > "$dir/TASK_QUEUE.vf.json" << 'EOF'", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""workingItem": null,", shell=True)
    subprocess.run(""queues": {", shell=True)
    subprocess.run(""high": [],", shell=True)
    subprocess.run(""medium": [],", shell=True)
    subprocess.run(""low": []", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""metadata": {", shell=True)
    subprocess.run(""processedCount": 0,", shell=True)
    subprocess.run(""failedCount": 0,", shell=True)
    subprocess.run(""lastUpdated": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("}", shell=True)
    # Function to create FEATURE.vf.json if missing
    subprocess.run("create_feature_vf() {", shell=True)
    subprocess.run("local dir="$1"", shell=True)
    subprocess.run("local name="$2"", shell=True)
    subprocess.run("local type="$3"", shell=True)
    if ! -f "$dir/FEATURE.vf.json" :; then
    print("-e ")${BLUE}Creating FEATURE.vf.json in $dir${NC}"
    subprocess.run("cat > "$dir/FEATURE.vf.json" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""project": {", shell=True)
    subprocess.run(""name": "$name",", shell=True)
    subprocess.run(""description": "$name $type project",", shell=True)
    subprocess.run(""type": "$type"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""features": {},", shell=True)
    subprocess.run(""metadata": {", shell=True)
    subprocess.run(""created": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",", shell=True)
    subprocess.run(""version": "1.0.0"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("}", shell=True)
    # Function to create FILE_STRUCTURE.vf.json if missing
    subprocess.run("create_file_structure_vf() {", shell=True)
    subprocess.run("local dir="$1"", shell=True)
    if ! -f "$dir/FILE_STRUCTURE.vf.json" :; then
    print("-e ")${BLUE}Creating FILE_STRUCTURE.vf.json in $dir${NC}"
    subprocess.run("cat > "$dir/FILE_STRUCTURE.vf.json" << 'EOF'", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""structure": {", shell=True)
    subprocess.run("".": {", shell=True)
    subprocess.run(""type": "directory",", shell=True)
    subprocess.run(""description": "Project root",", shell=True)
    subprocess.run(""children": {", shell=True)
    subprocess.run(""src": {", shell=True)
    subprocess.run(""type": "directory",", shell=True)
    subprocess.run(""description": "Source code"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""test": {", shell=True)
    subprocess.run(""type": "directory",", shell=True)
    subprocess.run(""description": "Test files"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""config": {", shell=True)
    subprocess.run(""type": "directory",", shell=True)
    subprocess.run(""description": "Configuration files"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("}", shell=True)
    # Function to create NAME_ID.vf.json if missing
    subprocess.run("create_name_id_vf() {", shell=True)
    subprocess.run("local dir="$1"", shell=True)
    if ! -f "$dir/NAME_ID.vf.json" :; then
    print("-e ")${BLUE}Creating NAME_ID.vf.json in $dir${NC}"
    subprocess.run("cat > "$dir/NAME_ID.vf.json" << 'EOF'", shell=True)
    subprocess.run("{}", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("}", shell=True)
    # Update root directory
    print("-e ")${YELLOW}Updating root directory...${NC}"
    os.chdir(""$PROJECT_ROOT"")
    # Root already has vf.json files, just ensure they're complete
    subprocess.run("create_task_queue_vf "$PROJECT_ROOT"", shell=True)
    subprocess.run("create_feature_vf "$PROJECT_ROOT" "aidev" "platform"", shell=True)
    subprocess.run("create_file_structure_vf "$PROJECT_ROOT"", shell=True)
    subprocess.run("create_name_id_vf "$PROJECT_ROOT"", shell=True)
    # Update each demo folder
    print("-e ")${YELLOW}Updating demo folders...${NC}"
    for DEMO_DIR in ["$PROJECT_ROOT"/demo/*/; do]:
    if -d "$DEMO_DIR" :; then
    subprocess.run("DEMO_NAME=$(basename "$DEMO_DIR")", shell=True)
    print("-e ")${YELLOW}Processing demo: $DEMO_NAME${NC}"
    subprocess.run("create_task_queue_vf "$DEMO_DIR"", shell=True)
    subprocess.run("create_feature_vf "$DEMO_DIR" "$DEMO_NAME" "demo"", shell=True)
    subprocess.run("create_file_structure_vf "$DEMO_DIR"", shell=True)
    subprocess.run("create_name_id_vf "$DEMO_DIR"", shell=True)
    # Remove old .md files if vf.json exists
    if -f "$DEMO_DIR/TASK_QUEUE.vf.json" ] && [ -f "$DEMO_DIR/TASK_QUEUE.md" :; then
    print("-e ")${RED}Removing old TASK_QUEUE.md${NC}"
    subprocess.run("rm "$DEMO_DIR/TASK_QUEUE.md"", shell=True)
    if -f "$DEMO_DIR/FEATURE.vf.json" ] && [ -f "$DEMO_DIR/FEATURE.md" :; then
    print("-e ")${RED}Removing old FEATURE.md${NC}"
    subprocess.run("rm "$DEMO_DIR/FEATURE.md"", shell=True)
    print("-e ")${GREEN}✅ Updated $DEMO_NAME to VF format${NC}"
    # Update release folders
    print("-e ")${YELLOW}Updating release folders...${NC}"
    if -d "$PROJECT_ROOT/release" :; then
    for RELEASE_DIR in ["$PROJECT_ROOT"/release/*/; do]:
    if -d "$RELEASE_DIR" :; then
    subprocess.run("RELEASE_NAME=$(basename "$RELEASE_DIR")", shell=True)
    print("-e ")${YELLOW}Processing release: $RELEASE_NAME${NC}"
    subprocess.run("create_task_queue_vf "$RELEASE_DIR"", shell=True)
    subprocess.run("create_feature_vf "$RELEASE_DIR" "$RELEASE_NAME" "release"", shell=True)
    subprocess.run("create_file_structure_vf "$RELEASE_DIR"", shell=True)
    subprocess.run("create_name_id_vf "$RELEASE_DIR"", shell=True)
    # Create MCP config if missing
    if ! -f "$RELEASE_DIR/claude_config.json" :; then
    subprocess.run("MCP_SERVER_PATH=$(realpath --relative-to="$RELEASE_DIR" "$PROJECT_ROOT/layer/themes/filesystem_mcp/mcp-server.js")", shell=True)
    subprocess.run("cat > "$RELEASE_DIR/claude_config.json" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""mcpServers": {", shell=True)
    subprocess.run(""filesystem_mcp": {", shell=True)
    subprocess.run(""command": "node",", shell=True)
    subprocess.run(""args": ["$MCP_SERVER_PATH"],", shell=True)
    subprocess.run(""env": {", shell=True)
    subprocess.run(""NODE_ENV": "release",", shell=True)
    subprocess.run(""VF_BASE_PATH": "."", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""globalShortcuts": {", shell=True)
    subprocess.run(""vf_read": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_write": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_list_features": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_get_tasks": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_pop_task": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_complete_task": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_push_task": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_get_name_id": "filesystem_mcp",", shell=True)
    subprocess.run(""vf_set_name_id": "filesystem_mcp"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✅ Updated $RELEASE_NAME to VF format${NC}"
    # Special handling for demo/vllm-coordinator-agent_chat-room
    subprocess.run("SPECIAL_DEMO="$PROJECT_ROOT/demo/vllm-coordinator-agent_chat-room"", shell=True)
    if -d "$SPECIAL_DEMO" :; then
    print("-e ")${YELLOW}Special handling for vllm-coordinator-agent_chat-room${NC}"
    subprocess.run("create_task_queue_vf "$SPECIAL_DEMO"", shell=True)
    subprocess.run("create_feature_vf "$SPECIAL_DEMO" "vllm-coordinator-agent_chat-room" "demo"", shell=True)
    subprocess.run("create_file_structure_vf "$SPECIAL_DEMO"", shell=True)
    subprocess.run("create_name_id_vf "$SPECIAL_DEMO"", shell=True)
    if -f "$SPECIAL_DEMO/FEATURE.md" :; then
    subprocess.run("rm "$SPECIAL_DEMO/FEATURE.md"", shell=True)
    print("-e ")${GREEN}✅ Migration to VF format complete!${NC}"
    print("")
    print("-e ")${YELLOW}Summary:${NC}"
    print("- All projects now have .vf.json files")
    print("- Old .md files removed where .vf.json exists")
    print("- MCP configurations added to all folders")
    print("")
    print("-e ")${BLUE}Note: Root directory maintains both formats for compatibility${NC}"

if __name__ == "__main__":
    main()