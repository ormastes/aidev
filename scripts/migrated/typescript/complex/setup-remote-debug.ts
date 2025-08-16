#!/usr/bin/env bun
/**
 * Migrated from: setup-remote-debug.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.713Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup Remote Debugging in Docker Container
  await $`set -e`;
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  // Configuration
  await $`CONTAINER="${1:-aidev-main}"`;
  await $`PROGRAM="${2:-/workspace/hello}"`;
  await $`DEBUG_PORT="${3:-1234}"`;
  console.log("-e ");${BLUE}=== Setting up Remote Debugging ===${NC}"
  console.log("Container: $CONTAINER");
  console.log("Program: $PROGRAM");
  console.log("Debug Port: $DEBUG_PORT");
  console.log("");
  // Check if container is running
  await $`if ! docker ps | grep -q "$CONTAINER"; then`;
  console.log("-e ");${RED}Error: Container $CONTAINER is not running${NC}"
  console.log("Start it with: ./scripts/run-docker.sh");
  process.exit(1);
  }
  // Create test program if it doesn't exist
  console.log("-e ");${GREEN}Creating test program...${NC}"
  await $`docker exec "$CONTAINER" bash -c "cat > /workspace/hello.c << 'EOF'`;
  // include <stdio.h>
  // include <unistd.h>
  // include <stdlib.h>
  await $`void print_message(const char* msg) {`;
  await $`printf(\"Message: %s\\n\", msg);`;
  await $`}`;
  await $`int calculate_sum(int a, int b) {`;
  await $`int result = a + b;`;
  await $`return result;`;
  await $`}`;
  await $`int main(int argc, char* argv[]) {`;
  await $`printf(\"Remote Debug Test Program\\n\");`;
  await $`printf(\"PID: %d\\n\", getpid());`;
  // Variables for debugging
  await $`int x = 10;`;
  await $`int y = 20;`;
  await $`int sum = calculate_sum(x, y);`;
  await $`print_message(\"Starting main loop\");`;
  // Loop for debugging
  await $`for (int i = 0; i < 5; i++) {`;
  await $`printf(\"Iteration %d: sum = %d\\n\", i, sum);`;
  await $`sum += i;`;
  await $`sleep(1);`;
  await $`}`;
  await $`print_message(\"Program completed\");`;
  await $`return 0;`;
  await $`}`;
  await $`EOF"`;
  // Compile with debug symbols
  console.log("-e ");${GREEN}Compiling with debug symbols...${NC}"
  await $`docker exec "$CONTAINER" gcc -g -O0 -o /workspace/hello /workspace/hello.c`;
  // Create GDB init script
  console.log("-e ");${GREEN}Creating GDB configuration...${NC}"
  await $`docker exec "$CONTAINER" bash -c "cat > /workspace/.gdbinit << 'EOF'`;
  // GDB initialization for remote debugging
  await $`set pagination off`;
  await $`set print pretty on`;
  await $`set print array on`;
  await $`set print array-indexes on`;
  // Define convenience functions
  await $`define ll`;
  await $`info locals`;
  await $`end`;
  await $`define bt_full`;
  await $`thread apply all backtrace full`;
  await $`end`;
  // Set breakpoints
  await $`break main`;
  await $`break print_message`;
  await $`break calculate_sum`;
  // Commands to run at main breakpoint
  await $`commands 1`;
  console.log("\\n=== Hit main() ===\\n");
  await $`info args`;
  await $`continue`;
  await $`end`;
  // Load symbols
  await $`file /workspace/hello`;
  console.log("\\n=== GDB Ready for Remote Debugging ===\\n");
  console.log("Type 'run' to start the program\\n");
  console.log("Or 'target remote :$DEBUG_PORT' for remote debugging\\n");
  await $`EOF"`;
  // Start GDB server in container
  console.log("-e ");${GREEN}Starting GDB server in container...${NC}"
  await $`docker exec -d "$CONTAINER" bash -c "gdbserver :$DEBUG_PORT /workspace/hello"`;
  // Give it a moment to start
  await Bun.sleep(2 * 1000);
  // Create local debug script
  await $`cat > ./debug-remote.sh << EOF`;
  // Connect to remote GDB server
  console.log("Connecting to GDB server at localhost:$DEBUG_PORT...");
  await $`gdb -ex "target remote localhost:$DEBUG_PORT" \\`;
  await $`-ex "file ./workspace/hello" \\`;
  await $`-ex "set sysroot ./workspace" \\`;
  await $`-ex "break main" \\`;
  await $`-ex "continue"`;
  await $`EOF`;
  await $`chmod +x ./debug-remote.sh`;
  // Create VS Code launch.json
  await mkdir(".vscode", { recursive: true });
  await $`cat > .vscode/launch.json << EOF`;
  await $`{`;
  await $`"version": "0.2.0",`;
  await $`"configurations": [`;
  await $`{`;
  await $`"name": "Docker Remote Debug",`;
  await $`"type": "cppdbg",`;
  await $`"request": "launch",`;
  await $`"program": "\${workspaceFolder}/workspace/hello",`;
  await $`"args": [],`;
  await $`"stopAtEntry": true,`;
  await $`"cwd": "\${workspaceFolder}/workspace",`;
  await $`"environment": [],`;
  await $`"externalConsole": false,`;
  await $`"MIMode": "gdb",`;
  await $`"miDebuggerServerAddress": "localhost:$DEBUG_PORT",`;
  await $`"miDebuggerPath": "/usr/bin/gdb",`;
  await $`"setupCommands": [`;
  await $`{`;
  await $`"description": "Enable pretty-printing for gdb",`;
  await $`"text": "-enable-pretty-printing",`;
  await $`"ignoreFailures": true`;
  await $`}`;
  await $`],`;
  await $`"sourceFileMap": {`;
  await $`"/workspace": "\${workspaceFolder}/workspace"`;
  await $`}`;
  await $`},`;
  await $`{`;
  await $`"name": "Docker SSH Debug",`;
  await $`"type": "cppdbg",`;
  await $`"request": "launch",`;
  await $`"program": "/workspace/hello",`;
  await $`"args": [],`;
  await $`"stopAtEntry": false,`;
  await $`"cwd": "/workspace",`;
  await $`"environment": [],`;
  await $`"externalConsole": false,`;
  await $`"pipeTransport": {`;
  await $`"debuggerPath": "/usr/bin/gdb",`;
  await $`"pipeProgram": "ssh",`;
  await $`"pipeArgs": [`;
  await $`"-p", "2222",`;
  await $`"root@localhost"`;
  await $`],`;
  await $`"pipeCwd": ""`;
  await $`},`;
  await $`"MIMode": "gdb",`;
  await $`"setupCommands": [`;
  await $`{`;
  await $`"description": "Enable pretty-printing for gdb",`;
  await $`"text": "-enable-pretty-printing",`;
  await $`"ignoreFailures": true`;
  await $`}`;
  await $`]`;
  await $`}`;
  await $`]`;
  await $`}`;
  await $`EOF`;
  console.log("");
  console.log("-e ");${GREEN}✅ Remote debugging setup complete!${NC}"
  console.log("");
  console.log("-e ");${BLUE}=== Debug Options ===${NC}"
  console.log("");
  console.log("-e ");${GREEN}1. Command Line GDB:${NC}"
  console.log("   ./debug-remote.sh");
  console.log("");
  console.log("-e ");${GREEN}2. VS Code:${NC}"
  console.log("   - Open VS Code");
  console.log("   - Press F5 to start debugging");
  console.log("   - Select 'Docker Remote Debug' configuration");
  console.log("");
  console.log("-e ");${GREEN}3. Manual GDB:${NC}"
  console.log("   gdb");
  console.log("   (gdb) target remote localhost:$DEBUG_PORT");
  console.log("   (gdb) file ./workspace/hello");
  console.log("   (gdb) break main");
  console.log("   (gdb) continue");
  console.log("");
  console.log("-e ");${GREEN}4. Inside Container:${NC}"
  console.log("   docker exec -it $CONTAINER gdb /workspace/hello");
  console.log("");
  console.log("-e ");${YELLOW}Note: GDB server is running on port $DEBUG_PORT${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}