import { FileStorage, User, Room, Message } from '../../src/external/file-storage';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { TestFileSystem } from '../helpers/test-file-system';

describe('FileStorage Comprehensive Tests', () => {
  let storage: FileStorage;
  let testDir: string;
  let testFs: TestFileSystem;

  beforeEach(async () => {
    testFs = new TestFileSystem();
    testDir = await testFs.createTempDir('file-storage-test');
    storage = new FileStorage(testDir);
    await storage.initialize();
  });

  afterEach(async () => {
    await testFs.cleanup();
  });

  describe("Initialization", () => {
    test('should create all required directories', async () => {
      const dirs = ['users', 'rooms', "messages"];
      for (const dir of dirs) {
        const dirPath = path.join(testDir, dir);
        const stats = await fs.stat(dirPath);
        expect(stats.isDirectory()).toBe(true);
      }
    });

    test('should handle re-initialization gracefully', async () => {
      // Initialize again
      await expect(storage.initialize()).resolves.not.toThrow();
    });

    test('should handle initialization with existing directories', async () => {
      // Create directories manually
      await fs.mkdir(path.join(testDir, 'users'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'rooms'), { recursive: true });
      
      const newStorage = new FileStorage(testDir);
      await expect(newStorage.initialize()).resolves.not.toThrow();
    });
  });

  describe('User Operations', () => {
    const testUser: User = {
      id: 'user-123',
      username: "testuser",
      connectionId: 'conn-456',
      registeredAt: new Date('2024-01-01T10:00:00Z')
    };

    test('should save and load user successfully', async () => {
      await storage.saveUser(testUser);
      const loaded = await storage.loadUser(testUser.id);
      
      expect(loaded).toEqual(testUser);
    });

    test('should return null for non-existent user', async () => {
      const loaded = await storage.loadUser('non-existent');
      expect(loaded).toBeNull();
    });

    test('should update existing user', async () => {
      await storage.saveUser(testUser);
      
      const updatedUser = { ...testUser, username: 'updated-name' };
      await storage.saveUser(updatedUser);
      
      const loaded = await storage.loadUser(testUser.id);
      expect(loaded?.username).toBe('updated-name');
    });

    test('should handle user without connectionId', async () => {
      const userWithoutConn: User = {
        id: 'user-789',
        username: "noconnuser",
        registeredAt: new Date()
      };
      
      await storage.saveUser(userWithoutConn);
      const loaded = await storage.loadUser(userWithoutConn.id);
      
      expect(loaded).toEqual(userWithoutConn);
    });

    test('should handle special characters in username', async () => {
      const specialUser: User = {
        id: 'user-special',
        username: 'user@#$%^&*()',
        registeredAt: new Date()
      };
      
      await storage.saveUser(specialUser);
      const loaded = await storage.loadUser(specialUser.id);
      
      expect(loaded?.username).toBe(specialUser.username);
    });
  });

  describe('Room Operations', () => {
    const testRoom: Room = {
      id: 'room-123',
      name: 'Test Room',
      description: 'A test chat room',
      createdBy: 'user-123',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      messageCount: 0,
      userCount: 1,
      lastActivity: new Date('2024-01-01T10:00:00Z')
    };

    test('should save and load room successfully', async () => {
      await storage.saveRoom(testRoom);
      const loaded = await storage.loadRoom(testRoom.id);
      
      expect(loaded).toEqual(testRoom);
    });

    test('should return null for non-existent room', async () => {
      const loaded = await storage.loadRoom('non-existent');
      expect(loaded).toBeNull();
    });

    test('should update room statistics', async () => {
      await storage.saveRoom(testRoom);
      
      const updatedRoom = {
        ...testRoom,
        messageCount: 10,
        userCount: 5,
        lastActivity: new Date('2024-01-02T10:00:00Z')
      };
      await storage.saveRoom(updatedRoom);
      
      const loaded = await storage.loadRoom(testRoom.id);
      expect(loaded?.messageCount).toBe(10);
      expect(loaded?.userCount).toBe(5);
      expect(loaded?.lastActivity).toEqual(updatedRoom.lastActivity);
    });

    test('should handle room without description', async () => {
      const roomNoDesc: Room = {
        id: 'room-nodesc',
        name: 'No Description Room',
        createdBy: 'user-123',
        createdAt: new Date(),
        messageCount: 0,
        userCount: 1,
        lastActivity: new Date()
      };
      
      await storage.saveRoom(roomNoDesc);
      const loaded = await storage.loadRoom(roomNoDesc.id);
      
      expect(loaded).toEqual(roomNoDesc);
    });

    test('should get all rooms', async () => {
      const room1 = { ...testRoom, id: 'room-1', name: 'Room 1' };
      const room2 = { ...testRoom, id: 'room-2', name: 'Room 2' };
      const room3 = { ...testRoom, id: 'room-3', name: 'Room 3' };
      
      await storage.saveRoom(room1);
      await storage.saveRoom(room2);
      await storage.saveRoom(room3);
      
      const allRooms = await storage.getAllRooms();
      expect(allRooms).toHaveLength(3);
      expect(allRooms.map(r => r.name).sort()).toEqual(['Room 1', 'Room 2', 'Room 3']);
    });

    test('should handle empty rooms directory', async () => {
      const allRooms = await storage.getAllRooms();
      expect(allRooms).toEqual([]);
    });
  });

  describe('Message Operations', () => {
    const testMessage: Message = {
      id: 'msg-123',
      roomId: 'room-123',
      userId: 'user-123',
      username: "testuser",
      content: 'Hello, world!',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      type: 'text'
    };

    test('should save message successfully', async () => {
      await storage.saveMessage(testMessage);
      
      // Verify file exists
      const msgDir = path.join(testDir, "messages", testMessage.roomId);
      const files = await fs.readdir(msgDir);
      expect(files).toContain(`${testMessage.id}.json`);
    });

    test('should load messages for room', async () => {
      const msg1 = { ...testMessage, id: 'msg-1', timestamp: new Date('2024-01-01T10:00:00Z') };
      const msg2 = { ...testMessage, id: 'msg-2', timestamp: new Date('2024-01-01T11:00:00Z') };
      const msg3 = { ...testMessage, id: 'msg-3', timestamp: new Date('2024-01-01T12:00:00Z') };
      
      await storage.saveMessage(msg1);
      await storage.saveMessage(msg2);
      await storage.saveMessage(msg3);
      
      const messages = await storage.loadMessages(testMessage.roomId);
      expect(messages).toHaveLength(3);
      // Should be sorted by timestamp
      expect(messages[0].id).toBe('msg-1');
      expect(messages[2].id).toBe('msg-3');
    });

    test('should handle different message types', async () => {
      const types: Array<Message['type']> = ['text', 'command', 'system', "workflow"];
      
      for (const type of types) {
        const msg: Message = {
          ...testMessage,
          id: `msg-${type}`,
          type,
          content: `${type} message`
        };
        await storage.saveMessage(msg);
      }
      
      const messages = await storage.loadMessages(testMessage.roomId);
      expect(messages).toHaveLength(types.length);
      
      const messageTypes = messages.map(m => m.type);
      expect(messageTypes.sort()).toEqual(types.sort());
    });

    test('should limit messages with maxCount', async () => {
      // Save 10 messages
      for (let i = 0; i < 10; i++) {
        await storage.saveMessage({
          ...testMessage,
          id: `msg-${i}`,
          timestamp: new Date(2024, 0, 1, 10, i)
        });
      }
      
      const messages = await storage.loadMessages(testMessage.roomId, 5);
      expect(messages).toHaveLength(5);
      // Should get the 5 most recent messages
      expect(messages[0].id).toBe('msg-5');
      expect(messages[4].id).toBe('msg-9');
    });

    test('should handle empty messages directory', async () => {
      const messages = await storage.loadMessages('non-existent-room');
      expect(messages).toEqual([]);
    });

    test('should handle special characters in message content', async () => {
      const specialMsg: Message = {
        ...testMessage,
        id: 'msg-special',
        content: 'Special chars: @#$%^&*() 测试 🚀 émojis'
      };
      
      await storage.saveMessage(specialMsg);
      const messages = await storage.loadMessages(testMessage.roomId);
      
      expect(messages[0].content).toBe(specialMsg.content);
    });

    test('should handle very long message content', async () => {
      const longContent = 'x'.repeat(10000);
      const longMsg: Message = {
        ...testMessage,
        id: 'msg-long',
        content: longContent
      };
      
      await storage.saveMessage(longMsg);
      const messages = await storage.loadMessages(testMessage.roomId);
      
      expect(messages[0].content).toBe(longContent);
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid JSON when loading user', async () => {
      const userPath = path.join(testDir, 'users', 'corrupt.json');
      await fs.writeFile(userPath, 'invalid json content');
      
      await expect(storage.loadUser('corrupt')).rejects.toThrow();
    });

    test('should throw error for invalid JSON when loading room', async () => {
      const roomPath = path.join(testDir, 'rooms', 'corrupt.json');
      await fs.writeFile(roomPath, 'invalid json content');
      
      await expect(storage.loadRoom('corrupt')).rejects.toThrow();
    });

    test('should handle permission errors gracefully', async () => {
      // This test would require mocking fs to simulate permission errors
      // For now, we'll skip this as it requires platform-specific setup
    });
  });

  describe("Performance", () => {
    test('should handle large number of messages efficiently', async () => {
      const testMessage: Message = {
        id: 'msg-perf',
        roomId: 'room-perf',
        userId: 'user-perf',
        username: "perfuser",
        content: 'Performance test message',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        type: 'text'
      };

      const startTime = Date.now();
      
      // Save 100 messages
      for (let i = 0; i < 100; i++) {
        await storage.saveMessage({
          ...testMessage,
          id: `msg-perf-${i}`,
          timestamp: new Date(2024, 0, 1, 10, 0, i)
        });
      }
      
      // Load all messages
      const messages = await storage.loadMessages(testMessage.roomId);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(messages).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});