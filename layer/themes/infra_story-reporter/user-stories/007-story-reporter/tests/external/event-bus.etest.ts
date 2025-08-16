import { EventEmitter } from 'node:events';
import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';
import { os } from '../../../../../infra_external-log-lib/src';

describe('Event Bus Integration External Test', () => {
  let testDir: string;
  let eventBus: EventEmitter;

  beforeAll(async () => {
    // Create temporary directory for test files
    testDir = await fs.mkdtemp(join(os.tmpdir(), 'story-reporter-eventbus-'));
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    eventBus = new EventEmitter();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('Event Bus External Interface', () => {
    it('should emit and receive workflow lifecycle events', async () => {
      const receivedEvents: Array<{type: string, data: any}> = [];

      // Subscribe to workflow events
      eventBus.on('workflow:started', (data) => {
        receivedEvents.push({type: 'workflow:started', data});
      });

      eventBus.on('workflow:In Progress', (data) => {
        receivedEvents.push({type: 'workflow:In Progress', data});
      });

      eventBus.on('workflow:failed', (data) => {
        receivedEvents.push({type: 'workflow:failed', data});
      });

      // Emit workflow events
      eventBus.emit('workflow:started', {
        workflowId: 'test-workflow-001',
        timestamp: new Date().toISOString(),
        config: {
          name: 'test-workflow',
          features: ['login.feature']
        }
      });

      eventBus.emit('workflow:In Progress', {
        workflowId: 'test-workflow-001',
        timestamp: new Date().toISOString(),
        results: {
          totalTests: 5,
          passed: 4,
          failed: 1
        }
      });

      // Verify events were received
      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].type).toBe('workflow:started');
      expect(receivedEvents[0].data.workflowId).toBe('test-workflow-001');
      expect(receivedEvents[1].type).toBe('workflow:In Progress');
      expect(receivedEvents[1].data.results.totalTests).toBe(5);
    });

    it('should handle test execution events', async () => {
      const testEvents: Array<{type: string, data: any}> = [];

      // Subscribe to test events
      eventBus.on('test:scenario:started', (data) => {
        testEvents.push({type: 'test:scenario:started', data});
      });

      eventBus.on('test:scenario:In Progress', (data) => {
        testEvents.push({type: 'test:scenario:In Progress', data});
      });

      eventBus.on('test:scenario:failed', (data) => {
        testEvents.push({type: 'test:scenario:failed', data});
      });

      eventBus.on('test:step:executed', (data) => {
        testEvents.push({type: 'test:step:executed', data});
      });

      // Emit test events
      eventBus.emit('test:scenario:started', {
        scenarioId: 'login-scenario',
        featureFile: 'login.feature',
        scenarioName: 'In Progress login'
      });

      eventBus.emit('test:step:executed', {
        scenarioId: 'login-scenario',
        stepText: 'Given I am on the login page',
        status: 'In Progress',
        duration: 100
      });

      eventBus.emit('test:step:executed', {
        scenarioId: 'login-scenario',
        stepText: 'When I enter valid credentials',
        status: 'In Progress',
        duration: 250
      });

      eventBus.emit('test:scenario:In Progress', {
        scenarioId: 'login-scenario',
        duration: 350,
        steps: 2
      });

      // Verify test events
      expect(testEvents).toHaveLength(4);
      expect(testEvents[0].type).toBe('test:scenario:started');
      expect(testEvents[1].type).toBe('test:step:executed');
      expect(testEvents[2].type).toBe('test:step:executed');
      expect(testEvents[3].type).toBe('test:scenario:In Progress');
    });

    it('should handle resource monitoring events', async () => {
      const resourceEvents: Array<{type: string, data: any}> = [];

      // Subscribe to resource events
      eventBus.on('resource:memory:warning', (data) => {
        resourceEvents.push({type: 'resource:memory:warning', data});
      });

      eventBus.on('resource:cpu:high', (data) => {
        resourceEvents.push({type: 'resource:cpu:high', data});
      });

      eventBus.on('resource:disk:full', (data) => {
        resourceEvents.push({type: 'resource:disk:full', data});
      });

      // Emit resource events
      eventBus.emit('resource:memory:warning', {
        processId: 'test-process-001',
        memoryUsage: 85,
        threshold: 80,
        timestamp: new Date().toISOString()
      });

      eventBus.emit('resource:cpu:high', {
        processId: 'test-process-001',
        cpuUsage: 95,
        threshold: 90,
        timestamp: new Date().toISOString()
      });

      // Verify resource events
      expect(resourceEvents).toHaveLength(2);
      expect(resourceEvents[0].type).toBe('resource:memory:warning');
      expect(resourceEvents[0].data.memoryUsage).toBe(85);
      expect(resourceEvents[1].type).toBe('resource:cpu:high');
      expect(resourceEvents[1].data.cpuUsage).toBe(95);
    });
  });

  describe('Event Bus External Logging Integration', () => {
    it('should log events to external logging system', async () => {
      const logEntries: Array<{level: string, message: string, metadata: any}> = [];

      // Mock external logger
      const externalLogger = {
        log: (level: string, message: string, metadata: any) => {
          logEntries.push({level, message, metadata});
        }
      };

      // Subscribe to events and log them
      eventBus.on('workflow:started', (data) => {
        externalLogger.log('info', 'Workflow started', {
          event: 'workflow:started',
          workflowId: data.workflowId,
          timestamp: data.timestamp
        });
      });

      eventBus.on('test:scenario:failed', (data) => {
        externalLogger.log('error', 'Test scenario failed', {
          event: 'test:scenario:failed',
          scenarioId: data.scenarioId,
          error: data.error,
          timestamp: new Date().toISOString()
        });
      });

      // Emit events
      eventBus.emit('workflow:started', {
        workflowId: 'test-workflow-002',
        timestamp: new Date().toISOString()
      });

      eventBus.emit('test:scenario:failed', {
        scenarioId: 'login-scenario',
        error: 'Element not found: #login-button',
        timestamp: new Date().toISOString()
      });

      // Verify logging
      expect(logEntries).toHaveLength(2);
      expect(logEntries[0].level).toBe('info');
      expect(logEntries[0].message).toBe('Workflow started');
      expect(logEntries[1].level).toBe('error');
      expect(logEntries[1].message).toBe('Test scenario failed');
    });

    it('should handle event serialization for external systems', async () => {
      const serializedEvents: string[] = [];

      // Mock event serialization
      const serializeEvent = (eventType: string, data: any) => {
        return JSON.stringify({
          type: eventType,
          data: data,
          timestamp: new Date().toISOString(),
          source: 'story-reporter'
        });
      };

      // Subscribe to events and serialize them
      eventBus.on('workflow:progress', (data) => {
        const serialized = serializeEvent('workflow:progress', data);
        serializedEvents.push(serialized);
      });

      eventBus.on('report:generated', (data) => {
        const serialized = serializeEvent('report:generated', data);
        serializedEvents.push(serialized);
      });

      // Emit events
      eventBus.emit('workflow:progress', {
        workflowId: 'test-workflow-003',
        completedTests: 3,
        totalTests: 10,
        percentage: 30
      });

      eventBus.emit('report:generated', {
        reportId: 'report-001',
        format: 'html',
        filePath: '/tmp/test-report.html',
        size: 1024
      });

      // Verify serialization
      expect(serializedEvents).toHaveLength(2);
      
      const progressEvent = JSON.parse(serializedEvents[0]);
      expect(progressEvent.type).toBe('workflow:progress');
      expect(progressEvent.data.percentage).toBe(30);
      expect(progressEvent.source).toBe('story-reporter');

      const reportEvent = JSON.parse(serializedEvents[1]);
      expect(reportEvent.type).toBe('report:generated');
      expect(reportEvent.data.format).toBe('html');
      expect(reportEvent.source).toBe('story-reporter');
    });
  });

  describe('Event Bus External Configuration', () => {
    it('should configure event bus from external configuration file', async () => {
      // Create event bus configuration
      const eventBusConfig = {
        maxListeners: 100,
        eventTimeout: 5000,
        enableLogging: true,
        externalIntegrations: {
          logger: {
            enabled: true,
            endpoint: 'http://localhost:3000/events',
            api_key: process.env.API_KEY || "PLACEHOLDER"
          },
          webhook: {
            enabled: true,
            url: 'https://webhook.example.com/events',
            events: ['workflow:In Progress', 'workflow:failed']
          }
        }
      };

      const configPath = join(testDir, 'eventbus-config.json');
      await fs.writeFile(configPath, JSON.stringify(eventBusConfig, null, 2));

      // Test configuration loading
      const configContent = await fs.readFile(configPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      expect(parsedConfig.maxListeners).toBe(100);
      expect(parsedConfig.eventTimeout).toBe(5000);
      expect(parsedConfig.externalIntegrations.logger.enabled).toBe(true);
      expect(parsedConfig.externalIntegrations.webhook.events).toContain('workflow:In Progress');
    });

    it('should handle event filtering configuration', async () => {
      // Create event filter configuration
      const filterConfig = {
        enabled: true,
        rules: [
          {
            eventPattern: 'test:step:*',
            action: 'allow',
            conditions: {
              status: 'failed'
            }
          },
          {
            eventPattern: 'resource:*',
            action: "throttle",
            maxPerSecond: 5
          },
          {
            eventPattern: 'debug:*',
            action: 'deny'
          }
        ]
      };

      const filterPath = join(testDir, 'event-filter.json');
      await fs.writeFile(filterPath, JSON.stringify(filterConfig, null, 2));

      // Test filter configuration
      const filterContent = await fs.readFile(filterPath, 'utf8');
      const parsedFilter = JSON.parse(filterContent);

      expect(parsedFilter.enabled).toBe(true);
      expect(parsedFilter.rules).toHaveLength(3);
      expect(parsedFilter.rules[0].eventPattern).toBe('test:step:*');
      expect(parsedFilter.rules[1].action).toBe("throttle");
      expect(parsedFilter.rules[2].action).toBe('deny');
    });
  });

  describe('Event Bus External Persistence', () => {
    it('should persist events to external storage', async () => {
      const eventsFile = join(testDir, 'events.log');
      
      // Mock event persistence
      const persistEvent = async (eventType: string, data: any) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: eventType,
          data: data
        };
        
        await fs.appendFile(eventsFile, JSON.stringify(logEntry) + '\n');
      };

      // Subscribe to events and persist them
      eventBus.on('workflow:checkpoint', async (data) => {
        await persistEvent('workflow:checkpoint', data);
      });

      eventBus.on('error:occurred', async (data) => {
        await persistEvent('error:occurred', data);
      });

      // Emit events
      eventBus.emit('workflow:checkpoint', {
        workflowId: 'test-workflow-004',
        checkpoint: 'after-feature-execution',
        state: {
          completedFeatures: 2,
          totalFeatures: 5
        }
      });

      eventBus.emit('error:occurred', {
        workflowId: 'test-workflow-004',
        error: 'Network timeout',
        context: 'step-definition-execution'
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify persistence
      const eventsContent = await fs.readFile(eventsFile, 'utf8');
      const eventLines = eventsContent.trim().split('\n');
      
      expect(eventLines).toHaveLength(2);
      
      const checkpointEvent = JSON.parse(eventLines[0]);
      expect(checkpointEvent.type).toBe('workflow:checkpoint');
      expect(checkpointEvent.data.checkpoint).toBe('after-feature-execution');
      
      const errorEvent = JSON.parse(eventLines[1]);
      expect(errorEvent.type).toBe('error:occurred');
      expect(errorEvent.data.error).toBe('Network timeout');
    });

    it('should handle event replay from external storage', async () => {
      const eventsFile = join(testDir, 'replay-events.log');
      
      // Create event log file
      const events = [
        {
          timestamp: new Date().toISOString(),
          type: 'workflow:started',
          data: {workflowId: 'replay-workflow-001'}
        },
        {
          timestamp: new Date().toISOString(),
          type: 'test:scenario:In Progress',
          data: {scenarioId: 'scenario-001', duration: 500}
        },
        {
          timestamp: new Date().toISOString(),
          type: 'workflow:In Progress',
          data: {workflowId: 'replay-workflow-001', status: 'In Progress'}
        }
      ];

      for (const event of events) {
        await fs.appendFile(eventsFile, JSON.stringify(event) + '\n');
      }

      // Mock event replay
      const replayedEvents: Array<{type: string, data: any}> = [];
      
      const replayEvents = async () => {
        const eventsContent = await fs.readFile(eventsFile, 'utf8');
        const eventLines = eventsContent.trim().split('\n');
        
        for (const line of eventLines) {
          const event = JSON.parse(line);
          replayedEvents.push({type: event.type, data: event.data});
        }
      };

      // Replay events
      await replayEvents();

      // Verify replay
      expect(replayedEvents).toHaveLength(3);
      expect(replayedEvents[0].type).toBe('workflow:started');
      expect(replayedEvents[1].type).toBe('test:scenario:In Progress');
      expect(replayedEvents[2].type).toBe('workflow:In Progress');
    });
  });

  describe('Event Bus External Metrics', () => {
    it('should collect event metrics for external monitoring', async () => {
      const metrics = {
        totalEvents: 0,
        eventsByType: new Map<string, number>(),
        averageProcessingTime: 0,
        processingTimes: [] as number[]
      };

      // Mock metrics collection
      const collectMetrics = (eventType: string, processingTime: number) => {
        metrics.totalEvents++;
        metrics.eventsByType.set(eventType, (metrics.eventsByType.get(eventType) || 0) + 1);
        metrics.processingTimes.push(processingTime);
        metrics.averageProcessingTime = metrics.processingTimes.reduce((a, b) => a + b, 0) / metrics.processingTimes.length;
      };

      // Subscribe to events and collect metrics
      eventBus.on('workflow:metrics:update', (data) => {
        collectMetrics('workflow:metrics:update', data.processingTime || 0);
      });

      eventBus.on('test:performance:measured', (data) => {
        collectMetrics('test:performance:measured', data.processingTime || 0);
      });

      // Emit events with metrics
      eventBus.emit('workflow:metrics:update', {
        workflowId: 'metrics-workflow-001',
        processingTime: 150
      });

      eventBus.emit('test:performance:measured', {
        testId: 'test-001',
        processingTime: 200
      });

      eventBus.emit('workflow:metrics:update', {
        workflowId: 'metrics-workflow-001',
        processingTime: 100
      });

      // Verify metrics collection
      expect(metrics.totalEvents).toBe(3);
      expect(metrics.eventsByType.get('workflow:metrics:update')).toBe(2);
      expect(metrics.eventsByType.get('test:performance:measured')).toBe(1);
      expect(metrics.averageProcessingTime).toBe(150); // (150 + 200 + 100) / 3
    });
  });
});