#!/usr/bin/env python3
"""
Migrated from: run-docker.sh
Auto-generated Python - 2025-08-16T04:57:27.757Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Docker Run Script with SSH and VS Code Server
    subprocess.run("set -e", shell=True)
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    # Configuration
    subprocess.run("CONTAINER_NAME="${CONTAINER_NAME:-aidev-main}"", shell=True)
    subprocess.run("IMAGE_NAME="${IMAGE_NAME:-aidev/development:latest}"", shell=True)
    subprocess.run("SSH_PORT="${SSH_PORT:-2222}"", shell=True)
    subprocess.run("VSCODE_PORT="${VSCODE_PORT:-8080}"", shell=True)
    subprocess.run("GDB_PORT="${GDB_PORT:-1234}"", shell=True)
    subprocess.run("WORKSPACE="${WORKSPACE:-./workspace}"", shell=True)
    # Parse arguments
    while [[ $# -gt 0 ]]; do:
    subprocess.run("case $1 in", shell=True)
    subprocess.run("--name)", shell=True)
    subprocess.run("CONTAINER_NAME="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--image)", shell=True)
    subprocess.run("IMAGE_NAME="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--ssh-port)", shell=True)
    subprocess.run("SSH_PORT="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--vscode-port)", shell=True)
    subprocess.run("VSCODE_PORT="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--workspace)", shell=True)
    subprocess.run("WORKSPACE="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--debug)", shell=True)
    subprocess.run("DEBUG_MODE=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--detach)", shell=True)
    subprocess.run("DETACH="-d"", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    print("-e ")${GREEN}=== Starting Docker Development Environment ===${NC}"
    print("Container: $CONTAINER_NAME")
    print("Image: $IMAGE_NAME")
    print("")
    # Create workspace if it doesn't exist
    Path(""$WORKSPACE"").mkdir(parents=True, exist_ok=True)
    # Stop existing container if running
    subprocess.run("if docker ps -a | grep -q "$CONTAINER_NAME"; then", shell=True)
    print("-e ")${YELLOW}Stopping existing container...${NC}"
    subprocess.run("docker stop "$CONTAINER_NAME" 2>/dev/null || true", shell=True)
    subprocess.run("docker rm "$CONTAINER_NAME" 2>/dev/null || true", shell=True)
    # Run container
    print("-e ")${GREEN}Starting container...${NC}"
    subprocess.run("DOCKER_RUN_CMD="docker run $DETACH \", shell=True)
    subprocess.run("--name $CONTAINER_NAME \", shell=True)
    subprocess.run("--hostname $CONTAINER_NAME \", shell=True)
    subprocess.run("-p $SSH_PORT:22 \", shell=True)
    subprocess.run("-p $VSCODE_PORT:8080 \", shell=True)
    subprocess.run("-p $GDB_PORT:1234 \", shell=True)
    subprocess.run("-p 3000:3000 \", shell=True)
    subprocess.run("-p 5000:5000 \", shell=True)
    subprocess.run("-p 8000:8000 \", shell=True)
    subprocess.run("-p 9229:9229 \", shell=True)
    subprocess.run("-p 9000-9010:9000-9010 \", shell=True)
    subprocess.run("-v $(pwd)/$WORKSPACE:/workspace \", shell=True)
    subprocess.run("-v ~/.ssh:/root/.ssh:ro \", shell=True)
    subprocess.run("-v ~/.gitconfig:/root/.gitconfig:ro \", shell=True)
    subprocess.run("-e ENABLE_SSH=true \", shell=True)
    subprocess.run("-e ENABLE_VSCODE=true"", shell=True)
    if "$DEBUG_MODE" = true :; then
    subprocess.run("DOCKER_RUN_CMD="$DOCKER_RUN_CMD \", shell=True)
    subprocess.run("-e ENABLE_GDB_SERVER=true \", shell=True)
    subprocess.run("--cap-add=SYS_PTRACE \", shell=True)
    subprocess.run("--security-opt seccomp=unconfined"", shell=True)
    subprocess.run("DOCKER_RUN_CMD="$DOCKER_RUN_CMD \", shell=True)
    subprocess.run("-it \", shell=True)
    subprocess.run("$IMAGE_NAME"", shell=True)
    subprocess.run("eval $DOCKER_RUN_CMD", shell=True)
    if "$DETACH" = "-d" :; then
    print("")
    print("-e ")${GREEN}✅ Container started in background${NC}"
    print("")
    print("-e ")${BLUE}=== Access Information ===${NC}"
    print("-e ")${GREEN}SSH:${NC} ssh -p $SSH_PORT root@localhost (password: docker)"
    print("-e ")${GREEN}VS Code:${NC} http://localhost:$VSCODE_PORT (password: changeme)"
    print("-e ")${GREEN}GDB Debug:${NC} gdb -ex 'target remote :$GDB_PORT'"
    print("")
    print("-e ")${BLUE}=== Container Management ===${NC}"
    print("Attach to container: docker attach $CONTAINER_NAME")
    print("View logs: docker logs -f $CONTAINER_NAME")
    print("Execute command: docker exec -it $CONTAINER_NAME bash")
    print("Stop container: docker stop $CONTAINER_NAME")
    print("")
    # Wait for services to start
    print("-e ")${YELLOW}Waiting for services to start...${NC}"
    time.sleep(3)
    # Check if SSH is accessible
    subprocess.run("if nc -z localhost $SSH_PORT 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}✅ SSH server is running${NC}"
    # Check if VS Code is accessible
    subprocess.run("if nc -z localhost $VSCODE_PORT 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}✅ VS Code Server is running${NC}"
    print("-e ")${GREEN}   Open: http://localhost:$VSCODE_PORT${NC}"

if __name__ == "__main__":
    main()