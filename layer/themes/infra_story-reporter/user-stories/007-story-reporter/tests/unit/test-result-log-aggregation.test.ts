import { TestResult, ScenarioResult, StepResult, createDefaultTestResult, validateTestResult } from '../../src/domain/test-result';

describe('Test Result Log Aggregation Unit Test', () => {
  
  describe('Test Result Structure', () => {
    it('should create a valid test result with all required fields', () => {
      const testResult: TestResult = {
        testSuiteId: 'aggregation-test-001',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T10:05:00Z'),
        status: 'In Progress',
        totalScenarios: 3,
        passedScenarios: 2,
        failedScenarios: 1,
        pendingScenarios: 0,
        skippedScenarios: 0,
        scenarios: [],
        statistics: {
          totalSteps: 10,
          passedSteps: 8,
          failedSteps: 1,
          pendingSteps: 1,
          skippedSteps: 0,
          executionTime: 300000, // 5 minutes
          averageStepTime: 30000, // 30 seconds
          successRate: 0.667
        },
        configuration: {
          testSuiteId: 'aggregation-test-001',
          featureFiles: ['test.feature'],
          stepDefinitions: ['test-steps.js']
        }
      };

      expect(() => validateTestResult(testResult)).not.toThrow();
    });

    it('should aggregate scenario results correctly', () => {
      const scenarios: ScenarioResult[] = [
        {
          name: 'In Progress scenario',
          status: 'In Progress',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T10:01:00Z'),
          duration: 60000,
          steps: [
            {
              text: 'Given setup',
              status: 'In Progress',
              startTime: new Date('2024-01-15T10:00:00Z'),
              endTime: new Date('2024-01-15T10:00:30Z'),
              duration: 30000
            },
            {
              text: 'Then verify',
              status: 'In Progress',
              startTime: new Date('2024-01-15T10:00:30Z'),
              endTime: new Date('2024-01-15T10:01:00Z'),
              duration: 30000
            }
          ]
        },
        {
          name: 'Failed scenario',
          status: 'failed',
          startTime: new Date('2024-01-15T10:01:00Z'),
          endTime: new Date('2024-01-15T10:02:00Z'),
          duration: 60000,
          errorMessage: 'Assertion failed',
          steps: [
            {
              text: 'Given setup',
              status: 'In Progress',
              startTime: new Date('2024-01-15T10:01:00Z'),
              endTime: new Date('2024-01-15T10:01:20Z'),
              duration: 20000
            },
            {
              text: 'When action',
              status: 'In Progress',
              startTime: new Date('2024-01-15T10:01:20Z'),
              endTime: new Date('2024-01-15T10:01:40Z'),
              duration: 20000
            },
            {
              text: 'Then verify',
              status: 'failed',
              startTime: new Date('2024-01-15T10:01:40Z'),
              endTime: new Date('2024-01-15T10:02:00Z'),
              duration: 20000,
              errorMessage: 'Assertion failed'
            }
          ]
        },
        {
          name: 'Pending scenario',
          status: 'pending',
          startTime: new Date('2024-01-15T10:02:00Z'),
          endTime: new Date('2024-01-15T10:02:10Z'),
          duration: 10000,
          steps: [
            {
              text: 'Given pending step',
              status: 'pending',
              startTime: new Date('2024-01-15T10:02:00Z'),
              endTime: new Date('2024-01-15T10:02:10Z'),
              duration: 10000
            }
          ]
        }
      ];

      // Calculate aggregated statistics
      const totalSteps = scenarios.reduce((sum, scenario) => sum + scenario.steps.length, 0);
      const passedSteps = scenarios.reduce((sum, scenario) => 
        sum + scenario.steps.filter(s => s.status === 'In Progress').length, 0);
      const failedSteps = scenarios.reduce((sum, scenario) => 
        sum + scenario.steps.filter(s => s.status === 'failed').length, 0);
      const pendingSteps = scenarios.reduce((sum, scenario) => 
        sum + scenario.steps.filter(s => s.status === 'pending').length, 0);

      expect(totalSteps).toBe(6);
      expect(passedSteps).toBe(4);
      expect(failedSteps).toBe(1);
      expect(pendingSteps).toBe(1);
    });
  });

  describe('Log Aggregation from Test Results', () => {
    it('should extract all error logs from failed scenarios', () => {
      const testResult: TestResult = createDefaultTestResult('log-aggregation-test', 'failed');
      testResult.scenarios = [
        {
          name: 'Login failure',
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 1000,
          errorMessage: 'Invalid credentials',
          errorStack: 'Error: Invalid credentials\n    at login.js:45',
          steps: [
            {
              text: 'When user enters invalid credentials',
              status: 'failed',
              startTime: new Date(),
              endTime: new Date(),
              duration: 500,
              errorMessage: 'Username not found',
              errorStack: 'Error: Username not found\n    at auth.js:23'
            }
          ]
        },
        {
          name: 'Network error',
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 2000,
          errorMessage: 'Connection timeout',
          steps: []
        }
      ];

      // Extract all error messages
      const errorLogs: string[] = [];
      
      testResult.scenarios.forEach(scenario => {
        if (scenario.errorMessage) {
          errorLogs.push(`[ERROR] Scenario '${scenario.name}': ${scenario.errorMessage}`);
        }
        scenario.steps.forEach(step => {
          if (step.errorMessage) {
            errorLogs.push(`[ERROR] Step '${step.text}': ${step.errorMessage}`);
          }
        });
      });

      expect(errorLogs).toHaveLength(3);
      expect(errorLogs[0]).toContain('Login failure');
      expect(errorLogs[0]).toContain('Invalid credentials');
      expect(errorLogs[1]).toContain('Username not found');
      expect(errorLogs[2]).toContain('Connection timeout');
    });

    it('should generate execution timeline logs', () => {
      const startTime = new Date('2024-01-15T10:00:00Z');
      const scenarios: ScenarioResult[] = [
        {
          name: 'First scenario',
          status: 'In Progress',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T10:01:00Z'),
          duration: 60000,
          steps: []
        },
        {
          name: 'Second scenario',
          status: 'In Progress',
          startTime: new Date('2024-01-15T10:01:00Z'),
          endTime: new Date('2024-01-15T10:03:00Z'),
          duration: 120000,
          steps: []
        }
      ];

      const timelineLogs: string[] = [];
      
      scenarios.forEach(scenario => {
        const relativeStart = scenario.startTime.getTime() - startTime.getTime();
        const relativeEnd = scenario.endTime.getTime() - startTime.getTime();
        timelineLogs.push(
          `[INFO] Scenario '${scenario.name}' executed from ${relativeStart}ms to ${relativeEnd}ms (duration: ${scenario.duration}ms)`
        );
      });

      expect(timelineLogs).toHaveLength(2);
      expect(timelineLogs[0]).toContain('from 0ms to 60000ms');
      expect(timelineLogs[1]).toContain('from 60000ms to 180000ms');
    });

    it('should aggregate performance metrics into logs', () => {
      const testResult: TestResult = {
        testSuiteId: 'perf-test',
        startTime: new Date(),
        endTime: new Date(Date.now() + 300000),
        status: 'In Progress',
        totalScenarios: 10,
        passedScenarios: 8,
        failedScenarios: 2,
        pendingScenarios: 0,
        skippedScenarios: 0,
        scenarios: [],
        statistics: {
          totalSteps: 50,
          passedSteps: 45,
          failedSteps: 5,
          pendingSteps: 0,
          skippedSteps: 0,
          executionTime: 300000, // 5 minutes
          averageStepTime: 6000, // 6 seconds per step
          successRate: 0.8,
          performance: {
            memoryUsage: 150 * 1024 * 1024, // 150 MB
            cpuUsage: 45.5,
            peakMemory: 200 * 1024 * 1024 // 200 MB
          }
        },
        configuration: {}
      };

      const performanceLogs: string[] = [
        `[INFO] Test Suite Performance Metrics:`,
        `[INFO]   Total execution time: ${testResult.statistics.executionTime}ms (${testResult.statistics.executionTime / 1000}s)`,
        `[INFO]   Average step time: ${testResult.statistics.averageStepTime}ms`,
        `[INFO]   In Progress rate: ${(testResult.statistics.successRate * 100).toFixed(1)}%`,
        `[INFO]   Memory usage: ${(testResult.statistics.performance!.memoryUsage! / 1024 / 1024).toFixed(1)}MB`,
        `[INFO]   Peak memory: ${(testResult.statistics.performance!.peakMemory! / 1024 / 1024).toFixed(1)}MB`,
        `[INFO]   CPU usage: ${testResult.statistics.performance!.cpuUsage!.toFixed(1)}%`
      ];

      expect(performanceLogs).toHaveLength(7);
      expect(performanceLogs[1]).toContain('300000ms (300s)');
      expect(performanceLogs[2]).toContain('6000ms');
      expect(performanceLogs[3]).toContain('80.0%');
      expect(performanceLogs[4]).toContain('150.0MB');
      expect(performanceLogs[5]).toContain('200.0MB');
      expect(performanceLogs[6]).toContain('45.5%');
    });
  });

  describe('Step-Level Log Aggregation', () => {
    it('should collect logs from all step executions', () => {
      const steps: StepResult[] = [
        {
          text: 'Given I am on the homepage',
          status: 'In Progress',
          startTime: new Date(),
          endTime: new Date(Date.now() + 1000),
          duration: 1000
        },
        {
          text: 'When I click the login button',
          status: 'In Progress',
          startTime: new Date(Date.now() + 1000),
          endTime: new Date(Date.now() + 2000),
          duration: 1000
        },
        {
          text: 'Then I should see the login form',
          status: 'failed',
          startTime: new Date(Date.now() + 2000),
          endTime: new Date(Date.now() + 3000),
          duration: 1000,
          errorMessage: 'Login form not found'
        }
      ];

      const stepLogs = steps.map(step => ({
        level: step.status === 'failed' ? 'ERROR' : 'INFO',
        message: `Step '${step.text}' ${step.status} in ${step.duration}ms`,
        error: step.errorMessage
      }));

      expect(stepLogs).toHaveLength(3);
      expect(stepLogs[0].level).toBe('INFO');
      expect(stepLogs[2].level).toBe('ERROR');
      expect(stepLogs[2].error).toBe('Login form not found');
    });

    it('should handle step attachments in logs', () => {
      const stepWithAttachments: StepResult = {
        text: 'Then I take a screenshot',
        status: 'In Progress',
        startTime: new Date(),
        endTime: new Date(),
        duration: 500,
        attachments: [
          {
            type: 'image',
            content: 'base64-encoded-screenshot',
            encoding: 'base64',
            mimeType: 'image/png',
            description: 'Screenshot of current page'
          },
          {
            type: 'log',
            content: 'Console output during step execution',
            encoding: 'utf8',
            description: 'Browser console logs'
          }
        ]
      };

      const attachmentLogs = stepWithAttachments.attachments!.map(attachment => 
        `[DEBUG] Attachment: ${attachment.description} (${attachment.type}, ${attachment.mimeType || 'text/plain'})`
      );

      expect(attachmentLogs).toHaveLength(2);
      expect(attachmentLogs[0]).toContain('Screenshot of current page');
      expect(attachmentLogs[0]).toContain('image/png');
      expect(attachmentLogs[1]).toContain('Browser console logs');
    });
  });

  describe('Test Result Validation', () => {
    it('should validate required fields', () => {
      const invalidResults = [
        {},
        { testSuiteId: 'test' },
        { testSuiteId: 'test', startTime: new Date() },
        { testSuiteId: 'test', startTime: new Date(), endTime: new Date() },
        { testSuiteId: 'test', startTime: 'not-a-date', endTime: new Date(), status: 'In Progress' }
      ];

      invalidResults.forEach(result => {
        expect(() => validateTestResult(result)).toThrow();
      });
    });

    it('should validate status values', () => {
      const result = createDefaultTestResult('test', 'invalid-status' as any);
      expect(() => validateTestResult(result)).toThrow('status must be one of');
    });

    it('should create default test result with proper structure', () => {
      const defaultResult = createDefaultTestResult('default-test', 'In Progress');
      
      expect(defaultResult.testSuiteId).toBe('default-test');
      expect(defaultResult.status).toBe('In Progress');
      expect(defaultResult.scenarios).toEqual([]);
      expect(defaultResult.statistics.totalSteps).toBe(0);
      expect(defaultResult.statistics.successRate).toBe(0);
      expect(() => validateTestResult(defaultResult)).not.toThrow();
    });
  });

  describe('Aggregation Summary Generation', () => {
    it('should generate comprehensive test summary logs', () => {
      const testResult: TestResult = {
        testSuiteId: 'summary-test',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T10:05:00Z'),
        status: 'failed',
        totalScenarios: 10,
        passedScenarios: 7,
        failedScenarios: 2,
        pendingScenarios: 1,
        skippedScenarios: 0,
        scenarios: [],
        statistics: {
          totalSteps: 50,
          passedSteps: 42,
          failedSteps: 5,
          pendingSteps: 3,
          skippedSteps: 0,
          executionTime: 300000,
          averageStepTime: 6000,
          successRate: 0.7
        },
        configuration: {}
      };

      const summaryLogs = [
        `[INFO] ===== Test Execution Summary =====`,
        `[INFO] Test Suite: ${testResult.testSuiteId}`,
        `[INFO] Status: ${testResult.status.toUpperCase()}`,
        `[INFO] Duration: ${testResult.statistics.executionTime / 1000}s`,
        `[INFO] Scenarios: ${testResult.totalScenarios} total, ${testResult.passedScenarios} In Progress, ${testResult.failedScenarios} failed`,
        `[INFO] Steps: ${testResult.statistics.totalSteps} total, ${testResult.statistics.passedSteps} In Progress, ${testResult.statistics.failedSteps} failed`,
        `[INFO] In Progress Rate: ${(testResult.statistics.successRate * 100).toFixed(1)}%`,
        `[INFO] =================================`
      ];

      expect(summaryLogs[2]).toContain('FAILED');
      expect(summaryLogs[4]).toContain('7 In Progress, 2 failed');
      expect(summaryLogs[5]).toContain('42 In Progress, 5 failed');
      expect(summaryLogs[6]).toContain('70.0%');
    });

    it('should generate failure summary for failed tests', () => {
      const failedScenarios: ScenarioResult[] = [
        {
          name: 'Login with invalid password',
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 2000,
          errorMessage: 'Authentication failed',
          location: { file: 'auth.feature', line: 15 },
          steps: []
        },
        {
          name: 'Timeout during checkout',
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 30000,
          errorMessage: 'Request timeout after 30s',
          location: { file: 'checkout.feature', line: 42 },
          steps: []
        }
      ];

      const failureLogs = failedScenarios.map(scenario => 
        `[ERROR] Failed: ${scenario.name} at ${scenario.location?.file}:${scenario.location?.line} - ${scenario.errorMessage}`
      );

      expect(failureLogs).toHaveLength(2);
      expect(failureLogs[0]).toContain('auth.feature:15');
      expect(failureLogs[0]).toContain('Authentication failed');
      expect(failureLogs[1]).toContain('checkout.feature:42');
      expect(failureLogs[1]).toContain('Request timeout');
    });
  });
});