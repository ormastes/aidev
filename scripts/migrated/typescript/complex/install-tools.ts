#!/usr/bin/env bun
/**
 * Migrated from: install-tools.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.710Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // #
  // Install external tools required for circular dependency detection
  // #
  await $`set -e`;
  console.log("🔧 Installing Circular Dependency Detection Tools...");
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Function to print colored output
  await $`print_status() {`;
  console.log("-e ");${BLUE}[INFO]${NC} $1"
  await $`}`;
  await $`print_success() {`;
  console.log("-e ");${GREEN}[SUCCESS]${NC} $1"
  await $`}`;
  await $`print_warning() {`;
  console.log("-e ");${YELLOW}[WARNING]${NC} $1"
  await $`}`;
  await $`print_error() {`;
  console.log("-e ");${RED}[ERROR]${NC} $1"
  await $`}`;
  // Check if command exists
  await $`command_exists() {`;
  await $`command -v "$1" >/dev/null 2>&1`;
  await $`}`;
  // Install Node.js tools
  await $`install_node_tools() {`;
  await $`print_status "Installing Node.js tools..."`;
  await $`if ! command_exists npm; then`;
  await $`print_error "npm not found. Please install Node.js first."`;
  await $`return 1`;
  }
  // Install global tools
  await $`npm install -g madge dependency-cruiser`;
  // Try to install ds tool
  await $`if npm install -g ds 2>/dev/null; then`;
  await $`print_success "ds tool installed"`;
  } else {
  await $`print_warning "Failed to install ds tool (optional)"`;
  }
  await $`print_success "Node.js tools installed"`;
  await $`}`;
  // Install Python tools
  await $`install_python_tools() {`;
  await $`print_status "Installing Python tools..."`;
  // Try different Python package managers
  await $`if command_exists pip3; then`;
  await $`PIP_CMD="pip3"`;
  await $`elif command_exists pip; then`;
  await $`PIP_CMD="pip"`;
  } else {
  await $`print_error "pip not found. Please install Python and pip first."`;
  await $`return 1`;
  }
  // Install Python tools
  await $`$PIP_CMD install --user pylint pycycle || print_warning "Some Python tools failed to install"`;
  // Try to install circular-imports
  await $`if $PIP_CMD install --user circular-imports 2>/dev/null; then`;
  await $`print_success "circular-imports tool installed"`;
  } else {
  await $`print_warning "circular-imports tool not available (optional)"`;
  }
  await $`print_success "Python tools installed"`;
  await $`}`;
  // Install C++ tools
  await $`install_cpp_tools() {`;
  await $`print_status "Installing C++ tools..."`;
  // Check for package managers
  await $`if command_exists apt-get; then`;
  // Ubuntu/Debian
  await $`print_status "Detected Debian-based system, installing clang-tidy..."`;
  await $`sudo apt-get update`;
  await $`sudo apt-get install -y clang-tidy`;
  await $`elif command_exists yum; then`;
  // RHEL/CentOS/Fedora
  await $`print_status "Detected RHEL-based system, installing clang-tools-extra..."`;
  await $`sudo yum install -y clang-tools-extra`;
  await $`elif command_exists brew; then`;
  // macOS with Homebrew
  await $`print_status "Detected macOS with Homebrew, installing llvm..."`;
  await $`brew install llvm`;
  await $`elif command_exists pacman; then`;
  // Arch Linux
  await $`print_status "Detected Arch Linux, installing clang..."`;
  await $`sudo pacman -S --noconfirm clang`;
  } else {
  await $`print_warning "Unknown package manager. Please install clang-tidy manually."`;
  }
  // Try to install cpp-dependencies via pip
  await $`if command_exists pip3; then`;
  await $`uv pip install --user cpp-dependencies 2>/dev/null || print_warning "cpp-dependencies not available (optional)"`;
  }
  await $`print_success "C++ tools installation attempted"`;
  await $`}`;
  // Install Graphviz for visualization
  await $`install_graphviz() {`;
  await $`print_status "Installing Graphviz for visualization..."`;
  await $`if command_exists dot; then`;
  await $`print_success "Graphviz already installed"`;
  await $`return 0`;
  }
  await $`if command_exists apt-get; then`;
  await $`sudo apt-get install -y graphviz`;
  await $`elif command_exists yum; then`;
  await $`sudo yum install -y graphviz`;
  await $`elif command_exists brew; then`;
  await $`brew install graphviz`;
  await $`elif command_exists pacman; then`;
  await $`sudo pacman -S --noconfirm graphviz`;
  } else {
  await $`print_warning "Please install Graphviz manually for visualization support"`;
  await $`return 1`;
  }
  await $`print_success "Graphviz installed"`;
  await $`}`;
  // Verify installations
  await $`verify_installations() {`;
  await $`print_status "Verifying installations..."`;
  await $`echo`;
  console.log("✅ Tool Installation Status:");
  console.log("===============================");
  // Node.js tools
  await $`if command_exists madge; then`;
  console.log("✓ madge: $(madge --version)");
  } else {
  console.log("✗ madge: Not found");
  }
  await $`if command_exists depcruise; then`;
  console.log("✓ dependency-cruiser: $(depcruise --version)");
  } else {
  console.log("✗ dependency-cruiser: Not found");
  }
  await $`if command_exists ds; then`;
  console.log("✓ ds: Available");
  } else {
  console.log("✗ ds: Not found (optional)");
  }
  // Python tools
  await $`if command_exists pylint; then`;
  console.log("✓ pylint: $(pylint --version | head -n1)");
  } else {
  console.log("✗ pylint: Not found");
  }
  await $`if command_exists pycycle; then`;
  console.log("✓ pycycle: Available");
  } else {
  console.log("✗ pycycle: Not found");
  }
  // C++ tools
  await $`if command_exists clang-tidy; then`;
  console.log("✓ clang-tidy: $(clang-tidy --version | head -n1)");
  } else {
  console.log("✗ clang-tidy: Not found");
  }
  // Graphviz
  await $`if command_exists dot; then`;
  console.log("✓ graphviz: $(dot -V 2>&1 | head -n1)");
  } else {
  console.log("✗ graphviz: Not found (visualization disabled)");
  }
  await $`echo`;
  await $`}`;
  // Main installation process
  await $`main() {`;
  await $`print_status "Starting tool installation process..."`;
  await $`echo`;
  // Install tools by category
  await $`install_node_tools`;
  await $`echo`;
  await $`install_python_tools`;
  await $`echo`;
  await $`install_cpp_tools`;
  await $`echo`;
  await $`install_graphviz`;
  await $`echo`;
  // Verify installations
  await $`verify_installations`;
  await $`print_success "Installation process completed!"`;
  await $`echo`;
  await $`print_status "You can now use the circular dependency detection tool."`;
  await $`print_status "Run 'npm run build' to build the project."`;
  await $`print_status "Run 'npm run cli -- --help' to see available commands."`;
  await $`}`;
  // Handle script arguments
  await $`case "${1:-}" in`;
  await $`--node-only)`;
  await $`install_node_tools`;
  await $`;;`;
  await $`--python-only)`;
  await $`install_python_tools`;
  await $`;;`;
  await $`--cpp-only)`;
  await $`install_cpp_tools`;
  await $`;;`;
  await $`--graphviz-only)`;
  await $`install_graphviz`;
  await $`;;`;
  await $`--verify)`;
  await $`verify_installations`;
  await $`;;`;
  await $`*)`;
  await $`main`;
  await $`;;`;
  await $`esac`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}