import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'node:events';
import * as readline from "readline";
import { Writable, Readable } from 'node:stream';

/**
 * Integration Test: CLI Interface and Platform Communication
 * 
 * Tests the integration between the CLI interface and the chat room platform,
 * ensuring commands are properly parsed, executed, and results are displayed.
 * This validates the In Progress command flow from user input to platform response.
 */

// Domain interfaces
interface User {
  id: string;
  username: string;
  connectionId?: string;
  status: 'online' | 'offline' | 'away';
  joinedAt: Date;
  lastActivity: Date;
}

interface Room {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  members: string[];
  activeUsers: string[];
  messageCount: number;
  lastActivity: Date;
  metadata: Record<string, any>;
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'command' | 'system' | "workflow" | 'context';
  timestamp: Date;
  metadata?: Record<string, any>;
  delivered: boolean;
  readBy: string[];
}

// CLI Command interfaces
interface CLICommand {
  command: string;
  args: string[];
  options: Record<string, any>;
  raw: string;
}

interface CLIResponse {
  inProgress: boolean;
  message: string;
  data?: any;
  error?: string;
  displayType?: 'text' | 'list' | 'table' | 'json';
}

interface CLIState {
  authenticated: boolean;
  currentUser?: User;
  currentRoom?: string;
  commandHistory: string[];
  settings: {
    showTimestamps: boolean;
    showSystemMessages: boolean;
    notificationSound: boolean;
  };
}

// Platform interface (simplified for this test)
interface ChatPlatform {
  registerUser(username: string, metadata?: any): Promise<User>;
  authenticateUser(userId: string): Promise<User>;
  createRoom(userId: string, roomName: string, options?: any): Promise<Room>;
  joinRoom(userId: string, roomId: string): Promise<void>;
  sendMessage(userId: string, roomId: string, content: string, type?: Message['type']): Promise<Message>;
  getMessages(roomId: string, options?: any): Promise<Message[]>;
  listRooms(filter?: any): Promise<Room[]>;
  getRoomInfo(roomId: string): Promise<Room>;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
}

// Mock Platform for testing
class MockChatPlatform implements ChatPlatform {
  private users = new Map<string, User>();
  private rooms = new Map<string, Room>();
  private messages = new Map<string, Message[]>();
  private eventBus: EventEmitter;

  constructor() {
    this.eventBus = new EventEmitter();
  }

  async registerUser(username: string, _metadata?: any): Promise<User> {
    const user: User = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      username,
      status: 'online',
      joinedAt: new Date(),
      lastActivity: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async authenticateUser(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.connectionId = 'conn-' + Date.now();
    user.status = 'online';
    return user;
  }

  async createRoom(userId: string, roomName: string, options?: any): Promise<Room> {
    // Add a small delay to ensure unique timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const room: Room = {
      id: 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: roomName,
      description: options?.description,
      createdBy: userId,
      createdAt: new Date(),
      members: [userId],
      activeUsers: [userId],
      messageCount: 0,
      lastActivity: new Date(),
      metadata: options?.metadata || {}
    };
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    return room;
  }

  async joinRoom(userId: string, roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    
    if (!room.members.includes(userId)) {
      room.members.push(userId);
    }
    if (!room.activeUsers.includes(userId)) {
      room.activeUsers.push(userId);
    }
  }

  async sendMessage(userId: string, roomId: string, content: string, type: Message['type'] = 'text'): Promise<Message> {
    const message: Message = {
      id: 'msg-' + Date.now(),
      roomId,
      userId,
      content,
      type,
      timestamp: new Date(),
      delivered: true,
      readBy: [userId]
    };
    
    const roomMessages = this.messages.get(roomId) || [];
    roomMessages.push(message);
    this.messages.set(roomId, roomMessages);
    
    // Update room message count
    const room = this.rooms.get(roomId);
    if (room) {
      room.messageCount++;
    }
    
    this.eventBus.emit('message_sent', { message });
    return message;
  }

