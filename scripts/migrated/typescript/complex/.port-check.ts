#!/usr/bin/env bun
/**
 * Migrated from: .port-check.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.790Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Port Check Script - Prevents port conflicts
  // Run this before starting any service
  await $`PORTAL_PORT=3456`;
  await $`GUI_PORT=3457`;
  await $`PORTAL_RANGE_START=3456`;
  await $`PORTAL_RANGE_END=3499`;
  console.log("🔍 AI Dev Portal - Port Conflict Checker");
  console.log("=========================================");
  // Function to check if port is in use
  await $`check_port() {`;
  await $`local port=$1`;
  await $`local service=$2`;
  await $`if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then`;
  console.log("✅ Port $port: IN USE - $service running");
  await $`return 0`;
  } else {
  console.log("⚠️  Port $port: AVAILABLE - $service not running");
  await $`return 1`;
  }
  await $`}`;
  // Check main services
  await $`check_port $PORTAL_PORT "AI Dev Portal"`;
  await $`check_port $GUI_PORT "GUI Selection Service"`;
  // Check for unauthorized port usage
  console.log("");
  console.log("🔍 Checking for unauthorized services in portal range ($PORTAL_RANGE_START-$PORTAL_RANGE_END):");
  for (const port of [$(seq $PORTAL_RANGE_START $PORTAL_RANGE_END); do]) {
  await $`if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then`;
  await $`process=$(lsof -Pi :$port -sTCP:LISTEN 2>/dev/null | tail -n 1 | awk '{print $1}')`;
  await $`case $port in`;
  await $`3456)`;
  await $`[ "$process" != "node" ] && echo "⚠️ WARNING: Non-node process on portal port 3456: $process"`;
  await $`;;`;
  await $`3457)`;
  // GUI service port
  await $`;;`;
  await $`*)`;
  console.log("⚠️ WARNING: Unexpected service on port $port: $process");
  await $`;;`;
  await $`esac`;
  }
  }
  console.log("");
  console.log("📋 Port Allocation Rules:");
  console.log("  - 3456: AI Dev Portal (PRIMARY)");
  console.log("  - 3457: GUI Selection Service");
  console.log("  - 3458-3499: Reserved for portal services");
  console.log("");
  console.log("✅ Check complete. Ensure all services use assigned ports.");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}