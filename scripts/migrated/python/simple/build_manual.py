#!/usr/bin/env python3
"""
Migrated from: build_manual.sh
Auto-generated Python - 2025-08-16T04:57:27.586Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Manual build script for bypass-build-demo (when cmake is not available)
    print("=== Manual Build Script for Bypass Build Demo ===")
    # Create build directory
    Path("build").mkdir(parents=True, exist_ok=True)
    os.chdir("build")
    print("Building hello_world executable...")
    subprocess.run("g++ -std=c++17 -I../include ../src/main.cpp ../src/hello.cpp -o hello_world", shell=True)
    print("Building hello_tests executable...")
    subprocess.run("g++ -std=c++17 -I../include ../src/test_main.cpp ../src/hello.cpp -o hello_tests", shell=True)
    print("Testing executables...")
    print("--- Testing hello_world ---")
    subprocess.run("./hello_world", shell=True)
    print("")
    print("--- Testing hello_tests (list tests) ---")
    subprocess.run("./hello_tests GetTcList:", shell=True)
    print("")
    print("--- Testing hello_tests (run specific test) ---")
    subprocess.run("./hello_tests "TC/HelloSuite::BasicGreeting"", shell=True)
    print("")
    print("=== Build and Test Complete ===")
    print("Executables created:")
    subprocess.run("ls -la hello_world hello_tests", shell=True)

if __name__ == "__main__":
    main()