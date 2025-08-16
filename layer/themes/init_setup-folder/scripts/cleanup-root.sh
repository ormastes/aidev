#!/bin/bash

# Root Directory Cleanup Script
# Ensures all files are in their proper locations according to FILE_STRUCTURE.vf.json

echo "🧹 Starting root directory cleanup..."

# Create necessary directories
mkdir -p gen/doc
mkdir -p gen/test-output
mkdir -p gen/test-results
mkdir -p config/python
mkdir -p deploy
mkdir -p scripts/cli

# Move documentation files to gen/doc
echo "📄 Moving documentation files..."
for file in FEATURE_STATUS_REPORT.md FINAL_IMPLEMENTATION_REPORT.md INFRASTRUCTURE_IMPLEMENTATION.md PLATFORM_STATUS.md; do
    [ -f "$file" ] && mv "$file" gen/doc/ && echo "  ✓ Moved $file"
done

# Move any other reports or status files
find . -maxdepth 1 -name "*REPORT*.md" -exec mv {} gen/doc/ \; 2>/dev/null
find . -maxdepth 1 -name "*STATUS*.md" -exec mv {} gen/doc/ \; 2>/dev/null
find . -maxdepth 1 -name "*IMPLEMENTATION*.md" -exec mv {} gen/doc/ \; 2>/dev/null

# Move Python config files (only if they're not needed in root)
echo "🐍 Checking Python configuration files..."
if [ -f "Makefile.python" ]; then
    rm -f Makefile.python
    echo "  ✓ Removed Makefile.python (duplicate)"
fi

# Remove duplicate directories
echo "📁 Removing duplicate directories..."
[ -d "aidev" ] && rm -rf aidev/ && echo "  ✓ Removed duplicate aidev/ directory"
[ -d "playwright-tests" ] && rm -rf playwright-tests/ && echo "  ✓ Removed playwright-tests/"

# Move deployment configs
echo "🚀 Organizing deployment configs..."
if [ -d "helm" ] || [ -d "k8s" ]; then
    mkdir -p deploy
    [ -d "helm" ] && mv helm deploy/ && echo "  ✓ Moved helm/ to deploy/"
    [ -d "k8s" ] && mv k8s deploy/ && echo "  ✓ Moved k8s/ to deploy/"
fi

# Move test outputs
echo "🧪 Moving test outputs..."
[ -d "test-output" ] && mv test-output gen/ && echo "  ✓ Moved test-output/"
[ -d "test-results" ] && mv test-results gen/ && echo "  ✓ Moved test-results/"

# Clean up TypeScript files
echo "📝 Moving TypeScript files..."
[ -f "aidev-cli.ts" ] && mv aidev-cli.ts scripts/cli/ && echo "  ✓ Moved aidev-cli.ts"

# Remove duplicate ConfigManager files
echo "🔧 Removing duplicate files..."
for ext in ts js d.ts d.ts.map js.map; do
    [ -f "ConfigManager.$ext" ] && rm -f "ConfigManager.$ext" && echo "  ✓ Removed ConfigManager.$ext"
done

# Remove unnecessary config files
[ -f "bunfig.toml" ] && rm -f bunfig.toml && echo "  ✓ Removed bunfig.toml"

# Clean setup directory
[ -d "setup/theme_storage" ] && rm -rf setup/theme_storage && echo "  ✓ Removed setup/theme_storage"

# List remaining files in root (for review)
echo ""
echo "📊 Files remaining in root directory:"
echo "===================================="
ls -la | grep -E "^-" | awk '{print "  • " $9}'

echo ""
echo "📁 Directories in root:"
echo "======================"
ls -la | grep -E "^d" | grep -v "^\." | awk '{print "  • " $9}'

echo ""
echo "✅ Root cleanup complete!"
echo ""
echo "Note: Some files MUST remain in root for tooling:"
echo "  • package.json (if using Node.js)"
echo "  • pyproject.toml (might need to stay for Python tools)"
echo "  • .gitignore and other dot files"
echo "  • Core vf.json files (FEATURE, TASK_QUEUE, etc.)"