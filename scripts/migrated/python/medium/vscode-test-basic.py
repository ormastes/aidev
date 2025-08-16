#!/usr/bin/env python3
"""
Migrated from: vscode-test-basic.sh
Auto-generated Python - 2025-08-16T04:57:27.629Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Open VS Code Server for test-basic
    subprocess.run("URL="http://localhost:8080"", shell=True)
    print("Opening VS Code Server at: $URL")
    print("Default password: changeme")
    print("")
    # Try to open in browser
    subprocess.run("if command -v xdg-open > /dev/null; then", shell=True)
    subprocess.run("xdg-open "$URL"", shell=True)
    subprocess.run("elif command -v open > /dev/null; then", shell=True)
    subprocess.run("open "$URL"", shell=True)
    else:
    print("Please open your browser and navigate to: $URL")

if __name__ == "__main__":
    main()