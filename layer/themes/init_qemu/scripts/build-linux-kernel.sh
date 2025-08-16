#!/bin/bash
# Linux Kernel Build Script with Rust Support
# Part of AI Development Platform - init_qemu theme

set -e

# Configuration
KERNEL_DIR="${KERNEL_DIR:-$HOME/qemu-dev/kernel/linux}"
KERNEL_VERSION="${KERNEL_VERSION:-6.8.0}"
RUST_VERSION="${RUST_VERSION:-1.81.0}"
BUILD_DIR="${BUILD_DIR:-$KERNEL_DIR/build}"
NUM_JOBS="${NUM_JOBS:-$(nproc)}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for required tools
    local tools=("git" "make" "gcc" "clang" "rustc" "bindgen")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed. Please run setup-qemu-environment.sh first"
        fi
    done
    
    # Check Rust version
    local rust_version=$(rustc --version | awk '{print $2}')
    log_info "Rust version: $rust_version"
    
    # Check for LLVM
    if ! command -v llvm-config &> /dev/null; then
        log_warning "LLVM not found in PATH"
    else
        log_info "LLVM version: $(llvm-config --version)"
    fi
    
    log_success "Prerequisites check passed"
}

# Download kernel source
download_kernel() {
    if [ ! -d "$KERNEL_DIR" ]; then
        log_info "Downloading Linux kernel source..."
        mkdir -p $(dirname $KERNEL_DIR)
        cd $(dirname $KERNEL_DIR)
        
        # Clone stable kernel
        git clone --depth 1 --branch v$KERNEL_VERSION \
            https://github.com/torvalds/linux.git linux
        
        log_success "Kernel source downloaded"
    else
        log_info "Kernel source already exists at $KERNEL_DIR"
        
        # Update to specified version
        cd $KERNEL_DIR
        git fetch --tags
        git checkout v$KERNEL_VERSION 2>/dev/null || log_warning "Could not checkout v$KERNEL_VERSION"
    fi
}

# Configure kernel
configure_kernel() {
    log_info "Configuring kernel..."
    cd $KERNEL_DIR
    
    # Create build directory
    mkdir -p $BUILD_DIR
    
    # Start with default config
    make O=$BUILD_DIR defconfig
    
    # Enable Rust support
    log_info "Enabling Rust support..."
    scripts/config --file $BUILD_DIR/.config --enable EXPERT
    scripts/config --file $BUILD_DIR/.config --enable RUST
    scripts/config --file $BUILD_DIR/.config --enable RUST_IS_AVAILABLE
    
    # Enable useful options for development
    scripts/config --file $BUILD_DIR/.config --enable DEBUG_KERNEL
    scripts/config --file $BUILD_DIR/.config --enable DEBUG_INFO
    scripts/config --file $BUILD_DIR/.config --enable FRAME_POINTER
    scripts/config --file $BUILD_DIR/.config --enable KGDB
    scripts/config --file $BUILD_DIR/.config --enable KGDB_SERIAL_CONSOLE
    
    # Enable virtualization features
    scripts/config --file $BUILD_DIR/.config --enable VIRTUALIZATION
    scripts/config --file $BUILD_DIR/.config --enable KVM
    scripts/config --file $BUILD_DIR/.config --enable KVM_INTEL
    scripts/config --file $BUILD_DIR/.config --enable KVM_AMD
    scripts/config --file $BUILD_DIR/.config --enable VHOST_NET
    scripts/config --file $BUILD_DIR/.config --enable VHOST_SCSI
    
    # Enable NVMe support
    scripts/config --file $BUILD_DIR/.config --enable BLK_DEV_NVME
    scripts/config --file $BUILD_DIR/.config --enable NVME_CORE
    scripts/config --file $BUILD_DIR/.config --enable NVME_MULTIPATH
    scripts/config --file $BUILD_DIR/.config --enable NVME_HWMON
    
    # Enable 9P filesystem for QEMU sharing
    scripts/config --file $BUILD_DIR/.config --enable NET_9P
    scripts/config --file $BUILD_DIR/.config --enable NET_9P_VIRTIO
    scripts/config --file $BUILD_DIR/.config --enable 9P_FS
    scripts/config --file $BUILD_DIR/.config --enable 9P_FS_POSIX_ACL
    scripts/config --file $BUILD_DIR/.config --enable 9P_FS_SECURITY
    
    # Update config
    make O=$BUILD_DIR olddefconfig
    
    log_success "Kernel configured"
}

