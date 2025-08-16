#!/usr/bin/env bun
/**
 * Migrated from: setup-qemu-environment.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.689Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // QEMU Linux Development Environment Setup Script
  // Part of AI Development Platform - init_qemu theme
  await $`set -e`;
  // Color codes for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Configuration
  await $`QEMU_HOME="${QEMU_HOME:-$HOME/qemu-dev}"`;
  await $`KERNEL_VERSION="${KERNEL_VERSION:-6.8.0}"`;
  await $`RUST_VERSION="${RUST_VERSION:-1.81.0}"`;
  await $`UBUNTU_VERSION="${UBUNTU_VERSION:-24.10}"`;
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
  await $`check_command() {`;
  await $`if command -v $1 &> /dev/null; then`;
  await $`return 0`;
  } else {
  await $`return 1`;
  }
  await $`}`;
  // Main setup process
  await $`main() {`;
  await $`log_info "Starting QEMU Linux Development Environment Setup"`;
  await $`log_info "Configuration:"`;
  await $`log_info "  - QEMU_HOME: $QEMU_HOME"`;
  await $`log_info "  - KERNEL_VERSION: $KERNEL_VERSION"`;
  await $`log_info "  - RUST_VERSION: $RUST_VERSION"`;
  await $`log_info "  - UBUNTU_VERSION: $UBUNTU_VERSION"`;
  // Step 1: System update
  await $`log_info "Updating system packages..."`;
  await $`sudo apt-get update || log_error "Failed to update package lists"`;
  // Step 2: Install build dependencies
  await $`log_info "Installing build dependencies..."`;
  await $`sudo apt-get install -y \`;
  await $`git fakeroot build-essential ncurses-dev xz-utils \`;
  await $`libssl-dev bc flex libelf-dev bison \`;
  await $`lld clang llvm \`;
  await $`net-tools bridge-utils \`;
  await $`python3 python3-pip ninja-build || log_error "Failed to install build tools"`;
  // Step 3: Install QEMU dependencies
  await $`log_info "Installing QEMU dependencies..."`;
  await $`sudo apt-get install -y \`;
  await $`libpixman-1-dev libaio-dev libjemalloc-dev \`;
  await $`libglib2.0-dev zlib1g-dev libnuma-dev libfdt-dev \`;
  await $`libtool libcap-ng-dev libattr1-dev libvdeplug-dev \`;
  await $`libcurl4-openssl-dev libspice-protocol-dev libspice-server-dev \`;
  await $`libusb-1.0-0-dev libbluetooth-dev libgtk-3-dev \`;
  await $`libx11-dev libxml2-dev libzstd-dev || log_error "Failed to install QEMU dependencies"`;
  // Step 4: Install QEMU system packages
  await $`log_info "Installing QEMU system packages..."`;
  await $`sudo apt-get install -y \`;
  await $`qemu-system-x86 qemu-utils qemu-kvm \`;
  await $`libvirt-daemon-system libvirt-clients || log_error "Failed to install QEMU packages"`;
  // Step 5: Setup Rust environment
  await $`log_info "Setting up Rust environment..."`;
  await $`if ! check_command rustup; then`;
  await $`log_info "Installing Rust..."`;
  await $`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`;
  await $`source $HOME/.cargo/env`;
  }
  await $`log_info "Configuring Rust for kernel development..."`;
  await $`rustup install $RUST_VERSION`;
  await $`rustup default $RUST_VERSION`;
  await $`rustup override set $RUST_VERSION`;
  await $`rustup component add rust-src`;
  // Install bindgen for kernel development
  await $`cargo install --locked bindgen-cli || log_warning "bindgen-cli installation failed (may already be installed)"`;
  // Step 6: Create QEMU development directory structure
  await $`log_info "Creating QEMU development directory structure..."`;
  await mkdir("$QEMU_HOME/{vms,images,scripts,kernel,logs}", { recursive: true });
  // Step 7: Clone and build QEMU-NVMe if requested
  if ("$BUILD_QEMU_NVME" = "true" ) {; then
  await $`log_info "Building QEMU with NVMe support..."`;
  if (! -d "$QEMU_HOME/qemu-nvme" ) {; then
  process.chdir("$QEMU_HOME");
  await $`git clone https://github.com/OpenChannelSSD/qemu-nvme.git`;
  process.chdir("qemu-nvme");
  await $`./configure \`;
  await $`--target-list=x86_64-softmmu \`;
  await $`--prefix=$QEMU_HOME/qemu-nvme \`;
  await $`--python=python3 \`;
  await $`--enable-kvm \`;
  await $`--enable-avx2 \`;
  await $`--enable-numa \`;
  await $`--enable-tools \`;
  await $`--enable-virtfs \`;
  await $`--enable-linux-aio \`;
  await $`--enable-coroutine-pool \`;
  await $`--enable-jemalloc \`;
  await $`--enable-debug --disable-werror`;
  await $`make -j$(nproc)`;
  await $`make install`;
  await $`log_success "QEMU-NVMe built successfully"`;
  } else {
  await $`log_warning "QEMU-NVMe already exists, skipping build"`;
  }
  }
  // Step 8: Setup network bridge
  await $`log_info "Setting up network bridge for QEMU..."`;
  await $`if ! ip link show qemubr0 &> /dev/null; then`;
  await $`sudo ip link add name qemubr0 type bridge`;
  await $`sudo ip addr add 192.168.100.1/24 dev qemubr0`;
  await $`sudo ip link set qemubr0 up`;
  // Enable IP forwarding
  await $`sudo sysctl -w net.ipv4.ip_forward=1`;
  console.log("net.ipv4.ip_forward=1"); | sudo tee -a /etc/sysctl.conf
  // Setup NAT
  await $`sudo iptables -t nat -A POSTROUTING -o $(ip route | grep default | awk '{print $5}') -j MASQUERADE`;
  await $`sudo iptables -A FORWARD -i qemubr0 -j ACCEPT`;
  await $`sudo iptables -A FORWARD -o qemubr0 -j ACCEPT`;
  await $`log_success "Network bridge qemubr0 created"`;
  } else {
  await $`log_info "Network bridge qemubr0 already exists"`;
  }
  // Step 9: Check KVM availability
  await $`log_info "Checking KVM availability..."`;
  if (-e /dev/kvm ) {; then
  await $`log_success "KVM is available"`;
  // Add current user to kvm group
  await $`sudo usermod -aG kvm $USER`;
  await $`log_info "Added $USER to kvm group (re-login may be required)"`;
  } else {
  await $`log_warning "KVM not available - VMs will run without hardware acceleration"`;
  await $`log_info "Check if virtualization is enabled in BIOS"`;
  }
  // Step 10: Setup VFIO if requested
  if ("$SETUP_VFIO" = "true" ) {; then
  await $`log_info "Setting up VFIO for PCI passthrough..."`;
  // Load VFIO modules
  await $`sudo modprobe vfio`;
  await $`sudo modprobe vfio-pci`;
  await $`sudo modprobe vfio_iommu_type1`;
  // Make persistent
  console.log("vfio"); | sudo tee -a /etc/modules
  console.log("vfio-pci"); | sudo tee -a /etc/modules
  console.log("vfio_iommu_type1"); | sudo tee -a /etc/modules
  await $`log_success "VFIO modules loaded"`;
  }
  // Step 11: Create helper scripts
  await $`log_info "Creating helper scripts..."`;
  // Create VM launcher script
  await $`cat > $QEMU_HOME/scripts/launch-vm.sh << 'EOF'`;
  // Launch QEMU VM with standard configuration
  await $`VM_NAME="${1:-ubuntu-dev}"`;
  await $`VM_IMAGE="${2:-$QEMU_HOME/images/ubuntu-dev.qcow2}"`;
  await $`VM_MEMORY="${3:-8G}"`;
  await $`VM_CPUS="${4:-4}"`;
  await $`SSH_PORT="${5:-6665}"`;
  await $`QEMU_CMD="${QEMU_BIN:-qemu-system-x86_64}"`;
  await $`exec $QEMU_CMD \`;
  await $`-enable-kvm \`;
  await $`-m $VM_MEMORY \`;
  await $`-cpu host \`;
  await $`-smp $VM_CPUS \`;
  await $`-name "$VM_NAME" \`;
  await $`-drive file="$VM_IMAGE",if=virtio,format=qcow2 \`;
  await $`-net nic,model=virtio \`;
  await $`-net user,hostfwd=tcp::${SSH_PORT}-:22 \`;
  await $`-serial mon:stdio \`;
  await $`-monitor unix:/tmp/qemu-${VM_NAME}.sock,server,nowait \`;
  await $`"$@"`;
  await $`EOF`;
  await $`chmod +x $QEMU_HOME/scripts/launch-vm.sh`;
  // Create SSH connection script
  await $`cat > $QEMU_HOME/scripts/connect-vm.sh << 'EOF'`;
  // Connect to running VM via SSH
  await $`SSH_PORT="${1:-6665}"`;
  await $`SSH_USER="${2:-ubuntu}"`;
  await $`ssh -o StrictHostKeyChecking=no \`;
  await $`-o UserKnownHostsFile=/dev/null \`;
  await $`-p ${SSH_PORT} \`;
  await $`${SSH_USER}@localhost`;
  await $`EOF`;
  await $`chmod +x $QEMU_HOME/scripts/connect-vm.sh`;
  // Create disk image creation script
  await $`cat > $QEMU_HOME/scripts/create-disk.sh << 'EOF'`;
  // Create QEMU disk image
  await $`IMAGE_NAME="${1:-ubuntu-dev.qcow2}"`;
  await $`IMAGE_SIZE="${2:-128G}"`;
  await $`IMAGE_FORMAT="${3:-qcow2}"`;
  await $`qemu-img create -f $IMAGE_FORMAT \`;
  await $`$QEMU_HOME/images/$IMAGE_NAME \`;
  await $`$IMAGE_SIZE`;
  console.log("Created disk image: $QEMU_HOME/images/$IMAGE_NAME");
  await $`EOF`;
  await $`chmod +x $QEMU_HOME/scripts/create-disk.sh`;
  await $`log_success "Helper scripts created in $QEMU_HOME/scripts/"`;
  // Step 12: Environment setup
  await $`log_info "Setting up environment variables..."`;
  // Add to bashrc if not already present
  await $`if ! grep -q "QEMU_HOME=" $HOME/.bashrc; then`;
  await $`cat >> $HOME/.bashrc << EOF`;
  // QEMU Development Environment
  process.env.QEMU_HOME = "$QEMU_HOME";
  process.env.PATH = "\$QEMU_HOME/scripts:\$PATH";
  process.env.LIBCLANG_PATH = "/usr/lib/llvm-18/lib";
  await $`EOF`;
  await $`log_success "Environment variables added to .bashrc"`;
  }
  // Final summary
  await $`echo`;
  await $`log_success "QEMU Linux Development Environment Setup Complete!"`;
  await $`echo`;
  await $`log_info "Directory structure created at: $QEMU_HOME"`;
  await $`log_info "Helper scripts available in: $QEMU_HOME/scripts/"`;
  await $`echo`;
  await $`log_info "Next steps:"`;
  await $`log_info "  1. Download Ubuntu ISO: wget https://releases.ubuntu.com/24.10/ubuntu-24.10-live-server-amd64.iso"`;
  await $`log_info "  2. Create disk image: $QEMU_HOME/scripts/create-disk.sh ubuntu-dev.qcow2 128G"`;
  await $`log_info "  3. Install Ubuntu: $QEMU_HOME/scripts/launch-vm.sh ubuntu-dev -cdrom ubuntu-24.10-live-server-amd64.iso -boot d"`;
  await $`log_info "  4. Run VM: $QEMU_HOME/scripts/launch-vm.sh ubuntu-dev"`;
  await $`log_info "  5. Connect via SSH: $QEMU_HOME/scripts/connect-vm.sh"`;
  await $`echo`;
  await $`log_warning "Please log out and back in for group changes to take effect"`;
  await $`}`;
  // Parse command line arguments
  while ([[ $# -gt 0 ]]; do) {
  await $`case $1 in`;
  await $`--build-qemu-nvme)`;
  await $`BUILD_QEMU_NVME=true`;
  await $`shift`;
  await $`;;`;
  await $`--setup-vfio)`;
  await $`SETUP_VFIO=true`;
  await $`shift`;
  await $`;;`;
  await $`--qemu-home)`;
  await $`QEMU_HOME="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--kernel-version)`;
  await $`KERNEL_VERSION="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--rust-version)`;
  await $`RUST_VERSION="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--help)`;
  console.log("Usage: $0 [OPTIONS]");
  console.log("Options:");
  console.log("  --build-qemu-nvme    Build QEMU with NVMe support from source");
  console.log("  --setup-vfio         Setup VFIO for PCI passthrough");
  console.log("  --qemu-home PATH     Set QEMU home directory (default: $HOME/qemu-dev)");
  console.log("  --kernel-version VER Set kernel version (default: 6.8.0)");
  console.log("  --rust-version VER   Set Rust version (default: 1.81.0)");
  console.log("  --help               Show this help message");
  process.exit(0);
  await $`;;`;
  await $`*)`;
  await $`log_error "Unknown option: $1"`;
  await $`;;`;
  await $`esac`;
  }
  // Run main setup
  await $`main`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}