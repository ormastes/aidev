#!/usr/bin/env node

/**
 * Enhanced All-in-One Chat Room with Configurable Coordinator
 * Supports Claude, Ollama, OpenAI, and custom coordinators via configuration
 */

import { EnhancedChatServer } from './server/enhanced-chat-server';
import { RoomConfig, CoordinatorType, CoordinatorConfig } from './config/room-config.schema';
import { validateCoordinatorConfig, getDefaultCoordinatorConfig } from './agents/coordinator-factory';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { fs } from '../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../infra_external-log-lib/src';
import * as readline from 'readline';
import { WebSocket } from 'ws';

interface EnhancedAllInOneConfig {
  serverPort?: number;
  roomId?: string;
  coordinatorType?: CoordinatorType;
  coordinatorConfig?: Partial<CoordinatorConfig>;
  autoJoinUser?: boolean;
  userName?: string;
  configFile?: string;
}

class EnhancedAllInOneChatRoom {
  private server: EnhancedChatServer;
  private config: Required<Omit<EnhancedAllInOneConfig, 'coordinatorConfig' | 'configFile'>>;
  private roomConfig: RoomConfig;
  private userProcess?: any;
  private ws?: WebSocket;
  private rl?: readline.Interface;

  constructor(config: EnhancedAllInOneConfig = {}) {
    // Load configuration from file if specified
    if (config.configFile) {
      this.roomConfig = this.loadConfigFile(config.configFile);
      this.config = {
        serverPort: config.serverPort || 3000,
        roomId: this.roomConfig.id,
        coordinatorType: this.roomConfig.coordinator.type,
        autoJoinUser: config.autoJoinUser ?? true,
        userName: config.userName || 'User'
      };
    } else {
      this.config = {
        serverPort: config.serverPort || 3000,
        roomId: config.roomId || 'enhanced-chat',
        coordinatorType: config.coordinatorType || CoordinatorType.CLAUDE,
        autoJoinUser: config.autoJoinUser ?? true,
        userName: config.userName || 'User'
      };

      // Create room configuration
      this.roomConfig = {
        id: this.config.roomId,
        name: `${this.config.coordinatorType} Chat Room`,
        coordinator: {
          ...getDefaultCoordinatorConfig(this.config.coordinatorType),
          ...config.coordinatorConfig
        },
        features: {
          allowAgents: true,
          maxUsers: 50,
          messageHistory: 1000,
          enableCommands: true
        }
      };
    }

    // Create config directory
    const configDir = './config/rooms';
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Save room configuration
    const configPath = path.join(configDir, `${this.roomConfig.id}.json`);
    fs.writeFileSync(configPath, JSON.stringify(this.roomConfig, null, 2));

    this.server = new EnhancedChatServer(this.config.serverPort, configDir);
  }

  private loadConfigFile(configFile: string): RoomConfig {
    if (!fs.existsSync(configFile)) {
      throw new Error(`Configuration file not found: ${configFile}`);
    }

    try {
      const configData = fs.readFileSync(configFile, 'utf8');
      return JSON.parse(configData) as RoomConfig;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  async start() {
    console.log(chalk.bold.green('\n🚀 Starting Enhanced All-in-One Chat Room\n'));
    console.log(chalk.cyan(`Coordinator: ${this.roomConfig.coordinator.type}`));
    if (this.roomConfig.coordinator.model) {
      console.log(chalk.cyan(`Model: ${this.roomConfig.coordinator.model}`));
    }
    
    try {
      // Validate coordinator configuration
      const errors = validateCoordinatorConfig(this.roomConfig.coordinator);
      if (errors.length > 0) {
        console.error(chalk.red('Configuration errors:'));
        errors.forEach(err => console.error(chalk.red(`  - ${err}`)));
        process.exit(1);
      }

      // Step 1: Start the server
      console.log(chalk.cyan('\n📡 Starting enhanced chat server...'));
      this.server.start();
      console.log(chalk.green(`🔄 Server running on ws://localhost:${this.config.serverPort}`));
      
      // Wait for server to stabilize
      await this.delay(1000);
      
      // Step 2: Server will automatically initialize coordinator based on room config
      console.log(chalk.cyan(`\n🤖 Coordinator will be initialized automatically...`));
      console.log(chalk.gray(`Room ID: ${this.config.roomId}`));
      
      // Step 3: Connect user if auto-join is enabled
      if (this.config.autoJoinUser) {
        await this.delay(2000); // Give coordinator time to connect
        console.log(chalk.cyan(`\n👤 Connecting ${this.config.userName}...`));
        await this.connectUser();
      }
      
      console.log(chalk.bold.green('\n✨ Enhanced All-in-One Chat Room is ready!\n'));
      console.log(chalk.yellow('Type your messages below. Commands:'));
      console.log(chalk.gray('  /help - Show available commands'));
      console.log(chalk.gray('  /users - List users in room'));
      console.log(chalk.gray('  /config - Show room configuration'));
      console.log(chalk.gray('  /coordinator - Show coordinator information'));
      console.log(chalk.gray('  /quit - Exit the chat'));
      console.log(chalk.gray('  Ctrl+C - Exit immediately\n'));
      
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to start:'), error);
      this.shutdown();
      process.exit(1);
    }
  }

  private async connectUser() {
    const serverUrl = `ws://localhost:${this.config.serverPort}`;
    this.ws = new WebSocket(serverUrl);
    
    return new Promise<void>((resolve, reject) => {
      this.ws!.on('open', () => {
        // Join room
        this.ws!.send(JSON.stringify({
          type: 'join_room',
          payload: {
            roomId: this.config.roomId,
            username: this.config.userName,
            isAgent: false
          }
        }));
        
        // Setup message handling
        this.ws!.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleIncomingMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });
        
        // Setup input handling
        this.setupUserInput();
        
        resolve();
      });
      
      this.ws!.on('error', (error) => {
        console.error(chalk.red('Connection error:'), error);
        reject(error);
      });
      
      this.ws!.on('close', () => {
        console.log(chalk.yellow('\nDisconnected from server'));
        this.shutdown();
      });
    });
  }

