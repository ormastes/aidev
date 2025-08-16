#!/usr/bin/env python3
"""
Migrated from: migrate-to-bun.sh
Auto-generated Python - 2025-08-16T04:57:27.778Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Script to migrate setup folder from npm/bunx to Bun
    # This script replaces npm/bunx commands with Bun equivalents
    subprocess.run("set -e", shell=True)
    print("🚀 Migrating setup folder to use Bun instead of npm/npx...")
    # Create backup directory
    subprocess.run("BACKUP_DIR="setup_backup_$(date +%Y%m%d_%H%M%S)"", shell=True)
    print("📦 Creating backup in $BACKUP_DIR...")
    shutil.copy2("-r setup", ""$BACKUP_DIR"")
    # Function to replace npm/bunx with Bun equivalents
    subprocess.run("replace_npm_with_bun() {", shell=True)
    subprocess.run("local file=$1", shell=True)
    subprocess.run("local temp_file=$(mktemp)", shell=True)
    # Replace npm/bunx commands
    subprocess.run("sed -E \", shell=True)
    subprocess.run("-e 's/bun install/bun install/g' \", shell=True)
    subprocess.run("-e 's/bun install --frozen-lockfile/bun install --frozen-lockfile/g' \", shell=True)
    subprocess.run("-e 's/bun run /bun run /g' \", shell=True)
    subprocess.run("-e 's/bun start/bun start/g' \", shell=True)
    subprocess.run("-e 's/bun test/bun test/g' \", shell=True)
    subprocess.run("-e 's/bun build/bun build/g' \", shell=True)
    subprocess.run("-e 's/bunx /bunx /g' \", shell=True)
    subprocess.run("-e 's/command -v bun/command -v bun/g' \", shell=True)
    subprocess.run("-e 's/bun --version/bun --version/g' \", shell=True)
    subprocess.run("-e 's/"bun"/"bun"/g' \", shell=True)
    subprocess.run("-e 's/bun --version/bun --version/g' \", shell=True)
    subprocess.run("-e 's/Node\.js\/npm/Node.js\/Bun/g' \", shell=True)
    subprocess.run(""$file" > "$temp_file"", shell=True)
    # Only update if changes were made
    subprocess.run("if ! diff -q "$file" "$temp_file" > /dev/null; then", shell=True)
    shutil.move(""$temp_file"", ""$file"")
    print("✅ Updated: $file")
    else:
    subprocess.run("rm "$temp_file"", shell=True)
    subprocess.run("}", shell=True)
    # Find and update all relevant files
    print("🔍 Finding and updating files...")
    # Update shell scripts
    subprocess.run("find setup -type f -name "*.sh" | while read -r file; do", shell=True)
    subprocess.run("replace_npm_with_bun "$file"", shell=True)
    # Update JavaScript/TypeScript test files
    subprocess.run("find setup -type f \( -name "*.js" -o -name "*.ts" \) | while read -r file; do", shell=True)
    subprocess.run("replace_npm_with_bun "$file"", shell=True)
    # Update Markdown documentation
    subprocess.run("find setup -type f -name "*.md" | while read -r file; do", shell=True)
    subprocess.run("replace_npm_with_bun "$file"", shell=True)
    # Update JSON configuration files
    subprocess.run("find setup -type f -name "*.json" | while read -r file; do", shell=True)
    subprocess.run("replace_npm_with_bun "$file"", shell=True)
    # Update Dockerfiles
    subprocess.run("find setup -type f -name "Dockerfile*" | while read -r file; do", shell=True)
    subprocess.run("replace_npm_with_bun "$file"", shell=True)
    # Update feature files
    subprocess.run("find setup -type f -name "*.feature" | while read -r file; do", shell=True)
    subprocess.run("replace_npm_with_bun "$file"", shell=True)
    # Special case: Update package.json files to use Bun
    subprocess.run("find setup -type f -name "package.json" | while read -r file; do", shell=True)
    # Update scripts section to use bun
    subprocess.run("if grep -q '"scripts"' "$file"; then", shell=True)
    print("📝 Updating package.json scripts in: $file")
    # This would need more complex JSON parsing for production use
    # For now, just ensure the file exists
    print("")
    print("✨ Migration complete!")
    print("📋 Summary:")
    print("  - Backup created in: $BACKUP_DIR")
    print("  - bun install → bun install")
    print("  - bun install --frozen-lockfile → bun install --frozen-lockfile")
    print("  - bun run → bun run")
    print("  - bunx → bunx")
    print("")
    print("⚠️  Note: Please install Bun if not already installed:")
    print("  curl -fsSL https://bun.sh/install | bash")
    print("")
    print("To restore backup if needed:")
    print("  rm -rf setup && mv $BACKUP_DIR setup")

if __name__ == "__main__":
    main()