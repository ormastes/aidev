#!/usr/bin/env bun
/**
 * Migrated from: start-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.621Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Quick start script for Filesystem MCP
  console.log("🚀 Starting Filesystem MCP Server");
  console.log("Choose version:");
  console.log("  1) Standard MCP");
  console.log("  2) Enhanced MCP (with validation)");
  console.log("");
  await $`read -p "Enter choice [1-2]: " choice`;
  await $`case $choice in`;
  await $`1)`;
  console.log("Starting standard MCP server...");
  await $`mcp-filesystem`;
  await $`;;`;
  await $`2)`;
  console.log("Starting enhanced MCP server...");
  await $`mcp-filesystem-enhanced`;
  await $`;;`;
  await $`*)`;
  console.log("Invalid choice. Starting standard MCP...");
  await $`mcp-filesystem`;
  await $`;;`;
  await $`esac`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}