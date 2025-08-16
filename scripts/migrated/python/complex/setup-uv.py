#!/usr/bin/env python3
"""
Migrated from: setup-uv.sh
Auto-generated Python - 2025-08-16T04:57:27.794Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Setup script for Explorer project using uv
    # Migrates from pip to uv for Python dependency management
    subprocess.run("set -e", shell=True)
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    print("==========================================")
    print("   Explorer Setup with UV")
    print("==========================================")
    # Check if uv is installed
    subprocess.run("if ! command -v uv &> /dev/null; then", shell=True)
    print("📦 Installing uv...")
    subprocess.run("curl -LsSf https://astral.sh/uv/install.sh | sh", shell=True)
    subprocess.run("source "$HOME/.cargo/env"", shell=True)
    print("✅ UV is available: $(uv --version)")
    # Create virtual environment
    print("🔧 Creating virtual environment...")
    subprocess.run("uv venv", shell=True)
    # Activate virtual environment
    subprocess.run("source .venv/bin/activate", shell=True)
    # Install dependencies from pyproject.toml
    print("📦 Installing dependencies...")
    subprocess.run("uv pip install -e .", shell=True)
    # Install development dependencies
    print("📦 Installing development dependencies...")
    subprocess.run("uv pip install -e ".[dev]"", shell=True)
    # Verify installation
    print("")
    print("🔍 Verifying installation...")
    subprocess.run("python3 -c "import mcp; print('✅ MCP SDK installed')"", shell=True)
    subprocess.run("python3 -c "import yaml; print('✅ PyYAML installed')"", shell=True)
    print("")
    print("==========================================")
    print("✅ Explorer setup complete with UV!")
    print("")
    print("To activate the environment, run:")
    print("  source $SCRIPT_DIR/.venv/bin/activate")
    print("")
    print("To run Explorer:")
    print("  python3 scripts/explorer.py")
    print("==========================================")

if __name__ == "__main__":
    main()