import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';

/**
 * External Test: MessageBroker Real-time Communication
 * 
 * Tests the external MessageBroker interface for real-time messaging capabilities.
 * This validates the interface contract for pub/sub messaging, connection management,
 * and real-time event distribution.
 */

// MessageBroker interface contract - external interface
interface MessageEvent {
  id: string;
  type: 'message' | 'user_joined' | 'user_left' | 'typing' | 'system' | 'workflow_notification';
  roomId: string;
  userId?: string;
  username?: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ConnectionInfo {
  id: string;
  userId: string;
  username: string;
  roomId?: string;
  connectedAt: Date;
  lastActivity: Date;
  status: 'connected' | 'disconnected' | 'idle';
}

interface SubscriptionResult {
  "success": boolean;
  subscriptionId?: string;
  error?: string;
}

interface BrokerResult<T> {
  "success": boolean;
  data?: T;
  error?: string;
}

interface MessageBroker {
  // Connection management
  connect(userId: string, username: string): Promise<BrokerResult<ConnectionInfo>>;
  disconnect(connectionId: string): Promise<BrokerResult<boolean>>;
  getConnections(roomId?: string): Promise<BrokerResult<ConnectionInfo[]>>;
  
  // Room management
  joinRoom(connectionId: string, roomId: string): Promise<BrokerResult<boolean>>;
  leaveRoom(connectionId: string, roomId: string): Promise<BrokerResult<boolean>>;
  
  // Message operations
  publishMessage(message: Omit<MessageEvent, 'id' | 'timestamp'>): Promise<BrokerResult<MessageEvent>>;
  subscribeToRoom(roomId: string, callback: (message: MessageEvent) => void): Promise<SubscriptionResult>;
  subscribeToUser(userId: string, callback: (message: MessageEvent) => void): Promise<SubscriptionResult>;
  unsubscribe(subscriptionId: string): Promise<BrokerResult<boolean>>;
  
  // Real-time features
  broadcastToRoom(roomId: string, event: Omit<MessageEvent, 'id' | 'timestamp'>): Promise<BrokerResult<boolean>>;
  sendToUser(userId: string, event: Omit<MessageEvent, 'id' | 'timestamp'>): Promise<BrokerResult<boolean>>;
  notifyTyping(roomId: string, userId: string, isTyping: boolean): Promise<BrokerResult<boolean>>;
  
  // Health and monitoring
  getHealthStatus(): Promise<BrokerResult<{ status: string; connections: number; uptime: number }>>;
  cleanup(): Promise<BrokerResult<boolean>>;
}

// Mock implementation for external testing
class MockMessageBroker implements MessageBroker {
  private connections = new Map<string, ConnectionInfo>();
  private roomSubscriptions = new Map<string, Map<string, (message: MessageEvent) => void>>();
  private userSubscriptions = new Map<string, Map<string, (message: MessageEvent) => void>>();
  private eventEmitter = new EventEmitter();
  private subscriptionCounter = 0;
  private startTime = Date.now();

  constructor() {
    this.eventEmitter.setMaxListeners(100);
  }

  async connect(userId: string, username: string): Promise<BrokerResult<ConnectionInfo>> {
    try {
      const connectionId = 'conn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      const connection: ConnectionInfo = {
        id: connectionId,
        userId,
        username,
        connectedAt: new Date(),
        lastActivity: new Date(),
        status: 'connected'
      };
      
      this.connections.set(connectionId, connection);
      
      // Emit connection event
      this.eventEmitter.emit('connection', { connectionId, userId, username });
      
      return { "success": true, data: connection };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  async disconnect(connectionId: string): Promise<BrokerResult<boolean>> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return { "success": false, error: 'Connection not found' };
      }
      
      // Leave any rooms
      if (connection.roomId) {
        await this.leaveRoom(connectionId, connection.roomId);
      }
      
      connection.status = 'disconnected';
      this.connections.delete(connectionId);
      
