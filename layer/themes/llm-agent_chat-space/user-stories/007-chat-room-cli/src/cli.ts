#!/usr/bin/env node

import * as readline from 'readline';
import { EventEmitter } from '../../../../infra_external-log-lib/src';
import chalk from 'chalk';
import { CLIInterface } from './external/cli-interface';
import { ChatRoomPlatform } from './application/chat-room-platform';
import { MessageBroker } from './external/message-broker';
import { FileStorage } from './external/file-storage';
import { ContextProvider } from './external/context-provider';
import { PocketFlowConnector } from './external/pocketflow-connector';
import { path } from '../../../../infra_external-log-lib/src';
import { fs } from '../../../../infra_external-log-lib/src';

// ASCII Art Banner
const BANNER = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ╔═╗┬ ┬┌─┐┌┬┐  ╔═╗┌─┐┌─┐┌─┐┌─┐  ╔═╗╦  ╦             ║
║     ║  ├─┤├─┤ │   ╚═╗├─┘├─┤│  ├┤   ║  ║  ║              ║
║     ╚═╝┴ ┴┴ ┴ ┴   ╚═╝┴  ┴ ┴└─┘└─┘  ╚═╝╩═╝╩              ║
║                                                           ║
║           AI Development Platform Chat Interface         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

class ChatSpaceCLI {
  private rl: readline.Interface;
  private eventBus: EventEmitter;
  private cliInterface: CLIInterface;
  private platform: ChatRoomPlatform;
  private messageBroker: MessageBroker;
  private storage: FileStorage;
  private contextProvider: ContextProvider;
  private pocketflowConnector: PocketFlowConnector;
  private isRunning: boolean = false;

  constructor() {
    this.eventBus = new EventEmitter();
    this.setupComponents();
    this.setupReadline();
    this.setupEventHandlers();
  }

  async private setupComponents(): void {
    // Initialize storage
    const storagePath = path.join(process.cwd(), '.chat-space');
    if(!fs.existsSync(storagePath)) {
      await fileAPI.createDirectory(storagePath);
    }

    // Initialize components
    this.storage = new FileStorage(storagePath, this.eventBus);
    this.messageBroker = new MessageBroker(this.eventBus);
    this.contextProvider = new ContextProvider(this.eventBus);
    this.pocketflowConnector = new PocketFlowConnector(this.eventBus);
    
    // Initialize platform and CLI
    this.platform = new ChatRoomPlatform(
      this.eventBus,
      this.messageBroker,
      this.storage,
      this.contextProvider,
      this.pocketflowConnector
    );
    
    this.cliInterface = new CLIInterface(this.eventBus);
  }

  private setupReadline(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('chat> '),
      completer: this.autoComplete.bind(this)
    });
  }

  private setupEventHandlers(): void {
    // Handle incoming messages
    this.eventBus.on('message:received', (message) => {
      this.displayMessage(message);
    });

    // Handle system notifications
    this.eventBus.on('system:notification', (notification) => {
      console.log(chalk.yellow(`[System] ${notification}`));
    });

    // Handle workflow updates
    this.eventBus.on('workflow:update', (update) => {
      console.log(chalk.magenta(`[Workflow] ${update.status}: ${update.message}`));
    });

    // Handle errors
    this.eventBus.on('error', (error) => {
      console.error(chalk.red(`[Error] ${error.message}`));
    });
  }

  private autoComplete(line: string): [string[], string] {
    const commands = [
      '/help', '/register', '/login', '/create', '/join', '/leave',
      '/list', '/users', '/history', '/settings', '/quit',
      '/review', '/search', '/flow', '/context', '/workspace'
    ];
    
    const hits = commands.filter((cmd) => cmd.startsWith(line));
    return [hits.length ? hits : commands, line];
  }

  private displayMessage(message: any): void {
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    const userColor = this.getUserColor(message.username);
    
    let output = '';
    if(message.type === 'system') {
      output = chalk.yellow(`[${timestamp}] System: ${message.content}`);
    } else if (message.type === 'workflow') {
      output = chalk.magenta(`[${timestamp}] Workflow: ${message.content}`);
    } else {
      output = `[${timestamp}] ${userColor(message.username)}: ${message.content}`;
    }
    
    // Save cursor position, clear line, print message, restore prompt
    process.stdout.write('\x1B[s\x1B[2K\r' + output + '\n\x1B[u');
    this.rl.prompt(true);
  }

  private getUserColor(username: string): chalk.Chalk {
    const colors = [
      chalk.blue, chalk.green, chalk.yellow,
      chalk.magenta, chalk.cyan, chalk.white
    ];
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = ((hash << 5) - hash) + username.charCodeAt(i);
      hash = hash & hash;
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  private async processInput(input: string): Promise<void> {
    const trimmed = input.trim();
    
    if (!trimmed) {
      return;
    }
    
    try {
      if (trimmed.startsWith('/')) {
        // Process command
        const command = this.cliInterface.parseCommand(trimmed);
        const response = await this.cliInterface.processCommand(command);
        
        if (response.displayType === 'table' && response.data) {
          console.table(response.data);
        } else if (response.displayType === 'list' && Array.isArray(response.data)) {
          response.data.forEach(item => console.log(`  • ${item}`));
        } else if (response.displayType === 'json' && response.data) {
          console.log(JSON.stringify(response.data, null, 2));
        } else {
          console.log(response.success ? 
            chalk.green(response.message) : 
            chalk.red(response.message)
          );
        }
        
        // Handle quit command
        if (trimmed === '/quit') {
          this.shutdown();
        }
      } else {
        // Send as message to current room
        const state = this.cliInterface.getState();
        if (state.currentRoom) {
          await this.platform.sendMessage(state.currentRoom, trimmed);
        } else {
          console.log(chalk.yellow('You need to join a room first. Use /join <room-name>'));
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  }

  public async start(): Promise<void> {
    console.clear();
    console.log(chalk.cyan(BANNER));
    console.log(chalk.gray('Type /help for a list of commands\n'));
    
    this.isRunning = true;
    
    // Start components
    await this.platform.initialize();
    
    // Setup input handling
    this.rl.on('line', async (input) => {
      await this.processInput(input);
      if (this.isRunning) {
        this.rl.prompt();
      }
    });
    
    this.rl.on('close', () => {
      this.shutdown();
    });
    
    // Show initial prompt
    this.rl.prompt();
  }

  private shutdown(): void {
    if(!this.isRunning) return;
    
    this.isRunning = false;
    console.log(chalk.yellow('\nShutting down Chat Space CLI...'));
    
    // Cleanup
    this.platform.shutdown();
    this.messageBroker.disconnect();
    this.storage.cleanup();
    
    this.rl.close();
    process.exit(0);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nReceived SIGINT, shutting down gracefully...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\nReceived SIGTERM, shutting down gracefully...'));
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Main execution
async function main() {
  try {
    const cli = new ChatSpaceCLI();
    await cli.start();
  } catch (error) {
    console.error(chalk.red('Failed to start Chat Space CLI:'), error);
    process.exit(1);
  }
}

// Check if chalk is available
try {
  require.resolve('chalk');
} catch (e) {
  console.log('Installing required dependencies...');
  require('child_process').execSync('npm install chalk', { stdio: 'inherit' });
}

// Start the application
main().catch(console.error);