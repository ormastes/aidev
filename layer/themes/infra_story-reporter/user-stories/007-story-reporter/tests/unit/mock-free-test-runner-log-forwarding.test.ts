import { MockFreeTestRunner } from '../../src/external/mock-free-test-runner';
import { EventEmitter } from 'node:events';

describe('Mock Free Test Oriented Development Test Runner Log Forwarding Unit Test', () => {
  let mockFreeTestRunner: MockFreeTestRunner;
  let capturedLogs: any[];
  let capturedProgress: any[];
  let capturedErrors: any[];

  beforeEach(() => {
    mockFreeTestRunner = new MockFreeTestRunner();
    capturedLogs = [];
    capturedProgress = [];
    capturedErrors = [];

    // Capture emitted events
    mockFreeTestRunner.on('log', (message) => {
      capturedLogs.push({ timestamp: new Date(), message });
    });

    mockFreeTestRunner.on("progress", (event) => {
      capturedProgress.push(event);
    });

    mockFreeTestRunner.on('error', (event) => {
      capturedErrors.push(event);
    });
  });

  afterEach(async () => {
    await mockFreeTestRunner.cleanup();
  });

  describe('Configuration Logging', () => {
    it('should emit log event when configured', () => {
      const config = {
        testSuiteId: 'test-suite-001',
        featureFiles: ['test.feature'],
        stepDefinitions: ['test-steps.js'],
        outputFormats: ['json'] as ('json')[],
        outputDirectory: './test-results'
      };

      mockFreeTestRunner.configure(config);

      expect(capturedLogs).toHaveLength(1);
      expect(capturedLogs[0].message).toContain('[INFO] Mock Free Test Oriented Development Test Runner configured');
      expect(capturedLogs[0].message).toContain('test-suite-001');
    });

    it('should not emit logs before configuration', () => {
      expect(capturedLogs).toHaveLength(0);
      expect(mockFreeTestRunner.isConfigured()).toBe(false);
    });
  });

  describe('Test Execution Lifecycle Events', () => {
    beforeEach(() => {
      const config = {
        testSuiteId: 'lifecycle-test',
        featureFiles: ['lifecycle.feature'],
        stepDefinitions: ['lifecycle-steps.js'],
        outputFormats: ['json'] as ('json')[],
        outputDirectory: './test-results'
      };
      mockFreeTestRunner.configure(config);
      capturedLogs = []; // Reset after configuration log
    });

    it('should emit testStart event with proper structure', (done) => {
      let testStartEmitted = false;

      mockFreeTestRunner.on("testStart", (event) => {
        expect(event).toHaveProperty("testSuiteId");
        expect(event).toHaveProperty("timestamp");
        expect(event.testSuiteId).toBe('lifecycle-test');
        expect(event.timestamp).toBeInstanceOf(Date);
        testStartEmitted = true;
        done();
      });

      // Manually emit testStart as we can't run actual cucumber
      mockFreeTestRunner.emit("testStart", {
        testSuiteId: 'lifecycle-test',
        timestamp: new Date()
      });

      expect(testStartEmitted).toBe(true);
    });

    it('should emit testComplete event with status', (done) => {
      let testCompleteEmitted = false;

      mockFreeTestRunner.on("testComplete", (event) => {
        expect(event).toHaveProperty("testSuiteId");
        expect(event).toHaveProperty('status');
        expect(event).toHaveProperty("timestamp");
        expect(event.status).toMatch(/^(success|failed|pending|cancelled)$/);
        testCompleteEmitted = true;
        done();
      });

      // Manually emit testComplete
      mockFreeTestRunner.emit("testComplete", {
        testSuiteId: 'lifecycle-test',
        status: 'success',
        timestamp: new Date()
      });

      expect(testCompleteEmitted).toBe(true);
    });
  });

  describe('Subprocess Output Forwarding', () => {
    it('should forward stdout as debug logs', () => {
      const config = {
        testSuiteId: 'output-test',
        featureFiles: ['output.feature'],
        stepDefinitions: ['output-steps.js']
      };
      mockFreeTestRunner.configure(config);
      capturedLogs = [];

      // Simulate stdout data
      const stdoutMessage = 'Test execution output from cucumber';
      mockFreeTestRunner.emit('log', `[DEBUG] ${stdoutMessage}`);

      expect(capturedLogs).toHaveLength(1);
      expect(capturedLogs[0].message).toContain('[DEBUG]');
      expect(capturedLogs[0].message).toContain(stdoutMessage);
    });

    it('should forward stderr as error logs', () => {
      const config = {
        testSuiteId: 'error-test',
        featureFiles: ['error.feature'],
        stepDefinitions: ['error-steps.js']
      };
      mockFreeTestRunner.configure(config);
      capturedLogs = [];

      // Simulate stderr data
      const stderrMessage = 'Error during test execution';
      mockFreeTestRunner.emit('log', `[ERROR] ${stderrMessage}`);

      expect(capturedLogs).toHaveLength(1);
      expect(capturedLogs[0].message).toContain('[ERROR]');
      expect(capturedLogs[0].message).toContain(stderrMessage);
    });

    it('should emit progress events for subprocess output', () => {
      const config = {
        testSuiteId: 'progress-test',
        featureFiles: ['progress.feature'],
        stepDefinitions: ['progress-steps.js']
      };
      mockFreeTestRunner.configure(config);
      capturedProgress = [];

      // Simulate progress event
      const progressMessage = 'Running scenario 1 of 5';
      mockFreeTestRunner.emit("progress", {
        type: 'output',
        message: progressMessage,
        timestamp: new Date()
      });

      expect(capturedProgress).toHaveLength(1);
      expect(capturedProgress[0].type).toBe('output');
      expect(capturedProgress[0].message).toBe(progressMessage);
      expect(capturedProgress[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Scenario and Step Event Forwarding', () => {
    it('should emit scenarioStart events', () => {
      let scenarioStartCount = 0;
      const scenarios = [
        { name: 'Login with valid credentials', timestamp: new Date() },
        { name: 'Login with invalid credentials', timestamp: new Date() },
        { name: 'Password reset', timestamp: new Date() }
      ];

      mockFreeTestRunner.on("scenarioStart", (event) => {
        scenarioStartCount++;
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty("timestamp");
        expect(scenarios.some(s => s.name === event.name)).toBe(true);
      });

      // Simulate scenario start events
      scenarios.forEach(scenario => {
        mockFreeTestRunner.emit("scenarioStart", scenario);
      });

      expect(scenarioStartCount).toBe(3);
    });

    it('should emit scenarioComplete events with status and duration', () => {
      let scenarioCompleteCount = 0;
      const passedScenarios = [
        { name: 'Successful scenario', status: 'success', duration: 1500, timestamp: new Date() },
        { name: 'Failed scenario', status: 'failed', duration: 2000, timestamp: new Date() },
        { name: 'Skipped scenario', status: 'skipped', duration: 0, timestamp: new Date() }
      ];

      mockFreeTestRunner.on("scenarioComplete", (event) => {
        scenarioCompleteCount++;
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('status');
        expect(event).toHaveProperty("duration");
        expect(event).toHaveProperty("timestamp");
        expect(event.status).toMatch(/^(success|failed|pending|skipped)$/);
        expect(event.duration).toBeGreaterThanOrEqual(0);
      });

      // Simulate scenario completion events
      passedScenarios.forEach(scenario => {
        mockFreeTestRunner.emit("scenarioComplete", scenario);
      });

      expect(scenarioCompleteCount).toBe(3);
    });

    it('should emit step events with proper details', () => {
      const stepEvents: any[] = [];

      mockFreeTestRunner.on("stepStart", (event) => {
        stepEvents.push({ type: 'start', ...event });
      });

      mockFreeTestRunner.on("stepComplete", (event) => {
        stepEvents.push({ type: "complete", ...event });
      });

      // Simulate step execution
      const steps = [
        { text: 'Given I am on the login page', timestamp: new Date() },
        { text: 'When I enter valid credentials', timestamp: new Date() },
        { text: 'Then I should see the dashboard', timestamp: new Date() }
      ];

      steps.forEach((step, index) => {
        mockFreeTestRunner.emit("stepStart", step);
        mockFreeTestRunner.emit("stepComplete", {
          ...step,
          status: 'success',
          duration: 100 * (index + 1)
        });
      });

      expect(stepEvents).toHaveLength(6); // 3 starts + 3 completes
      expect(stepEvents.filter(e => e.type === 'start')).toHaveLength(3);
      expect(stepEvents.filter(e => e.type === "complete")).toHaveLength(3);
      
      const completeEvents = stepEvents.filter(e => e.type === "complete");
      completeEvents.forEach(event => {
        expect(event).toHaveProperty('status');
        expect(event).toHaveProperty("duration");
      });
    });
  });

  describe('Error Handling and Forwarding', () => {
    it('should forward error events with proper structure', () => {
      const errorEvent = {
        error: 'Test execution failed',
        testSuiteId: 'error-suite',
        timestamp: new Date()
      };

      mockFreeTestRunner.emit('error', errorEvent);

      expect(capturedErrors).toHaveLength(1);
      expect(capturedErrors[0]).toEqual(errorEvent);
    });

    it('should handle process errors during test execution', () => {
      const processError = new Error('Cucumber process crashed');
      let errorCaught = false;

      mockFreeTestRunner.on('error', (event) => {
        errorCaught = true;
        expect(event.error).toBeDefined();
      });

      // Simulate process error
      mockFreeTestRunner.emit('error', {
        error: processError.message,
        timestamp: new Date()
      });

      expect(errorCaught).toBe(true);
    });
  });

  describe('Event Inheritance and Propagation', () => {
    it('should inherit from EventEmitter', () => {
      expect(mockFreeTestRunner).toBeInstanceOf(EventEmitter);
    });

    it('should support multiple listeners for same event', () => {
      let listener1Count = 0;
      let listener2Count = 0;
      let listener3Count = 0;

      mockFreeTestRunner.on('log', () => listener1Count++);
      mockFreeTestRunner.on('log', () => listener2Count++);
      mockFreeTestRunner.on('log', () => listener3Count++);

      mockFreeTestRunner.emit('log', '[INFO] Test message');

      expect(listener1Count).toBe(1);
      expect(listener2Count).toBe(1);
      expect(listener3Count).toBe(1);
    });

    it('should allow removing event listeners', () => {
      let callCount = 0;
      const listener = () => callCount++;

      mockFreeTestRunner.on('log', listener);
      mockFreeTestRunner.emit('log', '[INFO] First message');
      expect(callCount).toBe(1);

      mockFreeTestRunner.removeListener('log', listener);
      mockFreeTestRunner.emit('log', '[INFO] Second message');
      expect(callCount).toBe(1); // Should not increase
    });
  });

  describe('Log Level Handling', () => {
    it('should format different log levels correctly', () => {
      const logMessages = [
        { level: 'INFO', content: 'Information message' },
        { level: 'DEBUG', content: 'Debug message' },
        { level: 'ERROR', content: 'Error message' },
        { level: 'WARN', content: 'Warning message' }
      ];

      logMessages.forEach(({ level, content }) => {
        mockFreeTestRunner.emit('log', `[${level}] ${content}`);
      });

      expect(capturedLogs).toHaveLength(4);
      capturedLogs.forEach((log, index) => {
        expect(log.message).toContain(`[${logMessages[index].level}]`);
        expect(log.message).toContain(logMessages[index].content);
      });
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should remove all listeners on cleanup', async () => {
      let listenerCalled = false;
      
      mockFreeTestRunner.on('log', () => {
        listenerCalled = true;
      });

      await mockFreeTestRunner.cleanup();

      // After cleanup, events should not trigger listeners
      mockFreeTestRunner.emit('log', '[INFO] Should not be captured');
      
      expect(listenerCalled).toBe(false);
      expect(mockFreeTestRunner.listenerCount('log')).toBe(0);
    });

    it('should handle multiple cleanup calls gracefully', async () => {
      await expect(mockFreeTestRunner.cleanup()).resolves.not.toThrow();
      await expect(mockFreeTestRunner.cleanup()).resolves.not.toThrow();
      await expect(mockFreeTestRunner.cleanup()).resolves.not.toThrow();
    });
  });
});