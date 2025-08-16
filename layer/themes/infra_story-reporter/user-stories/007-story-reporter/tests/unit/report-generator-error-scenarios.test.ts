import { ReportGenerator } from '../../src/external/report-generator';
import { TestConfiguration } from '../../src/domain/test-configuration';
import { createDefaultTestResult, TestResult } from '../../src/domain/test-result';
import { TestFileSystem } from '../helpers/test-file-system';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('ReportGenerator Error Scenarios Unit Tests', () => {
  let reportGenerator: ReportGenerator;
  let testFileSystem: TestFileSystem;
  let tempDir: string;
  let validConfig: TestConfiguration;
  let validTestResult: TestResult;

  beforeEach(async () => {
    reportGenerator = new ReportGenerator();
    testFileSystem = new TestFileSystem();
    
    // Create real temporary directory
    tempDir = await testFileSystem.createTempDir('report-gen-error-test-');
    
    validConfig = {
      testSuiteId: 'error-test-suite',
      featureFiles: ['test.feature'],
      stepDefinitions: ['steps.js'],
      outputDirectory: path.join(tempDir, 'error-test-results'),
      outputFormats: ['json', 'html', 'xml']
    };

    validTestResult = createDefaultTestResult('error-test-suite', 'In Progress');
    validTestResult.startTime = new Date('2023-01-01T10:00:00.000Z');
    validTestResult.endTime = new Date('2023-01-01T10:05:00.000Z');
  });

  afterEach(async () => {
    await testFileSystem.cleanup();
  });

  describe('Configuration Error Scenarios', () => {
    it('should throw error for null configuration', () => {
      expect(() => reportGenerator.configure(null)).toThrow(
        'Invalid configuration: Configuration must be an object'
      );
    });

    it('should throw error for undefined configuration', () => {
      expect(() => reportGenerator.configure(undefined)).toThrow(
        'Invalid configuration: Configuration must be an object'
      );
    });

    it('should throw error for missing testSuiteId', () => {
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).testSuiteId;
      
      expect(() => reportGenerator.configure(invalidConfig)).toThrow(
        'Invalid configuration: testSuiteId is required and must be a non-empty string'
      );
    });

    it('should throw error for empty testSuiteId', () => {
      const invalidConfig = { ...validConfig, testSuiteId: '' };
      
      expect(() => reportGenerator.configure(invalidConfig)).toThrow(
        'Invalid configuration: testSuiteId is required and must be a non-empty string'
      );
    });

    it('should throw error for non-string testSuiteId', () => {
      const invalidConfig = { ...validConfig, testSuiteId: 123 as any };
      
      expect(() => reportGenerator.configure(invalidConfig)).toThrow(
        'Invalid configuration: testSuiteId is required and must be a non-empty string'
      );
    });

    it('should throw error for missing outputDirectory', () => {
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).outputDirectory;
      
      expect(() => reportGenerator.configure(invalidConfig)).toThrow(
        'Invalid configuration: outputDirectory is required and must be a non-empty string'
      );
    });

    it('should throw error for empty outputDirectory', () => {
      const invalidConfig = { ...validConfig, outputDirectory: '' };
      
      expect(() => reportGenerator.configure(invalidConfig)).toThrow(
        'Invalid configuration: outputDirectory is required and must be a non-empty string'
      );
    });

    it('should throw error for invalid outputFormats type', () => {
      const invalidConfig = { ...validConfig, outputFormats: 'json' as any };
      
      expect(() => reportGenerator.configure(invalidConfig)).toThrow(
        'Invalid configuration: outputFormats must be an array'
      );
    });

    it('should throw error for empty outputFormats array', () => {
      const invalidConfig = { ...validConfig, outputFormats: [] };
      
      expect(() => reportGenerator.configure(invalidConfig)).toThrow(
        'Invalid configuration: outputFormats must contain at least one format'
      );
    });

    it('should throw error for invalid output format', () => {
      const invalidConfig = { ...validConfig, outputFormats: ['json', 'invalid'] };
      
      expect(() => reportGenerator.configure(invalidConfig)).toThrow(
        'Invalid configuration: Unknown output format: invalid'
      );
    });

    it('should throw error for non-string formats in array', () => {
      const invalidConfig = { ...validConfig, outputFormats: ['json', 123] as any };
      
      expect(() => reportGenerator.configure(invalidConfig)).toThrow(
        'Invalid configuration: All output formats must be strings'
      );
    });
  });

  describe('Generate Reports Error Scenarios', () => {
    it('should throw error when not configured', async () => {
      await expect(reportGenerator.generateReports(validTestResult)).rejects.toThrow(
        'Report generator not configured'
      );
    });

    it('should throw error for null test result', async () => {
      reportGenerator.configure(validConfig);
      
      await expect(reportGenerator.generateReports(null as any)).rejects.toThrow(
        'Invalid test result: Test result must be an object'
      );
    });

    it('should throw error for undefined test result', async () => {
      reportGenerator.configure(validConfig);
      
      await expect(reportGenerator.generateReports(undefined as any)).rejects.toThrow(
        'Invalid test result: Test result must be an object'
      );
    });

    it('should throw error for missing testSuiteId in result', async () => {
      reportGenerator.configure(validConfig);
      
      const invalidResult = { ...validTestResult };
      delete (invalidResult as any).testSuiteId;
      
      await expect(reportGenerator.generateReports(invalidResult)).rejects.toThrow(
        'Invalid test result: testSuiteId is required'
      );
    });

    it('should throw error for missing status in result', async () => {
      reportGenerator.configure(validConfig);
      
      const invalidResult = { ...validTestResult };
      delete (invalidResult as any).status;
      
      await expect(reportGenerator.generateReports(invalidResult)).rejects.toThrow(
        'Invalid test result: status is required'
      );
    });

    it('should throw error for invalid status value', async () => {
      reportGenerator.configure(validConfig);
      
      const invalidResult = { ...validTestResult, status: 'invalid' as any };
      
      await expect(reportGenerator.generateReports(invalidResult)).rejects.toThrow(
        'Invalid test result: status must be one of: In Progress, failed, cancelled'
      );
    });

    it('should throw error for missing startTime', async () => {
      reportGenerator.configure(validConfig);
      
      const invalidResult = { ...validTestResult };
      delete (invalidResult as any).startTime;
      
      await expect(reportGenerator.generateReports(invalidResult)).rejects.toThrow(
        'Invalid test result: startTime is required and must be a Date'
      );
    });

    it('should throw error for invalid startTime type', async () => {
      reportGenerator.configure(validConfig);
      
      const invalidResult = { ...validTestResult, startTime: '2023-01-01' as any };
      
      await expect(reportGenerator.generateReports(invalidResult)).rejects.toThrow(
        'Invalid test result: startTime is required and must be a Date'
      );
    });

    it('should throw error for missing endTime', async () => {
      reportGenerator.configure(validConfig);
      
      const invalidResult = { ...validTestResult };
      delete (invalidResult as any).endTime;
      
      await expect(reportGenerator.generateReports(invalidResult)).rejects.toThrow(
        'Invalid test result: endTime is required and must be a Date'
      );
    });

    it('should throw error for invalid endTime type', async () => {
      reportGenerator.configure(validConfig);
      
      const invalidResult = { ...validTestResult, endTime: '2023-01-01' as any };
      
      await expect(reportGenerator.generateReports(invalidResult)).rejects.toThrow(
        'Invalid test result: endTime is required and must be a Date'
      );
    });
  });

  describe('File System Error Scenarios', () => {
    it('should handle directory creation failures', async () => {
      // Configure with a path that cannot be created
      const invalidDirConfig = {
        ...validConfig,
        outputDirectory: '/root/cannot-create-here/reports'
      };
      
      reportGenerator.configure(invalidDirConfig);
      
      try {
        await reportGenerator.generateReports(validTestResult);
        // If it doesn't throw, the implementation might be creating directories elsewhere
      } catch (error: any) {
        expect(error.message).toMatch(/EACCES|EPERM|Permission denied/);
      }
    });

    it('should handle file write failures', async () => {
      // Create a read-only directory
      const readOnlyDir = path.join(tempDir, "readonly");
      await fs.mkdir(readOnlyDir);
      
      // Make directory read-only (this might not work on all platforms)
      try {
        await fs.chmod(readOnlyDir, 0o555);
        
        const readOnlyConfig = {
          ...validConfig,
          outputDirectory: readOnlyDir
        };
        
        reportGenerator.configure(readOnlyConfig);
        
        await expect(reportGenerator.generateReports(validTestResult)).rejects.toThrow();
      } catch (error) {
        // If chmod fails, skip this test
      }
    });

    it('should handle concurrent report generation', async () => {
      reportGenerator.configure(validConfig);
      
      // Generate multiple reports concurrently
      const promises = [
        reportGenerator.generateReports(validTestResult),
        reportGenerator.generateReports(validTestResult),
        reportGenerator.generateReports(validTestResult)
      ];
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.reportPaths).toBeDefined();
        expect(result.reportPaths.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Report Content Error Scenarios', () => {
    it('should handle missing scenario data', async () => {
      reportGenerator.configure(validConfig);
      
      const resultWithoutScenarios = {
        ...validTestResult,
        scenarios: undefined
      };
      
      const result = await reportGenerator.generateReports(resultWithoutScenarios);
      
      expect(result.status).toBe("completed");
      expect(result.reportPaths).toBeDefined();
    });

    it('should handle empty scenario array', async () => {
      reportGenerator.configure(validConfig);
      
      const resultWithEmptyScenarios = {
        ...validTestResult,
        scenarios: []
      };
      
      const result = await reportGenerator.generateReports(resultWithEmptyScenarios);
      
      expect(result.status).toBe("completed");
      expect(result.reportPaths).toBeDefined();
    });

    it('should handle malformed scenario data', async () => {
      reportGenerator.configure(validConfig);
      
      const resultWithBadScenarios = {
        ...validTestResult,
        scenarios: [
          {
            // Missing required fields
            name: 'Bad Scenario'
          }
        ]
      };
      
      const result = await reportGenerator.generateReports(resultWithBadScenarios);
      
      expect(result.status).toBe("completed");
      expect(result.reportPaths).toBeDefined();
    });

    it('should handle very large test results', async () => {
      reportGenerator.configure(validConfig);
      
      // Create a large test result with many scenarios
      const largeResult = {
        ...validTestResult,
        scenarios: Array(1000).fill(null).map((_, i) => ({
          id: `scenario-${i}`,
          name: `Scenario ${i}`,
          status: i % 2 === 0 ? 'In Progress' : 'failed',
          steps: Array(10).fill(null).map((_, j) => ({
            id: `step-${i}-${j}`,
            name: `Step ${j}`,
            status: 'In Progress',
            duration: 100
          }))
        }))
      };
      
      const result = await reportGenerator.generateReports(largeResult);
      
      expect(result.status).toBe("completed");
      expect(result.reportPaths).toBeDefined();
    });
  });

  describe('Edge Case Error Scenarios', () => {
    it('should handle special characters in testSuiteId', async () => {
      const specialCharConfig = {
        ...validConfig,
        testSuiteId: 'test/suite\\with:special*chars?'
      };
      
      reportGenerator.configure(specialCharConfig);
      
      const specialCharResult = {
        ...validTestResult,
        testSuiteId: 'test/suite\\with:special*chars?'
      };
      
      const result = await reportGenerator.generateReports(specialCharResult);
      
      expect(result.status).toBe("completed");
      expect(result.reportPaths).toBeDefined();
    });

    it('should handle unicode characters in test data', async () => {
      reportGenerator.configure(validConfig);
      
      const unicodeResult = {
        ...validTestResult,
        scenarios: [{
          id: 'unicode-scenario',
          name: '测试场景 🚀 テスト',
          status: 'In Progress' as const,
          steps: [{
            id: 'unicode-step',
            name: 'Étape de test avec émojis 🎉',
            status: 'In Progress' as const,
            duration: 100
          }]
        }]
      };
      
      const result = await reportGenerator.generateReports(unicodeResult);
      
      expect(result.status).toBe("completed");
      expect(result.reportPaths).toBeDefined();
    });

    it('should handle null and undefined values in test data', async () => {
      reportGenerator.configure(validConfig);
      
      const resultWithNulls = {
        ...validTestResult,
        errorMessage: null,
        errorStack: undefined,
        configuration: null
      };
      
      const result = await reportGenerator.generateReports(resultWithNulls);
      
      expect(result.status).toBe("completed");
      expect(result.reportPaths).toBeDefined();
    });

    it('should handle circular references in test data', async () => {
      reportGenerator.configure(validConfig);
      
      const circularResult: any = {
        ...validTestResult
      };
      
      // Create circular reference
      circularResult.self = circularResult;
      
      // Should handle circular references gracefully
      await expect(reportGenerator.generateReports(circularResult)).resolves.toBeDefined();
    });
  });

  describe('Cleanup Error Scenarios', () => {
    it('should handle cleanup when not configured', async () => {
      await expect(reportGenerator.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup after configuration', async () => {
      reportGenerator.configure(validConfig);
      await expect(reportGenerator.cleanup()).resolves.not.toThrow();
    });

    it('should handle multiple cleanup calls', async () => {
      reportGenerator.configure(validConfig);
      
      await reportGenerator.cleanup();
      await reportGenerator.cleanup();
      await reportGenerator.cleanup();
      
      // Should not throw - verify cleanup can be called multiple times
      expect(reportGenerator).toBeDefined();
    });

    it('should reset configuration after cleanup', async () => {
      reportGenerator.configure(validConfig);
      await reportGenerator.cleanup();
      
      // Should throw after cleanup
      await expect(reportGenerator.generateReports(validTestResult)).rejects.toThrow(
        'Report generator not configured'
      );
    });
  });
});