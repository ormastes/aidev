# QEMU Development Environment Manager

Advanced QEMU VM management system for development, building, debugging, and VSCode server deployment.

## Overview

This extension to the QEMU Container Alternative provides a complete development environment management system with:

- **SSH-based build system**: Remote compilation and testing
- **Remote debugging**: GDB server integration
- **VSCode Server**: Browser-based development environment
- **Project mounting**: 9p filesystem for seamless file sharing
- **Automated setup**: Cloud-init based VM provisioning

## Quick Start

### Installation

```bash
# From init_qemu theme directory
cd layer/themes/init_qemu

# Install dependencies
make install-deps

# Setup QEMU image
make setup
```

### Basic Usage

```bash
# Start VM for development
make start

# SSH into VM
make ssh

# Build project in VM
make build

# Run tests
make test

# Stop VM
make stop
```

## Operation Modes

### 1. SSH Build Mode (Default)

Standard development mode with SSH access and build tools:

```bash
# Start in SSH build mode
make start MODE=ssh-build

# Or using Python
python3 scripts/qemu_manager.py start --mode ssh-build

# Build and test
make build
make test
```

### 2. Remote Debug Mode

GDB server integration for remote debugging:

```bash
# Start in debug mode
make start MODE=remote-debug

# Start GDB server for your program
make debug PROGRAM=/mnt/project/build/myapp

# Connect with local GDB
gdb -ex 'target remote localhost:1234' ./build/myapp
```

### 3. VSCode Server Mode

Run VSCode in the browser connected to VM:

```bash
# Start with VSCode server support
make start MODE=vscode-server

# Install code-server (first time only)
make vscode-install

# Start VSCode server
make vscode

# Access at http://localhost:8080
# Default password: aidev
```

## Python Script Usage

### Command Line Interface

```bash
# Start VM
python3 scripts/qemu_manager.py start --mode ssh-build

# Stop VM
python3 scripts/qemu_manager.py stop

# Restart VM
python3 scripts/qemu_manager.py restart

# Check status
python3 scripts/qemu_manager.py status

# Build project
python3 scripts/qemu_manager.py build

# Run tests
python3 scripts/qemu_manager.py test

# Start debugging
python3 scripts/qemu_manager.py debug /path/to/program

# Start VSCode server
python3 scripts/qemu_manager.py vscode --install
python3 scripts/qemu_manager.py vscode

# SSH into VM
python3 scripts/qemu_manager.py ssh
python3 scripts/qemu_manager.py ssh "ls -la /mnt/project"
```

### Python API

```python
from qemu_manager import QEMUManager, QEMUConfig, QEMUMode
from qemu_manager import BuildSystem, RemoteDebugger, VSCodeServer

# Configure VM
config = QEMUConfig(
    name="dev-vm",
    image="ubuntu-22.04.qcow2",
    memory="4G",
    cpus=4,
    ssh_port=2222,
    project_root="/home/user/myproject"
)

# Create manager
manager = QEMUManager(config)

# Start VM
if manager.start(QEMUMode.SSH_BUILD):
    # Mount project folder
    manager.mount_project()
    
    # Build project
    build = BuildSystem(manager)
    build.setup_environment()
    build.build_project()
    build.run_tests()
    
    # Stop VM
    manager.stop()
```

## Configuration

### Configuration File: `config/qemu-config.json`

```json
{
  "name": "aidev-qemu",
  "image": "ubuntu-22.04.qcow2",
  "memory": "4G",
  "cpus": 4,
  "ssh_port": 2222,
  "vnc_port": 5901,
  "gdb_port": 1234,
  "vscode_port": 8080,
  "monitor_port": 4444,
  "share_folder": true,
  "network_mode": "user",
  "users": {
    "default": {
      "username": "ubuntu",
      "password": "ubuntu"
    }
  },
  "build": {
    "cmake_options": "-DCMAKE_BUILD_TYPE=Debug",
    "make_jobs": 4,
    "test_command": "ctest --output-on-failure"
  },
  "debug": {
    "gdbserver_port": 1234,
    "enable_symbols": true,
    "optimization_level": "O0"
  },
  "vscode": {
    "port": 8080,
    "password": "aidev",
    "extensions": [
      "ms-vscode.cpptools",
      "ms-python.python",
      "ms-vscode.cmake-tools"
    ]
  }
}
```

### Environment Variables

- `QEMU_CONFIG`: Path to configuration file
- `PROJECT_ROOT`: Project directory to mount (default: current directory)
- `IMAGE`: QEMU disk image file
- `MEMORY`: VM memory allocation
- `CPUS`: Number of virtual CPUs

## VSCode Integration

### Launch Configuration (`.vscode/launch.json`)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "QEMU Remote Debug",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/your_program",
      "miDebuggerServerAddress": "localhost:1234",
      "cwd": "${workspaceFolder}",
      "MIMode": "gdb",
      "setupCommands": [
        {
          "description": "Enable pretty-printing",
          "text": "-enable-pretty-printing",
          "ignoreFailures": true
        }
      ]
    }
  ]
}
```

### Tasks Configuration (`.vscode/tasks.json`)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start QEMU VM",
      "type": "shell",
      "command": "make",
      "args": ["start"],
      "options": {
        "cwd": "${workspaceFolder}/layer/themes/init_qemu"
      },
      "problemMatcher": []
    },
    {
      "label": "Build in QEMU",
      "type": "shell",
      "command": "make",
      "args": ["build"],
      "options": {
        "cwd": "${workspaceFolder}/layer/themes/init_qemu"
      },
      "dependsOn": "Start QEMU VM",
      "problemMatcher": ["$gcc"]
    },
    {
      "label": "Debug in QEMU",
      "type": "shell",
      "command": "make",
      "args": ["debug", "PROGRAM=${file}"],
      "options": {
        "cwd": "${workspaceFolder}/layer/themes/init_qemu"
      },
      "dependsOn": "Build in QEMU",
      "problemMatcher": []
    }
  ]
}
```

