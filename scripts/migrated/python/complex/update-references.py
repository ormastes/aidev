#!/usr/bin/env python3
"""
Migrated from: update-references.sh
Auto-generated Python - 2025-08-16T04:57:27.772Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Update all references from .md to .vf.json in rule files
    subprocess.run("set -e", shell=True)
    # Colors for output
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    print("-e ")${YELLOW}Updating all .md references to .vf.json${NC}"
    print("=============================================")
    # Get the script directory
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"", shell=True)
    # Function to update references in a file
    subprocess.run("update_references() {", shell=True)
    subprocess.run("local file="$1"", shell=True)
    subprocess.run("local filename=$(basename "$file")", shell=True)
    print("-e ")${BLUE}Processing: $filename${NC}"
    # Create backup
    shutil.copy2(""$file"", ""$file.bak"")
    # Update TASK_QUEUE.md to TASK_QUEUE.vf.json
    subprocess.run("sed -i 's/TASK_QUEUE\.md/TASK_QUEUE.vf.json/g' "$file"", shell=True)
    # Update FEATURE.md to FEATURE.vf.json
    subprocess.run("sed -i 's/FEATURE\.md/FEATURE.vf.json/g' "$file"", shell=True)
    # Update FILE_STRUCTURE.md to FILE_STRUCTURE.vf.json
    subprocess.run("sed -i 's/FILE_STRUCTURE\.md/FILE_STRUCTURE.vf.json/g' "$file"", shell=True)
    # Check if changes were made
    subprocess.run("if ! diff -q "$file" "$file.bak" > /dev/null; then", shell=True)
    print("-e ")${GREEN}✅ Updated: $filename${NC}"
    subprocess.run("rm "$file.bak"", shell=True)
    else:
    print("-e ")${YELLOW}No changes needed: $filename${NC}"
    subprocess.run("rm "$file.bak"", shell=True)
    subprocess.run("}", shell=True)
    # Update all rule files
    print("-e ")${YELLOW}Updating rule files in llm_rules/...${NC}"
    for rule_file in ["$PROJECT_ROOT"/llm_rules/*.md; do]:
    if -f "$rule_file" :; then
    subprocess.run("update_references "$rule_file"", shell=True)
    # Update additional rule files
    print("-e ")${YELLOW}Updating additional rule files...${NC}"
    if -d "$PROJECT_ROOT/llm_rules/additional" :; then
    for rule_file in ["$PROJECT_ROOT"/llm_rules/additional/*.md; do]:
    if -f "$rule_file" :; then
    subprocess.run("update_references "$rule_file"", shell=True)
    # Update README files
    print("-e ")${YELLOW}Updating README files...${NC}"
    for readme in ["$PROJECT_ROOT"/README.md "$PROJECT_ROOT"/llm_rules/README.md "$PROJECT_ROOT"/docs/README.md; do]:
    if -f "$readme" :; then
    subprocess.run("update_references "$readme"", shell=True)
    # Update TypeScript test files
    print("-e ")${YELLOW}Updating TypeScript test files...${NC}"
    for ts_file in ["$PROJECT_ROOT"/llm_rules/steps/*.ts "$PROJECT_ROOT"/test/**/*.ts; do]:
    if -f "$ts_file" :; then
    print("-e ")${BLUE}Processing: $(basename "$ts_file")${NC}"
    # Create backup
    shutil.copy2(""$ts_file"", ""$ts_file.bak"")
    # Update references
    subprocess.run("sed -i "s/'TASK_QUEUE\.md'/'TASK_QUEUE.vf.json'/g" "$ts_file"", shell=True)
    subprocess.run("sed -i 's/"TASK_QUEUE\.md"/"TASK_QUEUE.vf.json"/g' "$ts_file"", shell=True)
    subprocess.run("sed -i "s/'FEATURE\.md'/'FEATURE.vf.json'/g" "$ts_file"", shell=True)
    subprocess.run("sed -i 's/"FEATURE\.md"/"FEATURE.vf.json"/g' "$ts_file"", shell=True)
    subprocess.run("sed -i "s/'FILE_STRUCTURE\.md'/'FILE_STRUCTURE.vf.json'/g" "$ts_file"", shell=True)
    subprocess.run("sed -i 's/"FILE_STRUCTURE\.md"/"FILE_STRUCTURE.vf.json"/g' "$ts_file"", shell=True)
    # Check if changes were made
    subprocess.run("if ! diff -q "$ts_file" "$ts_file.bak" > /dev/null; then", shell=True)
    print("-e ")${GREEN}✅ Updated: $(basename "$ts_file")${NC}"
    subprocess.run("rm "$ts_file.bak"", shell=True)
    else:
    subprocess.run("rm "$ts_file.bak"", shell=True)
    # Update demo-setup.ts specifically for the README generation
    print("-e ")${YELLOW}Updating demo-setup.ts README generation...${NC}"
    subprocess.run("DEMO_SETUP="$PROJECT_ROOT/src/layer/themes/setup-folder/src/setup/demo-setup.ts"", shell=True)
    if -f "$DEMO_SETUP" :; then
    subprocess.run("sed -i "s/'TASK_QUEUE\.\${this\.mode === 'vf' ? 'vf\.json' : 'md'\}'/'TASK_QUEUE.vf.json'/g" "$DEMO_SETUP"", shell=True)
    print("-e ")${GREEN}✅ Updated demo-setup.ts${NC}"
    # Summary
    print("-e ")${GREEN}✅ Update complete!${NC}"
    print("")
    print("-e ")${YELLOW}Summary:${NC}"
    print("- All .md references updated to .vf.json")
    print("- Backup files removed after successful updates")
    print("- TypeScript files updated")
    print("")
    print("-e ")${BLUE}Note: The system now uses .vf.json format exclusively${NC}"

if __name__ == "__main__":
    main()