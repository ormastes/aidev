#!/usr/bin/env bun

/**
 * MCP Server Entry Point for Bun
 * Optimized for Bun runtime
 */

import { FilesystemMCPServer } from './MCPServer';

// Bun-specific optimizations
if (typeof Bun !== 'undefined') {
  console.error('Running with Bun v' + Bun.version);
}

async function main() {
  try {
    const server = new FilesystemMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Run immediately (Bun supports top-level await)
await main();