#!/bin/bash

# QEMU Setup Script for Driver and Embedded Development
# Configures QEMU for multiple architectures with kernel and rootfs

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
QEMU_DIR="qemu_environments"
KERNEL_DIR="$QEMU_DIR/kernels"
ROOTFS_DIR="$QEMU_DIR/rootfs"
SCRIPTS_DIR="$QEMU_DIR/scripts"

# Log function
log() {
    case $1 in
        INFO) echo -e "${NC}[INFO] $2" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS] $2${NC}" ;;
        WARNING) echo -e "${YELLOW}[WARNING] $2${NC}" ;;
        ERROR) echo -e "${RED}[ERROR] $2${NC}" ;;
    esac
}

# Create directory structure
setup_directories() {
    log INFO "Creating QEMU directory structure..."
    mkdir -p "$KERNEL_DIR"
    mkdir -p "$ROOTFS_DIR"
    mkdir -p "$SCRIPTS_DIR"
    log SUCCESS "Directories created"
}

# Check QEMU installation
check_qemu() {
    log INFO "Checking QEMU installation..."
    
    local qemu_found=false
    local architectures=("x86_64" "arm" "aarch64" "riscv64" "mips" "ppc")
    
    for arch in "${architectures[@]}"; do
        if command -v "qemu-system-$arch" &> /dev/null; then
            log SUCCESS "QEMU for $arch found"
            qemu_found=true
        else
            log WARNING "QEMU for $arch not found"
        fi
    done
    
    if [ "$qemu_found" = false ]; then
        log ERROR "No QEMU installations found"
        log INFO "Install QEMU with: sudo apt-get install qemu-system"
        return 1
    fi
}

# Create minimal kernel module test environment
create_kernel_test_env() {
    local arch=$1
    log INFO "Creating kernel test environment for $arch..."
    
    # Create a simple init script for testing
    cat > "$ROOTFS_DIR/init_$arch.sh" << 'EOF'
#!/bin/sh
echo "QEMU Test Environment Started"
echo "Architecture: $ARCH"
echo "Loading test module..."

# Mount essential filesystems
mount -t proc none /proc
mount -t sysfs none /sys
mount -t devtmpfs none /dev

# Load kernel module if provided
if [ -f /test_module.ko ]; then
    insmod /test_module.ko
    echo "Module loaded"
    
    # Test the module
    if [ -e /dev/test_device ]; then
        cat /dev/test_device
    fi
    
    # Check kernel messages
    dmesg | tail -10
    
    # Unload module
    rmmod test_module
fi

echo "Test completed"
/bin/sh
EOF
    chmod +x "$ROOTFS_DIR/init_$arch.sh"
}

