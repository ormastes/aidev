import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

// Import types from chat-space theme
export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'command' | 'system' | 'workflow';
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  messageCount: number;
  userCount: number;
  lastActivity: Date;
}

export interface ChatUser {
  id: string;
  username: string;
  connectionId?: string;
  registeredAt: Date;
}

export interface ChatSpaceConfig {
  chatSpacePath?: string;
  eventBus?: EventEmitter;
  autoJoinRooms?: string[];
  botUsername?: string;
}

export interface ChatCommand {
  command: string;
  args: string[];
  roomId: string;
  userId: string;
  raw: string;
}

export class ChatSpaceConnector extends EventEmitter {
  private chatSpacePath: string;
  private sharedEventBus?: EventEmitter;
  private connected: boolean;
  private currentRoom?: string;
  private currentUser?: ChatUser;
  private botUsername: string;
  private messageHandlers: Map<string, (message: ChatMessage) => Promise<void>>;
  private commandHandlers: Map<string, (command: ChatCommand) => Promise<void>>;

  constructor(config: ChatSpaceConfig = {}) {
    super();
    
    this.chatSpacePath = config.chatSpacePath || 
      path.join(__dirname, '../../../../../../chat-space');
    this.sharedEventBus = config.eventBus;
    this.connected = false;
    this.botUsername = config.botUsername || 'CoordinatorBot';
    this.messageHandlers = new Map();
    this.commandHandlers = new Map();

    // Register default command handlers
    this.registerDefaultHandlers();

    // Auto-join rooms if specified
    if (config.autoJoinRooms && config.autoJoinRooms.length > 0) {
      this.once('connected', () => {
        config.autoJoinRooms!.forEach(room => this.joinRoom(room));
      });
    }
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Check if chat-space is available
      const chatSpaceAvailable = await this.checkChatSpaceAvailability();
      if (!chatSpaceAvailable) {
        throw new Error('Chat-space theme not available');
      }

      // Register bot user
      await this.registerBot();

      // Set up event listeners
      this.setupEventListeners();

      this.connected = true;
      this.emit('connected', { 
        username: this.botUsername,
        userId: this.currentUser?.id 
      });

    } catch (error) {
      this.emit('error', {
        type: 'connection_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    // Leave current room if in one
    if (this.currentRoom) {
      await this.leaveRoom();
    }

    // Remove event listeners
    this.removeEventListeners();

    this.connected = false;
    this.currentUser = undefined;
    
    this.emit('disconnected');
  }

  async sendMessage(
    content: string,
    options: {
      roomId?: string;
      type?: 'text' | 'system' | 'workflow';
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to chat-space');
    }

    const roomId = options.roomId || this.currentRoom;
    if (!roomId) {
      throw new Error('No room specified or joined');
    }

    const message: Partial<ChatMessage> = {
      roomId,
      userId: this.currentUser!.id,
      username: this.botUsername,
      content,
      type: options.type || 'text',
      timestamp: new Date()
    };

    // Emit to chat-space
    this.emitToChatSpace('coordinator:send_message', {
      message,
      metadata: options.metadata
    });

    this.emit('message_sent', { message });
  }

  async joinRoom(roomId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to chat-space');
    }

    // Leave current room if in one
    if (this.currentRoom && this.currentRoom !== roomId) {
      await this.leaveRoom();
    }

    this.emitToChatSpace('coordinator:join_room', {
      roomId,
      userId: this.currentUser!.id
    });

    this.currentRoom = roomId;
    this.emit('room_joined', { roomId });
  }

  async leaveRoom(): Promise<void> {
    if (!this.connected || !this.currentRoom) {
      return;
    }

    this.emitToChatSpace('coordinator:leave_room', {
      roomId: this.currentRoom,
      userId: this.currentUser!.id
    });

    const leftRoom = this.currentRoom;
    this.currentRoom = undefined;
    
    this.emit('room_left', { roomId: leftRoom });
  }

  async executeCommand(command: string, roomId?: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to chat-space');
    }

    const targetRoom = roomId || this.currentRoom;
    if (!targetRoom) {
      throw new Error('No room specified or joined');
    }

    await this.sendMessage(command, {
      roomId: targetRoom,
      type: 'text'
    });
  }

  onMessage(pattern: string | RegExp, handler: (message: ChatMessage) => Promise<void>): void {
    const key = pattern instanceof RegExp ? pattern.source : pattern;
    this.messageHandlers.set(key, handler);
  }

  onCommand(command: string, handler: (command: ChatCommand) => Promise<void>): void {
    this.commandHandlers.set(command, handler);
  }

  private registerDefaultHandlers(): void {
    // Handle coordinator-specific commands
    this.onCommand('coordinator', async (cmd) => {
      const subCommand = cmd.args[0];
      
      switch (subCommand) {
        case 'status':
          await this.sendMessage('Coordinator is active and connected', {
            roomId: cmd.roomId,
            type: 'system'
          });
          break;
          
        case 'help':
          await this.sendMessage(
            'Coordinator commands:\n' +
            '• /coordinator status - Check coordinator status\n' +
            '• /coordinator permissions - Show current permissions\n' +
            '• /coordinator dangerous [on|off] - Toggle dangerous mode\n' +
            '• /coordinator session - Show session info',
            { roomId: cmd.roomId, type: 'system' }
          );
          break;
          
        case 'permissions':
          this.emit('permissions_requested', { roomId: cmd.roomId });
          break;
          
        case 'dangerous':
          const mode = cmd.args[1];
          this.emit('dangerous_mode_requested', { 
            roomId: cmd.roomId,
            enable: mode === 'on'
          });
          break;
          
        case 'session':
          this.emit('session_info_requested', { roomId: cmd.roomId });
          break;
      }
    });

    // Handle workflow triggers
    this.onCommand('workflow', async (cmd) => {
      this.emit('workflow_triggered', {
        roomId: cmd.roomId,
        userId: cmd.userId,
        workflow: cmd.args[0],
        args: cmd.args.slice(1)
      });
    });

    // Handle task management
    this.onCommand('task', async (cmd) => {
      this.emit('task_command', {
        roomId: cmd.roomId,
        userId: cmd.userId,
        action: cmd.args[0],
        args: cmd.args.slice(1)
      });
    });
  }

