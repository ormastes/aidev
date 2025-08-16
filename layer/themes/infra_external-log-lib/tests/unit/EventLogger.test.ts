import { EventLogger, LogEventType, getEventLogger } from '../../src/loggers/EventLogger';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'os';

describe("EventLogger", () => {
  let logger: EventLogger;
  const testLogDir = path.join(os.tmpdir(), 'test-event-logger');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testLogDir, { recursive: true });
  });

  afterEach(() => {
    if (logger) {
      logger.close();
    }
    // Clean up test directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe("initialization", () => {
    it('should create logger with default configuration', () => {
      logger = new EventLogger();
      expect(logger).toBeDefined();
      expect(logger.isDetailMode()).toBe(false);
    });

    it('should create logger with custom configuration', () => {
      logger = new EventLogger({
        logDir: testLogDir,
        detail: true,
        maxFileSize: 1024 * 1024,
        maxFiles: 5
      });
      expect(logger.isDetailMode()).toBe(true);
    });

    it('should use singleton pattern', () => {
      const logger1 = getEventLogger({ logDir: testLogDir });
      const logger2 = getEventLogger();
      expect(logger1).toBe(logger2);
      logger1.close();
    });
  });

  describe('detail mode', () => {
    beforeEach(() => {
      logger = new EventLogger({
        logDir: testLogDir,
        detail: false
      });
    });

    it('should toggle detail mode', () => {
      expect(logger.isDetailMode()).toBe(false);
      
      logger.setDetailMode(true);
      expect(logger.isDetailMode()).toBe(true);
      
      logger.setDetailMode(false);
      expect(logger.isDetailMode()).toBe(false);
    });

    it('should log in brief mode by default', () => {
      logger.logTaskQueueChange('created', 'TASK-001', {
        title: 'Complex task with lots of data',
        description: 'Very long description...',
        priority: 'high',
        metadata: { lots: 'of', nested: { data: 'here' } }
      });
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.trim().split('\n');
      const lastLog = JSON.parse(lines[lines.length - 1]);
      
      expect(lastLog.data.brief).toBeDefined();
      expect(lastLog.data.essential).toBeDefined();
      expect(lastLog.data.title).toBeUndefined(); // Full details not included
    });

    it('should log full details in detail mode', () => {
      logger.setDetailMode(true);
      
      const taskData = {
        title: 'Complex task',
        description: 'Long description',
        priority: 'high'
      };
      
      logger.logTaskQueueChange('created', 'TASK-001', taskData);
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.trim().split('\n');
      const lastLog = JSON.parse(lines[lines.length - 1]);
      
      expect(lastLog.data.title).toBe(taskData.title);
      expect(lastLog.data.description).toBe(taskData.description);
      expect(lastLog.data.brief).toBeUndefined(); // Brief not included in detail mode
    });
  });

  describe('event logging', () => {
    beforeEach(() => {
      logger = new EventLogger({ logDir: testLogDir });
    });

    it('should log custom events', () => {
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Custom event', {
        custom: 'data'
      });
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('Custom event');
      expect(content).toContain('event.custom');
    });

    it('should log task queue changes', () => {
      logger.logTaskQueueChange('created', 'TASK-001', {
        title: 'Test task'
      });
      
      logger.logTaskQueueChange('updated', 'TASK-001', {
        status: 'in_progress'
      });
      
      logger.logTaskQueueChange("completed", 'TASK-001');
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('task_queue.created');
      expect(content).toContain('task_queue.updated');
      expect(content).toContain('task_queue.completed');
    });

    it('should log feature changes', () => {
      logger.logFeatureChange('created', 'FEAT-001', {
        name: 'Test feature'
      });
      
      logger.logFeatureChange("completed", 'FEAT-001');
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('feature.created');
      expect(content).toContain('feature.completed');
    });

    it('should log name ID changes', () => {
      logger.logNameIdChange('created', 'entity-001', {
        type: 'service'
      });
      
      logger.logNameIdChange('deleted', 'entity-001');
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('name_id.created');
      expect(content).toContain('name_id.deleted');
    });

    it('should log file operations', () => {
      logger.logFileOperation('created', '/test/file.txt', {
        size: 1024
      });
      
      logger.logFileOperation('deleted', '/test/file.txt');
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('file.created');
      expect(content).toContain('file.deleted');
    });

    it('should log rejections', () => {
      logger.logRejection('file_violation', 'high', {
        path: '/test/file.bak',
        reason: 'Backup files not allowed'
      });
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('rejection.file_violation');
      expect(content).toContain('high');
    });
  });

  describe("querying", () => {
    beforeEach(() => {
      logger = new EventLogger({ logDir: testLogDir });
    });

    it('should query logs by type', async () => {
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Event 1');
      logger.logEvent(LogEventType.EVENT_ERROR, 'Error 1');
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Event 2');
      
      const results = await logger.query({
        type: LogEventType.EVENT_ERROR
      });
      
      expect(results.length).toBe(1);
      expect(results[0].type).toBe(LogEventType.EVENT_ERROR);
    });

    it('should query logs by level', async () => {
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Info', {}, 'info');
      logger.logEvent(LogEventType.EVENT_ERROR, 'Error', {}, 'error');
      logger.logEvent(LogEventType.EVENT_WARNING, 'Warning', {}, 'warn');
      
      const results = await logger.query({
        level: 'error'
      });
      
      expect(results.length).toBe(1);
      expect(results[0].level).toBe('error');
    });

    it('should query logs by date range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000); // 1 hour ago
      const future = new Date(now.getTime() + 3600000); // 1 hour later
      
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Event in range');
      
      const results = await logger.query({
        startDate: past,
        endDate: future
      });
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should query logs by search term', async () => {
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Important message');
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Regular message');
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Another important note');
      
      const results = await logger.query({
        search: "important"
      });
      
      expect(results.length).toBe(2);
    });

    it('should limit query results', async () => {
      for (let i = 0; i < 10; i++) {
        logger.logEvent(LogEventType.EVENT_CUSTOM, `Event ${i}`);
      }
      
      const results = await logger.query({
        limit: 5
      });
      
      expect(results.length).toBe(5);
    });
  });

  describe("metadata", () => {
    beforeEach(() => {
      logger = new EventLogger({ logDir: testLogDir });
    });

    it('should include default metadata', () => {
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Test');
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      const log = JSON.parse(content.trim().split('\n')[0]);
      
      expect(log.metadata).toBeDefined();
      expect(log.metadata.pid).toBe(process.pid);
      expect(log.metadata.hostname).toBeDefined();
      expect(log.metadata.theme).toBe('infra_external-log-lib');
    });

    it('should include session ID', () => {
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Test 1');
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Test 2');
      
      const logPath = logger.getCurrentLogPath();
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.trim().split('\n');
      const log1 = JSON.parse(lines[0]);
      const log2 = JSON.parse(lines[1]);
      
      expect(log1.metadata.sessionId).toBeDefined();
      expect(log1.metadata.sessionId).toBe(log2.metadata.sessionId);
    });
  });

  describe('file management', () => {
    it('should get current log path', () => {
      logger = new EventLogger({ logDir: testLogDir });
      
      const logPath = logger.getCurrentLogPath();
      expect(logPath).toContain(testLogDir);
      expect(logPath).toMatch(/events-\d{4}-\d{2}-\d{2}\.log$/);
    });

    it('should create log directory if not exists', () => {
      const newLogDir = path.join(testLogDir, 'nested', 'dir');
      logger = new EventLogger({ logDir: newLogDir });
      
      expect(fs.existsSync(newLogDir)).toBe(true);
    });
  });

  describe("lifecycle", () => {
    it('should emit log events', (done) => {
      logger = new EventLogger({ logDir: testLogDir });
      
      logger.once('log', (entry) => {
        expect(entry.message).toBe('Test event');
        done();
      });
      
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Test event');
    });

    it('should close properly', () => {
      logger = new EventLogger({ logDir: testLogDir });
      
      logger.logEvent(LogEventType.EVENT_CUSTOM, 'Test');
      logger.close();
      
      // Should not throw after closing
      expect(() => {
        logger.logEvent(LogEventType.EVENT_CUSTOM, 'After close');
      }).not.toThrow();
    });
  });
});