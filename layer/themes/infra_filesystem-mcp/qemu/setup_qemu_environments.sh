#!/bin/bash
set -e

# QEMU Environment Setup Script
# Sets up QEMU environments for OS and hardware-level testing

QEMU_DIR="$(dirname "$0")"
IMAGES_DIR="$QEMU_DIR/images"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}QEMU Environment Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Check QEMU installation
check_qemu() {
    echo -e "${BLUE}Checking QEMU installation...${NC}"
    
    if ! command -v qemu-system-x86_64 &> /dev/null; then
        echo -e "${YELLOW}QEMU not installed. Installing...${NC}"
        sudo apt-get update
        sudo apt-get install -y \
            qemu-system-x86 \
            qemu-system-arm \
            qemu-system-misc \
            qemu-utils \
            qemu-user-static
    fi
    
    echo -e "${GREEN}QEMU installed:${NC}"
    qemu-system-x86_64 --version | head -n1
    qemu-system-arm --version | head -n1
}

# Setup Linux kernel testing environment
setup_linux_kernel() {
    echo -e "${BLUE}Setting up Linux kernel testing environment...${NC}"
    
    mkdir -p "$IMAGES_DIR/linux"
    cd "$IMAGES_DIR/linux"
    
    # Download minimal Linux kernel and initrd
    if [ ! -f "bzImage" ]; then
        echo "Downloading Linux kernel..."
        wget -q https://github.com/cirruslabs/linux-image-server/releases/download/20230625/bzImage
    fi
    
    if [ ! -f "initrd.img" ]; then
        echo "Downloading initrd..."
        wget -q https://github.com/cirruslabs/linux-image-server/releases/download/20230625/initrd.img
    fi
    
    # Create run script
    cat > run_linux.sh << 'EOF'
#!/bin/bash
qemu-system-x86_64 \
    -kernel bzImage \
    -initrd initrd.img \
    -m 512M \
    -append "console=ttyS0 quiet" \
    -nographic \
    -enable-kvm 2>/dev/null || qemu-system-x86_64 \
    -kernel bzImage \
    -initrd initrd.img \
    -m 512M \
    -append "console=ttyS0 quiet" \
    -nographic
EOF
    chmod +x run_linux.sh
    
    echo -e "${GREEN}Linux kernel environment ready${NC}"
}

# Setup ARM bare-metal environment
setup_arm_baremetal() {
    echo -e "${BLUE}Setting up ARM bare-metal environment...${NC}"
    
    mkdir -p "$IMAGES_DIR/arm"
    cd "$IMAGES_DIR/arm"
    
    # Create simple ARM test program
    cat > hello_arm.c << 'EOF'
// Simple ARM bare-metal hello world
void _start() {
    const char msg[] = "Hello from ARM!\n";
    volatile unsigned int * const UART0DR = (unsigned int *)0x101f1000;
    
    for (int i = 0; msg[i] != '\0'; i++) {
        *UART0DR = (unsigned int)(msg[i]);
    }
    
    while(1); // Infinite loop
}
EOF

    # Create linker script
    cat > link.ld << 'EOF'
ENTRY(_start)
SECTIONS {
    . = 0x40000000;
    .text : { *(.text) }
    .data : { *(.data) }
    .bss : { *(.bss) }
}
EOF

    # Create build script
    cat > build.sh << 'EOF'
#!/bin/bash
arm-none-eabi-gcc -c -mcpu=arm926ej-s hello_arm.c -o hello_arm.o
arm-none-eabi-ld -T link.ld hello_arm.o -o hello_arm.elf
arm-none-eabi-objcopy -O binary hello_arm.elf hello_arm.bin
EOF
    chmod +x build.sh
    
    # Create run script
    cat > run_arm.sh << 'EOF'
#!/bin/bash
qemu-system-arm \
    -M versatilepb \
    -m 128M \
    -nographic \
    -kernel hello_arm.bin
EOF
    chmod +x run_arm.sh
    
    echo -e "${GREEN}ARM bare-metal environment ready${NC}"
}

# Setup RISC-V environment
setup_riscv() {
    echo -e "${BLUE}Setting up RISC-V environment...${NC}"
    
    mkdir -p "$IMAGES_DIR/riscv"
    cd "$IMAGES_DIR/riscv"
    
    # Create run script for RISC-V
    cat > run_riscv.sh << 'EOF'
#!/bin/bash
qemu-system-riscv64 \
    -machine virt \
    -bios none \
    -m 256M \
    -nographic
EOF
    chmod +x run_riscv.sh
    
    echo -e "${GREEN}RISC-V environment ready${NC}"
}

# Main execution
main() {
    check_qemu
    setup_linux_kernel
    setup_arm_baremetal
    setup_riscv
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}QEMU environments setup complete!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "Available environments:"
    echo "  - Linux kernel: $IMAGES_DIR/linux/run_linux.sh"
    echo "  - ARM bare-metal: $IMAGES_DIR/arm/run_arm.sh"
    echo "  - RISC-V: $IMAGES_DIR/riscv/run_riscv.sh"
    echo ""
    echo "To run tests in QEMU:"
    echo "  ./run_qemu_tests.sh"
}

main "$@"