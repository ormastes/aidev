import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { FileStorage } from '../../src/external/file-storage';
import { TestFileSystem } from '../helpers/test-file-system';
import type { User, Room, Message } from '../../src/external/file-storage';
import { path } from '../../../../../infra_external-log-lib/src';

/**
 * Unit Test: FileStorage
 * 
 * Tests the FileStorage component in isolation, focusing on file system operations,
 * data persistence, and JSON serialization without external dependencies.
 */

describe('FileStorage Unit Tests', () => {
  let storage: FileStorage;
  let testFileSystem: TestFileSystem;
  let tempDir: string;
  let storageDir: string;

  beforeEach(async () => {
    testFileSystem = new TestFileSystem();
    tempDir = await testFileSystem.createTempDir('file-storage-test-');
    storageDir = path.join(tempDir, 'chat-data');
    storage = new FileStorage(storageDir);
  });

  afterEach(async () => {
    await testFileSystem.cleanup();
  });

  describe('Initialization', () => {
    test('should create data directory on init', async () => {
      await storage.init();
      
      const dirExists = await testFileSystem.fileExists(storageDir);
      expect(dirExists).toBe(true);
    });

    test('should create subdirectories for users, rooms, and messages', async () => {
      await storage.init();
      
      const usersExists = await testFileSystem.fileExists(path.join(storageDir, 'users'));
      const roomsExists = await testFileSystem.fileExists(path.join(storageDir, 'rooms'));
      const messagesExists = await testFileSystem.fileExists(path.join(storageDir, 'messages'));
      
      expect(usersExists).toBe(true);
      expect(roomsExists).toBe(true);
      expect(messagesExists).toBe(true);
    });

    test('should handle existing directories gracefully', async () => {
      // Pre-create directories
      await testFileSystem.createFile(storageDir, 'users/.exists', '');
      await testFileSystem.createFile(storageDir, 'rooms/.exists', '');
      
      // Init should not throw
      await expect(storage.init()).resolves.not.toThrow();
    });
  });

  describe('User Operations', () => {
    beforeEach(async () => {
      await storage.init();
    });

    test('should save and retrieve user', async () => {
      const user: User = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date().toISOString()
      };

      await storage.saveUser(user);
      const retrieved = await storage.getUser('user-123');
      
      expect(retrieved).toEqual(user);
    });

    test('should update existing user', async () => {
      const user: User = {
        id: 'user-456',
        name: 'Original Name',
        email: 'original@example.com',
        createdAt: new Date().toISOString()
      };

      await storage.saveUser(user);
      
      // Update user
      user.name = 'Updated Name';
      user.email = 'updated@example.com';
      await storage.saveUser(user);
      
      const retrieved = await storage.getUser('user-456');
      expect(retrieved?.name).toBe('Updated Name');
      expect(retrieved?.email).toBe('updated@example.com');
    });

    test('should return null for non-existent user', async () => {
      const user = await storage.getUser('non-existent');
      expect(user).toBeNull();
    });

    test('should list all users', async () => {
      const users: User[] = [
        { id: 'user-1', name: 'User 1', email: 'user1@test.com', createdAt: new Date().toISOString() },
        { id: 'user-2', name: 'User 2', email: 'user2@test.com', createdAt: new Date().toISOString() },
        { id: 'user-3', name: 'User 3', email: 'user3@test.com', createdAt: new Date().toISOString() }
      ];

      for (const user of users) {
        await storage.saveUser(user);
      }

      const allUsers = await storage.listUsers();
      expect(allUsers).toHaveLength(3);
      expect(allUsers.map(u => u.id).sort()).toEqual(['user-1', 'user-2', 'user-3']);
    });

    test('should delete user', async () => {
      const user: User = {
        id: 'user-to-delete',
        name: 'Delete Me',
        email: 'delete@test.com',
        createdAt: new Date().toISOString()
      };

      await storage.saveUser(user);
      expect(await storage.getUser('user-to-delete')).not.toBeNull();
      
      await storage.deleteUser('user-to-delete');
      expect(await storage.getUser('user-to-delete')).toBeNull();
    });
  });

  describe('Room Operations', () => {
    beforeEach(async () => {
      await storage.init();
    });

    test('should save and retrieve room', async () => {
      const room: Room = {
        id: 'room-123',
        name: 'General Chat',
        description: 'A general chat room',
        createdAt: new Date().toISOString(),
        createdBy: 'user-123',
        members: ['user-123', 'user-456']
      };

      await storage.saveRoom(room);
      const retrieved = await storage.getRoom('room-123');
      
      expect(retrieved).toEqual(room);
    });

    test('should handle rooms with optional fields', async () => {
      const room: Room = {
        id: 'room-minimal',
        name: 'Minimal Room',
        createdAt: new Date().toISOString(),
        createdBy: 'user-123',
        members: []
      };

      await storage.saveRoom(room);
      const retrieved = await storage.getRoom('room-minimal');
      
      expect(retrieved).toEqual(room);
      expect(retrieved?.description).toBeUndefined();
    });

    test('should list all rooms', async () => {
      const rooms: Room[] = [
        { id: 'room-1', name: 'Room 1', createdAt: new Date().toISOString(), createdBy: 'user-1', members: [] },
        { id: 'room-2', name: 'Room 2', createdAt: new Date().toISOString(), createdBy: 'user-1', members: [] },
        { id: 'room-3', name: 'Room 3', createdAt: new Date().toISOString(), createdBy: 'user-2', members: [] }
      ];

      for (const room of rooms) {
        await storage.saveRoom(room);
      }

      const allRooms = await storage.listRooms();
      expect(allRooms).toHaveLength(3);
      expect(allRooms.map(r => r.id).sort()).toEqual(['room-1', 'room-2', 'room-3']);
    });

    test('should list rooms by member', async () => {
      const rooms: Room[] = [
        { id: 'room-a', name: 'Room A', createdAt: new Date().toISOString(), createdBy: 'user-1', members: ['user-1', 'user-2'] },
        { id: 'room-b', name: 'Room B', createdAt: new Date().toISOString(), createdBy: 'user-2', members: ['user-2', 'user-3'] },
        { id: 'room-c', name: 'Room C', createdAt: new Date().toISOString(), createdBy: 'user-3', members: ['user-1', 'user-3'] }
      ];

      for (const room of rooms) {
        await storage.saveRoom(room);
      }

      const user1Rooms = await storage.listRoomsByMember('user-1');
      expect(user1Rooms).toHaveLength(2);
      expect(user1Rooms.map(r => r.id).sort()).toEqual(['room-a', 'room-c']);

      const user2Rooms = await storage.listRoomsByMember('user-2');
      expect(user2Rooms).toHaveLength(2);
      expect(user2Rooms.map(r => r.id).sort()).toEqual(['room-a', 'room-b']);
    });
  });

  describe('Message Operations', () => {
    beforeEach(async () => {
      await storage.init();
    });

    test('should save and retrieve message', async () => {
      const message: Message = {
        id: 'msg-123',
        roomId: 'room-123',
        userId: 'user-123',
        content: 'Hello, World!',
        timestamp: new Date().toISOString(),
        type: 'text'
      };

      await storage.saveMessage(message);
      const retrieved = await storage.getMessage('msg-123');
      
      expect(retrieved).toEqual(message);
    });

    test('should list messages by room', async () => {
      const baseTime = new Date();
      const messages: Message[] = [
        { id: 'msg-1', roomId: 'room-1', userId: 'user-1', content: 'First', timestamp: new Date(baseTime.getTime() - 3000).toISOString(), type: 'text' },
        { id: 'msg-2', roomId: 'room-1', userId: 'user-2', content: 'Second', timestamp: new Date(baseTime.getTime() - 2000).toISOString(), type: 'text' },
        { id: 'msg-3', roomId: 'room-2', userId: 'user-1', content: 'Other room', timestamp: new Date(baseTime.getTime() - 1000).toISOString(), type: 'text' },
        { id: 'msg-4', roomId: 'room-1', userId: 'user-1', content: 'Third', timestamp: new Date(baseTime.getTime()).toISOString(), type: 'text' }
      ];

      for (const msg of messages) {
        await storage.saveMessage(msg);
      }

      const room1Messages = await storage.listMessagesByRoom('room-1');
      expect(room1Messages).toHaveLength(3);
      expect(room1Messages.map(m => m.content)).toEqual(['First', 'Second', 'Third']);
    });

    test('should paginate messages', async () => {
      // Create many messages
      const messages: Message[] = [];
      for (let i = 0; i < 25; i++) {
        messages.push({
          id: `msg-${i}`,
          roomId: 'room-1',
          userId: 'user-1',
          content: `Message ${i}`,
          timestamp: new Date(Date.now() - (25 - i) * 1000).toISOString(),
          type: 'text'
        });
      }

      for (const msg of messages) {
        await storage.saveMessage(msg);
      }

      // Get first page
      const page1 = await storage.listMessagesByRoom('room-1', 10, 0);
      expect(page1).toHaveLength(10);
      expect(page1[0].content).toBe('Message 0');
      expect(page1[9].content).toBe('Message 9');

      // Get second page
      const page2 = await storage.listMessagesByRoom('room-1', 10, 10);
      expect(page2).toHaveLength(10);
      expect(page2[0].content).toBe('Message 10');
      expect(page2[9].content).toBe('Message 19');

      // Get partial last page
      const page3 = await storage.listMessagesByRoom('room-1', 10, 20);
      expect(page3).toHaveLength(5);
      expect(page3[0].content).toBe('Message 20');
      expect(page3[4].content).toBe('Message 24');
    });

    test('should handle different message types', async () => {
      const messages: Message[] = [
        { id: 'msg-text', roomId: 'room-1', userId: 'user-1', content: 'Text message', timestamp: new Date().toISOString(), type: 'text' },
        { id: 'msg-image', roomId: 'room-1', userId: 'user-1', content: 'http://example.com/image.jpg', timestamp: new Date().toISOString(), type: 'image' },
        { id: 'msg-file', roomId: 'room-1', userId: 'user-1', content: 'document.pdf', timestamp: new Date().toISOString(), type: 'file', metadata: { size: 1024, mimeType: 'application/pdf' } }
      ];

      for (const msg of messages) {
        await storage.saveMessage(msg);
      }

      const textMsg = await storage.getMessage('msg-text');
      expect(textMsg?.type).toBe('text');

      const imageMsg = await storage.getMessage('msg-image');
      expect(imageMsg?.type).toBe('image');

      const fileMsg = await storage.getMessage('msg-file');
      expect(fileMsg?.type).toBe('file');
      expect(fileMsg?.metadata).toEqual({ size: 1024, mimeType: 'application/pdf' });
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted JSON files', async () => {
      await storage.init();
      
      // Create corrupted user file
      await testFileSystem.createFile(storageDir, 'users/corrupted.json', 'invalid json {');
      
      const user = await storage.getUser('corrupted');
      expect(user).toBeNull();
    });

    test('should handle missing storage directory', async () => {
      // Use non-existent directory
      const missingStorage = new FileStorage('/completely/non/existent/path');
      
      // Init should create the directory
      await expect(missingStorage.init()).resolves.not.toThrow();
    });

    test('should handle concurrent writes', async () => {
      await storage.init();
      
      // Save multiple users concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const user: User = {
          id: `concurrent-${i}`,
          name: `User ${i}`,
          email: `user${i}@test.com`,
          createdAt: new Date().toISOString()
        };
        promises.push(storage.saveUser(user));
      }

      await Promise.all(promises);
      
      // All should be saved In Progress
      const users = await storage.listUsers();
      const concurrentUsers = users.filter(u => u.id.startsWith('concurrent-'));
      expect(concurrentUsers).toHaveLength(10);
    });

    test('should handle special characters in IDs', async () => {
      await storage.init();
      
      const user: User = {
        id: 'user@#$%^&*()_+-=',
        name: 'Special User',
        email: 'special@test.com',
        createdAt: new Date().toISOString()
      };

      await storage.saveUser(user);
      const retrieved = await storage.getUser('user@#$%^&*()_+-=');
      
      expect(retrieved).toEqual(user);
    });
  });

  describe('Performance', () => {
    test('should handle large numbers of messages efficiently', async () => {
      await storage.init();
      
      const start = Date.now();
      
      // Save 1000 messages
      for (let i = 0; i < 1000; i++) {
        const message: Message = {
          id: `perf-msg-${i}`,
          roomId: 'perf-room',
          userId: 'perf-user',
          content: `Performance test message ${i}`,
          timestamp: new Date(Date.now() - (1000 - i) * 1000).toISOString(),
          type: 'text'
        };
        await storage.saveMessage(message);
      }
      
      const saveTime = Date.now() - start;
      
      // Should In Progress in reasonable time (less than 10 seconds)
      expect(saveTime).toBeLessThan(10000);
      
      // Retrieve messages should also be fast
      const retrieveStart = Date.now();
      const messages = await storage.listMessagesByRoom('perf-room', 100);
      const retrieveTime = Date.now() - retrieveStart;
      
      expect(messages).toHaveLength(100);
      expect(retrieveTime).toBeLessThan(1000);
    });

    test('should handle large message content', async () => {
      await storage.init();
      
      // Create a large message (1MB of text)
      const largeContent = 'x'.repeat(1024 * 1024);
      const message: Message = {
        id: 'large-msg',
        roomId: 'room-1',
        userId: 'user-1',
        content: largeContent,
        timestamp: new Date().toISOString(),
        type: 'text'
      };

      await storage.saveMessage(message);
      const retrieved = await storage.getMessage('large-msg');
      
      expect(retrieved?.content.length).toBe(1024 * 1024);
    });
  });
});