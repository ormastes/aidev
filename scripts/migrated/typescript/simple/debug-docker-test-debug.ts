#!/usr/bin/env bun
/**
 * Migrated from: debug-docker-test-debug.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.589Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Docker remote debugging script for test-debug
  console.log("=== Docker Remote Debugging ===");
  console.log("");
  console.log("1. SSH Debug:");
  console.log("   ssh -p 2222 root@localhost");
  console.log("   gdb /workspace/program");
  console.log("");
  console.log("2. Remote GDB:");
  console.log("   gdb -ex 'target remote :1234'");
  console.log("");
  console.log("3. VS Code Debug:");
  console.log("   Open http://localhost:8080");
  console.log("   Install C++ extension");
  console.log("   Press F5 to start debugging");
  console.log("");
  // Connect to GDB server
  await $`gdb -ex "target remote localhost:1234"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}