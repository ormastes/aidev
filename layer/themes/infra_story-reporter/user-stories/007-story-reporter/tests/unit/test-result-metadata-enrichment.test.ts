/**
 * Unit Test: TestResult Metadata Enrichment
 * 
 * Tests the metadata enrichment functionality for test results,
 * including adding statistics, logs, and other contextual information.
 */

import { TestResult, TestScenario, BasicStatistics, ExportedStatistics } from '../../src/types/test-types';

describe('TestResult Metadata Enrichment Unit Test', () => {
  let baseTestResult: TestResult;

  beforeEach(() => {
    baseTestResult = {
      testSuiteId: 'metadata-test-suite',
      status: 'In Progress',
      scenarios: [
        {
          id: 'scenario-1',
          name: 'Test Scenario 1',
          status: 'In Progress',
          steps: [
            { name: 'Step 1', status: 'In Progress', duration: 100 },
            { name: 'Step 2', status: 'In Progress', duration: 150 }
          ],
          duration: 250,
          startTime: new Date('2024-01-01T10:00:00'),
          endTime: new Date('2024-01-01T10:00:00.250')
        }
      ],
      duration: 250,
      startTime: new Date('2024-01-01T10:00:00'),
      endTime: new Date('2024-01-01T10:00:00.250')
    };
  });

  describe('Metadata structure', () => {
    it('should allow adding metadata to test result', () => {
      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          environment: 'test',
          version: '1.0.0',
          runId: 'run-123'
        }
      };

      // Assert
      expect(enrichedResult.metadata).toBeDefined();
      expect(enrichedResult.metadata?.environment).toBe('test');
      expect(enrichedResult.metadata?.version).toBe('1.0.0');
      expect(enrichedResult.metadata?.runId).toBe('run-123');
    });

    it('should preserve existing test result properties when adding metadata', () => {
      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: { key: 'value' }
      };

      // Assert
      expect(enrichedResult.testSuiteId).toBe(baseTestResult.testSuiteId);
      expect(enrichedResult.status).toBe(baseTestResult.status);
      expect(enrichedResult.scenarios).toBe(baseTestResult.scenarios);
      expect(enrichedResult.duration).toBe(baseTestResult.duration);
    });

    it('should support nested metadata structures', () => {
      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          statistics: {
            basic: {
              totalScenarios: 1,
              passedScenarios: 1,
              failedScenarios: 0
            },
            advanced: {
              stepCount: 2,
              averageDuration: 125
            }
          },
          configuration: {
            parallel: true,
            retries: 2
          }
        }
      };

      // Assert
      expect(enrichedResult.metadata?.statistics).toBeDefined();
      expect(enrichedResult.metadata?.statistics.basic.totalScenarios).toBe(1);
      expect(enrichedResult.metadata?.configuration.parallel).toBe(true);
    });
  });

  describe('Statistics enrichment', () => {
    it('should enrich test result with basic statistics', () => {
      // Arrange
      const basicStats: BasicStatistics = {
        totalScenarios: 1,
        passedScenarios: 1,
        failedScenarios: 0,
        skippedScenarios: 0,
        pendingScenarios: 0,
        passRate: 1.0,
        failureRate: 0.0,
        totalExecutionTime: 250,
        averageScenarioDuration: 250
      };

      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          ...baseTestResult.metadata,
          statistics: {
            basic: basicStats
          }
        }
      };

      // Assert
      expect(enrichedResult.metadata?.statistics?.basic).toEqual(basicStats);
      expect(enrichedResult.metadata?.statistics?.basic.passRate).toBe(1.0);
    });

    it('should enrich test result with exported statistics', () => {
      // Arrange
      const exportedStats: ExportedStatistics = {
        basicStatistics: {
          totalScenarios: 1,
          passedScenarios: 1,
          failedScenarios: 0,
          skippedScenarios: 0,
          pendingScenarios: 0,
          passRate: 1.0,
          failureRate: 0.0,
          totalExecutionTime: 250,
          averageScenarioDuration: 250
        },
        advancedMetrics: {
          stepStatistics: {
            totalSteps: 2,
            passedSteps: 2,
            failedSteps: 0,
            skippedSteps: 0,
            pendingSteps: 0,
            averageStepDuration: 125
          },
          performanceMetrics: {
            totalExecutionTime: 250,
            averageScenarioDuration: 250,
            fastestScenario: { id: 'scenario-1', name: 'Test Scenario 1', duration: 250 },
            slowestScenario: { id: 'scenario-1', name: 'Test Scenario 1', duration: 250 },
            durationDistribution: {
              under100ms: 0,
              under500ms: 1,
              under1000ms: 1,
              over1000ms: 0
            }
          },
          failurePatterns: []
        },
        rawData: baseTestResult,
        metadata: {
          exportTimestamp: new Date(),
          testSuiteId: 'metadata-test-suite',
          version: '1.0.0'
        }
      };

      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          exportedStatistics: exportedStats
        }
      };

      // Assert
      expect(enrichedResult.metadata?.exportedStatistics).toBeDefined();
      expect(enrichedResult.metadata?.exportedStatistics?.basicStatistics.totalScenarios).toBe(1);
      expect(enrichedResult.metadata?.exportedStatistics?.advancedMetrics.stepStatistics.totalSteps).toBe(2);
    });
  });

  describe('Log entries enrichment', () => {
    it('should enrich test result with log entries', () => {
      // Arrange
      const logEntries = [
        {
          timestamp: new Date('2024-01-01T10:00:00'),
          level: 'info' as const,
          message: 'Test execution started',
          processId: 'metadata-test-suite'
        },
        {
          timestamp: new Date('2024-01-01T10:00:00.250'),
          level: 'info' as const,
          message: 'Test execution In Progress',
          processId: 'metadata-test-suite'
        }
      ];

      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          logEntries
        }
      };

      // Assert
      expect(enrichedResult.metadata?.logEntries).toBeDefined();
      expect(enrichedResult.metadata?.logEntries?.length).toBe(2);
      expect(enrichedResult.metadata?.logEntries?.[0].message).toBe('Test execution started');
    });

    it('should support log entries with metadata', () => {
      // Arrange
      const logWithMetadata = {
        timestamp: new Date(),
        level: 'error' as const,
        message: 'Test failed',
        processId: 'test-suite',
        metadata: {
          errorCode: 'ERR_001',
          stackTrace: 'Error at line 42',
          scenarioId: 'scenario-1'
        }
      };

      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          logEntries: [logWithMetadata]
        }
      };

      // Assert
      expect(enrichedResult.metadata?.logEntries?.[0].metadata).toBeDefined();
      expect(enrichedResult.metadata?.logEntries?.[0].metadata?.errorCode).toBe('ERR_001');
    });
  });

  describe('Multiple metadata enrichments', () => {
    it('should support multiple enrichment operations', () => {
      // Start with base result
      let enrichedResult: TestResult = { ...baseTestResult };

      // First enrichment - add environment info
      enrichedResult = {
        ...enrichedResult,
        metadata: {
          ...enrichedResult.metadata,
          environment: 'staging',
          timestamp: new Date()
        }
      };

      // Second enrichment - add statistics
      enrichedResult = {
        ...enrichedResult,
        metadata: {
          ...enrichedResult.metadata,
          statistics: {
            totalTests: 1,
            passed: 1,
            failed: 0
          }
        }
      };

      // Third enrichment - add tags
      enrichedResult = {
        ...enrichedResult,
        metadata: {
          ...enrichedResult.metadata,
          tags: ['regression', 'smoke', 'critical']
        }
      };

      // Assert all enrichments are preserved
      expect(enrichedResult.metadata?.environment).toBe('staging');
      expect(enrichedResult.metadata?.statistics).toBeDefined();
      expect(enrichedResult.metadata?.tags).toContain('regression');
      expect(enrichedResult.metadata?.timestamp).toBeInstanceOf(Date);
    });

    it('should merge metadata without overwriting existing properties', () => {
      // Arrange
      const initialMetadata = {
        runId: 'run-123',
        environment: 'test'
      };

      const additionalMetadata = {
        version: '2.0.0',
        tags: ['nightly']
      };

      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          ...initialMetadata,
          ...additionalMetadata
        }
      };

      // Assert - all properties should be present
      expect(enrichedResult.metadata?.runId).toBe('run-123');
      expect(enrichedResult.metadata?.environment).toBe('test');
      expect(enrichedResult.metadata?.version).toBe('2.0.0');
      expect(enrichedResult.metadata?.tags).toContain('nightly');
    });
  });

  describe('Metadata validation', () => {
    it('should handle undefined metadata gracefully', () => {
      // Act
      const result: TestResult = {
        ...baseTestResult,
        metadata: undefined
      };

      // Assert
      expect(result.metadata).toBeUndefined();
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should allow empty metadata object', () => {
      // Act
      const result: TestResult = {
        ...baseTestResult,
        metadata: {}
      };

      // Assert
      expect(result.metadata).toEqual({});
      expect(Object.keys(result.metadata).length).toBe(0);
    });

    it('should serialize metadata correctly for reports', () => {
      // Arrange
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          timestamp: new Date('2024-01-01T10:00:00'),
          duration: 250,
          statistics: {
            passRate: 1.0,
            scenarios: ['scenario-1']
          },
          nullValue: null,
          undefinedValue: undefined
        }
      };

      // Act
      const serialized = JSON.stringify(enrichedResult);
      const deserialized = JSON.parse(serialized);

      // Assert
      expect(deserialized.metadata.timestamp).toBe('2024-01-01T10:00:00.000Z');
      expect(deserialized.metadata.duration).toBe(250);
      expect(deserialized.metadata.statistics.passRate).toBe(1.0);
      expect(deserialized.metadata.nullValue).toBeNull();
      expect(deserialized.metadata.undefinedValue).toBeUndefined();
    });
  });

  describe('Common metadata patterns', () => {
    it('should support CI/CD metadata pattern', () => {
      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          ci: {
            buildNumber: '12345',
            branch: 'main',
            commit: 'abc123def',
            pipeline: 'nightly-tests',
            triggered_by: 'schedule'
          }
        }
      };

      // Assert
      expect(enrichedResult.metadata?.ci?.buildNumber).toBe('12345');
      expect(enrichedResult.metadata?.ci?.branch).toBe('main');
    });

    it('should support performance tracking metadata', () => {
      // Act
      const enrichedResult: TestResult = {
        ...baseTestResult,
        metadata: {
          performance: {
            cpuUsage: 45.2,
            memoryUsage: 512,
            networkLatency: 23,
            resourceUtilization: {
              cpu: [45.2, 48.1, 43.7],
              memory: [512, 520, 508]
            }
          }
        }
      };

      // Assert
      expect(enrichedResult.metadata?.performance?.cpuUsage).toBe(45.2);
      expect(enrichedResult.metadata?.performance?.resourceUtilization?.cpu).toHaveLength(3);
    });
  });
});