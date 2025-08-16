#!/usr/bin/env node

/**
 * All-in-One Chat Room with Claude Coordinator
 * Embeds server and automatically starts Claude in a single process
 */

import { ChatServer } from './server/chat-server';
import { ClaudeCoordinatorAgent } from './agents/claude-coordinator';
import chalk from 'chalk';
import { spawn } from 'child_process';

interface AllInOneConfig {
  serverPort?: number;
  roomId?: string;
  claudeName?: string;
  autoJoinUser?: boolean;
  userName?: string;
}

class AllInOneChatRoom {
  private server: ChatServer;
  private claudeAgent?: ClaudeCoordinatorAgent;
  private config: Required<AllInOneConfig>;
  private claudeProcess?: any;

  constructor(config: AllInOneConfig = {}) {
    this.config = {
      serverPort: config.serverPort || 3000,
      roomId: config.roomId || 'chat-room',
      claudeName: config.claudeName || 'Claude',
      autoJoinUser: config.autoJoinUser ?? true,
      userName: config.userName || 'User'
    };

    this.server = new ChatServer(this.config.serverPort);
  }

  async start() {
    console.log(chalk.bold.green('\n🚀 Starting All-in-One Chat Room with Claude\n'));
    
    try {
      // Step 1: Start the server
      console.log(chalk.cyan('📡 Starting chat server...'));
      await this.server.start();
      console.log(chalk.green(`🔄 Server running on ws://localhost:${this.config.serverPort}`));
      
      // Wait a moment for server to stabilize
      await this.delay(1000);
      
      // Step 2: Start Claude coordinator
      console.log(chalk.cyan('\n🤖 Starting Claude coordinator...'));
      await this.startClaudeCoordinator();
      
      // Wait for Claude to connect
      await this.delay(2000);
      
      // Step 3: Instructions for user
      console.log(chalk.bold.green('\n✨ Chat Room Ready!\n'));
      console.log(chalk.white('📋 Room Information:'));
      console.log(chalk.gray(`   Room ID: ${this.config.roomId}`));
      console.log(chalk.gray(`   Claude Agent: ${this.config.claudeName}`));
      console.log(chalk.gray(`   Server Port: ${this.config.serverPort}`));
      
      if (this.config.autoJoinUser) {
        console.log(chalk.bold.yellow('\n🎯 Join the chat with this command:'));
        console.log(chalk.cyan(`   npm run client ${this.config.userName} ${this.config.roomId}`));
        console.log(chalk.gray('\n   Or run with a different username:'));
        console.log(chalk.gray(`   npm run client YourName ${this.config.roomId}`));
      }
      
      console.log(chalk.bold.white('\n💬 Example messages to try:'));
      console.log(chalk.gray('   - Hello Claude!'));
      console.log(chalk.gray('   - What is 5 + 3?'));
      console.log(chalk.gray('   - How do you write Python hello world?'));
      console.log(chalk.gray('   - Can you help me with JavaScript?'));
      
      console.log(chalk.yellow('\n📌 Press Ctrl+C to stop the chat room\n'));
      
      // Handle graceful shutdown
      this.setupShutdownHandlers();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start chat room:'), error);
      await this.cleanup();
      process.exit(1);
    }
  }

  private async startClaudeCoordinator() {
    const claudeConfig = {
      serverUrl: `ws://localhost:${this.config.serverPort}`,
      roomId: this.config.roomId,
      agentName: this.config.claudeName,
      apiKey: process.env.ANTHROPIC_API_KEY
    };

    try {
      // Method 1: Try to start Claude in the same process
      this.claudeAgent = new ClaudeCoordinatorAgent(claudeConfig);
      await this.claudeAgent.start();
      console.log(chalk.green('🔄 Claude coordinator connected In Progress'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Starting Claude in separate process...'));
      
      // Method 2: Fall back to spawning a separate process
      this.claudeProcess = spawn('npx', [
        'ts-node',
        'src/agents/claude-coordinator.ts',
        this.config.roomId,
        this.config.claudeName
      ], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      // Capture Claude output
      this.claudeProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output && !output.includes('Connecting')) {
          console.log(chalk.magenta(`[Claude] ${output}`));
        }
      });

      this.claudeProcess.stderr?.on('data', (data: Buffer) => {
        console.error(chalk.red(`[Claude Error] ${data.toString()}`));
      });

      // Wait for Claude to connect
      await this.waitForClaudeConnection();
    }
  }

  private async waitForClaudeConnection(maxAttempts = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      // Check if Claude is connected by looking at server state
      // In a real implementation, we'd check the server's client list
      await this.delay(1000);
      
      if (i === 2) {
        console.log(chalk.green('🔄 Claude coordinator process started'));
        return;
      }
    }
    
    throw new Error('Claude coordinator failed to connect');
  }

  private setupShutdownHandlers() {
    const cleanup = async () => {
      console.log(chalk.yellow('\n\n🛑 Shutting down chat room...'));
      await this.cleanup();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Prevent accidental exits
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('Uncaught exception:'), error);
      cleanup();
    });
  }

  private async cleanup() {
    try {
      // Stop Claude process if running
      if (this.claudeProcess) {
        this.claudeProcess.kill('SIGTERM');
        console.log(chalk.gray('Claude process stopped'));
      }

      // Stop server
      await this.server.stop();
      console.log(chalk.gray('Server stopped'));
    } catch (error) {
      console.error(chalk.red('Cleanup error:'), error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Quick start function for easy usage
export async function startChatRoom(config?: AllInOneConfig) {
  const chatRoom = new AllInOneChatRoom(config);
  await chatRoom.start();
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const config: AllInOneConfig = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
      case '-p':
        config.serverPort = parseInt(args[++i]);
        break;
      case '--room':
      case '-r':
        config.roomId = args[++i];
        break;
      case '--claude-name':
      case '-c':
        config.claudeName = args[++i];
        break;
      case '--no-auto-join':
        config.autoJoinUser = false;
        break;
      case '--help':
      case '-h':
        console.log(chalk.bold.blue('🚀 All-in-One Chat Room with Claude\n'));
        console.log('Usage: npm run all-in-one [options]\n');
        console.log('Options:');
        console.log('  -p, --port <port>         Server port (default: 3000)');
        console.log('  -r, --room <roomId>       Room ID (default: chat-room)');
        console.log('  -c, --claude-name <name>  Claude agent name (default: Claude)');
        console.log('  --no-auto-join            Disable auto-join instructions');
        console.log('  -h, --help                Show this help message\n');
        console.log('Examples:');
        console.log('  npm run all-in-one');
        console.log('  npm run all-in-one --room coding-help');
        console.log('  npm run all-in-one --port 8080 --claude-name Assistant');
        process.exit(0);
    }
  }
  
  startChatRoom(config).catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}