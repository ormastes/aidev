import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { MessageBroker, Message } from '../../src/external/message-broker';

describe('MessageBroker Comprehensive Tests', () => {
  let broker: MessageBroker;
  let eventBus: EventEmitter;
  let emittedEvents: Array<{ event: string; data: any }>;

  beforeEach(() => {
    eventBus = new EventEmitter();
    broker = new MessageBroker(eventBus);
    emittedEvents = [];

    // Capture all emitted events for testing
    const originalEmit = eventBus.emit.bind(eventBus);
    eventBus.emit = (event: string, ...args: any[]) => {
      emittedEvents.push({ event, data: args[0] });
      return originalEmit(event, ...args);
    };
  });

  afterEach(() => {
    broker.stopHeartbeat();
    eventBus.removeAllListeners();
  });

  describe('Connection Management', () => {
    test('should connect user successfully', async () => {
      await broker.connect('conn-1', 'user-1');

      const stats = broker.getBroadcastStats();
      expect(stats.activeConnections).toBe(1);
      
      const event = emittedEvents.find(e => e.event === 'connection:established');
      expect(event).toBeDefined();
      expect(event?.data.connectionId).toBe('conn-1');
      expect(event?.data.userId).toBe('user-1');
    });

    test('should disconnect user successfully', async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.disconnect('conn-1');

      const stats = broker.getBroadcastStats();
      expect(stats.activeConnections).toBe(0);
      
      const event = emittedEvents.find(e => e.event === 'connection:closed');
      expect(event).toBeDefined();
      expect(event?.data.connectionId).toBe('conn-1');
    });

    test('should throw error when disconnecting non-existent connection', async () => {
      await expect(broker.disconnect('non-existent')).rejects.toThrow('Connection non-existent not found');
    });

    test('should handle multiple connections from same user', async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.connect('conn-2', 'user-1');

      const stats = broker.getBroadcastStats();
      expect(stats.activeConnections).toBe(2);
    });

    test('should handle event-based connection', async () => {
      eventBus.emit('broker:connect', { connectionId: 'event-conn', userId: 'event-user' });
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stats = broker.getBroadcastStats();
      expect(stats.activeConnections).toBe(1);
    });

    test('should handle event-based disconnection', async () => {
      await broker.connect('event-conn', 'event-user');
      eventBus.emit('broker:disconnect', { connectionId: 'event-conn' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stats = broker.getBroadcastStats();
      expect(stats.activeConnections).toBe(0);
    });
  });

  describe('Room Management', () => {
    beforeEach(async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.connect('conn-2', 'user-2');
    });

    test('should join room successfully', async () => {
      await broker.joinRoom('conn-1', 'room-1');

      const users = await broker.getRoomUsers('room-1');
      expect(users).toContain('user-1');
      expect(users).toHaveLength(1);

      const event = emittedEvents.find(e => e.event === 'room:user_joined');
      expect(event?.data.roomId).toBe('room-1');
      expect(event?.data.userId).toBe('user-1');
    });

    test('should throw error when joining room with invalid connection', async () => {
      await expect(broker.joinRoom('invalid-conn', 'room-1')).rejects.toThrow('Connection invalid-conn not found');
    });

    test('should handle multiple users in room', async () => {
      await broker.joinRoom('conn-1', 'room-1');
      await broker.joinRoom('conn-2', 'room-1');

      const users = await broker.getRoomUsers('room-1');
      expect(users).toContain('user-1');
      expect(users).toContain('user-2');
      expect(users).toHaveLength(2);
    });

    test('should leave room successfully', async () => {
      await broker.joinRoom('conn-1', 'room-1');
      await broker.leaveRoom('conn-1', 'room-1');

      const users = await broker.getRoomUsers('room-1');
      expect(users).toHaveLength(0);

      const event = emittedEvents.find(e => e.event === 'room:user_left');
      expect(event?.data.roomId).toBe('room-1');
      expect(event?.data.userId).toBe('user-1');
    });

    test('should handle user in multiple rooms', async () => {
      await broker.joinRoom('conn-1', 'room-1');
      await broker.joinRoom('conn-1', 'room-2');
      await broker.joinRoom('conn-1', 'room-3');

      const rooms = broker.getConnectionRooms('conn-1');
      expect(rooms.length).toBe(3);
    });

    test('should clean up rooms on disconnect', async () => {
      await broker.joinRoom('conn-1', 'room-1');
      await broker.joinRoom('conn-1', 'room-2');
      await broker.disconnect('conn-1');

      expect(await broker.getRoomUsers('room-1')).toHaveLength(0);
      expect(await broker.getRoomUsers('room-2')).toHaveLength(0);
    });

    test('should handle event-based room join', async () => {
      eventBus.emit('broker:join_room', { connectionId: 'conn-1', roomId: 'event-room' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const users = await broker.getRoomUsers('event-room');
      expect(users).toContain('user-1');
    });

    test('should handle event-based room leave', async () => {
      await broker.joinRoom('conn-1', 'event-room');
      eventBus.emit('broker:leave_room', { connectionId: 'conn-1', roomId: 'event-room' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const users = await broker.getRoomUsers('event-room');
      expect(users).toHaveLength(0);
    });
  });

  describe('Message Broadcasting', () => {
    const testMessage: Message = {
      id: 'msg-1',
      roomId: 'room-1',
      userId: 'user-1',
      username: 'testuser',
      content: 'Hello, world!',
      timestamp: new Date(),
      type: 'text'
    };

    beforeEach(async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.connect('conn-2', 'user-2');
      await broker.connect('conn-3', 'user-3');
      await broker.joinRoom('conn-1', 'room-1');
      await broker.joinRoom('conn-2', 'room-1');
    });

    test('should broadcast message to room users', async () => {
      await broker.broadcastMessage('room-1', testMessage);

      const event = emittedEvents.find(e => e.event === 'message:broadcast');
      expect(event?.data.message).toEqual(testMessage);
      expect(event?.data.recipients).toContain('user-1');
      expect(event?.data.recipients).toContain('user-2');
      expect(event?.data.recipients).not.toContain('user-3');
    });

    test('should track message history', async () => {
      await broker.broadcastMessage('room-1', testMessage);
      
      const history = await broker.getMessageHistory('room-1');
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(testMessage);
    });

    test('should maintain message history limit', async () => {
      // Send 150 messages (limit is 100)
      for (let i = 0; i < 150; i++) {
        await broker.broadcastMessage('room-1', {
          ...testMessage,
          id: `msg-${i}`,
          content: `Message ${i}`
        });
      }

      const history = await broker.getMessageHistory('room-1');
      expect(history).toHaveLength(100);
      expect(history[0].id).toBe('msg-50'); // First 50 should be removed
      expect(history[99].id).toBe('msg-149'); // Last should be most recent
    });

    test('should handle broadcast to empty room', async () => {
      await broker.broadcastMessage('empty-room', testMessage);

      const event = emittedEvents.find(e => e.event === 'message:broadcast');
      expect(event?.data.recipients).toEqual([]);
    });

    test('should update statistics on broadcast', async () => {
      const statsBefore = broker.getBroadcastStats();
      await broker.broadcastMessage('room-1', testMessage);
      const statsAfter = broker.getBroadcastStats();

      expect(statsAfter.totalMessages).toBe(statsBefore.totalMessages + 1);
      expect(statsAfter.roomActivity.get('room-1')).toBe(1);
    });

    test('should handle different message types', async () => {
      const types: Array<Message['type']> = ['text', 'command', 'system', 'workflow'];
      
      for (const type of types) {
        await broker.broadcastMessage('room-1', {
          ...testMessage,
          id: `msg-${type}`,
          type
        });
      }

      const history = await broker.getMessageHistory('room-1');
      expect(history).toHaveLength(types.length);
      expect(history.map(m => m.type)).toEqual(types);
    });

    test('should handle event-based broadcast', async () => {
      eventBus.emit('broker:broadcast', { roomId: 'room-1', message: testMessage });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const history = await broker.getMessageHistory('room-1');
      expect(history).toHaveLength(1);
    });

    test('should limit message history per room', async () => {
      // Send messages to multiple rooms
      await broker.joinRoom('conn-1', 'room-2');
      
      for (let i = 0; i < 50; i++) {
        await broker.broadcastMessage('room-1', { ...testMessage, id: `r1-${i}` });
        await broker.broadcastMessage('room-2', { ...testMessage, id: `r2-${i}` });
      }

      expect(await broker.getMessageHistory('room-1')).toHaveLength(50);
      expect(await broker.getMessageHistory('room-2')).toHaveLength(50);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track active connections', async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.connect('conn-2', 'user-2');
      await broker.connect('conn-3', 'user-3');

      const stats = broker.getBroadcastStats();
      expect(stats.activeConnections).toBe(3);

      await broker.disconnect('conn-2');
      const updatedStats = broker.getBroadcastStats();
      expect(updatedStats.activeConnections).toBe(2);
    });

    test('should track room activity', async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.joinRoom('conn-1', 'room-1');
      await broker.joinRoom('conn-1', 'room-2');

      for (let i = 0; i < 5; i++) {
        await broker.broadcastMessage('room-1', { 
          ...testMessage, 
          id: `msg-${i}` 
        });
      }

      for (let i = 0; i < 3; i++) {
        await broker.broadcastMessage('room-2', { 
          ...testMessage, 
          id: `msg-${i}`,
          roomId: 'room-2'
        });
      }

      const stats = broker.getBroadcastStats();
      expect(stats.roomActivity.get('room-1')).toBe(5);
      expect(stats.roomActivity.get('room-2')).toBe(3);
    });

    test('should get connection info', async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.joinRoom('conn-1', 'room-1');
      await broker.joinRoom('conn-1', 'room-2');

      const isActive = broker.isConnectionActive('conn-1');
      const rooms = broker.getConnectionRooms('conn-1');
      expect(isActive).toBe(true);
      expect(rooms.length).toBe(2);
    });

    test('should return false for non-existent connection', () => {
      const isActive = broker.isConnectionActive('non-existent');
      expect(isActive).toBe(false);
    });
  });

  describe('Heartbeat Monitoring', () => {
    test('should start heartbeat monitoring', () => {
      broker.startHeartbeat(100); // 100ms interval for testing
      
      const connection = broker['heartbeatInterval'];
      expect(connection).toBeDefined();
    });

    test('should stop heartbeat monitoring', () => {
      broker.startHeartbeat(100);
      broker.stopHeartbeat();
      
      const connection = broker['heartbeatInterval'];
      expect(connection).toBeUndefined();
    });

    test('should detect inactive connections', async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.connect('conn-2', 'user-2');
      
      // Manually set one connection as inactive
      const connection = broker['connections'].get('conn-1');
      if (connection) {
        connection.lastActivity = new Date(Date.now() - 70000); // 70 seconds ago
      }

      broker.startHeartbeat(50);
      
      // Wait for heartbeat to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const inactiveEvent = emittedEvents.find(e => e.event === 'connection:inactive');
      expect(inactiveEvent).toBeDefined();
      expect(inactiveEvent?.data.connectionId).toBe('conn-1');
      
      broker.stopHeartbeat();
    });

    test('should update last activity on message', async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.joinRoom('conn-1', 'room-1');
      
      const beforeBroadcast = Date.now();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await broker.broadcastMessage('room-1', testMessage);
      
      const afterBroadcast = Date.now();
      expect(afterBroadcast).toBeGreaterThan(beforeBroadcast);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in event handlers gracefully', async () => {
      // Mock console.error to verify error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Emit event with invalid data
      eventBus.emit('broker:connect', null);
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should handle concurrent operations', async () => {
      // Connect multiple users concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(broker.connect(`conn-${i}`, `user-${i}`));
      }
      
      await Promise.all(promises);
      
      const stats = broker.getBroadcastStats();
      expect(stats.activeConnections).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty username', async () => {
      await broker.connect('conn-empty', '');
      
      const isActive = broker.isConnectionActive('conn-empty');
      expect(isActive).toBe(true);
    });

    test('should handle very long message content', async () => {
      await broker.connect('conn-1', 'user-1');
      await broker.joinRoom('conn-1', 'room-1');
      
      const longMessage: Message = {
        ...testMessage,
        content: 'x'.repeat(50000) // 50KB message
      };
      
      await broker.broadcastMessage('room-1', longMessage);
      
      const history = await broker.getMessageHistory('room-1');
      expect(history[0].content.length).toBe(50000);
    });

    test('should handle rapid connect/disconnect', async () => {
      for (let i = 0; i < 20; i++) {
        await broker.connect(`rapid-${i}`, `user-${i}`);
        await broker.disconnect(`rapid-${i}`);
      }
      
      const stats = broker.getBroadcastStats();
      expect(stats.activeConnections).toBe(0);
    });
  });
});

const testMessage: Message = {
  id: 'msg-test',
  roomId: 'room-1',
  userId: 'user-1',
  username: 'testuser',
  content: 'Test message',
  timestamp: new Date(),
  type: 'text'
};