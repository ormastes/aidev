#!/bin/bash

# Script to migrate bunx commands to bunx
# Excludes fraud-checker theme

echo "🔄 Migrating bunx to bunx..."
echo "============================="

# Count files before migration
BEFORE_COUNT=$(find . -type f \( -name "*.sh" -o -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.js" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/fraud-checker/*" \
    -not -path "*/infra_fraud-checker/*" \
    -exec grep -l "bunx " {} \; 2>/dev/null | wc -l)

echo "📊 Files with bunx before migration: $BEFORE_COUNT"

# List of files to update
FILES_TO_UPDATE=$(find . -type f \( -name "*.sh" -o -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.js" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/fraud-checker/*" \
    -not -path "*/infra_fraud-checker/*" \
    -not -path "*/.venv/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -path "*/coverage/*" \
    -exec grep -l "bunx " {} \; 2>/dev/null)

UPDATED_COUNT=0

for file in $FILES_TO_UPDATE; do
    # Skip if file doesn't exist
    [ ! -f "$file" ] && continue
    
    # Create backup
    cp "$file" "$file.bak.npx"
    
    # Replace bunx with bunx
    sed -i 's/\bnpx /bunx /g' "$file"
    
    # Check if file was actually modified
    if ! diff -q "$file" "$file.bak.npx" > /dev/null; then
        echo "✅ Updated: $file"
        UPDATED_COUNT=$((UPDATED_COUNT + 1))
        # Remove backup if successful
        rm "$file.bak.npx"
    else
        # Restore if no changes
        rm "$file.bak.npx"
    fi
done

# Count files after migration
AFTER_COUNT=$(find . -type f \( -name "*.sh" -o -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.js" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/fraud-checker/*" \
    -not -path "*/infra_fraud-checker/*" \
    -exec grep -l "bunx " {} \; 2>/dev/null | wc -l)

echo ""
echo "📊 Migration Summary:"
echo "  Files before: $BEFORE_COUNT"
echo "  Files updated: $UPDATED_COUNT"
echo "  Files after: $AFTER_COUNT"
echo ""

if [ $AFTER_COUNT -eq 0 ]; then
    echo "🎉 Migration complete! All bunx commands have been replaced with bunx."
else
    echo "⚠️  $AFTER_COUNT files still contain bunx (likely in fraud-checker or were skipped)"
fi