#!/bin/bash

# Migrate all projects to use vf.json format exclusively

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Migrating all projects to VF format${NC}"
echo "============================================="

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Function to create TASK_QUEUE.vf.json if missing
create_task_queue_vf() {
    local dir="$1"
    if [ ! -f "$dir/TASK_QUEUE.vf.json" ]; then
        echo -e "${BLUE}Creating TASK_QUEUE.vf.json in $dir${NC}"
        cat > "$dir/TASK_QUEUE.vf.json" << 'EOF'
{
  "workingItem": null,
  "queues": {
    "high": [],
    "medium": [],
    "low": []
  },
  "metadata": {
    "processedCount": 0,
    "failedCount": 0,
    "lastUpdated": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
  }
}
EOF
    fi
}

# Function to create FEATURE.vf.json if missing
create_feature_vf() {
    local dir="$1"
    local name="$2"
    local type="$3"
    
    if [ ! -f "$dir/FEATURE.vf.json" ]; then
        echo -e "${BLUE}Creating FEATURE.vf.json in $dir${NC}"
        cat > "$dir/FEATURE.vf.json" << EOF
{
  "project": {
    "name": "$name",
    "description": "$name $type project",
    "type": "$type"
  },
  "features": {},
  "metadata": {
    "created": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
    "version": "1.0.0"
  }
}
EOF
    fi
}

# Function to create FILE_STRUCTURE.vf.json if missing
create_file_structure_vf() {
    local dir="$1"
    if [ ! -f "$dir/FILE_STRUCTURE.vf.json" ]; then
        echo -e "${BLUE}Creating FILE_STRUCTURE.vf.json in $dir${NC}"
        cat > "$dir/FILE_STRUCTURE.vf.json" << 'EOF'
{
  "structure": {
    ".": {
      "type": "directory",
      "description": "Project root",
      "children": {
        "src": {
          "type": "directory",
          "description": "Source code"
        },
        "test": {
          "type": "directory",
          "description": "Test files"
        },
        "config": {
          "type": "directory",
          "description": "Configuration files"
        }
      }
    }
  }
}
EOF
    fi
}

# Function to create NAME_ID.vf.json if missing
create_name_id_vf() {
    local dir="$1"
    if [ ! -f "$dir/NAME_ID.vf.json" ]; then
        echo -e "${BLUE}Creating NAME_ID.vf.json in $dir${NC}"
        cat > "$dir/NAME_ID.vf.json" << 'EOF'
{}
EOF
    fi
}

# Update root directory
echo -e "${YELLOW}Updating root directory...${NC}"
cd "$PROJECT_ROOT"

# Root already has vf.json files, just ensure they're complete
create_task_queue_vf "$PROJECT_ROOT"
create_feature_vf "$PROJECT_ROOT" "aidev" "platform"
create_file_structure_vf "$PROJECT_ROOT"
create_name_id_vf "$PROJECT_ROOT"

# Update each demo folder
echo -e "${YELLOW}Updating demo folders...${NC}"
for DEMO_DIR in "$PROJECT_ROOT"/demo/*/; do
    if [ -d "$DEMO_DIR" ]; then
        DEMO_NAME=$(basename "$DEMO_DIR")
        echo -e "${YELLOW}Processing demo: $DEMO_NAME${NC}"
        
        create_task_queue_vf "$DEMO_DIR"
        create_feature_vf "$DEMO_DIR" "$DEMO_NAME" "demo"
        create_file_structure_vf "$DEMO_DIR"
        create_name_id_vf "$DEMO_DIR"
        
        # Remove old .md files if vf.json exists
        if [ -f "$DEMO_DIR/TASK_QUEUE.vf.json" ] && [ -f "$DEMO_DIR/TASK_QUEUE.md" ]; then
            echo -e "${RED}Removing old TASK_QUEUE.md${NC}"
            rm "$DEMO_DIR/TASK_QUEUE.md"
        fi
        
        if [ -f "$DEMO_DIR/FEATURE.vf.json" ] && [ -f "$DEMO_DIR/FEATURE.md" ]; then
            echo -e "${RED}Removing old FEATURE.md${NC}"
            rm "$DEMO_DIR/FEATURE.md"
        fi
        
        echo -e "${GREEN}✅ Updated $DEMO_NAME to VF format${NC}"
    fi
done

# Update release folders
echo -e "${YELLOW}Updating release folders...${NC}"
if [ -d "$PROJECT_ROOT/release" ]; then
    for RELEASE_DIR in "$PROJECT_ROOT"/release/*/; do
        if [ -d "$RELEASE_DIR" ]; then
            RELEASE_NAME=$(basename "$RELEASE_DIR")
            echo -e "${YELLOW}Processing release: $RELEASE_NAME${NC}"
            
            create_task_queue_vf "$RELEASE_DIR"
            create_feature_vf "$RELEASE_DIR" "$RELEASE_NAME" "release"
            create_file_structure_vf "$RELEASE_DIR"
            create_name_id_vf "$RELEASE_DIR"
            
            # Create MCP config if missing
            if [ ! -f "$RELEASE_DIR/claude_config.json" ]; then
                MCP_SERVER_PATH=$(realpath --relative-to="$RELEASE_DIR" "$PROJECT_ROOT/layer/themes/filesystem_mcp/mcp-server.js")
                cat > "$RELEASE_DIR/claude_config.json" << EOF
{
  "mcpServers": {
    "filesystem_mcp": {
      "command": "node",
      "args": ["$MCP_SERVER_PATH"],
      "env": {
        "NODE_ENV": "release",
        "VF_BASE_PATH": "."
      }
    }
  },
  "globalShortcuts": {
    "vf_read": "filesystem_mcp",
    "vf_write": "filesystem_mcp",
    "vf_list_features": "filesystem_mcp",
    "vf_get_tasks": "filesystem_mcp",
    "vf_pop_task": "filesystem_mcp",
    "vf_complete_task": "filesystem_mcp",
    "vf_push_task": "filesystem_mcp",
    "vf_get_name_id": "filesystem_mcp",
    "vf_set_name_id": "filesystem_mcp"
  }
}
EOF
            fi
            
            echo -e "${GREEN}✅ Updated $RELEASE_NAME to VF format${NC}"
        fi
    done
fi

# Special handling for demo/vllm-coordinator-agent_chat-room
SPECIAL_DEMO="$PROJECT_ROOT/demo/vllm-coordinator-agent_chat-room"
if [ -d "$SPECIAL_DEMO" ]; then
    echo -e "${YELLOW}Special handling for vllm-coordinator-agent_chat-room${NC}"
    create_task_queue_vf "$SPECIAL_DEMO"
    create_feature_vf "$SPECIAL_DEMO" "vllm-coordinator-agent_chat-room" "demo"
    create_file_structure_vf "$SPECIAL_DEMO"
    create_name_id_vf "$SPECIAL_DEMO"
    
    if [ -f "$SPECIAL_DEMO/FEATURE.md" ]; then
        rm "$SPECIAL_DEMO/FEATURE.md"
    fi
fi

echo -e "${GREEN}✅ Migration to VF format complete!${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo "- All projects now have .vf.json files"
echo "- Old .md files removed where .vf.json exists"
echo "- MCP configurations added to all folders"
echo ""
echo -e "${BLUE}Note: Root directory maintains both formats for compatibility${NC}"