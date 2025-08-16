#!/usr/bin/env bun
/**
 * Migrated from: setup_qemu_environments.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.740Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  await $`set -e`;
  // QEMU Environment Setup Script
  // Sets up QEMU environments for OS and hardware-level testing
  await $`QEMU_DIR="$(dirname "$0")"`;
  await $`IMAGES_DIR="$QEMU_DIR/images"`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}========================================${NC}"
  console.log("-e ");${BLUE}QEMU Environment Setup${NC}"
  console.log("-e ");${BLUE}========================================${NC}"
  // Check QEMU installation
  await $`check_qemu() {`;
  console.log("-e ");${BLUE}Checking QEMU installation...${NC}"
  await $`if ! command -v qemu-system-x86_64 &> /dev/null; then`;
  console.log("-e ");${YELLOW}QEMU not installed. Installing...${NC}"
  await $`sudo apt-get update`;
  await $`sudo apt-get install -y \`;
  await $`qemu-system-x86 \`;
  await $`qemu-system-arm \`;
  await $`qemu-system-misc \`;
  await $`qemu-utils \`;
  await $`qemu-user-static`;
  }
  console.log("-e ");${GREEN}QEMU installed:${NC}"
  await $`qemu-system-x86_64 --version | head -n1`;
  await $`qemu-system-arm --version | head -n1`;
  await $`}`;
  // Setup Linux kernel testing environment
  await $`setup_linux_kernel() {`;
  console.log("-e ");${BLUE}Setting up Linux kernel testing environment...${NC}"
  await mkdir(""$IMAGES_DIR/linux"", { recursive: true });
  process.chdir(""$IMAGES_DIR/linux"");
  // Download minimal Linux kernel and initrd
  if (! -f "bzImage" ) {; then
  console.log("Downloading Linux kernel...");
  await $`wget -q https://github.com/cirruslabs/linux-image-server/releases/download/20230625/bzImage`;
  }
  if (! -f "initrd.img" ) {; then
  console.log("Downloading initrd...");
  await $`wget -q https://github.com/cirruslabs/linux-image-server/releases/download/20230625/initrd.img`;
  }
  // Create run script
  await $`cat > run_linux.sh << 'EOF'`;
  await $`qemu-system-x86_64 \`;
  await $`-kernel bzImage \`;
  await $`-initrd initrd.img \`;
  await $`-m 512M \`;
  await $`-append "console=ttyS0 quiet" \`;
  await $`-nographic \`;
  await $`-enable-kvm 2>/dev/null || qemu-system-x86_64 \`;
  await $`-kernel bzImage \`;
  await $`-initrd initrd.img \`;
  await $`-m 512M \`;
  await $`-append "console=ttyS0 quiet" \`;
  await $`-nographic`;
  await $`EOF`;
  await $`chmod +x run_linux.sh`;
  console.log("-e ");${GREEN}Linux kernel environment ready${NC}"
  await $`}`;
  // Setup ARM bare-metal environment
  await $`setup_arm_baremetal() {`;
  console.log("-e ");${BLUE}Setting up ARM bare-metal environment...${NC}"
  await mkdir(""$IMAGES_DIR/arm"", { recursive: true });
  process.chdir(""$IMAGES_DIR/arm"");
  // Create simple ARM test program
  await $`cat > hello_arm.c << 'EOF'`;
  // Simple ARM bare-metal hello world
  await $`void _start() {`;
  await $`const char msg[] = "Hello from ARM!\n";`;
  await $`volatile unsigned int * const UART0DR = (unsigned int *)0x101f1000;`;
  await $`for (int i = 0; msg[i] != '\0'; i++) {`;
  await $`*UART0DR = (unsigned int)(msg[i]);`;
  await $`}`;
  await $`while(1); // Infinite loop`;
  await $`}`;
  await $`EOF`;
  // Create linker script
  await $`cat > link.ld << 'EOF'`;
  await $`ENTRY(_start)`;
  await $`SECTIONS {`;
  await $`. = 0x40000000;`;
  await $`.text : { *(.text) }`;
  await $`.data : { *(.data) }`;
  await $`.bss : { *(.bss) }`;
  await $`}`;
  await $`EOF`;
  // Create build script
  await $`cat > build.sh << 'EOF'`;
  await $`arm-none-eabi-gcc -c -mcpu=arm926ej-s hello_arm.c -o hello_arm.o`;
  await $`arm-none-eabi-ld -T link.ld hello_arm.o -o hello_arm.elf`;
  await $`arm-none-eabi-objcopy -O binary hello_arm.elf hello_arm.bin`;
  await $`EOF`;
  await $`chmod +x build.sh`;
  // Create run script
  await $`cat > run_arm.sh << 'EOF'`;
  await $`qemu-system-arm \`;
  await $`-M versatilepb \`;
  await $`-m 128M \`;
  await $`-nographic \`;
  await $`-kernel hello_arm.bin`;
  await $`EOF`;
  await $`chmod +x run_arm.sh`;
  console.log("-e ");${GREEN}ARM bare-metal environment ready${NC}"
  await $`}`;
  // Setup RISC-V environment
  await $`setup_riscv() {`;
  console.log("-e ");${BLUE}Setting up RISC-V environment...${NC}"
  await mkdir(""$IMAGES_DIR/riscv"", { recursive: true });
  process.chdir(""$IMAGES_DIR/riscv"");
  // Create run script for RISC-V
  await $`cat > run_riscv.sh << 'EOF'`;
  await $`qemu-system-riscv64 \`;
  await $`-machine virt \`;
  await $`-bios none \`;
  await $`-m 256M \`;
  await $`-nographic`;
  await $`EOF`;
  await $`chmod +x run_riscv.sh`;
  console.log("-e ");${GREEN}RISC-V environment ready${NC}"
  await $`}`;
  // Main execution
  await $`main() {`;
  await $`check_qemu`;
  await $`setup_linux_kernel`;
  await $`setup_arm_baremetal`;
  await $`setup_riscv`;
  console.log("-e ");${BLUE}========================================${NC}"
  console.log("-e ");${GREEN}QEMU environments setup complete!${NC}"
  console.log("-e ");${BLUE}========================================${NC}"
  console.log("");
  console.log("Available environments:");
  console.log("  - Linux kernel: $IMAGES_DIR/linux/run_linux.sh");
  console.log("  - ARM bare-metal: $IMAGES_DIR/arm/run_arm.sh");
  console.log("  - RISC-V: $IMAGES_DIR/riscv/run_riscv.sh");
  console.log("");
  console.log("To run tests in QEMU:");
  console.log("  ./run_qemu_tests.sh");
  await $`}`;
  await $`main "$@"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}