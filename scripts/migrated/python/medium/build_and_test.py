#!/usr/bin/env python3
"""
Migrated from: build_and_test.sh
Auto-generated Python - 2025-08-16T04:57:27.607Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Build and test script for GTest CTest demo
    print("=== GTest CTest Integration Demo ===")
    subprocess.run("echo", shell=True)
    # Check if build directory exists
    if -d "build" :; then
    print("Cleaning existing build directory...")
    shutil.rmtree("build", ignore_errors=True)
    # Create build directory
    print("Creating build directory...")
    subprocess.run("mkdir build", shell=True)
    os.chdir("build")
    # Configure with CMake
    print("Configuring with CMake...")
    subprocess.run("cmake .. -DCMAKE_BUILD_TYPE=Debug", shell=True)
    # Build the project
    print("Building project...")
    subprocess.run("cmake --build . --config Debug", shell=True)
    # List available tests
    subprocess.run("echo", shell=True)
    print("=== Available CTest tests ===")
    subprocess.run("ctest --show-only=json-v1 | python3 -m json.tool | grep -E '"name"|"command"' | head -20", shell=True)
    # Run all tests
    subprocess.run("echo", shell=True)
    print("=== Running all tests ===")
    subprocess.run("ctest --output-on-failure -V", shell=True)
    # Run specific test by name
    subprocess.run("echo", shell=True)
    print("=== Running specific test: MathOperationsTest.AddPositiveNumbers ===")
    subprocess.run("ctest -R "MathOperationsTest.AddPositiveNumbers" -V", shell=True)
    # Show test results summary
    subprocess.run("echo", shell=True)
    print("=== Test Summary ===")
    subprocess.run("ctest --show-only=json-v1 | python3 -c "", shell=True)
    subprocess.run("import json", shell=True)
    subprocess.run("import sys", shell=True)
    subprocess.run("data = json.load(sys.stdin)", shell=True)
    subprocess.run("if 'tests' in data:", shell=True)
    subprocess.run("print(f'Total tests discovered: {len(data[\"tests\"])}')", shell=True)
    subprocess.run("suites = set()", shell=True)
    for test in [data['tests']:]:
    subprocess.run("if '.' in test['name']:", shell=True)
    subprocess.run("suite = test['name'].split('.')[0]", shell=True)
    subprocess.run("suites.add(suite)", shell=True)
    subprocess.run("print(f'Test suites: {len(suites)}')", shell=True)
    for suite in [sorted(suites):]:
    subprocess.run("suite_tests = [t for t in data['tests'] if t['name'].startswith(suite + '.')]", shell=True)
    subprocess.run("print(f'  - {suite}: {len(suite_tests)} tests')", shell=True)
    subprocess.run(""", shell=True)
    subprocess.run("echo", shell=True)
    print("=== Demo complete ===")
    print("To use with VSCode extension:")
    print("1. Open the demo/gtest-example folder in VSCode")
    print("2. Open Test Explorer (testing icon in sidebar)")
    print("3. Look for 'CTest GTest' controller")
    print("4. Click refresh to discover tests")
    print("5. Run individual tests or all tests")

if __name__ == "__main__":
    main()