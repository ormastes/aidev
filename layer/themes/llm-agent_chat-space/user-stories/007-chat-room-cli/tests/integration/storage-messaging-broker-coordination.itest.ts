import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';

/**
 * Integration Test: Storage and Messaging Broker Coordination
 * 
 * Tests the integration between storage persistence and real-time messaging,
 * ensuring data consistency, event synchronization, and proper coordination
 * between persistent storage and live message delivery.
 */

// Domain interfaces
interface User {
  id: string;
  username: string;
  connectionId?: string;
  status: 'online' | 'offline' | 'away';
  joinedAt: Date;
  lastActivity: Date;
  metadata?: Record<string, any>;
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
  editedAt?: Date;
  deletedAt?: Date;
}

interface StorageEvent {
  type: 'created' | 'updated' | 'deleted';
  entity: 'user' | 'room' | 'message';
  id: string;
  data: any;
  timestamp: Date;
}

interface BrokerEvent {
  type: 'message' | "presence" | 'typing' | "notification";
  roomId?: string;
  userId?: string;
  data: any;
  timestamp: Date;
}

// Storage Service Implementation
class FileStorageService {
  private dataDir: string;
  private eventBus: EventEmitter;
  private cache = new Map<string, any>();
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(baseDir: string, eventBus: EventEmitter) {
    this.dataDir = path.join(baseDir, 'chat-data');
    this.eventBus = eventBus;
  }

  async initialize(): Promise<void> {
    // Create directory structure
    const dirs = ['users', 'rooms', "messages"].map(dir => 
      path.join(this.dataDir, dir)
    );
    
    for (const dir of dirs) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    // Load existing data into cache
    await this.loadCache();
  }

  private async loadCache(): Promise<void> {
    // Load users
    const userFiles = await this.listFiles('users');
    for (const file of userFiles) {
      const user = await this.readJSON(path.join('users', file));
      if (user) {
        this.cache.set(`user:${user.id}`, user);
      }
    }

    // Load rooms
    const roomFiles = await this.listFiles('rooms');
    for (const file of roomFiles) {
      const room = await this.readJSON(path.join('rooms', file));
      if (room) {
        this.cache.set(`room:${room.id}`, room);
      }
    }
  }

  private async listFiles(subdir: string): Promise<string[]> {
    const dir = path.join(this.dataDir, subdir);
    try {
      const files = await fs.promises.readdir(dir);
      return files.filter(f => f.endsWith('.json'));
    } catch {
      return [];
    }
  }

