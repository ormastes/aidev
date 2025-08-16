#!/usr/bin/env python3
"""
Migrated from: setup-qemu-environment.sh
Auto-generated Python - 2025-08-16T04:57:27.690Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # QEMU Linux Development Environment Setup Script
    # Part of AI Development Platform - init_qemu theme
    subprocess.run("set -e", shell=True)
    # Color codes for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Configuration
    subprocess.run("QEMU_HOME="${QEMU_HOME:-$HOME/qemu-dev}"", shell=True)
    subprocess.run("KERNEL_VERSION="${KERNEL_VERSION:-6.8.0}"", shell=True)
    subprocess.run("RUST_VERSION="${RUST_VERSION:-1.81.0}"", shell=True)
    subprocess.run("UBUNTU_VERSION="${UBUNTU_VERSION:-24.10}"", shell=True)
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
    subprocess.run("check_command() {", shell=True)
    subprocess.run("if command -v $1 &> /dev/null; then", shell=True)
    subprocess.run("return 0", shell=True)
    else:
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Main setup process
    subprocess.run("main() {", shell=True)
    subprocess.run("log_info "Starting QEMU Linux Development Environment Setup"", shell=True)
    subprocess.run("log_info "Configuration:"", shell=True)
    subprocess.run("log_info "  - QEMU_HOME: $QEMU_HOME"", shell=True)
    subprocess.run("log_info "  - KERNEL_VERSION: $KERNEL_VERSION"", shell=True)
    subprocess.run("log_info "  - RUST_VERSION: $RUST_VERSION"", shell=True)
    subprocess.run("log_info "  - UBUNTU_VERSION: $UBUNTU_VERSION"", shell=True)
    # Step 1: System update
    subprocess.run("log_info "Updating system packages..."", shell=True)
    subprocess.run("sudo apt-get update || log_error "Failed to update package lists"", shell=True)
    # Step 2: Install build dependencies
    subprocess.run("log_info "Installing build dependencies..."", shell=True)
    subprocess.run("sudo apt-get install -y \", shell=True)
    subprocess.run("git fakeroot build-essential ncurses-dev xz-utils \", shell=True)
    subprocess.run("libssl-dev bc flex libelf-dev bison \", shell=True)
    subprocess.run("lld clang llvm \", shell=True)
    subprocess.run("net-tools bridge-utils \", shell=True)
    subprocess.run("python3 python3-pip ninja-build || log_error "Failed to install build tools"", shell=True)
    # Step 3: Install QEMU dependencies
    subprocess.run("log_info "Installing QEMU dependencies..."", shell=True)
    subprocess.run("sudo apt-get install -y \", shell=True)
    subprocess.run("libpixman-1-dev libaio-dev libjemalloc-dev \", shell=True)
    subprocess.run("libglib2.0-dev zlib1g-dev libnuma-dev libfdt-dev \", shell=True)
    subprocess.run("libtool libcap-ng-dev libattr1-dev libvdeplug-dev \", shell=True)
    subprocess.run("libcurl4-openssl-dev libspice-protocol-dev libspice-server-dev \", shell=True)
    subprocess.run("libusb-1.0-0-dev libbluetooth-dev libgtk-3-dev \", shell=True)
    subprocess.run("libx11-dev libxml2-dev libzstd-dev || log_error "Failed to install QEMU dependencies"", shell=True)
    # Step 4: Install QEMU system packages
    subprocess.run("log_info "Installing QEMU system packages..."", shell=True)
    subprocess.run("sudo apt-get install -y \", shell=True)
    subprocess.run("qemu-system-x86 qemu-utils qemu-kvm \", shell=True)
    subprocess.run("libvirt-daemon-system libvirt-clients || log_error "Failed to install QEMU packages"", shell=True)
    # Step 5: Setup Rust environment
    subprocess.run("log_info "Setting up Rust environment..."", shell=True)
    subprocess.run("if ! check_command rustup; then", shell=True)
    subprocess.run("log_info "Installing Rust..."", shell=True)
    subprocess.run("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y", shell=True)
    subprocess.run("source $HOME/.cargo/env", shell=True)
    subprocess.run("log_info "Configuring Rust for kernel development..."", shell=True)
    subprocess.run("rustup install $RUST_VERSION", shell=True)
    subprocess.run("rustup default $RUST_VERSION", shell=True)
    subprocess.run("rustup override set $RUST_VERSION", shell=True)
    subprocess.run("rustup component add rust-src", shell=True)
    # Install bindgen for kernel development
    subprocess.run("cargo install --locked bindgen-cli || log_warning "bindgen-cli installation failed (may already be installed)"", shell=True)
    # Step 6: Create QEMU development directory structure
    subprocess.run("log_info "Creating QEMU development directory structure..."", shell=True)
    Path("$QEMU_HOME/{vms,images,scripts,kernel,logs}").mkdir(parents=True, exist_ok=True)
    # Step 7: Clone and build QEMU-NVMe if requested
    if "$BUILD_QEMU_NVME" = "true" :; then
    subprocess.run("log_info "Building QEMU with NVMe support..."", shell=True)
    if ! -d "$QEMU_HOME/qemu-nvme" :; then
    os.chdir("$QEMU_HOME")
    subprocess.run("git clone https://github.com/OpenChannelSSD/qemu-nvme.git", shell=True)
    os.chdir("qemu-nvme")
    subprocess.run("./configure \", shell=True)
    subprocess.run("--target-list=x86_64-softmmu \", shell=True)
    subprocess.run("--prefix=$QEMU_HOME/qemu-nvme \", shell=True)
    subprocess.run("--python=python3 \", shell=True)
    subprocess.run("--enable-kvm \", shell=True)
    subprocess.run("--enable-avx2 \", shell=True)
    subprocess.run("--enable-numa \", shell=True)
    subprocess.run("--enable-tools \", shell=True)
    subprocess.run("--enable-virtfs \", shell=True)
    subprocess.run("--enable-linux-aio \", shell=True)
    subprocess.run("--enable-coroutine-pool \", shell=True)
    subprocess.run("--enable-jemalloc \", shell=True)
    subprocess.run("--enable-debug --disable-werror", shell=True)
    subprocess.run("make -j$(nproc)", shell=True)
    subprocess.run("make install", shell=True)
    subprocess.run("log_success "QEMU-NVMe built successfully"", shell=True)
    else:
    subprocess.run("log_warning "QEMU-NVMe already exists, skipping build"", shell=True)
    # Step 8: Setup network bridge
    subprocess.run("log_info "Setting up network bridge for QEMU..."", shell=True)
    subprocess.run("if ! ip link show qemubr0 &> /dev/null; then", shell=True)
    subprocess.run("sudo ip link add name qemubr0 type bridge", shell=True)
    subprocess.run("sudo ip addr add 192.168.100.1/24 dev qemubr0", shell=True)
    subprocess.run("sudo ip link set qemubr0 up", shell=True)
    # Enable IP forwarding
    subprocess.run("sudo sysctl -w net.ipv4.ip_forward=1", shell=True)
    print("net.ipv4.ip_forward=1") | sudo tee -a /etc/sysctl.conf
    # Setup NAT
    subprocess.run("sudo iptables -t nat -A POSTROUTING -o $(ip route | grep default | awk '{print $5}') -j MASQUERADE", shell=True)
    subprocess.run("sudo iptables -A FORWARD -i qemubr0 -j ACCEPT", shell=True)
    subprocess.run("sudo iptables -A FORWARD -o qemubr0 -j ACCEPT", shell=True)
    subprocess.run("log_success "Network bridge qemubr0 created"", shell=True)
    else:
    subprocess.run("log_info "Network bridge qemubr0 already exists"", shell=True)
    # Step 9: Check KVM availability
    subprocess.run("log_info "Checking KVM availability..."", shell=True)
    if -e /dev/kvm :; then
    subprocess.run("log_success "KVM is available"", shell=True)
    # Add current user to kvm group
    subprocess.run("sudo usermod -aG kvm $USER", shell=True)
    subprocess.run("log_info "Added $USER to kvm group (re-login may be required)"", shell=True)
    else:
    subprocess.run("log_warning "KVM not available - VMs will run without hardware acceleration"", shell=True)
    subprocess.run("log_info "Check if virtualization is enabled in BIOS"", shell=True)
    # Step 10: Setup VFIO if requested
    if "$SETUP_VFIO" = "true" :; then
    subprocess.run("log_info "Setting up VFIO for PCI passthrough..."", shell=True)
    # Load VFIO modules
    subprocess.run("sudo modprobe vfio", shell=True)
    subprocess.run("sudo modprobe vfio-pci", shell=True)
    subprocess.run("sudo modprobe vfio_iommu_type1", shell=True)
    # Make persistent
    print("vfio") | sudo tee -a /etc/modules
    print("vfio-pci") | sudo tee -a /etc/modules
    print("vfio_iommu_type1") | sudo tee -a /etc/modules
    subprocess.run("log_success "VFIO modules loaded"", shell=True)
    # Step 11: Create helper scripts
    subprocess.run("log_info "Creating helper scripts..."", shell=True)
    # Create VM launcher script
    subprocess.run("cat > $QEMU_HOME/scripts/launch-vm.sh << 'EOF'", shell=True)
    # Launch QEMU VM with standard configuration
    subprocess.run("VM_NAME="${1:-ubuntu-dev}"", shell=True)
    subprocess.run("VM_IMAGE="${2:-$QEMU_HOME/images/ubuntu-dev.qcow2}"", shell=True)
    subprocess.run("VM_MEMORY="${3:-8G}"", shell=True)
    subprocess.run("VM_CPUS="${4:-4}"", shell=True)
    subprocess.run("SSH_PORT="${5:-6665}"", shell=True)
    subprocess.run("QEMU_CMD="${QEMU_BIN:-qemu-system-x86_64}"", shell=True)
    subprocess.run("exec $QEMU_CMD \", shell=True)
    subprocess.run("-enable-kvm \", shell=True)
    subprocess.run("-m $VM_MEMORY \", shell=True)
    subprocess.run("-cpu host \", shell=True)
    subprocess.run("-smp $VM_CPUS \", shell=True)
    subprocess.run("-name "$VM_NAME" \", shell=True)
    subprocess.run("-drive file="$VM_IMAGE",if=virtio,format=qcow2 \", shell=True)
    subprocess.run("-net nic,model=virtio \", shell=True)
    subprocess.run("-net user,hostfwd=tcp::${SSH_PORT}-:22 \", shell=True)
    subprocess.run("-serial mon:stdio \", shell=True)
    subprocess.run("-monitor unix:/tmp/qemu-${VM_NAME}.sock,server,nowait \", shell=True)
    subprocess.run(""$@"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x $QEMU_HOME/scripts/launch-vm.sh", shell=True)
    # Create SSH connection script
    subprocess.run("cat > $QEMU_HOME/scripts/connect-vm.sh << 'EOF'", shell=True)
    # Connect to running VM via SSH
    subprocess.run("SSH_PORT="${1:-6665}"", shell=True)
    subprocess.run("SSH_USER="${2:-ubuntu}"", shell=True)
    subprocess.run("ssh -o StrictHostKeyChecking=no \", shell=True)
    subprocess.run("-o UserKnownHostsFile=/dev/null \", shell=True)
    subprocess.run("-p ${SSH_PORT} \", shell=True)
    subprocess.run("${SSH_USER}@localhost", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x $QEMU_HOME/scripts/connect-vm.sh", shell=True)
    # Create disk image creation script
    subprocess.run("cat > $QEMU_HOME/scripts/create-disk.sh << 'EOF'", shell=True)
    # Create QEMU disk image
    subprocess.run("IMAGE_NAME="${1:-ubuntu-dev.qcow2}"", shell=True)
    subprocess.run("IMAGE_SIZE="${2:-128G}"", shell=True)
    subprocess.run("IMAGE_FORMAT="${3:-qcow2}"", shell=True)
    subprocess.run("qemu-img create -f $IMAGE_FORMAT \", shell=True)
    subprocess.run("$QEMU_HOME/images/$IMAGE_NAME \", shell=True)
    subprocess.run("$IMAGE_SIZE", shell=True)
    print("Created disk image: $QEMU_HOME/images/$IMAGE_NAME")
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x $QEMU_HOME/scripts/create-disk.sh", shell=True)
    subprocess.run("log_success "Helper scripts created in $QEMU_HOME/scripts/"", shell=True)
    # Step 12: Environment setup
    subprocess.run("log_info "Setting up environment variables..."", shell=True)
    # Add to bashrc if not already present
    subprocess.run("if ! grep -q "QEMU_HOME=" $HOME/.bashrc; then", shell=True)
    subprocess.run("cat >> $HOME/.bashrc << EOF", shell=True)
    # QEMU Development Environment
    os.environ["QEMU_HOME"] = "$QEMU_HOME"
    os.environ["PATH"] = "\$QEMU_HOME/scripts:\$PATH"
    os.environ["LIBCLANG_PATH"] = "/usr/lib/llvm-18/lib"
    subprocess.run("EOF", shell=True)
    subprocess.run("log_success "Environment variables added to .bashrc"", shell=True)
    # Final summary
    subprocess.run("echo", shell=True)
    subprocess.run("log_success "QEMU Linux Development Environment Setup Complete!"", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("log_info "Directory structure created at: $QEMU_HOME"", shell=True)
    subprocess.run("log_info "Helper scripts available in: $QEMU_HOME/scripts/"", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("log_info "Next steps:"", shell=True)
    subprocess.run("log_info "  1. Download Ubuntu ISO: wget https://releases.ubuntu.com/24.10/ubuntu-24.10-live-server-amd64.iso"", shell=True)
    subprocess.run("log_info "  2. Create disk image: $QEMU_HOME/scripts/create-disk.sh ubuntu-dev.qcow2 128G"", shell=True)
    subprocess.run("log_info "  3. Install Ubuntu: $QEMU_HOME/scripts/launch-vm.sh ubuntu-dev -cdrom ubuntu-24.10-live-server-amd64.iso -boot d"", shell=True)
    subprocess.run("log_info "  4. Run VM: $QEMU_HOME/scripts/launch-vm.sh ubuntu-dev"", shell=True)
    subprocess.run("log_info "  5. Connect via SSH: $QEMU_HOME/scripts/connect-vm.sh"", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("log_warning "Please log out and back in for group changes to take effect"", shell=True)
    subprocess.run("}", shell=True)
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do:
    subprocess.run("case $1 in", shell=True)
    subprocess.run("--build-qemu-nvme)", shell=True)
    subprocess.run("BUILD_QEMU_NVME=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--setup-vfio)", shell=True)
    subprocess.run("SETUP_VFIO=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--qemu-home)", shell=True)
    subprocess.run("QEMU_HOME="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--kernel-version)", shell=True)
    subprocess.run("KERNEL_VERSION="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--rust-version)", shell=True)
    subprocess.run("RUST_VERSION="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--help)", shell=True)
    print("Usage: $0 [OPTIONS]")
    print("Options:")
    print("  --build-qemu-nvme    Build QEMU with NVMe support from source")
    print("  --setup-vfio         Setup VFIO for PCI passthrough")
    print("  --qemu-home PATH     Set QEMU home directory (default: $HOME/qemu-dev)")
    print("  --kernel-version VER Set kernel version (default: 6.8.0)")
    print("  --rust-version VER   Set Rust version (default: 1.81.0)")
    print("  --help               Show this help message")
    sys.exit(0)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("log_error "Unknown option: $1"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    # Run main setup
    subprocess.run("main", shell=True)

if __name__ == "__main__":
    main()