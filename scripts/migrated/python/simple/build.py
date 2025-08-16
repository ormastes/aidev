#!/usr/bin/env python3
"""
Migrated from: build.sh
Auto-generated Python - 2025-08-16T04:57:27.588Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    subprocess.run("set -e", shell=True)
    # Clean previous build
    shutil.rmtree("build", ignore_errors=True)
    Path("build").mkdir(parents=True, exist_ok=True)
    os.chdir("build")
    # Set compilers if not already set
    os.environ["CC"] = "${CC:-clang}"
    os.environ["CXX"] = "${CXX:-clang++}"
    # Install dependencies with Conan (if conanfile.txt has dependencies)
    subprocess.run("if command -v conan &> /dev/null; then", shell=True)
    subprocess.run("conan install .. --build=missing", shell=True)
    # Configure with CMake using Ninja generator
    subprocess.run("if command -v ninja &> /dev/null; then", shell=True)
    subprocess.run("cmake .. -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=$CC -DCMAKE_CXX_COMPILER=$CXX", shell=True)
    subprocess.run("ninja", shell=True)
    else:
    subprocess.run("cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=$CC -DCMAKE_CXX_COMPILER=$CXX", shell=True)
    subprocess.run("make -j$(nproc)", shell=True)
    print("Build complete. Executable: build/hello")

if __name__ == "__main__":
    main()