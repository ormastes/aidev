#!/usr/bin/env python3
"""
Migrated from: entrypoint.sh
Auto-generated Python - 2025-08-16T04:57:27.594Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    subprocess.run("set -e", shell=True)
    print("GUI Test Environment")
    print("Display: $DISPLAY")
    print("X11 status: $(xdpyinfo -display $DISPLAY 2>/dev/null | head -n1 || echo 'not running')")
    # Start window manager
    subprocess.run("fluxbox &", shell=True)
    # Execute passed command or default
    if $# -eq 0 :; then
    print("Running default GUI tests...")
    os.chdir("/workspace")
    subprocess.run("./run_system_tests.sh --filter gui", shell=True)
    else:
    subprocess.run("exec "$@"", shell=True)

if __name__ == "__main__":
    main()