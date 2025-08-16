#!/bin/bash
# QEMU Linux Development Environment Setup Script
# Part of AI Development Platform - init_qemu theme

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
QEMU_HOME="${QEMU_HOME:-$HOME/qemu-dev}"
KERNEL_VERSION="${KERNEL_VERSION:-6.8.0}"
RUST_VERSION="${RUST_VERSION:-1.81.0}"
UBUNTU_VERSION="${UBUNTU_VERSION:-24.10}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_command() {
    if command -v $1 &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Main setup process
main() {
    log_info "Starting QEMU Linux Development Environment Setup"
    log_info "Configuration:"
    log_info "  - QEMU_HOME: $QEMU_HOME"
    log_info "  - KERNEL_VERSION: $KERNEL_VERSION"
    log_info "  - RUST_VERSION: $RUST_VERSION"
    log_info "  - UBUNTU_VERSION: $UBUNTU_VERSION"

    # Step 1: System update
    log_info "Updating system packages..."
    sudo apt-get update || log_error "Failed to update package lists"

    # Step 2: Install build dependencies
    log_info "Installing build dependencies..."
    sudo apt-get install -y \
        git fakeroot build-essential ncurses-dev xz-utils \
        libssl-dev bc flex libelf-dev bison \
        lld clang llvm \
        net-tools bridge-utils \
        python3 python3-pip ninja-build || log_error "Failed to install build tools"

    # Step 3: Install QEMU dependencies
    log_info "Installing QEMU dependencies..."
    sudo apt-get install -y \
        libpixman-1-dev libaio-dev libjemalloc-dev \
        libglib2.0-dev zlib1g-dev libnuma-dev libfdt-dev \
        libtool libcap-ng-dev libattr1-dev libvdeplug-dev \
        libcurl4-openssl-dev libspice-protocol-dev libspice-server-dev \
        libusb-1.0-0-dev libbluetooth-dev libgtk-3-dev \
        libx11-dev libxml2-dev libzstd-dev || log_error "Failed to install QEMU dependencies"

    # Step 4: Install QEMU system packages
    log_info "Installing QEMU system packages..."
    sudo apt-get install -y \
        qemu-system-x86 qemu-utils qemu-kvm \
        libvirt-daemon-system libvirt-clients || log_error "Failed to install QEMU packages"

    # Step 5: Setup Rust environment
    log_info "Setting up Rust environment..."
    if ! check_command rustup; then
        log_info "Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source $HOME/.cargo/env
    fi

    log_info "Configuring Rust for kernel development..."
    rustup install $RUST_VERSION
    rustup default $RUST_VERSION
    rustup override set $RUST_VERSION
    rustup component add rust-src
    
    # Install bindgen for kernel development
    cargo install --locked bindgen-cli || log_warning "bindgen-cli installation failed (may already be installed)"

    # Step 6: Create QEMU development directory structure
    log_info "Creating QEMU development directory structure..."
    mkdir -p $QEMU_HOME/{vms,images,scripts,kernel,logs}
    
    # Step 7: Clone and build QEMU-NVMe if requested
    if [ "$BUILD_QEMU_NVME" = "true" ]; then
        log_info "Building QEMU with NVMe support..."
        if [ ! -d "$QEMU_HOME/qemu-nvme" ]; then
            cd $QEMU_HOME
            git clone https://github.com/OpenChannelSSD/qemu-nvme.git
            cd qemu-nvme
            ./configure \
                --target-list=x86_64-softmmu \
                --prefix=$QEMU_HOME/qemu-nvme \
                --python=python3 \
                --enable-kvm \
                --enable-avx2 \
                --enable-numa \
                --enable-tools \
                --enable-virtfs \
                --enable-linux-aio \
                --enable-coroutine-pool \
                --enable-jemalloc \
                --enable-debug --disable-werror
            make -j$(nproc)
            make install
            log_success "QEMU-NVMe built successfully"
        else
            log_warning "QEMU-NVMe already exists, skipping build"
        fi
    fi

    # Step 8: Setup network bridge
    log_info "Setting up network bridge for QEMU..."
    if ! ip link show qemubr0 &> /dev/null; then
        sudo ip link add name qemubr0 type bridge
        sudo ip addr add 192.168.100.1/24 dev qemubr0
        sudo ip link set qemubr0 up
        
        # Enable IP forwarding
        sudo sysctl -w net.ipv4.ip_forward=1
        echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
        
        # Setup NAT
        sudo iptables -t nat -A POSTROUTING -o $(ip route | grep default | awk '{print $5}') -j MASQUERADE
        sudo iptables -A FORWARD -i qemubr0 -j ACCEPT
        sudo iptables -A FORWARD -o qemubr0 -j ACCEPT
        
        log_success "Network bridge qemubr0 created"
    else
        log_info "Network bridge qemubr0 already exists"
    fi

    # Step 9: Check KVM availability
    log_info "Checking KVM availability..."
    if [ -e /dev/kvm ]; then
        log_success "KVM is available"
        # Add current user to kvm group
        sudo usermod -aG kvm $USER
        log_info "Added $USER to kvm group (re-login may be required)"
    else
        log_warning "KVM not available - VMs will run without hardware acceleration"
        log_info "Check if virtualization is enabled in BIOS"
    fi

    # Step 10: Setup VFIO if requested
    if [ "$SETUP_VFIO" = "true" ]; then
        log_info "Setting up VFIO for PCI passthrough..."
        
        # Load VFIO modules
        sudo modprobe vfio
        sudo modprobe vfio-pci
        sudo modprobe vfio_iommu_type1
        
        # Make persistent
        echo "vfio" | sudo tee -a /etc/modules
        echo "vfio-pci" | sudo tee -a /etc/modules
        echo "vfio_iommu_type1" | sudo tee -a /etc/modules
        
        log_success "VFIO modules loaded"
    fi

    # Step 11: Create helper scripts
    log_info "Creating helper scripts..."
    
    # Create VM launcher script
    cat > $QEMU_HOME/scripts/launch-vm.sh << 'EOF'
#!/bin/bash
# Launch QEMU VM with standard configuration

VM_NAME="${1:-ubuntu-dev}"
VM_IMAGE="${2:-$QEMU_HOME/images/ubuntu-dev.qcow2}"
VM_MEMORY="${3:-8G}"
VM_CPUS="${4:-4}"
SSH_PORT="${5:-6665}"

QEMU_CMD="${QEMU_BIN:-qemu-system-x86_64}"

exec $QEMU_CMD \
    -enable-kvm \
    -m $VM_MEMORY \
    -cpu host \
    -smp $VM_CPUS \
    -name "$VM_NAME" \
    -drive file="$VM_IMAGE",if=virtio,format=qcow2 \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::${SSH_PORT}-:22 \
    -serial mon:stdio \
    -monitor unix:/tmp/qemu-${VM_NAME}.sock,server,nowait \
    "$@"
EOF
    chmod +x $QEMU_HOME/scripts/launch-vm.sh

    # Create SSH connection script
    cat > $QEMU_HOME/scripts/connect-vm.sh << 'EOF'
#!/bin/bash
# Connect to running VM via SSH

SSH_PORT="${1:-6665}"
SSH_USER="${2:-ubuntu}"

ssh -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -p ${SSH_PORT} \
    ${SSH_USER}@localhost
EOF
    chmod +x $QEMU_HOME/scripts/connect-vm.sh

    # Create disk image creation script
    cat > $QEMU_HOME/scripts/create-disk.sh << 'EOF'
#!/bin/bash
# Create QEMU disk image

IMAGE_NAME="${1:-ubuntu-dev.qcow2}"
IMAGE_SIZE="${2:-128G}"
IMAGE_FORMAT="${3:-qcow2}"

qemu-img create -f $IMAGE_FORMAT \
    $QEMU_HOME/images/$IMAGE_NAME \
    $IMAGE_SIZE

echo "Created disk image: $QEMU_HOME/images/$IMAGE_NAME"
EOF
    chmod +x $QEMU_HOME/scripts/create-disk.sh

    log_success "Helper scripts created in $QEMU_HOME/scripts/"

    # Step 12: Environment setup
    log_info "Setting up environment variables..."
    
    # Add to bashrc if not already present
    if ! grep -q "QEMU_HOME=" $HOME/.bashrc; then
        cat >> $HOME/.bashrc << EOF

# QEMU Development Environment
export QEMU_HOME=$QEMU_HOME
export PATH=\$QEMU_HOME/scripts:\$PATH
export LIBCLANG_PATH=/usr/lib/llvm-18/lib
EOF
        log_success "Environment variables added to .bashrc"
    fi

    # Final summary
    echo
    log_success "QEMU Linux Development Environment Setup Complete!"
    echo
    log_info "Directory structure created at: $QEMU_HOME"
    log_info "Helper scripts available in: $QEMU_HOME/scripts/"
    echo
    log_info "Next steps:"
    log_info "  1. Download Ubuntu ISO: wget https://releases.ubuntu.com/24.10/ubuntu-24.10-live-server-amd64.iso"
    log_info "  2. Create disk image: $QEMU_HOME/scripts/create-disk.sh ubuntu-dev.qcow2 128G"
    log_info "  3. Install Ubuntu: $QEMU_HOME/scripts/launch-vm.sh ubuntu-dev -cdrom ubuntu-24.10-live-server-amd64.iso -boot d"
    log_info "  4. Run VM: $QEMU_HOME/scripts/launch-vm.sh ubuntu-dev"
    log_info "  5. Connect via SSH: $QEMU_HOME/scripts/connect-vm.sh"
    echo
    log_warning "Please log out and back in for group changes to take effect"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build-qemu-nvme)
            BUILD_QEMU_NVME=true
            shift
            ;;
        --setup-vfio)
            SETUP_VFIO=true
            shift
            ;;
        --qemu-home)
            QEMU_HOME="$2"
            shift 2
            ;;
        --kernel-version)
            KERNEL_VERSION="$2"
            shift 2
            ;;
        --rust-version)
            RUST_VERSION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --build-qemu-nvme    Build QEMU with NVMe support from source"
            echo "  --setup-vfio         Setup VFIO for PCI passthrough"
            echo "  --qemu-home PATH     Set QEMU home directory (default: $HOME/qemu-dev)"
            echo "  --kernel-version VER Set kernel version (default: 6.8.0)"
            echo "  --rust-version VER   Set Rust version (default: 1.81.0)"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            ;;
    esac
done

# Run main setup
main