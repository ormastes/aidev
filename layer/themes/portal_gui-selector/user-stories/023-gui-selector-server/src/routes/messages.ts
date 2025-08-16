import { Router } from 'express';
import { logger } from '../utils/logger';
import { ExternalLogService } from '../services/ExternalLogService';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const externalLog = new ExternalLogService();
const db = new DatabaseService();

// Initialize messages table
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
      'INSERT INTO messages (text, type, data, timestamp) VALUES (?, ?, ?, ?)',
      [
        text || null,
        type || null,
        data ? JSON.stringify(data) : null,
        messageTimestamp
      ]
    );

    logger.info('Message saved:', { 
      id: result.lastID, 
      text: text || null,
      type: type || null 
    });

    res.json({
      success: true,
      message: 'Message saved successfully',
      id: result.lastID,
      timestamp: messageTimestamp
    });

  } catch (error) {
    logger.error('Error saving message:', error);
    await externalLog.logError('message_save_error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save message'
    });
  }
});

// GET /api/messages - Get all messages
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    await externalLog.logSystemEvent('messages_fetch_requested', {
      limit,
      offset
    });

    const messages = await db.all(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const total = await db.get('SELECT COUNT(*) as count FROM messages');

    res.json({
      success: true,
      messages,
      total: total?.count || 0,
      limit,
      offset
    });

  } catch (error) {
    logger.error('Error fetching messages:', error);
    await externalLog.logError('messages_fetch_error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// GET /api/messages/:id - Get specific message
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await externalLog.logSystemEvent('message_detail_requested', {
      messageId: id
    });

    const message = await db.get(
      'SELECT * FROM messages WHERE id = ?',
      [id]
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
    logger.error(`Error fetching message ${req.params.id}:`, error);
    await externalLog.logError('message_fetch_error', error, { messageId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message'
    });
  }
});

// DELETE /api/messages/:id - Delete specific message
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await externalLog.logSystemEvent('message_delete_requested', {
      messageId: id
    });

    const result = await db.run('DELETE FROM messages WHERE id = ?', [id]);

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
    logger.error(`Error deleting message ${req.params.id}:`, error);
    await externalLog.logError('message_delete_error', error, { messageId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// DELETE /api/messages - Clear all messages
router.delete('/', async (req, res) => {
  try {
    await externalLog.logSystemEvent('messages_clear_requested');

    const result = await db.run('DELETE FROM messages');

    res.json({
      success: true,
      message: `Cleared ${result.changes} messages`,
      deletedCount: result.changes
    });

  } catch (error) {
    logger.error('Error clearing messages:', error);
    await externalLog.logError('messages_clear_error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear messages'
    });
  }
});

// GET /api/messages/stats/summary - Get message statistics
router.get('/stats/summary', async (req, res) => {
  try {
    await externalLog.logSystemEvent('message_stats_requested');

    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT type) as unique_types,
        MIN(created_at) as first_message,
        MAX(created_at) as last_message,
        AVG(LENGTH(text)) as avg_message_length
      FROM messages
    `);

    const dailyStats = await db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as message_count
      FROM messages 
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      stats: stats || {
        total_messages: 0,
        unique_types: 0,
        first_message: null,
        last_message: null,
        avg_message_length: 0
      },
      dailyStats
    });

  } catch (error) {
    logger.error('Error fetching message stats:', error);
    await externalLog.logError('message_stats_error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message statistics'
    });
  }
});

export { router as messagesRouter };