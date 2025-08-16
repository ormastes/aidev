#!/usr/bin/env python3
"""
Migrated from: run-docker-test-debug.sh
Auto-generated Python - 2025-08-16T04:57:27.782Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Enhanced Docker run script for test-debug
    # Features: SSH, VS Code Server, Remote Debugging
    subprocess.run("set -e", shell=True)
    subprocess.run("CONTAINER_NAME="test-debug"", shell=True)
    subprocess.run("IMAGE="ubuntu:22.04"", shell=True)
    # Stop existing container if running
    subprocess.run("docker stop ${CONTAINER_NAME} 2>/dev/null || true", shell=True)
    subprocess.run("docker rm ${CONTAINER_NAME} 2>/dev/null || true", shell=True)
    print("Starting Docker container: ${CONTAINER_NAME}")
    print("")
    # Run container
    subprocess.run("docker run \", shell=True)
    subprocess.run("--name \", shell=True)
    subprocess.run("test-debug \", shell=True)
    subprocess.run("--hostname \", shell=True)
    subprocess.run("test-debug \", shell=True)
    subprocess.run("--platform \", shell=True)
    subprocess.run("linux/amd64 \", shell=True)
    subprocess.run("-m \", shell=True)
    subprocess.run("4G \", shell=True)
    subprocess.run("--cpus \", shell=True)
    subprocess.run("4 \", shell=True)
    subprocess.run("-p \", shell=True)
    subprocess.run("2222:22 \", shell=True)
    subprocess.run("-p \", shell=True)
    subprocess.run("8080:8080 \", shell=True)
    subprocess.run("-p \", shell=True)
    subprocess.run("1234:1234 \", shell=True)
    subprocess.run("-p \", shell=True)
    subprocess.run("3000:3000 \", shell=True)
    subprocess.run("-p \", shell=True)
    subprocess.run("5000:5000 \", shell=True)
    subprocess.run("-p \", shell=True)
    subprocess.run("8000:8000 \", shell=True)
    subprocess.run("-p \", shell=True)
    subprocess.run("9229:9229 \", shell=True)
    subprocess.run("-e \", shell=True)
    subprocess.run("ENABLE_SSH=true \", shell=True)
    subprocess.run("-e \", shell=True)
    subprocess.run("ENABLE_VSCODE=true \", shell=True)
    subprocess.run("--cap-add=SYS_PTRACE \", shell=True)
    subprocess.run("--security-opt \", shell=True)
    subprocess.run("seccomp=unconfined \", shell=True)
    subprocess.run("-e \", shell=True)
    subprocess.run("ENABLE_GDB_SERVER=true \", shell=True)
    subprocess.run("-v \", shell=True)
    subprocess.run("/home/ormastes/dev/aidev/layer/themes/init_setup-folder/.setup/workspace:/workspace \", shell=True)
    subprocess.run("-v \", shell=True)
    subprocess.run("/home/ormastes/.ssh:/root/.ssh:ro \", shell=True)
    subprocess.run("-v \", shell=True)
    subprocess.run("/home/ormastes/.gitconfig:/root/.gitconfig:ro \", shell=True)
    subprocess.run("-it \", shell=True)
    subprocess.run("${IMAGE}", shell=True)
    print("")
    print("=== Access Information ===")
    print("SSH: ssh -p 2222 root@localhost (password: docker)")
    print("VS Code: http://localhost:8080 (password: changeme)")
    print("GDB: gdb -ex 'target remote :1234'")
    print("")
    print("Container: docker exec -it ${CONTAINER_NAME} bash")

if __name__ == "__main__":
    main()