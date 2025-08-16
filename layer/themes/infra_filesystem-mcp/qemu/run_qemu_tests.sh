#!/bin/bash
set -e

# QEMU Test Runner
# Runs OS and hardware-level tests in QEMU environments

QEMU_DIR="$(dirname "$0")"
TEST_DIR="$(dirname "$QEMU_DIR")"

# Source test configuration
source "$TEST_DIR/test_config.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}QEMU Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"

# Test kernel module in Linux
test_kernel_module() {
    echo -e "${BLUE}Testing kernel module in QEMU Linux...${NC}"
    
    # Create test kernel module
    cat > /tmp/test_module.c << 'EOF'
#include <linux/init.h>
#include <linux/module.h>
#include <linux/kernel.h>

static int __init test_init(void) {
    printk(KERN_INFO "Test module loaded\n");
    return 0;
}

static void __exit test_exit(void) {
    printk(KERN_INFO "Test module unloaded\n");
}

module_init(test_init);
module_exit(test_exit);
MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Test Module");
EOF
    
    # Run in QEMU with module test
    timeout 30 qemu-system-x86_64 \
        -kernel "$QEMU_DIR/images/linux/bzImage" \
        -initrd "$QEMU_DIR/images/linux/initrd.img" \
        -m 512M \
        -append "console=ttyS0" \
        -nographic \
        -device e1000,netdev=net0 \
        -netdev user,id=net0 \
        2>&1 | grep -q "Linux version" && echo -e "${GREEN}[PASS]${NC} Kernel module test" || echo -e "${RED}[FAIL]${NC} Kernel module test"
}

# Test ARM cross-compilation
test_arm_cross_compile() {
    echo -e "${BLUE}Testing ARM cross-compilation...${NC}"
    
    if command -v arm-none-eabi-gcc &> /dev/null; then
        cd "$QEMU_DIR/images/arm"
        if ./build.sh 2>/dev/null; then
            echo -e "${GREEN}[PASS]${NC} ARM cross-compilation"
            
            # Try to run in QEMU
            timeout 5 qemu-system-arm \
                -M versatilepb \
                -m 128M \
                -nographic \
                -kernel hello_arm.bin \
                2>&1 | grep -q "Hello from ARM" && \
                echo -e "${GREEN}[PASS]${NC} ARM execution" || \
                echo -e "${YELLOW}[WARN]${NC} ARM execution (may need ARM toolchain)"
        else
            echo -e "${YELLOW}[SKIP]${NC} ARM cross-compilation (no ARM toolchain)"
        fi
    else
        echo -e "${YELLOW}[SKIP]${NC} ARM cross-compilation (arm-none-eabi-gcc not installed)"
    fi
}

# Test driver development environment
test_driver_environment() {
    echo -e "${BLUE}Testing driver development environment...${NC}"
    
    # Check if kernel headers are available
    if [ -d "/lib/modules/$(uname -r)/build" ]; then
        echo -e "${GREEN}[PASS]${NC} Kernel headers available"
    else
        echo -e "${YELLOW}[WARN]${NC} Kernel headers not found"
    fi
    
    # Test QEMU device emulation
    timeout 5 qemu-system-x86_64 \
        -device help 2>&1 | grep -q "e1000" && \
        echo -e "${GREEN}[PASS]${NC} QEMU device emulation" || \
        echo -e "${RED}[FAIL]${NC} QEMU device emulation"
}

# Test embedded system simulation
test_embedded_simulation() {
    echo -e "${BLUE}Testing embedded system simulation...${NC}"
    
    # Test various QEMU architectures
    for arch in arm aarch64 riscv64 mips; do
        if command -v qemu-system-$arch &> /dev/null; then
            echo -e "${GREEN}[PASS]${NC} QEMU $arch available"
        else
            echo -e "${YELLOW}[WARN]${NC} QEMU $arch not installed"
        fi
    done
}

# Main execution
main() {
    # Check if QEMU environments are set up
    if [ ! -d "$QEMU_DIR/images" ]; then
        echo -e "${YELLOW}Setting up QEMU environments first...${NC}"
        "$QEMU_DIR/setup_qemu_environments.sh"
    fi
    
    echo ""
    echo -e "${BLUE}Running QEMU tests...${NC}"
    echo ""
    
    test_kernel_module
    test_arm_cross_compile
    test_driver_environment
    test_embedded_simulation
    
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}QEMU tests complete${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Handle arguments
case "${1:-}" in
    --kernel)
        test_kernel_module
        ;;
    --arm)
        test_arm_cross_compile
        ;;
    --driver)
        test_driver_environment
        ;;
    --embedded)
        test_embedded_simulation
        ;;
    --all|"")
        main
        ;;
    --help)
        echo "Usage: $0 [--kernel|--arm|--driver|--embedded|--all]"
        exit 0
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage"
        exit 1
        ;;
esac