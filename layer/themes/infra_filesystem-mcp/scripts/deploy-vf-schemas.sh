#!/bin/bash

# VF Schema Deployment Script
# Deploys .vf.json schema files from the filesystem-mcp theme to project environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
THEME_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMA_DIR="$THEME_DIR/schemas"
TEMPLATE_DIR="$SCHEMA_DIR/templates"

# Default target is project root
TARGET_DIR="${1:-$(cd "$THEME_DIR/../../.." && pwd)}"

echo "╔════════════════════════════════════════════════╗"
echo "║       VF Schema Files Deployment Tool          ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}📁 Schema source: $SCHEMA_DIR${NC}"
echo -e "${BLUE}📁 Template source: $TEMPLATE_DIR${NC}"
echo -e "${BLUE}📁 Target directory: $TARGET_DIR${NC}"
echo ""

# Function to deploy a schema file
deploy_schema() {
    local filename="$1"
    local force="${2:-false}"
    local source_file=""
    
    # Check template directory first, then schema directory
    if [ -f "$TEMPLATE_DIR/$filename" ]; then
        source_file="$TEMPLATE_DIR/$filename"
        echo -e "  Using template: $filename"
    elif [ -f "$SCHEMA_DIR/$filename" ]; then
        source_file="$SCHEMA_DIR/$filename"
        echo -e "  Using schema: $filename"
    else
        echo -e "${YELLOW}  ⚠️  $filename not found in schema or template directories${NC}"
        return 1
    fi
    
    local target_file="$TARGET_DIR/$filename"
    
    if [ -f "$target_file" ] && [ "$force" != "true" ]; then
        echo -e "${YELLOW}  ⚠️  $filename already exists in target directory${NC}"
        read -p "      Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "      Skipping $filename"
            return 0
        fi
    fi
    
    cp "$source_file" "$target_file"
    echo -e "${GREEN}  ✅ Deployed $filename${NC}"
    return 0
}

# Function to initialize environment with all schema files
init_environment() {
    echo "🚀 Initializing environment with VF schema files..."
    echo ""
    
    local vf_files=(
        "TASK_QUEUE.vf.json"
        "FEATURE.vf.json"
        "FILE_STRUCTURE.vf.json"
        "NAME_ID.vf.json"
    )
    
    for file in "${vf_files[@]}"; do
        deploy_schema "$file"
    done
}

# Function to update schemas in target
update_schemas() {
    echo "🔄 Updating VF schema files..."
    echo ""
    
    # Find all vf.json files in schema directory
    while IFS= read -r -d '' schema_file; do
        local filename=$(basename "$schema_file")
        # Skip template files
        if [[ "$schema_file" != *"/templates/"* ]]; then
            deploy_schema "$filename"
        fi
    done < <(find "$SCHEMA_DIR" -maxdepth 1 -name "*.vf.json" -type f -print0)
}

# Function to list available schemas
list_schemas() {
    echo "📋 Available VF Schema Files:"
    echo ""
    
    echo "Main Schemas:"
    for file in "$SCHEMA_DIR"/*.vf.json; do
        if [ -f "$file" ]; then
            echo "  • $(basename "$file")"
        fi
    done
    
    echo ""
    echo "Templates:"
    for file in "$TEMPLATE_DIR"/*.template; do
        if [ -f "$file" ]; then
            echo "  • $(basename "$file")"
        fi
    done
}

# Function to validate deployed schemas
validate_deployment() {
    echo "🔍 Validating deployed schemas..."
    echo ""
    
    local all_valid=true
    local vf_files=(
        "TASK_QUEUE.vf.json"
        "FEATURE.vf.json"
        "FILE_STRUCTURE.vf.json"
        "NAME_ID.vf.json"
    )
    
    for file in "${vf_files[@]}"; do
        if [ -f "$TARGET_DIR/$file" ]; then
            # Check if it's valid JSON
            if jq empty "$TARGET_DIR/$file" 2>/dev/null; then
                echo -e "${GREEN}  ✅ $file is valid JSON${NC}"
            else
                echo -e "${RED}  ❌ $file has invalid JSON${NC}"
                all_valid=false
            fi
        else
            echo -e "${YELLOW}  ⚠️  $file not deployed${NC}"
        fi
    done
    
    if [ "$all_valid" = true ]; then
        echo ""
        echo -e "${GREEN}✅ All deployed schemas are valid${NC}"
    else
        echo ""
        echo -e "${RED}❌ Some schemas have issues${NC}"
        return 1
    fi
}

# Parse command line arguments
case "${1:-init}" in
    init)
        init_environment
        ;;
    update)
        update_schemas
        ;;
    list)
        list_schemas
        ;;
    validate)
        validate_deployment
        ;;
    deploy)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please specify a file to deploy${NC}"
            echo "Usage: $0 deploy <filename>"
            exit 1
        fi
        deploy_schema "$2" "${3:-false}"
        ;;
    help)
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  init      - Initialize environment with all VF schema files (default)"
        echo "  update    - Update existing schemas from templates"
        echo "  list      - List available schema files and templates"
        echo "  validate  - Validate deployed schemas"
        echo "  deploy    - Deploy a specific schema file"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 init                    # Initialize with all schemas"
        echo "  $0 deploy TASK_QUEUE.vf.json  # Deploy specific file"
        echo "  $0 validate                # Check deployed schemas"
        ;;
    *)
        # If first argument is a directory path, use it as target
        if [ -d "$1" ]; then
            TARGET_DIR="$1"
            init_environment
        else
            echo -e "${RED}Error: Unknown command '$1'${NC}"
            echo "Use '$0 help' for usage information"
            exit 1
        fi
        ;;
esac

echo ""
echo "════════════════════════════════════════════════"
echo "Deployment complete!"
echo "Schema files are managed in: $SCHEMA_DIR"
echo "Templates are stored in: $TEMPLATE_DIR"