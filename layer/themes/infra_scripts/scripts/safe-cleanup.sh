#!/bin/bash

# Safe cleanup script for compiled files
# Only removes .js/.d.ts files where .ts source exists

echo "🧹 Starting safe cleanup of compiled files..."

# Counter
count=0

# Find and remove compiled files
for file in $(find . -type f \( -name "*.js" -o -name "*.d.ts" -o -name "*.js.map" -o -name "*.d.ts.map" \) 2>/dev/null); do
    # Skip node_modules
    if [[ $file == *"node_modules"* ]]; then
        continue
    fi
    
    # Skip dist directories
    if [[ $file == *"/dist/"* ]]; then
        continue
    fi
    
    # Get base name without extension
    base="${file%.js}"
    base="${base%.d.ts}"
    base="${base%.map}"
    base="${base%.d}"
    
    # Check if TypeScript source exists
    if [ -f "${base}.ts" ] || [ -f "${base}.tsx" ]; then
        echo "Removing: $file"
        rm "$file"
        ((count++))
    fi
done

echo "✅ Removed $count compiled files"