# Generate QEMU run scripts for each architecture
generate_run_scripts() {
    log INFO "Generating QEMU run scripts..."
    
    # x86_64 script
    cat > "$SCRIPTS_DIR/run_x86_64.sh" << 'EOF'
#!/bin/bash
KERNEL=${1:-bzImage}
MODULE=${2}
MEMORY=${3:-512M}

QEMU_ARGS=""
if [ -f "$MODULE" ]; then
    QEMU_ARGS="-drive file=$MODULE,format=raw,if=virtio"
fi

qemu-system-x86_64 \
    -kernel "$KERNEL" \
    -append "console=ttyS0 panic=1" \
    -m "$MEMORY" \
    -nographic \
    -no-reboot \
    $QEMU_ARGS \
    -serial mon:stdio
EOF
    
    # ARM script
    cat > "$SCRIPTS_DIR/run_arm.sh" << 'EOF'
#!/bin/bash
KERNEL=${1:-zImage}
MODULE=${2}
MEMORY=${3:-512M}

QEMU_ARGS=""
if [ -f "$MODULE" ]; then
    QEMU_ARGS="-drive file=$MODULE,format=raw,if=virtio"
fi

qemu-system-arm \
    -M virt \
    -cpu cortex-a15 \
    -kernel "$KERNEL" \
    -append "console=ttyAMA0 panic=1" \
    -m "$MEMORY" \
    -nographic \
    -no-reboot \
    $QEMU_ARGS \
    -serial mon:stdio
EOF
    
    # ARM64 script
    cat > "$SCRIPTS_DIR/run_arm64.sh" << 'EOF'
#!/bin/bash
KERNEL=${1:-Image}
MODULE=${2}
MEMORY=${3:-512M}

QEMU_ARGS=""
if [ -f "$MODULE" ]; then
    QEMU_ARGS="-drive file=$MODULE,format=raw,if=virtio"
fi

qemu-system-aarch64 \
    -M virt \
    -cpu cortex-a72 \
    -kernel "$KERNEL" \
    -append "console=ttyAMA0 panic=1" \
    -m "$MEMORY" \
    -nographic \
    -no-reboot \
    $QEMU_ARGS \
    -serial mon:stdio
EOF
    
    # RISC-V script
    cat > "$SCRIPTS_DIR/run_riscv.sh" << 'EOF'
#!/bin/bash
KERNEL=${1:-Image}
MODULE=${2}
MEMORY=${3:-512M}

QEMU_ARGS=""
if [ -f "$MODULE" ]; then
    QEMU_ARGS="-drive file=$MODULE,format=raw,if=virtio"
fi

qemu-system-riscv64 \
    -M virt \
    -kernel "$KERNEL" \
    -append "console=ttyS0 panic=1" \
    -m "$MEMORY" \
    -nographic \
    -no-reboot \
    $QEMU_ARGS \
    -serial mon:stdio
EOF
    
    # Make all scripts executable
    chmod +x "$SCRIPTS_DIR"/*.sh
    log SUCCESS "Run scripts generated"
}

# Create GDB debugging scripts
create_debug_scripts() {
    log INFO "Creating GDB debugging scripts..."
    
    cat > "$SCRIPTS_DIR/debug_kernel.sh" << 'EOF'
#!/bin/bash
# QEMU Kernel Debugging Script

ARCH=${1:-x86_64}
KERNEL=${2:-vmlinux}
GDB_PORT=1234

echo "Starting QEMU in debug mode for $ARCH..."
echo "GDB will connect to port $GDB_PORT"

case "$ARCH" in
    x86_64)
        qemu-system-x86_64 \
            -kernel "$KERNEL" \
            -s -S \
            -nographic &
        ;;
    arm)
        qemu-system-arm \
            -M virt \
            -kernel "$KERNEL" \
            -s -S \
            -nographic &
        ;;
    arm64|aarch64)
        qemu-system-aarch64 \
            -M virt \
            -kernel "$KERNEL" \
            -s -S \
            -nographic &
        ;;
    riscv|riscv64)
        qemu-system-riscv64 \
            -M virt \
            -kernel "$KERNEL" \
            -s -S \
            -nographic &
        ;;
    *)
        echo "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

QEMU_PID=$!

# Start GDB
echo "Starting GDB..."
gdb-multiarch \
    -ex "target remote localhost:$GDB_PORT" \
    -ex "file $KERNEL" \
    -ex "break start_kernel" \
    -ex "continue"

# Clean up
kill $QEMU_PID 2>/dev/null
EOF
    chmod +x "$SCRIPTS_DIR/debug_kernel.sh"
    log SUCCESS "Debug scripts created"
}

# Create sample kernel module for testing
create_sample_module() {
    log INFO "Creating sample kernel module for testing..."
    
    local module_dir="$QEMU_DIR/sample_module"
    mkdir -p "$module_dir"
    
    # Sample kernel module
    cat > "$module_dir/hello_qemu.c" << 'EOF'
#include <linux/init.h>
#include <linux/module.h>
#include <linux/kernel.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("QEMU Test");
MODULE_DESCRIPTION("Hello World Module for QEMU Testing");

static int __init hello_init(void) {
    printk(KERN_INFO "Hello from QEMU kernel module!\n");
    printk(KERN_INFO "Architecture: %s\n", CONFIG_ARCH);
    return 0;
}

static void __exit hello_exit(void) {
    printk(KERN_INFO "Goodbye from QEMU kernel module!\n");
}

module_init(hello_init);
module_exit(hello_exit);
EOF
    
    # Makefile for module
    cat > "$module_dir/Makefile" << 'EOF'
obj-m += hello_qemu.o

ARCH ?= x86_64
CROSS_COMPILE ?=

# Kernel source directory (update as needed)
KDIR ?= /lib/modules/$(shell uname -r)/build

all:
	$(MAKE) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean

test: all
	@echo "Module built successfully"
	@echo "To test in QEMU, run:"
	@echo "  ../scripts/run_$(ARCH).sh <kernel> hello_qemu.ko"
EOF
    
    log SUCCESS "Sample module created in $module_dir"
}

# Create cross-compilation toolchain setup
setup_cross_compile() {
    log INFO "Setting up cross-compilation configurations..."
    
    cat > "$QEMU_DIR/cross_compile.conf" << 'EOF'
# Cross-compilation toolchain configuration

# ARM 32-bit
ARM_CROSS_COMPILE=arm-linux-gnueabi-
ARM_ARCH=arm
ARM_QEMU=qemu-system-arm

# ARM 64-bit (AArch64)
ARM64_CROSS_COMPILE=aarch64-linux-gnu-
ARM64_ARCH=arm64
ARM64_QEMU=qemu-system-aarch64

# RISC-V 64-bit
RISCV_CROSS_COMPILE=riscv64-linux-gnu-
RISCV_ARCH=riscv
RISCV_QEMU=qemu-system-riscv64

# MIPS
MIPS_CROSS_COMPILE=mips-linux-gnu-
MIPS_ARCH=mips
MIPS_QEMU=qemu-system-mips

# PowerPC
PPC_CROSS_COMPILE=powerpc-linux-gnu-
PPC_ARCH=powerpc
PPC_QEMU=qemu-system-ppc

# Usage:
# source cross_compile.conf
# make ARCH=$ARM_ARCH CROSS_COMPILE=$ARM_CROSS_COMPILE
EOF
    
    # Create build script for cross-compilation
    cat > "$SCRIPTS_DIR/build_cross.sh" << 'EOF'
#!/bin/bash
# Cross-compilation build script

ARCH=$1
MODULE=$2

if [ -z "$ARCH" ] || [ -z "$MODULE" ]; then
    echo "Usage: $0 <arch> <module_directory>"
    echo "Architectures: arm, arm64, riscv, mips, ppc"
    exit 1
fi

source ../cross_compile.conf

case "$ARCH" in
    arm)
        CROSS=$ARM_CROSS_COMPILE
        ARCH_VAR=$ARM_ARCH
        ;;
    arm64|aarch64)
        CROSS=$ARM64_CROSS_COMPILE
        ARCH_VAR=$ARM64_ARCH
        ;;
    riscv|riscv64)
        CROSS=$RISCV_CROSS_COMPILE
        ARCH_VAR=$RISCV_ARCH
        ;;
    mips)
        CROSS=$MIPS_CROSS_COMPILE
        ARCH_VAR=$MIPS_ARCH
        ;;
    ppc|powerpc)
        CROSS=$PPC_CROSS_COMPILE
        ARCH_VAR=$PPC_ARCH
        ;;
    *)
        echo "Unknown architecture: $ARCH"
        exit 1
        ;;
esac

echo "Building for $ARCH with $CROSS toolchain..."
cd "$MODULE"
make ARCH=$ARCH_VAR CROSS_COMPILE=$CROSS clean
make ARCH=$ARCH_VAR CROSS_COMPILE=$CROSS
EOF
    chmod +x "$SCRIPTS_DIR/build_cross.sh"
    
    log SUCCESS "Cross-compilation setup complete"
}

# Create test automation script
create_test_automation() {
    log INFO "Creating test automation scripts..."
    
    cat > "$SCRIPTS_DIR/test_all_architectures.sh" << 'EOF'
#!/bin/bash
# Test kernel modules on all QEMU architectures

ARCHITECTURES=("x86_64" "arm" "arm64" "riscv")
MODULE_DIR="../sample_module"
RESULTS_FILE="test_results.txt"

echo "Testing kernel module on all architectures..." > "$RESULTS_FILE"
echo "=========================================" >> "$RESULTS_FILE"

for arch in "${architectures[@]}"; do
    echo "" >> "$RESULTS_FILE"
    echo "Testing $arch..." >> "$RESULTS_FILE"
    
    # Build module for architecture
    ./build_cross.sh "$arch" "$MODULE_DIR" >> "$RESULTS_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✓ Build successful for $arch" >> "$RESULTS_FILE"
    else
        echo "✗ Build failed for $arch" >> "$RESULTS_FILE"
    fi
done

echo "" >> "$RESULTS_FILE"
echo "Test Summary:" >> "$RESULTS_FILE"
grep "✓\|✗" "$RESULTS_FILE"

cat "$RESULTS_FILE"
EOF
    chmod +x "$SCRIPTS_DIR/test_all_architectures.sh"
    
    log SUCCESS "Test automation scripts created"
}

# Create documentation
create_documentation() {
    log INFO "Creating documentation..."
    
    cat > "$QEMU_DIR/README.md" << 'EOF'
# QEMU Environment for Driver Development

This directory contains QEMU configurations and scripts for testing kernel modules and drivers across multiple architectures.

## Directory Structure

```
qemu_environments/
├── kernels/          # Kernel images for different architectures
├── rootfs/           # Root filesystem images
├── scripts/          # QEMU run and build scripts
├── sample_module/    # Sample kernel module for testing
└── cross_compile.conf # Cross-compilation configuration
```

## Supported Architectures

- x86_64 (Intel/AMD 64-bit)
- ARM (32-bit)
- ARM64/AArch64 (64-bit)
- RISC-V (64-bit)
- MIPS
- PowerPC

## Quick Start

### 1. Build Sample Module

For native architecture:
```bash
cd sample_module
make
```

For cross-compilation:
```bash
cd scripts
./build_cross.sh arm ../sample_module
```

### 2. Run in QEMU

```bash
cd scripts
./run_x86_64.sh <kernel_image> <module.ko>
```

### 3. Debug with GDB

```bash
cd scripts
./debug_kernel.sh x86_64 <kernel_image>
```

## Testing Driver Hello World

1. Build your driver module
2. Run QEMU with the module:
   ```bash
   ./scripts/run_<arch>.sh kernel_image your_module.ko
   ```
3. In QEMU console:
   ```bash
   insmod your_module.ko
   dmesg | tail
   cat /dev/your_device  # Should show "Hello World"
   rmmod your_module
   ```

## Cross-Compilation

Install toolchains:
```bash
sudo apt-get install gcc-arm-linux-gnueabi gcc-aarch64-linux-gnu gcc-riscv64-linux-gnu
```

Build for specific architecture:
```bash
source cross_compile.conf
make ARCH=$ARM_ARCH CROSS_COMPILE=$ARM_CROSS_COMPILE
```

## Automated Testing

Run tests on all architectures:
```bash
cd scripts
./test_all_architectures.sh
```

## Troubleshooting

- **Module won't load**: Check kernel version compatibility
- **QEMU crashes**: Verify kernel image is for correct architecture
- **Cross-compilation fails**: Install required toolchain
- **No output**: Check console parameters in kernel command line

## Requirements

- QEMU (qemu-system-*)
- Cross-compilation toolchains
- Linux kernel headers
- GDB with multiarch support (gdb-multiarch)
EOF
    
    log SUCCESS "Documentation created"
}

# Main setup function
main() {
    log INFO "QEMU Environment Setup for Driver Development"
    log INFO "============================================="
    
    # Create directory structure
    setup_directories
    
    # Check QEMU installation
    if ! check_qemu; then
        log ERROR "Please install QEMU first"
        exit 1
    fi
    
    # Generate configurations and scripts
    generate_run_scripts
    create_debug_scripts
    create_sample_module
    setup_cross_compile
    create_test_automation
    create_kernel_test_env "x86_64"
    create_kernel_test_env "arm"
    create_kernel_test_env "arm64"
    create_kernel_test_env "riscv"
    create_documentation
    
    log SUCCESS "QEMU environment setup complete!"
    log INFO "Created in: $QEMU_DIR/"
    log INFO "To get started:"
    log INFO "  1. cd $QEMU_DIR/sample_module"
    log INFO "  2. make"
    log INFO "  3. cd ../scripts"
    log INFO "  4. ./run_x86_64.sh <kernel> ../sample_module/hello_qemu.ko"
    log INFO ""
    log INFO "See $QEMU_DIR/README.md for detailed documentation"
}

# Run main function
main "$@"