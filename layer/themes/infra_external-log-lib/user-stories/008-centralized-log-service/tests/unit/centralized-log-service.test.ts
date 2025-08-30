import { CentralizedLogService } from '../../src/domain/centralized-log-service';
import { LogAggregator } from '../../../006-multi-process-aggregation/src/internal/log-aggregator';
import { ComprehensiveLogger } from '../../../src/loggers/ComprehensiveLogger';
import { EventLogger } from '../../../src/loggers/EventLogger';
import { LogLevel, LogFormat } from '../../../pipe';

describe('CentralizedLogService Unit Tests', () => {
  let service: CentralizedLogService;
  let mockLogAggregator: jest.Mocked<LogAggregator>;
  let mockComprehensiveLogger: jest.Mocked<ComprehensiveLogger>;
  let mockEventLogger: jest.Mocked<EventLogger>;

  beforeEach(() => {
    // Mock dependencies
    mockLogAggregator = {
      addLog: jest.fn(),
      getAggregatedLogs: jest.fn(),
      getProcessLogs: jest.fn(),
      getStatistics: jest.fn(),
      clear: jest.fn(),
      markProcessComplete: jest.fn(),
      markProcessStopped: jest.fn(),
      getProcessMetadata: jest.fn(),
      getAllProcessMetadata: jest.fn(),
    } as jest.Mocked<LogAggregator>;

    mockComprehensiveLogger = {
      logEvent: jest.fn(),
      getEvents: jest.fn(),
      getSummary: jest.fn(),
      stop: jest.fn(),
    } as any;

    mockEventLogger = {
      log: jest.fn(),
      query: jest.fn(),
      getStats: jest.fn(),
      clear: jest.fn(),
    } as any;

    service = new CentralizedLogService({
      logAggregator: mockLogAggregator,
      comprehensiveLogger: mockComprehensiveLogger,
      eventLogger: mockEventLogger,
      retentionDays: 7,
      maxLogSize: 1000000,
      enableRealTimeStreaming: true,
    });
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(service).toBeInstanceOf(CentralizedLogService);
      expect(service.isStreamingEnabled()).toBe(true);
    });

    it('should use default configuration when not provided', () => {
      const defaultService = new CentralizedLogService();
      expect(defaultService.isStreamingEnabled()).toBe(false);
    });
  });

  describe('addLog', () => {
    it('should add log to aggregator and event logger', async () => {
      const logEntry = {
        processId: 'test-process',
        timestamp: new Date(),
        level: 'INFO' as LogLevel,
        message: 'Test log message',
        source: 'stdout' as const,
        metadata: { theme: 'infra_external-log-lib' },
      };

      await service.addLog(logEntry);

      expect(mockLogAggregator.addLog).toHaveBeenCalledWith('test-process', {
        timestamp: logEntry.timestamp,
        level: 'INFO',
        message: 'Test log message',
        source: 'stdout',
      });

      expect(mockEventLogger.log).toHaveBeenCalledWith({
        type: 'LOG_ADDED',
        data: logEntry,
        timestamp: expect.any(Date),
      });
    });

    it('should handle log addition errors gracefully', async () => {
      const logEntry = {
        processId: 'test-process',
        timestamp: new Date(),
        level: 'ERROR' as LogLevel,
        message: 'Error message',
        source: 'stderr' as const,
      };

      mockLogAggregator.addLog.mockImplementation(() => {
        throw new Error('Aggregator error');
      });

      await expect(service.addLog(logEntry)).rejects.toThrow('Failed to add log: Aggregator error');
    });
  });

  describe('queryLogs', () => {
    it('should query logs with filters and return formatted results', async () => {
      const mockAggregatedLogs = [
        {
          processId: 'proc1',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          level: 'INFO',
          message: 'Test message',
          source: 'stdout',
          sequenceNumber: 1,
        },
      ];

      mockLogAggregator.getAggregatedLogs.mockReturnValue(mockAggregatedLogs);

      const result = await service.queryLogs({
        processIds: ['proc1'],
        levels: ['INFO'],
        limit: 10,
      });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toMatchObject({
        processId: 'proc1',
        level: 'INFO',
        message: 'Test message',
      });
      expect(result.totalCount).toBe(1);
    });

    it('should return empty results for no matches', async () => {
      mockLogAggregator.getAggregatedLogs.mockReturnValue([]);

      const result = await service.queryLogs({ levels: ['DEBUG'] });

      expect(result.logs).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getAggregationStats', () => {
    it('should return aggregation statistics', async () => {
      const mockStats = {
        totalLogs: 100,
        totalProcesses: 5,
        activeProcesses: 2,
        passedProcesses: 2,
        crashedProcesses: 1,
        stoppedProcesses: 0,
      };

      mockLogAggregator.getStatistics.mockReturnValue(mockStats);

      const stats = await service.getAggregationStats();

      expect(stats).toEqual(mockStats);
      expect(mockLogAggregator.getStatistics).toHaveBeenCalled();
    });
  });

  describe('startRealTimeStreaming', () => {
    it('should enable real-time streaming', async () => {
      await service.startRealTimeStreaming();
      expect(service.isStreamingEnabled()).toBe(true);
    });

    it('should handle streaming start errors', async () => {
      // Mock a streaming error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await service.startRealTimeStreaming();
      
      consoleSpy.mockRestore();
    });
  });

  describe('stopRealTimeStreaming', () => {
    it('should disable real-time streaming', async () => {
      await service.startRealTimeStreaming();
      await service.stopRealTimeStreaming();
      expect(service.isStreamingEnabled()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should perform cleanup operations', async () => {
      await service.cleanup();

      expect(mockLogAggregator.clear).not.toHaveBeenCalled(); // Should not clear by default
      expect(mockComprehensiveLogger.stop).toHaveBeenCalled();
    });

    it('should clear logs when requested', async () => {
      await service.cleanup({ clearLogs: true });

      expect(mockLogAggregator.clear).toHaveBeenCalled();
    });
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      const health = await service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.logStats).toBeDefined();
    });
  });
});