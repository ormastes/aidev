#!/usr/bin/env python3
"""
QEMU Manager for init_qemu theme
Handles QEMU VM lifecycle, SSH connections, remote debugging, and VSCode server
"""

import os
import sys
import json
import time
import subprocess
import argparse
import socket
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

class QEMUMode(Enum):
    """QEMU operation modes"""
    SSH_BUILD = "ssh-build"
    REMOTE_DEBUG = "remote-debug"
    VSCODE_SERVER = "vscode-server"

@dataclass
class QEMUConfig:
    """QEMU configuration"""
    name: str = "aidev-qemu"
    image: str = "ubuntu-22.04.qcow2"
    memory: str = "4G"
    cpus: int = 4
    ssh_port: int = 2222
    vnc_port: int = 5901
    gdb_port: int = 1234
    vscode_port: int = 8080
    monitor_port: int = 4444
    project_root: str = ""
    share_folder: bool = True
    network_mode: str = "user"
    
class QEMUManager:
    """Manages QEMU virtual machine lifecycle"""
    
    def __init__(self, config: QEMUConfig):
        self.config = config
        self.pid_file = Path(f"/tmp/{config.name}.pid")
        self.socket_file = Path(f"/tmp/{config.name}.sock")
        self.state_file = Path(f"/tmp/{config.name}.state")
        
    def is_running(self) -> bool:
        """Check if QEMU is already running"""
        if not self.pid_file.exists():
            return False
            
        try:
            pid = int(self.pid_file.read_text())
            # Check if process exists
            os.kill(pid, 0)
            return True
        except (ProcessLookupError, ValueError):
            # Clean up stale pid file
            self.pid_file.unlink(missing_ok=True)
            return False
            
    def get_qemu_command(self, mode: QEMUMode) -> List[str]:
        """Build QEMU command based on mode"""
        cmd = [
            "qemu-system-x86_64",
            "-name", self.config.name,
            "-m", self.config.memory,
            "-smp", str(self.config.cpus),
            "-enable-kvm",
            "-cpu", "host",
            "-drive", f"file={self.config.image},if=virtio",
            "-netdev", f"user,id=net0,hostfwd=tcp::{self.config.ssh_port}-:22",
            "-device", "virtio-net-pci,netdev=net0",
            "-monitor", f"unix:{self.socket_file},server,nowait",
            "-daemonize",
            "-pidfile", str(self.pid_file),
            "-display", "none",
        ]
        
        # Add VNC display
        cmd.extend(["-vnc", f":{self.config.vnc_port - 5900}"])
        
        # Add port forwarding based on mode
        if mode == QEMUMode.REMOTE_DEBUG:
            cmd[cmd.index("-netdev") + 1] += f",hostfwd=tcp::{self.config.gdb_port}-:1234"
        elif mode == QEMUMode.VSCODE_SERVER:
            cmd[cmd.index("-netdev") + 1] += f",hostfwd=tcp::{self.config.vscode_port}-:8080"
            
        # Add shared folder if configured
        if self.config.share_folder and self.config.project_root:
            cmd.extend([
                "-virtfs", f"local,path={self.config.project_root},mount_tag=project,security_model=mapped-xattr,id=project"
            ])
            
        return cmd
        
    def start(self, mode: QEMUMode = QEMUMode.SSH_BUILD) -> bool:
        """Start QEMU VM"""
        if self.is_running():
            print(f"QEMU '{self.config.name}' is already running")
            return True
            
        print(f"Starting QEMU '{self.config.name}' in {mode.value} mode...")
        
        # Ensure image exists
        if not Path(self.config.image).exists():
            print(f"Error: QEMU image '{self.config.image}' not found")
            return False
            
        cmd = self.get_qemu_command(mode)
        
        try:
            subprocess.run(cmd, check=True)
            
            # Save state
            state = {
                "mode": mode.value,
                "started_at": time.time(),
                "config": self.config.__dict__
            }
            self.state_file.write_text(json.dumps(state, indent=2))
            
            print(f"QEMU started successfully")
            print(f"SSH port: {self.config.ssh_port}")
            if mode == QEMUMode.REMOTE_DEBUG:
                print(f"GDB port: {self.config.gdb_port}")
            elif mode == QEMUMode.VSCODE_SERVER:
                print(f"VSCode port: {self.config.vscode_port}")
                
            # Wait for SSH to be ready
            self.wait_for_ssh()
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"Failed to start QEMU: {e}")
            return False
            
    def stop(self) -> bool:
        """Stop QEMU VM"""
        if not self.is_running():
            print(f"QEMU '{self.config.name}' is not running")
            return True
            
        print(f"Stopping QEMU '{self.config.name}'...")
        
        try:
            # Send powerdown command via monitor
            self.send_monitor_command("system_powerdown")
            
            # Wait for graceful shutdown
            for _ in range(30):
                if not self.is_running():
                    break
                time.sleep(1)
            else:
                # Force kill if still running
                pid = int(self.pid_file.read_text())
                os.kill(pid, 9)
                
            # Clean up files
            self.pid_file.unlink(missing_ok=True)
            self.socket_file.unlink(missing_ok=True)
            self.state_file.unlink(missing_ok=True)
            
            print("QEMU stopped successfully")
            return True
            
        except Exception as e:
            print(f"Failed to stop QEMU: {e}")
            return False
            
    def restart(self, mode: Optional[QEMUMode] = None) -> bool:
        """Restart QEMU VM"""
        # Get current mode if not specified
        if mode is None and self.state_file.exists():
            state = json.loads(self.state_file.read_text())
            mode = QEMUMode(state.get("mode", QEMUMode.SSH_BUILD.value))
        else:
            mode = mode or QEMUMode.SSH_BUILD
            
        self.stop()
        time.sleep(2)
        return self.start(mode)
        
    def send_monitor_command(self, command: str) -> Optional[str]:
        """Send command to QEMU monitor"""
        if not self.socket_file.exists():
            return None
            
        try:
            import socket
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.connect(str(self.socket_file))
            
            # Send command
            sock.send(f"{command}\n".encode())
            
            # Read response
            response = sock.recv(4096).decode()
            sock.close()
            
            return response
            
        except Exception as e:
            print(f"Monitor command failed: {e}")
            return None
            
    def wait_for_ssh(self, timeout: int = 60) -> bool:
        """Wait for SSH to be available"""
        print("Waiting for SSH to be ready...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            
            try:
                result = sock.connect_ex(('localhost', self.config.ssh_port))
                sock.close()
                
                if result == 0:
                    print("SSH is ready")
                    return True
                    
            except Exception:
                pass
                
            time.sleep(1)
            
        print("SSH timeout")
        return False
        
    def ssh_command(self, command: str, user: str = "ubuntu") -> Optional[str]:
        """Execute command via SSH"""
        ssh_cmd = [
            "ssh",
            "-p", str(self.config.ssh_port),
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            f"{user}@localhost",
            command
        ]
        
        try:
            result = subprocess.run(ssh_cmd, capture_output=True, text=True, check=True)
            return result.stdout
        except subprocess.CalledProcessError as e:
            print(f"SSH command failed: {e.stderr}")
            return None
            
    def mount_project(self, user: str = "ubuntu") -> bool:
        """Mount project folder in VM"""
        if not self.config.share_folder:
            return True
            
        print("Mounting project folder...")
        
        # Create mount point
        self.ssh_command("sudo mkdir -p /mnt/project", user)
        
        # Mount 9p filesystem
        mount_cmd = "sudo mount -t 9p -o trans=virtio,version=9p2000.L project /mnt/project"
        result = self.ssh_command(mount_cmd, user)
        
        if result is not None:
            print("Project folder mounted at /mnt/project")
            return True
        else:
            print("Failed to mount project folder")
            return False

class BuildSystem:
    """Build system for QEMU environment"""
    
    def __init__(self, manager: QEMUManager):
        self.manager = manager
        
    def setup_environment(self, user: str = "ubuntu") -> bool:
        """Setup build environment in VM"""
        print("Setting up build environment...")
        
        commands = [
            "sudo apt-get update",
            "sudo apt-get install -y build-essential cmake git python3-pip",
            "sudo apt-get install -y gdb gdbserver",
            "uv pip install --user pytest coverage",
        ]
        
        for cmd in commands:
            print(f"Running: {cmd}")
            if self.manager.ssh_command(cmd, user) is None:
                return False
                
        return True
        
    def build_project(self, build_dir: str = "/mnt/project/build", user: str = "ubuntu") -> bool:
        """Build project in VM"""
        print("Building project...")
        
        commands = [
            f"mkdir -p {build_dir}",
            f"cd {build_dir} && cmake ..",
            f"cd {build_dir} && make -j{self.manager.config.cpus}",
        ]
        
        for cmd in commands:
            print(f"Running: {cmd}")
            result = self.manager.ssh_command(cmd, user)
            if result is None:
                print("Build failed")
                return False
                
        print("Build completed successfully")
        return True
        
    def run_tests(self, build_dir: str = "/mnt/project/build", user: str = "ubuntu") -> bool:
        """Run tests in VM"""
        print("Running tests...")
        
        cmd = f"cd {build_dir} && ctest --output-on-failure"
        result = self.manager.ssh_command(cmd, user)
        
        if result is not None:
            print(result)
            return True
        else:
            print("Tests failed")
            return False

class RemoteDebugger:
    """Remote debugging support"""
    
    def __init__(self, manager: QEMUManager):
        self.manager = manager
        
    def start_gdbserver(self, program: str, port: int = 1234, user: str = "ubuntu") -> bool:
        """Start gdbserver in VM"""
        print(f"Starting gdbserver for {program}...")
        
        cmd = f"gdbserver :{port} {program} &"
        result = self.manager.ssh_command(cmd, user)
        
        if result is not None:
            print(f"GDBServer started on port {port}")
            print(f"Connect with: gdb -ex 'target remote localhost:{self.manager.config.gdb_port}'")
            return True
        else:
            print("Failed to start gdbserver")
            return False
            
    def generate_launch_json(self) -> Dict[str, Any]:
        """Generate VSCode launch.json configuration"""
        return {
            "version": "0.2.0",
            "configurations": [
                {
                    "name": "QEMU Remote Debug",
                    "type": "cppdbg",
                    "request": "launch",
                    "program": "${workspaceFolder}/build/your_program",
                    "miDebuggerServerAddress": f"localhost:{self.manager.config.gdb_port}",
                    "cwd": "${workspaceFolder}",
                    "MIMode": "gdb",
                    "setupCommands": [
                        {
                            "description": "Enable pretty-printing for gdb",
                            "text": "-enable-pretty-printing",
                            "ignoreFailures": True
                        }
                    ]
                }
            ]
        }

class VSCodeServer:
    """VSCode Server management"""
    
    def __init__(self, manager: QEMUManager):
        self.manager = manager
        
    def install(self, user: str = "ubuntu") -> bool:
        """Install code-server in VM"""
        print("Installing code-server...")
        
        cmd = "curl -fsSL https://code-server.dev/install.sh | sh"
        result = self.manager.ssh_command(cmd, user)
        
        if result is not None:
            print("code-server installed successfully")
            return True
        else:
            print("Failed to install code-server")
            return False
            
    def start(self, password: str = "aidev", user: str = "ubuntu") -> bool:
        """Start code-server"""
        print("Starting code-server...")
        
        config = f"""
bind-addr: 0.0.0.0:8080
auth: password
password: {password}
cert: false
"""
        
        # Write config
        self.manager.ssh_command(f"mkdir -p ~/.config/code-server", user)
        self.manager.ssh_command(f"echo '{config}' > ~/.config/code-server/config.yaml", user)
        
        # Start code-server
        cmd = "code-server --bind-addr 0.0.0.0:8080 /mnt/project &"
        result = self.manager.ssh_command(cmd, user)
        
        if result is not None:
            print(f"VSCode Server started")
            print(f"Access at: http://localhost:{self.manager.config.vscode_port}")
            print(f"Password: {password}")
            return True
        else:
            print("Failed to start code-server")
            return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="QEMU Manager for init_qemu theme")
    
    # Commands
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start QEMU VM")
    start_parser.add_argument("--mode", choices=["ssh-build", "remote-debug", "vscode-server"],
                            default="ssh-build", help="Operation mode")
    
    # Stop command
    subparsers.add_parser("stop", help="Stop QEMU VM")
    
    # Restart command
    restart_parser = subparsers.add_parser("restart", help="Restart QEMU VM")
    restart_parser.add_argument("--mode", choices=["ssh-build", "remote-debug", "vscode-server"],
                               help="Operation mode")
    
    # Status command
    subparsers.add_parser("status", help="Check QEMU status")
    
    # Build command
    subparsers.add_parser("build", help="Build project in VM")
    
    # Test command
    subparsers.add_parser("test", help="Run tests in VM")
    
    # Debug command
    debug_parser = subparsers.add_parser("debug", help="Start remote debugging")
    debug_parser.add_argument("program", help="Program to debug")
    
    # VSCode command
    vscode_parser = subparsers.add_parser("vscode", help="Start VSCode server")
    vscode_parser.add_argument("--install", action="store_true", help="Install code-server")
    
    # SSH command
    ssh_parser = subparsers.add_parser("ssh", help="SSH into VM")
    ssh_parser.add_argument("command", nargs="*", help="Command to execute")
    
    # Global options
    parser.add_argument("--config", help="Configuration file")
    parser.add_argument("--image", help="QEMU image file")
    parser.add_argument("--memory", default="4G", help="Memory size")
    parser.add_argument("--cpus", type=int, default=4, help="Number of CPUs")
    parser.add_argument("--project-root", default=os.getcwd(), help="Project root directory")
    
    args = parser.parse_args()
    
    # Load configuration
    config = QEMUConfig()
    
    if args.config and Path(args.config).exists():
        with open(args.config) as f:
            config_data = json.load(f)
            for key, value in config_data.items():
                if hasattr(config, key):
                    setattr(config, key, value)
    
    # Override with command line arguments
    if args.image:
        config.image = args.image
    if args.memory:
        config.memory = args.memory
    if args.cpus:
        config.cpus = args.cpus
    if args.project_root:
        config.project_root = args.project_root
        
    # Create manager
    manager = QEMUManager(config)
    
    # Execute command
    if args.command == "start":
        mode = QEMUMode(args.mode.replace("-", "_").upper())
        if manager.start(mode):
            manager.mount_project()
            sys.exit(0)
        else:
            sys.exit(1)
            
    elif args.command == "stop":
        if manager.stop():
            sys.exit(0)
        else:
            sys.exit(1)
            
    elif args.command == "restart":
        mode = QEMUMode(args.mode.replace("-", "_").upper()) if args.mode else None
        if manager.restart(mode):
            manager.mount_project()
            sys.exit(0)
        else:
            sys.exit(1)
            
    elif args.command == "status":
        if manager.is_running():
            print(f"QEMU '{config.name}' is running")
            if manager.state_file.exists():
                state = json.loads(manager.state_file.read_text())
                print(f"Mode: {state.get('mode')}")
                print(f"Started: {time.ctime(state.get('started_at'))}")
            sys.exit(0)
        else:
            print(f"QEMU '{config.name}' is not running")
            sys.exit(1)
            
    elif args.command == "build":
        if not manager.is_running():
            print("QEMU is not running. Start it first.")
            sys.exit(1)
            
        build = BuildSystem(manager)
        if build.setup_environment() and build.build_project():
            sys.exit(0)
        else:
            sys.exit(1)
            
    elif args.command == "test":
        if not manager.is_running():
            print("QEMU is not running. Start it first.")
            sys.exit(1)
            
        build = BuildSystem(manager)
        if build.run_tests():
            sys.exit(0)
        else:
            sys.exit(1)
            
    elif args.command == "debug":
        if not manager.is_running():
            print("QEMU is not running. Start it first.")
            sys.exit(1)
            
        debugger = RemoteDebugger(manager)
        if debugger.start_gdbserver(args.program):
            # Print launch.json config
            print("\nVSCode launch.json configuration:")
            print(json.dumps(debugger.generate_launch_json(), indent=2))
            sys.exit(0)
        else:
            sys.exit(1)
            
    elif args.command == "vscode":
        if not manager.is_running():
            print("QEMU is not running. Start it first.")
            sys.exit(1)
            
        vscode = VSCodeServer(manager)
        
        if args.install:
            if not vscode.install():
                sys.exit(1)
                
        if vscode.start():
            sys.exit(0)
        else:
            sys.exit(1)
            
    elif args.command == "ssh":
        if not manager.is_running():
            print("QEMU is not running. Start it first.")
            sys.exit(1)
            
        if args.command:
            # Execute command
            result = manager.ssh_command(" ".join(args.command))
            if result:
                print(result)
                sys.exit(0)
            else:
                sys.exit(1)
        else:
            # Interactive SSH
            ssh_cmd = [
                "ssh",
                "-p", str(config.ssh_port),
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                "ubuntu@localhost"
            ]
            os.execvp("ssh", ssh_cmd)
            
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()