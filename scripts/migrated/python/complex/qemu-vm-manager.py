#!/usr/bin/env python3
"""
Migrated from: qemu-vm-manager.sh
Auto-generated Python - 2025-08-16T04:57:27.648Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # QEMU VM Manager - Unified VM management interface
    # Part of AI Development Platform - init_qemu theme
    subprocess.run("set -e", shell=True)
    # Configuration
    subprocess.run("QEMU_HOME="${QEMU_HOME:-$HOME/qemu-dev}"", shell=True)
    subprocess.run("VMS_DIR="$QEMU_HOME/vms"", shell=True)
    subprocess.run("IMAGES_DIR="$QEMU_HOME/images"", shell=True)
    subprocess.run("LOGS_DIR="$QEMU_HOME/logs"", shell=True)
    subprocess.run("QEMU_BIN="${QEMU_BIN:-qemu-system-x86_64}"", shell=True)
    # If custom QEMU-NVMe is built, use it
    if -x "$QEMU_HOME/qemu-nvme/bin/qemu-system-x86_64" :; then
    subprocess.run("QEMU_BIN="$QEMU_HOME/qemu-nvme/bin/qemu-system-x86_64"", shell=True)
    # Color codes
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("CYAN='\033[0;36m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    # Functions
    subprocess.run("log_info() {", shell=True)
    print("-e ")${BLUE}[INFO]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("log_success() {", shell=True)
    print("-e ")${GREEN}[SUCCESS]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("log_warning() {", shell=True)
    print("-e ")${YELLOW}[WARNING]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("log_error() {", shell=True)
    print("-e ")${RED}[ERROR]${NC} $1"
    subprocess.run("}", shell=True)
    # Initialize directories
    subprocess.run("init_directories() {", shell=True)
    Path(""$VMS_DIR" "$IMAGES_DIR" "$LOGS_DIR"").mkdir(parents=True, exist_ok=True)
    subprocess.run("}", shell=True)
    # List VMs
    subprocess.run("list_vms() {", shell=True)
    print("-e ")${CYAN}=== QEMU VMs ===${NC}"
    subprocess.run("echo", shell=True)
    # Check for VM definition files
    if -z "$(ls -A $VMS_DIR/*.conf 2>/dev/null)" :; then
    subprocess.run("log_info "No VMs configured"", shell=True)
    subprocess.run("return", shell=True)
    subprocess.run("printf "%-20s %-10s %-15s %-10s %s\n" "NAME" "STATUS" "IP" "SSH_PORT" "VNC"", shell=True)
    subprocess.run("printf "%-20s %-10s %-15s %-10s %s\n" "----" "------" "--" "--------" "---"", shell=True)
    for vm_conf in [$VMS_DIR/*.conf; do]:
    if -f "$vm_conf" :; then
    subprocess.run("source "$vm_conf"", shell=True)
    subprocess.run("vm_name=$(basename "$vm_conf" .conf)", shell=True)
    # Check if VM is running
    subprocess.run("status="stopped"", shell=True)
    if -f "/tmp/qemu-${vm_name}.pid" :; then
    subprocess.run("pid=$(cat "/tmp/qemu-${vm_name}.pid")", shell=True)
    subprocess.run("if ps -p $pid > /dev/null 2>&1; then", shell=True)
    subprocess.run("status="${GREEN}running${NC}"", shell=True)
    # Get VM details
    subprocess.run("ip="${VM_IP:-N/A}"", shell=True)
    subprocess.run("ssh_port="${VM_SSH_PORT:-6665}"", shell=True)
    subprocess.run("vnc="${VM_VNC_PORT:-5900}"", shell=True)
    subprocess.run("printf "%-20s %-10b %-15s %-10s %s\n" "$vm_name" "$status" "$ip" "$ssh_port" ":$((vnc - 5900))"", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("}", shell=True)
    # Create VM
    subprocess.run("create_vm() {", shell=True)
    subprocess.run("local vm_name="$1"", shell=True)
    subprocess.run("local template="${2:-ubuntu}"", shell=True)
    if -z "$vm_name" :; then
    subprocess.run("log_error "VM name required"", shell=True)
    print("Usage: $0 create <vm_name> [template]")
    sys.exit(1)
    subprocess.run("local vm_conf="$VMS_DIR/${vm_name}.conf"", shell=True)
    if -f "$vm_conf" :; then
    subprocess.run("log_error "VM '$vm_name' already exists"", shell=True)
    sys.exit(1)
    subprocess.run("log_info "Creating VM: $vm_name (template: $template)"", shell=True)
    # Create disk image
    subprocess.run("local disk_image="$IMAGES_DIR/${vm_name}.qcow2"", shell=True)
    subprocess.run("local disk_size="50G"", shell=True)
    subprocess.run("case "$template" in", shell=True)
    subprocess.run("ubuntu)", shell=True)
    subprocess.run("disk_size="50G"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("fedora)", shell=True)
    subprocess.run("disk_size="40G"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("alpine)", shell=True)
    subprocess.run("disk_size="10G"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("custom)", shell=True)
    subprocess.run("disk_size="${3:-50G}"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("log_warning "Unknown template: $template, using default"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("log_info "Creating disk image: $disk_image ($disk_size)"", shell=True)
    subprocess.run("qemu-img create -f qcow2 "$disk_image" "$disk_size"", shell=True)
    # Find available ports
    subprocess.run("local ssh_port=$(find_free_port 6665)", shell=True)
    subprocess.run("local vnc_port=$(find_free_port 5901)", shell=True)
    subprocess.run("local monitor_port=$(find_free_port 4444)", shell=True)
    # Create VM configuration
    subprocess.run("cat > "$vm_conf" << EOF", shell=True)
    # VM Configuration: $vm_name
    subprocess.run("VM_NAME="$vm_name"", shell=True)
    subprocess.run("VM_TEMPLATE="$template"", shell=True)
    subprocess.run("VM_DISK="$disk_image"", shell=True)
    subprocess.run("VM_MEMORY="${VM_MEMORY:-4G}"", shell=True)
    subprocess.run("VM_CPUS="${VM_CPUS:-2}"", shell=True)
    subprocess.run("VM_SSH_PORT="$ssh_port"", shell=True)
    subprocess.run("VM_VNC_PORT="$vnc_port"", shell=True)
    subprocess.run("VM_MONITOR_PORT="$monitor_port"", shell=True)
    subprocess.run("VM_NETWORK="${VM_NETWORK:-user}"", shell=True)
    subprocess.run("VM_CREATED="$(date -Iseconds)"", shell=True)
    subprocess.run("VM_KERNEL=""", shell=True)
    subprocess.run("VM_INITRD=""", shell=True)
    subprocess.run("VM_APPEND=""", shell=True)
    subprocess.run("VM_CDROM=""", shell=True)
    subprocess.run("VM_EXTRA_ARGS=""", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("log_success "VM '$vm_name' created"", shell=True)
    subprocess.run("log_info "Configuration saved to: $vm_conf"", shell=True)
    subprocess.run("log_info "Disk image: $disk_image"", shell=True)
    subprocess.run("log_info "SSH port: $ssh_port"", shell=True)
    subprocess.run("log_info "VNC display: :$((vnc_port - 5900))"", shell=True)
    subprocess.run("}", shell=True)
    # Start VM
    subprocess.run("start_vm() {", shell=True)
    subprocess.run("local vm_name="$1"", shell=True)
    if -z "$vm_name" :; then
    subprocess.run("log_error "VM name required"", shell=True)
    print("Usage: $0 start <vm_name> [options]")
    sys.exit(1)
    subprocess.run("local vm_conf="$VMS_DIR/${vm_name}.conf"", shell=True)
    if ! -f "$vm_conf" :; then
    subprocess.run("log_error "VM '$vm_name' not found"", shell=True)
    sys.exit(1)
    # Check if already running
    if -f "/tmp/qemu-${vm_name}.pid" :; then
    subprocess.run("pid=$(cat "/tmp/qemu-${vm_name}.pid")", shell=True)
    subprocess.run("if ps -p $pid > /dev/null 2>&1; then", shell=True)
    subprocess.run("log_warning "VM '$vm_name' is already running (PID: $pid)"", shell=True)
    subprocess.run("return", shell=True)
    # Load VM configuration
    subprocess.run("source "$vm_conf"", shell=True)
    subprocess.run("log_info "Starting VM: $vm_name"", shell=True)
    # Build QEMU command
    subprocess.run("local qemu_cmd="$QEMU_BIN"", shell=True)
    subprocess.run("local qemu_args=()", shell=True)
    # Basic configuration
    subprocess.run("qemu_args+=(-name "$VM_NAME")", shell=True)
    subprocess.run("qemu_args+=(-m "${VM_MEMORY:-4G}")", shell=True)
    subprocess.run("qemu_args+=(-smp "${VM_CPUS:-2}")", shell=True)
    # Enable KVM if available
    if -e /dev/kvm :; then
    subprocess.run("qemu_args+=(-enable-kvm)", shell=True)
    subprocess.run("qemu_args+=(-cpu host)", shell=True)
    else:
    subprocess.run("log_warning "KVM not available, using software emulation"", shell=True)
    subprocess.run("qemu_args+=(-cpu max)", shell=True)
    # Disk
    if -f "$VM_DISK" :; then
    subprocess.run("qemu_args+=(-drive "file=$VM_DISK,if=virtio,format=qcow2")", shell=True)
    else:
    subprocess.run("log_error "Disk image not found: $VM_DISK"", shell=True)
    sys.exit(1)
    # Network
    subprocess.run("case "${VM_NETWORK:-user}" in", shell=True)
    subprocess.run("user)", shell=True)
    subprocess.run("qemu_args+=(-netdev "user,id=net0,hostfwd=tcp::${VM_SSH_PORT:-6665}-:22")", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("bridge)", shell=True)
    subprocess.run("qemu_args+=(-netdev "bridge,id=net0,br=qemubr0")", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("none)", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("qemu_args+=(-netdev "${VM_NETWORK},id=net0")", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    if "${VM_NETWORK}" != "none" :; then
    subprocess.run("qemu_args+=(-device "virtio-net,netdev=net0")", shell=True)
    # Custom kernel if specified
    if -n "$VM_KERNEL" ] && [ -f "$VM_KERNEL" :; then
    subprocess.run("qemu_args+=(-kernel "$VM_KERNEL")", shell=True)
    subprocess.run("[ -n "$VM_INITRD" ] && qemu_args+=(-initrd "$VM_INITRD")", shell=True)
    subprocess.run("[ -n "$VM_APPEND" ] && qemu_args+=(-append "$VM_APPEND")", shell=True)
    # CD-ROM if specified
    if -n "$VM_CDROM" ] && [ -f "$VM_CDROM" :; then
    subprocess.run("qemu_args+=(-cdrom "$VM_CDROM")", shell=True)
    subprocess.run("shift  # Check for -boot d option", shell=True)
    if "$2" = "-boot" ] && [ "$3" = "d" :; then
    subprocess.run("qemu_args+=(-boot d)", shell=True)
    subprocess.run("shift 2", shell=True)
    # VNC
    subprocess.run("qemu_args+=(-vnc ":$((${VM_VNC_PORT:-5901} - 5900))")", shell=True)
    # Monitor
    subprocess.run("qemu_args+=(-monitor "unix:/tmp/qemu-${vm_name}.sock,server,nowait")", shell=True)
    # Serial console
    if "$HEADLESS" = "true" ] || [ "$2" = "--headless" :; then
    subprocess.run("qemu_args+=(-nographic -serial mon:stdio)", shell=True)
    else:
    subprocess.run("qemu_args+=(-serial "file:$LOGS_DIR/${vm_name}.log")", shell=True)
    subprocess.run("qemu_args+=(-display none)", shell=True)
    # PID file
    subprocess.run("qemu_args+=(-pidfile "/tmp/qemu-${vm_name}.pid")", shell=True)
    # Extra arguments
    if -n "$VM_EXTRA_ARGS" :; then
    subprocess.run("qemu_args+=($VM_EXTRA_ARGS)", shell=True)
    # Additional command line arguments
    subprocess.run("shift  # Remove vm_name", shell=True)
    subprocess.run("qemu_args+=("$@")", shell=True)
    # Start VM
    subprocess.run("log_info "Command: $qemu_cmd ${qemu_args[@]}"", shell=True)
    if "$HEADLESS" = "true" ] || [ "$1" = "--headless" :; then
    # Run in foreground for console access
    subprocess.run("exec $qemu_cmd "${qemu_args[@]}"", shell=True)
    else:
    # Run in background
    subprocess.run("nohup $qemu_cmd "${qemu_args[@]}" > "$LOGS_DIR/${vm_name}.out" 2>&1 &", shell=True)
    # Wait for PID file
    time.sleep(2)
    if -f "/tmp/qemu-${vm_name}.pid" :; then
    subprocess.run("pid=$(cat "/tmp/qemu-${vm_name}.pid")", shell=True)
    subprocess.run("log_success "VM '$vm_name' started (PID: $pid)"", shell=True)
    subprocess.run("log_info "SSH: ssh -p ${VM_SSH_PORT:-6665} user@localhost"", shell=True)
    subprocess.run("log_info "VNC: vncviewer localhost:$((${VM_VNC_PORT:-5901} - 5900))"", shell=True)
    subprocess.run("log_info "Monitor: socat - UNIX-CONNECT:/tmp/qemu-${vm_name}.sock"", shell=True)
    else:
    subprocess.run("log_error "Failed to start VM '$vm_name'"", shell=True)
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Stop VM
    subprocess.run("stop_vm() {", shell=True)
    subprocess.run("local vm_name="$1"", shell=True)
    if -z "$vm_name" :; then
    subprocess.run("log_error "VM name required"", shell=True)
    print("Usage: $0 stop <vm_name>")
    sys.exit(1)
    subprocess.run("local pid_file="/tmp/qemu-${vm_name}.pid"", shell=True)
    if ! -f "$pid_file" :; then
    subprocess.run("log_warning "VM '$vm_name' is not running"", shell=True)
    subprocess.run("return", shell=True)
    subprocess.run("local pid=$(cat "$pid_file")", shell=True)
    subprocess.run("if ! ps -p $pid > /dev/null 2>&1; then", shell=True)
    subprocess.run("log_warning "VM '$vm_name' process not found, cleaning up"", shell=True)
    subprocess.run("rm -f "$pid_file"", shell=True)
    subprocess.run("return", shell=True)
    subprocess.run("log_info "Stopping VM: $vm_name (PID: $pid)"", shell=True)
    # Try graceful shutdown via monitor
    if -S "/tmp/qemu-${vm_name}.sock" :; then
    print("system_powerdown") | socat - UNIX-CONNECT:/tmp/qemu-${vm_name}.sock 2>/dev/null || true
    # Wait for graceful shutdown
    subprocess.run("local count=0", shell=True)
    while [ $count -lt 30 ] && ps -p $pid > /dev/null 2>&1; do:
    time.sleep(1)
    subprocess.run("count=$((count + 1))", shell=True)
    # Force kill if still running
    subprocess.run("if ps -p $pid > /dev/null 2>&1; then", shell=True)
    subprocess.run("log_warning "Forcing VM shutdown"", shell=True)
    subprocess.run("kill -9 $pid 2>/dev/null || true", shell=True)
    # Cleanup
    subprocess.run("rm -f "$pid_file" "/tmp/qemu-${vm_name}.sock"", shell=True)
    subprocess.run("log_success "VM '$vm_name' stopped"", shell=True)
    subprocess.run("}", shell=True)
    # Delete VM
    subprocess.run("delete_vm() {", shell=True)
    subprocess.run("local vm_name="$1"", shell=True)
    if -z "$vm_name" :; then
    subprocess.run("log_error "VM name required"", shell=True)
    print("Usage: $0 delete <vm_name>")
    sys.exit(1)
    subprocess.run("local vm_conf="$VMS_DIR/${vm_name}.conf"", shell=True)
    if ! -f "$vm_conf" :; then
    subprocess.run("log_error "VM '$vm_name' not found"", shell=True)
    sys.exit(1)
    # Stop if running
    subprocess.run("stop_vm "$vm_name"", shell=True)
    # Load configuration to get disk path
    subprocess.run("source "$vm_conf"", shell=True)
    # Confirm deletion
    print("-e ")${YELLOW}Warning: This will delete VM '$vm_name' and its disk image${NC}"
    print("-n ")Are you sure? (yes/no): "
    subprocess.run("read confirmation", shell=True)
    if "$confirmation" != "yes" :; then
    subprocess.run("log_info "Deletion cancelled"", shell=True)
    subprocess.run("return", shell=True)
    # Delete files
    subprocess.run("rm -f "$vm_conf"", shell=True)
    subprocess.run("rm -f "$VM_DISK"", shell=True)
    subprocess.run("rm -f "$LOGS_DIR/${vm_name}."*", shell=True)
    subprocess.run("log_success "VM '$vm_name' deleted"", shell=True)
    subprocess.run("}", shell=True)
    # Connect to VM
    subprocess.run("connect_vm() {", shell=True)
    subprocess.run("local vm_name="$1"", shell=True)
    subprocess.run("local method="${2:-ssh}"", shell=True)
    if -z "$vm_name" :; then
    subprocess.run("log_error "VM name required"", shell=True)
    print("Usage: $0 connect <vm_name> [ssh|vnc|monitor]")
    sys.exit(1)
    subprocess.run("local vm_conf="$VMS_DIR/${vm_name}.conf"", shell=True)
    if ! -f "$vm_conf" :; then
    subprocess.run("log_error "VM '$vm_name' not found"", shell=True)
    sys.exit(1)
    # Check if running
    if ! -f "/tmp/qemu-${vm_name}.pid" :; then
    subprocess.run("log_error "VM '$vm_name' is not running"", shell=True)
    sys.exit(1)
    subprocess.run("source "$vm_conf"", shell=True)
    subprocess.run("case "$method" in", shell=True)
    subprocess.run("ssh)", shell=True)
    subprocess.run("log_info "Connecting to VM '$vm_name' via SSH (port ${VM_SSH_PORT:-6665})"", shell=True)
    subprocess.run("ssh -o StrictHostKeyChecking=no \", shell=True)
    subprocess.run("-o UserKnownHostsFile=/dev/null \", shell=True)
    subprocess.run("-p ${VM_SSH_PORT:-6665} \", shell=True)
    subprocess.run("${SSH_USER:-ubuntu}@localhost", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("vnc)", shell=True)
    subprocess.run("log_info "Connecting to VM '$vm_name' via VNC (display :$((${VM_VNC_PORT:-5901} - 5900)))"", shell=True)
    subprocess.run("if command -v vncviewer &> /dev/null; then", shell=True)
    subprocess.run("vncviewer localhost:$((${VM_VNC_PORT:-5901} - 5900))", shell=True)
    else:
    subprocess.run("log_error "vncviewer not found. Install with: sudo apt-get install tigervnc-viewer"", shell=True)
    subprocess.run("log_info "Manual connection: vncviewer localhost:$((${VM_VNC_PORT:-5901} - 5900))"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("monitor)", shell=True)
    subprocess.run("log_info "Connecting to VM '$vm_name' QEMU monitor"", shell=True)
    if -S "/tmp/qemu-${vm_name}.sock" :; then
    print("QEMU Monitor (type 'help' for commands, Ctrl-D to exit)")
    subprocess.run("socat - UNIX-CONNECT:/tmp/qemu-${vm_name}.sock", shell=True)
    else:
    subprocess.run("log_error "Monitor socket not found"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("log_error "Unknown connection method: $method"", shell=True)
    print("Available methods: ssh, vnc, monitor")
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("}", shell=True)
    # Show VM info
    subprocess.run("info_vm() {", shell=True)
    subprocess.run("local vm_name="$1"", shell=True)
    if -z "$vm_name" :; then
    subprocess.run("log_error "VM name required"", shell=True)
    print("Usage: $0 info <vm_name>")
    sys.exit(1)
    subprocess.run("local vm_conf="$VMS_DIR/${vm_name}.conf"", shell=True)
    if ! -f "$vm_conf" :; then
    subprocess.run("log_error "VM '$vm_name' not found"", shell=True)
    sys.exit(1)
    subprocess.run("source "$vm_conf"", shell=True)
    print("-e ")${CYAN}=== VM Information: $vm_name ===${NC}"
    subprocess.run("echo", shell=True)
    print("Configuration file: $vm_conf")
    print("Template: ${VM_TEMPLATE:-unknown}")
    print("Created: ${VM_CREATED:-unknown}")
    subprocess.run("echo", shell=True)
    print("Resources:")
    print("  Memory: ${VM_MEMORY:-4G}")
    print("  CPUs: ${VM_CPUS:-2}")
    print("  Disk: $VM_DISK")
    if -f "$VM_DISK" :; then
    subprocess.run("local disk_info=$(qemu-img info "$VM_DISK" | grep "virtual size")", shell=True)
    print("  Disk size: ${disk_info#*: }")
    subprocess.run("echo", shell=True)
    print("Network:")
    print("  Type: ${VM_NETWORK:-user}")
    print("  SSH port: ${VM_SSH_PORT:-6665}")
    print("  VNC port: ${VM_VNC_PORT:-5901} (display :$((${VM_VNC_PORT:-5901} - 5900)))")
    print("  Monitor port: ${VM_MONITOR_PORT:-4444}")
    if -n "$VM_KERNEL" :; then
    subprocess.run("echo", shell=True)
    print("Custom kernel:")
    print("  Kernel: $VM_KERNEL")
    print("  Initrd: ${VM_INITRD:-none}")
    print("  Append: ${VM_APPEND:-none}")
    # Check if running
    subprocess.run("echo", shell=True)
    if -f "/tmp/qemu-${vm_name}.pid" :; then
    subprocess.run("pid=$(cat "/tmp/qemu-${vm_name}.pid")", shell=True)
    subprocess.run("if ps -p $pid > /dev/null 2>&1; then", shell=True)
    print("-e ")Status: ${GREEN}Running${NC} (PID: $pid)"
    # Get process info
    subprocess.run("local cpu_mem=$(ps -p $pid -o %cpu,%mem --no-headers)", shell=True)
    print("  CPU usage: $(echo $cpu_mem | awk '{print $1}')%")
    print("  Memory usage: $(echo $cpu_mem | awk '{print $2}')%")
    # Uptime
    subprocess.run("local start_time=$(ps -p $pid -o lstart= --no-headers)", shell=True)
    print("  Started: $start_time")
    else:
    print("-e ")Status: ${RED}Stopped${NC} (stale PID file)"
    else:
    print("-e ")Status: ${YELLOW}Stopped${NC}"
    subprocess.run("echo", shell=True)
    subprocess.run("}", shell=True)
    # Find free port
    subprocess.run("find_free_port() {", shell=True)
    subprocess.run("local port=$1", shell=True)
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do:
    subprocess.run("port=$((port + 1))", shell=True)
    print("$port")
    subprocess.run("}", shell=True)
    # Install OS
    subprocess.run("install_os() {", shell=True)
    subprocess.run("local vm_name="$1"", shell=True)
    subprocess.run("local iso_path="$2"", shell=True)
    if -z "$vm_name" ] || [ -z "$iso_path" :; then
    subprocess.run("log_error "VM name and ISO path required"", shell=True)
    print("Usage: $0 install <vm_name> <iso_path>")
    sys.exit(1)
    if ! -f "$iso_path" :; then
    subprocess.run("log_error "ISO file not found: $iso_path"", shell=True)
    sys.exit(1)
    subprocess.run("local vm_conf="$VMS_DIR/${vm_name}.conf"", shell=True)
    if ! -f "$vm_conf" :; then
    subprocess.run("log_error "VM '$vm_name' not found"", shell=True)
    sys.exit(1)
    subprocess.run("log_info "Installing OS on VM '$vm_name' from $iso_path"", shell=True)
    # Update VM configuration with ISO
    subprocess.run("sed -i "s|VM_CDROM=.*|VM_CDROM=\"$iso_path\"|" "$vm_conf"", shell=True)
    # Start VM with boot from CD
    subprocess.run("start_vm "$vm_name" -boot d", shell=True)
    subprocess.run("}", shell=True)
    # Main command handler
    subprocess.run("case "${1:-help}" in", shell=True)
    subprocess.run("list|ls)", shell=True)
    subprocess.run("list_vms", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("create)", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run("create_vm "$@"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("start)", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run("start_vm "$@"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("stop)", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run("stop_vm "$@"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("delete|rm)", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run("delete_vm "$@"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("connect|ssh)", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run("connect_vm "$@"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("info)", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run("info_vm "$@"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("install)", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run("install_os "$@"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("help|--help|-h)", shell=True)
    print("QEMU VM Manager")
    subprocess.run("echo", shell=True)
    print("Usage: $0 <command> [options]")
    subprocess.run("echo", shell=True)
    print("Commands:")
    print("  list                    List all VMs")
    print("  create <name> [template] Create a new VM")
    print("  start <name> [options]  Start a VM")
    print("  stop <name>            Stop a VM")
    print("  delete <name>          Delete a VM and its disk")
    print("  connect <name> [method] Connect to a VM (ssh/vnc/monitor)")
    print("  info <name>            Show VM information")
    print("  install <name> <iso>   Install OS from ISO")
    print("  help                   Show this help message")
    subprocess.run("echo", shell=True)
    print("Templates:")
    print("  ubuntu    Ubuntu Server (50G disk)")
    print("  fedora    Fedora Server (40G disk)")
    print("  alpine    Alpine Linux (10G disk)")
    print("  custom    Custom configuration")
    subprocess.run("echo", shell=True)
    print("Examples:")
    print("  $0 create myvm ubuntu")
    print("  $0 start myvm")
    print("  $0 connect myvm ssh")
    print("  $0 install myvm ubuntu-24.10-live-server-amd64.iso")
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("log_error "Unknown command: $1"", shell=True)
    print("Run '$0 help' for usage information")
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)

if __name__ == "__main__":
    main()