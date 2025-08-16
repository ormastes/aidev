#!/usr/bin/env python3
"""
Migrated from: verify-build.sh
Auto-generated Python - 2025-08-16T04:57:27.618Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Verify the CLI framework build
    subprocess.run("set -e", shell=True)
    print("Verifying CLI Framework Build...")
    subprocess.run("echo", shell=True)
    # Check if build was successful
    if -d "dist" :; then
    print("✓ Build directory exists")
    else:
    print("✗ Build directory not found")
    sys.exit(1)
    # Check main files
    subprocess.run("files=(", shell=True)
    subprocess.run(""dist/index.js"", shell=True)
    subprocess.run(""dist/index.d.ts"", shell=True)
    subprocess.run(""dist/domain/command.js"", shell=True)
    subprocess.run(""dist/domain/types.js"", shell=True)
    subprocess.run(""dist/application/cli.js"", shell=True)
    subprocess.run(""dist/application/parser.js"", shell=True)
    subprocess.run(""dist/utils/string.js"", shell=True)
    subprocess.run(")", shell=True)
    for file in ["${files[@]}"; do]:
    if -f "$file" :; then
    print("✓ $file exists")
    else:
    print("✗ $file not found")
    sys.exit(1)
    subprocess.run("echo", shell=True)
    print("✓ All build artifacts verified!")

if __name__ == "__main__":
    main()