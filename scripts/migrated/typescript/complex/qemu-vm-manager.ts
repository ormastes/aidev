#!/usr/bin/env bun
/**
 * Migrated from: qemu-vm-manager.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.646Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // QEMU VM Manager - Unified VM management interface
  // Part of AI Development Platform - init_qemu theme
  await $`set -e`;
  // Configuration
  await $`QEMU_HOME="${QEMU_HOME:-$HOME/qemu-dev}"`;
  await $`VMS_DIR="$QEMU_HOME/vms"`;
  await $`IMAGES_DIR="$QEMU_HOME/images"`;
  await $`LOGS_DIR="$QEMU_HOME/logs"`;
  await $`QEMU_BIN="${QEMU_BIN:-qemu-system-x86_64}"`;
  // If custom QEMU-NVMe is built, use it
  if (-x "$QEMU_HOME/qemu-nvme/bin/qemu-system-x86_64" ) {; then
  await $`QEMU_BIN="$QEMU_HOME/qemu-nvme/bin/qemu-system-x86_64"`;
  }
  // Color codes
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`CYAN='\033[0;36m'`;
  await $`NC='\033[0m'`;
  // Functions
  await $`log_info() {`;
  console.log("-e ");${BLUE}[INFO]${NC} $1"
  await $`}`;
  await $`log_success() {`;
  console.log("-e ");${GREEN}[SUCCESS]${NC} $1"
  await $`}`;
  await $`log_warning() {`;
  console.log("-e ");${YELLOW}[WARNING]${NC} $1"
  await $`}`;
  await $`log_error() {`;
  console.log("-e ");${RED}[ERROR]${NC} $1"
  await $`}`;
  // Initialize directories
  await $`init_directories() {`;
  await mkdir(""$VMS_DIR" "$IMAGES_DIR" "$LOGS_DIR"", { recursive: true });
  await $`}`;
  // List VMs
  await $`list_vms() {`;
  console.log("-e ");${CYAN}=== QEMU VMs ===${NC}"
  await $`echo`;
  // Check for VM definition files
  if (-z "$(ls -A $VMS_DIR/*.conf 2>/dev/null)" ) {; then
  await $`log_info "No VMs configured"`;
  await $`return`;
  }
  await $`printf "%-20s %-10s %-15s %-10s %s\n" "NAME" "STATUS" "IP" "SSH_PORT" "VNC"`;
  await $`printf "%-20s %-10s %-15s %-10s %s\n" "----" "------" "--" "--------" "---"`;
  for (const vm_conf of [$VMS_DIR/*.conf; do]) {
  if (-f "$vm_conf" ) {; then
  await $`source "$vm_conf"`;
  await $`vm_name=$(basename "$vm_conf" .conf)`;
  // Check if VM is running
  await $`status="stopped"`;
  if (-f "/tmp/qemu-${vm_name}.pid" ) {; then
  await $`pid=$(cat "/tmp/qemu-${vm_name}.pid")`;
  await $`if ps -p $pid > /dev/null 2>&1; then`;
  await $`status="${GREEN}running${NC}"`;
  }
  }
  // Get VM details
  await $`ip="${VM_IP:-N/A}"`;
  await $`ssh_port="${VM_SSH_PORT:-6665}"`;
  await $`vnc="${VM_VNC_PORT:-5900}"`;
  await $`printf "%-20s %-10b %-15s %-10s %s\n" "$vm_name" "$status" "$ip" "$ssh_port" ":$((vnc - 5900))"`;
  }
  }
  await $`echo`;
  await $`}`;
  // Create VM
  await $`create_vm() {`;
  await $`local vm_name="$1"`;
  await $`local template="${2:-ubuntu}"`;
  if (-z "$vm_name" ) {; then
  await $`log_error "VM name required"`;
  console.log("Usage: $0 create <vm_name> [template]");
  process.exit(1);
  }
  await $`local vm_conf="$VMS_DIR/${vm_name}.conf"`;
  if (-f "$vm_conf" ) {; then
  await $`log_error "VM '$vm_name' already exists"`;
  process.exit(1);
  }
  await $`log_info "Creating VM: $vm_name (template: $template)"`;
  // Create disk image
  await $`local disk_image="$IMAGES_DIR/${vm_name}.qcow2"`;
  await $`local disk_size="50G"`;
  await $`case "$template" in`;
  await $`ubuntu)`;
  await $`disk_size="50G"`;
  await $`;;`;
  await $`fedora)`;
  await $`disk_size="40G"`;
  await $`;;`;
  await $`alpine)`;
  await $`disk_size="10G"`;
  await $`;;`;
  await $`custom)`;
  await $`disk_size="${3:-50G}"`;
  await $`;;`;
  await $`*)`;
  await $`log_warning "Unknown template: $template, using default"`;
  await $`;;`;
  await $`esac`;
  await $`log_info "Creating disk image: $disk_image ($disk_size)"`;
  await $`qemu-img create -f qcow2 "$disk_image" "$disk_size"`;
  // Find available ports
  await $`local ssh_port=$(find_free_port 6665)`;
  await $`local vnc_port=$(find_free_port 5901)`;
  await $`local monitor_port=$(find_free_port 4444)`;
  // Create VM configuration
  await $`cat > "$vm_conf" << EOF`;
  // VM Configuration: $vm_name
  await $`VM_NAME="$vm_name"`;
  await $`VM_TEMPLATE="$template"`;
  await $`VM_DISK="$disk_image"`;
  await $`VM_MEMORY="${VM_MEMORY:-4G}"`;
  await $`VM_CPUS="${VM_CPUS:-2}"`;
  await $`VM_SSH_PORT="$ssh_port"`;
  await $`VM_VNC_PORT="$vnc_port"`;
  await $`VM_MONITOR_PORT="$monitor_port"`;
  await $`VM_NETWORK="${VM_NETWORK:-user}"`;
  await $`VM_CREATED="$(date -Iseconds)"`;
  await $`VM_KERNEL=""`;
  await $`VM_INITRD=""`;
  await $`VM_APPEND=""`;
  await $`VM_CDROM=""`;
  await $`VM_EXTRA_ARGS=""`;
  await $`EOF`;
  await $`log_success "VM '$vm_name' created"`;
  await $`log_info "Configuration saved to: $vm_conf"`;
  await $`log_info "Disk image: $disk_image"`;
  await $`log_info "SSH port: $ssh_port"`;
  await $`log_info "VNC display: :$((vnc_port - 5900))"`;
  await $`}`;
  // Start VM
  await $`start_vm() {`;
  await $`local vm_name="$1"`;
  if (-z "$vm_name" ) {; then
  await $`log_error "VM name required"`;
  console.log("Usage: $0 start <vm_name> [options]");
  process.exit(1);
  }
  await $`local vm_conf="$VMS_DIR/${vm_name}.conf"`;
  if (! -f "$vm_conf" ) {; then
  await $`log_error "VM '$vm_name' not found"`;
  process.exit(1);
  }
  // Check if already running
  if (-f "/tmp/qemu-${vm_name}.pid" ) {; then
  await $`pid=$(cat "/tmp/qemu-${vm_name}.pid")`;
  await $`if ps -p $pid > /dev/null 2>&1; then`;
  await $`log_warning "VM '$vm_name' is already running (PID: $pid)"`;
  await $`return`;
  }
  }
  // Load VM configuration
  await $`source "$vm_conf"`;
  await $`log_info "Starting VM: $vm_name"`;
  // Build QEMU command
  await $`local qemu_cmd="$QEMU_BIN"`;
  await $`local qemu_args=()`;
  // Basic configuration
  await $`qemu_args+=(-name "$VM_NAME")`;
  await $`qemu_args+=(-m "${VM_MEMORY:-4G}")`;
  await $`qemu_args+=(-smp "${VM_CPUS:-2}")`;
  // Enable KVM if available
  if (-e /dev/kvm ) {; then
  await $`qemu_args+=(-enable-kvm)`;
  await $`qemu_args+=(-cpu host)`;
  } else {
  await $`log_warning "KVM not available, using software emulation"`;
  await $`qemu_args+=(-cpu max)`;
  }
  // Disk
  if (-f "$VM_DISK" ) {; then
  await $`qemu_args+=(-drive "file=$VM_DISK,if=virtio,format=qcow2")`;
  } else {
  await $`log_error "Disk image not found: $VM_DISK"`;
  process.exit(1);
  }
  // Network
  await $`case "${VM_NETWORK:-user}" in`;
  await $`user)`;
  await $`qemu_args+=(-netdev "user,id=net0,hostfwd=tcp::${VM_SSH_PORT:-6665}-:22")`;
  await $`;;`;
  await $`bridge)`;
  await $`qemu_args+=(-netdev "bridge,id=net0,br=qemubr0")`;
  await $`;;`;
  await $`none)`;
  await $`;;`;
  await $`*)`;
  await $`qemu_args+=(-netdev "${VM_NETWORK},id=net0")`;
  await $`;;`;
  await $`esac`;
  if ("${VM_NETWORK}" != "none" ) {; then
  await $`qemu_args+=(-device "virtio-net,netdev=net0")`;
  }
  // Custom kernel if specified
  if (-n "$VM_KERNEL" ] && [ -f "$VM_KERNEL" ) {; then
  await $`qemu_args+=(-kernel "$VM_KERNEL")`;
  await $`[ -n "$VM_INITRD" ] && qemu_args+=(-initrd "$VM_INITRD")`;
  await $`[ -n "$VM_APPEND" ] && qemu_args+=(-append "$VM_APPEND")`;
  }
  // CD-ROM if specified
  if (-n "$VM_CDROM" ] && [ -f "$VM_CDROM" ) {; then
  await $`qemu_args+=(-cdrom "$VM_CDROM")`;
  await $`shift  # Check for -boot d option`;
  if ("$2" = "-boot" ] && [ "$3" = "d" ) {; then
  await $`qemu_args+=(-boot d)`;
  await $`shift 2`;
  }
  }
  // VNC
  await $`qemu_args+=(-vnc ":$((${VM_VNC_PORT:-5901} - 5900))")`;
  // Monitor
  await $`qemu_args+=(-monitor "unix:/tmp/qemu-${vm_name}.sock,server,nowait")`;
  // Serial console
  if ("$HEADLESS" = "true" ] || [ "$2" = "--headless" ) {; then
  await $`qemu_args+=(-nographic -serial mon:stdio)`;
  } else {
  await $`qemu_args+=(-serial "file:$LOGS_DIR/${vm_name}.log")`;
  await $`qemu_args+=(-display none)`;
  }
  // PID file
  await $`qemu_args+=(-pidfile "/tmp/qemu-${vm_name}.pid")`;
  // Extra arguments
  if (-n "$VM_EXTRA_ARGS" ) {; then
  await $`qemu_args+=($VM_EXTRA_ARGS)`;
  }
  // Additional command line arguments
  await $`shift  # Remove vm_name`;
  await $`qemu_args+=("$@")`;
  // Start VM
  await $`log_info "Command: $qemu_cmd ${qemu_args[@]}"`;
  if ("$HEADLESS" = "true" ] || [ "$1" = "--headless" ) {; then
  // Run in foreground for console access
  await $`exec $qemu_cmd "${qemu_args[@]}"`;
  } else {
  // Run in background
  await $`nohup $qemu_cmd "${qemu_args[@]}" > "$LOGS_DIR/${vm_name}.out" 2>&1 &`;
  // Wait for PID file
  await Bun.sleep(2 * 1000);
  if (-f "/tmp/qemu-${vm_name}.pid" ) {; then
  await $`pid=$(cat "/tmp/qemu-${vm_name}.pid")`;
  await $`log_success "VM '$vm_name' started (PID: $pid)"`;
  await $`log_info "SSH: ssh -p ${VM_SSH_PORT:-6665} user@localhost"`;
  await $`log_info "VNC: vncviewer localhost:$((${VM_VNC_PORT:-5901} - 5900))"`;
  await $`log_info "Monitor: socat - UNIX-CONNECT:/tmp/qemu-${vm_name}.sock"`;
  } else {
  await $`log_error "Failed to start VM '$vm_name'"`;
  process.exit(1);
  }
  }
  await $`}`;
  // Stop VM
  await $`stop_vm() {`;
  await $`local vm_name="$1"`;
  if (-z "$vm_name" ) {; then
  await $`log_error "VM name required"`;
  console.log("Usage: $0 stop <vm_name>");
  process.exit(1);
  }
  await $`local pid_file="/tmp/qemu-${vm_name}.pid"`;
  if (! -f "$pid_file" ) {; then
  await $`log_warning "VM '$vm_name' is not running"`;
  await $`return`;
  }
  await $`local pid=$(cat "$pid_file")`;
  await $`if ! ps -p $pid > /dev/null 2>&1; then`;
  await $`log_warning "VM '$vm_name' process not found, cleaning up"`;
  await $`rm -f "$pid_file"`;
  await $`return`;
  }
  await $`log_info "Stopping VM: $vm_name (PID: $pid)"`;
  // Try graceful shutdown via monitor
  if (-S "/tmp/qemu-${vm_name}.sock" ) {; then
  console.log("system_powerdown"); | socat - UNIX-CONNECT:/tmp/qemu-${vm_name}.sock 2>/dev/null || true
  // Wait for graceful shutdown
  await $`local count=0`;
  while ([ $count -lt 30 ] && ps -p $pid > /dev/null 2>&1; do) {
  await Bun.sleep(1 * 1000);
  await $`count=$((count + 1))`;
  }
  }
  // Force kill if still running
  await $`if ps -p $pid > /dev/null 2>&1; then`;
  await $`log_warning "Forcing VM shutdown"`;
  await $`kill -9 $pid 2>/dev/null || true`;
  }
  // Cleanup
  await $`rm -f "$pid_file" "/tmp/qemu-${vm_name}.sock"`;
  await $`log_success "VM '$vm_name' stopped"`;
  await $`}`;
  // Delete VM
  await $`delete_vm() {`;
  await $`local vm_name="$1"`;
  if (-z "$vm_name" ) {; then
  await $`log_error "VM name required"`;
  console.log("Usage: $0 delete <vm_name>");
  process.exit(1);
  }
  await $`local vm_conf="$VMS_DIR/${vm_name}.conf"`;
  if (! -f "$vm_conf" ) {; then
  await $`log_error "VM '$vm_name' not found"`;
  process.exit(1);
  }
  // Stop if running
  await $`stop_vm "$vm_name"`;
  // Load configuration to get disk path
  await $`source "$vm_conf"`;
  // Confirm deletion
  console.log("-e ");${YELLOW}Warning: This will delete VM '$vm_name' and its disk image${NC}"
  console.log("-n ");Are you sure? (yes/no): "
  await $`read confirmation`;
  if ("$confirmation" != "yes" ) {; then
  await $`log_info "Deletion cancelled"`;
  await $`return`;
  }
  // Delete files
  await $`rm -f "$vm_conf"`;
  await $`rm -f "$VM_DISK"`;
  await $`rm -f "$LOGS_DIR/${vm_name}."*`;
  await $`log_success "VM '$vm_name' deleted"`;
  await $`}`;
  // Connect to VM
  await $`connect_vm() {`;
  await $`local vm_name="$1"`;
  await $`local method="${2:-ssh}"`;
  if (-z "$vm_name" ) {; then
  await $`log_error "VM name required"`;
  console.log("Usage: $0 connect <vm_name> [ssh|vnc|monitor]");
  process.exit(1);
  }
  await $`local vm_conf="$VMS_DIR/${vm_name}.conf"`;
  if (! -f "$vm_conf" ) {; then
  await $`log_error "VM '$vm_name' not found"`;
  process.exit(1);
  }
  // Check if running
  if (! -f "/tmp/qemu-${vm_name}.pid" ) {; then
  await $`log_error "VM '$vm_name' is not running"`;
  process.exit(1);
  }
  await $`source "$vm_conf"`;
  await $`case "$method" in`;
  await $`ssh)`;
  await $`log_info "Connecting to VM '$vm_name' via SSH (port ${VM_SSH_PORT:-6665})"`;
  await $`ssh -o StrictHostKeyChecking=no \`;
  await $`-o UserKnownHostsFile=/dev/null \`;
  await $`-p ${VM_SSH_PORT:-6665} \`;
  await $`${SSH_USER:-ubuntu}@localhost`;
  await $`;;`;
  await $`vnc)`;
  await $`log_info "Connecting to VM '$vm_name' via VNC (display :$((${VM_VNC_PORT:-5901} - 5900)))"`;
  await $`if command -v vncviewer &> /dev/null; then`;
  await $`vncviewer localhost:$((${VM_VNC_PORT:-5901} - 5900))`;
  } else {
  await $`log_error "vncviewer not found. Install with: sudo apt-get install tigervnc-viewer"`;
  await $`log_info "Manual connection: vncviewer localhost:$((${VM_VNC_PORT:-5901} - 5900))"`;
  }
  await $`;;`;
  await $`monitor)`;
  await $`log_info "Connecting to VM '$vm_name' QEMU monitor"`;
  if (-S "/tmp/qemu-${vm_name}.sock" ) {; then
  console.log("QEMU Monitor (type 'help' for commands, Ctrl-D to exit)");
  await $`socat - UNIX-CONNECT:/tmp/qemu-${vm_name}.sock`;
  } else {
  await $`log_error "Monitor socket not found"`;
  }
  await $`;;`;
  await $`*)`;
  await $`log_error "Unknown connection method: $method"`;
  console.log("Available methods: ssh, vnc, monitor");
  process.exit(1);
  await $`;;`;
  await $`esac`;
  await $`}`;
  // Show VM info
  await $`info_vm() {`;
  await $`local vm_name="$1"`;
  if (-z "$vm_name" ) {; then
  await $`log_error "VM name required"`;
  console.log("Usage: $0 info <vm_name>");
  process.exit(1);
  }
  await $`local vm_conf="$VMS_DIR/${vm_name}.conf"`;
  if (! -f "$vm_conf" ) {; then
  await $`log_error "VM '$vm_name' not found"`;
  process.exit(1);
  }
  await $`source "$vm_conf"`;
  console.log("-e ");${CYAN}=== VM Information: $vm_name ===${NC}"
  await $`echo`;
  console.log("Configuration file: $vm_conf");
  console.log("Template: ${VM_TEMPLATE:-unknown}");
  console.log("Created: ${VM_CREATED:-unknown}");
  await $`echo`;
  console.log("Resources:");
  console.log("  Memory: ${VM_MEMORY:-4G}");
  console.log("  CPUs: ${VM_CPUS:-2}");
  console.log("  Disk: $VM_DISK");
  if (-f "$VM_DISK" ) {; then
  await $`local disk_info=$(qemu-img info "$VM_DISK" | grep "virtual size")`;
  console.log("  Disk size: ${disk_info#*: }");
  }
  await $`echo`;
  console.log("Network:");
  console.log("  Type: ${VM_NETWORK:-user}");
  console.log("  SSH port: ${VM_SSH_PORT:-6665}");
  console.log("  VNC port: ${VM_VNC_PORT:-5901} (display :$((${VM_VNC_PORT:-5901} - 5900)))");
  console.log("  Monitor port: ${VM_MONITOR_PORT:-4444}");
  if (-n "$VM_KERNEL" ) {; then
  await $`echo`;
  console.log("Custom kernel:");
  console.log("  Kernel: $VM_KERNEL");
  console.log("  Initrd: ${VM_INITRD:-none}");
  console.log("  Append: ${VM_APPEND:-none}");
  }
  // Check if running
  await $`echo`;
  if (-f "/tmp/qemu-${vm_name}.pid" ) {; then
  await $`pid=$(cat "/tmp/qemu-${vm_name}.pid")`;
  await $`if ps -p $pid > /dev/null 2>&1; then`;
  console.log("-e ");Status: ${GREEN}Running${NC} (PID: $pid)"
  // Get process info
  await $`local cpu_mem=$(ps -p $pid -o %cpu,%mem --no-headers)`;
  console.log("  CPU usage: $(echo $cpu_mem | awk '{print $1}')%");
  console.log("  Memory usage: $(echo $cpu_mem | awk '{print $2}')%");
  // Uptime
  await $`local start_time=$(ps -p $pid -o lstart= --no-headers)`;
  console.log("  Started: $start_time");
  } else {
  console.log("-e ");Status: ${RED}Stopped${NC} (stale PID file)"
  }
  } else {
  console.log("-e ");Status: ${YELLOW}Stopped${NC}"
  }
  await $`echo`;
  await $`}`;
  // Find free port
  await $`find_free_port() {`;
  await $`local port=$1`;
  while (lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do) {
  await $`port=$((port + 1))`;
  }
  console.log("$port");
  await $`}`;
  // Install OS
  await $`install_os() {`;
  await $`local vm_name="$1"`;
  await $`local iso_path="$2"`;
  if (-z "$vm_name" ] || [ -z "$iso_path" ) {; then
  await $`log_error "VM name and ISO path required"`;
  console.log("Usage: $0 install <vm_name> <iso_path>");
  process.exit(1);
  }
  if (! -f "$iso_path" ) {; then
  await $`log_error "ISO file not found: $iso_path"`;
  process.exit(1);
  }
  await $`local vm_conf="$VMS_DIR/${vm_name}.conf"`;
  if (! -f "$vm_conf" ) {; then
  await $`log_error "VM '$vm_name' not found"`;
  process.exit(1);
  }
  await $`log_info "Installing OS on VM '$vm_name' from $iso_path"`;
  // Update VM configuration with ISO
  await $`sed -i "s|VM_CDROM=.*|VM_CDROM=\"$iso_path\"|" "$vm_conf"`;
  // Start VM with boot from CD
  await $`start_vm "$vm_name" -boot d`;
  await $`}`;
  // Main command handler
  await $`case "${1:-help}" in`;
  await $`list|ls)`;
  await $`list_vms`;
  await $`;;`;
  await $`create)`;
  await $`shift`;
  await $`create_vm "$@"`;
  await $`;;`;
  await $`start)`;
  await $`shift`;
  await $`start_vm "$@"`;
  await $`;;`;
  await $`stop)`;
  await $`shift`;
  await $`stop_vm "$@"`;
  await $`;;`;
  await $`delete|rm)`;
  await $`shift`;
  await $`delete_vm "$@"`;
  await $`;;`;
  await $`connect|ssh)`;
  await $`shift`;
  await $`connect_vm "$@"`;
  await $`;;`;
  await $`info)`;
  await $`shift`;
  await $`info_vm "$@"`;
  await $`;;`;
  await $`install)`;
  await $`shift`;
  await $`install_os "$@"`;
  await $`;;`;
  await $`help|--help|-h)`;
  console.log("QEMU VM Manager");
  await $`echo`;
  console.log("Usage: $0 <command> [options]");
  await $`echo`;
  console.log("Commands:");
  console.log("  list                    List all VMs");
  console.log("  create <name> [template] Create a new VM");
  console.log("  start <name> [options]  Start a VM");
  console.log("  stop <name>            Stop a VM");
  console.log("  delete <name>          Delete a VM and its disk");
  console.log("  connect <name> [method] Connect to a VM (ssh/vnc/monitor)");
  console.log("  info <name>            Show VM information");
  console.log("  install <name> <iso>   Install OS from ISO");
  console.log("  help                   Show this help message");
  await $`echo`;
  console.log("Templates:");
  console.log("  ubuntu    Ubuntu Server (50G disk)");
  console.log("  fedora    Fedora Server (40G disk)");
  console.log("  alpine    Alpine Linux (10G disk)");
  console.log("  custom    Custom configuration");
  await $`echo`;
  console.log("Examples:");
  console.log("  $0 create myvm ubuntu");
  console.log("  $0 start myvm");
  console.log("  $0 connect myvm ssh");
  console.log("  $0 install myvm ubuntu-24.10-live-server-amd64.iso");
  await $`;;`;
  await $`*)`;
  await $`log_error "Unknown command: $1"`;
  console.log("Run '$0 help' for usage information");
  process.exit(1);
  await $`;;`;
  await $`esac`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}