## Makefile Targets

| Target | Description | Example |
|--------|-------------|---------|
| `help` | Show help message | `make help` |
| `setup` | Setup QEMU image | `make setup` |
| `start` | Start VM | `make start MODE=ssh-build` |
| `stop` | Stop VM | `make stop` |
| `restart` | Restart VM | `make restart` |
| `status` | Check VM status | `make status` |
| `build` | Build project | `make build` |
| `test` | Run tests | `make test` |
| `debug` | Start debugging | `make debug PROGRAM=./app` |
| `vscode` | Start VSCode server | `make vscode` |
| `ssh` | SSH into VM | `make ssh CMD="ls"` |
| `vnc` | Connect via VNC | `make vnc` |
| `monitor` | QEMU monitor | `make monitor` |
| `clean` | Clean temp files | `make clean` |

### Development Shortcuts

| Target | Description |
|--------|-------------|
| `dev-start` | Start with VSCode |
| `dev-debug` | Start in debug mode |
| `dev-build` | Start and build |
| `dev-test` | Start and test |
| `qs` | Quick start |
| `qss` | Quick SSH |
| `qst` | Quick stop |

## Network Architecture

### Port Forwarding

| Service | Host Port | VM Port | Usage |
|---------|-----------|---------|-------|
| SSH | 2222 | 22 | Remote access |
| VNC | 5901 | 5900 | GUI access |
| GDB | 1234 | 1234 | Debugging |
| VSCode | 8080 | 8080 | Web IDE |
| Monitor | 4444 | - | QEMU control |

### Custom Ports

Add custom port forwarding in config:

```json
{
  "custom_ports": [
    {"host": 3000, "vm": 3000, "description": "Web app"},
    {"host": 5432, "vm": 5432, "description": "PostgreSQL"}
  ]
}
```

## File Sharing

### 9P Filesystem Mount

Project folder is automatically mounted at `/mnt/project` in VM:

```bash
# Check mounted folder
make ssh CMD="ls -la /mnt/project"

# Build from mounted source
make ssh CMD="cd /mnt/project && cmake . && make"
```

### Manual Mount

```bash
# In VM
sudo mkdir -p /mnt/project
sudo mount -t 9p -o trans=virtio,version=9p2000.L project /mnt/project
```

## Troubleshooting

### VM Won't Start

```bash
# Check KVM support
kvm-ok

# Check if already running
make status

# Clean and restart
make clean
make start
```

### SSH Connection Issues

```bash
# Check SSH port
netstat -tlnp | grep 2222

# Wait for boot
sleep 30

# Try direct SSH
ssh -p 2222 ubuntu@localhost
```

### Build Failures

```bash
# Check mount
make ssh CMD="ls /mnt/project"

# Check tools
make ssh CMD="which cmake gcc"

# Reinstall tools
make ssh CMD="sudo apt-get update && sudo apt-get install build-essential cmake"
```

### Performance Issues

```bash
# Check KVM acceleration
make ssh CMD="ls /dev/kvm"

# Increase resources
make start MEMORY=8G CPUS=8
```

## Advanced Features

### Snapshots

```bash
# Create snapshot
qemu-img snapshot -c before-update ubuntu-22.04.qcow2

# List snapshots
qemu-img snapshot -l ubuntu-22.04.qcow2

# Restore snapshot
qemu-img snapshot -a before-update ubuntu-22.04.qcow2
```

### Multiple VMs

```bash
# Start multiple VMs with different configs
python3 scripts/qemu_manager.py start --config vm1.json
python3 scripts/qemu_manager.py start --config vm2.json
```

### Custom Images

```bash
# Create custom image
make setup

# Install additional tools
make ssh CMD="sudo apt-get install -y nodejs npm rust cargo"

# Save as new image
qemu-img convert -O qcow2 ubuntu-22.04.qcow2 custom-dev.qcow2
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup QEMU
        run: |
          cd layer/themes/init_qemu
          make install-deps
          make setup
      
      - name: Start VM
        run: |
          cd layer/themes/init_qemu
          make start
      
      - name: Build Project
        run: |
          cd layer/themes/init_qemu
          make build
      
      - name: Run Tests
        run: |
          cd layer/themes/init_qemu
          make test
      
      - name: Stop VM
        if: always()
        run: |
          cd layer/themes/init_qemu
          make stop
```

## Best Practices

1. **Always stop VMs properly**: Use `make stop` to ensure clean shutdown
2. **Regular snapshots**: Create snapshots before major changes
3. **Resource management**: Monitor VM resource usage
4. **Security**: Change default passwords in production
5. **Backup images**: Keep backups of configured images

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review logs: `make logs`
- Monitor VM: `make monitor`
- VNC access: `make vnc`