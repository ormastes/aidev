#!/usr/bin/env python3
"""
Migrated from: convert-all-to-test-based.sh
Auto-generated Python - 2025-08-16T04:57:27.765Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Convert all priority-based TASK_QUEUE.vf.json files to test-based format
    subprocess.run("set -e", shell=True)
    # Color codes for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Script directory
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"", shell=True)
    subprocess.run("MIGRATION_SCRIPT="$PROJECT_ROOT/layer/themes/infra_filesystem-mcp/scripts/migrate-task-queue.js"", shell=True)
    # Counter variables
    subprocess.run("TOTAL_FILES=0", shell=True)
    subprocess.run("CONVERTED_FILES=0", shell=True)
    subprocess.run("SKIPPED_FILES=0", shell=True)
    subprocess.run("ERROR_FILES=0", shell=True)
    # Function to print colored messages
    subprocess.run("print_message() {", shell=True)
    subprocess.run("local color=$1", shell=True)
    subprocess.run("local message=$2", shell=True)
    print("-e ")${color}${message}${NC}"
    subprocess.run("}", shell=True)
    subprocess.run("print_message "$BLUE" "🔄 Converting all TASK_QUEUE.vf.json files to test-based format"", shell=True)
    subprocess.run("print_message "$BLUE" "=========================================================="", shell=True)
    print("")
    # Create backup directory
    subprocess.run("BACKUP_DIR="$PROJECT_ROOT/gen/task-queue-backups-$(date +%Y%m%d-%H%M%S)"", shell=True)
    Path(""$BACKUP_DIR"").mkdir(parents=True, exist_ok=True)
    subprocess.run("print_message "$YELLOW" "📁 Backup directory: $BACKUP_DIR"", shell=True)
    print("")
    # Find all TASK_QUEUE.vf.json files
    subprocess.run("print_message "$BLUE" "🔍 Finding all TASK_QUEUE.vf.json files..."", shell=True)
    while IFS= read -r file; do:
    subprocess.run("TOTAL_FILES=$((TOTAL_FILES + 1))", shell=True)
    # Skip node_modules, release, demo directories
    if [ "$file" == *"node_modules"* ]] || [[ "$file" == *"/release/"* ]] || [[ "$file" == *"/demo/"* ]:; then
    subprocess.run("print_message "$YELLOW" "⏩ Skipping: $file (in excluded directory)"", shell=True)
    subprocess.run("SKIPPED_FILES=$((SKIPPED_FILES + 1))", shell=True)
    subprocess.run("continue", shell=True)
    # Check if file uses priority-based format (has taskQueues property)
    subprocess.run("if grep -q '"taskQueues"' "$file" 2>/dev/null; then", shell=True)
    subprocess.run("print_message "$GREEN" "✓ Found priority-based: $file"", shell=True)
    # Create backup
    subprocess.run("BACKUP_FILE="$BACKUP_DIR/$(basename "$(dirname "$file")")-$(basename "$file")"", shell=True)
    shutil.copy2(""$file"", ""$BACKUP_FILE"")
    # Convert to test-based format
    subprocess.run("TEMP_FILE="${file}.converted"", shell=True)
    subprocess.run("if node "$MIGRATION_SCRIPT" "$file" "$TEMP_FILE" --to-test-driven 2>/dev/null; then", shell=True)
    # Replace original with converted file
    shutil.move(""$TEMP_FILE"", ""$file"")
    subprocess.run("print_message "$GREEN" "  ✓ Converted successfully"", shell=True)
    subprocess.run("CONVERTED_FILES=$((CONVERTED_FILES + 1))", shell=True)
    else:
    subprocess.run("print_message "$RED" "  ✗ Conversion failed"", shell=True)
    subprocess.run("rm -f "$TEMP_FILE"", shell=True)
    subprocess.run("ERROR_FILES=$((ERROR_FILES + 1))", shell=True)
    subprocess.run("elif grep -q '"queues"' "$file" 2>/dev/null; then", shell=True)
    subprocess.run("print_message "$YELLOW" "⏩ Already test-based: $file"", shell=True)
    subprocess.run("SKIPPED_FILES=$((SKIPPED_FILES + 1))", shell=True)
    else:
    subprocess.run("print_message "$RED" "❓ Unknown format: $file"", shell=True)
    subprocess.run("ERROR_FILES=$((ERROR_FILES + 1))", shell=True)
    print("")
    subprocess.run("done < <(find "$PROJECT_ROOT" -name "TASK_QUEUE.vf.json" -type f)", shell=True)
    # Summary
    subprocess.run("print_message "$BLUE" "📊 Conversion Summary"", shell=True)
    subprocess.run("print_message "$BLUE" "===================="", shell=True)
    subprocess.run("print_message "$GREEN" "✓ Total files found: $TOTAL_FILES"", shell=True)
    subprocess.run("print_message "$GREEN" "✓ Converted: $CONVERTED_FILES files"", shell=True)
    subprocess.run("print_message "$YELLOW" "⏩ Skipped: $SKIPPED_FILES files (already test-based or excluded)"", shell=True)
    if [ $ERROR_FILES -gt 0 ]:; then
    subprocess.run("print_message "$RED" "✗ Errors: $ERROR_FILES files"", shell=True)
    print("")
    subprocess.run("print_message "$BLUE" "📁 Backups saved to: $BACKUP_DIR"", shell=True)
    # Verify conversions
    if [ $CONVERTED_FILES -gt 0 ]:; then
    print("")
    subprocess.run("print_message "$BLUE" "🔍 Verifying conversions..."", shell=True)
    subprocess.run("VERIFY_SUCCESS=0", shell=True)
    subprocess.run("VERIFY_FAIL=0", shell=True)
    for file in [$(find "$PROJECT_ROOT" -name "TASK_QUEUE.vf.json" -type f | grep -v node_modules | grep -v "/release/" | grep -v "/demo/"); do]:
    subprocess.run("if grep -q '"queues"' "$file" 2>/dev/null && grep -q '"working_item"' "$file" 2>/dev/null; then", shell=True)
    subprocess.run("VERIFY_SUCCESS=$((VERIFY_SUCCESS + 1))", shell=True)
    subprocess.run("elif grep -q '"taskQueues"' "$file" 2>/dev/null; then", shell=True)
    subprocess.run("print_message "$RED" "  ✗ Still priority-based: $file"", shell=True)
    subprocess.run("VERIFY_FAIL=$((VERIFY_FAIL + 1))", shell=True)
    subprocess.run("print_message "$GREEN" "✓ Verified test-based format: $VERIFY_SUCCESS files"", shell=True)
    if [ $VERIFY_FAIL -gt 0 ]:; then
    subprocess.run("print_message "$RED" "✗ Still priority-based: $VERIFY_FAIL files"", shell=True)
    print("")
    subprocess.run("print_message "$GREEN" "✓ Conversion complete!"", shell=True)
    # Instructions for rollback
    print("")
    subprocess.run("print_message "$BLUE" "📝 To rollback changes:"", shell=True)
    print("cp $BACKUP_DIR/* <original-locations>")

if __name__ == "__main__":
    main()