#!/usr/bin/env bun
/**
 * Migrated from: deploy.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.627Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // GUI Selector Server Deployment Script
  // This script properly integrates with portal_security theme
  // NO HARDCODED PORTS - all port allocation through EnhancedPortManager
  await $`DEPLOY_TYPE=${1:-release}`;
  console.log("🚀 Deploying GUI Selector Server");
  console.log("================================");
  console.log("📋 Deploy type: $DEPLOY_TYPE");
  console.log("🔒 Using portal_security for port allocation");
  console.log("");
  // Validate deploy type
  if ([ ! "$DEPLOY_TYPE" =~ ^(local|dev|demo|release|production)$ ]) {; then
  console.log("❌ Invalid deploy type: $DEPLOY_TYPE");
  console.log("Usage: $0 [local|dev|demo|release|production]");
  process.exit(1);
  }
  // Use the TypeScript deployment that integrates with portal_security
  await $`bunx tsx src/deploy-with-portal-security.ts "$DEPLOY_TYPE"`;
  await $`exit $?`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}