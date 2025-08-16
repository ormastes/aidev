import WebSocket from 'ws';
import readline from 'readline';
import chalk from 'chalk';
import { WSMessage, WSEventType, MessageType } from '../types/chat';

interface ChatClientConfig {
  serverUrl: string;
  username: string;
  roomId: string;
  isAgent?: boolean;
}

export class ChatClient {
  private ws?: WebSocket;
  private rl: readline.Interface;
  private config: ChatClientConfig;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config: ChatClientConfig) {
    this.config = config;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan(`${config.username}> `)
    });

    this.setupReadline();
  }

  private setupReadline() {
    this.rl.on('line', (input) => {
      if (!this.connected) {
        console.log(chalk.red('Not connected to server'));
        this.rl.prompt();
        return;
      }

      const trimmed = input.trim();
      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      // Handle commands
      if (trimmed.startsWith('/')) {
        this.handleCommand(trimmed);
      } else {
        // Send regular message
        this.sendMessage({
          type: WSEventType.SEND_MESSAGE,
          payload: { content: trimmed },
          timestamp: new Date()
        });
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.disconnect();
      process.exit(0);
    });
  }

  async connect(): Promise<void> {
    console.log(chalk.yellow(`Connecting to ${this.config.serverUrl}...`));

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.serverUrl);

      this.ws.on('open', () => {
        console.log(chalk.green('Connected to server!'));
        this.connected = true;
        this.reconnectAttempts = 0;

        // Join room
        const joinMessage = {
          type: WSEventType.JOIN_ROOM,
          payload: {
            roomId: this.config.roomId,
            username: this.config.username,
            isAgent: this.config.isAgent
          },
          timestamp: new Date()
        };
        
        console.log(chalk.gray(`Sending join message: ${JSON.stringify(joinMessage)}`));
        this.sendMessage(joinMessage);

        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleServerMessage(message);
        } catch (error) {
          console.error(chalk.red('Error parsing server message:'), error);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        console.log(chalk.yellow('\nDisconnected from server'));
        this.handleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error(chalk.red('WebSocket error:'), error.message);
        reject(error);
      });
    });
  }

  private handleServerMessage(message: WSMessage) {
    switch (message.type) {
      case WSEventType.ROOM_STATE:
        this.displayRoomState(message.payload);
        break;

      case WSEventType.NEW_MESSAGE:
        this.displayMessage(message.payload);
        break;

      case WSEventType.USER_JOINED:
        this.displaySystemMessage(`${message.payload.user.username} joined the room`);
        break;

      case WSEventType.USER_LEFT:
        this.displaySystemMessage(`${message.payload.message.content}`);
        break;

      case WSEventType.ERROR:
        console.error(chalk.red(`Server error: ${message.payload.error}`));
        break;

      case WSEventType.AGENT_REQUEST:
        if (this.config.isAgent) {
          this.handleAgentRequest(message.payload);
        }
        break;
    }

    this.rl.prompt();
  }

  private displayRoomState(room: any) {
    console.clear();
    console.log(chalk.bold.white(`\n=== ${room.name} ===`));
    console.log(chalk.gray(`Users: ${room.users.map((u: any) => u.username).join(', ')}`));
    
    if (room.coordinator) {
      console.log(chalk.magenta(`Coordinator: ${room.coordinator.username}`));
    }

    console.log(chalk.gray('\nRecent messages:'));
    console.log(chalk.gray('─'.repeat(50)));

    // Display last 10 messages
    const recentMessages = room.messages.slice(-10);
    recentMessages.forEach((msg: any) => {
      this.displayMessage(msg, false);
    });

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('\nType /help for commands\n'));
  }

  private displayMessage(message: any, withTimestamp: boolean = true) {
    const time = withTimestamp 
      ? chalk.gray(`[${new Date(message.timestamp).toLocaleTimeString()}] `)
      : '';

    switch (message.type) {
      case MessageType.USER_MESSAGE:
        console.log(`${time}${chalk.white(message.username)}: ${message.content}`);
        break;

      case MessageType.AGENT_MESSAGE:
        console.log(`${time}${chalk.magenta(`🤖 ${message.username}`)}: ${chalk.cyan(message.content)}`);
        break;

      case MessageType.SYSTEM_MESSAGE:
        console.log(`${time}${chalk.gray(`[System] ${message.content}`)}`);
        break;

      case MessageType.AGENT_ACTION:
        console.log(`${time}${chalk.blue(`[Agent Action] ${message.username}`)}: ${chalk.blue(message.content)}`);
        break;

      case MessageType.USER_JOINED:
      case MessageType.USER_LEFT:
        console.log(`${time}${chalk.yellow(`[${message.content}]`)}`);
        break;
    }
  }

  private displaySystemMessage(message: string) {
    console.log(chalk.yellow(`[${message}]`));
  }

  private handleCommand(input: string) {
    const parts = input.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case '/help':
        this.displayHelp();
        break;

      case '/quit':
      case '/exit':
        this.rl.close();
        break;

      case '/clear':
        console.clear();
        break;

      case '/users':
      case '/stats':
        // Send command to server
        this.sendMessage({
          type: WSEventType.SEND_COMMAND,
          payload: { command, args, userId: this.config.username },
          timestamp: new Date()
        });
        break;

      default:
        console.log(chalk.red(`Unknown command: ${command}`));
        console.log(chalk.gray('Type /help for available commands'));
    }
  }

  private displayHelp() {
    console.log(chalk.bold('\nAvailable commands:'));
    console.log(chalk.gray('  /help     - Show this help message'));
    console.log(chalk.gray('  /users    - List users in the room'));
    console.log(chalk.gray('  /stats    - Show room statistics'));
    console.log(chalk.gray('  /clear    - Clear the screen'));
    console.log(chalk.gray('  /quit     - Exit the chat'));
    console.log();
  }

  private handleAgentRequest(action: any) {
    // Agent-specific handling
    console.log(chalk.magenta(`\n[Agent Request] ${action.type}`));
    
    // Simulate processing
    setTimeout(() => {
      this.sendMessage({
        type: WSEventType.AGENT_REQUEST,
        payload: {
          type: action.type,
          payload: action.payload,
          result: `Processed ${action.type} request`
        },
        timestamp: new Date()
      });
    }, 1000);
  }

  private sendMessage(message: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(chalk.red('\nMax reconnection attempts reached. Exiting...'));
      this.rl.close();
      return;
    }

    this.reconnectAttempts++;
    console.log(chalk.yellow(`\nReconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`));

    setTimeout(() => {
      this.connect().catch(() => {
        // Error handled in connect method
      });
    }, 2000 * this.reconnectAttempts);
  }

  private disconnect() {
    if (this.ws) {
      this.sendMessage({
        type: WSEventType.LEAVE_ROOM,
        payload: {},
        timestamp: new Date()
      });
      this.ws.close();
    }
  }

  start() {
    console.log(chalk.bold.cyan(`\n🗨️  CLI Chat Client`));
    console.log(chalk.gray(`Username: ${this.config.username}`));
    console.log(chalk.gray(`Room: ${this.config.roomId}`));
    if (this.config.isAgent) {
      console.log(chalk.magenta(`Role: Coordinator Agent`));
    }
    console.log();

    this.connect()
      .then(() => {
        this.rl.prompt();
      })
      .catch((error) => {
        console.error(chalk.red('Failed to connect:'), error.message);
        process.exit(1);
      });
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(chalk.red('Usage: chat-client <username> <roomId> [--agent]'));
    process.exit(1);
  }

  const config: ChatClientConfig = {
    serverUrl: process.env.CHAT_SERVER_URL || 'ws://localhost:3000',
    username: args[0],
    roomId: args[1],
    isAgent: args.includes('--agent')
  };

  const client = new ChatClient(config);
  client.start();
}