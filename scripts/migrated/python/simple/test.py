#!/usr/bin/env python3
"""
Migrated from: test.sh
Auto-generated Python - 2025-08-16T04:57:27.587Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    subprocess.run("set -e", shell=True)
    # Build with new toolchain
    subprocess.run("./build.sh", shell=True)
    # Run the executable
    if -f build/hello :; then
    subprocess.run("output=$(./build/hello)", shell=True)
    elif -f hello :; then
    # Fallback to old Makefile build
    subprocess.run("make clean && make", shell=True)
    subprocess.run("output=$(./hello)", shell=True)
    else:
    print("Error: No executable found")
    sys.exit(1)
    subprocess.run("if echo "$output" | grep -q "Hello from C++"; then", shell=True)
    print("Test passed!")
    sys.exit(0)
    else:
    print("Test failed!")
    sys.exit(1)

if __name__ == "__main__":
    main()