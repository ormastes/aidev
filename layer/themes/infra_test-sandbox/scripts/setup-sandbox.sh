#!/bin/bash

# Setup script for test sandbox infrastructure
set -e

echo "🚀 Setting up Test Sandbox Infrastructure"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Docker
check_docker() {
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker found: $(docker --version)"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Docker not found"
        return 1
    fi
}

# Check for Podman
check_podman() {
    if command -v podman &> /dev/null; then
        echo -e "${GREEN}✓${NC} Podman found: $(podman --version)"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Podman not found"
        return 1
    fi
}

# Check for QEMU
check_qemu() {
    if command -v qemu-system-x86_64 &> /dev/null; then
        echo -e "${GREEN}✓${NC} QEMU found: $(qemu-system-x86_64 --version | head -1)"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} QEMU not found"
        return 1
    fi
}

# Pull Docker images
setup_docker_images() {
    echo -e "\n${YELLOW}Setting up Docker images...${NC}"
    
    images=("node:18-alpine" "alpine:latest" "ubuntu:22.04")
    
    for image in "${images[@]}"; do
        echo "Pulling $image..."
        docker pull "$image" || echo -e "${YELLOW}Failed to pull $image${NC}"
    done
}

# Create QEMU base image
setup_qemu_image() {
    echo -e "\n${YELLOW}Setting up QEMU images...${NC}"
    
    QEMU_DIR="$HOME/.aidev/qemu"
    mkdir -p "$QEMU_DIR"
    
    if [ ! -f "$QEMU_DIR/alpine-qemu.qcow2" ]; then
        echo "Creating Alpine QEMU image..."
        qemu-img create -f qcow2 "$QEMU_DIR/alpine-qemu.qcow2" 2G
        echo -e "${GREEN}✓${NC} QEMU image created at $QEMU_DIR/alpine-qemu.qcow2"
    else
        echo -e "${GREEN}✓${NC} QEMU image already exists"
    fi
}

# Setup Firecracker (optional)
setup_firecracker() {
    echo -e "\n${YELLOW}Checking Firecracker support...${NC}"
    
    if [ "$(uname -s)" != "Linux" ]; then
        echo -e "${YELLOW}⚠${NC} Firecracker only supported on Linux"
        return 1
    fi
    
    if [ ! -f "/usr/local/bin/firecracker" ]; then
        echo "Firecracker not installed. Download from:"
        echo "https://github.com/firecracker-microvm/firecracker/releases"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} Firecracker found"
}

# Install npm packages
install_dependencies() {
    echo -e "\n${YELLOW}Installing dependencies...${NC}"
    
    cd "$(dirname "$0")/.."
    
    if [ -f "package.json" ]; then
        npm install
        echo -e "${GREEN}✓${NC} Dependencies installed"
    fi
}

# Create test directories
setup_directories() {
    echo -e "\n${YELLOW}Creating test directories...${NC}"
    
    dirs=(
        "gen/test-sandbox"
        "gen/test-sandbox/docker"
        "gen/test-sandbox/qemu"
        "gen/test-sandbox/logs"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        echo -e "${GREEN}✓${NC} Created $dir"
    done
}

# Main setup
main() {
    echo -e "\n${YELLOW}Checking sandbox providers...${NC}"
    
    DOCKER_AVAILABLE=false
    PODMAN_AVAILABLE=false
    QEMU_AVAILABLE=false
    
    if check_docker; then
        DOCKER_AVAILABLE=true
        setup_docker_images
    fi
    
    if check_podman; then
        PODMAN_AVAILABLE=true
    fi
    
    if check_qemu; then
        QEMU_AVAILABLE=true
        setup_qemu_image
    fi
    
    # Check if at least one provider is available
    if [ "$DOCKER_AVAILABLE" = false ] && [ "$PODMAN_AVAILABLE" = false ] && [ "$QEMU_AVAILABLE" = false ]; then
        echo -e "\n${RED}❌ No sandbox providers found!${NC}"
        echo "Please install at least one of: Docker, Podman, or QEMU"
        exit 1
    fi
    
    setup_firecracker || true
    setup_directories
    install_dependencies
    
    # Generate configuration
    echo -e "\n${YELLOW}Generating configuration...${NC}"
    
    CONFIG_FILE="config/runtime-config.json"
    cat > "$CONFIG_FILE" << EOF
{
  "providers": {
    "docker": $DOCKER_AVAILABLE,
    "podman": $PODMAN_AVAILABLE,
    "qemu": $QEMU_AVAILABLE
  },
  "defaultProvider": "$(if $DOCKER_AVAILABLE; then echo "docker"; elif $PODMAN_AVAILABLE; then echo "podman"; else echo "qemu"; fi)",
  "setupComplete": true,
  "setupDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    echo -e "${GREEN}✓${NC} Configuration saved to $CONFIG_FILE"
    
    echo -e "\n${GREEN}✅ Test Sandbox Infrastructure setup complete!${NC}"
    echo -e "\nAvailable providers:"
    [ "$DOCKER_AVAILABLE" = true ] && echo -e "  ${GREEN}✓${NC} Docker"
    [ "$PODMAN_AVAILABLE" = true ] && echo -e "  ${GREEN}✓${NC} Podman"
    [ "$QEMU_AVAILABLE" = true ] && echo -e "  ${GREEN}✓${NC} QEMU"
    
    echo -e "\nTo run sandboxed tests:"
    echo "  npm test -- --sandbox"
    echo "  npm test -- --sandbox=docker"
    echo "  npm test -- --sandbox=qemu"
}

# Run main function
main "$@"