import { ComprehensiveLogger, startComprehensiveLogging } from '../../src/loggers/ComprehensiveLogger';
import { RejectionType } from '../../src/loggers/RejectionTracker';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ComprehensiveLogger', () => {
  let logger: ComprehensiveLogger;
  const testLogDir = path.join(os.tmpdir(), 'test-comprehensive-logger');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (logger) {
      logger.stop();
    }
    // Clean up test directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should create logger with default configuration', () => {
      logger = new ComprehensiveLogger();
      expect(logger).toBeDefined();
      expect(logger.isEnabled()).toBe(true);
      expect(logger.isDetailMode()).toBe(false);
    });

    it('should create logger with custom configuration', () => {
      logger = new ComprehensiveLogger({
        logDir: testLogDir,
        detail: true,
        enabled: true
      });
      expect(logger.getLogDirectory()).toBe(testLogDir);
      expect(logger.isDetailMode()).toBe(true);
    });

    it('should handle disabled logger', () => {
      logger = new ComprehensiveLogger({ enabled: false });
      expect(logger.isEnabled()).toBe(false);
      
      // Should not throw when calling methods on disabled logger
      logger.logEvent('test', 'info');
      logger.logTaskChange('created', 'TASK-001');
      logger.stop();
    });
  });

  describe('detail mode', () => {
    beforeEach(() => {
      logger = new ComprehensiveLogger({
        logDir: testLogDir,
        detail: false
      });
    });

    it('should toggle detail mode', () => {
      expect(logger.isDetailMode()).toBe(false);
      
      logger.enableDetailMode();
      expect(logger.isDetailMode()).toBe(true);
      
      logger.disableDetailMode();
      expect(logger.isDetailMode()).toBe(false);
    });

    it('should set detail mode directly', () => {
      logger.setDetailMode(true);
      expect(logger.isDetailMode()).toBe(true);
      
      logger.setDetailMode(false);
      expect(logger.isDetailMode()).toBe(false);
    });
  });

  describe('event logging', () => {
    beforeEach(async () => {
      logger = await startComprehensiveLogging({
        logDir: testLogDir,
        detail: false
      });
    });

    it('should log custom events', () => {
      logger.logEvent('Test event', 'info', { test: true });
      logger.logEvent('Warning event', 'warn', { warning: 'test' });
      logger.logEvent('Error event', 'error', { error: 'test' });
      
      const summary = logger.getSummary();
      expect(summary.eventsLogged).toBeGreaterThan(0);
    });

    it('should log task changes', () => {
      logger.logTaskChange('created', 'TASK-001', {
        title: 'Test task',
        priority: 'high'
      });
      
      logger.logTaskChange('updated', 'TASK-001', {
        status: 'in_progress'
      });
      
      logger.logTaskChange('completed', 'TASK-001');
      
      const summary = logger.getSummary();
      expect(summary.eventsLogged).toBeGreaterThan(0);
    });

    it('should log feature changes', () => {
      logger.logFeatureChange('created', 'FEAT-001', {
        name: 'Test feature',
        status: 'planned'
      });
      
      logger.logFeatureChange('updated', 'FEAT-001', {
        status: 'in_progress'
      });
      
      logger.logFeatureChange('completed', 'FEAT-001');
      
      const summary = logger.getSummary();
      expect(summary.eventsLogged).toBeGreaterThan(0);
    });

    it('should log name ID changes', () => {
      logger.logNameIdChange('created', 'entity-001', {
        type: 'service',
        data: { port: 3000 }
      });
      
      logger.logNameIdChange('updated', 'entity-001', {
        data: { port: 3001 }
      });
      
      logger.logNameIdChange('deleted', 'entity-001');
      
      const summary = logger.getSummary();
      expect(summary.eventsLogged).toBeGreaterThan(0);
    });

    it('should log file operations', () => {
      logger.logFileOperation('created', '/test/file.txt', {
        size: 1024
      });
      
      logger.logFileOperation('modified', '/test/file.txt', {
        size: 2048
      });
      
      logger.logFileOperation('deleted', '/test/file.txt');
      
      const summary = logger.getSummary();
      expect(summary.eventsLogged).toBeGreaterThan(0);
    });
  });

  describe('rejection tracking', () => {
    beforeEach(async () => {
      logger = await startComprehensiveLogging({
        logDir: testLogDir,
        trackRejections: true
      });
    });

    it('should track rejections', () => {
      const rejection = logger.trackRejection(
        RejectionType.FILE_VIOLATION,
        'Test violation',
        { path: '/test/file.bak' }
      );
      
      expect(rejection).toBeDefined();
      expect(rejection?.type).toBe(RejectionType.FILE_VIOLATION);
      
      const summary = logger.getSummary();
      expect(summary.rejectionsTracked).toBe(1);
    });

    it('should get rejections with filters', () => {
      logger.trackRejection(
        RejectionType.FILE_VIOLATION,
        'Violation 1',
        { path: '/test/file1.bak' }
      );
      
      logger.trackRejection(
        RejectionType.PERMISSION_DENIED,
        'Permission denied',
        { path: '/test/file2.txt' }
      );
      
      const fileViolations = logger.getRejections({
        type: RejectionType.FILE_VIOLATION
      });
      
      expect(fileViolations.length).toBe(1);
      expect(fileViolations[0].type).toBe(RejectionType.FILE_VIOLATION);
    });
  });

  describe('querying', () => {
    beforeEach(async () => {
      logger = await startComprehensiveLogging({
        logDir: testLogDir
      });
    });

    it('should query logs by criteria', async () => {
      logger.logEvent('Test 1', 'info');
      logger.logEvent('Test 2', 'error');
      logger.logEvent('Test 3', 'warn');
      
      const errorLogs = await logger.queryLogs({
        level: 'error'
      });
      
      expect(errorLogs.length).toBeGreaterThanOrEqual(1);
      expect(errorLogs.every(log => log.level === 'error')).toBe(true);
    });

    it('should query logs by search term', async () => {
      logger.logEvent('Important message', 'info', { tag: 'important' });
      logger.logEvent('Regular message', 'info');
      logger.logEvent('Another important note', 'info');
      
      const results = await logger.queryLogs({
        search: 'important'
      });
      
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('summary and reporting', () => {
    beforeEach(async () => {
      logger = await startComprehensiveLogging({
        logDir: testLogDir
      });
    });

    it('should generate summary', () => {
      logger.logEvent('Test', 'info');
      logger.logTaskChange('created', 'TASK-001');
      logger.trackRejection(RejectionType.FILE_VIOLATION, 'Test');
      
      const summary = logger.getSummary();
      
      expect(summary.startTime).toBeDefined();
      expect(summary.uptime).toBeGreaterThan(0);
      expect(summary.eventsLogged).toBeGreaterThan(0);
      expect(summary.rejectionsTracked).toBe(1);
      expect(summary.currentLogPath).toBeDefined();
    });

    it('should generate report', () => {
      logger.logEvent('Test', 'info');
      logger.logTaskChange('created', 'TASK-001');
      
      const report = logger.generateReport();
      
      expect(report).toContain('Comprehensive Logging Report');
      expect(report).toContain('Summary');
      expect(report).toContain('Events Logged');
    });
  });

  describe('lifecycle', () => {
    it('should start and stop properly', async () => {
      logger = new ComprehensiveLogger({
        logDir: testLogDir
      });
      
      await logger.start();
      
      logger.logEvent('Test', 'info');
      
      logger.stop();
      
      const summary = logger.getSummary();
      expect(summary.eventsLogged).toBeGreaterThan(0);
    });

    it('should emit events', async () => {
      logger = new ComprehensiveLogger({
        logDir: testLogDir
      });
      
      const readyPromise = new Promise(resolve => {
        logger.once('ready', resolve);
      });
      
      await logger.start();
      await readyPromise;
      
      const stoppedPromise = new Promise(resolve => {
        logger.once('stopped', resolve);
      });
      
      logger.stop();
      await stoppedPromise;
    });
  });
});