      // Emit disconnection event
      this.eventEmitter.emit('disconnection', { connectionId, userId: connection.userId });
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Disconnection failed' 
      };
    }
  }

  async getConnections(roomId?: string): Promise<BrokerResult<ConnectionInfo[]>> {
    try {
      let connections = Array.from(this.connections.values());
      
      if (roomId) {
        connections = connections.filter(conn => conn.roomId === roomId);
      }
      
      return { "success": true, data: connections };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to get connections' 
      };
    }
  }

  async joinRoom(connectionId: string, roomId: string): Promise<BrokerResult<boolean>> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return { "success": false, error: 'Connection not found' };
      }
      
      // Leave current room if any
      if (connection.roomId && connection.roomId !== roomId) {
        await this.leaveRoom(connectionId, connection.roomId);
      }
      
      connection.roomId = roomId;
      connection.lastActivity = new Date();
      
      // Notify room about user joining
      await this.broadcastToRoom(roomId, {
        type: 'user_joined',
        roomId,
        userId: connection.userId,
        username: connection.username,
        data: { connectionId }
      });
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to join room' 
      };
    }
  }

  async leaveRoom(connectionId: string, roomId: string): Promise<BrokerResult<boolean>> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return { "success": false, error: 'Connection not found' };
      }
      
      if (connection.roomId !== roomId) {
        return { "success": false, error: 'Not in specified room' };
      }
      
      connection.roomId = undefined;
      connection.lastActivity = new Date();
      
      // Notify room about user leaving
      await this.broadcastToRoom(roomId, {
        type: 'user_left',
        roomId,
        userId: connection.userId,
        username: connection.username,
        data: { connectionId }
      });
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to leave room' 
      };
    }
  }

  async publishMessage(messageData: Omit<MessageEvent, 'id' | 'timestamp'>): Promise<BrokerResult<MessageEvent>> {
    try {
      const message: MessageEvent = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        ...messageData,
        timestamp: new Date()
      };
      
      // Emit to room subscribers
      const roomSubs = this.roomSubscriptions.get(message.roomId);
      if (roomSubs) {
        roomSubs.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Subscription callback error:', error);
          }
        });
      }
      
      // Emit to user subscribers if applicable
      if (message.userId) {
        const userSubs = this.userSubscriptions.get(message.userId);
        if (userSubs) {
          userSubs.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('User subscription callback error:', error);
            }
          });
        }
      }
      
      return { "success": true, data: message };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to publish message' 
      };
    }
  }

  async subscribeToRoom(roomId: string, callback: (message: MessageEvent) => void): Promise<SubscriptionResult> {
    try {
      const subscriptionId = 'room-sub-' + (++this.subscriptionCounter);
      
      if (!this.roomSubscriptions.has(roomId)) {
        this.roomSubscriptions.set(roomId, new Map());
      }
      
      this.roomSubscriptions.get(roomId)!.set(subscriptionId, callback);
      
      return { "success": true, subscriptionId };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to subscribe to room' 
      };
    }
  }

  async subscribeToUser(userId: string, callback: (message: MessageEvent) => void): Promise<SubscriptionResult> {
    try {
      const subscriptionId = 'user-sub-' + (++this.subscriptionCounter);
      
      if (!this.userSubscriptions.has(userId)) {
        this.userSubscriptions.set(userId, new Map());
      }
      
      this.userSubscriptions.get(userId)!.set(subscriptionId, callback);
      
      return { "success": true, subscriptionId };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to subscribe to user' 
      };
    }
  }

  async unsubscribe(subscriptionId: string): Promise<BrokerResult<boolean>> {
    try {
      // Check room subscriptions
      for (const [roomId, subs] of this.roomSubscriptions.entries()) {
        if (subs.has(subscriptionId)) {
          subs.delete(subscriptionId);
          if (subs.size === 0) {
            this.roomSubscriptions.delete(roomId);
          }
          return { "success": true, data: true };
        }
      }
      
      // Check user subscriptions
      for (const [userId, subs] of this.userSubscriptions.entries()) {
        if (subs.has(subscriptionId)) {
          subs.delete(subscriptionId);
          if (subs.size === 0) {
            this.userSubscriptions.delete(userId);
          }
          return { "success": true, data: true };
        }
      }
      
      return { "success": false, error: 'Subscription not found' };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to unsubscribe' 
      };
    }
  }

  async broadcastToRoom(roomId: string, eventData: Omit<MessageEvent, 'id' | 'timestamp'>): Promise<BrokerResult<boolean>> {
    try {
      const event: MessageEvent = {
        id: 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        ...eventData,
        timestamp: new Date()
      };
      
      const roomSubs = this.roomSubscriptions.get(roomId);
      if (roomSubs) {
        roomSubs.forEach(callback => {
          try {
            callback(event);
          } catch (error) {
            console.error('Broadcast callback error:', error);
          }
        });
      }
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to broadcast to room' 
      };
    }
  }

  async sendToUser(userId: string, eventData: Omit<MessageEvent, 'id' | 'timestamp'>): Promise<BrokerResult<boolean>> {
    try {
      const event: MessageEvent = {
        id: 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        ...eventData,
        timestamp: new Date()
      };
      
      const userSubs = this.userSubscriptions.get(userId);
      if (userSubs) {
        userSubs.forEach(callback => {
          try {
            callback(event);
          } catch (error) {
            console.error('User message callback error:', error);
          }
        });
      }
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to send to user' 
      };
    }
  }

  async notifyTyping(roomId: string, userId: string, isTyping: boolean): Promise<BrokerResult<boolean>> {
    try {
      await this.broadcastToRoom(roomId, {
        type: 'typing',
        roomId,
        userId,
        data: { isTyping }
      });
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to notify typing' 
      };
    }
  }

  async getHealthStatus(): Promise<BrokerResult<{ status: string; connections: number; uptime: number }>> {
    try {
      const uptime = Date.now() - this.startTime;
      const connectionCount = this.connections.size;
      
      return { 
        "success": true, 
        data: { 
          status: 'healthy', 
          connections: connectionCount, 
          uptime 
        } 
      };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to get health status' 
      };
    }
  }

  async cleanup(): Promise<BrokerResult<boolean>> {
    try {
      // Disconnect all connections
      const connectionIds = Array.from(this.connections.keys());
      for (const connectionId of connectionIds) {
        await this.disconnect(connectionId);
      }
      
      // Clear all subscriptions
      this.roomSubscriptions.clear();
      this.userSubscriptions.clear();
      this.eventEmitter.removeAllListeners();
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to cleanup' 
      };
    }
  }
}

