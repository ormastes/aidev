#!/usr/bin/env python3
"""
Migrated from: lint.sh
Auto-generated Python - 2025-08-16T04:57:27.588Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Lint and format Python code
    subprocess.run("set -e", shell=True)
    # Activate virtual environment if not already activated
    if [ "$VIRTUAL_ENV" == "" ]:; then
    if [ -f .venv/bin/activate ]:; then
    subprocess.run("source .venv/bin/activate", shell=True)
    else:
    print("Virtual environment not found. Run setup.sh first.")
    sys.exit(1)
    print("Running Python linters and formatters...")
    # Format with black
    print("Formatting with black...")
    subprocess.run("black src tests features --check --diff", shell=True)
    # Lint with ruff
    print("Linting with ruff...")
    subprocess.run("ruff check src tests features", shell=True)
    # Type check with mypy
    print("Type checking with mypy...")
    subprocess.run("mypy src", shell=True)
    print("Linting complete!")

if __name__ == "__main__":
    main()