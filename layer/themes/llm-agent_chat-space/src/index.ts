#!/usr/bin/env node

import { ChatSpaceServer } from './ChatSpaceServer';
import { program } from 'commander';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// CLI configuration
program
  .name('chat-space')
  .description('Chat Space Server with MCP Integration')
  .version('1.0.0')
  .option('-p, --port <port>', 'Server port', '3456')
  .option('-m, --mcp-url <url>', 'MCP server URL', 'ws://localhost:8080')
  .option('--no-mcp', 'Disable MCP integration')
  .option('--cors <origin>', 'CORS origin', '*')
  .parse();

const options = program.opts();

// Create and start server
async function main() {
  console.log('Starting Chat Space Server...');
  console.log('Configuration:');
  console.log(`  Port: ${options.port}`);
  console.log(`  MCP: ${options.mcp ? 'Enabled' : 'Disabled'}`);
  
  if (options.mcp) {
    console.log(`  MCP Server: ${options.mcpUrl}`);
  }

  const server = new ChatSpaceServer({
    port: parseInt(options.port),
    mcpServerUrl: options.mcpUrl,
    enableMCP: options.mcp,
    corsOrigin: options.cors
  });

  try {
    await server.start();
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down Chat Space Server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nShutting down Chat Space Server...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { ChatSpace } from './ChatSpace';
export { ChatSpaceServer } from './ChatSpaceServer';
export { ChatSpaceMCPClient } from './mcp/ChatSpaceMCPClient';
export { ChatSpaceMCPBridge } from './mcp/ChatSpaceMCPBridge';