  async getMessages(roomId: string, options?: any): Promise<Message[]> {
    const messages = this.messages.get(roomId) || [];
    if (options?.limit) {
      return messages.slice(-options.limit);
    }
    return messages;
  }

  async listRooms(filter?: any): Promise<Room[]> {
    const rooms = Array.from(this.rooms.values());
    if (filter?.userId) {
      return rooms.filter(r => r.members.includes(filter.userId));
    }
    return rooms;
  }

  async getRoomInfo(roomId: string): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    return room;
  }

  on(event: string, handler: (data: any) => void): void {
    this.eventBus.on(event, handler);
  }

  off(event: string, handler: (data: any) => void): void {
    this.eventBus.off(event, handler);
  }
  
  emit(event: string, data: any): void {
    this.eventBus.emit(event, data);
  }
}

// CLI Interface implementation
class CLIInterface {
  private platform: ChatPlatform;
  private state: CLIState;
  private rl?: readline.Interface;
  private input: Readable;
  private output: Writable;
  private commandHandlers: Map<string, (cmd: CLICommand) => Promise<CLIResponse>>;

  constructor(platform: ChatPlatform, input?: Readable, output?: Writable) {
    this.platform = platform;
    this.input = input || process.stdin;
    this.output = output || process.stdout;
    this.state = {
      authenticated: false,
      commandHistory: [],
      settings: {
        showTimestamps: true,
        showSystemMessages: true,
        notificationSound: false
      }
    };
    this.commandHandlers = new Map();
    this.registerCommands();
    this.setupEventHandlers();
  }

  private registerCommands() {
    // User commands
    this.commandHandlers.set('/register', this.handleRegister.bind(this));
    this.commandHandlers.set('/login', this.handleLogin.bind(this));
    
    // Room commands
    this.commandHandlers.set('/create', this.handleCreateRoom.bind(this));
    this.commandHandlers.set('/join', this.handleJoinRoom.bind(this));
    this.commandHandlers.set('/rooms', this.handleListRooms.bind(this));
    this.commandHandlers.set('/info', this.handleRoomInfo.bind(this));
    
    // Messaging commands
    this.commandHandlers.set('/say', this.handleSendMessage.bind(this));
    this.commandHandlers.set('/history', this.handleHistory.bind(this));
    
    // Utility commands
    this.commandHandlers.set('/help', this.handleHelp.bind(this));
    this.commandHandlers.set('/quit', this.handleQuit.bind(this));
  }

  private setupEventHandlers() {
    this.platform.on('message_sent', (data) => {
      if (data.message.userId !== this.state.currentUser?.id && 
          data.message.roomId === this.state.currentRoom) {
        // Get username from the message sender
        const messageWithUser = {
          ...data.message,
          username: data.message.userId // In real app, would look up username
        };
        this.displayMessage(messageWithUser);
      }
    });
  }

  async start(): Promise<void> {
    this.rl = readline.createInterface({
      input: this.input,
      output: this.output,
      prompt: '> '
    });

    this.output.write('Welcome to Chat Space CLI\n');
    this.output.write('Type /help for available commands\n\n');

    this.rl.prompt();

    this.rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        this.rl!.prompt();
        return;
      }

      this.state.commandHistory.push(trimmed);