# Check Rust availability
check_rust_available() {
    log_info "Checking Rust availability for kernel..."
    cd $KERNEL_DIR
    
    if make O=$BUILD_DIR LLVM=1 rustavailable; then
        log_success "Rust is available for kernel build"
        return 0
    else
        log_warning "Rust is not available for kernel build"
        log_info "Attempting to fix Rust setup..."
        
        # Set required environment variables
        export RUSTC=$(which rustc)
        export BINDGEN=$(which bindgen)
        export RUSTFMT=$(which rustfmt)
        export RUST_LIB_SRC=$(rustc --print sysroot)/lib/rustlib/src/rust/library
        
        # Try again
        if make O=$BUILD_DIR LLVM=1 rustavailable; then
            log_success "Rust setup fixed"
            return 0
        else
            log_error "Failed to setup Rust for kernel build"
            return 1
        fi
    fi
}

# Build kernel
build_kernel() {
    log_info "Building kernel with $NUM_JOBS parallel jobs..."
    cd $KERNEL_DIR
    
    # Set build environment
    export LLVM=1
    export LLVM_IAS=1
    
    # Build kernel
    make O=$BUILD_DIR -j$NUM_JOBS LLVM=1 LLVM_IAS=1
    
    log_success "Kernel build completed"
    
    # Display kernel info
    log_info "Kernel image: $BUILD_DIR/arch/x86/boot/bzImage"
    log_info "Kernel version: $(make O=$BUILD_DIR kernelversion)"
    
    # Create symlink for easy access
    ln -sf $BUILD_DIR/arch/x86/boot/bzImage $HOME/qemu-dev/kernel/bzImage
    log_info "Symlink created at: $HOME/qemu-dev/kernel/bzImage"
}

# Build kernel modules
build_modules() {
    if [ "$BUILD_MODULES" = "true" ]; then
        log_info "Building kernel modules..."
        cd $KERNEL_DIR
        
        make O=$BUILD_DIR -j$NUM_JOBS LLVM=1 modules
        
        log_success "Kernel modules built"
        
        # Install modules to staging directory
        if [ "$INSTALL_MODULES" = "true" ]; then
            local modules_dir="$HOME/qemu-dev/kernel/modules"
            mkdir -p $modules_dir
            
            make O=$BUILD_DIR LLVM=1 INSTALL_MOD_PATH=$modules_dir modules_install
            
            log_success "Modules installed to $modules_dir"
        fi
    fi
}

# Create initramfs
create_initramfs() {
    if [ "$CREATE_INITRAMFS" = "true" ]; then
        log_info "Creating initramfs..."
        
        local initramfs_dir="$HOME/qemu-dev/kernel/initramfs"
        mkdir -p $initramfs_dir
        
        # Create basic initramfs structure
        cd $initramfs_dir
        mkdir -p {bin,sbin,etc,proc,sys,dev,tmp,usr/bin,usr/sbin}
        
        # Copy busybox if available
        if command -v busybox &> /dev/null; then
            cp $(which busybox) bin/
            cd bin
            for prog in $(./busybox --list); do
                ln -s busybox $prog 2>/dev/null || true
            done
            cd ..
        fi
        
        # Create init script
        cat > init << 'EOF'
#!/bin/sh
/bin/mount -t proc none /proc
/bin/mount -t sysfs none /sys
/bin/mount -t devtmpfs none /dev
exec /bin/sh
EOF
        chmod +x init
        
        # Create initramfs archive
        find . | cpio -o -H newc | gzip > $HOME/qemu-dev/kernel/initramfs.gz
        
        log_success "Initramfs created at $HOME/qemu-dev/kernel/initramfs.gz"
    fi
}

