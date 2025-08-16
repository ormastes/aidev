#!/usr/bin/env python3
"""
Migrated from: setup.sh
Auto-generated Python - 2025-08-16T04:57:27.627Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Setup Python environment with uv
    subprocess.run("set -e", shell=True)
    print("Setting up Python environment...")
    # Check if uv is installed
    subprocess.run("if ! command -v uv &> /dev/null; then", shell=True)
    print("Installing uv...")
    subprocess.run("curl -LsSf https://astral.sh/uv/install.sh | sh", shell=True)
    subprocess.run("source $HOME/.local/bin/env", shell=True)
    # Create virtual environment
    print("Creating virtual environment...")
    subprocess.run("uv venv", shell=True)
    # Install dependencies
    print("Installing dependencies...")
    subprocess.run("uv uv pip install -e .", shell=True)
    subprocess.run("uv uv pip install -e ".[dev,test,docs]"", shell=True)
    print("Python environment setup complete!")
    print("Activate with: source .venv/bin/activate")

if __name__ == "__main__":
    main()