#!/usr/bin/env python3
"""
Migrated from: install-tools.sh
Auto-generated Python - 2025-08-16T04:57:27.710Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # #
    # Install external tools required for circular dependency detection
    # #
    subprocess.run("set -e", shell=True)
    print("🔧 Installing Circular Dependency Detection Tools...")
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Function to print colored output
    subprocess.run("print_status() {", shell=True)
    print("-e ")${BLUE}[INFO]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("print_success() {", shell=True)
    print("-e ")${GREEN}[SUCCESS]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("print_warning() {", shell=True)
    print("-e ")${YELLOW}[WARNING]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("print_error() {", shell=True)
    print("-e ")${RED}[ERROR]${NC} $1"
    subprocess.run("}", shell=True)
    # Check if command exists
    subprocess.run("command_exists() {", shell=True)
    subprocess.run("command -v "$1" >/dev/null 2>&1", shell=True)
    subprocess.run("}", shell=True)
    # Install Node.js tools
    subprocess.run("install_node_tools() {", shell=True)
    subprocess.run("print_status "Installing Node.js tools..."", shell=True)
    subprocess.run("if ! command_exists npm; then", shell=True)
    subprocess.run("print_error "npm not found. Please install Node.js first."", shell=True)
    subprocess.run("return 1", shell=True)
    # Install global tools
    subprocess.run("npm install -g madge dependency-cruiser", shell=True)
    # Try to install ds tool
    subprocess.run("if npm install -g ds 2>/dev/null; then", shell=True)
    subprocess.run("print_success "ds tool installed"", shell=True)
    else:
    subprocess.run("print_warning "Failed to install ds tool (optional)"", shell=True)
    subprocess.run("print_success "Node.js tools installed"", shell=True)
    subprocess.run("}", shell=True)
    # Install Python tools
    subprocess.run("install_python_tools() {", shell=True)
    subprocess.run("print_status "Installing Python tools..."", shell=True)
    # Try different Python package managers
    subprocess.run("if command_exists pip3; then", shell=True)
    subprocess.run("PIP_CMD="pip3"", shell=True)
    subprocess.run("elif command_exists pip; then", shell=True)
    subprocess.run("PIP_CMD="pip"", shell=True)
    else:
    subprocess.run("print_error "pip not found. Please install Python and pip first."", shell=True)
    subprocess.run("return 1", shell=True)
    # Install Python tools
    subprocess.run("$PIP_CMD install --user pylint pycycle || print_warning "Some Python tools failed to install"", shell=True)
    # Try to install circular-imports
    subprocess.run("if $PIP_CMD install --user circular-imports 2>/dev/null; then", shell=True)
    subprocess.run("print_success "circular-imports tool installed"", shell=True)
    else:
    subprocess.run("print_warning "circular-imports tool not available (optional)"", shell=True)
    subprocess.run("print_success "Python tools installed"", shell=True)
    subprocess.run("}", shell=True)
    # Install C++ tools
    subprocess.run("install_cpp_tools() {", shell=True)
    subprocess.run("print_status "Installing C++ tools..."", shell=True)
    # Check for package managers
    subprocess.run("if command_exists apt-get; then", shell=True)
    # Ubuntu/Debian
    subprocess.run("print_status "Detected Debian-based system, installing clang-tidy..."", shell=True)
    subprocess.run("sudo apt-get update", shell=True)
    subprocess.run("sudo apt-get install -y clang-tidy", shell=True)
    subprocess.run("elif command_exists yum; then", shell=True)
    # RHEL/CentOS/Fedora
    subprocess.run("print_status "Detected RHEL-based system, installing clang-tools-extra..."", shell=True)
    subprocess.run("sudo yum install -y clang-tools-extra", shell=True)
    subprocess.run("elif command_exists brew; then", shell=True)
    # macOS with Homebrew
    subprocess.run("print_status "Detected macOS with Homebrew, installing llvm..."", shell=True)
    subprocess.run("brew install llvm", shell=True)
    subprocess.run("elif command_exists pacman; then", shell=True)
    # Arch Linux
    subprocess.run("print_status "Detected Arch Linux, installing clang..."", shell=True)
    subprocess.run("sudo pacman -S --noconfirm clang", shell=True)
    else:
    subprocess.run("print_warning "Unknown package manager. Please install clang-tidy manually."", shell=True)
    # Try to install cpp-dependencies via pip
    subprocess.run("if command_exists pip3; then", shell=True)
    subprocess.run("uv pip install --user cpp-dependencies 2>/dev/null || print_warning "cpp-dependencies not available (optional)"", shell=True)
    subprocess.run("print_success "C++ tools installation attempted"", shell=True)
    subprocess.run("}", shell=True)
    # Install Graphviz for visualization
    subprocess.run("install_graphviz() {", shell=True)
    subprocess.run("print_status "Installing Graphviz for visualization..."", shell=True)
    subprocess.run("if command_exists dot; then", shell=True)
    subprocess.run("print_success "Graphviz already installed"", shell=True)
    subprocess.run("return 0", shell=True)
    subprocess.run("if command_exists apt-get; then", shell=True)
    subprocess.run("sudo apt-get install -y graphviz", shell=True)
    subprocess.run("elif command_exists yum; then", shell=True)
    subprocess.run("sudo yum install -y graphviz", shell=True)
    subprocess.run("elif command_exists brew; then", shell=True)
    subprocess.run("brew install graphviz", shell=True)
    subprocess.run("elif command_exists pacman; then", shell=True)
    subprocess.run("sudo pacman -S --noconfirm graphviz", shell=True)
    else:
    subprocess.run("print_warning "Please install Graphviz manually for visualization support"", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("print_success "Graphviz installed"", shell=True)
    subprocess.run("}", shell=True)
    # Verify installations
    subprocess.run("verify_installations() {", shell=True)
    subprocess.run("print_status "Verifying installations..."", shell=True)
    subprocess.run("echo", shell=True)
    print("✅ Tool Installation Status:")
    print("===============================")
    # Node.js tools
    subprocess.run("if command_exists madge; then", shell=True)
    print("✓ madge: $(madge --version)")
    else:
    print("✗ madge: Not found")
    subprocess.run("if command_exists depcruise; then", shell=True)
    print("✓ dependency-cruiser: $(depcruise --version)")
    else:
    print("✗ dependency-cruiser: Not found")
    subprocess.run("if command_exists ds; then", shell=True)
    print("✓ ds: Available")
    else:
    print("✗ ds: Not found (optional)")
    # Python tools
    subprocess.run("if command_exists pylint; then", shell=True)
    print("✓ pylint: $(pylint --version | head -n1)")
    else:
    print("✗ pylint: Not found")
    subprocess.run("if command_exists pycycle; then", shell=True)
    print("✓ pycycle: Available")
    else:
    print("✗ pycycle: Not found")
    # C++ tools
    subprocess.run("if command_exists clang-tidy; then", shell=True)
    print("✓ clang-tidy: $(clang-tidy --version | head -n1)")
    else:
    print("✗ clang-tidy: Not found")
    # Graphviz
    subprocess.run("if command_exists dot; then", shell=True)
    print("✓ graphviz: $(dot -V 2>&1 | head -n1)")
    else:
    print("✗ graphviz: Not found (visualization disabled)")
    subprocess.run("echo", shell=True)
    subprocess.run("}", shell=True)
    # Main installation process
    subprocess.run("main() {", shell=True)
    subprocess.run("print_status "Starting tool installation process..."", shell=True)
    subprocess.run("echo", shell=True)
    # Install tools by category
    subprocess.run("install_node_tools", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("install_python_tools", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("install_cpp_tools", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("install_graphviz", shell=True)
    subprocess.run("echo", shell=True)
    # Verify installations
    subprocess.run("verify_installations", shell=True)
    subprocess.run("print_success "Installation process completed!"", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("print_status "You can now use the circular dependency detection tool."", shell=True)
    subprocess.run("print_status "Run 'npm run build' to build the project."", shell=True)
    subprocess.run("print_status "Run 'npm run cli -- --help' to see available commands."", shell=True)
    subprocess.run("}", shell=True)
    # Handle script arguments
    subprocess.run("case "${1:-}" in", shell=True)
    subprocess.run("--node-only)", shell=True)
    subprocess.run("install_node_tools", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--python-only)", shell=True)
    subprocess.run("install_python_tools", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--cpp-only)", shell=True)
    subprocess.run("install_cpp_tools", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--graphviz-only)", shell=True)
    subprocess.run("install_graphviz", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--verify)", shell=True)
    subprocess.run("verify_installations", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("main", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)

if __name__ == "__main__":
    main()