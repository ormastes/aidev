#!/usr/bin/env bun
/**
 * Migrated from: install_cpp_tools.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.785Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  await $`set -e`;
  console.log("Installing C++ development tools...");
  // Update package list
  await $`sudo apt-get update`;
  // Install Clang
  await $`if ! command -v clang &> /dev/null; then`;
  console.log("Installing Clang...");
  await $`sudo apt-get install -y clang clang-tools`;
  } else {
  console.log("Clang already installed: $(clang --version | head -n1)");
  }
  // Install CMake
  await $`if ! command -v cmake &> /dev/null; then`;
  console.log("Installing CMake...");
  await $`sudo apt-get install -y cmake`;
  } else {
  console.log("CMake already installed: $(cmake --version | head -n1)");
  }
  // Install Ninja
  await $`if ! command -v ninja &> /dev/null; then`;
  console.log("Installing Ninja...");
  await $`sudo apt-get install -y ninja-build`;
  } else {
  console.log("Ninja already installed: $(ninja --version)");
  }
  // Install Conan
  await $`if ! command -v conan &> /dev/null; then`;
  console.log("Installing Conan...");
  await $`pip install --user conan`;
  console.log("'export PATH=");$HOME/.local/bin:$PATH"' >> ~/.bashrc
  process.env.PATH = ""$HOME/.local/bin:$PATH"";
  } else {
  console.log("Conan already installed: $(conan --version)");
  }
  // Install mold linker
  await $`if ! command -v mold &> /dev/null; then`;
  console.log("Installing mold linker from source...");
  // Install dependencies
  await $`sudo apt-get install -y build-essential git cmake libssl-dev libxxhash-dev zlib1g-dev`;
  // Clone and build mold
  process.chdir("/tmp");
  await $`git clone https://github.com/rui314/mold.git`;
  process.chdir("mold");
  await $`git checkout v2.4.0  # Use stable version`;
  await $`cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=c++`;
  await $`cmake --build build -j$(nproc)`;
  await $`sudo cmake --install build`;
  process.chdir("/");
  await rm("/tmp/mold", { recursive: true, force: true });
  } else {
  console.log("mold already installed: $(mold --version | head -n1)");
  }
  console.log("\nInstallation complete!");
  console.log("Installed tools:");
  await $`clang --version | head -n1`;
  await $`cmake --version | head -n1`;
  console.log("Ninja: $(ninja --version)");
  await $`conan --version 2>/dev/null || echo "Conan: not in PATH (may need to restart shell)"`;
  await $`mold --version 2>/dev/null | head -n1 || echo "mold: installation may have failed"`;
  console.log("\nNote: You may need to restart your shell or run 'source ~/.bashrc' for PATH updates.");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}