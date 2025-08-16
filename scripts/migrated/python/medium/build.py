#!/usr/bin/env python3
"""
Migrated from: build.sh
Auto-generated Python - 2025-08-16T04:57:27.624Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Build Python package
    subprocess.run("set -e", shell=True)
    # Activate virtual environment if not already activated
    if [ "$VIRTUAL_ENV" == "" ]:; then
    if [ -f .venv/bin/activate ]:; then
    subprocess.run("source .venv/bin/activate", shell=True)
    else:
    print("Virtual environment not found. Run setup.sh first.")
    sys.exit(1)
    print("Building Python package...")
    # Clean previous builds
    shutil.rmtree("dist build *.egg-info", ignore_errors=True)
    # Install build tools if not present
    subprocess.run("uv uv pip install --quiet build", shell=True)
    # Build the package
    subprocess.run("python -m build", shell=True)
    print("Package built successfully!")
    print("Distribution files available in dist/")
    subprocess.run("ls -la dist/", shell=True)

if __name__ == "__main__":
    main()