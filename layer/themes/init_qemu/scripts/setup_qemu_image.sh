#!/bin/bash

# QEMU Image Setup Script for init_qemu theme
# Creates and configures Ubuntu QEMU images for development

set -e

# Configuration
IMAGE_NAME="${1:-ubuntu-22.04.qcow2}"
IMAGE_SIZE="${2:-20G}"
ISO_URL="https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso"
ISO_NAME="ubuntu-22.04.3-live-server-amd64.iso"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== QEMU Image Setup ===${NC}"

# Check dependencies
check_dependencies() {
    local deps=("qemu-img" "qemu-system-x86_64" "wget")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            echo -e "${RED}Error: $dep is not installed${NC}"
            echo "Install with: sudo apt-get install qemu-system-x86 qemu-utils wget"
            exit 1
        fi
    done
}

# Download Ubuntu ISO if needed
download_iso() {
    if [ ! -f "$ISO_NAME" ]; then
        echo -e "${YELLOW}Downloading Ubuntu ISO...${NC}"
        wget -c "$ISO_URL" -O "$ISO_NAME"
    else
        echo -e "${GREEN}Ubuntu ISO already exists${NC}"
    fi
}

# Create QEMU image
create_image() {
    if [ -f "$IMAGE_NAME" ]; then
        echo -e "${YELLOW}Image $IMAGE_NAME already exists${NC}"
        read -p "Overwrite? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
        rm -f "$IMAGE_NAME"
    fi
    
    echo -e "${GREEN}Creating QEMU image: $IMAGE_NAME (${IMAGE_SIZE})${NC}"
    qemu-img create -f qcow2 "$IMAGE_NAME" "$IMAGE_SIZE"
}

# Create cloud-init configuration
create_cloud_init() {
    echo -e "${GREEN}Creating cloud-init configuration...${NC}"
    
    # Create temporary directory
    CLOUD_INIT_DIR=$(mktemp -d)
    
    # Create user-data
    cat > "$CLOUD_INIT_DIR/user-data" << 'EOF'
#cloud-config
autoinstall:
  version: 1
  identity:
    hostname: aidev-qemu
    username: ubuntu
    password: '$6$rounds=4096$8DfMz6Bq$8FVXo9Rw3vJ9YPGKqOmEn7LGqFE3r7xWZG7NZmZmVzNxI3kSsvbYqQlBmqTmYzeF.w8yH6Wnq9vxKqeZeyVZJ/'
  ssh:
    install-server: true
    allow-pw: true
  packages:
    - build-essential
    - cmake
    - git
    - python3-pip
    - gdb
    - gdbserver
    - curl
    - wget
    - vim
    - htop
  late-commands:
    - echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /target/etc/sudoers.d/ubuntu
    - curtin in-target --target=/target -- chmod 440 /etc/sudoers.d/ubuntu
    - curtin in-target --target=/target -- systemctl enable ssh
EOF
    
    # Create meta-data
    cat > "$CLOUD_INIT_DIR/meta-data" << EOF
instance-id: aidev-qemu-001
local-hostname: aidev-qemu
EOF
    
    # Create ISO
    genisoimage -output cloud-init.iso -volid cidata -joliet -rock \
        "$CLOUD_INIT_DIR/user-data" "$CLOUD_INIT_DIR/meta-data" 2>/dev/null || \
    mkisofs -output cloud-init.iso -volid cidata -joliet -rock \
        "$CLOUD_INIT_DIR/user-data" "$CLOUD_INIT_DIR/meta-data"
    
    rm -rf "$CLOUD_INIT_DIR"
    echo -e "${GREEN}Cloud-init ISO created${NC}"
}

# Install Ubuntu with automated setup
install_ubuntu() {
    echo -e "${GREEN}Installing Ubuntu (this will take a while)...${NC}"
    echo -e "${YELLOW}Note: Installation will run in background${NC}"
    
    qemu-system-x86_64 \
        -name "aidev-qemu-installer" \
        -m 4G \
        -smp 4 \
        -enable-kvm \
        -cpu host \
        -drive file="$IMAGE_NAME",if=virtio \
        -drive file="$ISO_NAME",media=cdrom \
        -drive file=cloud-init.iso,media=cdrom \
        -netdev user,id=net0 \
        -device virtio-net-pci,netdev=net0 \
        -vnc :1 \
        -daemonize
    
    echo -e "${YELLOW}Installation started. Connect with VNC to :5901 to monitor${NC}"
    echo -e "${YELLOW}Wait about 10-15 minutes for installation to complete${NC}"
    echo ""
    echo "Once installation is complete:"
    echo "1. The VM will shutdown automatically"
    echo "2. Remove cloud-init.iso"
    echo "3. Start the VM with: python3 qemu_manager.py start"
    echo ""
    echo "Default credentials:"
    echo "  Username: ubuntu"
    echo "  Password: ubuntu"
}

# Create convenience scripts
create_scripts() {
    echo -e "${GREEN}Creating convenience scripts...${NC}"
    
    # Create start script
    cat > "start_qemu.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/qemu_manager.py" start "$@"
EOF
    chmod +x start_qemu.sh
    
    # Create stop script
    cat > "stop_qemu.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/qemu_manager.py" stop
EOF
    chmod +x stop_qemu.sh
    
    # Create SSH script
    cat > "ssh_qemu.sh" << 'EOF'
#!/bin/bash
ssh -p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@localhost "$@"
EOF
    chmod +x ssh_qemu.sh
    
    echo -e "${GREEN}Scripts created:${NC}"
    echo "  - start_qemu.sh: Start QEMU VM"
    echo "  - stop_qemu.sh: Stop QEMU VM"
    echo "  - ssh_qemu.sh: SSH into VM"
}

# Main setup flow
main() {
    echo -e "${GREEN}Setting up QEMU development environment${NC}"
    echo "Image: $IMAGE_NAME"
    echo "Size: $IMAGE_SIZE"
    echo ""
    
    check_dependencies
    
    # Option to download pre-built image
    echo -e "${YELLOW}Do you want to:${NC}"
    echo "1) Download pre-built development image (faster)"
    echo "2) Create new image from Ubuntu ISO (slower, customizable)"
    read -p "Choice (1/2): " -n 1 -r
    echo
    
    if [[ $REPLY == "1" ]]; then
        echo -e "${GREEN}Downloading pre-built image...${NC}"
        # Download from a hypothetical location
        wget -c "https://example.com/aidev-qemu-images/$IMAGE_NAME" -O "$IMAGE_NAME" || {
            echo -e "${YELLOW}Pre-built image not available, creating new one...${NC}"
            REPLY="2"
        }
    fi
    
    if [[ $REPLY == "2" ]]; then
        download_iso
        create_image
        create_cloud_init
        install_ubuntu
    fi
    
    create_scripts
    
    echo ""
    echo -e "${GREEN}=== Setup Complete ===${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Wait for installation to complete (if creating new image)"
    echo "2. Start QEMU: ./start_qemu.sh"
    echo "3. SSH into VM: ./ssh_qemu.sh"
    echo "4. Build project: python3 qemu_manager.py build"
    echo ""
    echo "For VSCode development:"
    echo "  python3 qemu_manager.py start --mode vscode-server"
    echo "  python3 qemu_manager.py vscode --install"
    echo ""
    echo "For remote debugging:"
    echo "  python3 qemu_manager.py start --mode remote-debug"
    echo "  python3 qemu_manager.py debug /path/to/program"
}

# Run main
main