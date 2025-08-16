#!/usr/bin/env node

import { ChatServer } from './server/chat-server';
import chalk from 'chalk';

const PORT = parseInt(process.env.CHAT_PORT || '3000', 10);

async function main() {
  console.log(chalk.bold.green('\n🚀 Starting CLI Chat Room Server'));
  console.log(chalk.gray('═'.repeat(40)));

  const server = new ChatServer(PORT);

  try {
    await server.start();
    console.log(chalk.green(`🔄 Server is ready!`));
    console.log(chalk.gray(`\nClients can connect using:`));
    console.log(chalk.cyan(`  npm run client <username> <roomId>`));
    console.log(chalk.magenta(`  npm run agent <roomId> [agentName]`));
    console.log(chalk.gray('\nPress Ctrl+C to stop the server\n'));

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\nShutting down server...'));
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  }
}

main();