import { ExternalLogService } from '../../../src/services/ExternalLogService';
import { fs } from '../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../infra_external-log-lib/src';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  stat: jest.fn((_path, callback) => callback(null, { isFile: () => true })),
  promises: {
    appendFile: jest.fn(),
    readFile: jest.fn()
  }
}));
jest.mock('../../../src/utils/logger');

describe('ExternalLogService', () => {
  let service: ExternalLogService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPromises = fs.promises as jest.Mocked<typeof fs.promises>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  
  const mockDate = new Date('2024-01-15T10:30:00Z');
  const mockDateString = '2024-01-15';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock date
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    
    // Mock fs methods
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined as any);
    mockPromises.appendFile.mockResolvedValue(undefined);
    mockPromises.readFile.mockResolvedValue('');
    
    // Reset environment
    delete process.env.NODE_ENV;
    
    service = new ExternalLogService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create log directory structure', () => {
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('95.child_project', 'external_log_lib', 'logs', 'gui-selector'))
      );
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('95.child_project', 'external_log_lib', 'logs', 'gui-selector')),
        { recursive: true }
      );
    });

    it('should not create directory if it already exists', () => {
      jest.clearAllMocks();
      mockFs.existsSync.mockReturnValue(true);
      new ExternalLogService();
      
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should set current log file with date', () => {
      // Verify the path is constructed correctly
      path.join(
        process.cwd(), '..', '..', '..', '..', 
        '95.child_project', 'external_log_lib', 'logs', 'gui-selector',
        `gui-selector-${mockDateString}.log`
      );
      
      // Access private property through service.log call
      service.log({ timestamp: '', level: '', service: '', action: '' });
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining(`gui-selector-${mockDateString}.log`),
        expect.any(String)
      );
    });
  });

  describe('log', () => {
    it('should write log entry to file', async () => {
      const entry = {
        timestamp: '2024-01-15T10:30:00Z',
        level: 'info',
        service: 'gui-selector',
        action: 'test-action',
        metadata: { key: 'value' }
      };

      await service.log(entry);
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining(`gui-selector-${mockDateString}.log`),
        JSON.stringify(entry) + '\n'
      );
    });

    it('should add timestamp if not provided', async () => {
      const entry = {
        level: 'info',
        service: 'gui-selector',
        action: 'test-action'
      };

      await service.log(entry as any);
      
      const expectedEntry = {
        ...entry,
        timestamp: mockDate.toISOString()
      };
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(expectedEntry) + '\n'
      );
    });

    it('should log to console in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const entry = {
        timestamp: '',
        level: 'info',
        service: 'gui-selector',
        action: 'test-action'
      };

      await service.log(entry);
      
      expect(mockLogger.info).toHaveBeenCalledWith('External log:', entry);
    });

    it('should not log to console in production mode', async () => {
      process.env.NODE_ENV = 'production';
      
      const entry = {
        timestamp: '',
        level: 'info',
        service: 'gui-selector',
        action: 'test-action'
      };

      await service.log(entry);
      
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      const error = new Error('Write failed');
      mockPromises.appendFile.mockRejectedValue(error);
      
      const entry = {
        timestamp: '',
        level: 'info',
        service: 'gui-selector',
        action: 'test-action'
      };

      await service.log(entry);
      
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to write external log:', error);
    });
  });

  describe('logUserAction', () => {
    it('should log user action with correct format', async () => {
      await service.logUserAction(123, 'user-login', { ip: '127.0.0.1' });
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(JSON.stringify({
          timestamp: mockDate.toISOString(),
          level: 'info',
          service: 'gui-selector',
          action: 'user-login',
          userId: 123,
          metadata: { ip: '127.0.0.1' }
        }))
      );
    });

    it('should handle missing metadata', async () => {
      await service.logUserAction(456, 'user-logout');
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(JSON.stringify({
          timestamp: mockDate.toISOString(),
          level: 'info',
          service: 'gui-selector',
          action: 'user-logout',
          userId: 456
        }))
      );
    });
  });

  describe('logAppAction', () => {
    it('should log app action with user id', async () => {
      await service.logAppAction(1, 'app-created', 123, { name: 'Test App' });
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(JSON.stringify({
          timestamp: mockDate.toISOString(),
          level: 'info',
          service: 'gui-selector',
          action: 'app-created',
          appId: 1,
          userId: 123,
          metadata: { name: 'Test App' }
        }))
      );
    });

    it('should log app action without user id', async () => {
      await service.logAppAction(2, 'app-viewed');
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(JSON.stringify({
          timestamp: mockDate.toISOString(),
          level: 'info',
          service: 'gui-selector',
          action: 'app-viewed',
          appId: 2
        }))
      );
    });
  });

  describe('logError', () => {
    it('should log error with stack trace', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      
      await service.logError('operation-failed', error, { operation: 'test' });
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(JSON.stringify({
          timestamp: mockDate.toISOString(),
          level: 'error',
          service: 'gui-selector',
          action: 'operation-failed',
          metadata: {
            operation: 'test',
            error: 'Test error',
            stack: error.stack
          }
        }))
      );
    });

    it('should handle non-Error objects', async () => {
      const errorObj = { code: 'ERR_001', message: 'Custom error' };
      
      await service.logError('custom-error', errorObj);
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"error":"Custom error"')
      );
    });

    it('should handle string errors', async () => {
      await service.logError('string-error', 'Simple error message');
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"error":"Simple error message"')
      );
    });

    it('should merge additional metadata', async () => {
      const error = new Error('Test');
      await service.logError('error-with-context', error, { 
        userId: 123,
        action: 'delete'
      });
      
      const logCall = mockPromises.appendFile.mock.calls[0][1];
      expect(logCall).toContain('"userId":123');
      expect(logCall).toContain('"action":"delete"');
      expect(logCall).toContain('"error":"Test"');
    });
  });

  describe('logSystemEvent', () => {
    it('should log system event', async () => {
      await service.logSystemEvent('server-started', { port: 3000 });
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(JSON.stringify({
          timestamp: mockDate.toISOString(),
          level: 'info',
          service: 'gui-selector',
          action: 'server-started',
          metadata: { port: 3000 }
        }))
      );
    });

    it('should handle events without metadata', async () => {
      await service.logSystemEvent('health-check');
      
      expect(mockPromises.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"action":"health-check"')
      );
    });
  });

  describe('getRecentLogs', () => {
    it('should return recent logs in reverse order', async () => {
      const mockLogs = [
        { timestamp: '2024-01-15T10:00:00Z', action: 'action1' },
        { timestamp: '2024-01-15T10:01:00Z', action: 'action2' },
        { timestamp: '2024-01-15T10:02:00Z', action: 'action3' }
      ];
      
      const fileContent = mockLogs.map(log => JSON.stringify(log)).join('\n');
      mockPromises.readFile.mockResolvedValue(fileContent);
      
      const logs = await service.getRecentLogs();
      
      expect(logs).toEqual([
        { timestamp: '2024-01-15T10:02:00Z', action: 'action3' },
        { timestamp: '2024-01-15T10:01:00Z', action: 'action2' },
        { timestamp: '2024-01-15T10:00:00Z', action: 'action1' }
      ]);
    });

    it('should limit number of returned logs', async () => {
      const mockLogs = Array.from({ length: 200 }, (_, i) => ({
        timestamp: `2024-01-15T10:${String(i).padStart(2, '0')}:00Z`,
        action: `action${i}`
      }));
      
      const fileContent = mockLogs.map(log => JSON.stringify(log)).join('\n');
      mockPromises.readFile.mockResolvedValue(fileContent);
      
      const logs = await service.getRecentLogs(50);
      
      expect(logs).toHaveLength(50);
      expect(logs[0].action).toBe('action199');
      expect(logs[49].action).toBe('action150');
    });

    it('should handle empty log file', async () => {
      mockPromises.readFile.mockResolvedValue('');
      
      const logs = await service.getRecentLogs();
      
      expect(logs).toEqual([]);
    });

    it('should filter out empty lines', async () => {
      const fileContent = [
        JSON.stringify({ action: 'action1' }),
        '',
        JSON.stringify({ action: 'action2' }),
        '\n',
        JSON.stringify({ action: 'action3' })
      ].join('\n');
      
      mockPromises.readFile.mockResolvedValue(fileContent);
      
      const logs = await service.getRecentLogs();
      
      expect(logs).toHaveLength(3);
    });

    it('should handle file read errors', async () => {
      const error = new Error('Read failed');
      mockPromises.readFile.mockRejectedValue(error);
      
      const logs = await service.getRecentLogs();
      
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to read logs:', error);
      expect(logs).toEqual([]);
    });

    it('should handle JSON parse errors gracefully', async () => {
      const fileContent = 'invalid json\n' + JSON.stringify({ action: 'valid' });
      
      mockPromises.readFile.mockResolvedValue(fileContent);
      
      // The service should catch the error and return empty array
      const logs = await service.getRecentLogs();
      expect(logs).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to read logs:', expect.any(Error));
    });
  });

  describe('log file rotation', () => {
    it('should use different log files for different dates', async () => {
      // Log on first date
      await service.log({ timestamp: '', level: 'info', service: 'test', action: 'test1' });
      const firstCall = mockPromises.appendFile.mock.calls[0][0];
      
      // Change date
      const nextDay = new Date('2024-01-16T10:30:00Z');
      jest.setSystemTime(nextDay);
      
      // Create new service instance (simulating date change)
      const newService = new ExternalLogService();
      await newService.log({ timestamp: '', level: 'info', service: 'test', action: 'test2' });
      
      const secondCall = mockPromises.appendFile.mock.calls[1][0];
      
      expect(firstCall).toContain('gui-selector-2024-01-15.log');
      expect(secondCall).toContain('gui-selector-2024-01-16.log');
    });
  });
});