  private handleIncomingMessage(message: any) {
    switch (message.type) {
      case 'room_state':
        // Room joined In Progress
        break;
      
      case 'new_message':
        const msg = message.payload;
        if (msg.username !== this.config.userName) {
          console.log(chalk.blue(`[${msg.username}]`), msg.content);
        }
        break;
      
      case 'user_joined':
        const joinMsg = message.payload.message;
        console.log(chalk.green(`→ ${joinMsg.content}`));
        break;
      
      case 'user_left':
        const leftMsg = message.payload.message;
        console.log(chalk.yellow(`← ${leftMsg.content}`));
        break;
      
      case 'system_message':
        console.log(chalk.gray(`[System] ${message.payload.content}`));
        break;
      
      case 'error':
        console.error(chalk.red(`[Error] ${message.payload.error}`));
        break;
    }
  }

  private setupUserInput() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: ''
    });
    
    this.rl.on('line', (input) => {
      if (input.trim()) {
        if (input === '/quit') {
          console.log(chalk.yellow('Goodbye!'));
          this.shutdown();
          process.exit(0);
        } else if (input.startsWith('/')) {
          // Send command
          const command = input.substring(1);
          this.ws!.send(JSON.stringify({
            type: 'command',
            payload: { command }
          }));
        } else {
          // Send message
          this.ws!.send(JSON.stringify({
            type: 'send_message',
            payload: { content: input }
          }));
        }
      }
    });
    
    this.rl.on('close', () => {
      this.shutdown();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  shutdown() {
    console.log(chalk.yellow('\n🔄 Shutting down...'));
    
    if (this.rl) {
      this.rl.close();
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    if (this.userProcess) {
      this.userProcess.kill();
    }
    
    this.server.stop();
    
    console.log(chalk.green('🔄 Shutdown In Progress'));
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let config: EnhancedAllInOneConfig = {};
  
  // Parse command line arguments
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
      
      case '--coordinator':
      case '-c':
        config.coordinatorType = args[++i] as CoordinatorType;
        break;
      
      case '--model':
      case '-m':
        if (!config.coordinatorConfig) config.coordinatorConfig = {};
        config.coordinatorConfig.model = args[++i];
        break;
      
      case '--config':
      case '-f':
        config.configFile = args[++i];
        break;
      
      case '--name':
      case '-n':
        config.userName = args[++i];
        break;
      
      case '--no-user':
        config.autoJoinUser = false;
        break;
      
      case '--help':
      case '-h':
        console.log(`
Enhanced All-in-One Chat Room

Usage: npm run chat:enhanced [options]

Options:
  -p, --port <port>         Server port (default: 3000)
  -r, --room <roomId>       Room ID (default: enhanced-chat)
  -c, --coordinator <type>  Coordinator type: claude, ollama, openai, custom, none (default: claude)
  -m, --model <model>       Model to use (coordinator-specific)
  -f, --config <file>       Load configuration from file
  -n, --name <username>     Your username (default: User)
  --no-user                 Don't auto-join as user
  -h, --help               Show this help

Examples:
  npm run chat:enhanced
  npm run chat:enhanced -c ollama -m deepseek-r1:32b
  npm run chat:enhanced -f config/rooms/claude-room.json
  npm run chat:enhanced -c claude -m claude-3-opus-20240229 -r opus-chat
`);
        process.exit(0);
    }
  }
  
  const chatRoom = new EnhancedAllInOneChatRoom(config);
  
  chatRoom.start().catch(error => {
    console.error(chalk.red('Failed to start:'), error);
    process.exit(1);
  });
  
  // Handle shutdown
  process.on('SIGINT', () => {
    chatRoom.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    chatRoom.shutdown();
    process.exit(0);
  });
}

export { EnhancedAllInOneChatRoom };