#!/usr/bin/env bun
/**
 * Migrated from: install_ollama.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.667Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // This script installs Ollama on Linux.
  // It detects the current operating system architecture and installs the appropriate version of Ollama.
  await $`set -eu`;
  await $`red="$( (/usr/bin/tput bold || :; /usr/bin/tput setaf 1 || :) 2>&-)"`;
  await $`plain="$( (/usr/bin/tput sgr0 || :) 2>&-)"`;
  await $`status() { echo ">>> $*" >&2; }`;
  await $`error() { echo "${red}ERROR:${plain} $*"; exit 1; }`;
  await $`warning() { echo "${red}WARNING:${plain} $*"; }`;
  await $`TEMP_DIR=$(mktemp -d)`;
  await $`cleanup() { rm -rf $TEMP_DIR; }`;
  await $`trap cleanup EXIT`;
  await $`available() { command -v $1 >/dev/null; }`;
  await $`require() {`;
  await $`local MISSING=''`;
  for (const TOOL of [$*; do]) {
  await $`if ! available $TOOL; then`;
  await $`MISSING="$MISSING $TOOL"`;
  }
  }
  console.log("$MISSING");
  await $`}`;
  await $`[ "$(uname -s)" = "Linux" ] || error 'This script is intended to run on Linux only.'`;
  await $`ARCH=$(uname -m)`;
  await $`case "$ARCH" in`;
  await $`x86_64) ARCH="amd64" ;;`;
  await $`aarch64|arm64) ARCH="arm64" ;;`;
  await $`*) error "Unsupported architecture: $ARCH" ;;`;
  await $`esac`;
  await $`IS_WSL2=false`;
  await $`KERN=$(uname -r)`;
  await $`case "$KERN" in`;
  await $`*icrosoft*WSL2 | *icrosoft*wsl2) IS_WSL2=true;;`;
  await $`*icrosoft) error "Microsoft WSL1 is not currently supported. Please use WSL2 with 'wsl --set-version <distro> 2'" ;;`;
  await $`*) ;;`;
  await $`esac`;
  await $`VER_PARAM="${OLLAMA_VERSION:+?version=$OLLAMA_VERSION}"`;
  await $`SUDO=`;
  if ("$(id -u)" -ne 0 ) {; then
  // Running as root, no need for sudo
  await $`if ! available sudo; then`;
  await $`error "This script requires superuser permissions. Please re-run as root."`;
  }
  await $`SUDO="sudo"`;
  }
  await $`NEEDS=$(require curl awk grep sed tee xargs)`;
  if (-n "$NEEDS" ) {; then
  await $`status "ERROR: The following tools are required but missing:"`;
  for (const NEED of [$NEEDS; do]) {
  console.log("  - $NEED");
  }
  process.exit(1);
  }
  for (const BINDIR of [/usr/local/bin /usr/bin /bin; do]) {
  console.log("$PATH | grep -q $BINDIR && break || continue");
  }
  await $`OLLAMA_INSTALL_DIR=$(dirname ${BINDIR})`;
  if (-d "$OLLAMA_INSTALL_DIR/lib/ollama" ) { ; then
  await $`status "Cleaning up old version at $OLLAMA_INSTALL_DIR/lib/ollama"`;
  await $`$SUDO rm -rf "$OLLAMA_INSTALL_DIR/lib/ollama"`;
  }
  await $`status "Installing ollama to $OLLAMA_INSTALL_DIR"`;
  await $`$SUDO install -o0 -g0 -m755 -d $BINDIR`;
  await $`$SUDO install -o0 -g0 -m755 -d "$OLLAMA_INSTALL_DIR/lib/ollama"`;
  await $`status "Downloading Linux ${ARCH} bundle"`;
  await $`curl --fail --show-error --location --progress-bar \`;
  await $`"https://ollama.com/download/ollama-linux-${ARCH}.tgz${VER_PARAM}" | \`;
  await $`$SUDO tar -xzf - -C "$OLLAMA_INSTALL_DIR"`;
  if ("$OLLAMA_INSTALL_DIR/bin/ollama" != "$BINDIR/ollama" ) { ; then
  await $`status "Making ollama accessible in the PATH in $BINDIR"`;
  await $`$SUDO ln -sf "$OLLAMA_INSTALL_DIR/ollama" "$BINDIR/ollama"`;
  }
  // Check for NVIDIA JetPack systems with additional downloads
  if (-f /etc/nv_tegra_release ) { ; then
  await $`if grep R36 /etc/nv_tegra_release > /dev/null ; then`;
  await $`status "Downloading JetPack 6 components"`;
  await $`curl --fail --show-error --location --progress-bar \`;
  await $`"https://ollama.com/download/ollama-linux-${ARCH}-jetpack6.tgz${VER_PARAM}" | \`;
  await $`$SUDO tar -xzf - -C "$OLLAMA_INSTALL_DIR"`;
  await $`elif grep R35 /etc/nv_tegra_release > /dev/null ; then`;
  await $`status "Downloading JetPack 5 components"`;
  await $`curl --fail --show-error --location --progress-bar \`;
  await $`"https://ollama.com/download/ollama-linux-${ARCH}-jetpack5.tgz${VER_PARAM}" | \`;
  await $`$SUDO tar -xzf - -C "$OLLAMA_INSTALL_DIR"`;
  } else {
  await $`warning "Unsupported JetPack version detected.  GPU may not be supported"`;
  }
  }
  await $`install_success() {`;
  await $`status 'The Ollama API is now available at 127.0.0.1:11434.'`;
  await $`status 'Install complete. Run "ollama" from the command line.'`;
  await $`}`;
  await $`trap install_success EXIT`;
  // Everything from this point onwards is optional.
  await $`configure_systemd() {`;
  await $`if ! id ollama >/dev/null 2>&1; then`;
  await $`status "Creating ollama user..."`;
  await $`$SUDO useradd -r -s /bin/false -U -m -d /usr/share/ollama ollama`;
  }
  await $`if getent group render >/dev/null 2>&1; then`;
  await $`status "Adding ollama user to render group..."`;
  await $`$SUDO usermod -a -G render ollama`;
  }
  await $`if getent group video >/dev/null 2>&1; then`;
  await $`status "Adding ollama user to video group..."`;
  await $`$SUDO usermod -a -G video ollama`;
  }
  await $`status "Adding current user to ollama group..."`;
  await $`$SUDO usermod -a -G ollama $(whoami)`;
  await $`status "Creating ollama systemd service..."`;
  const heredoc = `
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
  `;
  await $`SYSTEMCTL_RUNNING="$(systemctl is-system-running || true)"`;
  await $`case $SYSTEMCTL_RUNNING in`;
  await $`running|degraded)`;
  await $`status "Enabling and starting ollama service..."`;
  await $`$SUDO systemctl daemon-reload`;
  await $`$SUDO systemctl enable ollama`;
  await $`start_service() { $SUDO systemctl restart ollama; }`;
  await $`trap start_service EXIT`;
  await $`;;`;
  await $`*)`;
  await $`warning "systemd is not running"`;
  if ("$IS_WSL2" = true ) {; then
  await $`warning "see https://learn.microsoft.com/en-us/windows/wsl/systemd#how-to-enable-systemd to enable it"`;
  }
  await $`;;`;
  await $`esac`;
  await $`}`;
  await $`if available systemctl; then`;
  await $`configure_systemd`;
  }
  // WSL2 only supports GPUs via nvidia passthrough
  // so check for nvidia-smi to determine if GPU is available
  if ("$IS_WSL2" = true ) {; then
  await $`if available nvidia-smi && [ -n "$(nvidia-smi | grep -o "CUDA Version: [0-9]*\.[0-9]*")" ]; then`;
  await $`status "Nvidia GPU detected."`;
  }
  await $`install_success`;
  process.exit(0);
  }
  // Don't attempt to install drivers on Jetson systems
  if (-f /etc/nv_tegra_release ) { ; then
  await $`status "NVIDIA JetPack ready."`;
  await $`install_success`;
  process.exit(0);
  }
  // Install GPU dependencies on Linux
  await $`if ! available lspci && ! available lshw; then`;
  await $`warning "Unable to detect NVIDIA/AMD GPU. Install lspci or lshw to automatically detect and install GPU dependencies."`;
  process.exit(0);
  }
  await $`check_gpu() {`;
  // Look for devices based on vendor ID for NVIDIA and AMD
  await $`case $1 in`;
  await $`lspci)`;
  await $`case $2 in`;
  await $`nvidia) available lspci && lspci -d '10de:' | grep -q 'NVIDIA' || return 1 ;;`;
  await $`amdgpu) available lspci && lspci -d '1002:' | grep -q 'AMD' || return 1 ;;`;
  await $`esac ;;`;
  await $`lshw)`;
  await $`case $2 in`;
  await $`nvidia) available lshw && $SUDO lshw -c display -numeric -disable network | grep -q 'vendor: .* \[10DE\]' || return 1 ;;`;
  await $`amdgpu) available lshw && $SUDO lshw -c display -numeric -disable network | grep -q 'vendor: .* \[1002\]' || return 1 ;;`;
  await $`esac ;;`;
  await $`nvidia-smi) available nvidia-smi || return 1 ;;`;
  await $`esac`;
  await $`}`;
  await $`if check_gpu nvidia-smi; then`;
  await $`status "NVIDIA GPU installed."`;
  process.exit(0);
  }
  await $`if ! check_gpu lspci nvidia && ! check_gpu lshw nvidia && ! check_gpu lspci amdgpu && ! check_gpu lshw amdgpu; then`;
  await $`install_success`;
  await $`warning "No NVIDIA/AMD GPU detected. Ollama will run in CPU-only mode."`;
  process.exit(0);
  }
  await $`if check_gpu lspci amdgpu || check_gpu lshw amdgpu; then`;
  await $`status "Downloading Linux ROCm ${ARCH} bundle"`;
  await $`curl --fail --show-error --location --progress-bar \`;
  await $`"https://ollama.com/download/ollama-linux-${ARCH}-rocm.tgz${VER_PARAM}" | \`;
  await $`$SUDO tar -xzf - -C "$OLLAMA_INSTALL_DIR"`;
  await $`install_success`;
  await $`status "AMD GPU ready."`;
  process.exit(0);
  }
  await $`CUDA_REPO_ERR_MSG="NVIDIA GPU detected, but your OS and Architecture are not supported by NVIDIA.  Please install the CUDA driver manually https://docs.nvidia.com/cuda/cuda-installation-guide-linux/"`;
  // ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#rhel-7-centos-7
  // ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#rhel-8-rocky-8
  // ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#rhel-9-rocky-9
  // ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#fedora
  await $`install_cuda_driver_yum() {`;
  await $`status 'Installing NVIDIA repository...'`;
  await $`case $PACKAGE_MANAGER in`;
  await $`yum)`;
  await $`$SUDO $PACKAGE_MANAGER -y install yum-utils`;
  await $`if curl -I --silent --fail --location "https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-$1$2.repo" >/dev/null ; then`;
  await $`$SUDO $PACKAGE_MANAGER-config-manager --add-repo https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-$1$2.repo`;
  } else {
  await $`error $CUDA_REPO_ERR_MSG`;
  }
  await $`;;`;
  await $`dnf)`;
  await $`if curl -I --silent --fail --location "https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-$1$2.repo" >/dev/null ; then`;
  await $`$SUDO $PACKAGE_MANAGER config-manager --add-repo https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-$1$2.repo`;
  } else {
  await $`error $CUDA_REPO_ERR_MSG`;
  }
  await $`;;`;
  await $`esac`;
  await $`case $1 in`;
  await $`rhel)`;
  await $`status 'Installing EPEL repository...'`;
  // EPEL is required for third-party dependencies such as dkms and libvdpau
  await $`$SUDO $PACKAGE_MANAGER -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-$2.noarch.rpm || true`;
  await $`;;`;
  await $`esac`;
  await $`status 'Installing CUDA driver...'`;
  if ("$1" = 'centos' ] || [ "$1$2" = 'rhel7' ) {; then
  await $`$SUDO $PACKAGE_MANAGER -y install nvidia-driver-latest-dkms`;
  }
  await $`$SUDO $PACKAGE_MANAGER -y install cuda-drivers`;
  await $`}`;
  // ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#ubuntu
  // ref: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html#debian
  await $`install_cuda_driver_apt() {`;
  await $`status 'Installing NVIDIA repository...'`;
  await $`if curl -I --silent --fail --location "https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-keyring_1.1-1_all.deb" >/dev/null ; then`;
  await $`curl -fsSL -o $TEMP_DIR/cuda-keyring.deb https://developer.download.nvidia.com/compute/cuda/repos/$1$2/$(uname -m | sed -e 's/aarch64/sbsa/')/cuda-keyring_1.1-1_all.deb`;
  } else {
  await $`error $CUDA_REPO_ERR_MSG`;
  }
  await $`case $1 in`;
  await $`debian)`;
  await $`status 'Enabling contrib sources...'`;
  await $`$SUDO sed 's/main/contrib/' < /etc/apt/sources.list | $SUDO tee /etc/apt/sources.list.d/contrib.list > /dev/null`;
  if (-f "/etc/apt/sources.list.d/debian.sources" ) {; then
  await $`$SUDO sed 's/main/contrib/' < /etc/apt/sources.list.d/debian.sources | $SUDO tee /etc/apt/sources.list.d/contrib.sources > /dev/null`;
  }
  await $`;;`;
  await $`esac`;
  await $`status 'Installing CUDA driver...'`;
  await $`$SUDO dpkg -i $TEMP_DIR/cuda-keyring.deb`;
  await $`$SUDO apt-get update`;
  await $`[ -n "$SUDO" ] && SUDO_E="$SUDO -E" || SUDO_E=`;
  await $`DEBIAN_FRONTEND=noninteractive $SUDO_E apt-get -y install cuda-drivers -q`;
  await $`}`;
  if (! -f "/etc/os-release" ) {; then
  await $`error "Unknown distribution. Skipping CUDA installation."`;
  }
  await $`. /etc/os-release`;
  await $`OS_NAME=$ID`;
  await $`OS_VERSION=$VERSION_ID`;
  await $`PACKAGE_MANAGER=`;
  for (const PACKAGE_MANAGER of [dnf yum apt-get; do]) {
  await $`if available $PACKAGE_MANAGER; then`;
  await $`break`;
  }
  }
  if (-z "$PACKAGE_MANAGER" ) {; then
  await $`error "Unknown package manager. Skipping CUDA installation."`;
  }
  await $`if ! check_gpu nvidia-smi || [ -z "$(nvidia-smi | grep -o "CUDA Version: [0-9]*\.[0-9]*")" ]; then`;
  await $`case $OS_NAME in`;
  await $`centos|rhel) install_cuda_driver_yum 'rhel' $(echo $OS_VERSION | cut -d '.' -f 1) ;;`;
  await $`rocky) install_cuda_driver_yum 'rhel' $(echo $OS_VERSION | cut -c1) ;;`;
  await $`fedora) [ $OS_VERSION -lt '39' ] && install_cuda_driver_yum $OS_NAME $OS_VERSION || install_cuda_driver_yum $OS_NAME '39';;`;
  await $`amzn) install_cuda_driver_yum 'fedora' '37' ;;`;
  await $`debian) install_cuda_driver_apt $OS_NAME $OS_VERSION ;;`;
  await $`ubuntu) install_cuda_driver_apt $OS_NAME $(echo $OS_VERSION | sed 's/\.//') ;;`;
  await $`*) exit ;;`;
  await $`esac`;
  }
  await $`if ! lsmod | grep -q nvidia || ! lsmod | grep -q nvidia_uvm; then`;
  await $`KERNEL_RELEASE="$(uname -r)"`;
  await $`case $OS_NAME in`;
  await $`rocky) $SUDO $PACKAGE_MANAGER -y install kernel-devel kernel-headers ;;`;
  await $`centos|rhel|amzn) $SUDO $PACKAGE_MANAGER -y install kernel-devel-$KERNEL_RELEASE kernel-headers-$KERNEL_RELEASE ;;`;
  await $`fedora) $SUDO $PACKAGE_MANAGER -y install kernel-devel-$KERNEL_RELEASE ;;`;
  await $`debian|ubuntu) $SUDO apt-get -y install linux-headers-$KERNEL_RELEASE ;;`;
  await $`*) exit ;;`;
  await $`esac`;
  await $`NVIDIA_CUDA_VERSION=$($SUDO dkms status | awk -F: '/added/ { print $1 }')`;
  if (-n "$NVIDIA_CUDA_VERSION" ) {; then
  await $`$SUDO dkms install $NVIDIA_CUDA_VERSION`;
  }
  await $`if lsmod | grep -q nouveau; then`;
  await $`status 'Reboot to complete NVIDIA CUDA driver install.'`;
  process.exit(0);
  }
  await $`$SUDO modprobe nvidia`;
  await $`$SUDO modprobe nvidia_uvm`;
  }
  // make sure the NVIDIA modules are loaded on boot with nvidia-persistenced
  await $`if available nvidia-persistenced; then`;
  await $`$SUDO touch /etc/modules-load.d/nvidia.conf`;
  await $`MODULES="nvidia nvidia-uvm"`;
  for (const MODULE of [$MODULES; do]) {
  await $`if ! grep -qxF "$MODULE" /etc/modules-load.d/nvidia.conf; then`;
  console.log("$MODULE"); | $SUDO tee -a /etc/modules-load.d/nvidia.conf > /dev/null
  }
  }
  }
  await $`status "NVIDIA GPU ready."`;
  await $`install_success`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}