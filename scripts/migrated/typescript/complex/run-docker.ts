#!/usr/bin/env bun
/**
 * Migrated from: run-docker.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.757Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Docker Run Script with SSH and VS Code Server
  await $`set -e`;
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m'`;
  // Configuration
  await $`CONTAINER_NAME="${CONTAINER_NAME:-aidev-main}"`;
  await $`IMAGE_NAME="${IMAGE_NAME:-aidev/development:latest}"`;
  await $`SSH_PORT="${SSH_PORT:-2222}"`;
  await $`VSCODE_PORT="${VSCODE_PORT:-8080}"`;
  await $`GDB_PORT="${GDB_PORT:-1234}"`;
  await $`WORKSPACE="${WORKSPACE:-./workspace}"`;
  // Parse arguments
  while ([[ $# -gt 0 ]]; do) {
  await $`case $1 in`;
  await $`--name)`;
  await $`CONTAINER_NAME="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--image)`;
  await $`IMAGE_NAME="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--ssh-port)`;
  await $`SSH_PORT="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--vscode-port)`;
  await $`VSCODE_PORT="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--workspace)`;
  await $`WORKSPACE="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--debug)`;
  await $`DEBUG_MODE=true`;
  await $`shift`;
  await $`;;`;
  await $`--detach)`;
  await $`DETACH="-d"`;
  await $`shift`;
  await $`;;`;
  await $`*)`;
  await $`shift`;
  await $`;;`;
  await $`esac`;
  }
  console.log("-e ");${GREEN}=== Starting Docker Development Environment ===${NC}"
  console.log("Container: $CONTAINER_NAME");
  console.log("Image: $IMAGE_NAME");
  console.log("");
  // Create workspace if it doesn't exist
  await mkdir(""$WORKSPACE"", { recursive: true });
  // Stop existing container if running
  await $`if docker ps -a | grep -q "$CONTAINER_NAME"; then`;
  console.log("-e ");${YELLOW}Stopping existing container...${NC}"
  await $`docker stop "$CONTAINER_NAME" 2>/dev/null || true`;
  await $`docker rm "$CONTAINER_NAME" 2>/dev/null || true`;
  }
  // Run container
  console.log("-e ");${GREEN}Starting container...${NC}"
  await $`DOCKER_RUN_CMD="docker run $DETACH \`;
  await $`--name $CONTAINER_NAME \`;
  await $`--hostname $CONTAINER_NAME \`;
  await $`-p $SSH_PORT:22 \`;
  await $`-p $VSCODE_PORT:8080 \`;
  await $`-p $GDB_PORT:1234 \`;
  await $`-p 3000:3000 \`;
  await $`-p 5000:5000 \`;
  await $`-p 8000:8000 \`;
  await $`-p 9229:9229 \`;
  await $`-p 9000-9010:9000-9010 \`;
  await $`-v $(pwd)/$WORKSPACE:/workspace \`;
  await $`-v ~/.ssh:/root/.ssh:ro \`;
  await $`-v ~/.gitconfig:/root/.gitconfig:ro \`;
  await $`-e ENABLE_SSH=true \`;
  await $`-e ENABLE_VSCODE=true"`;
  if ("$DEBUG_MODE" = true ) {; then
  await $`DOCKER_RUN_CMD="$DOCKER_RUN_CMD \`;
  await $`-e ENABLE_GDB_SERVER=true \`;
  await $`--cap-add=SYS_PTRACE \`;
  await $`--security-opt seccomp=unconfined"`;
  }
  await $`DOCKER_RUN_CMD="$DOCKER_RUN_CMD \`;
  await $`-it \`;
  await $`$IMAGE_NAME"`;
  await $`eval $DOCKER_RUN_CMD`;
  if ("$DETACH" = "-d" ) {; then
  console.log("");
  console.log("-e ");${GREEN}✅ Container started in background${NC}"
  console.log("");
  console.log("-e ");${BLUE}=== Access Information ===${NC}"
  console.log("-e ");${GREEN}SSH:${NC} ssh -p $SSH_PORT root@localhost (password: docker)"
  console.log("-e ");${GREEN}VS Code:${NC} http://localhost:$VSCODE_PORT (password: changeme)"
  console.log("-e ");${GREEN}GDB Debug:${NC} gdb -ex 'target remote :$GDB_PORT'"
  console.log("");
  console.log("-e ");${BLUE}=== Container Management ===${NC}"
  console.log("Attach to container: docker attach $CONTAINER_NAME");
  console.log("View logs: docker logs -f $CONTAINER_NAME");
  console.log("Execute command: docker exec -it $CONTAINER_NAME bash");
  console.log("Stop container: docker stop $CONTAINER_NAME");
  console.log("");
  // Wait for services to start
  console.log("-e ");${YELLOW}Waiting for services to start...${NC}"
  await Bun.sleep(3 * 1000);
  // Check if SSH is accessible
  await $`if nc -z localhost $SSH_PORT 2>/dev/null; then`;
  console.log("-e ");${GREEN}✅ SSH server is running${NC}"
  }
  // Check if VS Code is accessible
  await $`if nc -z localhost $VSCODE_PORT 2>/dev/null; then`;
  console.log("-e ");${GREEN}✅ VS Code Server is running${NC}"
  console.log("-e ");${GREEN}   Open: http://localhost:$VSCODE_PORT${NC}"
  }
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}