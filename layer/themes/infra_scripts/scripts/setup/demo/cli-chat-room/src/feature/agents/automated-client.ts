import WebSocket from 'ws';
import { WSMessage, WSEventType, MessageType } from '../types/chat';
import chalk from 'chalk';

interface AutomatedClientConfig {
  serverUrl: string;
  username: string;
  roomId: string;
  isAgent?: boolean;
}

export class AutomatedClient {
  private ws?: WebSocket;
  private config: AutomatedClientConfig;
  private connected: boolean = false;
  private messageHandlers: ((message: WSMessage) => void)[] = [];

  constructor(config: AutomatedClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    console.log(chalk.yellow(`Connecting to ${this.config.serverUrl}...`));
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.serverUrl);

      this.ws.on('open', () => {
        console.log(chalk.green('Connected to server!'));
        this.connected = true;

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
        
        this.sendMessage(joinMessage);
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error(chalk.red('Error parsing server message:'), error);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        console.log(chalk.yellow('Disconnected from server'));
      });

      this.ws.on('error', (error) => {
        console.error(chalk.red('WebSocket error:'), error.message);
        reject(error);
      });
    });
  }

  private handleMessage(message: WSMessage) {
    // Call all registered handlers
    this.messageHandlers.forEach(handler => handler(message));

    // Basic logging
    switch (message.type) {
      case WSEventType.ROOM_STATE:
        const room = message.payload;
        console.log(chalk.blue(`📝 Joined room: ${room.id}`));
        console.log(chalk.gray(`Users: ${room.users.map((u: any) => u.username).join(', ')}`));
        if (room.coordinator) {
          console.log(chalk.magenta(`Coordinator: ${room.coordinator.username}`));
        }
        break;

      case WSEventType.NEW_MESSAGE:
        const msg = message.payload;
        if (msg.type === MessageType.USER_MESSAGE || msg.type === MessageType.AGENT_MESSAGE) {
          const icon = msg.type === MessageType.AGENT_MESSAGE ? '🤖' : '👤';
          console.log(chalk.cyan(`${icon} ${msg.username}: ${msg.content}`));
        }
        break;

      case WSEventType.USER_JOINED:
        console.log(chalk.green(`👋 ${message.payload.user.username} joined`));
        break;

      case WSEventType.USER_LEFT:
        console.log(chalk.yellow(`👋 ${message.payload.message.content}`));
        break;

      case WSEventType.ERROR:
        console.error(chalk.red(`❌ Server error: ${message.payload.error}`));
        break;
    }
  }

  onMessage(handler: (message: WSMessage) => void) {
    this.messageHandlers.push(handler);
  }

  sendMessage(message: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(chalk.red('Cannot send message: not connected'));
    }
  }

  sendChatMessage(content: string) {
    this.sendMessage({
      type: WSEventType.SEND_MESSAGE,
      payload: { content },
      timestamp: new Date()
    });
  }

  disconnect() {
    if (this.ws) {
      this.sendMessage({
        type: WSEventType.LEAVE_ROOM,
        payload: {},
        timestamp: new Date()
      });
      this.ws.close();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}