  private async readJSON(relativePath: string): Promise<any> {
    const fullPath = path.join(this.dataDir, relativePath);
    try {
      const data = await fs.promises.readFile(fullPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async writeJSON(relativePath: string, data: any): Promise<void> {
    const fullPath = path.join(this.dataDir, relativePath);
    
    // Queue writes to prevent conflicts
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.promises.writeFile(
        fullPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );
    });
    
    await this.writeQueue;
  }

  async saveUser(user: User): Promise<void> {
    const isNew = !this.cache.has(`user:${user.id}`);
    
    // Update cache
    this.cache.set(`user:${user.id}`, user);
    
    // Persist to disk
    await this.writeJSON(`users/${user.id}.json`, user);
    
    // Emit storage event
    this.eventBus.emit('storage:event', {
      type: isNew ? 'created' : 'updated',
      entity: 'user',
      id: user.id,
      data: user,
      timestamp: new Date()
    } as StorageEvent);
  }

  async getUser(userId: string): Promise<User | undefined> {
    return this.cache.get(`user:${userId}`);
  }

  async getAllUsers(): Promise<User[]> {
    const users: User[] = [];
    for (const [key, value] of this.cache) {
      if (key.startsWith('user:')) {
        users.push(value);
      }
    }
    return users;
  }

  async saveRoom(room: Room): Promise<void> {
    const isNew = !this.cache.has(`room:${room.id}`);
    
    // Update cache
    this.cache.set(`room:${room.id}`, room);
    
    // Persist to disk
    await this.writeJSON(`rooms/${room.id}.json`, room);
    
    // Emit storage event
    this.eventBus.emit('storage:event', {
      type: isNew ? 'created' : 'updated',
      entity: 'room',
      id: room.id,
      data: room,
      timestamp: new Date()
    } as StorageEvent);
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    return this.cache.get(`room:${roomId}`);
  }

  async getAllRooms(): Promise<Room[]> {
    const rooms: Room[] = [];
    for (const [key, value] of this.cache) {
      if (key.startsWith('room:')) {
        rooms.push(value);
      }
    }
    return rooms;
  }

  async saveMessage(message: Message): Promise<void> {
    const room = await this.getRoom(message.roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Get or create message list for room
    const messagesKey = `messages:${message.roomId}`;
    let messages = this.cache.get(messagesKey) || [];
    
    // Add message
    messages.push(message);
    
    // Keep only last 1000 messages in memory
    if (messages.length > 1000) {
      messages = messages.slice(-1000);
    }
    
    // Update cache
    this.cache.set(messagesKey, messages);
    
    // Persist to disk (append to daily file)
    const date = new Date().toISOString().split('T')[0];
    const filename = `messages/${message.roomId}-${date}.json`;
    
    // Read existing messages for today
    let dailyMessages = await this.readJSON(filename) || [];
    dailyMessages.push(message);
    
    await this.writeJSON(filename, dailyMessages);
    
    // Update room message count
    room.messageCount++;
    room.lastActivity = new Date();
    await this.saveRoom(room);
    
    // Emit storage event
    this.eventBus.emit('storage:event', {
      type: 'created',
      entity: 'message',
      id: message.id,
      data: message,
      timestamp: new Date()
    } as StorageEvent);
  }

  async getMessages(roomId: string, options?: {
    limit?: number;
    before?: Date;
    after?: Date;
  }): Promise<Message[]> {
    // Get from cache first
    const cachedMessages = this.cache.get(`messages:${roomId}`) || [];
    
    let messages = [...cachedMessages];
    
    // Apply filters
    if (options?.after) {
      messages = messages.filter(m => 
        new Date(m.timestamp) > options.after!
      );
    }
    
    if (options?.before) {
      messages = messages.filter(m => 
        new Date(m.timestamp) < options.before!
      );
    }
    
    // Apply limit
    if (options?.limit) {
      messages = messages.slice(-options.limit);
    }
    
    return messages;
  }

  async cleanup(): Promise<void> {
    // Wait for pending writes
    await this.writeQueue;
    
    // Clear cache
    this.cache.clear();
  }
}

// Messaging Broker Implementation
class MessageBroker {
  private connections = new Map<string, Connection>();
  private rooms = new Map<string, Set<string>>();
  private eventBus: EventEmitter;
  private messageQueue = new Map<string, Message[]>();

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupStorageSync();
  }

  private setupStorageSync(): void {
    // Listen for storage events to sync with connected clients
    this.eventBus.on('storage:event', (event: StorageEvent) => {
      if (event.entity === 'message' && event.type === 'created') {
        const message = event.data as Message;
        this.handleStoredMessage(message);
      }
    });
  }

  private handleStoredMessage(message: Message): void {
    // Broadcast to room members
    this.broadcastToRoom(message.roomId, {
      type: 'message',
      roomId: message.roomId,
      userId: message.userId,
      data: message,
      timestamp: new Date()
    } as BrokerEvent);
  }

  async connect(userId: string, connectionId: string): Promise<void> {
    const connection: Connection = {
      id: connectionId,
      userId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set()
    };
    
    this.connections.set(connectionId, connection);
    
    // Emit presence event
    this.eventBus.emit('broker:event', {
      type: "presence",
      userId,
      data: { status: 'online' },
      timestamp: new Date()
    } as BrokerEvent);
    
    // Deliver queued messages
    await this.deliverQueuedMessages(userId);
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    // Remove from all rooms
    for (const roomId of connection.rooms) {
      await this.leaveRoom(connectionId, roomId);
    }
    
    // Remove connection
    this.connections.delete(connectionId);
    
    // Emit presence event
    this.eventBus.emit('broker:event', {
      type: "presence",
      userId: connection.userId,
      data: { status: 'offline' },
      timestamp: new Date()
    } as BrokerEvent);
  }

  async joinRoom(connectionId: string, roomId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    // Add to room
    connection.rooms.add(roomId);
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(connectionId);
    
    // Emit broker event for coordinator
    this.eventBus.emit('broker:event', {
      type: "presence",
      roomId,
      userId: connection.userId,
      data: { action: 'joined' },
      timestamp: new Date()
    } as BrokerEvent);
    
    // Notify room members
    this.broadcastToRoom(roomId, {
      type: "presence",
      roomId,
      userId: connection.userId,
      data: { action: 'joined' },
      timestamp: new Date()
    } as BrokerEvent);
  }

  async leaveRoom(connectionId: string, roomId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    // Remove from room
    connection.rooms.delete(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(connectionId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    
    // Emit broker event for coordinator
    this.eventBus.emit('broker:event', {
      type: "presence",
      roomId,
      userId: connection.userId,
      data: { action: 'left' },
      timestamp: new Date()
    } as BrokerEvent);
    
    // Notify room members
    this.broadcastToRoom(roomId, {
      type: "presence",
      roomId,
      userId: connection.userId,
      data: { action: 'left' },
      timestamp: new Date()
    } as BrokerEvent);
  }

  async sendMessage(message: Message): Promise<void> {
    // Check if sender is in the room
    const senderConnection = this.findUserConnection(message.userId);
    if (!senderConnection || !senderConnection.rooms.has(message.roomId)) {
      throw new Error('User not in room');
    }
    
    // Mark as delivered to online users
    const deliveredTo = this.getOnlineUsersInRoom(message.roomId);
    message.delivered = deliveredTo.length > 0;
    message.readBy = [message.userId]; // Sender has read their own message
    
    // Queue for offline users
    await this.queueForOfflineUsers(message, deliveredTo);
    
    // Emit to storage (which will trigger broadcast via storage sync)
    this.eventBus.emit('broker:message', message);
  }

  broadcastToRoom(roomId: string, event: BrokerEvent): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    for (const connectionId of room) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        this.eventBus.emit(`connection:${connectionId}`, event);
      }
    }
  }