  private async checkChatSpaceAvailability(): Promise<boolean> {
    try {
      // Check if we can access chat-space module
      // In real implementation, this would check if the chat-space
      // EventEmitter is available or if the module is loaded
      if (this.sharedEventBus) {
        return true;
      }
      
      // Alternative: check if chat-space files exist
      const fs = await import('fs/promises');
      await fs.access(this.chatSpacePath);
      return true;
    } catch {
      return false;
    }
  }

  private async registerBot(): Promise<void> {
    const botUser: Partial<ChatUser> = {
      username: this.botUsername,
      registeredAt: new Date()
    };

    this.emitToChatSpace('coordinator:register_bot', { user: botUser });

    // Simulate registration response
    this.currentUser = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      username: this.botUsername,
      registeredAt: new Date()
    };
  }

  private setupEventListeners(): void {
    if (!this.sharedEventBus) return;

    // Listen for messages from chat-space
    this.sharedEventBus.on('chat:message_received', this.handleChatMessage.bind(this));
    this.sharedEventBus.on('chat:user_joined', this.handleUserJoined.bind(this));
    this.sharedEventBus.on('chat:user_left', this.handleUserLeft.bind(this));
    this.sharedEventBus.on('chat:room_created', this.handleRoomCreated.bind(this));
  }

  private removeEventListeners(): void {
    if (!this.sharedEventBus) return;

    this.sharedEventBus.off('chat:message_received', this.handleChatMessage.bind(this));
    this.sharedEventBus.off('chat:user_joined', this.handleUserJoined.bind(this));
    this.sharedEventBus.off('chat:user_left', this.handleUserLeft.bind(this));
    this.sharedEventBus.off('chat:room_created', this.handleRoomCreated.bind(this));
  }

  private async handleChatMessage(data: { message: ChatMessage }): Promise<void> {
    const { message } = data;

    // Ignore own messages
    if (message.userId === this.currentUser?.id) {
      return;
    }

    // Check if message is in current room
    if (message.roomId !== this.currentRoom) {
      return;
    }

    // Parse for commands
    if (message.content.startsWith('/')) {
      const parts = message.content.slice(1).split(' ');
      const command: ChatCommand = {
        command: parts[0],
        args: parts.slice(1),
        roomId: message.roomId,
        userId: message.userId,
        raw: message.content
      };

      // Check if we have a handler for this command
      const handler = this.commandHandlers.get(command.command);
      if (handler) {
        try {
          await handler(command);
        } catch (error) {
          this.emit('command_error', { command, error });
        }
      }
    } else {
      // Check message handlers
      for (const [pattern, handler] of this.messageHandlers) {
        const regex = new RegExp(pattern);
        if (regex.test(message.content)) {
          try {
            await handler(message);
          } catch (error) {
            this.emit('message_handler_error', { message, error });
          }
        }
      }
    }

    // Emit for general processing
    this.emit('chat_message', { message });
  }

  private handleUserJoined(data: { roomId: string; user: ChatUser }): void {
    if (data.roomId === this.currentRoom) {
      this.emit('user_joined', data);
    }
  }

  private handleUserLeft(data: { roomId: string; userId: string }): void {
    if (data.roomId === this.currentRoom) {
      this.emit('user_left', data);
    }
  }

  private handleRoomCreated(data: { room: ChatRoom }): void {
    this.emit('room_created', data);
  }

  private emitToChatSpace(event: string, data: any): void {
    if (this.sharedEventBus) {
      this.sharedEventBus.emit(event, data);
    } else {
      // Fallback: emit locally for testing
      this.emit(event, data);
    }
  }

  // Public getters
  isConnected(): boolean {
    return this.connected;
  }

  getCurrentRoom(): string | undefined {
    return this.currentRoom;
  }

  getCurrentUser(): ChatUser | undefined {
    return this.currentUser;
  }

  getBotUsername(): string {
    return this.botUsername;
  }

  // Utility methods for coordinator features
  async broadcastToAllRooms(message: string, rooms: string[]): Promise<void> {
    for (const roomId of rooms) {
      await this.sendMessage(message, { roomId, type: 'system' });
    }
  }

  async sendWorkflowUpdate(
    roomId: string,
    workflow: string,
    status: 'started' | 'In Progress' | 'failed',
    details?: any
  ): Promise<void> {
    const message = `Workflow ${workflow} ${status}` + 
                   (details ? `\nDetails: ${JSON.stringify(details, null, 2)}` : '');
    
    await this.sendMessage(message, {
      roomId,
      type: 'workflow',
      metadata: { workflow, status, details }
    });
  }

  async sendTaskUpdate(
    roomId: string,
    taskId: string,
    status: string,
    message: string
  ): Promise<void> {
    await this.sendMessage(
      `Task ${taskId}: ${status}\n${message}`,
      {
        roomId,
        type: 'system',
        metadata: { taskId, status }
      }
    );
  }
}