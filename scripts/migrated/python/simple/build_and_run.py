#!/usr/bin/env python3
"""
Migrated from: build_and_run.sh
Auto-generated Python - 2025-08-16T04:57:27.583Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Build and run Cucumber-CPP examples
    print("============================================")
    print("  Building Cucumber-CPP Examples")
    print("============================================")
    # Create build directory
    Path("build").mkdir(parents=True, exist_ok=True)
    os.chdir("build")
    # Configure with CMake
    print("Configuring with CMake...")
    subprocess.run("cmake ..", shell=True)
    # Build the examples
    print("Building examples...")
    subprocess.run("make -j4", shell=True)
    print("")
    print("============================================")
    print("  Running Simple Demo")
    print("============================================")
    if -f simple_demo :; then
    subprocess.run("./simple_demo", shell=True)
    else:
    print("simple_demo not found, building separately...")
    subprocess.run("g++ -std=c++17 ../simple_demo.cpp ../../src/gherkin_parser.cpp ../../src/manual_generator.cpp -I../../include -o simple_demo", shell=True)
    subprocess.run("./simple_demo", shell=True)
    print("")
    print("============================================")
    print("  Running Manual Test Generator")
    print("============================================")
    if -f manual_test_example :; then
    subprocess.run("./manual_test_example", shell=True)
    else:
    print("Manual test example not built")
    print("")
    print("============================================")
    print("  Generated Files")
    print("============================================")
    subprocess.run("ls -la *.md *.html *.json 2>/dev/null || echo "No documentation files generated yet"", shell=True)
    print("")
    print("============================================")
    print("  Build Complete!")
    print("============================================")

if __name__ == "__main__":
    main()