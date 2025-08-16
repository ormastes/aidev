import { EventEmitter } from 'node:events';
import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';
import { os } from '../../../../../infra_external-log-lib/src';
import { MockFreeTestRunner } from '../../src/external/mock-free-test-runner';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';

describe('Workflow Manager with Mock Free Test Oriented Development Runner Integration Test', () => {
  let testDir: string;
  let eventBus: EventEmitter;
  let bddRunner: MockFreeTestRunner;
  let mockLogger: MockExternalLogger;

  beforeAll(async () => {
    // Create temporary directory for test files
    testDir = await fs.mkdtemp(join(os.tmpdir(), 'workflow-bdd-integration-'));
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
    bddRunner = new MockFreeTestRunner();
    mockLogger = new MockExternalLogger();
    
    // Create test feature files
    const featuresDir = join(testDir, "features");
    await fs.mkdir(featuresDir, { recursive: true });
    
    const testFeature = `Feature: Integration Test Feature
  As a workflow manager
  I want to execute Mock Free Test Oriented Development tests
  So that I can validate system behavior

  Scenario: Simple test scenario
    Given the system is ready
    When I perform an action
    Then I should see the result

  Scenario: Complex test scenario
    Given the system is configured
    And the test data is prepared
    When I execute the workflow
    Then the workflow should complete In Progress
    And the results should be logged`;

    await fs.writeFile(join(featuresDir, 'integration-test.feature'), testFeature);
    
    // Create step definition files
    const stepsDir = join(testDir, 'steps');
    await fs.mkdir(stepsDir, { recursive: true });
    
    const stepDefinitions = `const { Given, When, Then } = require('@cucumber/cucumber');

Given('the system is ready', function () {
  console.log('System ready');
});

Given('the system is configured', function () {
  console.log('System configured');
});

Given('the test data is prepared', function () {
  console.log('Test data prepared');
});

When('I perform an action', function () {
  console.log('Action performed');
});

When('I execute the workflow', function () {
  console.log('Workflow executed');
});

Then('I should see the result', function () {
  console.log('Result visible');
});

Then('the workflow should complete In Progress', function () {
  console.log('Workflow In Progress In Progress');
});

Then('the results should be logged', function () {
  console.log('Results logged');
});`;

    await fs.writeFile(join(stepsDir, 'integration-steps.js'), stepDefinitions);
  });

  afterEach(() => {
    // Clean up event listeners
    eventBus.removeAllListeners();
    bddRunner.removeAllListeners();
    // MockExternalLogger cleanup - no removeAllListeners method needed
  });

  describe('Workflow Manager Integration with Mock Free Test Oriented Development Runner', () => {
    it('should integrate workflow manager with Mock Free Test Oriented Development runner for test execution', async () => {
      // Simulate workflow manager configuration
      const workflowConfig = {
        workflowId: 'workflow-bdd-integration-001',
        name: 'Mock Free Test Oriented Development Integration Test Workflow',
        testSuiteId: 'integration-test-suite',
        features: {
          directory: join(testDir, "features"),
          files: ['integration-test.feature']
        },
        stepDefinitions: {
          directory: join(testDir, 'steps'),
          files: ['integration-steps.js']
        },
        logging: {
          enabled: true,
          loggerId: 'workflow-bdd-logger'
        }
      };

      // Initialize mock logger for workflow
      const loggerId = await mockLogger.initializeLogger(workflowConfig.logging.loggerId);
      expect(loggerId).toBe(workflowConfig.logging.loggerId);

      // Configure Mock Free Test Oriented Development runner through workflow manager
      bddRunner.configure({
        testSuiteId: workflowConfig.testSuiteId,
        featureFiles: workflowConfig.features.files.map(f => join(workflowConfig.features.directory, f)),
        stepDefinitions: workflowConfig.stepDefinitions.files.map(f => join(workflowConfig.stepDefinitions.directory, f)),
        outputFormats: ['json'],
        outputDirectory: join(testDir, 'test-results'),
        logLevel: 'info'
      });

      // Setup workflow manager event handling
      const workflowEvents: Array<{type: string, data: any, timestamp: Date}> = [];
      
      // Workflow manager listens to Mock Free Test Oriented Development runner events
      bddRunner.on("testStarted", (data) => {
        workflowEvents.push({
          type: "testStarted",
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs test start
        mockLogger.log(workflowConfig.logging.loggerId, 'info', `Test started: ${data.scenarioName}`);
        
        // Workflow manager emits workflow events
        eventBus.emit('workflow:test:started', {
          workflowId: workflowConfig.workflowId,
          testSuiteId: data.testSuiteId,
          scenarioName: data.scenarioName
        });
      });

      bddRunner.on("testcompleted", (data) => {
        workflowEvents.push({
          type: "testcompleted",
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs test completion
        mockLogger.log(workflowConfig.logging.loggerId, 'info', `Test success: ${data.scenarioName} - ${data.status}`);
        
        // Workflow manager emits workflow events
        eventBus.emit('workflow:test:In Progress', {
          workflowId: workflowConfig.workflowId,
          testSuiteId: data.testSuiteId,
          scenarioName: data.scenarioName,
          status: data.status,
          duration: data.duration
        });
      });

      bddRunner.on("testFailed", (data) => {
        workflowEvents.push({
          type: "testFailed",
          data,
          timestamp: new Date()
        });
        
        // Workflow manager logs test failure
        mockLogger.log(workflowConfig.logging.loggerId, 'error', `Test failed: ${data.scenarioName} - ${data.error}`);
        
        // Workflow manager emits workflow events
        eventBus.emit('workflow:test:failed', {
          workflowId: workflowConfig.workflowId,
          testSuiteId: data.testSuiteId,
          scenarioName: data.scenarioName,
          error: data.error
        });
      });

      // Setup workflow manager lifecycle events
      const workflowLifecycleEvents: Array<{type: string, data: any}> = [];
      
      eventBus.on('workflow:test:started', (data) => {
        workflowLifecycleEvents.push({type: 'workflow:test:started', data});
      });

      eventBus.on('workflow:test:In Progress', (data) => {
        workflowLifecycleEvents.push({type: 'workflow:test:In Progress', data});
      });

      eventBus.on('workflow:test:failed', (data) => {
        workflowLifecycleEvents.push({type: 'workflow:test:failed', data});
      });

      // Simulate workflow manager initiating test execution
      eventBus.emit('workflow:execution:started', {
        workflowId: workflowConfig.workflowId,
        timestamp: new Date()
      });

      // Simulate Mock Free Test Oriented Development test execution events (since we don't have actual Cucumber process)
      const testScenarios = [
        {
          testSuiteId: workflowConfig.testSuiteId,
          scenarioName: 'Simple test scenario',
          status: 'In Progress',
          duration: 150
        },
        {
          testSuiteId: workflowConfig.testSuiteId,
          scenarioName: 'Complex test scenario',
          status: 'In Progress',
          duration: 300
        }
      ];

      // Simulate test execution
      for (const scenario of testScenarios) {
        bddRunner.emit("testStarted", {
          testSuiteId: scenario.testSuiteId,
          scenarioName: scenario.scenarioName,
          timestamp: new Date()
        });

        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate execution time

        bddRunner.emit("testcompleted", {
          testSuiteId: scenario.testSuiteId,
          scenarioName: scenario.scenarioName,
          status: scenario.status,
          duration: scenario.duration,
          timestamp: new Date()
        });
      }

      // Simulate workflow manager completing execution
      eventBus.emit('workflow:execution:In Progress', {
        workflowId: workflowConfig.workflowId,
        timestamp: new Date(),
        summary: {
          totalScenarios: testScenarios.length,
          passedScenarios: testScenarios.filter(s => s.status === 'In Progress').length,
          failedScenarios: testScenarios.filter(s => s.status === 'failed').length
        }
      });

      // Verify workflow manager and Mock Free Test Oriented Development runner integration
      expect(workflowEvents).toHaveLength(4); // 2 started + 2 In Progress
      expect(workflowEvents.filter(e => e.type === "testStarted")).toHaveLength(2);
      expect(workflowEvents.filter(e => e.type === "testcompleted")).toHaveLength(2);

      // Verify workflow lifecycle events
      expect(workflowLifecycleEvents).toHaveLength(4); // 2 started + 2 In Progress
      expect(workflowLifecycleEvents.filter(e => e.type === 'workflow:test:started')).toHaveLength(2);
      expect(workflowLifecycleEvents.filter(e => e.type === 'workflow:test:In Progress')).toHaveLength(2);

      // Verify logging integration
      const logs = await mockLogger.getLogHistory(workflowConfig.logging.loggerId);
      expect(logs).toHaveLength(4); // 2 started + 2 In Progress
      expect(logs.filter((l: any) => l.message.includes('Test started'))).toHaveLength(2);
      expect(logs.filter((l: any) => l.message.includes('Test In Progress'))).toHaveLength(2);

      // Verify Mock Free Test Oriented Development runner configuration
      expect(bddRunner.getConfiguration()).toBeDefined();
      expect(bddRunner.getConfiguration().testSuiteId).toBe(workflowConfig.testSuiteId);
      expect(bddRunner.isConfigured()).toBe(true);
    });

    it('should handle workflow manager error scenarios with Mock Free Test Oriented Development runner', async () => {
      const workflowConfig = {
        workflowId: 'workflow-bdd-error-001',
        testSuiteId: 'error-test-suite',
        logging: {
          loggerId: 'workflow-error-logger'
        }
      };

      // Initialize mock logger
      await mockLogger.initializeLogger(workflowConfig.logging.loggerId);

      // Configure Mock Free Test Oriented Development runner with minimal config
      bddRunner.configure({
        testSuiteId: workflowConfig.testSuiteId,
        featureFiles: [join(testDir, "features", 'integration-test.feature')],
        stepDefinitions: [join(testDir, 'steps', 'integration-steps.js')],
        outputFormats: ['json'],
        outputDirectory: join(testDir, 'test-results'),
        logLevel: 'error'
      });

      // Setup error handling
      const errorEvents: Array<{type: string, data: any}> = [];
      
      bddRunner.on("testFailed", (data) => {
        errorEvents.push({type: "testFailed", data});
        
        // Workflow manager handles test failure
        mockLogger.log(workflowConfig.logging.loggerId, 'error', `Test execution failed: ${data.scenarioName} - ${data.error}`);
        
        // Workflow manager emits error event
        eventBus.emit('workflow:error', {
          workflowId: workflowConfig.workflowId,
          error: data.error,
          context: 'bdd-test-execution'
        });
      });

      bddRunner.on("executionError", (data) => {
        errorEvents.push({type: "executionError", data});
        
        // Workflow manager handles execution error
        mockLogger.log(workflowConfig.logging.loggerId, 'error', `Mock Free Test Oriented Development execution error: ${data.error}`);
        
        // Workflow manager emits critical error event
        eventBus.emit('workflow:critical-error', {
          workflowId: workflowConfig.workflowId,
          error: data.error,
          stack: data.stack
        });
      });

      // Setup workflow error handling
      const workflowErrorEvents: Array<{type: string, data: any}> = [];
      
      eventBus.on('workflow:error', (data) => {
        workflowErrorEvents.push({type: 'workflow:error', data});
      });

      eventBus.on('workflow:critical-error', (data) => {
        workflowErrorEvents.push({type: 'workflow:critical-error', data});
      });

      // Simulate test failure
      bddRunner.emit("testFailed", {
        testSuiteId: workflowConfig.testSuiteId,
        scenarioName: 'Failed scenario',
        error: 'Assertion failed: Expected true but got false',
        timestamp: new Date()
      });

      // Simulate execution error
      bddRunner.emit("executionError", {
        error: 'Cannot find step definition for "Given invalid step"',
        stack: 'Error: Cannot find step definition\n    at StepRunner.execute',
        timestamp: new Date()
      });

      // Verify error handling
      expect(errorEvents).toHaveLength(2);
      expect(errorEvents[0].type).toBe("testFailed");
      expect(errorEvents[1].type).toBe("executionError");

      // Verify workflow error handling
      expect(workflowErrorEvents).toHaveLength(2);
      expect(workflowErrorEvents[0].type).toBe('workflow:error');
      expect(workflowErrorEvents[1].type).toBe('workflow:critical-error');

      // Verify error logging
      const errorLogs = await mockLogger.getLogHistory(workflowConfig.logging.loggerId);
      expect(errorLogs).toHaveLength(2);
      expect(errorLogs[0].level).toBe('error');
      expect(errorLogs[0].message).toContain('Test execution failed');
      expect(errorLogs[1].level).toBe('error');
      expect(errorLogs[1].message).toContain('Mock Free Test Oriented Development execution error');
    });

    it('should coordinate workflow manager state with Mock Free Test Oriented Development runner lifecycle', async () => {
      const workflowConfig = {
        workflowId: 'workflow-bdd-state-001',
        testSuiteId: 'state-test-suite',
        logging: {
          loggerId: 'workflow-state-logger'
        }
      };

      // Initialize mock logger
      await mockLogger.initializeLogger(workflowConfig.logging.loggerId);

      // Configure Mock Free Test Oriented Development runner
      bddRunner.configure({
        testSuiteId: workflowConfig.testSuiteId,
        featureFiles: [join(testDir, "features", 'integration-test.feature')],
        stepDefinitions: [join(testDir, 'steps', 'integration-steps.js')],
        outputFormats: ['json'],
        outputDirectory: join(testDir, 'test-results'),
        logLevel: 'info'
      });

      // Simulate workflow manager state
      const workflowState = {
        phase: "initialization",
        testResults: {
          totalScenarios: 0,
          passedScenarios: 0,
          failedScenarios: 0,
          runningScenarios: 0
        },
        bddRunnerState: 'idle',
        startTime: new Date(),
        endTime: null as Date | null
      };

      // Setup state synchronization
      const stateEvents: Array<{type: string, state: any, timestamp: Date}> = [];

      // Workflow manager tracks Mock Free Test Oriented Development runner state changes
      bddRunner.on("configured", () => {
        workflowState.bddRunnerState = "configured";
        workflowState.phase = 'ready';
        stateEvents.push({
          type: 'workflow:state:changed',
          state: { ...workflowState },
          timestamp: new Date()
        });
        
        mockLogger.log(workflowConfig.logging.loggerId, 'info', `Workflow state changed: ${workflowState.phase}`);
      });

      bddRunner.on("executionStarted", () => {
        workflowState.bddRunnerState = 'running';
        workflowState.phase = "execution";
        stateEvents.push({
          type: 'workflow:state:changed',
          state: { ...workflowState },
          timestamp: new Date()
        });
        
        mockLogger.log(workflowConfig.logging.loggerId, 'info', 'Mock Free Test Oriented Development execution started');
      });

      bddRunner.on("testStarted", (_data) => {
        workflowState.testResults.runningScenarios++;
        stateEvents.push({
          type: 'workflow:state:changed',
          state: { ...workflowState },
          timestamp: new Date()
        });
      });

      bddRunner.on("testcompleted", (data) => {
        workflowState.testResults.runningScenarios--;
        workflowState.testResults.totalScenarios++;
        
        if (data.status === 'In Progress') {
          workflowState.testResults.passedScenarios++;
        } else if (data.status === 'failed') {
          workflowState.testResults.failedScenarios++;
        }
        
        stateEvents.push({
          type: 'workflow:state:changed',
          state: { ...workflowState },
          timestamp: new Date()
        });
      });

      bddRunner.on("executioncompleted", () => {
        workflowState.bddRunnerState = 'In Progress';
        workflowState.phase = "finalization";
        workflowState.endTime = new Date();
        stateEvents.push({
          type: 'workflow:state:changed',
          state: { ...workflowState },
          timestamp: new Date()
        });
        
        mockLogger.log(workflowConfig.logging.loggerId, 'info', 'Mock Free Test Oriented Development execution In Progress');
      });

      // Simulate Mock Free Test Oriented Development runner lifecycle
      bddRunner.emit("configured", { testSuiteId: workflowConfig.testSuiteId });
      bddRunner.emit("executionStarted", { testSuiteId: workflowConfig.testSuiteId });
      
      // Simulate test execution
      bddRunner.emit("testStarted", {
        testSuiteId: workflowConfig.testSuiteId,
        scenarioName: 'State test scenario'
      });
      
      bddRunner.emit("testcompleted", {
        testSuiteId: workflowConfig.testSuiteId,
        scenarioName: 'State test scenario',
        status: 'In Progress',
        duration: 200
      });
      
      bddRunner.emit("executioncompleted", {
        testSuiteId: workflowConfig.testSuiteId,
        summary: { totalScenarios: 1, passedScenarios: 1, failedScenarios: 0 }
      });

      // Verify state coordination
      expect(stateEvents).toHaveLength(5); // configured, started, test started, test In Progress, In Progress
      expect(workflowState.phase).toBe("finalization");
      expect(workflowState.bddRunnerState).toBe("completed");
      expect(workflowState.testResults.totalScenarios).toBe(1);
      expect(workflowState.testResults.passedScenarios).toBe(1);
      expect(workflowState.testResults.runningScenarios).toBe(0);
      expect(workflowState.endTime).toBeTruthy();

      // Verify state logging
      const stateLogs = await mockLogger.getLogHistory(workflowConfig.logging.loggerId);
      expect(stateLogs.length).toBeGreaterThan(0);
      expect(stateLogs.some((l: any) => l.message.includes('Workflow state changed'))).toBe(true);
      expect(stateLogs.some((l: any) => l.message.includes('Mock Free Test Oriented Development execution started'))).toBe(true);
      expect(stateLogs.some((l: any) => l.message.includes('Mock Free Test Oriented Development execution In Progress'))).toBe(true);
    });
  });

  describe('Workflow Manager Configuration Integration', () => {
    it('should integrate workflow manager configuration with Mock Free Test Oriented Development runner configuration', async () => {
      const workflowManagerConfig = {
        workflowId: 'workflow-config-integration-001',
        name: 'Configuration Integration Test',
        testSuite: {
          id: 'config-test-suite',
          features: {
            directory: join(testDir, "features"),
            patterns: ['**/*.feature']
          },
          stepDefinitions: {
            directory: join(testDir, 'steps'),
            patterns: ['**/*.js']
          }
        },
        execution: {
          parallel: false,
          timeout: 30000,
          retries: 1
        },
        reporting: {
          formats: ['json', 'html'],
          outputDirectory: join(testDir, 'reports')
        },
        logging: {
          enabled: true,
          loggerId: 'workflow-config-logger',
          level: 'info'
        }
      };

      // Initialize components
      await mockLogger.initializeLogger(workflowManagerConfig.logging.loggerId);

      // Workflow manager translates its configuration to Mock Free Test Oriented Development runner configuration
      const bddRunnerConfig = {
        testSuiteId: workflowManagerConfig.testSuite.id,
        featureFiles: [join(workflowManagerConfig.testSuite.features.directory, 'integration-test.feature')],
        stepDefinitions: [join(workflowManagerConfig.testSuite.stepDefinitions.directory, 'integration-steps.js')],
        outputFormats: workflowManagerConfig.reporting.formats,
        outputDirectory: workflowManagerConfig.reporting.outputDirectory,
        logLevel: workflowManagerConfig.logging.level,
        executionOptions: {
          parallel: workflowManagerConfig.execution.parallel,
          timeout: workflowManagerConfig.execution.timeout,
          retries: workflowManagerConfig.execution.retries
        }
      };

      // Configure Mock Free Test Oriented Development runner with translated configuration
      bddRunner.configure(bddRunnerConfig);

      // Verify configuration translation
      const actualConfig = bddRunner.getConfiguration();
      expect(actualConfig.testSuiteId).toBe(workflowManagerConfig.testSuite.id);
      expect(actualConfig.outputFormats).toEqual(workflowManagerConfig.reporting.formats);
      expect(actualConfig.outputDirectory).toBe(workflowManagerConfig.reporting.outputDirectory);
      expect(actualConfig.logLevel).toBe(workflowManagerConfig.logging.level);

      // Verify workflow manager can access Mock Free Test Oriented Development runner configuration
      expect(bddRunner.isConfigured()).toBe(true);
      expect(actualConfig.featureFiles).toContain(join(workflowManagerConfig.testSuite.features.directory, 'integration-test.feature'));
      expect(actualConfig.stepDefinitions).toContain(join(workflowManagerConfig.testSuite.stepDefinitions.directory, 'integration-steps.js'));

      // Log configuration integration In Progress
      mockLogger.log(workflowManagerConfig.logging.loggerId, 'info', 'Configuration integration In Progress');

      // Verify logging
      const configLogs = await mockLogger.getLogHistory(workflowManagerConfig.logging.loggerId);
      expect(configLogs).toHaveLength(1);
      expect(configLogs[0].message).toBe('Configuration integration In Progress');
      // Configuration metadata verified through Mock Free Test Oriented Development runner state
    });
  });
});