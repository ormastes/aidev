#!/usr/bin/env python3
"""
Migrated from: build-linux-kernel.sh
Auto-generated Python - 2025-08-16T04:57:27.673Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Linux Kernel Build Script with Rust Support
    # Part of AI Development Platform - init_qemu theme
    subprocess.run("set -e", shell=True)
    # Configuration
    subprocess.run("KERNEL_DIR="${KERNEL_DIR:-$HOME/qemu-dev/kernel/linux}"", shell=True)
    subprocess.run("KERNEL_VERSION="${KERNEL_VERSION:-6.8.0}"", shell=True)
    subprocess.run("RUST_VERSION="${RUST_VERSION:-1.81.0}"", shell=True)
    subprocess.run("BUILD_DIR="${BUILD_DIR:-$KERNEL_DIR/build}"", shell=True)
    subprocess.run("NUM_JOBS="${NUM_JOBS:-$(nproc)}"", shell=True)
    # Color codes
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    # Functions
    subprocess.run("log_info() {", shell=True)
    print("-e ")${BLUE}[INFO]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("log_success() {", shell=True)
    print("-e ")${GREEN}[SUCCESS]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("log_warning() {", shell=True)
    print("-e ")${YELLOW}[WARNING]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("log_error() {", shell=True)
    print("-e ")${RED}[ERROR]${NC} $1"
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Check prerequisites
    subprocess.run("check_prerequisites() {", shell=True)
    subprocess.run("log_info "Checking prerequisites..."", shell=True)
    # Check for required tools
    subprocess.run("local tools=("git" "make" "gcc" "clang" "rustc" "bindgen")", shell=True)
    for tool in ["${tools[@]}"; do]:
    subprocess.run("if ! command -v $tool &> /dev/null; then", shell=True)
    subprocess.run("log_error "$tool is not installed. Please run setup-qemu-environment.sh first"", shell=True)
    # Check Rust version
    subprocess.run("local rust_version=$(rustc --version | awk '{print $2}')", shell=True)
    subprocess.run("log_info "Rust version: $rust_version"", shell=True)
    # Check for LLVM
    subprocess.run("if ! command -v llvm-config &> /dev/null; then", shell=True)
    subprocess.run("log_warning "LLVM not found in PATH"", shell=True)
    else:
    subprocess.run("log_info "LLVM version: $(llvm-config --version)"", shell=True)
    subprocess.run("log_success "Prerequisites check passed"", shell=True)
    subprocess.run("}", shell=True)
    # Download kernel source
    subprocess.run("download_kernel() {", shell=True)
    if ! -d "$KERNEL_DIR" :; then
    subprocess.run("log_info "Downloading Linux kernel source..."", shell=True)
    Path("$(dirname $KERNEL_DIR)").mkdir(parents=True, exist_ok=True)
    os.chdir("$(dirname $KERNEL_DIR)")
    # Clone stable kernel
    subprocess.run("git clone --depth 1 --branch v$KERNEL_VERSION \", shell=True)
    subprocess.run("https://github.com/torvalds/linux.git linux", shell=True)
    subprocess.run("log_success "Kernel source downloaded"", shell=True)
    else:
    subprocess.run("log_info "Kernel source already exists at $KERNEL_DIR"", shell=True)
    # Update to specified version
    os.chdir("$KERNEL_DIR")
    subprocess.run("git fetch --tags", shell=True)
    subprocess.run("git checkout v$KERNEL_VERSION 2>/dev/null || log_warning "Could not checkout v$KERNEL_VERSION"", shell=True)
    subprocess.run("}", shell=True)
    # Configure kernel
    subprocess.run("configure_kernel() {", shell=True)
    subprocess.run("log_info "Configuring kernel..."", shell=True)
    os.chdir("$KERNEL_DIR")
    # Create build directory
    Path("$BUILD_DIR").mkdir(parents=True, exist_ok=True)
    # Start with default config
    subprocess.run("make O=$BUILD_DIR defconfig", shell=True)
    # Enable Rust support
    subprocess.run("log_info "Enabling Rust support..."", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable EXPERT", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable RUST", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable RUST_IS_AVAILABLE", shell=True)
    # Enable useful options for development
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable DEBUG_KERNEL", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable DEBUG_INFO", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable FRAME_POINTER", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable KGDB", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable KGDB_SERIAL_CONSOLE", shell=True)
    # Enable virtualization features
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable VIRTUALIZATION", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable KVM", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable KVM_INTEL", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable KVM_AMD", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable VHOST_NET", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable VHOST_SCSI", shell=True)
    # Enable NVMe support
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable BLK_DEV_NVME", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable NVME_CORE", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable NVME_MULTIPATH", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable NVME_HWMON", shell=True)
    # Enable 9P filesystem for QEMU sharing
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable NET_9P", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable NET_9P_VIRTIO", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable 9P_FS", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable 9P_FS_POSIX_ACL", shell=True)
    subprocess.run("scripts/config --file $BUILD_DIR/.config --enable 9P_FS_SECURITY", shell=True)
    # Update config
    subprocess.run("make O=$BUILD_DIR olddefconfig", shell=True)
    subprocess.run("log_success "Kernel configured"", shell=True)
    subprocess.run("}", shell=True)
    # Check Rust availability
    subprocess.run("check_rust_available() {", shell=True)
    subprocess.run("log_info "Checking Rust availability for kernel..."", shell=True)
    os.chdir("$KERNEL_DIR")
    subprocess.run("if make O=$BUILD_DIR LLVM=1 rustavailable; then", shell=True)
    subprocess.run("log_success "Rust is available for kernel build"", shell=True)
    subprocess.run("return 0", shell=True)
    else:
    subprocess.run("log_warning "Rust is not available for kernel build"", shell=True)
    subprocess.run("log_info "Attempting to fix Rust setup..."", shell=True)
    # Set required environment variables
    os.environ["RUSTC"] = "$(which rustc)"
    os.environ["BINDGEN"] = "$(which bindgen)"
    os.environ["RUSTFMT"] = "$(which rustfmt)"
    os.environ["RUST_LIB_SRC"] = "$(rustc --print sysroot)/lib/rustlib/src/rust/library"
    # Try again
    subprocess.run("if make O=$BUILD_DIR LLVM=1 rustavailable; then", shell=True)
    subprocess.run("log_success "Rust setup fixed"", shell=True)
    subprocess.run("return 0", shell=True)
    else:
    subprocess.run("log_error "Failed to setup Rust for kernel build"", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Build kernel
    subprocess.run("build_kernel() {", shell=True)
    subprocess.run("log_info "Building kernel with $NUM_JOBS parallel jobs..."", shell=True)
    os.chdir("$KERNEL_DIR")
    # Set build environment
    os.environ["LLVM"] = "1"
    os.environ["LLVM_IAS"] = "1"
    # Build kernel
    subprocess.run("make O=$BUILD_DIR -j$NUM_JOBS LLVM=1 LLVM_IAS=1", shell=True)
    subprocess.run("log_success "Kernel build completed"", shell=True)
    # Display kernel info
    subprocess.run("log_info "Kernel image: $BUILD_DIR/arch/x86/boot/bzImage"", shell=True)
    subprocess.run("log_info "Kernel version: $(make O=$BUILD_DIR kernelversion)"", shell=True)
    # Create symlink for easy access
    subprocess.run("ln -sf $BUILD_DIR/arch/x86/boot/bzImage $HOME/qemu-dev/kernel/bzImage", shell=True)
    subprocess.run("log_info "Symlink created at: $HOME/qemu-dev/kernel/bzImage"", shell=True)
    subprocess.run("}", shell=True)
    # Build kernel modules
    subprocess.run("build_modules() {", shell=True)
    if "$BUILD_MODULES" = "true" :; then
    subprocess.run("log_info "Building kernel modules..."", shell=True)
    os.chdir("$KERNEL_DIR")
    subprocess.run("make O=$BUILD_DIR -j$NUM_JOBS LLVM=1 modules", shell=True)
    subprocess.run("log_success "Kernel modules built"", shell=True)
    # Install modules to staging directory
    if "$INSTALL_MODULES" = "true" :; then
    subprocess.run("local modules_dir="$HOME/qemu-dev/kernel/modules"", shell=True)
    Path("$modules_dir").mkdir(parents=True, exist_ok=True)
    subprocess.run("make O=$BUILD_DIR LLVM=1 INSTALL_MOD_PATH=$modules_dir modules_install", shell=True)
    subprocess.run("log_success "Modules installed to $modules_dir"", shell=True)
    subprocess.run("}", shell=True)
    # Create initramfs
    subprocess.run("create_initramfs() {", shell=True)
    if "$CREATE_INITRAMFS" = "true" :; then
    subprocess.run("log_info "Creating initramfs..."", shell=True)
    subprocess.run("local initramfs_dir="$HOME/qemu-dev/kernel/initramfs"", shell=True)
    Path("$initramfs_dir").mkdir(parents=True, exist_ok=True)
    # Create basic initramfs structure
    os.chdir("$initramfs_dir")
    Path("{bin,sbin,etc,proc,sys,dev,tmp,usr/bin,usr/sbin}").mkdir(parents=True, exist_ok=True)
    # Copy busybox if available
    subprocess.run("if command -v busybox &> /dev/null; then", shell=True)
    shutil.copy2("$(which busybox)", "bin/")
    os.chdir("bin")
    for prog in [$(./busybox --list); do]:
    subprocess.run("ln -s busybox $prog 2>/dev/null || true", shell=True)
    os.chdir("..")
    # Create init script
    subprocess.run("cat > init << 'EOF'", shell=True)
    subprocess.run("/bin/mount -t proc none /proc", shell=True)
    subprocess.run("/bin/mount -t sysfs none /sys", shell=True)
    subprocess.run("/bin/mount -t devtmpfs none /dev", shell=True)
    subprocess.run("exec /bin/sh", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x init", shell=True)
    # Create initramfs archive
    subprocess.run("find . | cpio -o -H newc | gzip > $HOME/qemu-dev/kernel/initramfs.gz", shell=True)
    subprocess.run("log_success "Initramfs created at $HOME/qemu-dev/kernel/initramfs.gz"", shell=True)
    subprocess.run("}", shell=True)
    # Create QEMU boot script
    subprocess.run("create_boot_script() {", shell=True)
    subprocess.run("log_info "Creating QEMU boot script..."", shell=True)
    subprocess.run("cat > $HOME/qemu-dev/scripts/boot-custom-kernel.sh << 'EOF'", shell=True)
    # Boot custom kernel in QEMU
    subprocess.run("KERNEL="${1:-$HOME/qemu-dev/kernel/bzImage}"", shell=True)
    subprocess.run("INITRD="${2:-$HOME/qemu-dev/kernel/initramfs.gz}"", shell=True)
    subprocess.run("ROOTFS="${3:-$HOME/qemu-dev/images/ubuntu-dev.qcow2}"", shell=True)
    subprocess.run("MEMORY="${4:-4G}"", shell=True)
    subprocess.run("CPUS="${5:-4}"", shell=True)
    subprocess.run("QEMU_ARGS=""", shell=True)
    # Check if booting with initramfs only or full rootfs
    if -z "$3" ] || [ "$3" = "none" :; then
    # Boot with initramfs only
    subprocess.run("QEMU_ARGS="-initrd $INITRD"", shell=True)
    subprocess.run("APPEND="console=ttyS0 rdinit=/init"", shell=True)
    else:
    # Boot with rootfs
    subprocess.run("QEMU_ARGS="-initrd $INITRD -drive file=$ROOTFS,if=virtio,format=qcow2"", shell=True)
    subprocess.run("APPEND="console=ttyS0 root=/dev/vda1 rw"", shell=True)
    subprocess.run("qemu-system-x86_64 \", shell=True)
    subprocess.run("-enable-kvm \", shell=True)
    subprocess.run("-m $MEMORY \", shell=True)
    subprocess.run("-cpu host \", shell=True)
    subprocess.run("-smp $CPUS \", shell=True)
    subprocess.run("-kernel $KERNEL \", shell=True)
    subprocess.run("$QEMU_ARGS \", shell=True)
    subprocess.run("-append "$APPEND" \", shell=True)
    subprocess.run("-serial mon:stdio \", shell=True)
    subprocess.run("-display none", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x $HOME/qemu-dev/scripts/boot-custom-kernel.sh", shell=True)
    subprocess.run("log_success "Boot script created at $HOME/qemu-dev/scripts/boot-custom-kernel.sh"", shell=True)
    subprocess.run("}", shell=True)
    # Clean build
    subprocess.run("clean_build() {", shell=True)
    if "$CLEAN" = "true" :; then
    subprocess.run("log_info "Cleaning build directory..."", shell=True)
    os.chdir("$KERNEL_DIR")
    subprocess.run("make O=$BUILD_DIR clean", shell=True)
    subprocess.run("log_success "Build directory cleaned"", shell=True)
    subprocess.run("}", shell=True)
    # Main build process
    subprocess.run("main() {", shell=True)
    subprocess.run("log_info "Linux Kernel Build Script"", shell=True)
    subprocess.run("log_info "Configuration:"", shell=True)
    subprocess.run("log_info "  - Kernel directory: $KERNEL_DIR"", shell=True)
    subprocess.run("log_info "  - Kernel version: $KERNEL_VERSION"", shell=True)
    subprocess.run("log_info "  - Build directory: $BUILD_DIR"", shell=True)
    subprocess.run("log_info "  - Parallel jobs: $NUM_JOBS"", shell=True)
    subprocess.run("echo", shell=True)
    # Run build steps
    subprocess.run("check_prerequisites", shell=True)
    subprocess.run("download_kernel", shell=True)
    if "$CLEAN" = "true" :; then
    subprocess.run("clean_build", shell=True)
    subprocess.run("configure_kernel", shell=True)
    subprocess.run("check_rust_available", shell=True)
    subprocess.run("build_kernel", shell=True)
    subprocess.run("build_modules", shell=True)
    subprocess.run("create_initramfs", shell=True)
    subprocess.run("create_boot_script", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("log_success "Kernel build completed successfully!"", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("log_info "To test the kernel:"", shell=True)
    subprocess.run("log_info "  1. Boot with initramfs only:"", shell=True)
    subprocess.run("log_info "     $HOME/qemu-dev/scripts/boot-custom-kernel.sh"", shell=True)
    subprocess.run("log_info "  2. Boot with Ubuntu rootfs:"", shell=True)
    subprocess.run("log_info "     $HOME/qemu-dev/scripts/boot-custom-kernel.sh \\", shell=True)
    subprocess.run("$HOME/qemu-dev/kernel/bzImage \\", shell=True)
    subprocess.run("$HOME/qemu-dev/kernel/initramfs.gz \\", shell=True)
    subprocess.run("$HOME/qemu-dev/images/ubuntu-dev.qcow2"", shell=True)
    subprocess.run("}", shell=True)
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do:
    subprocess.run("case $1 in", shell=True)
    subprocess.run("--kernel-dir)", shell=True)
    subprocess.run("KERNEL_DIR="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--kernel-version)", shell=True)
    subprocess.run("KERNEL_VERSION="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--build-dir)", shell=True)
    subprocess.run("BUILD_DIR="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--jobs)", shell=True)
    subprocess.run("NUM_JOBS="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--with-modules)", shell=True)
    subprocess.run("BUILD_MODULES=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--install-modules)", shell=True)
    subprocess.run("BUILD_MODULES=true", shell=True)
    subprocess.run("INSTALL_MODULES=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--with-initramfs)", shell=True)
    subprocess.run("CREATE_INITRAMFS=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--clean)", shell=True)
    subprocess.run("CLEAN=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--menuconfig)", shell=True)
    subprocess.run("MENUCONFIG=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--help)", shell=True)
    print("Usage: $0 [OPTIONS]")
    print("Options:")
    print("  --kernel-dir PATH      Kernel source directory")
    print("  --kernel-version VER   Kernel version to build")
    print("  --build-dir PATH       Build output directory")
    print("  --jobs N               Number of parallel build jobs")
    print("  --with-modules         Build kernel modules")
    print("  --install-modules      Build and install modules")
    print("  --with-initramfs       Create initramfs")
    print("  --clean                Clean before building")
    print("  --menuconfig           Run menuconfig")
    print("  --help                 Show this help message")
    sys.exit(0)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("log_error "Unknown option: $1"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    # Run menuconfig if requested
    if "$MENUCONFIG" = "true" :; then
    os.chdir("$KERNEL_DIR")
    subprocess.run("make O=$BUILD_DIR LLVM=1 menuconfig", shell=True)
    sys.exit(0)
    # Run main build
    subprocess.run("main", shell=True)

if __name__ == "__main__":
    main()