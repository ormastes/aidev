#!/bin/bash
# Setup Remote Debugging in Docker Container

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
CONTAINER="${1:-aidev-main}"
PROGRAM="${2:-/workspace/hello}"
DEBUG_PORT="${3:-1234}"

echo -e "${BLUE}=== Setting up Remote Debugging ===${NC}"
echo "Container: $CONTAINER"
echo "Program: $PROGRAM"
echo "Debug Port: $DEBUG_PORT"
echo ""

# Check if container is running
if ! docker ps | grep -q "$CONTAINER"; then
    echo -e "${RED}Error: Container $CONTAINER is not running${NC}"
    echo "Start it with: ./scripts/run-docker.sh"
    exit 1
fi

# Create test program if it doesn't exist
echo -e "${GREEN}Creating test program...${NC}"

docker exec "$CONTAINER" bash -c "cat > /workspace/hello.c << 'EOF'
#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>

void print_message(const char* msg) {
    printf(\"Message: %s\\n\", msg);
}

int calculate_sum(int a, int b) {
    int result = a + b;
    return result;
}

int main(int argc, char* argv[]) {
    printf(\"Remote Debug Test Program\\n\");
    printf(\"PID: %d\\n\", getpid());
    
    // Variables for debugging
    int x = 10;
    int y = 20;
    int sum = calculate_sum(x, y);
    
    print_message(\"Starting main loop\");
    
    // Loop for debugging
    for (int i = 0; i < 5; i++) {
        printf(\"Iteration %d: sum = %d\\n\", i, sum);
        sum += i;
        sleep(1);
    }
    
    print_message(\"Program completed\");
    return 0;
}
EOF"

# Compile with debug symbols
echo -e "${GREEN}Compiling with debug symbols...${NC}"
docker exec "$CONTAINER" gcc -g -O0 -o /workspace/hello /workspace/hello.c

# Create GDB init script
echo -e "${GREEN}Creating GDB configuration...${NC}"

docker exec "$CONTAINER" bash -c "cat > /workspace/.gdbinit << 'EOF'
# GDB initialization for remote debugging
set pagination off
set print pretty on
set print array on
set print array-indexes on

# Define convenience functions
define ll
    info locals
end

define bt_full
    thread apply all backtrace full
end

# Set breakpoints
break main
break print_message
break calculate_sum

# Commands to run at main breakpoint
commands 1
    echo \\n=== Hit main() ===\\n
    info args
    continue
end

# Load symbols
file /workspace/hello

echo \\n=== GDB Ready for Remote Debugging ===\\n
echo Type 'run' to start the program\\n
echo Or 'target remote :$DEBUG_PORT' for remote debugging\\n
EOF"

# Start GDB server in container
echo -e "${GREEN}Starting GDB server in container...${NC}"
docker exec -d "$CONTAINER" bash -c "gdbserver :$DEBUG_PORT /workspace/hello"

# Give it a moment to start
sleep 2

# Create local debug script
cat > ./debug-remote.sh << EOF
#!/bin/bash
# Connect to remote GDB server

echo "Connecting to GDB server at localhost:$DEBUG_PORT..."
gdb -ex "target remote localhost:$DEBUG_PORT" \\
    -ex "file ./workspace/hello" \\
    -ex "set sysroot ./workspace" \\
    -ex "break main" \\
    -ex "continue"
EOF
chmod +x ./debug-remote.sh

# Create VS Code launch.json
mkdir -p .vscode
cat > .vscode/launch.json << EOF
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Docker Remote Debug",
            "type": "cppdbg",
            "request": "launch",
            "program": "\${workspaceFolder}/workspace/hello",
            "args": [],
            "stopAtEntry": true,
            "cwd": "\${workspaceFolder}/workspace",
            "environment": [],
            "externalConsole": false,
            "MIMode": "gdb",
            "miDebuggerServerAddress": "localhost:$DEBUG_PORT",
            "miDebuggerPath": "/usr/bin/gdb",
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for gdb",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": true
                }
            ],
            "sourceFileMap": {
                "/workspace": "\${workspaceFolder}/workspace"
            }
        },
        {
            "name": "Docker SSH Debug",
            "type": "cppdbg",
            "request": "launch",
            "program": "/workspace/hello",
            "args": [],
            "stopAtEntry": false,
            "cwd": "/workspace",
            "environment": [],
            "externalConsole": false,
            "pipeTransport": {
                "debuggerPath": "/usr/bin/gdb",
                "pipeProgram": "ssh",
                "pipeArgs": [
                    "-p", "2222",
                    "root@localhost"
                ],
                "pipeCwd": ""
            },
            "MIMode": "gdb",
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for gdb",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": true
                }
            ]
        }
    ]
}
EOF

echo ""
echo -e "${GREEN}✅ Remote debugging setup complete!${NC}"
echo ""
echo -e "${BLUE}=== Debug Options ===${NC}"
echo ""
echo -e "${GREEN}1. Command Line GDB:${NC}"
echo "   ./debug-remote.sh"
echo ""
echo -e "${GREEN}2. VS Code:${NC}"
echo "   - Open VS Code"
echo "   - Press F5 to start debugging"
echo "   - Select 'Docker Remote Debug' configuration"
echo ""
echo -e "${GREEN}3. Manual GDB:${NC}"
echo "   gdb"
echo "   (gdb) target remote localhost:$DEBUG_PORT"
echo "   (gdb) file ./workspace/hello"
echo "   (gdb) break main"
echo "   (gdb) continue"
echo ""
echo -e "${GREEN}4. Inside Container:${NC}"
echo "   docker exec -it $CONTAINER gdb /workspace/hello"
echo ""
echo -e "${YELLOW}Note: GDB server is running on port $DEBUG_PORT${NC}"