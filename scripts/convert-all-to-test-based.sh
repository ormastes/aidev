#!/bin/bash

# Convert all priority-based TASK_QUEUE.vf.json files to test-based format

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATION_SCRIPT="$PROJECT_ROOT/layer/themes/infra_filesystem-mcp/scripts/migrate-task-queue.js"

# Counter variables
TOTAL_FILES=0
CONVERTED_FILES=0
SKIPPED_FILES=0
ERROR_FILES=0

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message "$BLUE" "🔄 Converting all TASK_QUEUE.vf.json files to test-based format"
print_message "$BLUE" "=========================================================="
echo ""

# Create backup directory
BACKUP_DIR="$PROJECT_ROOT/gen/task-queue-backups-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
print_message "$YELLOW" "📁 Backup directory: $BACKUP_DIR"
echo ""

# Find all TASK_QUEUE.vf.json files
print_message "$BLUE" "🔍 Finding all TASK_QUEUE.vf.json files..."

while IFS= read -r file; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    # Skip node_modules, release, demo directories
    if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *"/release/"* ]] || [[ "$file" == *"/demo/"* ]]; then
        print_message "$YELLOW" "⏩ Skipping: $file (in excluded directory)"
        SKIPPED_FILES=$((SKIPPED_FILES + 1))
        continue
    fi
    
    # Check if file uses priority-based format (has taskQueues property)
    if grep -q '"taskQueues"' "$file" 2>/dev/null; then
        print_message "$GREEN" "✓ Found priority-based: $file"
        
        # Create backup
        BACKUP_FILE="$BACKUP_DIR/$(basename "$(dirname "$file")")-$(basename "$file")"
        cp "$file" "$BACKUP_FILE"
        
        # Convert to test-based format
        TEMP_FILE="${file}.converted"
        
        if node "$MIGRATION_SCRIPT" "$file" "$TEMP_FILE" --to-test-driven 2>/dev/null; then
            # Replace original with converted file
            mv "$TEMP_FILE" "$file"
            print_message "$GREEN" "  ✓ Converted successfully"
            CONVERTED_FILES=$((CONVERTED_FILES + 1))
        else
            print_message "$RED" "  ✗ Conversion failed"
            rm -f "$TEMP_FILE"
            ERROR_FILES=$((ERROR_FILES + 1))
        fi
    elif grep -q '"queues"' "$file" 2>/dev/null; then
        print_message "$YELLOW" "⏩ Already test-based: $file"
        SKIPPED_FILES=$((SKIPPED_FILES + 1))
    else
        print_message "$RED" "❓ Unknown format: $file"
        ERROR_FILES=$((ERROR_FILES + 1))
    fi
    
    echo ""
done < <(find "$PROJECT_ROOT" -name "TASK_QUEUE.vf.json" -type f)

# Summary
print_message "$BLUE" "📊 Conversion Summary"
print_message "$BLUE" "===================="
print_message "$GREEN" "✓ Total files found: $TOTAL_FILES"
print_message "$GREEN" "✓ Converted: $CONVERTED_FILES files"
print_message "$YELLOW" "⏩ Skipped: $SKIPPED_FILES files (already test-based or excluded)"
if [[ $ERROR_FILES -gt 0 ]]; then
    print_message "$RED" "✗ Errors: $ERROR_FILES files"
fi

echo ""
print_message "$BLUE" "📁 Backups saved to: $BACKUP_DIR"

# Verify conversions
if [[ $CONVERTED_FILES -gt 0 ]]; then
    echo ""
    print_message "$BLUE" "🔍 Verifying conversions..."
    
    VERIFY_SUCCESS=0
    VERIFY_FAIL=0
    
    for file in $(find "$PROJECT_ROOT" -name "TASK_QUEUE.vf.json" -type f | grep -v node_modules | grep -v "/release/" | grep -v "/demo/"); do
        if grep -q '"queues"' "$file" 2>/dev/null && grep -q '"working_item"' "$file" 2>/dev/null; then
            VERIFY_SUCCESS=$((VERIFY_SUCCESS + 1))
        elif grep -q '"taskQueues"' "$file" 2>/dev/null; then
            print_message "$RED" "  ✗ Still priority-based: $file"
            VERIFY_FAIL=$((VERIFY_FAIL + 1))
        fi
    done
    
    print_message "$GREEN" "✓ Verified test-based format: $VERIFY_SUCCESS files"
    if [[ $VERIFY_FAIL -gt 0 ]]; then
        print_message "$RED" "✗ Still priority-based: $VERIFY_FAIL files"
    fi
fi

echo ""
print_message "$GREEN" "✓ Conversion complete!"

# Instructions for rollback
echo ""
print_message "$BLUE" "📝 To rollback changes:"
echo "cp $BACKUP_DIR/* <original-locations>"