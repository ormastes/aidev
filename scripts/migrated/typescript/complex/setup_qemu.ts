#!/usr/bin/env bun
/**
 * Migrated from: setup_qemu.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.658Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // QEMU Setup Script for Driver and Embedded Development
  // Configures QEMU for multiple architectures with kernel and rootfs
  await $`set -e`;
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  // Configuration
  await $`QEMU_DIR="qemu_environments"`;
  await $`KERNEL_DIR="$QEMU_DIR/kernels"`;
  await $`ROOTFS_DIR="$QEMU_DIR/rootfs"`;
  await $`SCRIPTS_DIR="$QEMU_DIR/scripts"`;
  // Log function
  await $`log() {`;
  await $`case $1 in`;
  await $`INFO) echo -e "${NC}[INFO] $2" ;;`;
  await $`SUCCESS) echo -e "${GREEN}[SUCCESS] $2${NC}" ;;`;
  await $`WARNING) echo -e "${YELLOW}[WARNING] $2${NC}" ;;`;
  await $`ERROR) echo -e "${RED}[ERROR] $2${NC}" ;;`;
  await $`esac`;
  await $`}`;
  // Create directory structure
  await $`setup_directories() {`;
  await $`log INFO "Creating QEMU directory structure..."`;
  await mkdir(""$KERNEL_DIR"", { recursive: true });
  await mkdir(""$ROOTFS_DIR"", { recursive: true });
  await mkdir(""$SCRIPTS_DIR"", { recursive: true });
  await $`log SUCCESS "Directories created"`;
  await $`}`;
  // Check QEMU installation
  await $`check_qemu() {`;
  await $`log INFO "Checking QEMU installation..."`;
  await $`local qemu_found=false`;
  await $`local architectures=("x86_64" "arm" "aarch64" "riscv64" "mips" "ppc")`;
  for (const arch of ["${architectures[@]}"; do]) {
  await $`if command -v "qemu-system-$arch" &> /dev/null; then`;
  await $`log SUCCESS "QEMU for $arch found"`;
  await $`qemu_found=true`;
  } else {
  await $`log WARNING "QEMU for $arch not found"`;
  }
  }
  if ("$qemu_found" = false ) {; then
  await $`log ERROR "No QEMU installations found"`;
  await $`log INFO "Install QEMU with: sudo apt-get install qemu-system"`;
  await $`return 1`;
  }
  await $`}`;
  // Create minimal kernel module test environment
  await $`create_kernel_test_env() {`;
  await $`local arch=$1`;
  await $`log INFO "Creating kernel test environment for $arch..."`;
  // Create a simple init script for testing
  await $`cat > "$ROOTFS_DIR/init_$arch.sh" << 'EOF'`;
  console.log("QEMU Test Environment Started");
  console.log("Architecture: $ARCH");
  console.log("Loading test module...");
  // Mount essential filesystems
  await $`mount -t proc none /proc`;
  await $`mount -t sysfs none /sys`;
  await $`mount -t devtmpfs none /dev`;
  // Load kernel module if provided
  if (-f /test_module.ko ) {; then
  await $`insmod /test_module.ko`;
  console.log("Module loaded");
  // Test the module
  if (-e /dev/test_device ) {; then
  await $`cat /dev/test_device`;
  }
  // Check kernel messages
  await $`dmesg | tail -10`;
  // Unload module
  await $`rmmod test_module`;
  }
  console.log("Test completed");
  await $`/bin/sh`;
  await $`EOF`;
  await $`chmod +x "$ROOTFS_DIR/init_$arch.sh"`;
  await $`}`;
  // Generate QEMU run scripts for each architecture
  await $`generate_run_scripts() {`;
  await $`log INFO "Generating QEMU run scripts..."`;
  // x86_64 script
  await $`cat > "$SCRIPTS_DIR/run_x86_64.sh" << 'EOF'`;
  await $`KERNEL=${1:-bzImage}`;
  await $`MODULE=${2}`;
  await $`MEMORY=${3:-512M}`;
  await $`QEMU_ARGS=""`;
  if (-f "$MODULE" ) {; then
  await $`QEMU_ARGS="-drive file=$MODULE,format=raw,if=virtio"`;
  }
  await $`qemu-system-x86_64 \`;
  await $`-kernel "$KERNEL" \`;
  await $`-append "console=ttyS0 panic=1" \`;
  await $`-m "$MEMORY" \`;
  await $`-nographic \`;
  await $`-no-reboot \`;
  await $`$QEMU_ARGS \`;
  await $`-serial mon:stdio`;
  await $`EOF`;
  // ARM script
  await $`cat > "$SCRIPTS_DIR/run_arm.sh" << 'EOF'`;
  await $`KERNEL=${1:-zImage}`;
  await $`MODULE=${2}`;
  await $`MEMORY=${3:-512M}`;
  await $`QEMU_ARGS=""`;
  if (-f "$MODULE" ) {; then
  await $`QEMU_ARGS="-drive file=$MODULE,format=raw,if=virtio"`;
  }
  await $`qemu-system-arm \`;
  await $`-M virt \`;
  await $`-cpu cortex-a15 \`;
  await $`-kernel "$KERNEL" \`;
  await $`-append "console=ttyAMA0 panic=1" \`;
  await $`-m "$MEMORY" \`;
  await $`-nographic \`;
  await $`-no-reboot \`;
  await $`$QEMU_ARGS \`;
  await $`-serial mon:stdio`;
  await $`EOF`;
  // ARM64 script
  await $`cat > "$SCRIPTS_DIR/run_arm64.sh" << 'EOF'`;
  await $`KERNEL=${1:-Image}`;
  await $`MODULE=${2}`;
  await $`MEMORY=${3:-512M}`;
  await $`QEMU_ARGS=""`;
  if (-f "$MODULE" ) {; then
  await $`QEMU_ARGS="-drive file=$MODULE,format=raw,if=virtio"`;
  }
  await $`qemu-system-aarch64 \`;
  await $`-M virt \`;
  await $`-cpu cortex-a72 \`;
  await $`-kernel "$KERNEL" \`;
  await $`-append "console=ttyAMA0 panic=1" \`;
  await $`-m "$MEMORY" \`;
  await $`-nographic \`;
  await $`-no-reboot \`;
  await $`$QEMU_ARGS \`;
  await $`-serial mon:stdio`;
  await $`EOF`;
  // RISC-V script
  await $`cat > "$SCRIPTS_DIR/run_riscv.sh" << 'EOF'`;
  await $`KERNEL=${1:-Image}`;
  await $`MODULE=${2}`;
  await $`MEMORY=${3:-512M}`;
  await $`QEMU_ARGS=""`;
  if (-f "$MODULE" ) {; then
  await $`QEMU_ARGS="-drive file=$MODULE,format=raw,if=virtio"`;
  }
  await $`qemu-system-riscv64 \`;
  await $`-M virt \`;
  await $`-kernel "$KERNEL" \`;
  await $`-append "console=ttyS0 panic=1" \`;
  await $`-m "$MEMORY" \`;
  await $`-nographic \`;
  await $`-no-reboot \`;
  await $`$QEMU_ARGS \`;
  await $`-serial mon:stdio`;
  await $`EOF`;
  // Make all scripts executable
  await $`chmod +x "$SCRIPTS_DIR"/*.sh`;
  await $`log SUCCESS "Run scripts generated"`;
  await $`}`;
  // Create GDB debugging scripts
  await $`create_debug_scripts() {`;
  await $`log INFO "Creating GDB debugging scripts..."`;
  await $`cat > "$SCRIPTS_DIR/debug_kernel.sh" << 'EOF'`;
  // QEMU Kernel Debugging Script
  await $`ARCH=${1:-x86_64}`;
  await $`KERNEL=${2:-vmlinux}`;
  await $`GDB_PORT=1234`;
  console.log("Starting QEMU in debug mode for $ARCH...");
  console.log("GDB will connect to port $GDB_PORT");
  await $`case "$ARCH" in`;
  await $`x86_64)`;
  await $`qemu-system-x86_64 \`;
  await $`-kernel "$KERNEL" \`;
  await $`-s -S \`;
  await $`-nographic &`;
  await $`;;`;
  await $`arm)`;
  await $`qemu-system-arm \`;
  await $`-M virt \`;
  await $`-kernel "$KERNEL" \`;
  await $`-s -S \`;
  await $`-nographic &`;
  await $`;;`;
  await $`arm64|aarch64)`;
  await $`qemu-system-aarch64 \`;
  await $`-M virt \`;
  await $`-kernel "$KERNEL" \`;
  await $`-s -S \`;
  await $`-nographic &`;
  await $`;;`;
  await $`riscv|riscv64)`;
  await $`qemu-system-riscv64 \`;
  await $`-M virt \`;
  await $`-kernel "$KERNEL" \`;
  await $`-s -S \`;
  await $`-nographic &`;
  await $`;;`;
  await $`*)`;
  console.log("Unsupported architecture: $ARCH");
  process.exit(1);
  await $`;;`;
  await $`esac`;
  await $`QEMU_PID=$!`;
  // Start GDB
  console.log("Starting GDB...");
  await $`gdb-multiarch \`;
  await $`-ex "target remote localhost:$GDB_PORT" \`;
  await $`-ex "file $KERNEL" \`;
  await $`-ex "break start_kernel" \`;
  await $`-ex "continue"`;
  // Clean up
  await $`kill $QEMU_PID 2>/dev/null`;
  await $`EOF`;
  await $`chmod +x "$SCRIPTS_DIR/debug_kernel.sh"`;
  await $`log SUCCESS "Debug scripts created"`;
  await $`}`;
  // Create sample kernel module for testing
  await $`create_sample_module() {`;
  await $`log INFO "Creating sample kernel module for testing..."`;
  await $`local module_dir="$QEMU_DIR/sample_module"`;
  await mkdir(""$module_dir"", { recursive: true });
  // Sample kernel module
  await $`cat > "$module_dir/hello_qemu.c" << 'EOF'`;
  // include <linux/init.h>
  // include <linux/module.h>
  // include <linux/kernel.h>
  await $`MODULE_LICENSE("GPL");`;
  await $`MODULE_AUTHOR("QEMU Test");`;
  await $`MODULE_DESCRIPTION("Hello World Module for QEMU Testing");`;
  await $`static int __init hello_init(void) {`;
  await $`printk(KERN_INFO "Hello from QEMU kernel module!\n");`;
  await $`printk(KERN_INFO "Architecture: %s\n", CONFIG_ARCH);`;
  await $`return 0;`;
  await $`}`;
  await $`static void __exit hello_exit(void) {`;
  await $`printk(KERN_INFO "Goodbye from QEMU kernel module!\n");`;
  await $`}`;
  await $`module_init(hello_init);`;
  await $`module_exit(hello_exit);`;
  await $`EOF`;
  // Makefile for module
  await $`cat > "$module_dir/Makefile" << 'EOF'`;
  await $`obj-m += hello_qemu.o`;
  await $`ARCH ?= x86_64`;
  await $`CROSS_COMPILE ?=`;
  // Kernel source directory (update as needed)
  await $`KDIR ?= /lib/modules/$(shell uname -r)/build`;
  await $`all:`;
  await $`$(MAKE) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) -C $(KDIR) M=$(PWD) modules`;
  await $`clean:`;
  await $`$(MAKE) -C $(KDIR) M=$(PWD) clean`;
  await $`test: all`;
  await $`@echo "Module built successfully"`;
  await $`@echo "To test in QEMU, run:"`;
  await $`@echo "  ../scripts/run_$(ARCH).sh <kernel> hello_qemu.ko"`;
  await $`EOF`;
  await $`log SUCCESS "Sample module created in $module_dir"`;
  await $`}`;
  // Create cross-compilation toolchain setup
  await $`setup_cross_compile() {`;
  await $`log INFO "Setting up cross-compilation configurations..."`;
  await $`cat > "$QEMU_DIR/cross_compile.conf" << 'EOF'`;
  // Cross-compilation toolchain configuration
  // ARM 32-bit
  await $`ARM_CROSS_COMPILE=arm-linux-gnueabi-`;
  await $`ARM_ARCH=arm`;
  await $`ARM_QEMU=qemu-system-arm`;
  // ARM 64-bit (AArch64)
  await $`ARM64_CROSS_COMPILE=aarch64-linux-gnu-`;
  await $`ARM64_ARCH=arm64`;
  await $`ARM64_QEMU=qemu-system-aarch64`;
  // RISC-V 64-bit
  await $`RISCV_CROSS_COMPILE=riscv64-linux-gnu-`;
  await $`RISCV_ARCH=riscv`;
  await $`RISCV_QEMU=qemu-system-riscv64`;
  // MIPS
  await $`MIPS_CROSS_COMPILE=mips-linux-gnu-`;
  await $`MIPS_ARCH=mips`;
  await $`MIPS_QEMU=qemu-system-mips`;
  // PowerPC
  await $`PPC_CROSS_COMPILE=powerpc-linux-gnu-`;
  await $`PPC_ARCH=powerpc`;
  await $`PPC_QEMU=qemu-system-ppc`;
  // Usage:
  // source cross_compile.conf
  // make ARCH=$ARM_ARCH CROSS_COMPILE=$ARM_CROSS_COMPILE
  await $`EOF`;
  // Create build script for cross-compilation
  await $`cat > "$SCRIPTS_DIR/build_cross.sh" << 'EOF'`;
  // Cross-compilation build script
  await $`ARCH=$1`;
  await $`MODULE=$2`;
  if (-z "$ARCH" ] || [ -z "$MODULE" ) {; then
  console.log("Usage: $0 <arch> <module_directory>");
  console.log("Architectures: arm, arm64, riscv, mips, ppc");
  process.exit(1);
  }
  await $`source ../cross_compile.conf`;
  await $`case "$ARCH" in`;
  await $`arm)`;
  await $`CROSS=$ARM_CROSS_COMPILE`;
  await $`ARCH_VAR=$ARM_ARCH`;
  await $`;;`;
  await $`arm64|aarch64)`;
  await $`CROSS=$ARM64_CROSS_COMPILE`;
  await $`ARCH_VAR=$ARM64_ARCH`;
  await $`;;`;
  await $`riscv|riscv64)`;
  await $`CROSS=$RISCV_CROSS_COMPILE`;
  await $`ARCH_VAR=$RISCV_ARCH`;
  await $`;;`;
  await $`mips)`;
  await $`CROSS=$MIPS_CROSS_COMPILE`;
  await $`ARCH_VAR=$MIPS_ARCH`;
  await $`;;`;
  await $`ppc|powerpc)`;
  await $`CROSS=$PPC_CROSS_COMPILE`;
  await $`ARCH_VAR=$PPC_ARCH`;
  await $`;;`;
  await $`*)`;
  console.log("Unknown architecture: $ARCH");
  process.exit(1);
  await $`;;`;
  await $`esac`;
  console.log("Building for $ARCH with $CROSS toolchain...");
  process.chdir(""$MODULE"");
  await $`make ARCH=$ARCH_VAR CROSS_COMPILE=$CROSS clean`;
  await $`make ARCH=$ARCH_VAR CROSS_COMPILE=$CROSS`;
  await $`EOF`;
  await $`chmod +x "$SCRIPTS_DIR/build_cross.sh"`;
  await $`log SUCCESS "Cross-compilation setup complete"`;
  await $`}`;
  // Create test automation script
  await $`create_test_automation() {`;
  await $`log INFO "Creating test automation scripts..."`;
  await $`cat > "$SCRIPTS_DIR/test_all_architectures.sh" << 'EOF'`;
  // Test kernel modules on all QEMU architectures
  await $`ARCHITECTURES=("x86_64" "arm" "arm64" "riscv")`;
  await $`MODULE_DIR="../sample_module"`;
  await $`RESULTS_FILE="test_results.txt"`;
  console.log("Testing kernel module on all architectures..."); > "$RESULTS_FILE"
  console.log("========================================="); >> "$RESULTS_FILE"
  for (const arch of ["${architectures[@]}"; do]) {
  console.log(""); >> "$RESULTS_FILE"
  console.log("Testing $arch..."); >> "$RESULTS_FILE"
  // Build module for architecture
  await $`./build_cross.sh "$arch" "$MODULE_DIR" >> "$RESULTS_FILE" 2>&1`;
  if ($? -eq 0 ) {; then
  console.log("✓ Build successful for $arch"); >> "$RESULTS_FILE"
  } else {
  console.log("✗ Build failed for $arch"); >> "$RESULTS_FILE"
  }
  }
  console.log(""); >> "$RESULTS_FILE"
  console.log("Test Summary:"); >> "$RESULTS_FILE"
  await $`grep "✓\|✗" "$RESULTS_FILE"`;
  await $`cat "$RESULTS_FILE"`;
  await $`EOF`;
  await $`chmod +x "$SCRIPTS_DIR/test_all_architectures.sh"`;
  await $`log SUCCESS "Test automation scripts created"`;
  await $`}`;
  // Create documentation
  await $`create_documentation() {`;
  await $`log INFO "Creating documentation..."`;
  await $`cat > "$QEMU_DIR/README.md" << 'EOF'`;
  // QEMU Environment for Driver Development
  await $`This directory contains QEMU configurations and scripts for testing kernel modules and drivers across multiple architectures.`;
  // # Directory Structure
  await $`````;
  await $`qemu_environments/`;
  await $`├── kernels/          # Kernel images for different architectures`;
  await $`├── rootfs/           # Root filesystem images`;
  await $`├── scripts/          # QEMU run and build scripts`;
  await $`├── sample_module/    # Sample kernel module for testing`;
  await $`└── cross_compile.conf # Cross-compilation configuration`;
  await $`````;
  // # Supported Architectures
  await $`- x86_64 (Intel/AMD 64-bit)`;
  await $`- ARM (32-bit)`;
  await $`- ARM64/AArch64 (64-bit)`;
  await $`- RISC-V (64-bit)`;
  await $`- MIPS`;
  await $`- PowerPC`;
  // # Quick Start
  // ## 1. Build Sample Module
  await $`For native architecture:`;
  await $````bash`;
  process.chdir("sample_module");
  await $`make`;
  await $`````;
  await $`For cross-compilation:`;
  await $````bash`;
  process.chdir("scripts");
  await $`./build_cross.sh arm ../sample_module`;
  await $`````;
  // ## 2. Run in QEMU
  await $````bash`;
  process.chdir("scripts");
  await $`./run_x86_64.sh <kernel_image> <module.ko>`;
  await $`````;
  // ## 3. Debug with GDB
  await $````bash`;
  process.chdir("scripts");
  await $`./debug_kernel.sh x86_64 <kernel_image>`;
  await $`````;
  // # Testing Driver Hello World
  await $`1. Build your driver module`;
  await $`2. Run QEMU with the module:`;
  await $````bash`;
  await $`./scripts/run_<arch>.sh kernel_image your_module.ko`;
  await $`````;
  await $`3. In QEMU console:`;
  await $````bash`;
  await $`insmod your_module.ko`;
  await $`dmesg | tail`;
  await $`cat /dev/your_device  # Should show "Hello World"`;
  await $`rmmod your_module`;
  await $`````;
  // # Cross-Compilation
  await $`Install toolchains:`;
  await $````bash`;
  await $`sudo apt-get install gcc-arm-linux-gnueabi gcc-aarch64-linux-gnu gcc-riscv64-linux-gnu`;
  await $`````;
  await $`Build for specific architecture:`;
  await $````bash`;
  await $`source cross_compile.conf`;
  await $`make ARCH=$ARM_ARCH CROSS_COMPILE=$ARM_CROSS_COMPILE`;
  await $`````;
  // # Automated Testing
  await $`Run tests on all architectures:`;
  await $````bash`;
  process.chdir("scripts");
  await $`./test_all_architectures.sh`;
  await $`````;
  // # Troubleshooting
  await $`- **Module won't load**: Check kernel version compatibility`;
  await $`- **QEMU crashes**: Verify kernel image is for correct architecture`;
  await $`- **Cross-compilation fails**: Install required toolchain`;
  await $`- **No output**: Check console parameters in kernel command line`;
  // # Requirements
  await $`- QEMU (qemu-system-*)`;
  await $`- Cross-compilation toolchains`;
  await $`- Linux kernel headers`;
  await $`- GDB with multiarch support (gdb-multiarch)`;
  await $`EOF`;
  await $`log SUCCESS "Documentation created"`;
  await $`}`;
  // Main setup function
  await $`main() {`;
  await $`log INFO "QEMU Environment Setup for Driver Development"`;
  await $`log INFO "============================================="`;
  // Create directory structure
  await $`setup_directories`;
  // Check QEMU installation
  await $`if ! check_qemu; then`;
  await $`log ERROR "Please install QEMU first"`;
  process.exit(1);
  }
  // Generate configurations and scripts
  await $`generate_run_scripts`;
  await $`create_debug_scripts`;
  await $`create_sample_module`;
  await $`setup_cross_compile`;
  await $`create_test_automation`;
  await $`create_kernel_test_env "x86_64"`;
  await $`create_kernel_test_env "arm"`;
  await $`create_kernel_test_env "arm64"`;
  await $`create_kernel_test_env "riscv"`;
  await $`create_documentation`;
  await $`log SUCCESS "QEMU environment setup complete!"`;
  await $`log INFO "Created in: $QEMU_DIR/"`;
  await $`log INFO "To get started:"`;
  await $`log INFO "  1. cd $QEMU_DIR/sample_module"`;
  await $`log INFO "  2. make"`;
  await $`log INFO "  3. cd ../scripts"`;
  await $`log INFO "  4. ./run_x86_64.sh <kernel> ../sample_module/hello_qemu.ko"`;
  await $`log INFO ""`;
  await $`log INFO "See $QEMU_DIR/README.md for detailed documentation"`;
  await $`}`;
  // Run main function
  await $`main "$@"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}