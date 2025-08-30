import { createCentralizedLogService, createSampleLogEntry, createSampleLogBatch } from '../../src/utils/service-factory';
import { CentralizedLogService } from '../../src/domain/centralized-log-service';
import { LogAggregator } from '../../../006-multi-process-aggregation/src/internal/log-aggregator';

describe('CentralizedLogService Integration Tests', () => {
  let service: CentralizedLogService;
  let logAggregator: LogAggregator;

  beforeEach(() => {
    // Create real instances for integration testing (Mock Free)
    logAggregator = new LogAggregator();
    
    // Create mock comprehensive logger and event logger
    const mockComprehensiveLogger = {
      logEvent: jest.fn(),
      getEvents: jest.fn().mockReturnValue([]),
      getSummary: jest.fn().mockReturnValue({}),
      stop: jest.fn(),
    };

    const mockEventLogger = {
      log: jest.fn(),
      query: jest.fn().mockReturnValue([]),
      getStats: jest.fn().mockReturnValue({}),
      clear: jest.fn(),
    };

    service = createCentralizedLogService({
      logAggregator,
      comprehensiveLogger: mockComprehensiveLogger,
      eventLogger: mockEventLogger,
      enableRealTimeStreaming: true,
      retentionDays: 7,
    });
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('End-to-end log processing', () => {
    it('should process logs from multiple themes and aggregate them', async () => {
      // Create logs from different themes
      const portalLogs = createSampleLogBatch(5, {
        theme: 'portal_aidev',
        userStory: '001-dashboard',
        processId: 'portal-process',
      });

      const infraLogs = createSampleLogBatch(3, {
        theme: 'infra_external-log-lib',
        userStory: '008-centralized-log-service',
        processId: 'log-service',
      });

      const testLogs = createSampleLogBatch(2, {
        theme: 'infra_test-as-manual',
        userStory: '001-mftod-converter',
        processId: 'test-process',
      });

      // Add all logs
      for (const log of [...portalLogs, ...infraLogs, ...testLogs]) {
        await service.addLog(log);
      }

      // Query all logs
      const allLogs = await service.queryLogs({});
      expect(allLogs.logs).toHaveLength(10);
      expect(allLogs.totalCount).toBe(10);

      // Query by theme
      const portalLogsResult = await service.queryLogs({
        themes: ['portal_aidev'],
      });
      expect(portalLogsResult.logs).toHaveLength(5);

      // Query by process
      const processLogsResult = await service.queryLogs({
        processIds: ['portal-process'],
      });
      expect(processLogsResult.logs).toHaveLength(5);

      // Query by level
      const errorLogsResult = await service.queryLogs({
        levels: ['ERROR'],
      });
      expect(errorLogsResult.logs.length).toBeGreaterThan(0);
    });

    it('should handle time-based filtering correctly', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Add logs at different times
      await service.addLog(createSampleLogEntry({
        timestamp: twoHoursAgo,
        message: 'Old log',
        processId: 'process-1',
      }));

      await service.addLog(createSampleLogEntry({
        timestamp: oneHourAgo,
        message: 'Recent log',
        processId: 'process-2',
      }));

      await service.addLog(createSampleLogEntry({
        timestamp: now,
        message: 'Current log',
        processId: 'process-3',
      }));

      // Query logs from last hour
      const recentLogs = await service.queryLogs({
        startTime: oneHourAgo,
      });
      expect(recentLogs.logs).toHaveLength(2);

      // Query logs within specific time range
      const rangedLogs = await service.queryLogs({
        startTime: twoHoursAgo,
        endTime: oneHourAgo,
      });
      expect(rangedLogs.logs).toHaveLength(1);
      expect(rangedLogs.logs[0].message).toBe('Old log');
    });

    it('should support text search across log messages', async () => {
      const logs = [
        createSampleLogEntry({ message: 'User login successful', processId: 'auth-1' }),
        createSampleLogEntry({ message: 'Database connection error', processId: 'db-1' }),
        createSampleLogEntry({ message: 'API request processed', processId: 'api-1' }),
        createSampleLogEntry({ message: 'User logout completed', processId: 'auth-2' }),
      ];

      for (const log of logs) {
        await service.addLog(log);
      }

      // Search for user-related logs
      const userLogs = await service.queryLogs({
        searchText: 'user',
      });
      expect(userLogs.logs).toHaveLength(2);
      expect(userLogs.logs.every(log => log.message.toLowerCase().includes('user'))).toBe(true);

      // Search for error logs
      const errorLogs = await service.queryLogs({
        searchText: 'error',
      });
      expect(errorLogs.logs).toHaveLength(1);
      expect(errorLogs.logs[0].message).toContain('error');
    });

    it('should provide comprehensive aggregation statistics', async () => {
      // Add diverse logs
      const logs = [
        ...createSampleLogBatch(10, { level: 'INFO', theme: 'portal_aidev' }),
        ...createSampleLogBatch(5, { level: 'WARN', theme: 'infra_monitoring' }),
        ...createSampleLogBatch(3, { level: 'ERROR', theme: 'portal_aidev' }),
        ...createSampleLogBatch(2, { level: 'DEBUG', theme: 'infra_external-log-lib' }),
      ];

      for (const log of logs) {
        await service.addLog(log);
      }

      const stats = await service.getAggregationStats();
      
      expect(stats.totalLogs).toBe(20);
      expect(stats.totalProcesses).toBeGreaterThan(0);
      expect(stats.logsByLevel).toBeDefined();
      expect(stats.logsByTheme).toBeDefined();
      expect(stats.logsBySource).toBeDefined();
    });
  });

  describe('Real-time streaming integration', () => {
    it('should stream logs to multiple subscribers with different filters', async () => {
      const allLogsReceived: any[] = [];
      const errorLogsReceived: any[] = [];

      // Set up subscribers
      const allLogsSubscription = await service.subscribeToStream(
        {},
        (logs) => allLogsReceived.push(...logs)
      );

      const errorLogsSubscription = await service.subscribeToStream(
        { levels: ['ERROR'] },
        (logs) => errorLogsReceived.push(...logs)
      );

      // Add various logs
      await service.addLog(createSampleLogEntry({ level: 'INFO', message: 'Info message' }));
      await service.addLog(createSampleLogEntry({ level: 'ERROR', message: 'Error message' }));
      await service.addLog(createSampleLogEntry({ level: 'WARN', message: 'Warning message' }));

      // Give time for streaming (in real implementation)
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(allLogsReceived.length).toBe(3);
      expect(errorLogsReceived.length).toBe(1);
      expect(errorLogsReceived[0].level).toBe('ERROR');

      // Clean up subscriptions
      await service.unsubscribeFromStream(allLogsSubscription);
      await service.unsubscribeFromStream(errorLogsSubscription);
    });

    it('should handle subscriber errors gracefully', async () => {
      // Set up a subscriber that throws an error
      const subscriptionId = await service.subscribeToStream(
        {},
        () => {
          throw new Error('Subscriber error');
        }
      );

      // Adding logs should not fail even with problematic subscribers
      await expect(service.addLog(createSampleLogEntry())).resolves.not.toThrow();

      await service.unsubscribeFromStream(subscriptionId);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large volumes of logs efficiently', async () => {
      const logCount = 1000;
      const logs = createSampleLogBatch(logCount);

      const startTime = Date.now();

      // Add logs in batches to simulate real usage
      const batchSize = 50;
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize);
        await Promise.all(batch.map(log => service.addLog(log)));
      }

      const processingTime = Date.now() - startTime;
      console.log(`Processed ${logCount} logs in ${processingTime}ms`);

      // Verify all logs were processed
      const queryResult = await service.queryLogs({ limit: logCount + 100 });
      expect(queryResult.logs).toHaveLength(logCount);

      // Performance assertion (should process 1000 logs in under 5 seconds)
      expect(processingTime).toBeLessThan(5000);
    });

    it('should maintain query performance with large datasets', async () => {
      // Add a substantial number of logs
      const logs = createSampleLogBatch(500);
      for (const log of logs) {
        await service.addLog(log);
      }

      const queryStartTime = Date.now();
      
      // Perform various query types
      await Promise.all([
        service.queryLogs({ levels: ['ERROR'] }),
        service.queryLogs({ processIds: ['process-1', 'process-2'] }),
        service.queryLogs({ searchText: 'message' }),
        service.queryLogs({ limit: 10, offset: 100 }),
      ]);

      const queryTime = Date.now() - queryStartTime;
      console.log(`Executed 4 complex queries in ${queryTime}ms`);

      // Query time should be reasonable
      expect(queryTime).toBeLessThan(1000);
    });
  });

  describe('Integration with LogAggregator', () => {
    it('should correctly integrate with existing LogAggregator functionality', async () => {
      // Add logs using the centralized service
      const logs = createSampleLogBatch(10);
      for (const log of logs) {
        await service.addLog(log);
      }

      // Verify data is in the LogAggregator
      const aggregatorStats = logAggregator.getStatistics();
      expect(aggregatorStats.totalLogs).toBe(10);
      expect(aggregatorStats.totalProcesses).toBeGreaterThan(0);

      // Test direct LogAggregator functionality
      const allAggregatedLogs = logAggregator.getAggregatedLogs();
      expect(allAggregatedLogs).toHaveLength(10);

      // Test process-specific queries
      const processLogs = logAggregator.getProcessLogs('process-1');
      expect(processLogs.length).toBeGreaterThan(0);
    });

    it('should handle process lifecycle events through LogAggregator', async () => {
      const processId = 'test-process-lifecycle';
      
      // Add some logs for the process
      await service.addLog(createSampleLogEntry({ processId, message: 'Process started' }));
      await service.addLog(createSampleLogEntry({ processId, message: 'Processing data' }));
      
      // Mark process as complete
      logAggregator.markProcessComplete(processId, 0);
      
      // Verify process metadata
      const metadata = logAggregator.getProcessMetadata(processId);
      expect(metadata?.status).toBe('completed');
      expect(metadata?.logCount).toBe(2);
    });
  });

  describe('Health monitoring integration', () => {
    it('should provide comprehensive health status', async () => {
      // Add some logs to have data
      const logs = createSampleLogBatch(5);
      for (const log of logs) {
        await service.addLog(log);
      }

      const health = await service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.logStats.totalLogs).toBe(5);
      expect(health.streamingStatus.enabled).toBe(true);
      expect(health.dependencies.aggregator).toBe('connected');
      expect(health.dependencies.comprehensiveLogger).toBe('connected');
      expect(health.dependencies.eventLogger).toBe('connected');
    });
  });
});