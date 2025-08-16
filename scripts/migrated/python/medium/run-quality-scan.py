#!/usr/bin/env python3
"""
Migrated from: run-quality-scan.sh
Auto-generated Python - 2025-08-16T04:57:27.626Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Run Project Quality Scanner
    # This script runs the comprehensive quality and fraud detection scanner
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("THEME_DIR="$(dirname "$SCRIPT_DIR")"", shell=True)
    subprocess.run("PROJECT_ROOT="$(cd "$THEME_DIR/../../../.." && pwd)"", shell=True)
    print("🔍 Project Quality Scanner")
    print("=========================")
    print("Project Root: $PROJECT_ROOT")
    print("")
    # Change to project root
    os.chdir(""$PROJECT_ROOT"")
    # Check if ts-node is available
    subprocess.run("if ! command -v ts-node &> /dev/null; then", shell=True)
    print("⚠️  ts-node not found. Installing...")
    subprocess.run("npm install -g ts-node typescript", shell=True)
    # Run the scanner
    print("Starting comprehensive project scan...")
    subprocess.run("ts-node "$THEME_DIR/src/cli/project-quality-scanner.ts" "$@"", shell=True)
    subprocess.run("exit $?", shell=True)

if __name__ == "__main__":
    main()