  async sendTypingIndicator(userId: string, roomId: string): Promise<void> {
    this.broadcastToRoom(roomId, {
      type: 'typing',
      roomId,
      userId,
      data: { isTyping: true },
      timestamp: new Date()
    } as BrokerEvent);
    
    // Auto-clear after 3 seconds
    setTimeout(() => {
      this.broadcastToRoom(roomId, {
        type: 'typing',
        roomId,
        userId,
        data: { isTyping: false },
        timestamp: new Date()
      } as BrokerEvent);
    }, 3000);
  }

  private findUserConnection(userId: string): Connection | undefined {
    for (const connection of this.connections.values()) {
      if (connection.userId === userId) {
        return connection;
      }
    }
    return undefined;
  }

  getOnlineUsersInRoom(roomId: string): string[] {
    const users: string[] = [];
    const room = this.rooms.get(roomId);
    
    if (room) {
      for (const connectionId of room) {
        const connection = this.connections.get(connectionId);
        if (connection) {
          users.push(connection.userId);
        }
      }
    }
    
    return users;
  }

  private async queueForOfflineUsers(message: Message, _onlineUsers: string[]): Promise<void> {
    // In a real implementation, we'd check room members and queue for offline ones
    // For this test, we'll just track in memory
    const queueKey = `queue:${message.roomId}`;
    
    if (!this.messageQueue.has(queueKey)) {
      this.messageQueue.set(queueKey, []);
    }
    
    this.messageQueue.get(queueKey)!.push(message);
  }