describe('MessageBroker Real-time Communication External Test', () => {
  let broker: MessageBroker;

  beforeEach(() => {
    broker = new MockMessageBroker();
  });

  afterEach(async () => {
    await broker.cleanup();
  });

  test('should connect users In Progress', async () => {
    // Act
    const result = await broker.connect('user1', 'testuser1');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.id).toBeDefined();
    expect(result.data?.userId).toBe('user1');
    expect(result.data?.username).toBe('testuser1');
    expect(result.data?.status).toBe('connected');
    expect(result.data?.connectedAt).toBeInstanceOf(Date);
  });

  test('should disconnect users In Progress', async () => {
    // Arrange
    const connectResult = await broker.connect('user1', 'testuser1');
    const connectionId = connectResult.data!.id;

    // Act
    const disconnectResult = await broker.disconnect(connectionId);

    // Assert
    expect(disconnectResult.success).toBe(true);
    expect(disconnectResult.data).toBe(true);
  });

  test('should handle disconnect of non-existent connection', async () => {
    // Act
    const result = await broker.disconnect('non-existent-id');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection not found');
  });

  test('should get connections list', async () => {
    // Arrange
    await broker.connect('user1', 'testuser1');
    await broker.connect('user2', 'testuser2');

    // Act
    const result = await broker.getConnections();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.find(c => c.userId === 'user1')).toBeDefined();
    expect(result.data?.find(c => c.userId === 'user2')).toBeDefined();
  });

  test('should join and leave rooms', async () => {
    // Arrange
    const connectResult = await broker.connect('user1', 'testuser1');
    const connectionId = connectResult.data!.id;

    // Act - Join room
    const joinResult = await broker.joinRoom(connectionId, 'general');

    // Assert
    expect(joinResult.success).toBe(true);
    expect(joinResult.data).toBe(true);

    // Verify connection is in room
    const connectionsResult = await broker.getConnections('general');
    expect(connectionsResult.success).toBe(true);
    expect(connectionsResult.data).toHaveLength(1);
    expect(connectionsResult.data?.[0].roomId).toBe('general');

    // Act - Leave room
    const leaveResult = await broker.leaveRoom(connectionId, 'general');

    // Assert
    expect(leaveResult.success).toBe(true);
    expect(leaveResult.data).toBe(true);

    // Verify connection left room
    const connectionsAfterLeave = await broker.getConnections('general');
    expect(connectionsAfterLeave.data).toHaveLength(0);
  });

  test('should subscribe to room messages', async () => {
    // Arrange
    const receivedMessages: MessageEvent[] = [];
    
    // Act
    const subscribeResult = await broker.subscribeToRoom('general', (message) => {
      receivedMessages.push(message);
    });

    // Assert
    expect(subscribeResult.success).toBe(true);
    expect(subscribeResult.subscriptionId).toBeDefined();

    // Test message delivery
    await broker.publishMessage({
      type: 'message',
      roomId: 'general',
      userId: 'user1',
      username: 'testuser1',
      data: { content: 'Hello, room!' }
    });

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0].data.content).toBe('Hello, room!');
  });

  test('should subscribe to user messages', async () => {
    // Arrange
    const receivedMessages: MessageEvent[] = [];
    
    // Act
    const subscribeResult = await broker.subscribeToUser('user1', (message) => {
      receivedMessages.push(message);
    });

    // Assert
    expect(subscribeResult.success).toBe(true);
    expect(subscribeResult.subscriptionId).toBeDefined();

    // Test message delivery
    await broker.sendToUser('user1', {
      type: 'system',
      roomId: 'general',
      data: { content: 'Direct message to user' }
    });

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0].data.content).toBe('Direct message to user');
  });

  test('should unsubscribe from messages', async () => {
    // Arrange
    const receivedMessages: MessageEvent[] = [];
    const subscribeResult = await broker.subscribeToRoom('general', (message) => {
      receivedMessages.push(message);
    });
    const subscriptionId = subscribeResult.subscriptionId!;

    // Act
    const unsubscribeResult = await broker.unsubscribe(subscriptionId);

    // Assert
    expect(unsubscribeResult.success).toBe(true);
    expect(unsubscribeResult.data).toBe(true);

    // Test that messages are no longer received
    await broker.publishMessage({
      type: 'message',
      roomId: 'general',
      userId: 'user1',
      data: { content: 'This should not be received' }
    });

    expect(receivedMessages).toHaveLength(0);
  });

  test('should handle unsubscribe of non-existent subscription', async () => {
    // Act
    const result = await broker.unsubscribe('non-existent-sub');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Subscription not found');
  });

  test('should publish messages to room subscribers', async () => {
    // Arrange
    const subscriber1Messages: MessageEvent[] = [];
    const subscriber2Messages: MessageEvent[] = [];
    
    await broker.subscribeToRoom('general', (msg) => subscriber1Messages.push(msg));
    await broker.subscribeToRoom('general', (msg) => subscriber2Messages.push(msg));

    // Act
    const publishResult = await broker.publishMessage({
      type: 'message',
      roomId: 'general',
      userId: 'user1',
      username: 'testuser1',
      data: { content: 'Hello everyone!' }
    });

    // Assert
    expect(publishResult.success).toBe(true);
    expect(publishResult.data?.id).toBeDefined();
    expect(publishResult.data?.timestamp).toBeInstanceOf(Date);

    expect(subscriber1Messages).toHaveLength(1);
    expect(subscriber2Messages).toHaveLength(1);
    expect(subscriber1Messages[0].data.content).toBe('Hello everyone!');
    expect(subscriber2Messages[0].data.content).toBe('Hello everyone!');
  });

  test('should broadcast events to room', async () => {
    // Arrange
    const receivedEvents: MessageEvent[] = [];
    await broker.subscribeToRoom('general', (event) => receivedEvents.push(event));

    // Act
    const broadcastResult = await broker.broadcastToRoom('general', {
      type: 'system',
      roomId: 'general',
      data: { announcement: 'Server maintenance in 5 minutes' }
    });

    // Assert
    expect(broadcastResult.success).toBe(true);
    expect(broadcastResult.data).toBe(true);

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].type).toBe('system');
    expect(receivedEvents[0].data.announcement).toBe('Server maintenance in 5 minutes');
  });

  test('should send direct messages to users', async () => {
    // Arrange
    const receivedMessages: MessageEvent[] = [];
    await broker.subscribeToUser('user1', (msg) => receivedMessages.push(msg));

    // Act
    const sendResult = await broker.sendToUser('user1', {
      type: 'workflow_notification',
      roomId: 'general',
      data: { workflowId: 'backup-flow', status: 'In Progress' }
    });

    // Assert
    expect(sendResult.success).toBe(true);
    expect(sendResult.data).toBe(true);

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0].type).toBe('workflow_notification');
    expect(receivedMessages[0].data.workflowId).toBe('backup-flow');
  });

  test('should handle typing notifications', async () => {
    // Arrange
    const receivedEvents: MessageEvent[] = [];
    await broker.subscribeToRoom('general', (event) => receivedEvents.push(event));

    // Act - Start typing
    const startTypingResult = await broker.notifyTyping('general', 'user1', true);
    
    // Act - Stop typing
    const stopTypingResult = await broker.notifyTyping('general', 'user1', false);

    // Assert
    expect(startTypingResult.success).toBe(true);
    expect(stopTypingResult.success).toBe(true);

    expect(receivedEvents).toHaveLength(2);
    expect(receivedEvents[0].type).toBe('typing');
    expect(receivedEvents[0].data.isTyping).toBe(true);
    expect(receivedEvents[1].type).toBe('typing');
    expect(receivedEvents[1].data.isTyping).toBe(false);
  });

  test('should provide health status', async () => {
    // Arrange
    await broker.connect('user1', 'testuser1');
    await broker.connect('user2', 'testuser2');
    
    // Add small delay to ensure uptime > 0
    await new Promise(resolve => setTimeout(resolve, 10));

    // Act
    const healthResult = await broker.getHealthStatus();

    // Assert
    expect(healthResult.success).toBe(true);
    expect(healthResult.data?.status).toBe('healthy');
    expect(healthResult.data?.connections).toBe(2);
    expect(healthResult.data?.uptime).toBeGreaterThanOrEqual(0);
  });

  test('should handle multiple room subscriptions', async () => {
    // Arrange
    const generalMessages: MessageEvent[] = [];
    const devMessages: MessageEvent[] = [];
    
    await broker.subscribeToRoom('general', (msg) => generalMessages.push(msg));
    await broker.subscribeToRoom('dev-team', (msg) => devMessages.push(msg));

    // Act
    await broker.publishMessage({
      type: 'message',
      roomId: 'general',
      userId: 'user1',
      data: { content: 'General message' }
    });

    await broker.publishMessage({
      type: 'message',
      roomId: 'dev-team',
      userId: 'user1',
      data: { content: 'Dev team message' }
    });

    // Assert
    expect(generalMessages).toHaveLength(1);
    expect(devMessages).toHaveLength(1);
    expect(generalMessages[0].data.content).toBe('General message');
    expect(devMessages[0].data.content).toBe('Dev team message');
  });

  test('should handle room switching with notifications', async () => {
    // Arrange
    const connectResult = await broker.connect('user1', 'testuser1');
    const connectionId = connectResult.data!.id;
    
    const generalEvents: MessageEvent[] = [];
    const devEvents: MessageEvent[] = [];
    
    await broker.subscribeToRoom('general', (event) => generalEvents.push(event));
    await broker.subscribeToRoom('dev-team', (event) => devEvents.push(event));

    // Act - Join first room
    await broker.joinRoom(connectionId, 'general');
    
    // Act - Switch to second room
    await broker.joinRoom(connectionId, 'dev-team');

    // Assert - Should have received join events
    expect(generalEvents).toHaveLength(2); // join + leave
    expect(devEvents).toHaveLength(1); // join only

    expect(generalEvents[0].type).toBe('user_joined');
    expect(generalEvents[1].type).toBe('user_left');
    expect(devEvents[0].type).toBe('user_joined');
  });

  test('should handle concurrent message publishing', async () => {
    // Arrange
    const receivedMessages: MessageEvent[] = [];
    await broker.subscribeToRoom('general', (msg) => receivedMessages.push(msg));

    // Act - Publish multiple messages concurrently
    const publishPromises = [];
    for (let i = 1; i <= 5; i++) {
      publishPromises.push(
        broker.publishMessage({
          type: 'message',
          roomId: 'general',
          userId: `user${i}`,
          data: { content: `Message ${i}` }
        })
      );
    }

    const results = await Promise.all(publishPromises);

    // Assert
    expect(results.every(r => r.success)).toBe(true);
    expect(receivedMessages).toHaveLength(5);
    
    // Verify all messages were received
    for (let i = 1; i <= 5; i++) {
      expect(receivedMessages.some(msg => msg.data.content === `Message ${i}`)).toBe(true);
    }
  });

  test('should maintain message ordering', async () => {
    // Arrange
    const receivedMessages: MessageEvent[] = [];
    await broker.subscribeToRoom('general', (msg) => receivedMessages.push(msg));

    // Act - Publish messages sequentially
    for (let i = 1; i <= 3; i++) {
      await broker.publishMessage({
        type: 'message',
        roomId: 'general',
        userId: 'user1',
        data: { content: `Message ${i}`, sequence: i }
      });
    }

    // Assert - Messages should be in order
    expect(receivedMessages).toHaveLength(3);
    expect(receivedMessages[0].data.sequence).toBe(1);
    expect(receivedMessages[1].data.sequence).toBe(2);
    expect(receivedMessages[2].data.sequence).toBe(3);
  });

  test('should handle subscription cleanup on disconnect', async () => {
    // Arrange
    const connectResult = await broker.connect('user1', 'testuser1');
    const connectionId = connectResult.data!.id;
    
    await broker.joinRoom(connectionId, 'general');
    
    const generalEvents: MessageEvent[] = [];
    await broker.subscribeToRoom('general', (event) => generalEvents.push(event));

    // Act - Disconnect user
    await broker.disconnect(connectionId);

    // Assert - Should have received leave notification
    expect(generalEvents.some(event => event.type === 'user_left')).toBe(true);
    
    // Verify connection is removed
    const connectionsResult = await broker.getConnections();
    expect(connectionsResult.data?.find(c => c.id === connectionId)).toBeUndefined();
  });

  test('should handle different message types correctly', async () => {
    // Arrange
    const receivedMessages: MessageEvent[] = [];
    await broker.subscribeToRoom('general', (msg) => receivedMessages.push(msg));

    const messageTypes: Array<MessageEvent['type']> = [
      'message', 'user_joined', 'user_left', 'typing', 'system', 'workflow_notification'
    ];

    // Act
    for (const type of messageTypes) {
      await broker.publishMessage({
        type,
        roomId: 'general',
        userId: 'user1',
        data: { type }
      });
    }

    // Assert
    expect(receivedMessages).toHaveLength(messageTypes.length);
    messageTypes.forEach((type, index) => {
      expect(receivedMessages[index].type).toBe(type);
    });
  });
});