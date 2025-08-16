#!/usr/bin/env python3
"""
Migrated from: install-uv.sh
Auto-generated Python - 2025-08-16T04:57:27.615Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # UV Installation Script
    # Installs UV - the fast Python package installer and resolver
    subprocess.run("set -e", shell=True)
    print("Installing UV Python package manager...")
    # Detect OS
    subprocess.run("OS="$(uname -s)"", shell=True)
    subprocess.run("ARCH="$(uname -m)"", shell=True)
    # Check if UV is already installed
    subprocess.run("if command -v uv &> /dev/null; then", shell=True)
    print("UV is already installed: $(uv --version)")
    sys.exit(0)
    # Install UV using the official installer
    print("Downloading and installing UV...")
    if "$OS" = "Darwin" ] || [ "$OS" = "Linux" :; then
    # Unix-like systems
    subprocess.run("curl -LsSf https://astral.sh/uv/install.sh | sh", shell=True)
    # Add to PATH if not already there
    if [ ":$PATH:" != *":$HOME/.cargo/bin:"* ]:; then
    print("'export PATH=")$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
    print("'export PATH=")$HOME/.cargo/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
    os.environ["PATH"] = ""$HOME/.cargo/bin:$PATH""
    elif "$OS" = "Windows_NT" :; then
    # Windows (Git Bash/WSL)
    subprocess.run("powershell -c "irm https://astral.sh/uv/install.ps1 | iex"", shell=True)
    else:
    print("Unsupported operating system: $OS")
    print("Please install UV manually from: https://github.com/astral-sh/uv")
    sys.exit(1)
    # Verify installation
    subprocess.run("if command -v uv &> /dev/null; then", shell=True)
    print("UV successfully installed: $(uv --version)")
    # Configure UV settings
    print("Configuring UV...")
    subprocess.run("uv config set python-preference only-managed", shell=True)
    subprocess.run("uv config set cache-dir .uv-cache", shell=True)
    print("UV installation complete!")
    else:
    print("UV installation failed. Please install manually from: https://github.com/astral-sh/uv")
    sys.exit(1)

if __name__ == "__main__":
    main()