#!/usr/bin/env python3
"""
Migrated from: install_cpp_tools.sh
Auto-generated Python - 2025-08-16T04:57:27.785Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    subprocess.run("set -e", shell=True)
    print("Installing C++ development tools...")
    # Update package list
    subprocess.run("sudo apt-get update", shell=True)
    # Install Clang
    subprocess.run("if ! command -v clang &> /dev/null; then", shell=True)
    print("Installing Clang...")
    subprocess.run("sudo apt-get install -y clang clang-tools", shell=True)
    else:
    print("Clang already installed: $(clang --version | head -n1)")
    # Install CMake
    subprocess.run("if ! command -v cmake &> /dev/null; then", shell=True)
    print("Installing CMake...")
    subprocess.run("sudo apt-get install -y cmake", shell=True)
    else:
    print("CMake already installed: $(cmake --version | head -n1)")
    # Install Ninja
    subprocess.run("if ! command -v ninja &> /dev/null; then", shell=True)
    print("Installing Ninja...")
    subprocess.run("sudo apt-get install -y ninja-build", shell=True)
    else:
    print("Ninja already installed: $(ninja --version)")
    # Install Conan
    subprocess.run("if ! command -v conan &> /dev/null; then", shell=True)
    print("Installing Conan...")
    subprocess.run("pip install --user conan", shell=True)
    print("'export PATH=")$HOME/.local/bin:$PATH"' >> ~/.bashrc
    os.environ["PATH"] = ""$HOME/.local/bin:$PATH""
    else:
    print("Conan already installed: $(conan --version)")
    # Install mold linker
    subprocess.run("if ! command -v mold &> /dev/null; then", shell=True)
    print("Installing mold linker from source...")
    # Install dependencies
    subprocess.run("sudo apt-get install -y build-essential git cmake libssl-dev libxxhash-dev zlib1g-dev", shell=True)
    # Clone and build mold
    os.chdir("/tmp")
    subprocess.run("git clone https://github.com/rui314/mold.git", shell=True)
    os.chdir("mold")
    subprocess.run("git checkout v2.4.0  # Use stable version", shell=True)
    subprocess.run("cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=c++", shell=True)
    subprocess.run("cmake --build build -j$(nproc)", shell=True)
    subprocess.run("sudo cmake --install build", shell=True)
    os.chdir("/")
    shutil.rmtree("/tmp/mold", ignore_errors=True)
    else:
    print("mold already installed: $(mold --version | head -n1)")
    print("\nInstallation complete!")
    print("Installed tools:")
    subprocess.run("clang --version | head -n1", shell=True)
    subprocess.run("cmake --version | head -n1", shell=True)
    print("Ninja: $(ninja --version)")
    subprocess.run("conan --version 2>/dev/null || echo "Conan: not in PATH (may need to restart shell)"", shell=True)
    subprocess.run("mold --version 2>/dev/null | head -n1 || echo "mold: installation may have failed"", shell=True)
    print("\nNote: You may need to restart your shell or run 'source ~/.bashrc' for PATH updates.")

if __name__ == "__main__":
    main()