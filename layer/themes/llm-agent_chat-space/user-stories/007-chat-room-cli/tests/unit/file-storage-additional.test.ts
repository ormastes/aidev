import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { FileStorage } from '../../src/external/file-storage';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';
import type { User, Room, Message } from '../../src/external/file-storage';

describe('FileStorage Additional Coverage Tests', () => {
  let storage: FileStorage;
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-storage-test-'));
    storage = new FileStorage(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('deleteUser', () => {
    test('should delete existing user', async () => {
      const user: User = {
        id: 'user-delete-1',
        username: 'deleteuser',
        registeredAt: new Date('2024-01-01T12:00:00Z')
      };
      
      await storage.saveUser(user);
      const result = await storage.deleteUser(user.id);
      
      expect(result).toBe(true);
      
      // Verify user is deleted
      const loadedUser = await storage.loadUser(user.id);
      expect(loadedUser).toBeNull();
    });

    test('should return false for non-existent user', async () => {
      const result = await storage.deleteUser('non-existent-user');
      expect(result).toBe(false);
    });

    test('should handle file system errors', async () => {
      // Create a directory instead of file to cause error
      const userId = 'error-user';
      const userPath = path.join(testDir, 'users', `${userId}.json`);
      await fs.mkdir(userPath, { recursive: true });
      
      await expect(storage.deleteUser(userId)).rejects.toThrow();
    });
  });

  describe('deleteRoom', () => {
    test('should delete room and its messages', async () => {
      const room: Room = {
        id: 'room-delete-1',
        name: 'Delete Room',
        createdBy: 'user-123',
        createdAt: new Date(),
        messageCount: 0,
        userCount: 0,
        lastActivity: new Date()
      };
      
      const message: Message = {
        id: 'msg-1',
        roomId: room.id,
        userId: 'user-123',
        username: 'testuser',
        content: 'Test message',
        timestamp: new Date(),
        type: 'text'
      };
      
      await storage.saveRoom(room);
      await storage.saveMessage(message);
      
      const result = await storage.deleteRoom(room.id);
      
      expect(result).toBe(true);
      
      // Verify room is deleted
      const loadedRoom = await storage.loadRoom(room.id);
      expect(loadedRoom).toBeNull();
      
      // Verify messages are deleted
      const messages = await storage.loadMessages(room.id);
      expect(messages).toEqual([]);
    });

    test('should return false for non-existent room', async () => {
      const result = await storage.deleteRoom('non-existent-room');
      expect(result).toBe(false);
    });

    test('should handle room without messages directory', async () => {
      const room: Room = {
        id: 'room-no-messages',
        name: 'Room Without Messages',
        createdBy: 'user-123',
        createdAt: new Date(),
        messageCount: 0,
        userCount: 0,
        lastActivity: new Date()
      };
      
      await storage.saveRoom(room);
      const result = await storage.deleteRoom(room.id);
      
      expect(result).toBe(true);
    });
  });

  describe('getMessageCount', () => {
    test('should count messages correctly', async () => {
      const roomId = 'room-count-1';
      
      // Save multiple messages
      for (let i = 0; i < 5; i++) {
        await storage.saveMessage({
          id: `msg-${i}`,
          roomId,
          userId: 'user-123',
          username: 'testuser',
          content: `Message ${i}`,
          timestamp: new Date(),
          type: 'text'
        });
      }
      
      const count = await storage.getMessageCount(roomId);
      expect(count).toBe(5);
    });

    test('should return 0 for room without messages', async () => {
      const count = await storage.getMessageCount('empty-room');
      expect(count).toBe(0);
    });

    test('should handle file system errors', async () => {
      // Create messages directory as a file instead of directory
      const roomId = 'error-room';
      const roomPath = path.join(testDir, 'messages', roomId);
      await fs.mkdir(path.join(testDir, 'messages'), { recursive: true });
      await fs.writeFile(roomPath, 'not a directory');
      
      await expect(storage.getMessageCount(roomId)).rejects.toThrow();
    });
  });

  describe('searchMessages', () => {
    const roomId = 'search-room';
    
    beforeEach(async () => {
      // Create test messages
      const messages = [
        { id: 'msg-1', content: 'Hello world', username: 'alice' },
        { id: 'msg-2', content: 'TypeScript is great', username: 'bob' },
        { id: 'msg-3', content: 'Hello TypeScript', username: 'alice' },
        { id: 'msg-4', content: 'World of JavaScript', username: 'charlie' },
        { id: 'msg-5', content: 'Good morning', username: 'alice' }
      ];
      
      for (const msg of messages) {
        await storage.saveMessage({
          ...msg,
          roomId,
          userId: `user-${msg.username}`,
          timestamp: new Date(),
          type: 'text'
        });
      }
    });

    test('should search by content', async () => {
      const results = await storage.searchMessages(roomId, 'hello');
      
      expect(results).toHaveLength(2);
      expect(results[0].content).toContain('Hello');
      expect(results[1].content).toContain('Hello');
    });

    test('should search by username', async () => {
      const results = await storage.searchMessages(roomId, 'alice');
      
      expect(results).toHaveLength(3);
      expect(results.every(msg => msg.username === 'alice')).toBe(true);
    });

    test('should be case insensitive', async () => {
      const results = await storage.searchMessages(roomId, 'TYPESCRIPT');
      
      expect(results).toHaveLength(2);
      expect(results[0].content).toContain('TypeScript');
      expect(results[1].content).toContain('TypeScript');
    });

    test('should respect limit parameter', async () => {
      const results = await storage.searchMessages(roomId, 'o', 2);
      
      expect(results).toHaveLength(2);
    });

    test('should return empty array for no matches', async () => {
      const results = await storage.searchMessages(roomId, 'nonexistent');
      
      expect(results).toEqual([]);
    });

    test('should handle empty room', async () => {
      const results = await storage.searchMessages('empty-room', 'test');
      
      expect(results).toEqual([]);
    });
  });

  describe('getStorageStats', () => {
    test('should return correct statistics', async () => {
      // Create test data
      for (let i = 0; i < 3; i++) {
        await storage.saveUser({
          id: `user-${i}`,
          username: `user${i}`,
          registeredAt: new Date()
        });
      }
      
      for (let i = 0; i < 2; i++) {
        await storage.saveRoom({
          id: `room-${i}`,
          name: `Room ${i}`,
          createdBy: 'user-0',
          createdAt: new Date(),
          messageCount: 0,
          userCount: 0,
          lastActivity: new Date()
        });
      }
      
      // Add messages to rooms
      for (let r = 0; r < 2; r++) {
        for (let m = 0; m < 4; m++) {
          await storage.saveMessage({
            id: `msg-${r}-${m}`,
            roomId: `room-${r}`,
            userId: 'user-0',
            username: 'user0',
            content: `Message ${m}`,
            timestamp: new Date(),
            type: 'text'
          });
        }
      }
      
      const stats = await storage.getStorageStats();
      
      expect(stats.totalUsers).toBe(3);
      expect(stats.totalRooms).toBe(2);
      expect(stats.totalMessages).toBe(8);
      expect(stats.diskUsage).toBeGreaterThan(0);
    });

    test('should handle empty storage', async () => {
      const stats = await storage.getStorageStats();
      
      expect(stats.totalUsers).toBe(0);
      expect(stats.totalRooms).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.diskUsage).toBeGreaterThan(0);
    });

    test('should handle missing directories', async () => {
      // Remove data directory
      await fs.rm(testDir, { recursive: true });
      
      const stats = await storage.getStorageStats();
      
      expect(stats.totalUsers).toBe(0);
      expect(stats.totalRooms).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.diskUsage).toBe(0);
    });

    test('should filter only JSON files', async () => {
      // Create non-JSON files that should be ignored
      await storage.saveUser({
        id: 'real-user',
        username: 'realuser',
        registeredAt: new Date()
      });
      
      // Create non-JSON files
      const usersDir = path.join(testDir, 'users');
      await fs.writeFile(path.join(usersDir, 'readme.txt'), 'Not a user file');
      await fs.writeFile(path.join(usersDir, '.hidden'), 'Hidden file');
      
      const stats = await storage.getStorageStats();
      
      expect(stats.totalUsers).toBe(1); // Only the real user
    });
  });

  describe('getDataDirectory', () => {
    test('should return the data directory path', () => {
      const dataDir = storage.getDataDirectory();
      expect(dataDir).toBe(testDir);
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle concurrent saves to same message log', async () => {
      const roomId = 'concurrent-room';
      const promises = [];
      
      // Create 10 concurrent saves
      for (let i = 0; i < 10; i++) {
        promises.push(storage.saveMessage({
          id: `concurrent-msg-${i}`,
          roomId,
          userId: 'user-123',
          username: 'testuser',
          content: `Concurrent message ${i}`,
          timestamp: new Date(),
          type: 'text'
        }));
      }
      
      await Promise.all(promises);
      
      const messages = await storage.loadMessages(roomId);
      expect(messages).toHaveLength(10);
    });

    test('should handle corrupted message log gracefully', async () => {
      const roomId = 'corrupted-room';
      const roomMessageDir = path.join(testDir, 'messages', roomId);
      const logPath = path.join(roomMessageDir, 'messages.log');
      
      // Create directory and corrupted log
      await fs.mkdir(roomMessageDir, { recursive: true });
      await fs.writeFile(logPath, 'invalid json\n{broken json\n{"valid":true}');
      
      const messages = await storage.loadMessages(roomId);
      expect(messages).toHaveLength(1); // Only the valid JSON line
    });

    test('should handle message with very long content', async () => {
      const longContent = 'x'.repeat(100000); // 100KB message
      const message: Message = {
        id: 'long-msg',
        roomId: 'long-room',
        userId: 'user-123',
        username: 'testuser',
        content: longContent,
        timestamp: new Date(),
        type: 'text'
      };
      
      await storage.saveMessage(message);
      const messages = await storage.loadMessages('long-room');
      
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(longContent);
    });

    test('should handle special characters in IDs', async () => {
      const specialUser: User = {
        id: 'user@#$%^&*()_+-=',
        username: 'special',
        registeredAt: new Date()
      };
      
      await storage.saveUser(specialUser);
      const loaded = await storage.loadUser(specialUser.id);
      
      expect(loaded).toEqual(specialUser);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of users efficiently', async () => {
      const startTime = Date.now();
      
      // Save 100 users
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(storage.saveUser({
          id: `perf-user-${i}`,
          username: `perfuser${i}`,
          registeredAt: new Date()
        }));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      const stats = await storage.getStorageStats();
      expect(stats.totalUsers).toBe(100);
    });
  });
});