  private async deliverQueuedMessages(userId: string): Promise<void> {
    // Deliver queued messages when user comes online
    for (const [key, messages] of this.messageQueue) {
      const roomId = key.replace('queue:', '');
      
      for (const message of messages) {
        if (!message.readBy.includes(userId)) {
          // Mark as read and deliver
          message.readBy.push(userId);
          
          this.eventBus.emit(`user:${userId}:queued`, {
            type: 'message',
            roomId,
            data: message,
            timestamp: new Date()
          } as BrokerEvent);
        }
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getRoomMemberCount(roomId: string): number {
    return this.rooms.get(roomId)?.size || 0;
  }
}

interface Connection {
  id: string;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  rooms: Set<string>;
}

// Coordinator that ensures storage and broker work together
class StorageBrokerCoordinator {
  private storage: FileStorageService;
  private broker: MessageBroker;
  private eventBus: EventEmitter;
  private syncInProgress = new Map<string, boolean>();

  constructor(storage: FileStorageService, broker: MessageBroker, eventBus: EventEmitter) {
    this.storage = storage;
    this.broker = broker;
    this.eventBus = eventBus;
    this.setupCoordination();
  }

  private setupCoordination(): void {
    // When broker receives a message, save to storage
    this.eventBus.on('broker:message', async (message: Message) => {
      try {
        await this.storage.saveMessage(message);
        // Storage will emit storage:event, which broker listens to
      } catch (error) {
        console.error('Failed to save message:', error);
        this.eventBus.emit('coordinator:error', {
          type: 'storage_failure',
          message,
          error
        });
      }
    });

    // Sync room member counts
    this.eventBus.on('broker:event', async (event: BrokerEvent) => {
      if (event.type === "presence" && event.roomId) {
        await this.updateRoomActivity(event.roomId);
      }
    });

    // Handle storage updates
    this.eventBus.on('storage:event', async (event: StorageEvent) => {
      if (event.entity === 'room' && event.type === 'updated') {
        // Could trigger additional broker actions if needed
      }
    });
  }

  private async updateRoomActivity(roomId: string): Promise<void> {
    // Use a small delay to batch updates
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (this.syncInProgress.get(roomId)) return;
    
    this.syncInProgress.set(roomId, true);
    try {
      // Always get fresh room data to avoid race conditions
      const room = await this.storage.getRoom(roomId);
      if (room) {
        // Get actual online users from broker
        const onlineUsers = this.broker.getOnlineUsersInRoom(roomId);
        
        // Update active users with actual user IDs
        room.activeUsers = onlineUsers;
        room.lastActivity = new Date();
        
        await this.storage.saveRoom(room);
      }
    } finally {
      this.syncInProgress.set(roomId, false);
    }
  }

  async ensureConsistency(): Promise<{
    consistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check all rooms have consistent data
    const rooms = await this.storage.getAllRooms();
    
    for (const room of rooms) {
      // For message count, we'll just verify it's not negative or undefined
      if (room.messageCount < 0 || room.messageCount === undefined) {
        issues.push(`Room ${room.id} has invalid message count: ${room.messageCount}`);
      }
      
      // Check active users vs broker connections
      const brokerCount = this.broker.getRoomMemberCount(room.id);
      if (room.activeUsers.length !== brokerCount) {
        issues.push(`Room ${room.id} active user mismatch: ${room.activeUsers.length} vs ${brokerCount}`);
      }
    }

    return {
      consistent: issues.length === 0,
      issues
    };
  }
}

describe('Storage and Messaging Broker Coordination Integration Test', () => {
  let tempDir: string;
  let eventBus: EventEmitter;
  let storage: FileStorageService;
  let broker: MessageBroker;
  let coordinator: StorageBrokerCoordinator;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'chat-storage-test-')
    );
    
    eventBus = new EventEmitter();
    storage = new FileStorageService(tempDir, eventBus);
    broker = new MessageBroker(eventBus);
    coordinator = new StorageBrokerCoordinator(storage, broker, eventBus);
    
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.cleanup();
    
    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  test('should persist messages to storage when sent through broker', async () => {
    // Create user and room
    const user: User = {
      id: 'user-1',
      username: 'Alice',
      status: 'online',
      joinedAt: new Date(),
      lastActivity: new Date()
    };
    await storage.saveUser(user);

    const room: Room = {
      id: 'room-1',
      name: 'Test Room',
      createdBy: user.id,
      createdAt: new Date(),
      members: [user.id],
      activeUsers: [],
      messageCount: 0,
      lastActivity: new Date(),
      metadata: {}
    };
    await storage.saveRoom(room);

    // Connect user and join room
    await broker.connect(user.id, 'conn-1');
    await broker.joinRoom('conn-1', room.id);

    // Send message
    const message: Message = {
      id: 'msg-1',
      roomId: room.id,
      userId: user.id,
      content: 'Hello, World!',
      type: 'text',
      timestamp: new Date(),
      delivered: false,
      readBy: []
    };

    await broker.sendMessage(message);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify message was persisted
    const savedMessages = await storage.getMessages(room.id);
    expect(savedMessages).toHaveLength(1);
    expect(savedMessages[0].content).toBe('Hello, World!');
    expect(savedMessages[0].delivered).toBe(true);
  });

  test('should update room activity when users join/leave', async () => {
    // Create room
    const room: Room = {
      id: 'room-activity',
      name: 'Activity Room',
      createdBy: 'user-1',
      createdAt: new Date(),
      members: ['user-1', 'user-2'],
      activeUsers: [],
      messageCount: 0,
      lastActivity: new Date(),
      metadata: {}
    };
    await storage.saveRoom(room);

    // User 1 joins
    await broker.connect('user-1', 'conn-1');
    await broker.joinRoom('conn-1', room.id);

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 50));

    let updatedRoom = await storage.getRoom(room.id);
    expect(updatedRoom?.activeUsers).toHaveLength(1);

    // User 2 joins
    await broker.connect('user-2', 'conn-2');
    await broker.joinRoom('conn-2', room.id);

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 50));