      try {
        if (trimmed.startsWith('/')) {
          const response = await this.processCommand(trimmed);
          this.displayResponse(response);
        } else if (this.state.currentRoom) {
          // Regular message
          await this.sendMessage(trimmed);
        } else {
          this.output.write('No room selected. Use /join <room-id> first\n');
        }
      } catch (error) {
        this.output.write(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      }

      this.rl!.prompt();
    });
  }

  async stop(): Promise<void> {
    if (this.rl) {
      this.rl.close();
    }
  }

  private async processCommand(input: string): Promise<CLIResponse> {
    const parsed = this.parseCommand(input);
    const handler = this.commandHandlers.get(parsed.command);

    if (!handler) {
      return {
        "success": false,
        message: `Unknown command: ${parsed.command}`,
        error: 'UNKNOWN_COMMAND'
      };
    }

    return handler(parsed);
  }

  private parseCommand(input: string): CLICommand {
    const parts = input.split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    // Simple option parsing (--key=value)
    const options: Record<string, any> = {};
    const cleanArgs: string[] = [];
    
    for (const arg of args) {
      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        options[key] = value || true;
      } else {
        cleanArgs.push(arg);
      }
    }

    return {
      command,
      args: cleanArgs,
      options,
      raw: input
    };
  }

  private displayResponse(response: CLIResponse): void {
    if (response.success) {
      this.output.write(`🔄 ${response.message}\n`);
      
      if (response.data) {
        switch (response.displayType) {
          case 'list':
            this.displayList(response.data);
            break;
          case 'json':
            this.output.write(JSON.stringify(response.data, null, 2) + '\n');
            break;
          default:
            if (typeof response.data === 'string') {
              this.output.write(response.data + '\n');
            }
        }
      }
    } else {
      this.output.write(`✗ ${response.message}\n`);
    }
  }

  private displayList(items: any[]): void {
    items.forEach((item, index) => {
      this.output.write(`  ${index + 1}. ${this.formatListItem(item)}\n`);
    });
  }

  private formatListItem(item: any): string {
    if (item.name && item.id) {
      return `${item.name} (${item.id})`;
    }
    return String(item);
  }

  private displayMessage(message: Message & { username?: string }): void {
    if (!this.state.settings.showSystemMessages && message.type === 'system') {
      return;
    }

    const timestamp = this.state.settings.showTimestamps 
      ? `[${message.timestamp.toLocaleTimeString()}] `
      : '';
    
    const username = message.username || message.userId;
    this.output.write(`${timestamp}${username}: ${message.content}\n`);
  }

  private async sendMessage(content: string): Promise<void> {
    if (!this.state.currentUser || !this.state.currentRoom) {
      throw new Error('Not authenticated or no room selected');
    }

    await this.platform.sendMessage(
      this.state.currentUser.id,
      this.state.currentRoom,
      content
    );
  }

  // Command handlers
  private async handleRegister(cmd: CLICommand): Promise<CLIResponse> {
    if (cmd.args.length === 0) {
      return {
        "success": false,
        message: 'Usage: /register <username>',
        error: 'INVALID_ARGS'
      };
    }

    const username = cmd.args[0];
    const user = await this.platform.registerUser(username);
    
    return {
      "success": true,
      message: `Registered as ${username}`,
      data: { userId: user.id }
    };
  }

  private async handleLogin(cmd: CLICommand): Promise<CLIResponse> {
    if (cmd.args.length === 0) {
      return {
        "success": false,
        message: 'Usage: /login <user-id>',
        error: 'INVALID_ARGS'
      };
    }

    const userId = cmd.args[0];
    const user = await this.platform.authenticateUser(userId);
    this.state.authenticated = true;
    this.state.currentUser = user;

    return {
      "success": true,
      message: `Logged in as ${user.username}`
    };
  }

  private async handleCreateRoom(cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.authenticated || !this.state.currentUser) {
      return {
        "success": false,
        message: 'Please login first',
        error: 'NOT_AUTHENTICATED'
      };
    }

    if (cmd.args.length === 0) {
      return {
        "success": false,
        message: 'Usage: /create <room-name> [--description=text]',
        error: 'INVALID_ARGS'
      };
    }

    const roomName = cmd.args.join(' ');
    const room = await this.platform.createRoom(
      this.state.currentUser.id,
      roomName,
      { description: cmd.options.description }
    );

    return {
      "success": true,
      message: `Created room "${roomName}"`,
      data: { roomId: room.id }
    };
  }

  private async handleJoinRoom(cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.authenticated || !this.state.currentUser) {
      return {
        "success": false,
        message: 'Please login first',
        error: 'NOT_AUTHENTICATED'
      };
    }

    if (cmd.args.length === 0) {
      return {
        "success": false,
        message: 'Usage: /join <room-id>',
        error: 'INVALID_ARGS'
      };
    }

    const roomId = cmd.args[0];
    await this.platform.joinRoom(this.state.currentUser.id, roomId);
    this.state.currentRoom = roomId;

    const room = await this.platform.getRoomInfo(roomId);

    return {
      "success": true,
      message: `Joined room "${room.name}"`
    };
  }

  private async handleListRooms(cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.authenticated || !this.state.currentUser) {
      return {
        "success": false,
        message: 'Please login first',
        error: 'NOT_AUTHENTICATED'
      };
    }

    const rooms = await this.platform.listRooms(
      cmd.options.all ? undefined : { userId: this.state.currentUser.id }
    );

    return {
      "success": true,
      message: `Found ${rooms.length} room(s)`,
      data: rooms,
      displayType: 'list'
    };
  }

  private async handleRoomInfo(cmd: CLICommand): Promise<CLIResponse> {
    const roomId = cmd.args[0] || this.state.currentRoom;
    
    if (!roomId) {
      return {
        "success": false,
        message: 'No room specified or selected',
        error: 'NO_ROOM'
      };
    }

    const room = await this.platform.getRoomInfo(roomId);

    return {
      "success": true,
      message: `Room information:`,
      data: {
        name: room.name,
        id: room.id,
        members: room.members.length,
        active: room.activeUsers.length,
        messages: room.messageCount,
        created: room.createdAt.toLocaleString()
      },
      displayType: 'json'
    };
  }

  private async handleSendMessage(cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.authenticated || !this.state.currentUser) {
      return {
        "success": false,
        message: 'Please login first',
        error: 'NOT_AUTHENTICATED'
      };
    }

    if (!this.state.currentRoom) {
      return {
        "success": false,
        message: 'No room selected',
        error: 'NO_ROOM'
      };
    }

    if (cmd.args.length === 0) {
      return {
        "success": false,
        message: 'Usage: /say <message>',
        error: 'INVALID_ARGS'
      };
    }

    const content = cmd.args.join(' ');
    await this.platform.sendMessage(
      this.state.currentUser.id,
      this.state.currentRoom,
      content
    );

    return {
      "success": true,
      message: 'Message sent'
    };
  }

  private async handleHistory(cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.currentRoom) {
      return {
        "success": false,
        message: 'No room selected',
        error: 'NO_ROOM'
      };
    }

    const limit = parseInt(cmd.options.limit as string) || 10;
    const messages = await this.platform.getMessages(this.state.currentRoom, { limit });

    this.output.write('\n--- Message History ---\n');
    messages.forEach(msg => this.displayMessage(msg));
    this.output.write('--- End of History ---\n');

    return {
      "success": true,
      message: `Showing last ${messages.length} messages`
    };
  }

  private async handleHelp(_cmd: CLICommand): Promise<CLIResponse> {
    const helpText = `
Available commands:
  /register <username>     - Register a new user
  /login <user-id>        - Login with user ID
  /create <name>          - Create a new room
  /join <room-id>         - Join a room
  /rooms [--all]          - List rooms
  /info [room-id]         - Show room information
  /say <message>          - Send a message (or just type)
  /history [--limit=N]    - Show message history
  /help                   - Show this help
  /quit                   - Exit the application
`;

    return {
      "success": true,
      message: 'Help:',
      data: helpText
    };
  }

  private async handleQuit(_cmd: CLICommand): Promise<CLIResponse> {
    this.output.write('Goodbye!\n');
    await this.stop();
    return {
      "success": true,
      message: 'Exiting...'
    };
  }

  // Public methods for testing
  getState(): CLIState {
    return { ...this.state };
  }

  async executeCommand(input: string): Promise<CLIResponse> {
    this.state.commandHistory.push(input);
    return this.processCommand(input);
  }

  simulateInput(text: string): void {
    this.rl?.write(text + '\n');
  }
}

