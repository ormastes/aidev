import { createLogServiceStack, createSampleLogEntry, formatLogOutput } from '../../src/utils/service-factory';
import { CentralizedLogEntry } from '../../src/domain/interfaces';

describe('Centralized Log Service System Tests', () => {
  let logServiceStack: any;

  beforeEach(async () => {
    // Create complete log service stack
    logServiceStack = createLogServiceStack({
      service: {
        enableRealTimeStreaming: true,
        retentionDays: 1, // Short retention for testing
      },
      api: {
        serviceName: 'TestLogService',
        version: '1.0.0-test',
      },
      http: {
        port: 3001, // Use different port for testing
        enableLogging: false, // Reduce noise in tests
      },
    });

    // Start the stack (without actually starting HTTP server in tests)
    // await logServiceStack.start(); // Would be enabled in real system tests
  });

  afterEach(async () => {
    await logServiceStack.stop();
  });

  describe('Complete log lifecycle', () => {
    it('should handle complete log processing workflow', async () => {
      const testLogs: CentralizedLogEntry[] = [
        createSampleLogEntry({
          processId: 'web-server',
          level: 'INFO',
          message: 'Server started on port 3000',
          source: 'stdout',
          theme: 'portal_aidev',
          userStory: '001-server-setup',
        }),
        createSampleLogEntry({
          processId: 'database',
          level: 'WARN',
          message: 'Connection pool near capacity',
          source: 'stderr',
          theme: 'infra_monitoring',
          userStory: '005-db-monitoring',
        }),
        createSampleLogEntry({
          processId: 'auth-service',
          level: 'ERROR',
          message: 'JWT token validation failed',
          source: 'file',
          theme: 'portal_security',
          userStory: '003-jwt-auth',
        }),
      ];

      // Step 1: Add logs through the service
      for (const log of testLogs) {
        await logServiceStack.service.addLog(log);
      }

      // Step 2: Query logs using various filters
      const allLogsResult = await logServiceStack.service.queryLogs({});
      expect(allLogsResult.logs).toHaveLength(3);
      expect(allLogsResult.totalCount).toBe(3);

      // Step 3: Filter by level
      const errorLogs = await logServiceStack.service.queryLogs({
        levels: ['ERROR'],
      });
      expect(errorLogs.logs).toHaveLength(1);
      expect(errorLogs.logs[0].message).toContain('JWT token validation failed');

      // Step 4: Filter by theme
      const portalLogs = await logServiceStack.service.queryLogs({
        themes: ['portal_aidev'],
      });
      expect(portalLogs.logs).toHaveLength(1);
      expect(portalLogs.logs[0].processId).toBe('web-server');

      // Step 5: Text search
      const connectionLogs = await logServiceStack.service.queryLogs({
        searchText: 'connection',
      });
      expect(connectionLogs.logs).toHaveLength(1);
      expect(connectionLogs.logs[0].source).toBe('stderr');

      // Step 6: Get aggregation statistics
      const stats = await logServiceStack.service.getAggregationStats();
      expect(stats.totalLogs).toBe(3);
      expect(stats.totalProcesses).toBe(3);
    });

    it('should handle high-volume log processing', async () => {
      const startTime = Date.now();
      const batchSize = 100;
      const batches = 5;
      const totalLogs = batchSize * batches;

      // Generate and process logs in batches
      for (let batch = 0; batch < batches; batch++) {
        const batchLogs: CentralizedLogEntry[] = [];
        
        for (let i = 0; i < batchSize; i++) {
          const logIndex = batch * batchSize + i;
          batchLogs.push(createSampleLogEntry({
            processId: `process-${logIndex % 10}`, // 10 different processes
            level: ['INFO', 'WARN', 'ERROR', 'DEBUG'][logIndex % 4] as any,
            message: `Log message ${logIndex}`,
            theme: ['portal_aidev', 'infra_monitoring', 'portal_security'][logIndex % 3],
            timestamp: new Date(startTime + logIndex * 100), // Spread over time
          }));
        }

        // Process batch
        await Promise.all(batchLogs.map(log => logServiceStack.service.addLog(log)));
      }

      const processingTime = Date.now() - startTime;
      console.log(`Processed ${totalLogs} logs in ${processingTime}ms`);

      // Verify all logs were processed
      const allLogsResult = await logServiceStack.service.queryLogs({
        limit: totalLogs + 100,
      });
      expect(allLogsResult.logs).toHaveLength(totalLogs);

      // Test pagination
      const firstPage = await logServiceStack.service.queryLogs({
        limit: 50,
        offset: 0,
      });
      expect(firstPage.logs).toHaveLength(50);
      expect(firstPage.hasMore).toBe(true);

      const secondPage = await logServiceStack.service.queryLogs({
        limit: 50,
        offset: 50,
      });
      expect(secondPage.logs).toHaveLength(50);

      // Performance assertions
      expect(processingTime).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });

  describe('Real-time streaming system behavior', () => {
    it('should stream logs to multiple clients with different interests', async () => {
      const errorLogStream: CentralizedLogEntry[] = [];
      const allLogStream: CentralizedLogEntry[] = [];
      const themeLogStream: CentralizedLogEntry[] = [];

      // Set up different streaming subscriptions
      const errorSubscription = await logServiceStack.service.subscribeToStream(
        { levels: ['ERROR'] },
        (logs) => errorLogStream.push(...logs)
      );

      const allSubscription = await logServiceStack.service.subscribeToStream(
        {},
        (logs) => allLogStream.push(...logs)
      );

      const themeSubscription = await logServiceStack.service.subscribeToStream(
        { themes: ['portal_security'] },
        (logs) => themeLogStream.push(...logs)
      );

      // Generate mixed logs
      const testLogs = [
        createSampleLogEntry({ level: 'INFO', theme: 'portal_aidev', message: 'Info message' }),
        createSampleLogEntry({ level: 'ERROR', theme: 'portal_security', message: 'Security error' }),
        createSampleLogEntry({ level: 'WARN', theme: 'infra_monitoring', message: 'Warning message' }),
        createSampleLogEntry({ level: 'ERROR', theme: 'portal_aidev', message: 'Portal error' }),
      ];

      // Add logs and allow streaming
      for (const log of testLogs) {
        await logServiceStack.service.addLog(log);
      }

      // Allow time for streaming to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify streaming behavior
      expect(allLogStream).toHaveLength(4); // Should receive all logs
      expect(errorLogStream).toHaveLength(2); // Should receive only ERROR logs
      expect(themeLogStream).toHaveLength(1); // Should receive only portal_security logs

      // Clean up subscriptions
      await logServiceStack.service.unsubscribeFromStream(errorSubscription);
      await logServiceStack.service.unsubscribeFromStream(allSubscription);
      await logServiceStack.service.unsubscribeFromStream(themeSubscription);
    });
  });

  describe('API integration testing', () => {
    it('should provide complete API functionality', async () => {
      // Test log addition through API
      const addRequest = {
        entries: [
          createSampleLogEntry({ message: 'API test log 1' }),
          createSampleLogEntry({ message: 'API test log 2', level: 'ERROR' }),
        ],
        batch: true,
      };

      const addResponse = await logServiceStack.api.addLogs(addRequest);
      expect(addResponse.success).toBe(true);
      expect(addResponse.data.processed).toBe(2);
      expect(addResponse.data.errors).toHaveLength(0);

      // Test log querying through API
      const queryRequest = {
        filters: { levels: ['ERROR'] },
        format: 'json' as const,
        includeMetadata: true,
      };

      const queryResponse = await logServiceStack.api.queryLogs(queryRequest);
      expect(queryResponse.success).toBe(true);
      expect(queryResponse.data.logs).toHaveLength(1);
      expect(queryResponse.data.metadata).toBeDefined();

      // Test statistics through API
      const statsResponse = await logServiceStack.api.getAggregationStats();
      expect(statsResponse.success).toBe(true);
      expect(statsResponse.data.totalLogs).toBe(2);

      // Test health check through API
      const healthResponse = await logServiceStack.api.getHealthCheck();
      expect(healthResponse.success).toBe(true);
      expect(healthResponse.data.status.status).toBe('healthy');
    });

    it('should handle API validation and error cases', async () => {
      // Test invalid log entry
      const invalidRequest = {
        entries: [{
          // Missing required fields
          message: 'Invalid log',
        }] as any,
        validateOnly: true,
      };

      const validationResponse = await logServiceStack.api.addLogs(invalidRequest);
      expect(validationResponse.success).toBe(true);
      expect(validationResponse.data.errors.length).toBeGreaterThan(0);

      // Test invalid query filters
      const invalidQueryRequest = {
        filters: {
          levels: ['INVALID_LEVEL'] as any,
          limit: -1,
        },
      };

      const queryResponse = await logServiceStack.api.queryLogs(invalidQueryRequest);
      expect(queryResponse.success).toBe(true); // Should normalize invalid values
      expect(queryResponse.data.logs).toBeDefined();
    });
  });

  describe('Data formatting and export', () => {
    it('should format logs in different output formats', async () => {
      const testLogs = [
        createSampleLogEntry({ 
          message: 'Test message 1', 
          level: 'INFO',
          timestamp: new Date('2024-01-15T10:00:00Z')
        }),
        createSampleLogEntry({ 
          message: 'Test message 2', 
          level: 'ERROR',
          timestamp: new Date('2024-01-15T10:00:01Z')
        }),
      ];

      // Add logs
      for (const log of testLogs) {
        await logServiceStack.service.addLog(log);
      }

      // Query logs
      const queryResult = await logServiceStack.service.queryLogs({});
      const logs = queryResult.logs;

      // Test JSON format
      const jsonOutput = formatLogOutput(logs, 'json');
      expect(() => JSON.parse(jsonOutput)).not.toThrow();

      // Test text format
      const textOutput = formatLogOutput(logs, 'text');
      expect(textOutput).toContain('INFO');
      expect(textOutput).toContain('ERROR');
      expect(textOutput).toContain('Test message 1');
      expect(textOutput).toContain('Test message 2');

      // Test CSV format
      const csvOutput = formatLogOutput(logs, 'csv');
      expect(csvOutput).toContain('Timestamp,Level,ProcessId,Source,Message');
      expect(csvOutput).toContain('INFO');
      expect(csvOutput).toContain('ERROR');

      // Test table format
      const tableOutput = formatLogOutput(logs, 'table');
      expect(tableOutput).toContain('Timestamp');
      expect(tableOutput).toContain('Level');
      expect(tableOutput).toContain('ProcessId');
      expect(tableOutput).toContain('Source');
      expect(tableOutput).toContain('Message');
    });

    it('should handle export functionality', async () => {
      // Add test logs
      const logs = Array.from({ length: 10 }, (_, i) => 
        createSampleLogEntry({
          message: `Export test log ${i + 1}`,
          level: i % 2 === 0 ? 'INFO' : 'WARN',
        })
      );

      for (const log of logs) {
        await logServiceStack.service.addLog(log);
      }

      // Test JSON export
      const jsonExportRequest = {
        filters: { levels: ['INFO'] },
        format: 'json' as const,
        includeHeaders: true,
      };

      const jsonExportResponse = await logServiceStack.api.exportLogs(jsonExportRequest);
      expect(jsonExportResponse.success).toBe(true);
      expect(jsonExportResponse.data).toBeDefined();

      // Test CSV export
      const csvExportRequest = {
        filters: {},
        format: 'csv' as const,
        includeHeaders: true,
      };

      const csvExportResponse = await logServiceStack.api.exportLogs(csvExportRequest);
      expect(csvExportResponse.success).toBe(true);
      expect(csvExportResponse.data).toBeDefined();
    });
  });

  describe('System resilience and error handling', () => {
    it('should gracefully handle service failures and recovery', async () => {
      // Add some logs successfully
      await logServiceStack.service.addLog(createSampleLogEntry({ message: 'Before failure' }));

      // Verify logs were added
      let queryResult = await logServiceStack.service.queryLogs({});
      expect(queryResult.logs).toHaveLength(1);

      // Simulate service recovery by creating new instance
      const recoveredStack = createLogServiceStack({
        service: { enableRealTimeStreaming: true },
      });

      // Service should start clean but be functional
      const healthStatus = await recoveredStack.service.getHealthStatus();
      expect(healthStatus.status).toBe('healthy');

      // Add logs to recovered service
      await recoveredStack.service.addLog(createSampleLogEntry({ message: 'After recovery' }));

      queryResult = await recoveredStack.service.queryLogs({});
      expect(queryResult.logs).toHaveLength(1);
      expect(queryResult.logs[0].message).toBe('After recovery');

      await recoveredStack.stop();
    });

    it('should maintain data consistency under concurrent operations', async () => {
      const concurrentOperations = 50;
      const operationPromises: Promise<any>[] = [];

      // Create concurrent add operations
      for (let i = 0; i < concurrentOperations; i++) {
        operationPromises.push(
          logServiceStack.service.addLog(createSampleLogEntry({
            processId: `concurrent-process-${i}`,
            message: `Concurrent log ${i}`,
          }))
        );
      }

      // Wait for all operations to complete
      await Promise.all(operationPromises);

      // Verify all logs were processed correctly
      const queryResult = await logServiceStack.service.queryLogs({
        limit: concurrentOperations + 10,
      });
      expect(queryResult.logs).toHaveLength(concurrentOperations);

      // Verify data consistency
      const stats = await logServiceStack.service.getAggregationStats();
      expect(stats.totalLogs).toBe(concurrentOperations);
      expect(stats.totalProcesses).toBe(concurrentOperations);
    });
  });
});