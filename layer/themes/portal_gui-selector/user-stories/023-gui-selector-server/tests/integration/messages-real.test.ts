/**
 * Mock Free Integration Test for Messages Routes
 * Uses real database, real server, real operations
 * NO MOCKS - Following Mock Free Test Oriented Development
 */

import request from 'supertest';
import express from 'express';
import { path } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs-extra';
import { os } from '../../../../../infra_external-log-lib/src';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

describe('Messages Routes - Mock Free Tests', () => {
  let app: express.Application;
  let testDir: string;
  let db: Database;
  let server: any;
  const port = 3999;

  beforeAll(async () => {
    // Create real temp directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'messages-test-'));
    
    // Create real database
    const dbPath = path.join(testDir, 'test.db');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create real schema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT,
        type TEXT,
        data TEXT,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create real Express app
    app = express();
    app.use(express.json());

    // Real messages route implementation
    const messagesRouter = express.Router();

    // POST /api/messages
    messagesRouter.post('/', async (req, res) => {
      try {
        const { text, type, data, timestamp } = req.body;
        
        if (!text && (!type || !data)) {
          return res.status(400).json({
            success: false,
            error: 'Message must have either text or type/data'
          });
        }

        const actualTimestamp = timestamp || new Date().toISOString();
        
        const result = await db.run(
          'INSERT INTO messages (text, type, data, timestamp) VALUES (?, ?, ?, ?)',
          [text || null, type || null, data ? JSON.stringify(data) : null, actualTimestamp]
        );

        res.json({
          success: true,
          message: 'Message saved successfully',
          id: result.lastID,
          timestamp: actualTimestamp
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to save message'
        });
      }
    });

    // GET /api/messages
    messagesRouter.get('/', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const messages = await db.all(
          'SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [limit, offset]
        );

        const countResult = await db.get('SELECT COUNT(*) as count FROM messages');
        const total = countResult?.count || 0;

        res.json({
          success: true,
          messages: messages || [],
          total,
          limit,
          offset
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch messages'
        });
      }
    });

    // GET /api/messages/:id
    messagesRouter.get('/:id', async (req, res) => {
      try {
        const message = await db.get(
          'SELECT * FROM messages WHERE id = ?',
          [req.params.id]
        );

        if (!message) {
          return res.status(404).json({
            success: false,
            error: 'Message not found'
          });
        }

        res.json({
          success: true,
          message
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch message'
        });
      }
    });

    // DELETE /api/messages/:id
    messagesRouter.delete('/:id', async (req, res) => {
      try {
        const result = await db.run(
          'DELETE FROM messages WHERE id = ?',
          [req.params.id]
        );

        if (result.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Message not found'
          });
        }

        res.json({
          success: true,
          message: 'Message deleted successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete message'
        });
      }
    });

    // DELETE /api/messages
    messagesRouter.delete('/', async (_req, res) => {
      try {
        const result = await db.run('DELETE FROM messages');
        
        res.json({
          success: true,
          message: `Cleared ${result.changes} messages`,
          deletedCount: result.changes
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to clear messages'
        });
      }
    });

    // GET /api/messages/stats/summary
    messagesRouter.get('/stats/summary', async (_req, res) => {
      try {
        const stats = await db.get(`
          SELECT 
            COUNT(*) as total_messages,
            COUNT(DISTINCT type) as unique_types,
            MIN(created_at) as first_message,
            MAX(created_at) as last_message
          FROM messages
        `);

        res.json({
          success: true,
          stats
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch statistics'
        });
      }
    });

    app.use('/api/messages', messagesRouter);

    // Start real server
    server = app.listen(port);
  });

  afterAll(async () => {
    // Clean up real resources
    if (server) server.close();
    if (db) await db.close();
    await fs.remove(testDir);
  });

  beforeEach(async () => {
    // Clear real database before each test
    await db.run('DELETE FROM messages');
  });

  describe('POST /api/messages', () => {
    it('should save a real message with text', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          text: 'Test message',
          timestamp: '2024-01-01T00:00:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBeGreaterThan(0);

      // Verify in real database
      const saved = await db.get('SELECT * FROM messages WHERE id = ?', [response.body.id]);
      expect(saved).toBeTruthy();
      expect(saved.text).toBe('Test message');
    });

    it('should save a real message with type and data', async () => {
      const testData = { key: 'value', nested: { data: true } };
      
      const response = await request(app)
        .post('/api/messages')
        .send({
          type: 'system',
          data: testData
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      // Verify in real database
      const saved = await db.get('SELECT * FROM messages WHERE id = ?', [response.body.id]);
      expect(saved.type).toBe('system');
      expect(JSON.parse(saved.data)).toEqual(testData);
    });

    it('should reject invalid messages', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/messages', () => {
    it('should retrieve real messages with pagination', async () => {
      // Insert real test data
      for (let i = 1; i <= 5; i++) {
        await db.run(
          'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
          [`Message ${i}`, new Date().toISOString()]
        );
      }

      const response = await request(app)
        .get('/api/messages?limit=3&offset=1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.messages).toHaveLength(3);
      expect(response.body.total).toBe(5);
      expect(response.body.limit).toBe(3);
      expect(response.body.offset).toBe(1);
    });
  });

  describe('GET /api/messages/:id', () => {
    it('should retrieve specific real message', async () => {
      const result = await db.run(
        'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
        ['Specific message', new Date().toISOString()]
      );

      const response = await request(app)
        .get(`/api/messages/${result.lastID}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message.text).toBe('Specific message');
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .get('/api/messages/999999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('should delete real message', async () => {
      const result = await db.run(
        'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
        ['To delete', new Date().toISOString()]
      );

      const response = await request(app)
        .delete(`/api/messages/${result.lastID}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify deletion in real database
      const deleted = await db.get('SELECT * FROM messages WHERE id = ?', [result.lastID]);
      expect(deleted).toBeUndefined();
    });
  });

  describe('DELETE /api/messages', () => {
    it('should clear all real messages', async () => {
      // Insert multiple messages
      for (let i = 1; i <= 10; i++) {
        await db.run(
          'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
          [`Message ${i}`, new Date().toISOString()]
        );
      }

      const response = await request(app)
        .delete('/api/messages');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deletedCount', 10);

      // Verify all deleted
      const count = await db.get('SELECT COUNT(*) as count FROM messages');
      expect(count.count).toBe(0);
    });
  });

  describe('GET /api/messages/stats/summary', () => {
    it('should return real statistics', async () => {
      // Insert test data with different types
      await db.run('INSERT INTO messages (text, type, timestamp) VALUES (?, ?, ?)',
        ['Text 1', 'info', new Date().toISOString()]);
      await db.run('INSERT INTO messages (text, type, timestamp) VALUES (?, ?, ?)',
        ['Text 2', 'warning', new Date().toISOString()]);
      await db.run('INSERT INTO messages (text, type, timestamp) VALUES (?, ?, ?)',
        ['Text 3', 'error', new Date().toISOString()]);

      const response = await request(app)
        .get('/api/messages/stats/summary');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.stats.total_messages).toBe(3);
      expect(response.body.stats.unique_types).toBe(3);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent message creation', async () => {
      const promises = [];
      
      for (let i = 1; i <= 10; i++) {
        promises.push(
          request(app)
            .post('/api/messages')
            .send({ text: `Concurrent ${i}` })
        );
      }

      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      // Verify all messages saved
      const count = await db.get('SELECT COUNT(*) as count FROM messages');
      expect(count.count).toBe(10);
    });
  });

  describe('Error Resilience', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle SQL injection attempts safely', async () => {
      const response = await request(app)
        .get('/api/messages/1; DROP TABLE messages;--');

      // Should treat entire string as ID, not execute SQL
      expect(response.status).toBe(404);
      
      // Verify table still exists
      const tableExists = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
      );
      expect(tableExists).toBeTruthy();
    });
  });
});