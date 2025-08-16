#!/bin/bash
# QEMU VM Manager - Unified VM management interface
# Part of AI Development Platform - init_qemu theme

set -e

# Configuration
QEMU_HOME="${QEMU_HOME:-$HOME/qemu-dev}"
VMS_DIR="$QEMU_HOME/vms"
IMAGES_DIR="$QEMU_HOME/images"
LOGS_DIR="$QEMU_HOME/logs"
QEMU_BIN="${QEMU_BIN:-qemu-system-x86_64}"

# If custom QEMU-NVMe is built, use it
if [ -x "$QEMU_HOME/qemu-nvme/bin/qemu-system-x86_64" ]; then
    QEMU_BIN="$QEMU_HOME/qemu-nvme/bin/qemu-system-x86_64"
fi

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Initialize directories
init_directories() {
    mkdir -p "$VMS_DIR" "$IMAGES_DIR" "$LOGS_DIR"
}

# List VMs
list_vms() {
    echo -e "${CYAN}=== QEMU VMs ===${NC}"
    echo
    
    # Check for VM definition files
    if [ -z "$(ls -A $VMS_DIR/*.conf 2>/dev/null)" ]; then
        log_info "No VMs configured"
        return
    fi
    
    printf "%-20s %-10s %-15s %-10s %s\n" "NAME" "STATUS" "IP" "SSH_PORT" "VNC"
    printf "%-20s %-10s %-15s %-10s %s\n" "----" "------" "--" "--------" "---"
    
    for vm_conf in $VMS_DIR/*.conf; do
        if [ -f "$vm_conf" ]; then
            source "$vm_conf"
            vm_name=$(basename "$vm_conf" .conf)
            
            # Check if VM is running
            status="stopped"
            if [ -f "/tmp/qemu-${vm_name}.pid" ]; then
                pid=$(cat "/tmp/qemu-${vm_name}.pid")
                if ps -p $pid > /dev/null 2>&1; then
                    status="${GREEN}running${NC}"
                fi
            fi
            
            # Get VM details
            ip="${VM_IP:-N/A}"
            ssh_port="${VM_SSH_PORT:-6665}"
            vnc="${VM_VNC_PORT:-5900}"
            
            printf "%-20s %-10b %-15s %-10s %s\n" "$vm_name" "$status" "$ip" "$ssh_port" ":$((vnc - 5900))"
        fi
    done
    echo
}

# Create VM
create_vm() {
    local vm_name="$1"
    local template="${2:-ubuntu}"
    
    if [ -z "$vm_name" ]; then
        log_error "VM name required"
        echo "Usage: $0 create <vm_name> [template]"
        exit 1
    fi
    
    local vm_conf="$VMS_DIR/${vm_name}.conf"
    
    if [ -f "$vm_conf" ]; then
        log_error "VM '$vm_name' already exists"
        exit 1
    fi
    
    log_info "Creating VM: $vm_name (template: $template)"
    
    # Create disk image
    local disk_image="$IMAGES_DIR/${vm_name}.qcow2"
    local disk_size="50G"
    
    case "$template" in
        ubuntu)
            disk_size="50G"
            ;;
        fedora)
            disk_size="40G"
            ;;
        alpine)
            disk_size="10G"
            ;;
        custom)
            disk_size="${3:-50G}"
            ;;
        *)
            log_warning "Unknown template: $template, using default"
            ;;
    esac
    
    log_info "Creating disk image: $disk_image ($disk_size)"
    qemu-img create -f qcow2 "$disk_image" "$disk_size"
    
    # Find available ports
    local ssh_port=$(find_free_port 6665)
    local vnc_port=$(find_free_port 5901)
    local monitor_port=$(find_free_port 4444)
    
    # Create VM configuration
    cat > "$vm_conf" << EOF
# VM Configuration: $vm_name
VM_NAME="$vm_name"
VM_TEMPLATE="$template"
VM_DISK="$disk_image"
VM_MEMORY="${VM_MEMORY:-4G}"
VM_CPUS="${VM_CPUS:-2}"
VM_SSH_PORT="$ssh_port"
VM_VNC_PORT="$vnc_port"
VM_MONITOR_PORT="$monitor_port"
VM_NETWORK="${VM_NETWORK:-user}"
VM_CREATED="$(date -Iseconds)"
VM_KERNEL=""
VM_INITRD=""
VM_APPEND=""
VM_CDROM=""
VM_EXTRA_ARGS=""
EOF
    
    log_success "VM '$vm_name' created"
    log_info "Configuration saved to: $vm_conf"
    log_info "Disk image: $disk_image"
    log_info "SSH port: $ssh_port"
    log_info "VNC display: :$((vnc_port - 5900))"
}

# Start VM
start_vm() {
    local vm_name="$1"
    
    if [ -z "$vm_name" ]; then
        log_error "VM name required"
        echo "Usage: $0 start <vm_name> [options]"
        exit 1
    fi
    
    local vm_conf="$VMS_DIR/${vm_name}.conf"
    
    if [ ! -f "$vm_conf" ]; then
        log_error "VM '$vm_name' not found"
        exit 1
    fi
    
    # Check if already running
    if [ -f "/tmp/qemu-${vm_name}.pid" ]; then
        pid=$(cat "/tmp/qemu-${vm_name}.pid")
        if ps -p $pid > /dev/null 2>&1; then
            log_warning "VM '$vm_name' is already running (PID: $pid)"
            return
        fi
    fi
    
    # Load VM configuration
    source "$vm_conf"
    
    log_info "Starting VM: $vm_name"
    
    # Build QEMU command
    local qemu_cmd="$QEMU_BIN"
    local qemu_args=()
    
    # Basic configuration
    qemu_args+=(-name "$VM_NAME")
    qemu_args+=(-m "${VM_MEMORY:-4G}")
    qemu_args+=(-smp "${VM_CPUS:-2}")
    
    # Enable KVM if available
    if [ -e /dev/kvm ]; then
        qemu_args+=(-enable-kvm)
        qemu_args+=(-cpu host)
    else
        log_warning "KVM not available, using software emulation"
        qemu_args+=(-cpu max)
    fi
    
    # Disk
    if [ -f "$VM_DISK" ]; then
        qemu_args+=(-drive "file=$VM_DISK,if=virtio,format=qcow2")
    else
        log_error "Disk image not found: $VM_DISK"
        exit 1
    fi
    
    # Network
    case "${VM_NETWORK:-user}" in
        user)
            qemu_args+=(-netdev "user,id=net0,hostfwd=tcp::${VM_SSH_PORT:-6665}-:22")
            ;;
        bridge)
            qemu_args+=(-netdev "bridge,id=net0,br=qemubr0")
            ;;
        none)
            ;;
        *)
            qemu_args+=(-netdev "${VM_NETWORK},id=net0")
            ;;
    esac
    
    if [ "${VM_NETWORK}" != "none" ]; then
        qemu_args+=(-device "virtio-net,netdev=net0")
    fi
    
    # Custom kernel if specified
    if [ -n "$VM_KERNEL" ] && [ -f "$VM_KERNEL" ]; then
        qemu_args+=(-kernel "$VM_KERNEL")
        [ -n "$VM_INITRD" ] && qemu_args+=(-initrd "$VM_INITRD")
        [ -n "$VM_APPEND" ] && qemu_args+=(-append "$VM_APPEND")
    fi
    
    # CD-ROM if specified
    if [ -n "$VM_CDROM" ] && [ -f "$VM_CDROM" ]; then
        qemu_args+=(-cdrom "$VM_CDROM")
        shift  # Check for -boot d option
        if [ "$2" = "-boot" ] && [ "$3" = "d" ]; then
            qemu_args+=(-boot d)
            shift 2
        fi
    fi
    
    # VNC
    qemu_args+=(-vnc ":$((${VM_VNC_PORT:-5901} - 5900))")
    
    # Monitor
    qemu_args+=(-monitor "unix:/tmp/qemu-${vm_name}.sock,server,nowait")
    
    # Serial console
    if [ "$HEADLESS" = "true" ] || [ "$2" = "--headless" ]; then
        qemu_args+=(-nographic -serial mon:stdio)
    else
        qemu_args+=(-serial "file:$LOGS_DIR/${vm_name}.log")
        qemu_args+=(-display none)
    fi
    
    # PID file
    qemu_args+=(-pidfile "/tmp/qemu-${vm_name}.pid")
    
    # Extra arguments
    if [ -n "$VM_EXTRA_ARGS" ]; then
        qemu_args+=($VM_EXTRA_ARGS)
    fi
    
    # Additional command line arguments
    shift  # Remove vm_name
    qemu_args+=("$@")
    
    # Start VM
    log_info "Command: $qemu_cmd ${qemu_args[@]}"
    
    if [ "$HEADLESS" = "true" ] || [ "$1" = "--headless" ]; then
        # Run in foreground for console access
        exec $qemu_cmd "${qemu_args[@]}"
    else
        # Run in background
        nohup $qemu_cmd "${qemu_args[@]}" > "$LOGS_DIR/${vm_name}.out" 2>&1 &
        
        # Wait for PID file
        sleep 2
        
        if [ -f "/tmp/qemu-${vm_name}.pid" ]; then
            pid=$(cat "/tmp/qemu-${vm_name}.pid")
            log_success "VM '$vm_name' started (PID: $pid)"
            log_info "SSH: ssh -p ${VM_SSH_PORT:-6665} user@localhost"
            log_info "VNC: vncviewer localhost:$((${VM_VNC_PORT:-5901} - 5900))"
            log_info "Monitor: socat - UNIX-CONNECT:/tmp/qemu-${vm_name}.sock"
        else
            log_error "Failed to start VM '$vm_name'"
            exit 1
        fi
    fi
}

# Stop VM
stop_vm() {
    local vm_name="$1"
    
    if [ -z "$vm_name" ]; then
        log_error "VM name required"
        echo "Usage: $0 stop <vm_name>"
        exit 1
    fi
    
    local pid_file="/tmp/qemu-${vm_name}.pid"
    
    if [ ! -f "$pid_file" ]; then
        log_warning "VM '$vm_name' is not running"
        return
    fi
    
    local pid=$(cat "$pid_file")
    
    if ! ps -p $pid > /dev/null 2>&1; then
        log_warning "VM '$vm_name' process not found, cleaning up"
        rm -f "$pid_file"
        return
    fi
    
    log_info "Stopping VM: $vm_name (PID: $pid)"
    
    # Try graceful shutdown via monitor
    if [ -S "/tmp/qemu-${vm_name}.sock" ]; then
        echo "system_powerdown" | socat - UNIX-CONNECT:/tmp/qemu-${vm_name}.sock 2>/dev/null || true
        
        # Wait for graceful shutdown
        local count=0
        while [ $count -lt 30 ] && ps -p $pid > /dev/null 2>&1; do
            sleep 1
            count=$((count + 1))
        done
    fi
    
    # Force kill if still running
    if ps -p $pid > /dev/null 2>&1; then
        log_warning "Forcing VM shutdown"
        kill -9 $pid 2>/dev/null || true
    fi
    
    # Cleanup
    rm -f "$pid_file" "/tmp/qemu-${vm_name}.sock"
    
    log_success "VM '$vm_name' stopped"
}

# Delete VM
delete_vm() {
    local vm_name="$1"
    
    if [ -z "$vm_name" ]; then
        log_error "VM name required"
        echo "Usage: $0 delete <vm_name>"
        exit 1
    fi
    
    local vm_conf="$VMS_DIR/${vm_name}.conf"
    
    if [ ! -f "$vm_conf" ]; then
        log_error "VM '$vm_name' not found"
        exit 1
    fi
    
    # Stop if running
    stop_vm "$vm_name"
    
    # Load configuration to get disk path
    source "$vm_conf"
    
    # Confirm deletion
    echo -e "${YELLOW}Warning: This will delete VM '$vm_name' and its disk image${NC}"
    echo -n "Are you sure? (yes/no): "
    read confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_info "Deletion cancelled"
        return
    fi
    
    # Delete files
    rm -f "$vm_conf"
    rm -f "$VM_DISK"
    rm -f "$LOGS_DIR/${vm_name}."*
    
    log_success "VM '$vm_name' deleted"
}

# Connect to VM
connect_vm() {
    local vm_name="$1"
    local method="${2:-ssh}"
    
    if [ -z "$vm_name" ]; then
        log_error "VM name required"
        echo "Usage: $0 connect <vm_name> [ssh|vnc|monitor]"
        exit 1
    fi
    
    local vm_conf="$VMS_DIR/${vm_name}.conf"
    
    if [ ! -f "$vm_conf" ]; then
        log_error "VM '$vm_name' not found"
        exit 1
    fi
    
    # Check if running
    if [ ! -f "/tmp/qemu-${vm_name}.pid" ]; then
        log_error "VM '$vm_name' is not running"
        exit 1
    fi
    
    source "$vm_conf"
    
    case "$method" in
        ssh)
            log_info "Connecting to VM '$vm_name' via SSH (port ${VM_SSH_PORT:-6665})"
            ssh -o StrictHostKeyChecking=no \
                -o UserKnownHostsFile=/dev/null \
                -p ${VM_SSH_PORT:-6665} \
                ${SSH_USER:-ubuntu}@localhost
            ;;
        vnc)
            log_info "Connecting to VM '$vm_name' via VNC (display :$((${VM_VNC_PORT:-5901} - 5900)))"
            if command -v vncviewer &> /dev/null; then
                vncviewer localhost:$((${VM_VNC_PORT:-5901} - 5900))
            else
                log_error "vncviewer not found. Install with: sudo apt-get install tigervnc-viewer"
                log_info "Manual connection: vncviewer localhost:$((${VM_VNC_PORT:-5901} - 5900))"
            fi
            ;;
        monitor)
            log_info "Connecting to VM '$vm_name' QEMU monitor"
            if [ -S "/tmp/qemu-${vm_name}.sock" ]; then
                echo "QEMU Monitor (type 'help' for commands, Ctrl-D to exit)"
                socat - UNIX-CONNECT:/tmp/qemu-${vm_name}.sock
            else
                log_error "Monitor socket not found"
            fi
            ;;
        *)
            log_error "Unknown connection method: $method"
            echo "Available methods: ssh, vnc, monitor"
            exit 1
            ;;
    esac
}

# Show VM info
info_vm() {
    local vm_name="$1"
    
    if [ -z "$vm_name" ]; then
        log_error "VM name required"
        echo "Usage: $0 info <vm_name>"
        exit 1
    fi
    
    local vm_conf="$VMS_DIR/${vm_name}.conf"
    
    if [ ! -f "$vm_conf" ]; then
        log_error "VM '$vm_name' not found"
        exit 1
    fi
    
    source "$vm_conf"
    
    echo -e "${CYAN}=== VM Information: $vm_name ===${NC}"
    echo
    echo "Configuration file: $vm_conf"
    echo "Template: ${VM_TEMPLATE:-unknown}"
    echo "Created: ${VM_CREATED:-unknown}"
    echo
    echo "Resources:"
    echo "  Memory: ${VM_MEMORY:-4G}"
    echo "  CPUs: ${VM_CPUS:-2}"
    echo "  Disk: $VM_DISK"
    
    if [ -f "$VM_DISK" ]; then
        local disk_info=$(qemu-img info "$VM_DISK" | grep "virtual size")
        echo "  Disk size: ${disk_info#*: }"
    fi
    
    echo
    echo "Network:"
    echo "  Type: ${VM_NETWORK:-user}"
    echo "  SSH port: ${VM_SSH_PORT:-6665}"
    echo "  VNC port: ${VM_VNC_PORT:-5901} (display :$((${VM_VNC_PORT:-5901} - 5900)))"
    echo "  Monitor port: ${VM_MONITOR_PORT:-4444}"
    
    if [ -n "$VM_KERNEL" ]; then
        echo
        echo "Custom kernel:"
        echo "  Kernel: $VM_KERNEL"
        echo "  Initrd: ${VM_INITRD:-none}"
        echo "  Append: ${VM_APPEND:-none}"
    fi
    
    # Check if running
    echo
    if [ -f "/tmp/qemu-${vm_name}.pid" ]; then
        pid=$(cat "/tmp/qemu-${vm_name}.pid")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "Status: ${GREEN}Running${NC} (PID: $pid)"
            
            # Get process info
            local cpu_mem=$(ps -p $pid -o %cpu,%mem --no-headers)
            echo "  CPU usage: $(echo $cpu_mem | awk '{print $1}')%"
            echo "  Memory usage: $(echo $cpu_mem | awk '{print $2}')%"
            
            # Uptime
            local start_time=$(ps -p $pid -o lstart= --no-headers)
            echo "  Started: $start_time"
        else
            echo -e "Status: ${RED}Stopped${NC} (stale PID file)"
        fi
    else
        echo -e "Status: ${YELLOW}Stopped${NC}"
    fi
    echo
}

# Find free port
find_free_port() {
    local port=$1
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

# Install OS
install_os() {
    local vm_name="$1"
    local iso_path="$2"
    
    if [ -z "$vm_name" ] || [ -z "$iso_path" ]; then
        log_error "VM name and ISO path required"
        echo "Usage: $0 install <vm_name> <iso_path>"
        exit 1
    fi
    
    if [ ! -f "$iso_path" ]; then
        log_error "ISO file not found: $iso_path"
        exit 1
    fi
    
    local vm_conf="$VMS_DIR/${vm_name}.conf"
    
    if [ ! -f "$vm_conf" ]; then
        log_error "VM '$vm_name' not found"
        exit 1
    fi
    
    log_info "Installing OS on VM '$vm_name' from $iso_path"
    
    # Update VM configuration with ISO
    sed -i "s|VM_CDROM=.*|VM_CDROM=\"$iso_path\"|" "$vm_conf"
    
    # Start VM with boot from CD
    start_vm "$vm_name" -boot d
}

# Main command handler
case "${1:-help}" in
    list|ls)
        list_vms
        ;;
    create)
        shift
        create_vm "$@"
        ;;
    start)
        shift
        start_vm "$@"
        ;;
    stop)
        shift
        stop_vm "$@"
        ;;
    delete|rm)
        shift
        delete_vm "$@"
        ;;
    connect|ssh)
        shift
        connect_vm "$@"
        ;;
    info)
        shift
        info_vm "$@"
        ;;
    install)
        shift
        install_os "$@"
        ;;
    help|--help|-h)
        echo "QEMU VM Manager"
        echo
        echo "Usage: $0 <command> [options]"
        echo
        echo "Commands:"
        echo "  list                    List all VMs"
        echo "  create <name> [template] Create a new VM"
        echo "  start <name> [options]  Start a VM"
        echo "  stop <name>            Stop a VM"
        echo "  delete <name>          Delete a VM and its disk"
        echo "  connect <name> [method] Connect to a VM (ssh/vnc/monitor)"
        echo "  info <name>            Show VM information"
        echo "  install <name> <iso>   Install OS from ISO"
        echo "  help                   Show this help message"
        echo
        echo "Templates:"
        echo "  ubuntu    Ubuntu Server (50G disk)"
        echo "  fedora    Fedora Server (40G disk)"
        echo "  alpine    Alpine Linux (10G disk)"
        echo "  custom    Custom configuration"
        echo
        echo "Examples:"
        echo "  $0 create myvm ubuntu"
        echo "  $0 start myvm"
        echo "  $0 connect myvm ssh"
        echo "  $0 install myvm ubuntu-24.10-live-server-amd64.iso"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac