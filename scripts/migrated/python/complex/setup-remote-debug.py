#!/usr/bin/env python3
"""
Migrated from: setup-remote-debug.sh
Auto-generated Python - 2025-08-16T04:57:27.714Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Setup Remote Debugging in Docker Container
    subprocess.run("set -e", shell=True)
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    # Configuration
    subprocess.run("CONTAINER="${1:-aidev-main}"", shell=True)
    subprocess.run("PROGRAM="${2:-/workspace/hello}"", shell=True)
    subprocess.run("DEBUG_PORT="${3:-1234}"", shell=True)
    print("-e ")${BLUE}=== Setting up Remote Debugging ===${NC}"
    print("Container: $CONTAINER")
    print("Program: $PROGRAM")
    print("Debug Port: $DEBUG_PORT")
    print("")
    # Check if container is running
    subprocess.run("if ! docker ps | grep -q "$CONTAINER"; then", shell=True)
    print("-e ")${RED}Error: Container $CONTAINER is not running${NC}"
    print("Start it with: ./scripts/run-docker.sh")
    sys.exit(1)
    # Create test program if it doesn't exist
    print("-e ")${GREEN}Creating test program...${NC}"
    subprocess.run("docker exec "$CONTAINER" bash -c "cat > /workspace/hello.c << 'EOF'", shell=True)
    # include <stdio.h>
    # include <unistd.h>
    # include <stdlib.h>
    subprocess.run("void print_message(const char* msg) {", shell=True)
    subprocess.run("printf(\"Message: %s\\n\", msg);", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("int calculate_sum(int a, int b) {", shell=True)
    subprocess.run("int result = a + b;", shell=True)
    subprocess.run("return result;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("int main(int argc, char* argv[]) {", shell=True)
    subprocess.run("printf(\"Remote Debug Test Program\\n\");", shell=True)
    subprocess.run("printf(\"PID: %d\\n\", getpid());", shell=True)
    subprocess.run("// Variables for debugging", shell=True)
    subprocess.run("int x = 10;", shell=True)
    subprocess.run("int y = 20;", shell=True)
    subprocess.run("int sum = calculate_sum(x, y);", shell=True)
    subprocess.run("print_message(\"Starting main loop\");", shell=True)
    subprocess.run("// Loop for debugging", shell=True)
    subprocess.run("for (int i = 0; i < 5; i++) {", shell=True)
    subprocess.run("printf(\"Iteration %d: sum = %d\\n\", i, sum);", shell=True)
    subprocess.run("sum += i;", shell=True)
    subprocess.run("sleep(1);", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("print_message(\"Program completed\");", shell=True)
    subprocess.run("return 0;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF"", shell=True)
    # Compile with debug symbols
    print("-e ")${GREEN}Compiling with debug symbols...${NC}"
    subprocess.run("docker exec "$CONTAINER" gcc -g -O0 -o /workspace/hello /workspace/hello.c", shell=True)
    # Create GDB init script
    print("-e ")${GREEN}Creating GDB configuration...${NC}"
    subprocess.run("docker exec "$CONTAINER" bash -c "cat > /workspace/.gdbinit << 'EOF'", shell=True)
    # GDB initialization for remote debugging
    subprocess.run("set pagination off", shell=True)
    subprocess.run("set print pretty on", shell=True)
    subprocess.run("set print array on", shell=True)
    subprocess.run("set print array-indexes on", shell=True)
    # Define convenience functions
    subprocess.run("define ll", shell=True)
    subprocess.run("info locals", shell=True)
    subprocess.run("end", shell=True)
    subprocess.run("define bt_full", shell=True)
    subprocess.run("thread apply all backtrace full", shell=True)
    subprocess.run("end", shell=True)
    # Set breakpoints
    subprocess.run("break main", shell=True)
    subprocess.run("break print_message", shell=True)
    subprocess.run("break calculate_sum", shell=True)
    # Commands to run at main breakpoint
    subprocess.run("commands 1", shell=True)
    print("\\n=== Hit main() ===\\n")
    subprocess.run("info args", shell=True)
    subprocess.run("continue", shell=True)
    subprocess.run("end", shell=True)
    # Load symbols
    subprocess.run("file /workspace/hello", shell=True)
    print("\\n=== GDB Ready for Remote Debugging ===\\n")
    print("Type 'run' to start the program\\n")
    print("Or 'target remote :$DEBUG_PORT' for remote debugging\\n")
    subprocess.run("EOF"", shell=True)
    # Start GDB server in container
    print("-e ")${GREEN}Starting GDB server in container...${NC}"
    subprocess.run("docker exec -d "$CONTAINER" bash -c "gdbserver :$DEBUG_PORT /workspace/hello"", shell=True)
    # Give it a moment to start
    time.sleep(2)
    # Create local debug script
    subprocess.run("cat > ./debug-remote.sh << EOF", shell=True)
    # Connect to remote GDB server
    print("Connecting to GDB server at localhost:$DEBUG_PORT...")
    subprocess.run("gdb -ex "target remote localhost:$DEBUG_PORT" \\", shell=True)
    subprocess.run("-ex "file ./workspace/hello" \\", shell=True)
    subprocess.run("-ex "set sysroot ./workspace" \\", shell=True)
    subprocess.run("-ex "break main" \\", shell=True)
    subprocess.run("-ex "continue"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x ./debug-remote.sh", shell=True)
    # Create VS Code launch.json
    Path(".vscode").mkdir(parents=True, exist_ok=True)
    subprocess.run("cat > .vscode/launch.json << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""version": "0.2.0",", shell=True)
    subprocess.run(""configurations": [", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""name": "Docker Remote Debug",", shell=True)
    subprocess.run(""type": "cppdbg",", shell=True)
    subprocess.run(""request": "launch",", shell=True)
    subprocess.run(""program": "\${workspaceFolder}/workspace/hello",", shell=True)
    subprocess.run(""args": [],", shell=True)
    subprocess.run(""stopAtEntry": true,", shell=True)
    subprocess.run(""cwd": "\${workspaceFolder}/workspace",", shell=True)
    subprocess.run(""environment": [],", shell=True)
    subprocess.run(""externalConsole": false,", shell=True)
    subprocess.run(""MIMode": "gdb",", shell=True)
    subprocess.run(""miDebuggerServerAddress": "localhost:$DEBUG_PORT",", shell=True)
    subprocess.run(""miDebuggerPath": "/usr/bin/gdb",", shell=True)
    subprocess.run(""setupCommands": [", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""description": "Enable pretty-printing for gdb",", shell=True)
    subprocess.run(""text": "-enable-pretty-printing",", shell=True)
    subprocess.run(""ignoreFailures": true", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""sourceFileMap": {", shell=True)
    subprocess.run(""/workspace": "\${workspaceFolder}/workspace"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""name": "Docker SSH Debug",", shell=True)
    subprocess.run(""type": "cppdbg",", shell=True)
    subprocess.run(""request": "launch",", shell=True)
    subprocess.run(""program": "/workspace/hello",", shell=True)
    subprocess.run(""args": [],", shell=True)
    subprocess.run(""stopAtEntry": false,", shell=True)
    subprocess.run(""cwd": "/workspace",", shell=True)
    subprocess.run(""environment": [],", shell=True)
    subprocess.run(""externalConsole": false,", shell=True)
    subprocess.run(""pipeTransport": {", shell=True)
    subprocess.run(""debuggerPath": "/usr/bin/gdb",", shell=True)
    subprocess.run(""pipeProgram": "ssh",", shell=True)
    subprocess.run(""pipeArgs": [", shell=True)
    subprocess.run(""-p", "2222",", shell=True)
    subprocess.run(""root@localhost"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""pipeCwd": """, shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""MIMode": "gdb",", shell=True)
    subprocess.run(""setupCommands": [", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""description": "Enable pretty-printing for gdb",", shell=True)
    subprocess.run(""text": "-enable-pretty-printing",", shell=True)
    subprocess.run(""ignoreFailures": true", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("]", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("]", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("")
    print("-e ")${GREEN}✅ Remote debugging setup complete!${NC}"
    print("")
    print("-e ")${BLUE}=== Debug Options ===${NC}"
    print("")
    print("-e ")${GREEN}1. Command Line GDB:${NC}"
    print("   ./debug-remote.sh")
    print("")
    print("-e ")${GREEN}2. VS Code:${NC}"
    print("   - Open VS Code")
    print("   - Press F5 to start debugging")
    print("   - Select 'Docker Remote Debug' configuration")
    print("")
    print("-e ")${GREEN}3. Manual GDB:${NC}"
    print("   gdb")
    print("   (gdb) target remote localhost:$DEBUG_PORT")
    print("   (gdb) file ./workspace/hello")
    print("   (gdb) break main")
    print("   (gdb) continue")
    print("")
    print("-e ")${GREEN}4. Inside Container:${NC}"
    print("   docker exec -it $CONTAINER gdb /workspace/hello")
    print("")
    print("-e ")${YELLOW}Note: GDB server is running on port $DEBUG_PORT${NC}"

if __name__ == "__main__":
    main()