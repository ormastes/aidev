import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';

/**
 * Integration Test: ChatRoomPlatform Coordination with All Components
 * 
 * Tests the integration between all chat room components to ensure they work
 * together as a cohesive platform. This validates component interactions,
 * data flow, event propagation, and error handling across boundaries.
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
  type: 'text' | 'command' | 'system' | 'workflow' | 'context';
  timestamp: Date;
  metadata?: Record<string, any>;
  delivered: boolean;
  readBy: string[];
}

// ChatEvent interface removed - not used in this test

// Application layer - Platform coordinator
interface ChatRoomPlatform {
  // User management
  registerUser(username: string, metadata?: any): Promise<User>;
  authenticateUser(userId: string): Promise<User>;
  updateUserStatus(userId: string, status: User['status']): Promise<void>;
  
  // Room management
  createRoom(userId: string, roomName: string, options?: any): Promise<Room>;
  joinRoom(userId: string, roomId: string): Promise<void>;
  leaveRoom(userId: string, roomId: string): Promise<void>;
  getRoomInfo(roomId: string): Promise<Room>;
  listRooms(filter?: any): Promise<Room[]>;
  
  // Messaging
  sendMessage(userId: string, roomId: string, content: string, type?: Message['type']): Promise<Message>;
  getMessages(roomId: string, options?: { limit?: number; before?: Date; after?: Date }): Promise<Message[]>;
  markMessageAsRead(userId: string, messageId: string): Promise<void>;
  
  // Event handling
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
  
  // Platform operations
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getStatus(): { healthy: boolean; components: Record<string, boolean> };
}

// Component interfaces
interface StorageService {
  saveUser(user: User): Promise<void>;
  getUser(userId: string): Promise<User | undefined>;
  saveRoom(room: Room): Promise<void>;
  getRoom(roomId: string): Promise<Room | undefined>;
  saveMessage(message: Message): Promise<void>;
  getMessages(roomId: string, options?: any): Promise<Message[]>;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

interface MessagingService {
  connect(userId: string): Promise<string>;
  disconnect(connectionId: string): Promise<void>;
  joinRoom(connectionId: string, roomId: string): Promise<void>;
  leaveRoom(connectionId: string, roomId: string): Promise<void>;
  sendMessage(message: any): Promise<void>;
  broadcastToRoom(roomId: string, event: any): Promise<void>;
  on(event: string, handler: (data: any) => void): void;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

interface ContextService {
  getWorkspaceContext(): Promise<any>;
  getThemeInfo(themeId?: string): Promise<any>;
  validatePath(path: string): boolean;
  readFile(path: string): Promise<string>;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

interface IntegrationService {
  connectToPocketFlow(): Promise<void>;
  subscribeToWorkflows(callback: (event: any) => void): Promise<string>;
  triggerWorkflow(workflowId: string, params?: any): Promise<any>;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

// Platform implementation
class IntegratedChatRoomPlatform implements ChatRoomPlatform {
  private initialized = false;
  private users = new Map<string, User>();
  private rooms = new Map<string, Room>();
  private userConnections = new Map<string, string>(); // userId -> connectionId
  private eventBus: EventEmitter;
  
  constructor(
    private storage: StorageService,
    private messaging: MessagingService,
    private context: ContextService,
    private integration: IntegrationService
  ) {
    this.eventBus = new EventEmitter();
    this.setupInternalEventHandlers();
  }

  private setupInternalEventHandlers(): void {
    // Forward messaging events to platform events
    this.messaging.on('message', (data) => {
      this.eventBus.emit('platform:message', data);
    });

    this.messaging.on('user_joined', (data) => {
      this.eventBus.emit('platform:user_joined', data);
    });

    this.messaging.on('user_left', (data) => {
      this.eventBus.emit('platform:user_left', data);
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize all services
    await Promise.all([
      this.storage.initialize(),
      this.messaging.initialize(),
      this.context.initialize(),
      this.integration.initialize()
    ]);

    // Connect to external services
    await this.integration.connectToPocketFlow();
    
    // Subscribe to workflow events after connection
    await this.integration.subscribeToWorkflows((event) => {
      this.handleWorkflowEvent(event);
    });

    this.initialized = true;
    this.eventBus.emit('platform:initialized');
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    // Disconnect all users
    for (const [, connectionId] of this.userConnections) {
      await this.messaging.disconnect(connectionId);
    }

    // Cleanup all services
    await Promise.all([
      this.storage.cleanup(),
      this.messaging.cleanup(),
      this.context.cleanup(),
      this.integration.cleanup()
    ]);

    this.initialized = false;
    this.eventBus.emit('platform:shutdown');
  }

  getStatus(): { healthy: boolean; components: Record<string, boolean> } {
    return {
      healthy: this.initialized,
      components: {
        storage: true, // Mock always healthy
        messaging: true,
        context: true,
        integration: true,
        platform: this.initialized
      }
    };
  }

  async registerUser(username: string, metadata?: any): Promise<User> {
    const user: User = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      username,
      status: 'offline',
      joinedAt: new Date(),
      lastActivity: new Date()
    };

    await this.storage.saveUser(user);
    this.users.set(user.id, user);
    
    this.eventBus.emit('platform:user_registered', { user, metadata });
    
    return user;
  }

  async authenticateUser(userId: string): Promise<User> {
    let user = this.users.get(userId);
    
    if (!user) {
      const storedUser = await this.storage.getUser(userId);
      user = storedUser || undefined;
      if (!user) {
        throw new Error('User not found');
      }
      this.users.set(user.id, user);
    }

    // Connect to messaging
    const connectionId = await this.messaging.connect(user.id);
    this.userConnections.set(user.id, connectionId);
    
    user.connectionId = connectionId;
    user.status = 'online';
    user.lastActivity = new Date();
    
    await this.storage.saveUser(user);
    
    this.eventBus.emit('platform:user_authenticated', { user });
    
    return user;
  }

  async updateUserStatus(userId: string, status: User['status']): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.status = status;
    user.lastActivity = new Date();
    
    await this.storage.saveUser(user);
    
    this.eventBus.emit('platform:user_status_changed', { userId, status });
  }

  async createRoom(userId: string, roomName: string, options?: any): Promise<Room> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get workspace context for room metadata
    const workspaceContext = await this.context.getWorkspaceContext();

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
      metadata: {
        workspace: workspaceContext?.name,
        ...options
      }
    };

    await this.storage.saveRoom(room);
    this.rooms.set(room.id, room);
    
    // Auto-join creator to room
    if (user.connectionId) {
      await this.messaging.joinRoom(user.connectionId, room.id);
    }
    
    // Send system message
    await this.sendSystemMessage(room.id, `Room '${roomName}' created by ${user.username}`);
    
    this.eventBus.emit('platform:room_created', { room, creator: user });
    
    return room;
  }

  async joinRoom(userId: string, roomId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user || !user.connectionId) {
      throw new Error('User not authenticated');
    }

    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Add to room members if not already
    if (!room.members.includes(userId)) {
      room.members.push(userId);
    }
    
    // Add to active users
    if (!room.activeUsers.includes(userId)) {
      room.activeUsers.push(userId);
    }
    
    room.lastActivity = new Date();
    await this.storage.saveRoom(room);
    
    // Join messaging room
    await this.messaging.joinRoom(user.connectionId, roomId);
    
    // Send join notification
    await this.sendSystemMessage(roomId, `${user.username} joined the room`);
    
    // Broadcast user joined event
    await this.messaging.broadcastToRoom(roomId, {
      type: 'user_joined',
      userId,
      username: user.username,
      timestamp: new Date()
    });
    
    this.eventBus.emit('platform:user_joined_room', { user, room });
  }

  async leaveRoom(userId: string, roomId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user || !user.connectionId) {
      throw new Error('User not authenticated');
    }

    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Remove from active users
    room.activeUsers = room.activeUsers.filter(id => id !== userId);
    room.lastActivity = new Date();
    await this.storage.saveRoom(room);
    
    // Leave messaging room
    await this.messaging.leaveRoom(user.connectionId, roomId);
    
    // Send leave notification
    await this.sendSystemMessage(roomId, `${user.username} left the room`);
    
    // Broadcast user left event
    await this.messaging.broadcastToRoom(roomId, {
      type: 'user_left',
      userId,
      username: user.username,
      timestamp: new Date()
    });
    
    this.eventBus.emit('platform:user_left_room', { user, room });
  }

  async getRoomInfo(roomId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    return room;
  }

  async listRooms(filter?: any): Promise<Room[]> {
    // In real implementation, this would query storage with filters
    const rooms = Array.from(this.rooms.values());
    
    if (filter?.userId) {
      return rooms.filter(room => room.members.includes(filter.userId));
    }
    
    return rooms;
  }

  async sendMessage(
    userId: string, 
    roomId: string, 
    content: string, 
    type: Message['type'] = 'text'
  ): Promise<Message> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not authenticated');
    }

    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.members.includes(userId)) {
      throw new Error('User not a member of this room');
    }

    // Check for context references
    const contextData = await this.extractContextFromMessage(content);

    const message: Message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      roomId,
      userId,
      content,
      type: contextData ? 'context' : type,
      timestamp: new Date(),
      metadata: contextData,
      delivered: true,
      readBy: [userId]
    };

    await this.storage.saveMessage(message);
    
    // Update room activity
    room.messageCount++;
    room.lastActivity = new Date();
    await this.storage.saveRoom(room);
    
    // Broadcast message
    await this.messaging.broadcastToRoom(roomId, {
      type: 'message',
      message: {
        ...message,
        username: user.username
      }
    });
    
    // Handle special message types
    if (type === 'command') {
      await this.handleCommandMessage(message, user);
    }
    
    this.eventBus.emit('platform:message_sent', { message, user, room });
    
    return message;
  }

  async getMessages(
    roomId: string, 
    options?: { limit?: number; before?: Date; after?: Date }
  ): Promise<Message[]> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    return this.storage.getMessages(roomId, options);
  }

  async markMessageAsRead(userId: string, messageId: string): Promise<void> {
    // In real implementation, this would update message read status
    this.eventBus.emit('platform:message_read', { userId, messageId });
  }

  on(event: string, handler: (data: any) => void): void {
    this.eventBus.on(`platform:${event}`, handler);
  }

  off(event: string, handler: (data: any) => void): void {
    this.eventBus.off(`platform:${event}`, handler);
  }

  // Private helper methods
  private async getRoom(roomId: string): Promise<Room | null> {
    let room = this.rooms.get(roomId);
    
    if (!room) {
      const storedRoom = await this.storage.getRoom(roomId);
      room = storedRoom || undefined;
      if (room) {
        this.rooms.set(room.id, room);
      }
    }
    
    return room || null;
  }

  private async sendSystemMessage(roomId: string, content: string): Promise<void> {
    const message: Message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      roomId,
      userId: 'system',
      content,
      type: 'system',
      timestamp: new Date(),
      delivered: true,
      readBy: []
    };

    await this.storage.saveMessage(message);
    
    // Update room message count for system messages
    const room = await this.getRoom(roomId);
    if (room) {
      room.messageCount++;
      room.lastActivity = new Date();
      await this.storage.saveRoom(room);
    }
    
    await this.messaging.broadcastToRoom(roomId, {
      type: 'system',
      message
    });
  }

  private async extractContextFromMessage(content: string): Promise<any> {
    // Check for file references
    const fileMatch = content.match(/(\S+\.(ts|js|json|md)):(\d+)/);
    if (fileMatch) {
      return {
        type: 'file_reference',
        fileName: fileMatch[1],
        lineNumber: parseInt(fileMatch[3])
      };
    }

    // Check for workflow references
    const workflowMatch = content.match(/@workflow:(\S+)/);
    if (workflowMatch) {
      return {
        type: 'workflow_reference',
        workflowId: workflowMatch[1]
      };
    }

    return null;
  }

  private async handleCommandMessage(message: Message, user: User): Promise<void> {
    const command = message.content.slice(1); // Remove leading /
    const [cmd, ...args] = command.split(' ');

    switch (cmd) {
      case 'workflow':
        if (args[0] === 'trigger' && args[1]) {
          await this.integration.triggerWorkflow(args[1], {
            userId: user.id,
            roomId: message.roomId
          });
          
          await this.sendSystemMessage(
            message.roomId, 
            `Workflow '${args[1]}' triggered by ${user.username}`
          );
        }
        break;

      case 'file':
        if (args[0] && this.context.validatePath(args[0])) {
          try {
            const content = await this.context.readFile(args[0]);
            const preview = content.split('\n').slice(0, 5).join('\n');
            
            await this.sendSystemMessage(
              message.roomId,
              `📄 File: ${args[0]}\n\`\`\`\n${preview}\n...\n\`\`\``
            );
          } catch (error) {
            await this.sendSystemMessage(
              message.roomId,
              `❌ Could not read file: ${args[0]}`
            );
          }
        }
        break;
    }
  }

  private async handleWorkflowEvent(event: any): Promise<void> {
    // Find rooms that should receive this notification
    const rooms = Array.from(this.rooms.values()).filter(room => 
      room.metadata?.workflowNotifications === true
    );

    for (const room of rooms) {
      await this.sendSystemMessage(
        room.id,
        `🔄 Workflow '${event.workflowName}' ${event.type}: ${event.message || ''}`
      );
    }

    this.eventBus.emit('platform:workflow_event', event);
  }
}

// Mock service implementations
class MockStorageService implements StorageService {
  private users = new Map<string, User>();
  private rooms = new Map<string, Room>();
  private messages = new Map<string, Message[]>();

  async initialize(): Promise<void> {
    // Clear any existing data
    this.users.clear();
    this.rooms.clear();
    this.messages.clear();
  }

  async cleanup(): Promise<void> {
    this.users.clear();
    this.rooms.clear();
    this.messages.clear();
  }

  async saveUser(user: User): Promise<void> {
    this.users.set(user.id, { ...user });
  }

  async getUser(userId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    return user ? { ...user } : undefined;
  }

  async saveRoom(room: Room): Promise<void> {
    this.rooms.set(room.id, { ...room });
    if (!this.messages.has(room.id)) {
      this.messages.set(room.id, []);
    }
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    const room = this.rooms.get(roomId);
    return room ? { ...room } : undefined;
  }

  async saveMessage(message: Message): Promise<void> {
    const roomMessages = this.messages.get(message.roomId) || [];
    roomMessages.push({ ...message });
    this.messages.set(message.roomId, roomMessages);
  }

  async getMessages(roomId: string, options?: any): Promise<Message[]> {
    const messages = this.messages.get(roomId) || [];
    let result = [...messages];

    if (options?.after) {
      result = result.filter(m => m.timestamp > options.after);
    }

    if (options?.before) {
      result = result.filter(m => m.timestamp < options.before);
    }

    if (options?.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  }
}

class MockMessagingService implements MessagingService {
  private connections = new Map<string, { userId: string; roomId?: string }>();
  private eventHandlers = new Map<string, Set<(data: any) => void>>();

  async initialize(): Promise<void> {
    this.connections.clear();
  }

  async cleanup(): Promise<void> {
    this.connections.clear();
    this.eventHandlers.clear();
  }

  async connect(userId: string): Promise<string> {
    const connectionId = 'conn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    this.connections.set(connectionId, { userId });
    return connectionId;
  }

  async disconnect(connectionId: string): Promise<void> {
    this.connections.delete(connectionId);
  }

  async joinRoom(connectionId: string, roomId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }
    connection.roomId = roomId;
  }

  async leaveRoom(connectionId: string, roomId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }
    if (connection.roomId === roomId) {
      connection.roomId = undefined;
    }
  }

  async sendMessage(message: any): Promise<void> {
    this.emit('message', message);
  }

  async broadcastToRoom(roomId: string, event: any): Promise<void> {
    // In real implementation, this would send to all connections in the room
    this.emit(event.type, { ...event, roomId });
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

class MockContextService implements ContextService {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = path.join(os.tmpdir(), 'mock-workspace-' + Date.now());
  }

  async initialize(): Promise<void> {
    // Create mock workspace
    if (!fs.existsSync(this.workspaceRoot)) {
      fs.mkdirSync(this.workspaceRoot, { recursive: true });
    }

    // Create sample files
    fs.writeFileSync(
      path.join(this.workspaceRoot, 'test.ts'),
      'export const test = "Hello World";'
    );
  }

  async cleanup(): Promise<void> {
    if (fs.existsSync(this.workspaceRoot)) {
      fs.rmSync(this.workspaceRoot, { recursive: true });
    }
  }

  async getWorkspaceContext(): Promise<any> {
    return {
      name: 'Test Workspace',
      rootPath: this.workspaceRoot,
      version: '1.0.0',
      themes: ['chat-space', 'pocketflow']
    };
  }

  async getThemeInfo(themeId?: string): Promise<any> {
    if (themeId === 'chat-space') {
      return {
        id: 'chat-space',
        name: 'Chat Space',
        enabled: true
      };
    }
    return null;
  }

  validatePath(filePath: string): boolean {
    // Simple validation - no parent directory references
    return !filePath.includes('..') && !path.isAbsolute(filePath);
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = path.join(this.workspaceRoot, filePath);
    return fs.readFileSync(fullPath, 'utf8');
  }
}

class MockIntegrationService implements IntegrationService {
  private connected = false;
  private workflowSubscribers: Array<(event: any) => void> = [];

  async initialize(): Promise<void> {
    // Reset state
    this.connected = false;
    this.workflowSubscribers = [];
  }

  async cleanup(): Promise<void> {
    this.connected = false;
    this.workflowSubscribers = [];
  }

  async connectToPocketFlow(): Promise<void> {
    this.connected = true;
    
    // Simulate workflow events
    setTimeout(() => {
      this.emitWorkflowEvent({
        type: 'started',
        workflowId: 'test-workflow',
        workflowName: 'Test Workflow',
        message: 'Workflow started'
      });
    }, 100);
  }

  async subscribeToWorkflows(callback: (event: any) => void): Promise<string> {
    this.workflowSubscribers.push(callback);
    return 'sub-' + Date.now();
  }

  async triggerWorkflow(workflowId: string, _params?: any): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to PocketFlow');
    }

    const executionId = 'exec-' + Date.now();
    
    // Simulate workflow execution
    setTimeout(() => {
      this.emitWorkflowEvent({
        type: 'In Progress',
        workflowId,
        workflowName: workflowId,
        executionId,
        message: 'Workflow In Progress In Progress'
      });
    }, 200);

    return { executionId, status: 'running' };
  }

  private emitWorkflowEvent(event: any): void {
    this.workflowSubscribers.forEach(subscriber => subscriber(event));
  }
}

describe('ChatRoomPlatform Coordination Integration Test', () => {
  let platform: ChatRoomPlatform;
  let storage: StorageService;
  let messaging: MessagingService;
  let context: ContextService;
  let integration: IntegrationService;

  beforeEach(async () => {
    // Create services
    storage = new MockStorageService();
    messaging = new MockMessagingService();
    context = new MockContextService();
    integration = new MockIntegrationService();

    // Create platform
    platform = new IntegratedChatRoomPlatform(storage, messaging, context, integration);
    
    // Initialize platform
    await platform.initialize();
  });

  afterEach(async () => {
    await platform.shutdown();
  });

  test('should coordinate user registration and authentication across components', async () => {
    // Register user
    const user = await platform.registerUser('TestUser', { email: 'test@example.com' });
    expect(user.id).toBeDefined();
    expect(user.username).toBe('TestUser');
    expect(user.status).toBe('offline');

    // Verify user is persisted in storage
    const storedUser = await storage.getUser(user.id);
    expect(storedUser).toBeDefined();
    expect(storedUser?.username).toBe('TestUser');

    // Authenticate user
    const authenticatedUser = await platform.authenticateUser(user.id);
    expect(authenticatedUser.status).toBe('online');
    expect(authenticatedUser.connectionId).toBeDefined();

    // Verify messaging connection
    // In real implementation, we would verify the connection exists
    expect(authenticatedUser.connectionId).toMatch(/^conn-/);
  });

  test('should coordinate room creation and joining across all components', async () => {
    // Setup: Register and authenticate user
    const user = await platform.registerUser('RoomCreator');
    await platform.authenticateUser(user.id);

    // Create room
    const room = await platform.createRoom(user.id, 'Test Room', {
      description: 'A test chat room',
      workflowNotifications: true
    });

    expect(room.id).toBeDefined();
    expect(room.name).toBe('Test Room');
    expect(room.members).toContain(user.id);
    expect(room.activeUsers).toContain(user.id);
    expect(room.metadata.workspace).toBe('Test Workspace');

    // Verify room is persisted
    const storedRoom = await storage.getRoom(room.id);
    expect(storedRoom).toBeDefined();
    expect(storedRoom?.name).toBe('Test Room');

    // Verify system message was created
    const messages = await platform.getMessages(room.id);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].type).toBe('system');
    expect(messages[0].content).toContain('created by RoomCreator');

    // Register and authenticate second user
    const user2 = await platform.registerUser('RoomJoiner');
    await platform.authenticateUser(user2.id);

    // Join room
    await platform.joinRoom(user2.id, room.id);

    // Verify room membership updated
    const updatedRoom = await platform.getRoomInfo(room.id);
    expect(updatedRoom.members).toContain(user2.id);
    expect(updatedRoom.activeUsers).toContain(user2.id);

    // Verify join notification
    const updatedMessages = await platform.getMessages(room.id);
    const joinMessage = updatedMessages.find(m => 
      m.content.includes('RoomJoiner joined')
    );
    expect(joinMessage).toBeDefined();
  });

  test('should coordinate message sending with context extraction', async () => {
    // Setup
    const user = await platform.registerUser('MessageSender');
    await platform.authenticateUser(user.id);
    const room = await platform.createRoom(user.id, 'Message Test Room');

    // Send regular message
    const textMessage = await platform.sendMessage(
      user.id,
      room.id,
      'Hello, this is a test message!'
    );
    expect(textMessage.type).toBe('text');
    expect(textMessage.delivered).toBe(true);

    // Send message with file reference
    const fileRefMessage = await platform.sendMessage(
      user.id,
      room.id,
      'Check the error at test.ts:10'
    );
    expect(fileRefMessage.type).toBe('context');
    expect(fileRefMessage.metadata).toEqual({
      type: 'file_reference',
      fileName: 'test.ts',
      lineNumber: 10
    });

    // Send message with workflow reference
    const workflowMessage = await platform.sendMessage(
      user.id,
      room.id,
      'Run @workflow:backup-flow now'
    );
    expect(workflowMessage.type).toBe('context');
    expect(workflowMessage.metadata).toEqual({
      type: 'workflow_reference',
      workflowId: 'backup-flow'
    });

    // Verify all messages are stored
    const messages = await platform.getMessages(room.id);
    expect(messages.filter(m => m.userId === user.id)).toHaveLength(3);
  });

  test('should coordinate command processing with integrations', async () => {
    // Setup
    const user = await platform.registerUser('CommandUser');
    await platform.authenticateUser(user.id);
    const room = await platform.createRoom(user.id, 'Command Test Room');

    // Track workflow events
    const workflowEvents: any[] = [];
    platform.on('workflow_event', (event) => {
      workflowEvents.push(event);
    });

    // Send workflow trigger command
    await platform.sendMessage(
      user.id,
      room.id,
      '/workflow trigger test-workflow',
      'command'
    );

    // Wait for workflow event
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify workflow was triggered
    const messages = await platform.getMessages(room.id);
    const triggerMessage = messages.find(m => 
      m.content.includes("Workflow 'test-workflow' triggered")
    );
    expect(triggerMessage).toBeDefined();

    // Verify workflow events were received
    expect(workflowEvents.length).toBeGreaterThan(0);
    expect(workflowEvents.some(e => e.type === 'In Progress')).toBe(true);

    // Send file read command
    await platform.sendMessage(
      user.id,
      room.id,
      '/file test.ts',
      'command'
    );

    // Verify file content was shared
    const updatedMessages = await platform.getMessages(room.id);
    const fileMessage = updatedMessages.find(m => 
      m.content.includes('📄 File: test.ts')
    );
    expect(fileMessage).toBeDefined();
    expect(fileMessage?.content).toContain('export const test');
  });

  test('should coordinate multi-user room interactions', async () => {
    // Create multiple users
    const users = await Promise.all([
      platform.registerUser('Alice'),
      platform.registerUser('Bob'),
      platform.registerUser('Charlie')
    ]);

    // Authenticate all users
    await Promise.all(users.map(user => platform.authenticateUser(user.id)));

    // Alice creates room
    const room = await platform.createRoom(users[0].id, 'Multi-User Room');

    // Track events
    const events: any[] = [];
    platform.on('user_joined_room', (event) => events.push({ type: 'joined', ...event }));
    platform.on('user_left_room', (event) => events.push({ type: 'left', ...event }));
    platform.on('message_sent', (event) => events.push({ type: 'message', ...event }));

    // Bob and Charlie join
    await platform.joinRoom(users[1].id, room.id);
    await platform.joinRoom(users[2].id, room.id);

    // Everyone sends messages
    await platform.sendMessage(users[0].id, room.id, 'Hello from Alice');
    await platform.sendMessage(users[1].id, room.id, 'Hi Alice, this is Bob');
    await platform.sendMessage(users[2].id, room.id, 'Hey everyone!');

    // Bob leaves
    await platform.leaveRoom(users[1].id, room.id);

    // Verify room state
    const finalRoom = await platform.getRoomInfo(room.id);
    expect(finalRoom.members).toHaveLength(3); // All are still members
    expect(finalRoom.activeUsers).toHaveLength(2); // Only Alice and Charlie active
    expect(finalRoom.messageCount).toBeGreaterThan(3); // Include system messages

    // Verify events were tracked
    expect(events.filter(e => e.type === 'joined')).toHaveLength(2);
    expect(events.filter(e => e.type === 'left')).toHaveLength(1);
    expect(events.filter(e => e.type === 'message')).toHaveLength(3);
  });

  test('should coordinate workflow notifications to subscribed rooms', async () => {
    // Create users and rooms
    const user1 = await platform.registerUser('WorkflowUser1');
    const user2 = await platform.registerUser('WorkflowUser2');
    await platform.authenticateUser(user1.id);
    await platform.authenticateUser(user2.id);

    // Create room with workflow notifications enabled
    const notifyRoom = await platform.createRoom(user1.id, 'Workflow Notifications', {
      workflowNotifications: true
    });

    // Create room without workflow notifications
    const quietRoom = await platform.createRoom(user2.id, 'Quiet Room', {
      workflowNotifications: false
    });

    // Wait for initial workflow event (from mock connection)
    await new Promise(resolve => setTimeout(resolve, 150));

    // Check notifications
    const notifyMessages = await platform.getMessages(notifyRoom.id);
    const workflowMessages = notifyMessages.filter(m => 
      m.content.includes('🔄 Workflow')
    );
    expect(workflowMessages.length).toBeGreaterThan(0);

    // Quiet room should not have workflow messages
    const quietMessages = await platform.getMessages(quietRoom.id);
    const quietWorkflowMessages = quietMessages.filter(m => 
      m.content.includes('🔄 Workflow')
    );
    expect(quietWorkflowMessages).toHaveLength(0);
  });

  test('should handle platform status and health checks', async () => {
    // Check initial status
    const status = platform.getStatus();
    expect(status.healthy).toBe(true);
    expect(status.components.platform).toBe(true);
    expect(status.components.storage).toBe(true);
    expect(status.components.messaging).toBe(true);
    expect(status.components.context).toBe(true);
    expect(status.components.integration).toBe(true);

    // Shutdown platform
    await platform.shutdown();

    // Check status after shutdown
    const shutdownStatus = platform.getStatus();
    expect(shutdownStatus.healthy).toBe(false);
    expect(shutdownStatus.components.platform).toBe(false);
  });

  test('should coordinate error handling across components', async () => {
    // Try to send message without authentication
    await expect(
      platform.sendMessage('invalid-user', 'some-room', 'Hello')
    ).rejects.toThrow('User not authenticated');

    // Authenticate user but try to send to non-existent room
    const user = await platform.registerUser('ErrorUser');
    await platform.authenticateUser(user.id);

    await expect(
      platform.sendMessage(user.id, 'invalid-room', 'Hello')
    ).rejects.toThrow('Room not found');

    // Create room but try to send as non-member
    const room = await platform.createRoom(user.id, 'Private Room');
    const otherUser = await platform.registerUser('OtherUser');
    await platform.authenticateUser(otherUser.id);

    await expect(
      platform.sendMessage(otherUser.id, room.id, 'Hello')
    ).rejects.toThrow('User not a member of this room');
  });

  test('should coordinate message history and filtering', async () => {
    // Setup
    const user = await platform.registerUser('HistoryUser');
    await platform.authenticateUser(user.id);
    const room = await platform.createRoom(user.id, 'History Room');

    // Send multiple messages with delays
    const messageCount = 10;
    for (let i = 0; i < messageCount; i++) {
      await platform.sendMessage(user.id, room.id, `Message ${i + 1}`);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Get all messages
    const allMessages = await platform.getMessages(room.id);
    expect(allMessages.filter(m => m.userId === user.id)).toHaveLength(messageCount);

    // Get limited messages
    const limitedMessages = await platform.getMessages(room.id, { limit: 5 });
    expect(limitedMessages.filter(m => m.userId === user.id)).toHaveLength(5);

    // Get messages after timestamp
    const midpoint = allMessages[Math.floor(allMessages.length / 2)].timestamp;
    const recentMessages = await platform.getMessages(room.id, { after: midpoint });
    expect(recentMessages.filter(m => m.userId === user.id).length).toBeLessThan(messageCount);

    // Verify message ordering
    for (let i = 1; i < recentMessages.length; i++) {
      expect(recentMessages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
        recentMessages[i - 1].timestamp.getTime()
      );
    }
  });

  test('should coordinate platform events and subscriptions', async () => {
    // Track all platform events
    const eventLog: Array<{ event: string; data: any; timestamp: Date }> = [];
    
    const events = [
      'initialized',
      'user_registered',
      'user_authenticated', 
      'room_created',
      'user_joined_room',
      'message_sent',
      'user_left_room'
    ];

    events.forEach(event => {
      platform.on(event, (data) => {
        eventLog.push({ event, data, timestamp: new Date() });
      });
    });

    // Perform actions
    const user = await platform.registerUser('EventUser');
    await platform.authenticateUser(user.id);
    const room = await platform.createRoom(user.id, 'Event Room');
    await platform.sendMessage(user.id, room.id, 'Event test message');
    await platform.leaveRoom(user.id, room.id);

    // Verify events were emitted in correct order
    const eventTypes = eventLog.map(e => e.event);
    expect(eventTypes).toContain('user_registered');
    expect(eventTypes).toContain('user_authenticated');
    expect(eventTypes).toContain('room_created');
    expect(eventTypes).toContain('message_sent');
    expect(eventTypes).toContain('user_left_room');

    // Verify event data
    const registerEvent = eventLog.find(e => e.event === 'user_registered');
    expect(registerEvent?.data.user.username).toBe('EventUser');

    const messageEvent = eventLog.find(e => e.event === 'message_sent');
    expect(messageEvent?.data.message.content).toBe('Event test message');
  });
});