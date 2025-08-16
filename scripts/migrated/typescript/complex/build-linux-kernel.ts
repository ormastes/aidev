#!/usr/bin/env bun
/**
 * Migrated from: build-linux-kernel.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.671Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Linux Kernel Build Script with Rust Support
  // Part of AI Development Platform - init_qemu theme
  await $`set -e`;
  // Configuration
  await $`KERNEL_DIR="${KERNEL_DIR:-$HOME/qemu-dev/kernel/linux}"`;
  await $`KERNEL_VERSION="${KERNEL_VERSION:-6.8.0}"`;
  await $`RUST_VERSION="${RUST_VERSION:-1.81.0}"`;
  await $`BUILD_DIR="${BUILD_DIR:-$KERNEL_DIR/build}"`;
  await $`NUM_JOBS="${NUM_JOBS:-$(nproc)}"`;
  // Color codes
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m'`;
  // Functions
  await $`log_info() {`;
  console.log("-e ");${BLUE}[INFO]${NC} $1"
  await $`}`;
  await $`log_success() {`;
  console.log("-e ");${GREEN}[SUCCESS]${NC} $1"
  await $`}`;
  await $`log_warning() {`;
  console.log("-e ");${YELLOW}[WARNING]${NC} $1"
  await $`}`;
  await $`log_error() {`;
  console.log("-e ");${RED}[ERROR]${NC} $1"
  process.exit(1);
  await $`}`;
  // Check prerequisites
  await $`check_prerequisites() {`;
  await $`log_info "Checking prerequisites..."`;
  // Check for required tools
  await $`local tools=("git" "make" "gcc" "clang" "rustc" "bindgen")`;
  for (const tool of ["${tools[@]}"; do]) {
  await $`if ! command -v $tool &> /dev/null; then`;
  await $`log_error "$tool is not installed. Please run setup-qemu-environment.sh first"`;
  }
  }
  // Check Rust version
  await $`local rust_version=$(rustc --version | awk '{print $2}')`;
  await $`log_info "Rust version: $rust_version"`;
  // Check for LLVM
  await $`if ! command -v llvm-config &> /dev/null; then`;
  await $`log_warning "LLVM not found in PATH"`;
  } else {
  await $`log_info "LLVM version: $(llvm-config --version)"`;
  }
  await $`log_success "Prerequisites check passed"`;
  await $`}`;
  // Download kernel source
  await $`download_kernel() {`;
  if (! -d "$KERNEL_DIR" ) {; then
  await $`log_info "Downloading Linux kernel source..."`;
  await mkdir("$(dirname $KERNEL_DIR)", { recursive: true });
  process.chdir("$(dirname $KERNEL_DIR)");
  // Clone stable kernel
  await $`git clone --depth 1 --branch v$KERNEL_VERSION \`;
  await $`https://github.com/torvalds/linux.git linux`;
  await $`log_success "Kernel source downloaded"`;
  } else {
  await $`log_info "Kernel source already exists at $KERNEL_DIR"`;
  // Update to specified version
  process.chdir("$KERNEL_DIR");
  await $`git fetch --tags`;
  await $`git checkout v$KERNEL_VERSION 2>/dev/null || log_warning "Could not checkout v$KERNEL_VERSION"`;
  }
  await $`}`;
  // Configure kernel
  await $`configure_kernel() {`;
  await $`log_info "Configuring kernel..."`;
  process.chdir("$KERNEL_DIR");
  // Create build directory
  await mkdir("$BUILD_DIR", { recursive: true });
  // Start with default config
  await $`make O=$BUILD_DIR defconfig`;
  // Enable Rust support
  await $`log_info "Enabling Rust support..."`;
  await $`scripts/config --file $BUILD_DIR/.config --enable EXPERT`;
  await $`scripts/config --file $BUILD_DIR/.config --enable RUST`;
  await $`scripts/config --file $BUILD_DIR/.config --enable RUST_IS_AVAILABLE`;
  // Enable useful options for development
  await $`scripts/config --file $BUILD_DIR/.config --enable DEBUG_KERNEL`;
  await $`scripts/config --file $BUILD_DIR/.config --enable DEBUG_INFO`;
  await $`scripts/config --file $BUILD_DIR/.config --enable FRAME_POINTER`;
  await $`scripts/config --file $BUILD_DIR/.config --enable KGDB`;
  await $`scripts/config --file $BUILD_DIR/.config --enable KGDB_SERIAL_CONSOLE`;
  // Enable virtualization features
  await $`scripts/config --file $BUILD_DIR/.config --enable VIRTUALIZATION`;
  await $`scripts/config --file $BUILD_DIR/.config --enable KVM`;
  await $`scripts/config --file $BUILD_DIR/.config --enable KVM_INTEL`;
  await $`scripts/config --file $BUILD_DIR/.config --enable KVM_AMD`;
  await $`scripts/config --file $BUILD_DIR/.config --enable VHOST_NET`;
  await $`scripts/config --file $BUILD_DIR/.config --enable VHOST_SCSI`;
  // Enable NVMe support
  await $`scripts/config --file $BUILD_DIR/.config --enable BLK_DEV_NVME`;
  await $`scripts/config --file $BUILD_DIR/.config --enable NVME_CORE`;
  await $`scripts/config --file $BUILD_DIR/.config --enable NVME_MULTIPATH`;
  await $`scripts/config --file $BUILD_DIR/.config --enable NVME_HWMON`;
  // Enable 9P filesystem for QEMU sharing
  await $`scripts/config --file $BUILD_DIR/.config --enable NET_9P`;
  await $`scripts/config --file $BUILD_DIR/.config --enable NET_9P_VIRTIO`;
  await $`scripts/config --file $BUILD_DIR/.config --enable 9P_FS`;
  await $`scripts/config --file $BUILD_DIR/.config --enable 9P_FS_POSIX_ACL`;
  await $`scripts/config --file $BUILD_DIR/.config --enable 9P_FS_SECURITY`;
  // Update config
  await $`make O=$BUILD_DIR olddefconfig`;
  await $`log_success "Kernel configured"`;
  await $`}`;
  // Check Rust availability
  await $`check_rust_available() {`;
  await $`log_info "Checking Rust availability for kernel..."`;
  process.chdir("$KERNEL_DIR");
  await $`if make O=$BUILD_DIR LLVM=1 rustavailable; then`;
  await $`log_success "Rust is available for kernel build"`;
  await $`return 0`;
  } else {
  await $`log_warning "Rust is not available for kernel build"`;
  await $`log_info "Attempting to fix Rust setup..."`;
  // Set required environment variables
  process.env.RUSTC = "$(which rustc)";
  process.env.BINDGEN = "$(which bindgen)";
  process.env.RUSTFMT = "$(which rustfmt)";
  process.env.RUST_LIB_SRC = "$(rustc --print sysroot)/lib/rustlib/src/rust/library";
  // Try again
  await $`if make O=$BUILD_DIR LLVM=1 rustavailable; then`;
  await $`log_success "Rust setup fixed"`;
  await $`return 0`;
  } else {
  await $`log_error "Failed to setup Rust for kernel build"`;
  await $`return 1`;
  }
  }
  await $`}`;
  // Build kernel
  await $`build_kernel() {`;
  await $`log_info "Building kernel with $NUM_JOBS parallel jobs..."`;
  process.chdir("$KERNEL_DIR");
  // Set build environment
  process.env.LLVM = "1";
  process.env.LLVM_IAS = "1";
  // Build kernel
  await $`make O=$BUILD_DIR -j$NUM_JOBS LLVM=1 LLVM_IAS=1`;
  await $`log_success "Kernel build completed"`;
  // Display kernel info
  await $`log_info "Kernel image: $BUILD_DIR/arch/x86/boot/bzImage"`;
  await $`log_info "Kernel version: $(make O=$BUILD_DIR kernelversion)"`;
  // Create symlink for easy access
  await $`ln -sf $BUILD_DIR/arch/x86/boot/bzImage $HOME/qemu-dev/kernel/bzImage`;
  await $`log_info "Symlink created at: $HOME/qemu-dev/kernel/bzImage"`;
  await $`}`;
  // Build kernel modules
  await $`build_modules() {`;
  if ("$BUILD_MODULES" = "true" ) {; then
  await $`log_info "Building kernel modules..."`;
  process.chdir("$KERNEL_DIR");
  await $`make O=$BUILD_DIR -j$NUM_JOBS LLVM=1 modules`;
  await $`log_success "Kernel modules built"`;
  // Install modules to staging directory
  if ("$INSTALL_MODULES" = "true" ) {; then
  await $`local modules_dir="$HOME/qemu-dev/kernel/modules"`;
  await mkdir("$modules_dir", { recursive: true });
  await $`make O=$BUILD_DIR LLVM=1 INSTALL_MOD_PATH=$modules_dir modules_install`;
  await $`log_success "Modules installed to $modules_dir"`;
  }
  }
  await $`}`;
  // Create initramfs
  await $`create_initramfs() {`;
  if ("$CREATE_INITRAMFS" = "true" ) {; then
  await $`log_info "Creating initramfs..."`;
  await $`local initramfs_dir="$HOME/qemu-dev/kernel/initramfs"`;
  await mkdir("$initramfs_dir", { recursive: true });
  // Create basic initramfs structure
  process.chdir("$initramfs_dir");
  await mkdir("{bin,sbin,etc,proc,sys,dev,tmp,usr/bin,usr/sbin}", { recursive: true });
  // Copy busybox if available
  await $`if command -v busybox &> /dev/null; then`;
  await copyFile("$(which busybox)", "bin/");
  process.chdir("bin");
  for (const prog of [$(./busybox --list); do]) {
  await $`ln -s busybox $prog 2>/dev/null || true`;
  }
  process.chdir("..");
  }
  // Create init script
  await $`cat > init << 'EOF'`;
  await $`/bin/mount -t proc none /proc`;
  await $`/bin/mount -t sysfs none /sys`;
  await $`/bin/mount -t devtmpfs none /dev`;
  await $`exec /bin/sh`;
  await $`EOF`;
  await $`chmod +x init`;
  // Create initramfs archive
  await $`find . | cpio -o -H newc | gzip > $HOME/qemu-dev/kernel/initramfs.gz`;
  await $`log_success "Initramfs created at $HOME/qemu-dev/kernel/initramfs.gz"`;
  }
  await $`}`;
  // Create QEMU boot script
  await $`create_boot_script() {`;
  await $`log_info "Creating QEMU boot script..."`;
  await $`cat > $HOME/qemu-dev/scripts/boot-custom-kernel.sh << 'EOF'`;
  // Boot custom kernel in QEMU
  await $`KERNEL="${1:-$HOME/qemu-dev/kernel/bzImage}"`;
  await $`INITRD="${2:-$HOME/qemu-dev/kernel/initramfs.gz}"`;
  await $`ROOTFS="${3:-$HOME/qemu-dev/images/ubuntu-dev.qcow2}"`;
  await $`MEMORY="${4:-4G}"`;
  await $`CPUS="${5:-4}"`;
  await $`QEMU_ARGS=""`;
  // Check if booting with initramfs only or full rootfs
  if (-z "$3" ] || [ "$3" = "none" ) {; then
  // Boot with initramfs only
  await $`QEMU_ARGS="-initrd $INITRD"`;
  await $`APPEND="console=ttyS0 rdinit=/init"`;
  } else {
  // Boot with rootfs
  await $`QEMU_ARGS="-initrd $INITRD -drive file=$ROOTFS,if=virtio,format=qcow2"`;
  await $`APPEND="console=ttyS0 root=/dev/vda1 rw"`;
  }
  await $`qemu-system-x86_64 \`;
  await $`-enable-kvm \`;
  await $`-m $MEMORY \`;
  await $`-cpu host \`;
  await $`-smp $CPUS \`;
  await $`-kernel $KERNEL \`;
  await $`$QEMU_ARGS \`;
  await $`-append "$APPEND" \`;
  await $`-serial mon:stdio \`;
  await $`-display none`;
  await $`EOF`;
  await $`chmod +x $HOME/qemu-dev/scripts/boot-custom-kernel.sh`;
  await $`log_success "Boot script created at $HOME/qemu-dev/scripts/boot-custom-kernel.sh"`;
  await $`}`;
  // Clean build
  await $`clean_build() {`;
  if ("$CLEAN" = "true" ) {; then
  await $`log_info "Cleaning build directory..."`;
  process.chdir("$KERNEL_DIR");
  await $`make O=$BUILD_DIR clean`;
  await $`log_success "Build directory cleaned"`;
  }
  await $`}`;
  // Main build process
  await $`main() {`;
  await $`log_info "Linux Kernel Build Script"`;
  await $`log_info "Configuration:"`;
  await $`log_info "  - Kernel directory: $KERNEL_DIR"`;
  await $`log_info "  - Kernel version: $KERNEL_VERSION"`;
  await $`log_info "  - Build directory: $BUILD_DIR"`;
  await $`log_info "  - Parallel jobs: $NUM_JOBS"`;
  await $`echo`;
  // Run build steps
  await $`check_prerequisites`;
  await $`download_kernel`;
  if ("$CLEAN" = "true" ) {; then
  await $`clean_build`;
  }
  await $`configure_kernel`;
  await $`check_rust_available`;
  await $`build_kernel`;
  await $`build_modules`;
  await $`create_initramfs`;
  await $`create_boot_script`;
  await $`echo`;
  await $`log_success "Kernel build completed successfully!"`;
  await $`echo`;
  await $`log_info "To test the kernel:"`;
  await $`log_info "  1. Boot with initramfs only:"`;
  await $`log_info "     $HOME/qemu-dev/scripts/boot-custom-kernel.sh"`;
  await $`log_info "  2. Boot with Ubuntu rootfs:"`;
  await $`log_info "     $HOME/qemu-dev/scripts/boot-custom-kernel.sh \\`;
  await $`$HOME/qemu-dev/kernel/bzImage \\`;
  await $`$HOME/qemu-dev/kernel/initramfs.gz \\`;
  await $`$HOME/qemu-dev/images/ubuntu-dev.qcow2"`;
  await $`}`;
  // Parse command line arguments
  while ([[ $# -gt 0 ]]; do) {
  await $`case $1 in`;
  await $`--kernel-dir)`;
  await $`KERNEL_DIR="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--kernel-version)`;
  await $`KERNEL_VERSION="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--build-dir)`;
  await $`BUILD_DIR="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--jobs)`;
  await $`NUM_JOBS="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--with-modules)`;
  await $`BUILD_MODULES=true`;
  await $`shift`;
  await $`;;`;
  await $`--install-modules)`;
  await $`BUILD_MODULES=true`;
  await $`INSTALL_MODULES=true`;
  await $`shift`;
  await $`;;`;
  await $`--with-initramfs)`;
  await $`CREATE_INITRAMFS=true`;
  await $`shift`;
  await $`;;`;
  await $`--clean)`;
  await $`CLEAN=true`;
  await $`shift`;
  await $`;;`;
  await $`--menuconfig)`;
  await $`MENUCONFIG=true`;
  await $`shift`;
  await $`;;`;
  await $`--help)`;
  console.log("Usage: $0 [OPTIONS]");
  console.log("Options:");
  console.log("  --kernel-dir PATH      Kernel source directory");
  console.log("  --kernel-version VER   Kernel version to build");
  console.log("  --build-dir PATH       Build output directory");
  console.log("  --jobs N               Number of parallel build jobs");
  console.log("  --with-modules         Build kernel modules");
  console.log("  --install-modules      Build and install modules");
  console.log("  --with-initramfs       Create initramfs");
  console.log("  --clean                Clean before building");
  console.log("  --menuconfig           Run menuconfig");
  console.log("  --help                 Show this help message");
  process.exit(0);
  await $`;;`;
  await $`*)`;
  await $`log_error "Unknown option: $1"`;
  await $`;;`;
  await $`esac`;
  }
  // Run menuconfig if requested
  if ("$MENUCONFIG" = "true" ) {; then
  process.chdir("$KERNEL_DIR");
  await $`make O=$BUILD_DIR LLVM=1 menuconfig`;
  process.exit(0);
  }
  // Run main build
  await $`main`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}