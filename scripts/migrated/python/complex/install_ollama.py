#!/usr/bin/env python3
"""
Migrated from: install_ollama.sh
Auto-generated Python - 2025-08-16T04:57:27.668Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # This script installs Ollama on Linux.
    # It detects the current operating system architecture and installs the appropriate version of Ollama.
    subprocess.run("set -eu", shell=True)
    subprocess.run("red="$( (/usr/bin/tput bold || :; /usr/bin/tput setaf 1 || :) 2>&-)"", shell=True)
    subprocess.run("plain="$( (/usr/bin/tput sgr0 || :) 2>&-)"", shell=True)
    subprocess.run("status() { echo ">>> $*" >&2; }", shell=True)
    subprocess.run("error() { echo "${red}ERROR:${plain} $*"; exit 1; }", shell=True)
    subprocess.run("warning() { echo "${red}WARNING:${plain} $*"; }", shell=True)
    subprocess.run("TEMP_DIR=$(mktemp -d)", shell=True)
    subprocess.run("cleanup() { rm -rf $TEMP_DIR; }", shell=True)
    subprocess.run("trap cleanup EXIT", shell=True)
    subprocess.run("available() { command -v $1 >/dev/null; }", shell=True)
    subprocess.run("require() {", shell=True)
    subprocess.run("local MISSING=''", shell=True)
    for TOOL in [$*; do]:
    subprocess.run("if ! available $TOOL; then", shell=True)
    subprocess.run("MISSING="$MISSING $TOOL"", shell=True)
    print("$MISSING")
    subprocess.run("}", shell=True)
    subprocess.run("[ "$(uname -s)" = "Linux" ] || error 'This script is intended to run on Linux only.'", shell=True)
    subprocess.run("ARCH=$(uname -m)", shell=True)
    subprocess.run("case "$ARCH" in", shell=True)
    subprocess.run("x86_64) ARCH="amd64" ;;", shell=True)
    subprocess.run("aarch64|arm64) ARCH="arm64" ;;", shell=True)
    subprocess.run("*) error "Unsupported architecture: $ARCH" ;;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("IS_WSL2=false", shell=True)
    subprocess.run("KERN=$(uname -r)", shell=True)
    subprocess.run("case "$KERN" in", shell=True)
    subprocess.run("*icrosoft*WSL2 | *icrosoft*wsl2) IS_WSL2=true;;", shell=True)
    subprocess.run("*icrosoft) error "Microsoft WSL1 is not currently supported. Please use WSL2 with 'wsl --set-version <distro> 2'" ;;", shell=True)
    subprocess.run("*) ;;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("VER_PARAM="${OLLAMA_VERSION:+?version=$OLLAMA_VERSION}"", shell=True)
    subprocess.run("SUDO=", shell=True)
    if "$(id -u)" -ne 0 :; then
    # Running as root, no need for sudo
    subprocess.run("if ! available sudo; then", shell=True)
    subprocess.run("error "This script requires superuser permissions. Please re-run as root."", shell=True)
    subprocess.run("SUDO="sudo"", shell=True)
    subprocess.run("NEEDS=$(require curl awk grep sed tee xargs)", shell=True)
    if -n "$NEEDS" :; then
    subprocess.run("status "ERROR: The following tools are required but missing:"", shell=True)
    for NEED in [$NEEDS; do]:
    print("  - $NEED")
    sys.exit(1)
    for BINDIR in [/usr/local/bin /usr/bin /bin; do]:
    print("$PATH | grep -q $BINDIR && break || continue")
    subprocess.run("OLLAMA_INSTALL_DIR=$(dirname ${BINDIR})", shell=True)
    if -d "$OLLAMA_INSTALL_DIR/lib/ollama" : ; then
    subprocess.run("status "Cleaning up old version at $OLLAMA_INSTALL_DIR/lib/ollama"", shell=True)
    subprocess.run("$SUDO rm -rf "$OLLAMA_INSTALL_DIR/lib/ollama"", shell=True)
    subprocess.run("status "Installing ollama to $OLLAMA_INSTALL_DIR"", shell=True)
    subprocess.run("$SUDO install -o0 -g0 -m755 -d $BINDIR", shell=True)
    subprocess.run("$SUDO install -o0 -g0 -m755 -d "$OLLAMA_INSTALL_DIR/lib/ollama"", shell=True)
    subprocess.run("status "Downloading Linux ${ARCH} bundle"", shell=True)
    subprocess.run("curl --fail --show-error --location --progress-bar \", shell=True)
    subprocess.run(""https://ollama.com/download/ollama-linux-${ARCH}.tgz${VER_PARAM}" | \", shell=True)
    subprocess.run("$SUDO tar -xzf - -C "$OLLAMA_INSTALL_DIR"", shell=True)
    if "$OLLAMA_INSTALL_DIR/bin/ollama" != "$BINDIR/ollama" : ; then
    subprocess.run("status "Making ollama accessible in the PATH in $BINDIR"", shell=True)
    subprocess.run("$SUDO ln -sf "$OLLAMA_INSTALL_DIR/ollama" "$BINDIR/ollama"", shell=True)
    # Check for NVIDIA JetPack systems with additional downloads
    if -f /etc/nv_tegra_release : ; then
    subprocess.run("if grep R36 /etc/nv_tegra_release > /dev/null ; then", shell=True)
    subprocess.run("status "Downloading JetPack 6 components"", shell=True)
    subprocess.run("curl --fail --show-error --location --progress-bar \", shell=True)
    subprocess.run(""https://ollama.com/download/ollama-linux-${ARCH}-jetpack6.tgz${VER_PARAM}" | \", shell=True)
    subprocess.run("$SUDO tar -xzf - -C "$OLLAMA_INSTALL_DIR"", shell=True)
    subprocess.run("elif grep R35 /etc/nv_tegra_release > /dev/null ; then", shell=True)
    subprocess.run("status "Downloading JetPack 5 components"", shell=True)
    subprocess.run("curl --fail --show-error --location --progress-bar \", shell=True)
    subprocess.run(""https://ollama.com/download/ollama-linux-${ARCH}-jetpack5.tgz${VER_PARAM}" | \", shell=True)
    subprocess.run("$SUDO tar -xzf - -C "$OLLAMA_INSTALL_DIR"", shell=True)
    else:
    subprocess.run("warning "Unsupported JetPack version detected.  GPU may not be supported"", shell=True)
    subprocess.run("install_success() {", shell=True)
    subprocess.run("status 'The Ollama API is now available at 127.0.0.1:11434.'", shell=True)
    subprocess.run("status 'Install complete. Run "ollama" from the command line.'", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("trap install_success EXIT", shell=True)
    # Everything from this point onwards is optional.
    subprocess.run("configure_systemd() {", shell=True)
    subprocess.run("if ! id ollama >/dev/null 2>&1; then", shell=True)
    subprocess.run("status "Creating ollama user..."", shell=True)
    subprocess.run("$SUDO useradd -r -s /bin/false -U -m -d /usr/share/ollama ollama", shell=True)
    subprocess.run("if getent group render >/dev/null 2>&1; then", shell=True)
    subprocess.run("status "Adding ollama user to render group..."", shell=True)
    subprocess.run("$SUDO usermod -a -G render ollama", shell=True)
    subprocess.run("if getent group video >/dev/null 2>&1; then", shell=True)
    subprocess.run("status "Adding ollama user to video group..."", shell=True)
    subprocess.run("$SUDO usermod -a -G video ollama", shell=True)
    subprocess.run("status "Adding current user to ollama group..."", shell=True)
    subprocess.run("$SUDO usermod -a -G ollama $(whoami)", shell=True)
    subprocess.run("status "Creating ollama systemd service..."", shell=True)
    heredoc = """
    [Unit]
    Description=Ollama Service
    After=network-online.target
    
    [Service]
    ExecStart=$BINDIR/ollama serve
    User=ollama
    Group=ollama
    Restart=always
    RestartSec=3
    Environment="PATH=$PATH"
    
    [Install]
    WantedBy=default.target
    """
    subprocess.run("SYSTEMCTL_RUNNING="$(systemctl is-system-running || true)"", shell=True)
    subprocess.run("case $SYSTEMCTL_RUNNING in", shell=True)
    subprocess.run("running|degraded)", shell=True)
    subprocess.run("status "Enabling and starting ollama service..."", shell=True)
    subprocess.run("$SUDO systemctl daemon-reload", shell=True)
    subprocess.run("$SUDO systemctl enable ollama", shell=True)
    subprocess.run("start_service() { $SUDO systemctl restart ollama; }", shell=True)
    subprocess.run("trap start_service EXIT", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("warning "systemd is not running"", shell=True)
    if "$IS_WSL2" = true :; then
    subprocess.run("warning "see https://learn.microsoft.com/en-us/windows/wsl/systemd#how-to-enable-systemd to enable it"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("if available systemctl; then", shell=True)
    subprocess.run("configure_systemd", shell=True)
    # WSL2 only supports GPUs via nvidia passthrough
    # so check for nvidia-smi to determine if GPU is available
    if "$IS_WSL2" = true :; then
    subprocess.run("if available nvidia-smi && [ -n "$(nvidia-smi | grep -o "CUDA Version: [0-9]*\.[0-9]*")" ]; then", shell=True)
    subprocess.run("status "Nvidia GPU detected."", shell=True)
    subprocess.run("install_success", shell=True)
    sys.exit(0)
    # Don't attempt to install drivers on Jetson systems
    if -f /etc/nv_tegra_release : ; then
    subprocess.run("status "NVIDIA JetPack ready."", shell=True)
    subprocess.run("install_success", shell=True)
    sys.exit(0)
    # Install GPU dependencies on Linux
    subprocess.run("if ! available lspci && ! available lshw; then", shell=True)
    subprocess.run("warning "Unable to detect NVIDIA/AMD GPU. Install lspci or lshw to automatically detect and install GPU dependencies."", shell=True)
    sys.exit(0)
    subprocess.run("check_gpu() {", shell=True)
    # Look for devices based on vendor ID for NVIDIA and AMD
    subprocess.run("case $1 in", shell=True)
    subprocess.run("lspci)", shell=True)
    subprocess.run("case $2 in", shell=True)
    subprocess.run("nvidia) available lspci && lspci -d '10de:' | grep -q 'NVIDIA' || return 1 ;;", shell=True)
    subprocess.run("amdgpu) available lspci && lspci -d '1002:' | grep -q 'AMD' || return 1 ;;", shell=True)
    subprocess.run("esac ;;", shell=True)
    subprocess.run("lshw)", shell=True)
    subprocess.run("case $2 in", shell=True)
    subprocess.run("nvidia) available lshw && $SUDO lshw -c display -numeric -disable network | grep -q 'vendor: .* \[10DE\]' || return 1 ;;", shell=True)
    subprocess.run("amdgpu) available lshw && $SUDO lshw -c display -numeric -disable network | grep -q 'vendor: .* \[1002\]' || return 1 ;;", shell=True)
    subprocess.run("esac ;;", shell=True)
    subprocess.run("nvidia-smi) available nvidia-smi || return 1 ;;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("if check_gpu nvidia-smi; then", shell=True)
    subprocess.run("status "NVIDIA GPU installed."", shell=True)
    sys.exit(0)
    subprocess.run("if ! check_gpu lspci nvidia && ! check_gpu lshw nvidia && ! check_gpu lspci amdgpu && ! check_gpu lshw amdgpu; then", shell=True)
    subprocess.run("install_success", shell=True)
    subprocess.run("warning "No NVIDIA/AMD GPU detected. Ollama will run in CPU-only mode."", shell=True)
    sys.exit(0)
    subprocess.run("if check_gpu lspci amdgpu || check_gpu lshw amdgpu; then", shell=True)
    subprocess.run("status "Downloading Linux ROCm ${ARCH} bundle"", shell=True)
    subprocess.run("curl --fail --show-error --location --progress-bar \", shell=True)
    subprocess.run(""https://ollama.com/download/ollama-linux-${ARCH}-rocm.tgz${VER_PARAM}" | \", shell=True)
    subprocess.run("$SUDO tar -xzf - -C "$OLLAMA_INSTALL_DIR"", shell=True)
    subprocess.run("install_success", shell=True)
    subprocess.run("status "AMD GPU ready."", shell=True)
    sys.exit(0)
    subprocess.run("CUDA_REPO_ERR_MSG="NVIDIA GPU detected, but your OS and Architecture are not supported by NVIDIA.  Please install the CUDA driver manually https://docs.nvidia.com/cuda/cuda-installation-guide-linux/"", shell=True)
    # ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#rhel-7-centos-7
    # ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#rhel-8-rocky-8
    # ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#rhel-9-rocky-9
    # ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#fedora
    subprocess.run("install_cuda_driver_yum() {", shell=True)
    subprocess.run("status 'Installing NVIDIA repository...'", shell=True)
    subprocess.run("case $PACKAGE_MANAGER in", shell=True)
    subprocess.run("yum)", shell=True)
    subprocess.run("$SUDO $PACKAGE_MANAGER -y install yum-utils", shell=True)
    subprocess.run("if curl -I --silent --fail --location "https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-$1$2.repo" >/dev/null ; then", shell=True)
    subprocess.run("$SUDO $PACKAGE_MANAGER-config-manager --add-repo https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-$1$2.repo", shell=True)
    else:
    subprocess.run("error $CUDA_REPO_ERR_MSG", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("dnf)", shell=True)
    subprocess.run("if curl -I --silent --fail --location "https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-$1$2.repo" >/dev/null ; then", shell=True)
    subprocess.run("$SUDO $PACKAGE_MANAGER config-manager --add-repo https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-$1$2.repo", shell=True)
    else:
    subprocess.run("error $CUDA_REPO_ERR_MSG", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("case $1 in", shell=True)
    subprocess.run("rhel)", shell=True)
    subprocess.run("status 'Installing EPEL repository...'", shell=True)
    # EPEL is required for third-party dependencies such as dkms and libvdpau
    subprocess.run("$SUDO $PACKAGE_MANAGER -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-$2.noarch.rpm || true", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("status 'Installing CUDA driver...'", shell=True)
    if "$1" = 'centos' ] || [ "$1$2" = 'rhel7' :; then
    subprocess.run("$SUDO $PACKAGE_MANAGER -y install nvidia-driver-latest-dkms", shell=True)
    subprocess.run("$SUDO $PACKAGE_MANAGER -y install cuda-drivers", shell=True)
    subprocess.run("}", shell=True)
    # ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#ubuntu
    # ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#debian
    subprocess.run("install_cuda_driver_apt() {", shell=True)
    subprocess.run("status 'Installing NVIDIA repository...'", shell=True)
    subprocess.run("if curl -I --silent --fail --location "https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-keyring_1.1-1_all.deb" >/dev/null ; then", shell=True)
    subprocess.run("curl -fsSL -o $TEMP_DIR/cuda-keyring.deb https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-keyring_1.1-1_all.deb", shell=True)
    else:
    subprocess.run("error $CUDA_REPO_ERR_MSG", shell=True)
    subprocess.run("case $1 in", shell=True)
    subprocess.run("debian)", shell=True)
    subprocess.run("status 'Enabling contrib sources...'", shell=True)
    subprocess.run("$SUDO sed 's/main/contrib/' < /etc/apt/sources.list | $SUDO tee /etc/apt/sources.list.d/contrib.list > /dev/null", shell=True)
    if -f "/etc/apt/sources.list.d/debian.sources" :; then
    subprocess.run("$SUDO sed 's/main/contrib/' < /etc/apt/sources.list.d/debian.sources | $SUDO tee /etc/apt/sources.list.d/contrib.sources > /dev/null", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("status 'Installing CUDA driver...'", shell=True)
    subprocess.run("$SUDO dpkg -i $TEMP_DIR/cuda-keyring.deb", shell=True)
    subprocess.run("$SUDO apt-get update", shell=True)
    subprocess.run("[ -n "$SUDO" ] && SUDO_E="$SUDO -E" || SUDO_E=", shell=True)
    subprocess.run("DEBIAN_FRONTEND=noninteractive $SUDO_E apt-get -y install cuda-drivers -q", shell=True)
    subprocess.run("}", shell=True)
    if ! -f "/etc/os-release" :; then
    subprocess.run("error "Unknown distribution. Skipping CUDA installation."", shell=True)
    subprocess.run(". /etc/os-release", shell=True)
    subprocess.run("OS_NAME=$ID", shell=True)
    subprocess.run("OS_VERSION=$VERSION_ID", shell=True)
    subprocess.run("PACKAGE_MANAGER=", shell=True)
    for PACKAGE_MANAGER in [dnf yum apt-get; do]:
    subprocess.run("if available $PACKAGE_MANAGER; then", shell=True)
    subprocess.run("break", shell=True)
    if -z "$PACKAGE_MANAGER" :; then
    subprocess.run("error "Unknown package manager. Skipping CUDA installation."", shell=True)
    subprocess.run("if ! check_gpu nvidia-smi || [ -z "$(nvidia-smi | grep -o "CUDA Version: [0-9]*\.[0-9]*")" ]; then", shell=True)
    subprocess.run("case $OS_NAME in", shell=True)
    subprocess.run("centos|rhel) install_cuda_driver_yum 'rhel' $(echo $OS_VERSION | cut -d '.' -f 1) ;;", shell=True)
    subprocess.run("rocky) install_cuda_driver_yum 'rhel' $(echo $OS_VERSION | cut -c1) ;;", shell=True)
    subprocess.run("fedora) [ $OS_VERSION -lt '39' ] && install_cuda_driver_yum $OS_NAME $OS_VERSION || install_cuda_driver_yum $OS_NAME '39';;", shell=True)
    subprocess.run("amzn) install_cuda_driver_yum 'fedora' '37' ;;", shell=True)
    subprocess.run("debian) install_cuda_driver_apt $OS_NAME $OS_VERSION ;;", shell=True)
    subprocess.run("ubuntu) install_cuda_driver_apt $OS_NAME $(echo $OS_VERSION | sed 's/\.//') ;;", shell=True)
    subprocess.run("*) exit ;;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("if ! lsmod | grep -q nvidia || ! lsmod | grep -q nvidia_uvm; then", shell=True)
    subprocess.run("KERNEL_RELEASE="$(uname -r)"", shell=True)
    subprocess.run("case $OS_NAME in", shell=True)
    subprocess.run("rocky) $SUDO $PACKAGE_MANAGER -y install kernel-devel kernel-headers ;;", shell=True)
    subprocess.run("centos|rhel|amzn) $SUDO $PACKAGE_MANAGER -y install kernel-devel-$KERNEL_RELEASE kernel-headers-$KERNEL_RELEASE ;;", shell=True)
    subprocess.run("fedora) $SUDO $PACKAGE_MANAGER -y install kernel-devel-$KERNEL_RELEASE ;;", shell=True)
    subprocess.run("debian|ubuntu) $SUDO apt-get -y install linux-headers-$KERNEL_RELEASE ;;", shell=True)
    subprocess.run("*) exit ;;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("NVIDIA_CUDA_VERSION=$($SUDO dkms status | awk -F: '/added/ { print $1 }')", shell=True)
    if -n "$NVIDIA_CUDA_VERSION" :; then
    subprocess.run("$SUDO dkms install $NVIDIA_CUDA_VERSION", shell=True)
    subprocess.run("if lsmod | grep -q nouveau; then", shell=True)
    subprocess.run("status 'Reboot to complete NVIDIA CUDA driver install.'", shell=True)
    sys.exit(0)
    subprocess.run("$SUDO modprobe nvidia", shell=True)
    subprocess.run("$SUDO modprobe nvidia_uvm", shell=True)
    # make sure the NVIDIA modules are loaded on boot with nvidia-persistenced
    subprocess.run("if available nvidia-persistenced; then", shell=True)
    subprocess.run("$SUDO touch /etc/modules-load.d/nvidia.conf", shell=True)
    subprocess.run("MODULES="nvidia nvidia-uvm"", shell=True)
    for MODULE in [$MODULES; do]:
    subprocess.run("if ! grep -qxF "$MODULE" /etc/modules-load.d/nvidia.conf; then", shell=True)
    print("$MODULE") | $SUDO tee -a /etc/modules-load.d/nvidia.conf > /dev/null
    subprocess.run("status "NVIDIA GPU ready."", shell=True)
    subprocess.run("install_success", shell=True)

if __name__ == "__main__":
    main()