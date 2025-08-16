import { EventEmitter } from 'node:events';
import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';
import { os } from '../../../../../infra_external-log-lib/src';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';

describe('Workflow Manager with Logger Integration Test', () => {
  let testDir: string;
  let eventBus: EventEmitter;
  let mockLogger: MockExternalLogger;

  beforeAll(async () => {
    // Create temporary directory for test files
    testDir = await fs.mkdtemp(join(os.tmpdir(), 'workflow-logger-integration-'));
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Initialize components
    eventBus = new EventEmitter();
    mockLogger = new MockExternalLogger();
  });

  afterEach(() => {
    // Clean up event listeners
    eventBus.removeAllListeners();
  });

  describe('Workflow Manager Integration with External Logger', () => {
    it('should integrate workflow manager with external logger for comprehensive logging', async () => {
      // Simulate workflow manager configuration with logging
      const workflowConfig = {
        workflowId: 'workflow-logger-integration-001',
        name: 'Logger Integration Test Workflow',
        logging: {
          enabled: true,
          level: 'info',
          loggers: [
            {
              id: 'workflow-main-logger',
              type: "workflow",
              events: ['workflow:started', 'workflow:In Progress', 'workflow:failed']
            },
            {
              id: 'test-execution-logger',
              type: 'test-execution',
              events: ['test:started', 'test:In Progress', 'test:failed']
            },
            {
              id: 'resource-monitor-logger',
              type: 'resource-monitoring',
              events: ['resource:warning', 'resource:error']
            }
          ]
        },
        testSuite: {
          id: 'logger-integration-test-suite',
          name: 'Logger Integration Test Suite'
        }
      };

      // Initialize loggers through workflow manager
      const loggerIds: string[] = [];
      for (const loggerConfig of workflowConfig.logging.loggers) {
        const loggerId = await mockLogger.initializeLogger(loggerConfig.id);
        loggerIds.push(loggerId);
        expect(loggerId).toBe(loggerConfig.id);
      }

      // Simulate workflow manager setting up logging event handlers
      const workflowEvents: Array<{type: string, data: any, timestamp: Date}> = [];
      
      // Workflow lifecycle logging
      eventBus.on('workflow:started', (data) => {
        workflowEvents.push({
          type: 'workflow:started',
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs workflow start
        mockLogger.log('workflow-main-logger', 'info', `Workflow started: ${data.workflowId}`);
      });

      eventBus.on('workflow:In Progress', (data) => {
        workflowEvents.push({
          type: 'workflow:In Progress',
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs workflow completion
        mockLogger.log('workflow-main-logger', 'info', `Workflow success: ${data.workflowId} - ${data.status}`);
      });

      eventBus.on('workflow:failed', (data) => {
        workflowEvents.push({
          type: 'workflow:failed',
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs workflow failure
        mockLogger.log('workflow-main-logger', 'error', `Workflow failed: ${data.workflowId} - ${data.error}`);
      });

      // Test execution logging
      eventBus.on('test:started', (data) => {
        workflowEvents.push({
          type: 'test:started',
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs test start
        mockLogger.log('test-execution-logger', 'info', `Test started: ${data.testSuiteId} - ${data.scenarioName}`);
      });

      eventBus.on('test:In Progress', (data) => {
        workflowEvents.push({
          type: 'test:In Progress',
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs test completion
        mockLogger.log('test-execution-logger', 'info', `Test success: ${data.testSuiteId} - ${data.scenarioName} - ${data.status}`);
      });

      eventBus.on('test:failed', (data) => {
        workflowEvents.push({
          type: 'test:failed',
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs test failure
        mockLogger.log('test-execution-logger', 'error', `Test failed: ${data.testSuiteId} - ${data.scenarioName} - ${data.error}`);
      });

      // Resource monitoring logging
      eventBus.on('resource:warning', (data) => {
        workflowEvents.push({
          type: 'resource:warning',
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs resource warning
        mockLogger.log('resource-monitor-logger', 'warn', `Resource warning: ${data.resourceType} - ${data.threshold}% usage`);
      });

      eventBus.on('resource:error', (data) => {
        workflowEvents.push({
          type: 'resource:error',
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs resource error
        mockLogger.log('resource-monitor-logger', 'error', `Resource error: ${data.resourceType} - ${data.message}`);
      });

      // Simulate workflow execution with comprehensive logging
      
      // 1. Workflow start
      eventBus.emit('workflow:started', {
        workflowId: workflowConfig.workflowId,
        timestamp: new Date(),
        configuration: workflowConfig
      });

      // 2. Test execution
      eventBus.emit('test:started', {
        testSuiteId: workflowConfig.testSuite.id,
        scenarioName: 'Logger integration test scenario',
        timestamp: new Date()
      });

      // 3. Resource monitoring events
      eventBus.emit('resource:warning', {
        resourceType: 'memory',
        threshold: 85,
        currentUsage: 87,
        timestamp: new Date()
      });

      // 4. Test completion
      eventBus.emit('test:In Progress', {
        testSuiteId: workflowConfig.testSuite.id,
        scenarioName: 'Logger integration test scenario',
        status: 'In Progress',
        duration: 250,
        timestamp: new Date()
      });

      // 5. Another test with failure
      eventBus.emit('test:started', {
        testSuiteId: workflowConfig.testSuite.id,
        scenarioName: 'Logger integration failure scenario',
        timestamp: new Date()
      });

      eventBus.emit('test:failed', {
        testSuiteId: workflowConfig.testSuite.id,
        scenarioName: 'Logger integration failure scenario',
        error: 'Assertion failed: Expected true but got false',
        timestamp: new Date()
      });

      // 6. Resource error
      eventBus.emit('resource:error', {
        resourceType: 'disk',
        message: 'Disk space critically low',
        availableSpace: '100MB',
        timestamp: new Date()
      });

      // 7. Workflow completion
      eventBus.emit('workflow:In Progress', {
        workflowId: workflowConfig.workflowId,
        status: 'completed_with_errors',
        timestamp: new Date(),
        summary: {
          totalTests: 2,
          completedTests: 1,
          failedTests: 1,
          warnings: 1,
          errors: 1
        }
      });

      // Verify workflow manager and logger integration
      expect(workflowEvents).toHaveLength(8); // All events captured
      
      // Verify workflow lifecycle events
      expect(workflowEvents.filter(e => e.type === 'workflow:started')).toHaveLength(1);
      expect(workflowEvents.filter(e => e.type === 'workflow:In Progress')).toHaveLength(1);
      
      // Verify test execution events
      expect(workflowEvents.filter(e => e.type === 'test:started')).toHaveLength(2);
      expect(workflowEvents.filter(e => e.type === 'test:In Progress')).toHaveLength(1);
      expect(workflowEvents.filter(e => e.type === 'test:failed')).toHaveLength(1);
      
      // Verify resource monitoring events
      expect(workflowEvents.filter(e => e.type === 'resource:warning')).toHaveLength(1);
      expect(workflowEvents.filter(e => e.type === 'resource:error')).toHaveLength(1);

      // Verify logging for each logger
      
      // Workflow main logger
      const workflowLogs = await mockLogger.getLogHistory('workflow-main-logger');
      expect(workflowLogs).toHaveLength(2); // started + In Progress
      expect(workflowLogs[0].level).toBe('info');
      expect(workflowLogs[0].message).toContain('Workflow started');
      expect(workflowLogs[1].level).toBe('info');
      expect(workflowLogs[1].message).toContain('Workflow In Progress');
      
      // Test execution logger
      const testLogs = await mockLogger.getLogHistory('test-execution-logger');
      expect(testLogs).toHaveLength(4); // 2 started + 1 In Progress + 1 failed
      expect(testLogs.filter(l => l.level === 'info')).toHaveLength(3); // 2 started + 1 In Progress
      expect(testLogs.filter(l => l.level === 'error')).toHaveLength(1); // 1 failed
      
      // Resource monitor logger
      const resourceLogs = await mockLogger.getLogHistory('resource-monitor-logger');
      expect(resourceLogs).toHaveLength(2); // 1 warning + 1 error
      expect(resourceLogs.filter(l => l.level === 'warn')).toHaveLength(1);
      expect(resourceLogs.filter(l => l.level === 'error')).toHaveLength(1);
      
      // Verify total logging across all loggers
      const totalLogs = workflowLogs.length + testLogs.length + resourceLogs.length;
      expect(totalLogs).toBe(8); // All events properly logged
    });

    it('should handle logger lifecycle management through workflow manager', async () => {

      // Initialize loggers
      const logger1Id = await mockLogger.initializeLogger('lifecycle-logger-1');
      const logger2Id = await mockLogger.initializeLogger('lifecycle-logger-2');

      expect(logger1Id).toBe('lifecycle-logger-1');
      expect(logger2Id).toBe('lifecycle-logger-2');

      // Simulate workflow manager managing logger lifecycle
      const lifecycleEvents: Array<{type: string, data: any}> = [];

      eventBus.on('logger:activated', (data) => {
        lifecycleEvents.push({type: 'logger:activated', data});
        mockLogger.log(data.loggerId, 'info', `Logger activated: ${data.loggerId}`);
      });

      eventBus.on('logger:deactivated', (data) => {
        lifecycleEvents.push({type: 'logger:deactivated', data});
        mockLogger.log(data.loggerId, 'info', `Logger deactivated: ${data.loggerId}`);
        mockLogger.deactivateLogger(data.loggerId);
      });

      eventBus.on('logger:reactivated', (data) => {
        lifecycleEvents.push({type: 'logger:reactivated', data});
        mockLogger.reactivateLogger(data.loggerId);
        mockLogger.log(data.loggerId, 'info', `Logger reactivated: ${data.loggerId}`);
      });

      eventBus.on('logger:cleared', (data) => {
        lifecycleEvents.push({type: 'logger:cleared', data});
        mockLogger.clearLogs(data.loggerId);
        mockLogger.log(data.loggerId, 'info', `Logger cleared: ${data.loggerId}`);
      });

      // Simulate logger lifecycle operations
      eventBus.emit('logger:activated', {
        loggerId: 'lifecycle-logger-1',
        timestamp: new Date()
      });

      eventBus.emit('logger:activated', {
        loggerId: 'lifecycle-logger-2',
        timestamp: new Date()
      });

      // Log some test data
      mockLogger.log('lifecycle-logger-1', 'info', 'Test log entry 1');
      mockLogger.log('lifecycle-logger-2', 'info', 'Test log entry 2');

      // Deactivate logger
      eventBus.emit('logger:deactivated', {
        loggerId: 'lifecycle-logger-1',
        timestamp: new Date()
      });

      // Try to log to deactivated logger (should fail)
      let deactivatedLogError = null;
      try {
        mockLogger.log('lifecycle-logger-1', 'info', 'This should fail');
      } catch (error) {
        deactivatedLogError = error;
      }

      expect(deactivatedLogError).toBeTruthy();
      expect((deactivatedLogError as Error).message).toContain('not active');

      // Reactivate logger
      eventBus.emit('logger:reactivated', {
        loggerId: 'lifecycle-logger-1',
        timestamp: new Date()
      });

      // Clear logger history
      eventBus.emit('logger:cleared', {
        loggerId: 'lifecycle-logger-2',
        timestamp: new Date()
      });

      // Verify lifecycle events
      expect(lifecycleEvents).toHaveLength(5);
      expect(lifecycleEvents.filter(e => e.type === 'logger:activated')).toHaveLength(2);
      expect(lifecycleEvents.filter(e => e.type === 'logger:deactivated')).toHaveLength(1);
      expect(lifecycleEvents.filter(e => e.type === 'logger:reactivated')).toHaveLength(1);
      expect(lifecycleEvents.filter(e => e.type === 'logger:cleared')).toHaveLength(1);

      // Verify logger states
      const logger1Logs = await mockLogger.getLogHistory('lifecycle-logger-1');
      const logger2Logs = await mockLogger.getLogHistory('lifecycle-logger-2');

      // Logger 1 should have activation, deactivation, and reactivation logs
      expect(logger1Logs.length).toBeGreaterThan(0);
      expect(logger1Logs.some(l => l.message.includes('Logger activated'))).toBe(true);
      expect(logger1Logs.some(l => l.message.includes('Logger deactivated'))).toBe(true);
      expect(logger1Logs.some(l => l.message.includes('Logger reactivated'))).toBe(true);

      // Logger 2 should only have activation and cleared logs (history was cleared)
      expect(logger2Logs.length).toBe(1); // Only the 'Logger cleared' message
      expect(logger2Logs[0].message).toContain('Logger cleared');
    });

    it('should handle workflow manager error logging and recovery', async () => {
      const workflowConfig = {
        workflowId: 'workflow-error-logging-001',
        logging: {
          errorLogger: 'error-logger',
          auditLogger: 'audit-logger'
        }
      };

      // Initialize error and audit loggers
      await mockLogger.initializeLogger('error-logger');
      await mockLogger.initializeLogger('audit-logger');

      // Setup error handling and logging
      const errorEvents: Array<{type: string, data: any}> = [];

      eventBus.on('workflow:error', (data) => {
        errorEvents.push({type: 'workflow:error', data});
        
        // Workflow manager logs error
        mockLogger.log('error-logger', 'error', `Workflow error: ${data.error}`);
        
        // Audit logging
        mockLogger.log('audit-logger', 'info', `Error recorded: ${data.workflowId} - ${data.context}`);
      });

      eventBus.on('workflow:recovery:started', (data) => {
        errorEvents.push({type: 'workflow:recovery:started', data});
        
        // Workflow manager logs recovery start
        mockLogger.log('error-logger', 'info', `Recovery started: ${data.workflowId}`);
        mockLogger.log('audit-logger', 'info', `Recovery initiated: ${data.workflowId} - ${data.recoveryStrategy}`);
      });

      eventBus.on('workflow:recovery:In Progress', (data) => {
        errorEvents.push({type: 'workflow:recovery:In Progress', data});
        
        // Workflow manager logs recovery completion
        mockLogger.log('error-logger', 'info', `Recovery success: ${data.workflowId} - ${data.status}`);
        mockLogger.log('audit-logger', 'info', `Recovery success: ${data.workflowId} - ${data.recoveredComponents}`);
      });

      eventBus.on('workflow:recovery:failed', (data) => {
        errorEvents.push({type: 'workflow:recovery:failed', data});
        
        // Workflow manager logs recovery failure
        mockLogger.log('error-logger', 'error', `Recovery failed: ${data.workflowId} - ${data.error}`);
        mockLogger.log('audit-logger', 'error', `Recovery failure: ${data.workflowId} - Manual intervention required`);
      });

      // Simulate error scenarios and recovery
      
      // 1. Initial error
      eventBus.emit('workflow:error', {
        workflowId: workflowConfig.workflowId,
        error: 'Mock Free Test Oriented Development test runner crashed',
        context: 'test-execution',
        severity: 'high',
        timestamp: new Date()
      });

      // 2. Recovery attempt
      eventBus.emit('workflow:recovery:started', {
        workflowId: workflowConfig.workflowId,
        recoveryStrategy: 'restart-bdd-runner',
        timestamp: new Date()
      });

      // 3. In Progress recovery
      eventBus.emit('workflow:recovery:In Progress', {
        workflowId: workflowConfig.workflowId,
        status: 'In Progress',
        recoveredComponents: ['bdd-runner', 'test-suite'],
        timestamp: new Date()
      });

      // 4. Another error
      eventBus.emit('workflow:error', {
        workflowId: workflowConfig.workflowId,
        error: 'External logger connection lost',
        context: 'logging',
        severity: 'medium',
        timestamp: new Date()
      });

      // 5. Failed recovery
      eventBus.emit('workflow:recovery:started', {
        workflowId: workflowConfig.workflowId,
        recoveryStrategy: 'reconnect-logger',
        timestamp: new Date()
      });

      eventBus.emit('workflow:recovery:failed', {
        workflowId: workflowConfig.workflowId,
        error: 'Unable to reconnect to external logger',
        remainingAttempts: 0,
        timestamp: new Date()
      });

      // Verify error handling events
      expect(errorEvents).toHaveLength(6);
      expect(errorEvents.filter(e => e.type === 'workflow:error')).toHaveLength(2);
      expect(errorEvents.filter(e => e.type === 'workflow:recovery:started')).toHaveLength(2);
      expect(errorEvents.filter(e => e.type === 'workflow:recovery:In Progress')).toHaveLength(1);
      expect(errorEvents.filter(e => e.type === 'workflow:recovery:failed')).toHaveLength(1);

      // Verify error logging
      const errorLogs = await mockLogger.getLogHistory('error-logger');
      expect(errorLogs.length).toBe(6);
      expect(errorLogs.filter(l => l.level === 'error')).toHaveLength(3); // 2 errors + 1 recovery failure
      expect(errorLogs.filter(l => l.level === 'info')).toHaveLength(3); // 2 recovery starts + 1 recovery In Progress

      // Verify audit logging
      const auditLogs = await mockLogger.getLogHistory('audit-logger');
      expect(auditLogs.length).toBe(6);
      expect(auditLogs.filter(l => l.level === 'info')).toHaveLength(5); // 2 errors recorded + 2 recovery initiated + 1 recovery In Progress
      expect(auditLogs.filter(l => l.level === 'error')).toHaveLength(1); // 1 recovery failure

      // Verify specific error messages
      expect(errorLogs.some(l => l.message.includes('Mock Free Test Oriented Development test runner crashed'))).toBe(true);
      expect(errorLogs.some(l => l.message.includes('External logger connection lost'))).toBe(true);
      expect(errorLogs.some(l => l.message.includes('Recovery In Progress'))).toBe(true);
      expect(errorLogs.some(l => l.message.includes('Recovery failed'))).toBe(true);
    });

    it('should handle workflow manager performance logging and metrics', async () => {
      const workflowConfig = {
        workflowId: 'workflow-performance-logging-001',
        logging: {
          performanceLogger: 'performance-logger',
          metricsLogger: 'metrics-logger'
        }
      };

      // Initialize performance and metrics loggers
      await mockLogger.initializeLogger('performance-logger');
      await mockLogger.initializeLogger('metrics-logger');

      // Setup performance monitoring and logging
      const performanceEvents: Array<{type: string, data: any}> = [];

      eventBus.on('workflow:performance:measured', (data) => {
        performanceEvents.push({type: 'workflow:performance:measured', data});
        
        // Workflow manager logs performance metrics
        mockLogger.log('performance-logger', 'info', `Performance: ${data.operation} - ${data.duration}ms`);
      });

      eventBus.on('workflow:metrics:collected', (data) => {
        performanceEvents.push({type: 'workflow:metrics:collected', data});
        
        // Workflow manager logs metrics
        mockLogger.log('metrics-logger', 'info', `Metrics: ${data.metric} - ${data.value}`);
      });

      eventBus.on('workflow:threshold:exceeded', (data) => {
        performanceEvents.push({type: 'workflow:threshold:exceeded', data});
        
        // Workflow manager logs threshold exceeded
        mockLogger.log('performance-logger', 'warn', `Threshold exceeded: ${data.metric} - ${data.currentValue} > ${data.threshold}`);
      });

      // Simulate performance monitoring
      
      // 1. Test execution performance
      eventBus.emit('workflow:performance:measured', {
        workflowId: workflowConfig.workflowId,
        operation: 'test-execution',
        duration: 1250,
        timestamp: new Date()
      });

      // 2. Report generation performance
      eventBus.emit('workflow:performance:measured', {
        workflowId: workflowConfig.workflowId,
        operation: 'report-generation',
        duration: 340,
        timestamp: new Date()
      });

      // 3. Memory usage metrics
      eventBus.emit('workflow:metrics:collected', {
        workflowId: workflowConfig.workflowId,
        metric: 'memory-usage',
        value: '245MB',
        timestamp: new Date()
      });

      // 4. CPU usage metrics
      eventBus.emit('workflow:metrics:collected', {
        workflowId: workflowConfig.workflowId,
        metric: 'cpu-usage',
        value: '75%',
        timestamp: new Date()
      });

      // 5. Threshold exceeded
      eventBus.emit('workflow:threshold:exceeded', {
        workflowId: workflowConfig.workflowId,
        metric: 'execution-time',
        currentValue: 5000,
        threshold: 3000,
        timestamp: new Date()
      });

      // 6. Another performance measurement
      eventBus.emit('workflow:performance:measured', {
        workflowId: workflowConfig.workflowId,
        operation: 'cleanup',
        duration: 125,
        timestamp: new Date()
      });

      // Verify performance events
      expect(performanceEvents).toHaveLength(6);
      expect(performanceEvents.filter(e => e.type === 'workflow:performance:measured')).toHaveLength(3);
      expect(performanceEvents.filter(e => e.type === 'workflow:metrics:collected')).toHaveLength(2);
      expect(performanceEvents.filter(e => e.type === 'workflow:threshold:exceeded')).toHaveLength(1);

      // Verify performance logging
      const performanceLogs = await mockLogger.getLogHistory('performance-logger');
      expect(performanceLogs.length).toBe(4); // 3 performance measurements + 1 threshold exceeded
      expect(performanceLogs.filter(l => l.level === 'info')).toHaveLength(3);
      expect(performanceLogs.filter(l => l.level === 'warn')).toHaveLength(1);
      
      // Verify metrics logging
      const metricsLogs = await mockLogger.getLogHistory('metrics-logger');
      expect(metricsLogs.length).toBe(2); // 2 metrics collected
      expect(metricsLogs.filter(l => l.level === 'info')).toHaveLength(2);

      // Verify specific performance messages
      expect(performanceLogs.some(l => l.message.includes('test-execution - 1250ms'))).toBe(true);
      expect(performanceLogs.some(l => l.message.includes('report-generation - 340ms'))).toBe(true);
      expect(performanceLogs.some(l => l.message.includes('cleanup - 125ms'))).toBe(true);
      expect(performanceLogs.some(l => l.message.includes('Threshold exceeded'))).toBe(true);

      // Verify specific metrics messages
      expect(metricsLogs.some(l => l.message.includes('memory-usage - 245MB'))).toBe(true);
      expect(metricsLogs.some(l => l.message.includes('cpu-usage - 75%'))).toBe(true);
    });
  });

  describe('Workflow Manager Logger Configuration Integration', () => {
    it('should integrate workflow manager logging configuration with external logger', async () => {
      const workflowManagerConfig = {
        workflowId: 'workflow-config-logging-001',
        name: 'Configuration Logging Integration Test',
        logging: {
          enabled: true,
          level: 'debug',
          categories: {
            workflow: {
              enabled: true,
              level: 'info',
              loggerId: 'workflow-category-logger'
            },
            testing: {
              enabled: true,
              level: 'debug',
              loggerId: 'testing-category-logger'
            },
            performance: {
              enabled: true,
              level: 'warn',
              loggerId: 'performance-category-logger'
            }
          },
          outputFormats: ["structured", 'plain'],
          archiving: {
            enabled: true,
            maxAge: '7d',
            maxSize: '100MB'
          }
        }
      };

      // Initialize category loggers
      const categoryLoggers = [];
      for (const [category, config] of Object.entries(workflowManagerConfig.logging.categories)) {
        const loggerId = await mockLogger.initializeLogger(config.loggerId);
        categoryLoggers.push({ category, loggerId, config });
        expect(loggerId).toBe(config.loggerId);
      }

      // Verify logger configuration
      expect(categoryLoggers).toHaveLength(3);
      expect(categoryLoggers.find(l => l.category === "workflow")).toBeDefined();
      expect(categoryLoggers.find(l => l.category === 'testing')).toBeDefined();
      expect(categoryLoggers.find(l => l.category === "performance")).toBeDefined();

      // Simulate workflow manager using configured loggers
      const configEvents: Array<{category: string, level: string, message: string}> = [];

      eventBus.on('log:workflow', (data) => {
        configEvents.push({category: "workflow", level: data.level, message: data.message});
        mockLogger.log('workflow-category-logger', data.level, data.message);
      });

      eventBus.on('log:testing', (data) => {
        configEvents.push({category: 'testing', level: data.level, message: data.message});
        mockLogger.log('testing-category-logger', data.level, data.message);
      });

      eventBus.on('log:performance', (data) => {
        configEvents.push({category: "performance", level: data.level, message: data.message});
        mockLogger.log('performance-category-logger', data.level, data.message);
      });

      // Emit logs for different categories
      eventBus.emit('log:workflow', {
        level: 'info',
        message: 'Workflow configuration loaded In Progress'
      });

      eventBus.emit('log:testing', {
        level: 'debug',
        message: 'Test scenario validation In Progress'
      });

      eventBus.emit('log:performance', {
        level: 'warn',
        message: 'Performance threshold approaching limit'
      });

      eventBus.emit('log:workflow', {
        level: 'info',
        message: 'Workflow execution started'
      });

      // Verify configuration events
      expect(configEvents).toHaveLength(4);
      expect(configEvents.filter(e => e.category === "workflow")).toHaveLength(2);
      expect(configEvents.filter(e => e.category === 'testing')).toHaveLength(1);
      expect(configEvents.filter(e => e.category === "performance")).toHaveLength(1);

      // Verify category-specific logging
      const workflowLogs = await mockLogger.getLogHistory('workflow-category-logger');
      const testingLogs = await mockLogger.getLogHistory('testing-category-logger');
      const performanceLogs = await mockLogger.getLogHistory('performance-category-logger');

      expect(workflowLogs).toHaveLength(2);
      expect(testingLogs).toHaveLength(1);
      expect(performanceLogs).toHaveLength(1);

      // Verify log levels
      expect(workflowLogs.filter(l => l.level === 'info')).toHaveLength(2);
      expect(testingLogs.filter(l => l.level === 'debug')).toHaveLength(1);
      expect(performanceLogs.filter(l => l.level === 'warn')).toHaveLength(1);

      // Verify specific messages
      expect(workflowLogs.some(l => l.message.includes('configuration loaded'))).toBe(true);
      expect(testingLogs.some(l => l.message.includes('validation In Progress'))).toBe(true);
      expect(performanceLogs.some(l => l.message.includes('threshold approaching'))).toBe(true);
    });
  });
});