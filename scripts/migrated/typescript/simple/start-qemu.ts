#!/usr/bin/env bun
/**
 * Migrated from: start-qemu.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.591Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Start QEMU with debugging enabled
  await $`qemu-system-x86_64 \`;
  await $`-name test-vm \`;
  await $`-m 512M \`;
  await $`-smp 1 \`;
  await $`-nographic \`;
  await $`-kernel /path/to/kernel \`;
  await $`-append "console=ttyS0" \`;
  await $`-gdb tcp::1234 \`;
  await $`-S \`;
  await $`-netdev user,id=net0,hostfwd=tcp::2222-:22 \`;
  await $`-device virtio-net,netdev=net0 \`;
  await $`-drive file=/home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/test-alpine.qcow2,if=virtio`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}