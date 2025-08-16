#!/usr/bin/env bash
# Script to update all npm references to bun in documentation and scripts
# This is a comprehensive update tool for the AI Development Platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Counter for changes
TOTAL_FILES=0
TOTAL_CHANGES=0

# Function to update a file
update_file() {
    local file="$1"
    local temp_file="${file}.tmp"
    local changes=0
    
    # Skip node_modules, release, and .git directories
    if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *"release/"* ]] || [[ "$file" == *".git/"* ]]; then
        return 0
    fi
    
    # Skip the bun migration report itself
    if [[ "$file" == *"bun-migration-report.md" ]]; then
        return 0
    fi
    
    # Create a temporary file with replacements
    cp "$file" "$temp_file"
    
    # Replace npm commands with bun equivalents
    # Note: Using word boundaries to avoid replacing things like "npm" in URLs
    sed -i.bak -E \
        -e 's/\bnpm install\b/bun install/g' \
        -e 's/\bnpm i\b/bun install/g' \
        -e 's/\bnpm ci\b/bun install --frozen-lockfile/g' \
        -e 's/\bnpm run\b/bun run/g' \
        -e 's/\bnpm test\b/bun test/g' \
        -e 's/\bnpm start\b/bun start/g' \
        -e 's/\bnpm build\b/bun run build/g' \
        -e 's/\bnpm audit\b/bun audit/g' \
        -e 's/\bnpm update\b/bun update/g' \
        -e 's/\bnpm outdated\b/bun outdated/g' \
        -e 's/\bnpm publish\b/bun publish/g' \
        -e 's/\bnpm link\b/bun link/g' \
        -e 's/\bnpm unlink\b/bun unlink/g' \
        -e 's/\bnpm list\b/bun pm ls/g' \
        -e 's/\bnpm ls\b/bun pm ls/g' \
        -e 's/\bnpm prune\b/bun pm prune/g' \
        -e 's/\bnpm dedupe\b/bun install/g' \
        -e 's/\bnpm init\b/bun init/g' \
        -e 's/\bnpm exec\b/bunx/g' \
        -e 's/\bnpx\b/bunx/g' \
        -e 's/\bnpm install -g\b/bun add -g/g' \
        -e 's/\bnpm install --global\b/bun add -g/g' \
        -e 's/\bnpm uninstall\b/bun remove/g' \
        -e 's/\bnpm rm\b/bun remove/g' \
        -e 's/\bnpm config\b/bunfig/g' \
        -e 's/package-lock\.json/bun.lockb/g' \
        -e 's/npm-debug\.log/bun-debug.log/g' \
        -e 's/\.npm\b/.bun/g' \
        -e 's/npm 9\.x or later/bun latest version/g' \
        -e 's/npm package manager/bun package manager/g' \
        "$temp_file"
    
    # Check if file was changed
    if ! diff -q "$file" "$temp_file" > /dev/null 2>&1; then
        mv "$temp_file" "$file"
        rm -f "${temp_file}.bak"
        ((TOTAL_CHANGES++))
        log_success "Updated: $file"
        return 1
    else
        rm -f "$temp_file" "${temp_file}.bak"
        return 0
    fi
}

# Function to update markdown files
update_markdown_files() {
    log_info "Updating markdown files..."
    
    while IFS= read -r -d '' file; do
        ((TOTAL_FILES++))
        update_file "$file" || true
    done < <(find . -type f -name "*.md" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)
}

# Function to update shell scripts
update_shell_scripts() {
    log_info "Updating shell scripts..."
    
    while IFS= read -r -d '' file; do
        ((TOTAL_FILES++))
        update_file "$file" || true
    done < <(find . -type f -name "*.sh" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)
}

# Function to update JavaScript/TypeScript files with comments
update_js_ts_files() {
    log_info "Updating JavaScript/TypeScript files (comments only)..."
    
    while IFS= read -r -d '' file; do
        ((TOTAL_FILES++))
        # Only update comments in JS/TS files, not actual code
        temp_file="${file}.tmp"
        cp "$file" "$temp_file"
        
        # Update comments that reference npm
        sed -i.bak -E \
            -e 's|// npm |// bun |g' \
            -e 's|/\* npm |\/* bun |g' \
            -e 's|// Run: npm |// Run: bun |g' \
            -e 's|// Install: npm |// Install: bun |g' \
            -e 's|// Usage: npm |// Usage: bun |g' \
            -e 's|// Example: npm |// Example: bun |g' \
            "$temp_file"
        
        if ! diff -q "$file" "$temp_file" > /dev/null 2>&1; then
            mv "$temp_file" "$file"
            rm -f "${temp_file}.bak"
            ((TOTAL_CHANGES++))
            log_success "Updated comments in: $file"
        else
            rm -f "$temp_file" "${temp_file}.bak"
        fi
    done < <(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)
}

# Function to update JSON files (package.json scripts descriptions)
update_json_files() {
    log_info "Checking package.json files for documentation updates..."
    
    while IFS= read -r -d '' file; do
        if [[ "$(basename "$file")" == "package.json" ]]; then
            log_info "Found package.json at: $file"
            # Note: package.json scripts themselves don't need updating
            # as they work with both npm and bun
        fi
    done < <(find . -type f -name "*.json" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)
}

# Main execution
main() {
    echo -e "${CYAN}=== NPM to Bun Documentation Update ===${NC}"
    echo "This script will update all npm references to bun in documentation"
    echo
    
    # Confirmation
    read -p "Do you want to proceed with updating all documentation? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Update cancelled"
        exit 0
    fi
    
    # Update different file types
    update_markdown_files
    update_shell_scripts
    update_js_ts_files
    update_json_files
    
    # Summary
    echo
    echo -e "${CYAN}=== Update Summary ===${NC}"
    echo "Files processed: $TOTAL_FILES"
    echo "Files updated: $TOTAL_CHANGES"
    
    if [[ $TOTAL_CHANGES -gt 0 ]]; then
        echo
        log_success "Successfully updated $TOTAL_CHANGES files to use bun instead of npm"
        echo
        echo "Next steps:"
        echo "1. Review the changes: git diff"
        echo "2. Test the updated documentation"
        echo "3. Commit the changes: git add -A && git commit -m 'Update documentation to use bun'"
    else
        log_info "No files needed updating"
    fi
}

# Run main function
main "$@"