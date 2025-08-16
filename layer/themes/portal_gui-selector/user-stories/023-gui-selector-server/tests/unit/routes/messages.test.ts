import request from "supertest";
import express from 'express';
import { messagesRouter } from '../../../src/routes/messages';
import { DatabaseService } from '../../../src/services/DatabaseService';
import { ExternalLogService } from '../../../src/services/ExternalLogService';

// Mock dependencies
jest.mock('../../../src/services/DatabaseService');
jest.mock('../../../src/services/ExternalLogService');

describe('Messages Routes', () => {
  let app: express.Application;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockExternalLog: jest.Mocked<ExternalLogService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/messages', messagesRouter);

    // Setup mocks
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockExternalLog = new ExternalLogService() as jest.Mocked<ExternalLogService>;
    
    // Mock database initialization
    mockDb.run = jest.fn().mockResolvedValue({});
    
    jest.clearAllMocks();
  });

  describe('POST /api/messages', () => {
    it('should save a message with text', async () => {
      mockDb.run = jest.fn().mockResolvedValue({ lastID: 1 });
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/messages')
        .send({
          text: 'Test message',
          timestamp: '2024-01-01T00:00:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Message saved successfully');
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty("timestamp", '2024-01-01T00:00:00Z');
    });

    it('should save a message with type and data', async () => {
      mockDb.run = jest.fn().mockResolvedValue({ lastID: 2 });
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/messages')
        .send({
          type: 'event',
          data: { action: 'click', target: 'button' }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('id', 2);
    });

    it('should use current timestamp if not provided', async () => {
      mockDb.run = jest.fn().mockResolvedValue({ lastID: 3 });
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);
      
      const beforeTime = new Date().toISOString();
      
      const response = await request(app)
        .post('/api/messages')
        .send({
          text: 'Message without timestamp'
        });

      const afterTime = new Date().toISOString();

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("timestamp");
      expect(new Date(response.body.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(response.body.timestamp).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });

    it('should reject message without text or type/data', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Message text is required');
    });

    it('should handle database errors', async () => {
      mockDb.run = jest.fn().mockRejectedValue(new Error('DB Error'));
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);
      mockExternalLog.logError = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/messages')
        .send({
          text: 'Test message'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Failed to save message');
    });
  });

  describe('GET /api/messages', () => {
    it('should retrieve messages with default pagination', async () => {
      const mockMessages = [
        { id: 1, text: 'Message 1', timestamp: '2024-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
        { id: 2, text: 'Message 2', timestamp: '2024-01-01T01:00:00Z', created_at: '2024-01-01T01:00:00Z' }
      ];

      mockDb.all = jest.fn().mockResolvedValue(mockMessages);
      mockDb.get = jest.fn().mockResolvedValue({ count: 2 });
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/messages');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty("messages");
      expect(response.body.messages).toHaveLength(2);
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body).toHaveProperty('limit', 50);
      expect(response.body).toHaveProperty('offset', 0);
    });

    it('should support custom pagination', async () => {
      mockDb.all = jest.fn().mockResolvedValue([]);
      mockDb.get = jest.fn().mockResolvedValue({ count: 100 });
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/messages?limit=10&offset=20');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('offset', 20);
      expect(response.body).toHaveProperty('total', 100);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.any(String),
        [10, 20]
      );
    });

    it('should handle database errors', async () => {
      mockDb.all = jest.fn().mockRejectedValue(new Error('DB Error'));
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);
      mockExternalLog.logError = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/messages');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Failed to fetch messages');
    });

    it('should handle missing count', async () => {
      mockDb.all = jest.fn().mockResolvedValue([]);
      mockDb.get = jest.fn().mockResolvedValue(null);
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/messages');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total', 0);
    });
  });

  describe('GET /api/messages/:id', () => {
    it('should retrieve specific message', async () => {
      const mockMessage = {
        id: 1,
        text: 'Test message',
        timestamp: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockDb.get = jest.fn().mockResolvedValue(mockMessage);
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/messages/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toHaveProperty('id', 1);
      expect(response.body.message).toHaveProperty('text', 'Test message');
    });

    it('should return 404 for non-existent message', async () => {
      mockDb.get = jest.fn().mockResolvedValue(null);
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/messages/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Message not found');
    });

    it('should handle database errors', async () => {
      mockDb.get = jest.fn().mockRejectedValue(new Error('DB Error'));
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);
      mockExternalLog.logError = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/messages/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Failed to fetch message');
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('should delete specific message', async () => {
      mockDb.run = jest.fn().mockResolvedValue({ changes: 1 });
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/messages/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Message deleted successfully');
    });

    it('should return 404 for non-existent message', async () => {
      mockDb.run = jest.fn().mockResolvedValue({ changes: 0 });
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/messages/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Message not found');
    });

    it('should handle database errors', async () => {
      mockDb.run = jest.fn().mockRejectedValue(new Error('DB Error'));
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);
      mockExternalLog.logError = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/messages/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Failed to delete message');
    });
  });

  describe('DELETE /api/messages', () => {
    it('should clear all messages', async () => {
      mockDb.run = jest.fn().mockResolvedValue({ changes: 10 });
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/messages');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Cleared 10 messages');
      expect(response.body).toHaveProperty("deletedCount", 10);
    });

    it('should handle no messages to delete', async () => {
      mockDb.run = jest.fn().mockResolvedValue({ changes: 0 });
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/messages');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Cleared 0 messages');
      expect(response.body).toHaveProperty("deletedCount", 0);
    });

    it('should handle database errors', async () => {
      mockDb.run = jest.fn().mockRejectedValue(new Error('DB Error'));
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);
      mockExternalLog.logError = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/messages');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Failed to clear messages');
    });
  });

  describe('GET /api/messages/stats/summary', () => {
    it('should retrieve message statistics', async () => {
      mockDb.all = jest.fn()
        .mockResolvedValueOnce([{
          total_messages: 100,
          first_message: '2024-01-01T00:00:00Z',
          last_message: '2024-01-31T23:59:59Z',
          avg_message_length: 45.5
        }])
        .mockResolvedValueOnce([
          { date: '2024-01-31', message_count: 15 },
          { date: '2024-01-30', message_count: 20 }
        ]);
      
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/messages/stats/summary');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('total_messages', 100);
      expect(response.body.stats).toHaveProperty('avg_message_length', 45.5);
      expect(response.body).toHaveProperty("dailyStats");
      expect(response.body.dailyStats).toHaveLength(2);
    });

    it('should handle database errors', async () => {
      mockDb.all = jest.fn().mockRejectedValue(new Error('DB Error'));
      mockExternalLog.logSystemEvent = jest.fn().mockResolvedValue(undefined);
      mockExternalLog.logError = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/messages/stats/summary');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Failed to fetch message statistics');
    });
  });
});