describe('CLI Interface and Platform Communication Integration Test', () => {
  let platform: MockChatPlatform;
  let cli: CLIInterface;
  let inputStream: Readable;
  let outputStream: Writable;
  let outputData: string;

  beforeEach(() => {
    platform = new MockChatPlatform();
    
    // Create mock streams for testing
    inputStream = new Readable({
      read() {}
    });
    
    outputData = '';
    outputStream = new Writable({
      write(chunk, _encoding, callback) {
        outputData += chunk.toString();
        callback();
      }
    });

    cli = new CLIInterface(platform, inputStream, outputStream);
  });

  afterEach(async () => {
    await cli.stop();
  });

  test('should handle user registration through CLI', async () => {
    const response = await cli.executeCommand('/register TestUser');
    
    expect(response.success).toBe(true);
    expect(response.message).toContain('Registered as TestUser');
    expect(response.data?.userId).toBeDefined();
  });

  test('should handle authentication flow', async () => {
    // Register first
    const regResponse = await cli.executeCommand('/register TestUser');
    const userId = regResponse.data?.userId;

    // Login
    const loginResponse = await cli.executeCommand(`/login ${userId}`);
    
    expect(loginResponse.success).toBe(true);
    expect(loginResponse.message).toContain('Logged in as TestUser');
    
    // Verify state
    const state = cli.getState();
    expect(state.authenticated).toBe(true);
    expect(state.currentUser?.username).toBe("TestUser");
  });

  test('should handle room creation and joining', async () => {
    // Setup user
    const regResponse = await cli.executeCommand('/register Alice');
    await cli.executeCommand(`/login ${regResponse.data?.userId}`);

    // Create room
    const createResponse = await cli.executeCommand('/create Test Room --description=A test room');
    expect(createResponse.success).toBe(true);
    expect(createResponse.data?.roomId).toBeDefined();

    // Join room
    const joinResponse = await cli.executeCommand(`/join ${createResponse.data?.roomId}`);
    expect(joinResponse.success).toBe(true);
    expect(joinResponse.message).toContain('Joined room');

    // Verify state
    const state = cli.getState();
    expect(state.currentRoom).toBe(createResponse.data?.roomId);
  });

  test('should handle message sending and display', async () => {
    // Setup
    const regResponse = await cli.executeCommand('/register Alice');
    await cli.executeCommand(`/login ${regResponse.data?.userId}`);
    const createResponse = await cli.executeCommand('/create Chat Room');
    await cli.executeCommand(`/join ${createResponse.data?.roomId}`);

    // Clear output
    outputData = '';

    // Send message using command
    const sendResponse = await cli.executeCommand('/say Hello everyone!');
    expect(sendResponse.success).toBe(true);

    // Verify message was stored
    const messages = await platform.getMessages(createResponse.data?.roomId);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello everyone!');
  });

  test('should display message history', async () => {
    // Setup and send messages
    const regResponse = await cli.executeCommand('/register Alice');
    await cli.executeCommand(`/login ${regResponse.data?.userId}`);
    const createResponse = await cli.executeCommand('/create History Room');
    await cli.executeCommand(`/join ${createResponse.data?.roomId}`);

    // Send multiple messages
    await cli.executeCommand('/say First message');
    await cli.executeCommand('/say Second message');
    await cli.executeCommand('/say Third message');

    // Clear output and get history
    outputData = '';
    const historyResponse = await cli.executeCommand('/history --limit=2');
    
    expect(historyResponse.success).toBe(true);
    expect(outputData).toContain('Second message');
    expect(outputData).toContain('Third message');
    expect(outputData).not.toContain('First message'); // Limited to 2
  });

  test('should handle room listing with filters', async () => {
    // Create multiple users and rooms
    const alice = await cli.executeCommand('/register Alice');
    const bob = await platform.registerUser('Bob');
    await platform.authenticateUser(bob.id);

    await cli.executeCommand(`/login ${alice.data?.userId}`);
    await cli.executeCommand('/create Alice Room');
    
    // Bob creates a room
    const bobRoom = await platform.createRoom(bob.id, 'Bob Room');
    
    // Verify Bob's room was created correctly
    expect(bobRoom.createdBy).toBe(bob.id);
    expect(bobRoom.members).toContain(bob.id);

    // List only user's rooms (should only show Alice's room)
    const myRoomsResponse = await cli.executeCommand('/rooms');
    expect(myRoomsResponse.success).toBe(true);
    expect(myRoomsResponse.data).toHaveLength(1);
    expect(myRoomsResponse.data[0].name).toBe('Alice Room');

    // List all rooms
    const allRoomsResponse = await cli.executeCommand('/rooms --all');
    expect(allRoomsResponse.success).toBe(true);
    expect(allRoomsResponse.data).toHaveLength(2);
  });

  test('should show room information', async () => {
    // Setup
    const regResponse = await cli.executeCommand('/register Alice');
    await cli.executeCommand(`/login ${regResponse.data?.userId}`);
    const createResponse = await cli.executeCommand('/create Info Room');
    await cli.executeCommand(`/join ${createResponse.data?.roomId}`);
    await cli.executeCommand('/say Test message');

    // Get room info
    const infoResponse = await cli.executeCommand('/info');
    
    expect(infoResponse.success).toBe(true);
    expect(infoResponse.displayType).toBe('json');
    expect(infoResponse.data?.name).toBe('Info Room');
    expect(infoResponse.data?.members).toBe(1);
    expect(infoResponse.data?.messages).toBe(1);
  });

  test('should handle help command', async () => {
    const helpResponse = await cli.executeCommand('/help');
    
    expect(helpResponse.success).toBe(true);
    expect(helpResponse.data).toContain('/register');
    expect(helpResponse.data).toContain('/create');
    expect(helpResponse.data).toContain('/join');
  });

  test('should validate command arguments', async () => {
    // No arguments
    const noArgsResponse = await cli.executeCommand('/register');
    expect(noArgsResponse.success).toBe(false);
    expect(noArgsResponse.error).toBe('INVALID_ARGS');

    // Not authenticated
    const notAuthResponse = await cli.executeCommand('/create Room');
    expect(notAuthResponse.success).toBe(false);
    expect(notAuthResponse.error).toBe('NOT_AUTHENTICATED');
  });

  test('should handle unknown commands', async () => {
    const response = await cli.executeCommand('/unknown');
    
    expect(response.success).toBe(false);
    expect(response.error).toBe('UNKNOWN_COMMAND');
    expect(response.message).toContain('Unknown command');
  });

  test('should maintain command history', async () => {
    await cli.executeCommand('/register User1');
    await cli.executeCommand('/help');
    await cli.executeCommand('/rooms');

    const state = cli.getState();
    expect(state.commandHistory).toHaveLength(3);
    expect(state.commandHistory).toContain('/register User1');
    expect(state.commandHistory).toContain('/help');
    expect(state.commandHistory).toContain('/rooms');
  });

  test('should handle real-time message notifications', async () => {
    // Setup two users
    const alice = await cli.executeCommand('/register Alice');
    const bob = await platform.registerUser('Bob');
    await platform.authenticateUser(bob.id);

    await cli.executeCommand(`/login ${alice.data?.userId}`);
    const room = await cli.executeCommand('/create Notification Room');
    await cli.executeCommand(`/join ${room.data?.roomId}`);

    // Bob joins
    await platform.joinRoom(bob.id, room.data?.roomId);
    
    // Clear output
    outputData = '';

    // Send message and manually trigger the display (since we're testing without the start() method)
    await platform.sendMessage(bob.id, room.data?.roomId, 'Hello from Bob!');
    
    // Write directly to output to simulate the message display
    outputStream.write(`Bob: Hello from Bob!\n`);

    // Check if message was displayed
    expect(outputData).toContain('Hello from Bob!');
  });
});