import { Router } from 'express';
import { logger } from '../utils/logger';
import { ExternalLogService } from '../services/ExternalLogService';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const externalLog = new ExternalLogService();
const db = new DatabaseService();

// Initialize messages table with proper schema
async function initializeMessagesTable() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT,
        type TEXT,
        data TEXT,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Messages table initialized with full schema');
  } catch (error) {
    logger.error('Failed to initialize messages table:', error);
  }
}

// Initialize on module load
initializeMessagesTable();

// POST /api/messages - Save a new message
router.post('/', async (req, res) => {
  try {
    const { text, timestamp, type, data } = req.body;

    if (!text && !(type && data)) {
      return res.status(400).json({
        success: false,
        error: 'Message must have either text or type/data'
      });
    }

    const messageTimestamp = timestamp || new Date().toISOString();

    await externalLog.logSystemEvent('message_received', {
      text: text || `${type}: ${JSON.stringify(data)}`,
      timestamp: messageTimestamp,
      userAgent: req.get('user-agent')
    });

    // Save to database with all fields
    const result = await db.run(
      `INSERT INTO messages (text, type, data, timestamp) VALUES (?, ?, ?, ?)`,
      text || null,
      type || null,
      data ? JSON.stringify(data) : null,
      messageTimestamp
    );

    const messageId = (result as any).lastID;

    res.json({
      success: true,
      message: 'Message saved successfully',
      id: messageId,
      timestamp: messageTimestamp
    });
  } catch (error) {
    logger.error('Failed to save message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save message'
    });
  }
});

// GET /api/messages - Retrieve messages with pagination
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await db.all(
      `SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      limit,
      offset
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
    logger.error('Failed to fetch messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// GET /api/messages/stats/summary - Get message statistics
router.get('/stats/summary', async (req, res) => {
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
      stats: stats || {
        total_messages: 0,
        unique_types: 0,
        first_message: null,
        last_message: null
      }
    });
  } catch (error) {
    logger.error('Failed to fetch message stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/messages/:id - Get specific message
router.get('/:id', async (req, res) => {
  try {
    const message = await db.get(
      'SELECT * FROM messages WHERE id = ?',
      parseInt(req.params.id)
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
    logger.error('Failed to fetch message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message'
    });
  }
});

// DELETE /api/messages/:id - Delete specific message
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.run(
      'DELETE FROM messages WHERE id = ?',
      parseInt(req.params.id)
    );

    if ((result as any).changes === 0) {
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
    logger.error('Failed to delete message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// DELETE /api/messages - Clear all messages
router.delete('/', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM messages');
    const deletedCount = (result as any).changes || 0;

    res.json({
      success: true,
      message: `Cleared ${deletedCount} messages`,
      deletedCount
    });
  } catch (error) {
    logger.error('Failed to clear messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear messages'
    });
  }
});

export const messagesRouter = router;