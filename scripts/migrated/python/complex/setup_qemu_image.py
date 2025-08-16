#!/usr/bin/env python3
"""
Migrated from: setup_qemu_image.sh
Auto-generated Python - 2025-08-16T04:57:27.711Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # QEMU Image Setup Script for init_qemu theme
    # Creates and configures Ubuntu QEMU images for development
    subprocess.run("set -e", shell=True)
    # Configuration
    subprocess.run("IMAGE_NAME="${1:-ubuntu-22.04.qcow2}"", shell=True)
    subprocess.run("IMAGE_SIZE="${2:-20G}"", shell=True)
    subprocess.run("ISO_URL="https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso"", shell=True)
    subprocess.run("ISO_NAME="ubuntu-22.04.3-live-server-amd64.iso"", shell=True)
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${GREEN}=== QEMU Image Setup ===${NC}"
    # Check dependencies
    subprocess.run("check_dependencies() {", shell=True)
    subprocess.run("local deps=("qemu-img" "qemu-system-x86_64" "wget")", shell=True)
    for dep in ["${deps[@]}"; do]:
    subprocess.run("if ! command -v "$dep" &> /dev/null; then", shell=True)
    print("-e ")${RED}Error: $dep is not installed${NC}"
    print("Install with: sudo apt-get install qemu-system-x86 qemu-utils wget")
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Download Ubuntu ISO if needed
    subprocess.run("download_iso() {", shell=True)
    if ! -f "$ISO_NAME" :; then
    print("-e ")${YELLOW}Downloading Ubuntu ISO...${NC}"
    subprocess.run("wget -c "$ISO_URL" -O "$ISO_NAME"", shell=True)
    else:
    print("-e ")${GREEN}Ubuntu ISO already exists${NC}"
    subprocess.run("}", shell=True)
    # Create QEMU image
    subprocess.run("create_image() {", shell=True)
    if -f "$IMAGE_NAME" :; then
    print("-e ")${YELLOW}Image $IMAGE_NAME already exists${NC}"
    subprocess.run("read -p "Overwrite? (y/n): " -n 1 -r", shell=True)
    subprocess.run("echo", shell=True)
    if [ ! $REPLY =~ ^[Yy]$ ]:; then
    sys.exit(0)
    subprocess.run("rm -f "$IMAGE_NAME"", shell=True)
    print("-e ")${GREEN}Creating QEMU image: $IMAGE_NAME (${IMAGE_SIZE})${NC}"
    subprocess.run("qemu-img create -f qcow2 "$IMAGE_NAME" "$IMAGE_SIZE"", shell=True)
    subprocess.run("}", shell=True)
    # Create cloud-init configuration
    subprocess.run("create_cloud_init() {", shell=True)
    print("-e ")${GREEN}Creating cloud-init configuration...${NC}"
    # Create temporary directory
    subprocess.run("CLOUD_INIT_DIR=$(mktemp -d)", shell=True)
    # Create user-data
    subprocess.run("cat > "$CLOUD_INIT_DIR/user-data" << 'EOF'", shell=True)
    # cloud-config
    subprocess.run("autoinstall:", shell=True)
    subprocess.run("version: 1", shell=True)
    subprocess.run("identity:", shell=True)
    subprocess.run("hostname: aidev-qemu", shell=True)
    subprocess.run("username: ubuntu", shell=True)
    subprocess.run("password: '$6$rounds=4096$8DfMz6Bq$8FVXo9Rw3vJ9YPGKqOmEn7LGqFE3r7xWZG7NZmZmVzNxI3kSsvbYqQlBmqTmYzeF.w8yH6Wnq9vxKqeZeyVZJ/'", shell=True)
    subprocess.run("ssh:", shell=True)
    subprocess.run("install-server: true", shell=True)
    subprocess.run("allow-pw: true", shell=True)
    subprocess.run("packages:", shell=True)
    subprocess.run("- build-essential", shell=True)
    subprocess.run("- cmake", shell=True)
    subprocess.run("- git", shell=True)
    subprocess.run("- python3-pip", shell=True)
    subprocess.run("- gdb", shell=True)
    subprocess.run("- gdbserver", shell=True)
    subprocess.run("- curl", shell=True)
    subprocess.run("- wget", shell=True)
    subprocess.run("- vim", shell=True)
    subprocess.run("- htop", shell=True)
    subprocess.run("late-commands:", shell=True)
    subprocess.run("- echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /target/etc/sudoers.d/ubuntu", shell=True)
    subprocess.run("- curtin in-target --target=/target -- chmod 440 /etc/sudoers.d/ubuntu", shell=True)
    subprocess.run("- curtin in-target --target=/target -- systemctl enable ssh", shell=True)
    subprocess.run("EOF", shell=True)
    # Create meta-data
    subprocess.run("cat > "$CLOUD_INIT_DIR/meta-data" << EOF", shell=True)
    subprocess.run("instance-id: aidev-qemu-001", shell=True)
    subprocess.run("local-hostname: aidev-qemu", shell=True)
    subprocess.run("EOF", shell=True)
    # Create ISO
    subprocess.run("genisoimage -output cloud-init.iso -volid cidata -joliet -rock \", shell=True)
    subprocess.run(""$CLOUD_INIT_DIR/user-data" "$CLOUD_INIT_DIR/meta-data" 2>/dev/null || \", shell=True)
    subprocess.run("mkisofs -output cloud-init.iso -volid cidata -joliet -rock \", shell=True)
    subprocess.run(""$CLOUD_INIT_DIR/user-data" "$CLOUD_INIT_DIR/meta-data"", shell=True)
    shutil.rmtree(""$CLOUD_INIT_DIR"", ignore_errors=True)
    print("-e ")${GREEN}Cloud-init ISO created${NC}"
    subprocess.run("}", shell=True)
    # Install Ubuntu with automated setup
    subprocess.run("install_ubuntu() {", shell=True)
    print("-e ")${GREEN}Installing Ubuntu (this will take a while)...${NC}"
    print("-e ")${YELLOW}Note: Installation will run in background${NC}"
    subprocess.run("qemu-system-x86_64 \", shell=True)
    subprocess.run("-name "aidev-qemu-installer" \", shell=True)
    subprocess.run("-m 4G \", shell=True)
    subprocess.run("-smp 4 \", shell=True)
    subprocess.run("-enable-kvm \", shell=True)
    subprocess.run("-cpu host \", shell=True)
    subprocess.run("-drive file="$IMAGE_NAME",if=virtio \", shell=True)
    subprocess.run("-drive file="$ISO_NAME",media=cdrom \", shell=True)
    subprocess.run("-drive file=cloud-init.iso,media=cdrom \", shell=True)
    subprocess.run("-netdev user,id=net0 \", shell=True)
    subprocess.run("-device virtio-net-pci,netdev=net0 \", shell=True)
    subprocess.run("-vnc :1 \", shell=True)
    subprocess.run("-daemonize", shell=True)
    print("-e ")${YELLOW}Installation started. Connect with VNC to :5901 to monitor${NC}"
    print("-e ")${YELLOW}Wait about 10-15 minutes for installation to complete${NC}"
    print("")
    print("Once installation is complete:")
    print("1. The VM will shutdown automatically")
    print("2. Remove cloud-init.iso")
    print("3. Start the VM with: python3 qemu_manager.py start")
    print("")
    print("Default credentials:")
    print("  Username: ubuntu")
    print("  Password: ubuntu")
    subprocess.run("}", shell=True)
    # Create convenience scripts
    subprocess.run("create_scripts() {", shell=True)
    print("-e ")${GREEN}Creating convenience scripts...${NC}"
    # Create start script
    subprocess.run("cat > "start_qemu.sh" << 'EOF'", shell=True)
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("python3 "$SCRIPT_DIR/qemu_manager.py" start "$@"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x start_qemu.sh", shell=True)
    # Create stop script
    subprocess.run("cat > "stop_qemu.sh" << 'EOF'", shell=True)
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("python3 "$SCRIPT_DIR/qemu_manager.py" stop", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x stop_qemu.sh", shell=True)
    # Create SSH script
    subprocess.run("cat > "ssh_qemu.sh" << 'EOF'", shell=True)
    subprocess.run("ssh -p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@localhost "$@"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x ssh_qemu.sh", shell=True)
    print("-e ")${GREEN}Scripts created:${NC}"
    print("  - start_qemu.sh: Start QEMU VM")
    print("  - stop_qemu.sh: Stop QEMU VM")
    print("  - ssh_qemu.sh: SSH into VM")
    subprocess.run("}", shell=True)
    # Main setup flow
    subprocess.run("main() {", shell=True)
    print("-e ")${GREEN}Setting up QEMU development environment${NC}"
    print("Image: $IMAGE_NAME")
    print("Size: $IMAGE_SIZE")
    print("")
    subprocess.run("check_dependencies", shell=True)
    # Option to download pre-built image
    print("-e ")${YELLOW}Do you want to:${NC}"
    print("1) Download pre-built development image (faster)")
    print("2) Create new image from Ubuntu ISO (slower, customizable)")
    subprocess.run("read -p "Choice (1/2): " -n 1 -r", shell=True)
    subprocess.run("echo", shell=True)
    if [ $REPLY == "1" ]:; then
    print("-e ")${GREEN}Downloading pre-built image...${NC}"
    # Download from a hypothetical location
    subprocess.run("wget -c "https://example.com/aidev-qemu-images/$IMAGE_NAME" -O "$IMAGE_NAME" || {", shell=True)
    print("-e ")${YELLOW}Pre-built image not available, creating new one...${NC}"
    subprocess.run("REPLY="2"", shell=True)
    subprocess.run("}", shell=True)
    if [ $REPLY == "2" ]:; then
    subprocess.run("download_iso", shell=True)
    subprocess.run("create_image", shell=True)
    subprocess.run("create_cloud_init", shell=True)
    subprocess.run("install_ubuntu", shell=True)
    subprocess.run("create_scripts", shell=True)
    print("")
    print("-e ")${GREEN}=== Setup Complete ===${NC}"
    print("")
    print("Next steps:")
    print("1. Wait for installation to complete (if creating new image)")
    print("2. Start QEMU: ./start_qemu.sh")
    print("3. SSH into VM: ./ssh_qemu.sh")
    print("4. Build project: python3 qemu_manager.py build")
    print("")
    print("For VSCode development:")
    print("  python3 qemu_manager.py start --mode vscode-server")
    print("  python3 qemu_manager.py vscode --install")
    print("")
    print("For remote debugging:")
    print("  python3 qemu_manager.py start --mode remote-debug")
    print("  python3 qemu_manager.py debug /path/to/program")
    subprocess.run("}", shell=True)
    # Run main
    subprocess.run("main", shell=True)

if __name__ == "__main__":
    main()