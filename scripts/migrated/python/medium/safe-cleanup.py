#!/usr/bin/env python3
"""
Migrated from: safe-cleanup.sh
Auto-generated Python - 2025-08-16T04:57:27.621Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Safe cleanup script for compiled files
    # Only removes .js/.d.ts files where .ts source exists
    print("🧹 Starting safe cleanup of compiled files...")
    # Counter
    subprocess.run("count=0", shell=True)
    # Find and remove compiled files
    for file in [$(find . -type f \( -name "*.js" -o -name "*.d.ts" -o -name "*.js.map" -o -name "*.d.ts.map" \) 2>/dev/null); do]:
    # Skip node_modules
    if [ $file == *"node_modules"* ]:; then
    subprocess.run("continue", shell=True)
    # Skip dist directories
    if [ $file == *"/dist/"* ]:; then
    subprocess.run("continue", shell=True)
    # Get base name without extension
    subprocess.run("base="${file%.js}"", shell=True)
    subprocess.run("base="${base%.d.ts}"", shell=True)
    subprocess.run("base="${base%.map}"", shell=True)
    subprocess.run("base="${base%.d}"", shell=True)
    # Check if TypeScript source exists
    if -f "${base}.ts" ] || [ -f "${base}.tsx" :; then
    print("Removing: $file")
    subprocess.run("rm "$file"", shell=True)
    subprocess.run("((count++))", shell=True)
    print("✅ Removed $count compiled files")

if __name__ == "__main__":
    main()