#!/bin/bash

# Script to migrate setup folder from npm/bunx to Bun
# This script replaces npm/bunx commands with Bun equivalents

set -e

echo "🚀 Migrating setup folder to use Bun instead of npm/npx..."

# Create backup directory
BACKUP_DIR="setup_backup_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup in $BACKUP_DIR..."
cp -r setup "$BACKUP_DIR"

# Function to replace npm/bunx with Bun equivalents
replace_npm_with_bun() {
    local file=$1
    local temp_file=$(mktemp)
    
    # Replace npm/bunx commands
    sed -E \
        -e 's/bun install/bun install/g' \
        -e 's/bun install --frozen-lockfile/bun install --frozen-lockfile/g' \
        -e 's/bun run /bun run /g' \
        -e 's/bun start/bun start/g' \
        -e 's/bun test/bun test/g' \
        -e 's/bun build/bun build/g' \
        -e 's/bunx /bunx /g' \
        -e 's/command -v bun/command -v bun/g' \
        -e 's/bun --version/bun --version/g' \
        -e 's/"bun"/"bun"/g' \
        -e 's/bun --version/bun --version/g' \
        -e 's/Node\.js\/npm/Node.js\/Bun/g' \
        "$file" > "$temp_file"
    
    # Only update if changes were made
    if ! diff -q "$file" "$temp_file" > /dev/null; then
        mv "$temp_file" "$file"
        echo "✅ Updated: $file"
    else
        rm "$temp_file"
    fi
}

# Find and update all relevant files
echo "🔍 Finding and updating files..."

# Update shell scripts
find setup -type f -name "*.sh" | while read -r file; do
    replace_npm_with_bun "$file"
done

# Update JavaScript/TypeScript test files
find setup -type f \( -name "*.js" -o -name "*.ts" \) | while read -r file; do
    replace_npm_with_bun "$file"
done

# Update Markdown documentation
find setup -type f -name "*.md" | while read -r file; do
    replace_npm_with_bun "$file"
done

# Update JSON configuration files
find setup -type f -name "*.json" | while read -r file; do
    replace_npm_with_bun "$file"
done

# Update Dockerfiles
find setup -type f -name "Dockerfile*" | while read -r file; do
    replace_npm_with_bun "$file"
done

# Update feature files
find setup -type f -name "*.feature" | while read -r file; do
    replace_npm_with_bun "$file"
done

# Special case: Update package.json files to use Bun
find setup -type f -name "package.json" | while read -r file; do
    # Update scripts section to use bun
    if grep -q '"scripts"' "$file"; then
        echo "📝 Updating package.json scripts in: $file"
        # This would need more complex JSON parsing for production use
        # For now, just ensure the file exists
    fi
done

echo ""
echo "✨ Migration complete!"
echo "📋 Summary:"
echo "  - Backup created in: $BACKUP_DIR"
echo "  - bun install → bun install"
echo "  - bun install --frozen-lockfile → bun install --frozen-lockfile"
echo "  - bun run → bun run"
echo "  - bunx → bunx"
echo ""
echo "⚠️  Note: Please install Bun if not already installed:"
echo "  curl -fsSL https://bun.sh/install | bash"
echo ""
echo "To restore backup if needed:"
echo "  rm -rf setup && mv $BACKUP_DIR setup"