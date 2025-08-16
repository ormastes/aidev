#!/usr/bin/env python3
"""
Migrated from: update-npm-to-bun.sh
Auto-generated Python - 2025-08-16T04:57:27.731Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Script to update all npm references to bun in documentation and scripts
    # This is a comprehensive update tool for the AI Development Platform
    subprocess.run("set -euo pipefail", shell=True)
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("CYAN='\033[0;36m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Logging functions
    subprocess.run("log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }", shell=True)
    subprocess.run("log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }", shell=True)
    subprocess.run("log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }", shell=True)
    subprocess.run("log_error() { echo -e "${RED}[ERROR]${NC} $1"; }", shell=True)
    # Counter for changes
    subprocess.run("TOTAL_FILES=0", shell=True)
    subprocess.run("TOTAL_CHANGES=0", shell=True)
    # Function to update a file
    subprocess.run("update_file() {", shell=True)
    subprocess.run("local file="$1"", shell=True)
    subprocess.run("local temp_file="${file}.tmp"", shell=True)
    subprocess.run("local changes=0", shell=True)
    # Skip node_modules, release, and .git directories
    if [ "$file" == *"node_modules"* ]] || [[ "$file" == *"release/"* ]] || [[ "$file" == *".git/"* ]:; then
    subprocess.run("return 0", shell=True)
    # Skip the bun migration report itself
    if [ "$file" == *"bun-migration-report.md" ]:; then
    subprocess.run("return 0", shell=True)
    # Create a temporary file with replacements
    shutil.copy2(""$file"", ""$temp_file"")
    # Replace npm commands with bun equivalents
    # Note: Using word boundaries to avoid replacing things like "npm" in URLs
    subprocess.run("sed -i.bak -E \", shell=True)
    subprocess.run("-e 's/\bnpm install\b/bun install/g' \", shell=True)
    subprocess.run("-e 's/\bnpm i\b/bun install/g' \", shell=True)
    subprocess.run("-e 's/\bnpm ci\b/bun install --frozen-lockfile/g' \", shell=True)
    subprocess.run("-e 's/\bnpm run\b/bun run/g' \", shell=True)
    subprocess.run("-e 's/\bnpm test\b/bun test/g' \", shell=True)
    subprocess.run("-e 's/\bnpm start\b/bun start/g' \", shell=True)
    subprocess.run("-e 's/\bnpm build\b/bun run build/g' \", shell=True)
    subprocess.run("-e 's/\bnpm audit\b/bun audit/g' \", shell=True)
    subprocess.run("-e 's/\bnpm update\b/bun update/g' \", shell=True)
    subprocess.run("-e 's/\bnpm outdated\b/bun outdated/g' \", shell=True)
    subprocess.run("-e 's/\bnpm publish\b/bun publish/g' \", shell=True)
    subprocess.run("-e 's/\bnpm link\b/bun link/g' \", shell=True)
    subprocess.run("-e 's/\bnpm unlink\b/bun unlink/g' \", shell=True)
    subprocess.run("-e 's/\bnpm list\b/bun pm ls/g' \", shell=True)
    subprocess.run("-e 's/\bnpm ls\b/bun pm ls/g' \", shell=True)
    subprocess.run("-e 's/\bnpm prune\b/bun pm prune/g' \", shell=True)
    subprocess.run("-e 's/\bnpm dedupe\b/bun install/g' \", shell=True)
    subprocess.run("-e 's/\bnpm init\b/bun init/g' \", shell=True)
    subprocess.run("-e 's/\bnpm exec\b/bunx/g' \", shell=True)
    subprocess.run("-e 's/\bnpx\b/bunx/g' \", shell=True)
    subprocess.run("-e 's/\bnpm install -g\b/bun add -g/g' \", shell=True)
    subprocess.run("-e 's/\bnpm install --global\b/bun add -g/g' \", shell=True)
    subprocess.run("-e 's/\bnpm uninstall\b/bun remove/g' \", shell=True)
    subprocess.run("-e 's/\bnpm rm\b/bun remove/g' \", shell=True)
    subprocess.run("-e 's/\bnpm config\b/bunfig/g' \", shell=True)
    subprocess.run("-e 's/package-lock\.json/bun.lockb/g' \", shell=True)
    subprocess.run("-e 's/npm-debug\.log/bun-debug.log/g' \", shell=True)
    subprocess.run("-e 's/\.npm\b/.bun/g' \", shell=True)
    subprocess.run("-e 's/npm 9\.x or later/bun latest version/g' \", shell=True)
    subprocess.run("-e 's/npm package manager/bun package manager/g' \", shell=True)
    subprocess.run(""$temp_file"", shell=True)
    # Check if file was changed
    subprocess.run("if ! diff -q "$file" "$temp_file" > /dev/null 2>&1; then", shell=True)
    shutil.move(""$temp_file"", ""$file"")
    subprocess.run("rm -f "${temp_file}.bak"", shell=True)
    subprocess.run("((TOTAL_CHANGES++))", shell=True)
    subprocess.run("log_success "Updated: $file"", shell=True)
    subprocess.run("return 1", shell=True)
    else:
    subprocess.run("rm -f "$temp_file" "${temp_file}.bak"", shell=True)
    subprocess.run("return 0", shell=True)
    subprocess.run("}", shell=True)
    # Function to update markdown files
    subprocess.run("update_markdown_files() {", shell=True)
    subprocess.run("log_info "Updating markdown files..."", shell=True)
    while IFS= read -r -d '' file; do:
    subprocess.run("((TOTAL_FILES++))", shell=True)
    subprocess.run("update_file "$file" || true", shell=True)
    subprocess.run("done < <(find . -type f -name "*.md" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)", shell=True)
    subprocess.run("}", shell=True)
    # Function to update shell scripts
    subprocess.run("update_shell_scripts() {", shell=True)
    subprocess.run("log_info "Updating shell scripts..."", shell=True)
    while IFS= read -r -d '' file; do:
    subprocess.run("((TOTAL_FILES++))", shell=True)
    subprocess.run("update_file "$file" || true", shell=True)
    subprocess.run("done < <(find . -type f -name "*.sh" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)", shell=True)
    subprocess.run("}", shell=True)
    # Function to update JavaScript/TypeScript files with comments
    subprocess.run("update_js_ts_files() {", shell=True)
    subprocess.run("log_info "Updating JavaScript/TypeScript files (comments only)..."", shell=True)
    while IFS= read -r -d '' file; do:
    subprocess.run("((TOTAL_FILES++))", shell=True)
    # Only update comments in JS/TS files, not actual code
    subprocess.run("temp_file="${file}.tmp"", shell=True)
    shutil.copy2(""$file"", ""$temp_file"")
    # Update comments that reference npm
    subprocess.run("sed -i.bak -E \", shell=True)
    subprocess.run("-e 's|// npm |// bun |g' \", shell=True)
    subprocess.run("-e 's|/\* npm |\/* bun |g' \", shell=True)
    subprocess.run("-e 's|// Run: npm |// Run: bun |g' \", shell=True)
    subprocess.run("-e 's|// Install: npm |// Install: bun |g' \", shell=True)
    subprocess.run("-e 's|// Usage: npm |// Usage: bun |g' \", shell=True)
    subprocess.run("-e 's|// Example: npm |// Example: bun |g' \", shell=True)
    subprocess.run(""$temp_file"", shell=True)
    subprocess.run("if ! diff -q "$file" "$temp_file" > /dev/null 2>&1; then", shell=True)
    shutil.move(""$temp_file"", ""$file"")
    subprocess.run("rm -f "${temp_file}.bak"", shell=True)
    subprocess.run("((TOTAL_CHANGES++))", shell=True)
    subprocess.run("log_success "Updated comments in: $file"", shell=True)
    else:
    subprocess.run("rm -f "$temp_file" "${temp_file}.bak"", shell=True)
    subprocess.run("done < <(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)", shell=True)
    subprocess.run("}", shell=True)
    # Function to update JSON files (package.json scripts descriptions)
    subprocess.run("update_json_files() {", shell=True)
    subprocess.run("log_info "Checking package.json files for documentation updates..."", shell=True)
    while IFS= read -r -d '' file; do:
    if [ "$(basename "$file")" == "package.json" ]:; then
    subprocess.run("log_info "Found package.json at: $file"", shell=True)
    # Note: package.json scripts themselves don't need updating
    # as they work with both npm and bun
    subprocess.run("done < <(find . -type f -name "*.json" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/.git/*" -print0)", shell=True)
    subprocess.run("}", shell=True)
    # Main execution
    subprocess.run("main() {", shell=True)
    print("-e ")${CYAN}=== NPM to Bun Documentation Update ===${NC}"
    print("This script will update all npm references to bun in documentation")
    subprocess.run("echo", shell=True)
    # Confirmation
    subprocess.run("read -p "Do you want to proceed with updating all documentation? (y/N): " -n 1 -r", shell=True)
    subprocess.run("echo", shell=True)
    if [ ! $REPLY =~ ^[Yy]$ ]:; then
    subprocess.run("log_info "Update cancelled"", shell=True)
    sys.exit(0)
    # Update different file types
    subprocess.run("update_markdown_files", shell=True)
    subprocess.run("update_shell_scripts", shell=True)
    subprocess.run("update_js_ts_files", shell=True)
    subprocess.run("update_json_files", shell=True)
    # Summary
    subprocess.run("echo", shell=True)
    print("-e ")${CYAN}=== Update Summary ===${NC}"
    print("Files processed: $TOTAL_FILES")
    print("Files updated: $TOTAL_CHANGES")
    if [ $TOTAL_CHANGES -gt 0 ]:; then
    subprocess.run("echo", shell=True)
    subprocess.run("log_success "Successfully updated $TOTAL_CHANGES files to use bun instead of npm"", shell=True)
    subprocess.run("echo", shell=True)
    print("Next steps:")
    print("1. Review the changes: git diff")
    print("2. Test the updated documentation")
    print("3. Commit the changes: git add -A && git commit -m 'Update documentation to use bun'")
    else:
    subprocess.run("log_info "No files needed updating"", shell=True)
    subprocess.run("}", shell=True)
    # Run main function
    subprocess.run("main "$@"", shell=True)

if __name__ == "__main__":
    main()