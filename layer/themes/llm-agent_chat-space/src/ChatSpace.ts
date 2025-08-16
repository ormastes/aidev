import { EventEmitter } from '../../infra_external-log-lib/src';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  userId: string;
  userName?: string;
  spaceId: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface ChatCommand {
  name: string;
  description: string;
  handler: (args: any, context: CommandContext) => Promise<any>;
}

export interface CommandContext {
  userId: string;
  userName?: string;
  spaceId: string;
  message: ChatMessage;
}

export interface ChatSpaceConfig {
  id?: string;
  name: string;
  description?: string;
  maxMessages?: number;
  maxUsers?: number;
  allowCommands?: boolean;
}

/**
 * Chat Space implementation
 * Core chat functionality with command support
 */
export class ChatSpace extends EventEmitter {
  private id: string;
  private name: string;
  private description: string;
  private messages: Map<string, ChatMessage[]> = new Map();
  private users: Map<string, Set<string>> = new Map(); // spaceId -> Set<userId>
  private commands: Map<string, ChatCommand> = new Map();
  private config: ChatSpaceConfig;

  constructor(config: ChatSpaceConfig) {
    super();
    this.config = config;
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.description = config.description || '';
    
    // Register default commands
    this.registerDefaultCommands();
  }

  /**
   * Register default chat commands
   */
  private registerDefaultCommands(): void {
    // Help command
    this.registerCommand({
      name: '/help',
      description: 'Show available commands',
      handler: async (args, context) => {
        const commands = Array.from(this.commands.values());
        const helpText = commands
          .map(cmd => `${cmd.name} - ${cmd.description}`)
          .join('\n');
        
        return {
          content: `Available commands:\n${helpText}`,
          type: 'help'
        };
      }
    });

    // List users command
    this.registerCommand({
      name: '/users',
      description: 'List users in current space',
      handler: async (args, context) => {
        const users = this.users.get(context.spaceId) || new Set();
        return {
          content: `Users in space: ${Array.from(users).join(', ')}`,
          type: 'user_list'
        };
      }
    });

    // Clear messages command
    this.registerCommand({
      name: '/clear',
      description: 'Clear chat messages',
      handler: async (args, context) => {
        this.messages.set(context.spaceId, []);
        this.emit('messages_cleared', { spaceId: context.spaceId });
        return {
          content: 'Chat messages cleared',
          type: 'clear'
        };
      }
    });
  }

  /**
   * Register a command
   */
  registerCommand(command: ChatCommand): void {
    this.commands.set(command.name, command);
    this.emit('command_registered', command);
  }

  /**
   * Send a message to the chat space
   */
  async sendMessage(params: {
    userId: string;
    userName?: string;
    spaceId: string;
    content: string;
    metadata?: any;
  }): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: uuidv4(),
      userId: params.userId,
      userName: params.userName,
      spaceId: params.spaceId,
      content: params.content,
      timestamp: new Date(),
      metadata: params.metadata
    };

    // Check if it's a command
    if (this.config.allowCommands !== false && params.content.startsWith('/')) {
      const result = await this.handleCommand(message);
      if (result) {
        // Send command result as a system message
        const responseMessage: ChatMessage = {
          id: uuidv4(),
          userId: 'system',
          userName: 'System',
          spaceId: params.spaceId,
          content: typeof result === 'string' ? result : result.content,
          timestamp: new Date(),
          metadata: { type: 'command_response', command: params.content, ...result }
        };
        
        this.storeMessage(responseMessage);
        this.emit('message', responseMessage);
        return responseMessage;
      }
    }

    // Store regular message
    this.storeMessage(message);
    this.emit('message', message);
    
    return message;
  }

  /**
   * Handle command execution
   */
  private async handleCommand(message: ChatMessage): Promise<any> {
    const parts = message.content.split(' ');
    const commandName = parts[0];
    const args = parts.slice(1).join(' ');

    const command = this.commands.get(commandName);
    if (!command) {
      // Check if it's an MCP-prefixed command
      if (commandName.startsWith('/mcp')) {
        this.emit('command', {
          name: commandName,
          args: args,
          userId: message.userId,
          spaceId: message.spaceId
        });
        return null; // Let MCP bridge handle it
      }
      
      return `Unknown command: ${commandName}. Type /help for available commands.`;
    }

    const context: CommandContext = {
      userId: message.userId,
      userName: message.userName,
      spaceId: message.spaceId,
      message
    };

    try {
      const result = await command.handler(args, context);
      this.emit('command_executed', { command: commandName, result, context });
      return result;
    } catch (error: any) {
      console.error(`Error executing command ${commandName}:`, error);
      return `Error executing command: ${error.message}`;
    }
  }

  /**
   * Store a message
   */
  private storeMessage(message: ChatMessage): void {
    if (!this.messages.has(message.spaceId)) {
      this.messages.set(message.spaceId, []);
    }

    const spaceMessages = this.messages.get(message.spaceId)!;
    spaceMessages.push(message);

    // Limit message history
    const maxMessages = this.config.maxMessages || 1000;
    if (spaceMessages.length > maxMessages) {
      this.messages.set(
        message.spaceId,
        spaceMessages.slice(-maxMessages)
      );
    }
  }

  /**
   * Get messages for a space
   */
  getMessages(spaceId: string, limit: number = 100): ChatMessage[] {
    const messages = this.messages.get(spaceId) || [];
    return messages.slice(-limit);
  }

  /**
   * Join a space
   */
  joinSpace(userId: string, spaceId: string): void {
    if (!this.users.has(spaceId)) {
      this.users.set(spaceId, new Set());
    }

    this.users.get(spaceId)!.add(userId);
    this.emit('user_joined', { userId, spaceId });
  }

  /**
   * Leave a space
   */
  leaveSpace(userId: string, spaceId: string): void {
    const spaceUsers = this.users.get(spaceId);
    if (spaceUsers) {
      spaceUsers.delete(userId);
      if (spaceUsers.size === 0) {
        this.users.delete(spaceId);
      }
    }
    
    this.emit('user_left', { userId, spaceId });
  }

  /**
   * Get users in a space
   */
  getUsers(spaceId: string): string[] {
    const users = this.users.get(spaceId);
    return users ? Array.from(users) : [];
  }

  /**
   * Create a new space
   */
  createSpace(name: string, description?: string): string {
    const spaceId = uuidv4();
    this.emit('space_created', { spaceId, name, description });
    return spaceId;
  }

  /**
   * Get chat space info
   */
  getInfo(): any {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      totalSpaces: this.messages.size,
      totalUsers: Array.from(this.users.values())
        .reduce((total, users) => total + users.size, 0),
      commands: Array.from(this.commands.keys())
    };
  }

  /**
   * Shutdown the chat space
   */
  shutdown(): void {
    this.removeAllListeners();
    this.messages.clear();
    this.users.clear();
    this.commands.clear();
  }
}