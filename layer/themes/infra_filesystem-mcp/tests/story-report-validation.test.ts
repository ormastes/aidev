import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StoryReportValidator } from '../children/StoryReportValidator';
import { RunnableCommentProcessor } from '../children/RunnableCommentProcessor';
import { TaskQueueRunnableExtension } from '../children/TaskQueueRunnableExtension';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

vi.mock('fs/promises');

describe('Runnable Comment Validation', () => {
  let validator: StoryReportValidator;
  let processor: RunnableCommentProcessor;
  let taskQueueExt: TaskQueueRunnableExtension;

  const mockStoryReport = {
    metadata: {
      reportGenerated: '2025-07-23T10:00:00Z',
      reportGenerator: 'Mock Free Test Oriented Development Story Reporter',
      version: '1.0.0',
      format: 'json'
    },
    testResults: {
      testSuiteId: 'test-suite-001',
      status: 'passed',
      duration: 1000,
      scenarios: [],
      totalTests: 10,
      passedTests: 10,
      failedTests: 0
    },
    coverage: {
      systemTest: {
        class: { percentage: 96, covered: 96, total: 100 },
        branch: { percentage: 97, covered: 97, total: 100 },
        line: { percentage: 95, covered: 95, total: 100 },
        method: { percentage: 94, covered: 94, total: 100 }
      },
      overall: {
        class: { percentage: 95, covered: 95, total: 100 },
        branch: { percentage: 96, covered: 96, total: 100 },
        line: { percentage: 94, covered: 94, total: 100 },
        method: { percentage: 93, covered: 93, total: 100 }
      }
    },
    duplication: {
      percentage: 8,
      duplicatedLines: 80,
      totalLines: 1000,
      duplicatedBlocks: []
    },
    setupConfig: {
      testFramework: 'jest',
      coverageThreshold: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95
      },
      testTimeout: 5000,
      environment: 'test'
    },
    logs: []
  };

  const mockSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["metadata", "testResults", "coverage", "duplication", "setupConfig"]
  };

  beforeEach(() => {
    validator = new StoryReportValidator();
    processor = new RunnableCommentProcessor();
    taskQueueExt = new TaskQueueRunnableExtension();
    
    vi.mocked(fs.readFile).mockImplementation(async (filePath: string) => {
      if (filePath.includes('story-report.schema.json')) {
        return JSON.stringify(mockSchema);
      }
      if (filePath.includes('story-report.json')) {
        return JSON.stringify(mockStoryReport);
      }
      if (filePath.includes('NAME_ID.vf.json')) {
        return JSON.stringify({
          entities: {
            '001-test-story': { name: 'Test Story', type: 'user-story' }
          }
        });
      }
      throw new Error('File not found');
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("StoryReportValidator", () => {
    it('should validate a passing story report', async () => {
      const result = await validator.validate('/tmp/story-report.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(true);
      expect(result.criteria.systemTestClassCoverage.passed).toBe(true);
      expect(result.criteria.branchCoverage.passed).toBe(true);
      expect(result.criteria.duplication.passed).toBe(true);
      expect(result.criteria.fraudCheck.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when coverage is below threshold', async () => {
      const failingReport = {
        ...mockStoryReport,
        coverage: {
          systemTest: {
            class: { percentage: 90, covered: 90, total: 100 },
            branch: { percentage: 85, covered: 85, total: 100 },
            line: { percentage: 88, covered: 88, total: 100 },
            method: { percentage: 87, covered: 87, total: 100 }
          },
          overall: mockStoryReport.coverage.overall
        }
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: string) => {
        if (filePath.includes('story-report.schema.json')) {
          return JSON.stringify(mockSchema);
        }
        if (filePath.includes('story-report.json')) {
          return JSON.stringify(failingReport);
        }
        throw new Error('File not found');
      });

      const result = await validator.validate('/tmp/story-report.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(false);
      expect(result.criteria.systemTestClassCoverage.passed).toBe(false);
      expect(result.criteria.branchCoverage.passed).toBe(false);
      expect(result.errors).toContain('System test class coverage (90%) is below required 95%');
      expect(result.errors).toContain('Branch coverage (85%) is below required 95%');
      expect(result.suggestions).toContain('Add more system tests to cover untested classes');
      expect(result.retrospectStep?.required).toBe(true);
    });

    it('should fail validation when duplication exceeds limit', async () => {
      const highDuplicationReport = {
        ...mockStoryReport,
        duplication: {
          percentage: 15,
          duplicatedLines: 150,
          totalLines: 1000,
          duplicatedBlocks: []
        }
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: string) => {
        if (filePath.includes('story-report.schema.json')) {
          return JSON.stringify(mockSchema);
        }
        if (filePath.includes('story-report.json')) {
          return JSON.stringify(highDuplicationReport);
        }
        throw new Error('File not found');
      });

      const result = await validator.validate('/tmp/story-report.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(false);
      expect(result.criteria.duplication.passed).toBe(false);
      expect(result.errors).toContain('Code duplication (15%) exceeds maximum allowed 10%');
      expect(result.suggestions).toContain('Refactor duplicated code blocks into shared utilities');
    });

    it('should detect fraud when tests are skipped', async () => {
      const fraudReport = {
        ...mockStoryReport,
        testResults: {
          ...mockStoryReport.testResults,
          totalTests: 3,
          scenarios: [
            {
              name: 'Test Scenario 1',
              status: 'passed',
              duration: 100,
              steps: []
            },
            {
              name: 'Test Scenario 2',
              status: 'skipped',
              duration: 0,
              steps: []
            },
            {
              name: 'Test Scenario 3',
              status: 'passed',
              duration: 100,
              steps: [
                { name: 'Step 1', status: 'passed' },
                { name: 'Step 2', status: 'skipped' }
              ]
            }
          ]
        }
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: string) => {
        if (filePath.includes('story-report.schema.json')) {
          return JSON.stringify(mockSchema);
        }
        if (filePath.includes('story-report.json')) {
          return JSON.stringify(fraudReport);
        }
        throw new Error('File not found');
      });

      const result = await validator.validate('/tmp/story-report.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.passed).toBe(false);
      expect(result.criteria.fraudCheck.passed).toBe(false);
      expect(result.criteria.fraudCheck.actual).toBeLessThan(90);
      expect(result.errors[0]).toContain('Fraud check score');
    });

    it('should create runnable comment with parameters', () => {
      const comment = validator.createRunnableComment('/tmp/report.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(comment).toBe('<!-- runnable:validate-story-report:/tmp/report.json,95,95,10,90 -->');
    });

    it('should parse runnable comment correctly', () => {
      const comment = '<!-- runnable:validate-story-report:/tmp/report.json,96,97,8,92 -->';
      const parsed = StoryReportValidator.parseRunnableComment(comment);

      expect(parsed).not.toBeNull();
      expect(parsed?.reportPath).toBe('/tmp/report.json');
      expect(parsed?.criteria.systemTestClassCoverage).toBe(96);
      expect(parsed?.criteria.branchCoverage).toBe(97);
      expect(parsed?.criteria.duplication).toBe(8);
      expect(parsed?.criteria.fraudCheckMinScore).toBe(92);
    });
  });

  describe("RunnableCommentProcessor", () => {
    it('should process story report validation comment', async () => {
      const comment = '<!-- runnable:validate-story-report:/tmp/story-report.json,95,95,10,90 -->';
      const result = await processor.processComment(comment);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('validate-story-report');
      expect(result?.success).toBe(true);
      expect(result?.message).toContain('validation passed');
    });

    it('should process retrospect verification comment', async () => {
      const retrospectContent = `# Retrospect for User Story 001

## Lessons Learned
- Mock Free Test Oriented Development approach works well
- Need better coverage tools

## Rule Suggestions
- Add rule for minimum coverage thresholds
- Enforce fraud detection in CI/CD

## Know-How Updates
Updated KNOW_HOW.md with testing best practices.
`;

      vi.mocked(fs.readFile).mockImplementation(async (filePath: string) => {
        if (filePath.includes("retrospect")) {
          return retrospectContent;
        }
        throw new Error('File not found');
      });

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const comment = '<!-- runnable:verify-retrospect:user-story-001,gen/history/retrospect/001.md -->';
      const result = await processor.processComment(comment);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('verify-retrospect');
      expect(result?.success).toBe(true);
      expect(result?.message).toContain('verification passed');
    });

    it('should validate queue items', async () => {
      const comment = '<!-- runnable:validate-queue-item:system-test,System test for login (env, ext, int tests) -->';
      const result = await processor.processComment(comment);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('validate-queue-item');
      expect(result?.success).toBe(true);
    });

    it('should fail invalid queue item validation', async () => {
      const comment = '<!-- runnable:validate-queue-item:system-test,System test for login only -->';
      const result = await processor.processComment(comment);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('validate-queue-item');
      expect(result?.success).toBe(false);
      expect(result?.message).toContain('must reference');
    });

    it('should process multiple comments in a file', async () => {
      const fileContent = `# Task Queue

<!-- runnable:validate-queue-item:scenario,Scenario: Login flow - research/domain/auth.md -->
Some content here
<!-- runnable:validate-queue-item:user-story,001-test-story registered in NAME_ID -->
`;

      vi.mocked(fs.readFile).mockResolvedValue(fileContent);
      
      const results = await processor.processFile('/tmp/queue.md');

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('validate-queue-item');
      expect(results[0].success).toBe(true);
      expect(results[1].type).toBe('validate-queue-item');
      expect(results[1].success).toBe(true);
    });
  });

  describe("TaskQueueRunnableExtension", () => {
    it('should validate system test queue items', async () => {
      const result = await taskQueueExt.validateQueueItem(
        'system-test',
        'System test for authentication flow (environment, external, integration tests included)'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for incomplete system test', async () => {
      const result = await taskQueueExt.validateQueueItem(
        'system-test',
        'System test for authentication flow'
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must reference');
      expect(result.suggestions).toContain('Ensure your system test references all required test types');
    });

    it('should execute queue steps', async () => {
      const result = await taskQueueExt.executeQueueSteps(
        'system-test',
        'after_pop',
        'System test item',
        { executionCount: 1 }
      );

      expect(result.success).toBe(true);
      expect(result.messages).toContain('Remember to implement Environment, External, and Integration tests first');
    });

    it('should generate queue item with runnable comment', () => {
      const item = taskQueueExt.generateQueueItem(
        "retrospective",
        'Retrospect for story-001',
        {
          reportPath: '/tmp/story-report.json',
          criteria: {
            systemTestClassCoverage: 95,
            branchCoverage: 95,
            duplication: 10,
            fraudCheckMinScore: 90
          }
        }
      );

      expect(item).toContain('Retrospect for story-001');
      expect(item).toContain('<!-- runnable:validate-story-report:');
    });
  });
});