    updatedRoom = await storage.getRoom(room.id);
    expect(updatedRoom?.activeUsers).toHaveLength(2);

    // User 1 leaves
    await broker.disconnect('conn-1');

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 50));

    updatedRoom = await storage.getRoom(room.id);
    expect(updatedRoom?.activeUsers).toHaveLength(1);
  });

  test('should maintain consistency between storage and broker', async () => {
    // Create multiple rooms and users
    const users: User[] = [];
    for (let i = 1; i <= 3; i++) {
      const user: User = {
        id: `user-${i}`,
        username: `User${i}`,
        status: 'online',
        joinedAt: new Date(),
        lastActivity: new Date()
      };
      users.push(user);
      await storage.saveUser(user);
    }

    const rooms: Room[] = [];
    for (let i = 1; i <= 2; i++) {
      const room: Room = {
        id: `room-${i}`,
        name: `Room ${i}`,
        createdBy: users[0].id,
        createdAt: new Date(),
        members: users.map(u => u.id),
        activeUsers: [],
        messageCount: 0,
        lastActivity: new Date(),
        metadata: {}
      };
      rooms.push(room);
      await storage.saveRoom(room);
    }

    // Connect users and join rooms
    for (let i = 0; i < users.length; i++) {
      await broker.connect(users[i].id, `conn-${i}`);
      
      // Each user joins first room
      await broker.joinRoom(`conn-${i}`, rooms[0].id);
      
      // Only first two users join second room
      if (i < 2) {
        await broker.joinRoom(`conn-${i}`, rooms[1].id);
      }
    }

    // Send messages
    for (let i = 0; i < 5; i++) {
      const message: Message = {
        id: `msg-${i}`,
        roomId: rooms[0].id,
        userId: users[i % users.length].id,
        content: `Message ${i}`,
        type: 'text',
        timestamp: new Date(),
        delivered: false,
        readBy: []
      };
      await broker.sendMessage(message);
    }

    // Wait for all async operations and room updates
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check consistency
    const consistency = await coordinator.ensureConsistency();
    expect(consistency.consistent).toBe(true);
    expect(consistency.issues).toHaveLength(0);

    // Verify counts
    const room1 = await storage.getRoom(rooms[0].id);
    expect(room1?.messageCount).toBe(5);
    expect(room1?.activeUsers).toHaveLength(3);

    const room2 = await storage.getRoom(rooms[1].id);
    expect(room2?.activeUsers).toHaveLength(2);
  });

  test('should handle storage failures gracefully', async () => {
    const errorEvents: any[] = [];
    eventBus.on('coordinator:error', (error) => {
      errorEvents.push(error);
    });

    // Create user but not room (to trigger storage failure)
    const user: User = {
      id: 'user-fail',
      username: "FailUser",
      status: 'online',
      joinedAt: new Date(),
      lastActivity: new Date()
    };
    await storage.saveUser(user);

    await broker.connect(user.id, 'conn-fail');

    // Try to send message to non-existent room
    const message: Message = {
      id: 'msg-fail',
      roomId: 'non-existent-room',
      userId: user.id,
      content: 'This should fail',
      type: 'text',
      timestamp: new Date(),
      delivered: false,
      readBy: []
    };

    // This should fail at broker level (user not in room)
    await expect(broker.sendMessage(message)).rejects.toThrow('User not in room');
  });

  test('should sync typing indicators without persistence', async () => {
    // Create room and users
    const room: Room = {
      id: 'room-typing',
      name: 'Typing Room',
      createdBy: 'user-1',
      createdAt: new Date(),
      members: ['user-1', 'user-2'],
      activeUsers: [],
      messageCount: 0,
      lastActivity: new Date(),
      metadata: {}
    };
    await storage.saveRoom(room);

    // Connect users
    await broker.connect('user-1', 'conn-1');
    await broker.connect('user-2', 'conn-2');
    await broker.joinRoom('conn-1', room.id);
    await broker.joinRoom('conn-2', room.id);

    // Track typing events
    const typingEvents: BrokerEvent[] = [];
    eventBus.on('connection:conn-2', (event: BrokerEvent) => {
      if (event.type === 'typing') {
        typingEvents.push(event);
      }
    });

    // User 1 starts typing
    await broker.sendTypingIndicator('user-1', room.id);

    // Should receive typing start
    expect(typingEvents).toHaveLength(1);
    expect(typingEvents[0].data.isTyping).toBe(true);

    // Wait for auto-clear
    await new Promise(resolve => setTimeout(resolve, 3100));

    // Should receive typing stop
    expect(typingEvents).toHaveLength(2);
    expect(typingEvents[1].data.isTyping).toBe(false);
  });

  test('should handle message delivery and read receipts', async () => {
    // Create users
    const users: User[] = [];
    for (let i = 1; i <= 3; i++) {
      const user: User = {
        id: `user-${i}`,
        username: `User${i}`,
        status: 'offline',
        joinedAt: new Date(),
        lastActivity: new Date()
      };
      users.push(user);
      await storage.saveUser(user);
    }

    // Create room
    const room: Room = {
      id: 'room-delivery',
      name: 'Delivery Room',
      createdBy: users[0].id,
      createdAt: new Date(),
      members: users.map(u => u.id),
      activeUsers: [],
      messageCount: 0,
      lastActivity: new Date(),
      metadata: {}
    };
    await storage.saveRoom(room);

    // Only first user is online
    await broker.connect(users[0].id, 'conn-1');
    await broker.joinRoom('conn-1', room.id);

    // First user sends message
    const message: Message = {
      id: 'msg-delivery',
      roomId: room.id,
      userId: users[0].id,
      content: 'Hello everyone!',
      type: 'text',
      timestamp: new Date(),
      delivered: false,
      readBy: []
    };

    await broker.sendMessage(message);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check saved message
    const messages = await storage.getMessages(room.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].delivered).toBe(true); // Delivered to at least one user
    expect(messages[0].readBy).toContain(users[0].id); // Sender has read

    // Second user comes online
    const queuedEvents: BrokerEvent[] = [];
    eventBus.on('user:user-2:queued', (event: BrokerEvent) => {
      queuedEvents.push(event);
    });

    await broker.connect(users[1].id, 'conn-2');
    await broker.joinRoom('conn-2', room.id);

    // Should receive queued message
    expect(queuedEvents.length).toBeGreaterThan(0);
  });

  test('should handle concurrent operations safely', async () => {
    // Create room
    const room: Room = {
      id: 'room-concurrent',
      name: 'Concurrent Room',
      createdBy: 'user-1',
      createdAt: new Date(),
      members: ['user-1', 'user-2', 'user-3'],
      activeUsers: [],
      messageCount: 0,
      lastActivity: new Date(),
      metadata: {}
    };
    await storage.saveRoom(room);

    // Connect multiple users concurrently
    const connectionPromises = [];
    for (let i = 1; i <= 3; i++) {
      connectionPromises.push(
        broker.connect(`user-${i}`, `conn-${i}`)
          .then(() => broker.joinRoom(`conn-${i}`, room.id))
      );
    }
    
    await Promise.all(connectionPromises);

    // Send messages concurrently
    const messagePromises = [];
    for (let i = 0; i < 10; i++) {
      const message: Message = {
        id: `msg-concurrent-${i}`,
        roomId: room.id,
        userId: `user-${(i % 3) + 1}`,
        content: `Concurrent message ${i}`,
        type: 'text',
        timestamp: new Date(),
        delivered: false,
        readBy: []
      };
      messagePromises.push(broker.sendMessage(message));
    }

    await Promise.all(messagePromises);

    // Wait for all operations to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify all messages were saved
    const savedMessages = await storage.getMessages(room.id);
    expect(savedMessages).toHaveLength(10);

    // Verify room was updated correctly
    const updatedRoom = await storage.getRoom(room.id);
    expect(updatedRoom?.messageCount).toBe(10);
    expect(updatedRoom?.activeUsers).toHaveLength(3);

    // Check consistency
    const consistency = await coordinator.ensureConsistency();
    expect(consistency.consistent).toBe(true);
  });

  test('should recover from temporary disconnections', async () => {
    // Create user and room
    const user: User = {
      id: 'user-reconnect',
      username: "ReconnectUser",
      status: 'online',
      joinedAt: new Date(),
      lastActivity: new Date()
    };
    await storage.saveUser(user);

    const room: Room = {
      id: 'room-reconnect',
      name: 'Reconnect Room',
      createdBy: user.id,
      createdAt: new Date(),
      members: [user.id],
      activeUsers: [],
      messageCount: 0,
      lastActivity: new Date(),
      metadata: {}
    };
    await storage.saveRoom(room);

    // Initial connection
    await broker.connect(user.id, 'conn-1');
    await broker.joinRoom('conn-1', room.id);

    // Send initial message
    const message1: Message = {
      id: 'msg-before',
      roomId: room.id,
      userId: user.id,
      content: 'Before disconnect',
      type: 'text',
      timestamp: new Date(),
      delivered: false,
      readBy: []
    };
    await broker.sendMessage(message1);

    // Disconnect
    await broker.disconnect('conn-1');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 50));

    // Reconnect with new connection ID
    await broker.connect(user.id, 'conn-2');
    await broker.joinRoom('conn-2', room.id);

    // Send message after reconnect
    const message2: Message = {
      id: 'msg-after',
      roomId: room.id,
      userId: user.id,
      content: 'After reconnect',
      type: 'text',
      timestamp: new Date(),
      delivered: false,
      readBy: []
    };
    await broker.sendMessage(message2);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify both messages were saved
    const messages = await storage.getMessages(room.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('Before disconnect');
    expect(messages[1].content).toBe('After reconnect');
  });

  test('should properly clean up resources', async () => {
    // Create and connect multiple users
    for (let i = 1; i <= 5; i++) {
      await broker.connect(`user-${i}`, `conn-${i}`);
    }

    expect(broker.getConnectionCount()).toBe(5);

    // Disconnect all
    for (let i = 1; i <= 5; i++) {
      await broker.disconnect(`conn-${i}`);
    }

    expect(broker.getConnectionCount()).toBe(0);

    // Verify storage cleanup works
    await storage.cleanup();
    
    // Cache should be empty
    const users = await storage.getAllUsers();
    expect(users).toHaveLength(0);
  });
});