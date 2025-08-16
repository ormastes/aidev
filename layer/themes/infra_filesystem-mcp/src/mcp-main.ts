#!/usr/bin/env node

/**
 * MCP Server Entry Point
 * Main executable for the filesystem MCP server
 */

import { FilesystemMCPServer } from './MCPServer';

async function main() {
  try {
    const server = new FilesystemMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}