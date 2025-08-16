#!/bin/bash

# Update all references from .md to .vf.json in rule files

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Updating all .md references to .vf.json${NC}"
echo "============================================="

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Function to update references in a file
update_references() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo -e "${BLUE}Processing: $filename${NC}"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Update TASK_QUEUE.md to TASK_QUEUE.vf.json
    sed -i 's/TASK_QUEUE\.md/TASK_QUEUE.vf.json/g' "$file"
    
    # Update FEATURE.md to FEATURE.vf.json
    sed -i 's/FEATURE\.md/FEATURE.vf.json/g' "$file"
    
    # Update FILE_STRUCTURE.md to FILE_STRUCTURE.vf.json
    sed -i 's/FILE_STRUCTURE\.md/FILE_STRUCTURE.vf.json/g' "$file"
    
    # Check if changes were made
    if ! diff -q "$file" "$file.bak" > /dev/null; then
        echo -e "${GREEN}✅ Updated: $filename${NC}"
        rm "$file.bak"
    else
        echo -e "${YELLOW}No changes needed: $filename${NC}"
        rm "$file.bak"
    fi
}

# Update all rule files
echo -e "${YELLOW}Updating rule files in llm_rules/...${NC}"
for rule_file in "$PROJECT_ROOT"/llm_rules/*.md; do
    if [ -f "$rule_file" ]; then
        update_references "$rule_file"
    fi
done

# Update additional rule files
echo -e "${YELLOW}Updating additional rule files...${NC}"
if [ -d "$PROJECT_ROOT/llm_rules/additional" ]; then
    for rule_file in "$PROJECT_ROOT"/llm_rules/additional/*.md; do
        if [ -f "$rule_file" ]; then
            update_references "$rule_file"
        fi
    done
fi

# Update README files
echo -e "${YELLOW}Updating README files...${NC}"
for readme in "$PROJECT_ROOT"/README.md "$PROJECT_ROOT"/llm_rules/README.md "$PROJECT_ROOT"/docs/README.md; do
    if [ -f "$readme" ]; then
        update_references "$readme"
    fi
done

# Update TypeScript test files
echo -e "${YELLOW}Updating TypeScript test files...${NC}"
for ts_file in "$PROJECT_ROOT"/llm_rules/steps/*.ts "$PROJECT_ROOT"/test/**/*.ts; do
    if [ -f "$ts_file" ]; then
        echo -e "${BLUE}Processing: $(basename "$ts_file")${NC}"
        
        # Create backup
        cp "$ts_file" "$ts_file.bak"
        
        # Update references
        sed -i "s/'TASK_QUEUE\.md'/'TASK_QUEUE.vf.json'/g" "$ts_file"
        sed -i 's/"TASK_QUEUE\.md"/"TASK_QUEUE.vf.json"/g' "$ts_file"
        sed -i "s/'FEATURE\.md'/'FEATURE.vf.json'/g" "$ts_file"
        sed -i 's/"FEATURE\.md"/"FEATURE.vf.json"/g' "$ts_file"
        sed -i "s/'FILE_STRUCTURE\.md'/'FILE_STRUCTURE.vf.json'/g" "$ts_file"
        sed -i 's/"FILE_STRUCTURE\.md"/"FILE_STRUCTURE.vf.json"/g' "$ts_file"
        
        # Check if changes were made
        if ! diff -q "$ts_file" "$ts_file.bak" > /dev/null; then
            echo -e "${GREEN}✅ Updated: $(basename "$ts_file")${NC}"
            rm "$ts_file.bak"
        else
            rm "$ts_file.bak"
        fi
    fi
done

# Update demo-setup.ts specifically for the README generation
echo -e "${YELLOW}Updating demo-setup.ts README generation...${NC}"
DEMO_SETUP="$PROJECT_ROOT/src/layer/themes/setup-folder/src/setup/demo-setup.ts"
if [ -f "$DEMO_SETUP" ]; then
    sed -i "s/'TASK_QUEUE\.\${this\.mode === 'vf' ? 'vf\.json' : 'md'\}'/'TASK_QUEUE.vf.json'/g" "$DEMO_SETUP"
    echo -e "${GREEN}✅ Updated demo-setup.ts${NC}"
fi

# Summary
echo -e "${GREEN}✅ Update complete!${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo "- All .md references updated to .vf.json"
echo "- Backup files removed after successful updates"
echo "- TypeScript files updated"
echo ""
echo -e "${BLUE}Note: The system now uses .vf.json format exclusively${NC}"