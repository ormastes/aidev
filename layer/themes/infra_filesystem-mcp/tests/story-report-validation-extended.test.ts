import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StoryReportValidator } from '../children/StoryReportValidator';
import { RunnableCommentProcessor } from '../children/RunnableCommentProcessor';
import { TaskQueueRunnableExtension } from '../children/TaskQueueRunnableExtension';
import * as fs from 'fs/promises';

vi.mock('fs/promises');
vi.mock('ajv', () => ({
  default: vi.fn().mockImplementation(() => ({
    compile: vi.fn().mockReturnValue((data: any) => {
      // Mock schema validation
      if (!data.metadata || !data.testResults) return false;
      return true;
    })
  }))
}));

describe('Extended Story Report Validation Tests', () => {
  let validator: StoryReportValidator;
  let processor: RunnableCommentProcessor;

  beforeEach(() => {
    validator = new StoryReportValidator();
    processor = new RunnableCommentProcessor();
    vi.clearAllMocks();
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid JSON in story report', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('schema')) {
          return JSON.stringify({ type: 'object' });
        }
        return 'invalid json {';
      });

      const result = await validator.validate('/tmp/invalid.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Failed to validate story report');
    });

    it('should handle file not found errors', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await validator.validate('/tmp/nonexistent.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Failed to validate story report');
      expect(result.retrospectStep?.required).toBe(true);
    });

    it('should handle missing coverage data', async () => {
      const reportWithoutCoverage = {
        metadata: {
          reportGenerated: '2025-07-23T10:00:00Z',
          reportGenerator: 'Mock Free Test Oriented Development Story Reporter',
          version: '1.0.0',
          format: 'json'
        },
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 100,
          scenarios: [],
          totalTests: 1,
          passedTests: 1,
          failedTests: 0
        },
        duplication: { percentage: 5, duplicatedLines: 5, totalLines: 100 },
        setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
      };

      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('schema')) {
          return JSON.stringify({ type: 'object' });
        }
        return JSON.stringify(reportWithoutCoverage);
      });

      const result = await validator.validate('/tmp/no-coverage.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(false);
      expect(result.criteria.systemTestClassCoverage.actual).toBe(0);
      expect(result.criteria.branchCoverage.actual).toBe(0);
    });

    it('should handle missing duplication data', async () => {
      const reportWithoutDuplication = {
        metadata: {
          reportGenerated: '2025-07-23T10:00:00Z',
          reportGenerator: 'Mock Free Test Oriented Development Story Reporter',
          version: '1.0.0',
          format: 'json'
        },
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 100,
          scenarios: [],
          totalTests: 1,
          passedTests: 1,
          failedTests: 0
        },
        coverage: {
          systemTest: {
            class: { percentage: 96, covered: 96, total: 100 },
            branch: { percentage: 97, covered: 97, total: 100 }
          }
        },
        setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
      };

      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('schema')) {
          return JSON.stringify({ type: 'object' });
        }
        return JSON.stringify(reportWithoutDuplication);
      });

      const result = await validator.validate('/tmp/no-duplication.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.duplication.actual).toBe(0);
      expect(result.criteria.duplication.passed).toBe(true);
    });

    it('should parse invalid runnable comments correctly', () => {
      const invalidComments = [
        '<!-- runnable:validate-story-report -->',
        '<!-- runnable:validate-story-report:file.json -->',
        '<!-- runnable:validate-story-report:file.json,95 -->',
        '<!-- runnable:other-type:params -->',
        'not a comment',
        ''
      ];

      invalidComments.forEach(comment => {
        const parsed = StoryReportValidator.parseRunnableComment(comment);
        expect(parsed).toBeNull();
      });
    });

    it('should handle non-numeric criteria values', () => {
      const comment = '<!-- runnable:validate-story-report:file.json,abc,def,ghi,jkl -->';
      const parsed = StoryReportValidator.parseRunnableComment(comment);

      expect(parsed).not.toBeNull();
      expect(isNaN(parsed!.criteria.systemTestClassCoverage)).toBe(true);
    });
  });

  describe('Fraud Detection Edge Cases', () => {
    it('should detect fraud with all tests skipped', async () => {
      const allSkippedReport = {
        metadata: { reportGenerated: '2025-07-23T10:00:00Z', reportGenerator: 'Mock Free Test Oriented Development Story Reporter', version: '1.0.0', format: 'json' },
        testResults: {
          testSuiteId: 'test',
          status: 'failed',
          duration: 0,
          totalTests: 5,
          passedTests: 0,
          failedTests: 0,
          scenarios: [
            { name: 'Test 1', status: 'skipped', duration: 0 },
            { name: 'Test 2', status: 'skipped', duration: 0 },
            { name: 'Test 3', status: 'skipped', duration: 0 },
            { name: 'Test 4', status: 'skipped', duration: 0 },
            { name: 'Test 5', status: 'skipped', duration: 0 }
          ]
        },
        coverage: {
          systemTest: {
            class: { percentage: 95, covered: 95, total: 100 },
            branch: { percentage: 95, covered: 95, total: 100 }
          }
        },
        duplication: { percentage: 5, duplicatedLines: 50, totalLines: 1000 },
        setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
      };

      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('schema')) {
          return JSON.stringify({ type: 'object' });
        }
        return JSON.stringify(allSkippedReport);
      });

      const result = await validator.validate('/tmp/all-skipped.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(false);
      expect(result.criteria.fraudCheck.passed).toBe(false);
      expect(result.criteria.fraudCheck.actual).toBeLessThan(50);
      expect(result.suggestions.some(s => s.includes('High ratio of skipped tests'))).toBe(true);
    });

    it('should detect suspiciously high coverage with minimal tests', async () => {
      const suspiciousReport = {
        metadata: { reportGenerated: '2025-07-23T10:00:00Z', reportGenerator: 'Mock Free Test Oriented Development Story Reporter', version: '1.0.0', format: 'json' },
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 100,
          totalTests: 2,
          passedTests: 2,
          failedTests: 0,
          scenarios: [
            { name: 'Test 1', status: 'passed', duration: 50 },
            { name: 'Test 2', status: 'passed', duration: 50 }
          ]
        },
        coverage: {
          systemTest: {
            class: { percentage: 98, covered: 98, total: 100 },
            branch: { percentage: 99, covered: 99, total: 100 }
          }
        },
        duplication: { percentage: 5, duplicatedLines: 50, totalLines: 1000 },
        setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
      };

      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('schema')) {
          return JSON.stringify({ type: 'object' });
        }
        return JSON.stringify(suspiciousReport);
      });

      const result = await validator.validate('/tmp/suspicious.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBeLessThan(90);
      expect(result.suggestions.some(s => s.includes('Suspiciously high coverage'))).toBe(true);
    });
  });

  describe('RunnableCommentProcessor Error Handling', () => {
    it('should handle unknown runnable comment types', async () => {
      const comment = '<!-- runnable:unknown-type:params -->';
      const result = await processor.processComment(comment);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect(result?.message).toContain('Unknown runnable comment type');
    });

    it('should handle file processing errors', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));

      const results = await processor.processFile('/tmp/forbidden.md');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('file-processing');
      expect(results[0].success).toBe(false);
      expect(results[0].message).toContain('Failed to process file');
    });

    it('should handle malformed retrospect files', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('Random content without required sections');

      const comment = '<!-- runnable:verify-retrospect:story,retrospect.md -->';
      const result = await processor.processComment(comment);

      expect(result?.success).toBe(false);
      expect(result?.details.missingSections).toContain('Lessons Learned');
      expect(result?.details.missingSections).toContain('Rule Suggestions');
      expect(result?.details.missingSections).toContain('Know-How Updates');
    });

    it('should handle retrospect file not found', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const comment = '<!-- runnable:verify-retrospect:story,nonexistent.md -->';
      const result = await processor.processComment(comment);

      expect(result?.success).toBe(false);
      expect(result?.message).toContain('Retrospect file not found');
    });

    it('should validate queue items with special characters', async () => {
      const comment = '<!-- runnable:validate-queue-item:system-test,System test for "login" & <logout> (env, ext, int) -->';
      const result = await processor.processComment(comment);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('validate-queue-item');
      expect(result?.success).toBe(true);
    });
  });

  describe('TaskQueueRunnableExtension Edge Cases', () => {
    const ext = new TaskQueueRunnableExtension();

    it('should handle unknown queue types', async () => {
      const result = await ext.validateQueueItem('unknown-queue', 'Some item');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown queue type');
      expect(result.suggestions).toContain('Use one of: system-test, scenario, user-story, retrospective');
    });

    it('should validate scenario without research', async () => {
      const result = await ext.validateQueueItem('scenario', 'Scenario: Login flow');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must have associated research files');
    });

    it('should validate user story without ID', async () => {
      const result = await ext.validateQueueItem('user-story', 'As a developer, I want login feature');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be registered in NAME_ID');
    });

    it('should validate user story with unregistered ID', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await ext.validateQueueItem('user-story', '999-unregistered-story');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be registered in NAME_ID');
    });

    it('should execute steps with seldom condition', async () => {
      // Mock Math.random to control seldom execution
      const originalRandom = Math.random;
      Math.random = () => 0.1; // Will execute (< 0.2)

      const result = await ext.executeQueueSteps(
        'system-test',
        'after_pop',
        'Test item',
        {}
      );

      Math.random = originalRandom;
      expect(result.success).toBe(true);
    });

    it('should skip steps with count condition not met', async () => {
      const result = await ext.executeQueueSteps(
        'retrospective',
        'after_pop',
        'Retrospect item',
        { executionCount: 5 } // Not 1
      );

      expect(result.messages).not.toContain('Story report validation failed');
    });

    it('should handle missing context in step execution', async () => {
      const result = await ext.executeQueueSteps(
        'retrospective',
        'after_pop',
        'Retrospect item',
        {} // No reportPath
      );

      expect(result.success).toBe(true);
      expect(result.messages).toContain('Retrospect template sections');
    });

    it('should generate queue items without options', () => {
      const item = ext.generateQueueItem('system-test', 'Test description');

      expect(item).toContain('Test description');
      expect(item).toContain('<!-- runnable:validate-queue-item:');
    });

    it('should generate retrospective item without report path', () => {
      const item = ext.generateQueueItem('retrospective', 'Retrospect description');

      expect(item).toBe('Retrospect description');
      expect(item).not.toContain('<!-- runnable:');
    });
  });

  describe('Integration with Schema Validation', () => {
    it('should fail on invalid schema format', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('schema')) {
          return 'not valid json schema';
        }
        return JSON.stringify({});
      });

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Failed to validate');
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle exactly meeting thresholds', async () => {
      const boundaryReport = {
        metadata: { reportGenerated: '2025-07-23T10:00:00Z', reportGenerator: 'Mock Free Test Oriented Development Story Reporter', version: '1.0.0', format: 'json' },
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 100,
          totalTests: 10,
          passedTests: 10,
          failedTests: 0,
          scenarios: []
        },
        coverage: {
          systemTest: {
            class: { percentage: 95, covered: 95, total: 100 },
            branch: { percentage: 95, covered: 95, total: 100 }
          }
        },
        duplication: { percentage: 10, duplicatedLines: 100, totalLines: 1000 },
        setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
      };

      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('schema')) {
          return JSON.stringify({ type: 'object' });
        }
        return JSON.stringify(boundaryReport);
      });

      const result = await validator.validate('/tmp/boundary.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(true);
      expect(result.criteria.systemTestClassCoverage.passed).toBe(true);
      expect(result.criteria.branchCoverage.passed).toBe(true);
      expect(result.criteria.duplication.passed).toBe(true);
    });

    it('should handle zero values correctly', async () => {
      const zeroReport = {
        metadata: { reportGenerated: '2025-07-23T10:00:00Z', reportGenerator: 'Mock Free Test Oriented Development Story Reporter', version: '1.0.0', format: 'json' },
        testResults: {
          testSuiteId: 'test',
          status: 'failed',
          duration: 0,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          scenarios: []
        },
        coverage: {
          systemTest: {
            class: { percentage: 0, covered: 0, total: 100 },
            branch: { percentage: 0, covered: 0, total: 100 }
          }
        },
        duplication: { percentage: 0, duplicatedLines: 0, totalLines: 1000 },
        setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
      };

      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('schema')) {
          return JSON.stringify({ type: 'object' });
        }
        return JSON.stringify(zeroReport);
      });

      const result = await validator.validate('/tmp/zero.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(false);
      expect(result.criteria.systemTestClassCoverage.actual).toBe(0);
      expect(result.criteria.branchCoverage.actual).toBe(0);
      expect(result.criteria.duplication.actual).toBe(0);
      expect(result.criteria.duplication.passed).toBe(true); // 0% duplication is good
    });
  });
});