# Create QEMU boot script
create_boot_script() {
    log_info "Creating QEMU boot script..."
    
    cat > $HOME/qemu-dev/scripts/boot-custom-kernel.sh << 'EOF'
#!/bin/bash
# Boot custom kernel in QEMU

KERNEL="${1:-$HOME/qemu-dev/kernel/bzImage}"
INITRD="${2:-$HOME/qemu-dev/kernel/initramfs.gz}"
ROOTFS="${3:-$HOME/qemu-dev/images/ubuntu-dev.qcow2}"
MEMORY="${4:-4G}"
CPUS="${5:-4}"

QEMU_ARGS=""

# Check if booting with initramfs only or full rootfs
if [ -z "$3" ] || [ "$3" = "none" ]; then
    # Boot with initramfs only
    QEMU_ARGS="-initrd $INITRD"
    APPEND="console=ttyS0 rdinit=/init"
else
    # Boot with rootfs
    QEMU_ARGS="-initrd $INITRD -drive file=$ROOTFS,if=virtio,format=qcow2"
    APPEND="console=ttyS0 root=/dev/vda1 rw"
fi

qemu-system-x86_64 \
    -enable-kvm \
    -m $MEMORY \
    -cpu host \
    -smp $CPUS \
    -kernel $KERNEL \
    $QEMU_ARGS \
    -append "$APPEND" \
    -serial mon:stdio \
    -display none
EOF
    
    chmod +x $HOME/qemu-dev/scripts/boot-custom-kernel.sh
    
    log_success "Boot script created at $HOME/qemu-dev/scripts/boot-custom-kernel.sh"
}

# Clean build
clean_build() {
    if [ "$CLEAN" = "true" ]; then
        log_info "Cleaning build directory..."
        cd $KERNEL_DIR
        make O=$BUILD_DIR clean
        log_success "Build directory cleaned"
    fi
}

# Main build process
main() {
    log_info "Linux Kernel Build Script"
    log_info "Configuration:"
    log_info "  - Kernel directory: $KERNEL_DIR"
    log_info "  - Kernel version: $KERNEL_VERSION"
    log_info "  - Build directory: $BUILD_DIR"
    log_info "  - Parallel jobs: $NUM_JOBS"
    echo
    
    # Run build steps
    check_prerequisites
    download_kernel
    
    if [ "$CLEAN" = "true" ]; then
        clean_build
    fi
    
    configure_kernel
    check_rust_available
    build_kernel
    build_modules
    create_initramfs
    create_boot_script
    
    echo
    log_success "Kernel build completed successfully!"
    echo
    log_info "To test the kernel:"
    log_info "  1. Boot with initramfs only:"
    log_info "     $HOME/qemu-dev/scripts/boot-custom-kernel.sh"
    log_info "  2. Boot with Ubuntu rootfs:"
    log_info "     $HOME/qemu-dev/scripts/boot-custom-kernel.sh \\
              $HOME/qemu-dev/kernel/bzImage \\
              $HOME/qemu-dev/kernel/initramfs.gz \\
              $HOME/qemu-dev/images/ubuntu-dev.qcow2"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --kernel-dir)
            KERNEL_DIR="$2"
            shift 2
            ;;
        --kernel-version)
            KERNEL_VERSION="$2"
            shift 2
            ;;
        --build-dir)
            BUILD_DIR="$2"
            shift 2
            ;;
        --jobs)
            NUM_JOBS="$2"
            shift 2
            ;;
        --with-modules)
            BUILD_MODULES=true
            shift
            ;;
        --install-modules)
            BUILD_MODULES=true
            INSTALL_MODULES=true
            shift
            ;;
        --with-initramfs)
            CREATE_INITRAMFS=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --menuconfig)
            MENUCONFIG=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --kernel-dir PATH      Kernel source directory"
            echo "  --kernel-version VER   Kernel version to build"
            echo "  --build-dir PATH       Build output directory"
            echo "  --jobs N               Number of parallel build jobs"
            echo "  --with-modules         Build kernel modules"
            echo "  --install-modules      Build and install modules"
            echo "  --with-initramfs       Create initramfs"
            echo "  --clean                Clean before building"
            echo "  --menuconfig           Run menuconfig"
            echo "  --help                 Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            ;;
    esac
done

# Run menuconfig if requested
if [ "$MENUCONFIG" = "true" ]; then
    cd $KERNEL_DIR
    make O=$BUILD_DIR LLVM=1 menuconfig
    exit 0
fi

# Run main build
main