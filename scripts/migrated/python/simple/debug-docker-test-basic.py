#!/usr/bin/env python3
"""
Migrated from: debug-docker-test-basic.sh
Auto-generated Python - 2025-08-16T04:57:27.590Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Docker remote debugging script for test-basic
    print("=== Docker Remote Debugging ===")
    print("")
    print("1. SSH Debug:")
    print("   ssh -p 2222 root@localhost")
    print("   gdb /workspace/program")
    print("")
    print("2. Remote GDB:")
    print("   gdb -ex 'target remote :1234'")
    print("")
    print("3. VS Code Debug:")
    print("   Open http://localhost:8080")
    print("   Install C++ extension")
    print("   Press F5 to start debugging")
    print("")
    # Connect to GDB server
    subprocess.run("gdb -ex "target remote localhost:1234"", shell=True)

if __name__ == "__main__":
    main()