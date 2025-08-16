#!/usr/bin/env bun
/**
 * Migrated from: setup_qemu_image.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.711Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // QEMU Image Setup Script for init_qemu theme
  // Creates and configures Ubuntu QEMU images for development
  await $`set -e`;
  // Configuration
  await $`IMAGE_NAME="${1:-ubuntu-22.04.qcow2}"`;
  await $`IMAGE_SIZE="${2:-20G}"`;
  await $`ISO_URL="https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso"`;
  await $`ISO_NAME="ubuntu-22.04.3-live-server-amd64.iso"`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${GREEN}=== QEMU Image Setup ===${NC}"
  // Check dependencies
  await $`check_dependencies() {`;
  await $`local deps=("qemu-img" "qemu-system-x86_64" "wget")`;
  for (const dep of ["${deps[@]}"; do]) {
  await $`if ! command -v "$dep" &> /dev/null; then`;
  console.log("-e ");${RED}Error: $dep is not installed${NC}"
  console.log("Install with: sudo apt-get install qemu-system-x86 qemu-utils wget");
  process.exit(1);
  }
  }
  await $`}`;
  // Download Ubuntu ISO if needed
  await $`download_iso() {`;
  if (! -f "$ISO_NAME" ) {; then
  console.log("-e ");${YELLOW}Downloading Ubuntu ISO...${NC}"
  await $`wget -c "$ISO_URL" -O "$ISO_NAME"`;
  } else {
  console.log("-e ");${GREEN}Ubuntu ISO already exists${NC}"
  }
  await $`}`;
  // Create QEMU image
  await $`create_image() {`;
  if (-f "$IMAGE_NAME" ) {; then
  console.log("-e ");${YELLOW}Image $IMAGE_NAME already exists${NC}"
  await $`read -p "Overwrite? (y/n): " -n 1 -r`;
  await $`echo`;
  if ([ ! $REPLY =~ ^[Yy]$ ]) {; then
  process.exit(0);
  }
  await $`rm -f "$IMAGE_NAME"`;
  }
  console.log("-e ");${GREEN}Creating QEMU image: $IMAGE_NAME (${IMAGE_SIZE})${NC}"
  await $`qemu-img create -f qcow2 "$IMAGE_NAME" "$IMAGE_SIZE"`;
  await $`}`;
  // Create cloud-init configuration
  await $`create_cloud_init() {`;
  console.log("-e ");${GREEN}Creating cloud-init configuration...${NC}"
  // Create temporary directory
  await $`CLOUD_INIT_DIR=$(mktemp -d)`;
  // Create user-data
  await $`cat > "$CLOUD_INIT_DIR/user-data" << 'EOF'`;
  // cloud-config
  await $`autoinstall:`;
  await $`version: 1`;
  await $`identity:`;
  await $`hostname: aidev-qemu`;
  await $`username: ubuntu`;
  await $`password: '$6$rounds=4096$8DfMz6Bq$8FVXo9Rw3vJ9YPGKqOmEn7LGqFE3r7xWZG7NZmZmVzNxI3kSsvbYqQlBmqTmYzeF.w8yH6Wnq9vxKqeZeyVZJ/'`;
  await $`ssh:`;
  await $`install-server: true`;
  await $`allow-pw: true`;
  await $`packages:`;
  await $`- build-essential`;
  await $`- cmake`;
  await $`- git`;
  await $`- python3-pip`;
  await $`- gdb`;
  await $`- gdbserver`;
  await $`- curl`;
  await $`- wget`;
  await $`- vim`;
  await $`- htop`;
  await $`late-commands:`;
  await $`- echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /target/etc/sudoers.d/ubuntu`;
  await $`- curtin in-target --target=/target -- chmod 440 /etc/sudoers.d/ubuntu`;
  await $`- curtin in-target --target=/target -- systemctl enable ssh`;
  await $`EOF`;
  // Create meta-data
  await $`cat > "$CLOUD_INIT_DIR/meta-data" << EOF`;
  await $`instance-id: aidev-qemu-001`;
  await $`local-hostname: aidev-qemu`;
  await $`EOF`;
  // Create ISO
  await $`genisoimage -output cloud-init.iso -volid cidata -joliet -rock \`;
  await $`"$CLOUD_INIT_DIR/user-data" "$CLOUD_INIT_DIR/meta-data" 2>/dev/null || \`;
  await $`mkisofs -output cloud-init.iso -volid cidata -joliet -rock \`;
  await $`"$CLOUD_INIT_DIR/user-data" "$CLOUD_INIT_DIR/meta-data"`;
  await rm(""$CLOUD_INIT_DIR"", { recursive: true, force: true });
  console.log("-e ");${GREEN}Cloud-init ISO created${NC}"
  await $`}`;
  // Install Ubuntu with automated setup
  await $`install_ubuntu() {`;
  console.log("-e ");${GREEN}Installing Ubuntu (this will take a while)...${NC}"
  console.log("-e ");${YELLOW}Note: Installation will run in background${NC}"
  await $`qemu-system-x86_64 \`;
  await $`-name "aidev-qemu-installer" \`;
  await $`-m 4G \`;
  await $`-smp 4 \`;
  await $`-enable-kvm \`;
  await $`-cpu host \`;
  await $`-drive file="$IMAGE_NAME",if=virtio \`;
  await $`-drive file="$ISO_NAME",media=cdrom \`;
  await $`-drive file=cloud-init.iso,media=cdrom \`;
  await $`-netdev user,id=net0 \`;
  await $`-device virtio-net-pci,netdev=net0 \`;
  await $`-vnc :1 \`;
  await $`-daemonize`;
  console.log("-e ");${YELLOW}Installation started. Connect with VNC to :5901 to monitor${NC}"
  console.log("-e ");${YELLOW}Wait about 10-15 minutes for installation to complete${NC}"
  console.log("");
  console.log("Once installation is complete:");
  console.log("1. The VM will shutdown automatically");
  console.log("2. Remove cloud-init.iso");
  console.log("3. Start the VM with: python3 qemu_manager.py start");
  console.log("");
  console.log("Default credentials:");
  console.log("  Username: ubuntu");
  console.log("  Password: ubuntu");
  await $`}`;
  // Create convenience scripts
  await $`create_scripts() {`;
  console.log("-e ");${GREEN}Creating convenience scripts...${NC}"
  // Create start script
  await $`cat > "start_qemu.sh" << 'EOF'`;
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`python3 "$SCRIPT_DIR/qemu_manager.py" start "$@"`;
  await $`EOF`;
  await $`chmod +x start_qemu.sh`;
  // Create stop script
  await $`cat > "stop_qemu.sh" << 'EOF'`;
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`python3 "$SCRIPT_DIR/qemu_manager.py" stop`;
  await $`EOF`;
  await $`chmod +x stop_qemu.sh`;
  // Create SSH script
  await $`cat > "ssh_qemu.sh" << 'EOF'`;
  await $`ssh -p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@localhost "$@"`;
  await $`EOF`;
  await $`chmod +x ssh_qemu.sh`;
  console.log("-e ");${GREEN}Scripts created:${NC}"
  console.log("  - start_qemu.sh: Start QEMU VM");
  console.log("  - stop_qemu.sh: Stop QEMU VM");
  console.log("  - ssh_qemu.sh: SSH into VM");
  await $`}`;
  // Main setup flow
  await $`main() {`;
  console.log("-e ");${GREEN}Setting up QEMU development environment${NC}"
  console.log("Image: $IMAGE_NAME");
  console.log("Size: $IMAGE_SIZE");
  console.log("");
  await $`check_dependencies`;
  // Option to download pre-built image
  console.log("-e ");${YELLOW}Do you want to:${NC}"
  console.log("1) Download pre-built development image (faster)");
  console.log("2) Create new image from Ubuntu ISO (slower, customizable)");
  await $`read -p "Choice (1/2): " -n 1 -r`;
  await $`echo`;
  if ([ $REPLY == "1" ]) {; then
  console.log("-e ");${GREEN}Downloading pre-built image...${NC}"
  // Download from a hypothetical location
  await $`wget -c "https://example.com/aidev-qemu-images/$IMAGE_NAME" -O "$IMAGE_NAME" || {`;
  console.log("-e ");${YELLOW}Pre-built image not available, creating new one...${NC}"
  await $`REPLY="2"`;
  await $`}`;
  }
  if ([ $REPLY == "2" ]) {; then
  await $`download_iso`;
  await $`create_image`;
  await $`create_cloud_init`;
  await $`install_ubuntu`;
  }
  await $`create_scripts`;
  console.log("");
  console.log("-e ");${GREEN}=== Setup Complete ===${NC}"
  console.log("");
  console.log("Next steps:");
  console.log("1. Wait for installation to complete (if creating new image)");
  console.log("2. Start QEMU: ./start_qemu.sh");
  console.log("3. SSH into VM: ./ssh_qemu.sh");
  console.log("4. Build project: python3 qemu_manager.py build");
  console.log("");
  console.log("For VSCode development:");
  console.log("  python3 qemu_manager.py start --mode vscode-server");
  console.log("  python3 qemu_manager.py vscode --install");
  console.log("");
  console.log("For remote debugging:");
  console.log("  python3 qemu_manager.py start --mode remote-debug");
  console.log("  python3 qemu_manager.py debug /path/to/program");
  await $`}`;
  // Run main
  await $`main`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}