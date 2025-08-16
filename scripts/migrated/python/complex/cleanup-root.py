#!/usr/bin/env python3
"""
Migrated from: cleanup-root.sh
Auto-generated Python - 2025-08-16T04:57:27.783Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Root Directory Cleanup Script
    # Ensures all files are in their proper locations according to FILE_STRUCTURE.vf.json
    print("🧹 Starting root directory cleanup...")
    # Create necessary directories
    Path("gen/doc").mkdir(parents=True, exist_ok=True)
    Path("gen/test-output").mkdir(parents=True, exist_ok=True)
    Path("gen/test-results").mkdir(parents=True, exist_ok=True)
    Path("config/python").mkdir(parents=True, exist_ok=True)
    Path("deploy").mkdir(parents=True, exist_ok=True)
    Path("scripts/cli").mkdir(parents=True, exist_ok=True)
    # Move documentation files to gen/doc
    print("📄 Moving documentation files...")
    for file in [FEATURE_STATUS_REPORT.md FINAL_IMPLEMENTATION_REPORT.md INFRASTRUCTURE_IMPLEMENTATION.md PLATFORM_STATUS.md; do]:
    subprocess.run("[ -f "$file" ] && mv "$file" gen/doc/ && echo "  ✓ Moved $file"", shell=True)
    # Move any other reports or status files
    subprocess.run("find . -maxdepth 1 -name "*REPORT*.md" -exec mv {} gen/doc/ \; 2>/dev/null", shell=True)
    subprocess.run("find . -maxdepth 1 -name "*STATUS*.md" -exec mv {} gen/doc/ \; 2>/dev/null", shell=True)
    subprocess.run("find . -maxdepth 1 -name "*IMPLEMENTATION*.md" -exec mv {} gen/doc/ \; 2>/dev/null", shell=True)
    # Move Python config files (only if they're not needed in root)
    print("🐍 Checking Python configuration files...")
    if -f "Makefile.python" :; then
    subprocess.run("rm -f Makefile.python", shell=True)
    print("  ✓ Removed Makefile.python (duplicate)")
    # Remove duplicate directories
    print("📁 Removing duplicate directories...")
    subprocess.run("[ -d "aidev" ] && rm -rf aidev/ && echo "  ✓ Removed duplicate aidev/ directory"", shell=True)
    subprocess.run("[ -d "playwright-tests" ] && rm -rf playwright-tests/ && echo "  ✓ Removed playwright-tests/"", shell=True)
    # Move deployment configs
    print("🚀 Organizing deployment configs...")
    if -d "helm" ] || [ -d "k8s" :; then
    Path("deploy").mkdir(parents=True, exist_ok=True)
    subprocess.run("[ -d "helm" ] && mv helm deploy/ && echo "  ✓ Moved helm/ to deploy/"", shell=True)
    subprocess.run("[ -d "k8s" ] && mv k8s deploy/ && echo "  ✓ Moved k8s/ to deploy/"", shell=True)
    # Move test outputs
    print("🧪 Moving test outputs...")
    subprocess.run("[ -d "test-output" ] && mv test-output gen/ && echo "  ✓ Moved test-output/"", shell=True)
    subprocess.run("[ -d "test-results" ] && mv test-results gen/ && echo "  ✓ Moved test-results/"", shell=True)
    # Clean up TypeScript files
    print("📝 Moving TypeScript files...")
    subprocess.run("[ -f "aidev-cli.ts" ] && mv aidev-cli.ts scripts/cli/ && echo "  ✓ Moved aidev-cli.ts"", shell=True)
    # Remove duplicate ConfigManager files
    print("🔧 Removing duplicate files...")
    for ext in [ts js d.ts d.ts.map js.map; do]:
    subprocess.run("[ -f "ConfigManager.$ext" ] && rm -f "ConfigManager.$ext" && echo "  ✓ Removed ConfigManager.$ext"", shell=True)
    # Remove unnecessary config files
    subprocess.run("[ -f "bunfig.toml" ] && rm -f bunfig.toml && echo "  ✓ Removed bunfig.toml"", shell=True)
    # Clean setup directory
    subprocess.run("[ -d "setup/theme_storage" ] && rm -rf setup/theme_storage && echo "  ✓ Removed setup/theme_storage"", shell=True)
    # List remaining files in root (for review)
    print("")
    print("📊 Files remaining in root directory:")
    print("====================================")
    subprocess.run("ls -la | grep -E "^-" | awk '{print "  • " $9}'", shell=True)
    print("")
    print("📁 Directories in root:")
    print("======================")
    subprocess.run("ls -la | grep -E "^d" | grep -v "^\." | awk '{print "  • " $9}'", shell=True)
    print("")
    print("✅ Root cleanup complete!")
    print("")
    print("Note: Some files MUST remain in root for tooling:")
    print("  • package.json (if using Node.js)")
    print("  • pyproject.toml (might need to stay for Python tools)")
    print("  • .gitignore and other dot files")
    print("  • Core vf.json files (FEATURE, TASK_QUEUE, etc.)")

if __name__ == "__main__":
    main()