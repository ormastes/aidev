#!/usr/bin/env bun
/**
 * Migrated from: run-docker-test-debug.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.781Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Enhanced Docker run script for test-debug
  // Features: SSH, VS Code Server, Remote Debugging
  await $`set -e`;
  await $`CONTAINER_NAME="test-debug"`;
  await $`IMAGE="ubuntu:22.04"`;
  // Stop existing container if running
  await $`docker stop ${CONTAINER_NAME} 2>/dev/null || true`;
  await $`docker rm ${CONTAINER_NAME} 2>/dev/null || true`;
  console.log("Starting Docker container: ${CONTAINER_NAME}");
  console.log("");
  // Run container
  await $`docker run \`;
  await $`--name \`;
  await $`test-debug \`;
  await $`--hostname \`;
  await $`test-debug \`;
  await $`--platform \`;
  await $`linux/amd64 \`;
  await $`-m \`;
  await $`4G \`;
  await $`--cpus \`;
  await $`4 \`;
  await $`-p \`;
  await $`2222:22 \`;
  await $`-p \`;
  await $`8080:8080 \`;
  await $`-p \`;
  await $`1234:1234 \`;
  await $`-p \`;
  await $`3000:3000 \`;
  await $`-p \`;
  await $`5000:5000 \`;
  await $`-p \`;
  await $`8000:8000 \`;
  await $`-p \`;
  await $`9229:9229 \`;
  await $`-e \`;
  await $`ENABLE_SSH=true \`;
  await $`-e \`;
  await $`ENABLE_VSCODE=true \`;
  await $`--cap-add=SYS_PTRACE \`;
  await $`--security-opt \`;
  await $`seccomp=unconfined \`;
  await $`-e \`;
  await $`ENABLE_GDB_SERVER=true \`;
  await $`-v \`;
  await $`/home/ormastes/dev/aidev/layer/themes/init_setup-folder/.setup/workspace:/workspace \`;
  await $`-v \`;
  await $`/home/ormastes/.ssh:/root/.ssh:ro \`;
  await $`-v \`;
  await $`/home/ormastes/.gitconfig:/root/.gitconfig:ro \`;
  await $`-it \`;
  await $`${IMAGE}`;
  console.log("");
  console.log("=== Access Information ===");
  console.log("SSH: ssh -p 2222 root@localhost (password: docker)");
  console.log("VS Code: http://localhost:8080 (password: changeme)");
  console.log("GDB: gdb -ex 'target remote :1234'");
  console.log("");
  console.log("Container: docker exec -it ${CONTAINER_NAME} bash");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}