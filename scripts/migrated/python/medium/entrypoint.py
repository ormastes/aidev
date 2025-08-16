#!/usr/bin/env python3
"""
Migrated from: entrypoint.sh
Auto-generated Python - 2025-08-16T04:57:27.628Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    subprocess.run("set -e", shell=True)
    print("Python Test Environment")
    print("Python version: $(python --version)")
    print("pip version: $(pip --version)")
    print("uv version: $(uv --version 2>/dev/null || echo 'not installed')")
    # Execute passed command or default
    if $# -eq 0 :; then
    print("Running default tests...")
    os.chdir("/workspace")
    subprocess.run("./run_system_tests.sh --filter python", shell=True)
    else:
    subprocess.run("exec "$@"", shell=True)

if __name__ == "__main__":
    main()