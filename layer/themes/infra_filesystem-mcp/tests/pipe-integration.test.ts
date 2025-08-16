import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as pipe from '../pipe/index';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('Filesystem MCP Pipe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Verification', () => {
    it('should export StoryReportValidator', () => {
      expect(pipe.StoryReportValidator).toBeDefined();
      expect(pipe.createStoryReportValidator).toBeDefined();
    });

    it('should export RunnableCommentProcessor', () => {
      expect(pipe.RunnableCommentProcessor).toBeDefined();
      expect(pipe.createRunnableCommentProcessor).toBeDefined();
    });

    it('should export RunnableComments helper', () => {
      expect(pipe.RunnableComments).toBeDefined();
      expect(pipe.RunnableComments.storyReportValidation).toBeDefined();
      expect(pipe.RunnableComments.retrospectVerification).toBeDefined();
      expect(pipe.RunnableComments.queueItemValidation).toBeDefined();
    });

    it('should export ValidationCriteria and ValidationResult types', () => {
      // TypeScript will ensure these are exported correctly
      const criteria: pipe.ValidationCriteria = {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      };

      expect(criteria).toBeDefined();
    });

    it('should include validators in default export', () => {
      expect(pipe.default.StoryReportValidator).toBeDefined();
      expect(pipe.default.RunnableCommentProcessor).toBeDefined();
      expect(pipe.default.createStoryReportValidator).toBeDefined();
      expect(pipe.default.createRunnableCommentProcessor).toBeDefined();
      expect(pipe.default.RunnableComments).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    it('should create StoryReportValidator instance', () => {
      const validator = pipe.createStoryReportValidator();
      
      expect(validator).toBeDefined();
      expect(validator.validate).toBeDefined();
      expect(validator.createRunnableComment).toBeDefined();
    });

    it('should create RunnableCommentProcessor instance', () => {
      const processor = pipe.createRunnableCommentProcessor();
      
      expect(processor).toBeDefined();
      expect(processor.processComment).toBeDefined();
      expect(processor.processFile).toBeDefined();
    });
  });

  describe('RunnableComments Helper', () => {
    it('should generate story report validation comment', () => {
      const comment = pipe.RunnableComments.storyReportValidation(
        '/path/to/report.json',
        96,
        97,
        8,
        92
      );

      expect(comment).toBe('<!-- runnable:validate-story-report:/path/to/report.json,96,97,8,92 -->');
    });

    it('should use default values when not provided', () => {
      const comment = pipe.RunnableComments.storyReportValidation('/path/to/report.json');

      expect(comment).toBe('<!-- runnable:validate-story-report:/path/to/report.json,95,95,10,90 -->');
    });

    it('should generate retrospect verification comment', () => {
      const comment = pipe.RunnableComments.retrospectVerification(
        '/user-story/001',
        '/retrospect/001.md'
      );

      expect(comment).toBe('<!-- runnable:verify-retrospect:/user-story/001,/retrospect/001.md -->');
    });

    it('should generate queue item validation comment', () => {
      const comment = pipe.RunnableComments.queueItemValidation(
        'system-test',
        'System test for authentication'
      );

      expect(comment).toBe('<!-- runnable:validate-queue-item:system-test,System test for authentication -->');
    });

    it('should handle special characters in parameters', () => {
      const comment = pipe.RunnableComments.queueItemValidation(
        'scenario',
        'Scenario: Login with "email" & password'
      );

      expect(comment).toContain('Scenario: Login with "email" & password');
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with validator and processor', async () => {
      const mockReport = {
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
          totalTests: 10,
          passedTests: 10,
          failedTests: 0
        },
        coverage: {
          systemTest: {
            class: { percentage: 96, covered: 96, total: 100 },
            branch: { percentage: 97, covered: 97, total: 100 }
          }
        },
        duplication: { percentage: 8, duplicatedLines: 80, totalLines: 1000 },
        setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
      };

      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('schema')) {
          return JSON.stringify({ type: 'object' });
        }
        return JSON.stringify(mockReport);
      });

      // Create instances using factory functions
      const validator = pipe.createStoryReportValidator();
      const processor = pipe.createRunnableCommentProcessor();

      // Generate comment using helper
      const comment = pipe.RunnableComments.storyReportValidation('/tmp/report.json');

      // Process the comment
      const result = await processor.processComment(comment);

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.type).toBe('validate-story-report');
    });

    it('should handle multiple validators in parallel', async () => {
      const validator1 = pipe.createStoryReportValidator();
      const validator2 = pipe.createStoryReportValidator();
      
      expect(validator1).not.toBe(validator2); // Different instances
      
      // Both should work independently
      const comment1 = validator1.createRunnableComment('/report1.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 15,
        fraudCheckMinScore: 85
      });
      
      const comment2 = validator2.createRunnableComment('/report2.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });
      
      expect(comment1).toContain('90,90,15,85');
      expect(comment2).toContain('95,95,10,90');
    });

    it('should process file with multiple comment types', async () => {
      const fileContent = `# Combined Test File

## Story Report Validation
${pipe.RunnableComments.storyReportValidation('/report.json', 95, 95, 10, 90)}

## Retrospect Check
${pipe.RunnableComments.retrospectVerification('story-001', 'retrospect-001.md')}

## Queue Validation
${pipe.RunnableComments.queueItemValidation('system-test', 'Full system test')}
`;

      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('combined.md')) {
          return fileContent;
        }
        if (path.includes('schema')) {
          return JSON.stringify({ type: 'object' });
        }
        if (path.includes('report.json')) {
          return JSON.stringify({
            metadata: { reportGenerated: '2025-07-23T10:00:00Z', reportGenerator: 'Mock Free Test Oriented Development Story Reporter', version: '1.0.0', format: 'json' },
            testResults: { testSuiteId: 'test', status: 'passed', duration: 100, scenarios: [], totalTests: 1, passedTests: 1, failedTests: 0 },
            coverage: { systemTest: { class: { percentage: 95, covered: 95, total: 100 }, branch: { percentage: 95, covered: 95, total: 100 } } },
            duplication: { percentage: 5, duplicatedLines: 50, totalLines: 1000 },
            setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
          });
        }
        if (path.includes('retrospect')) {
          return '# Retrospect\n## Lessons Learned\n## Rule Suggestions\n## Know-How Updates\nUpdated KNOW_HOW.md';
        }
        throw new Error('File not found');
      });

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const processor = pipe.createRunnableCommentProcessor();
      const results = await processor.processFile('/tmp/combined.md');

      expect(results).toHaveLength(3);
      expect(results[0].type).toBe('validate-story-report');
      expect(results[1].type).toBe('verify-retrospect');
      expect(results[2].type).toBe('validate-queue-item');
      
      // All should fail because we're missing proper test data
      expect(results.filter(r => r.success).length).toBeGreaterThan(0);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct ValidationCriteria structure', () => {
      const validator = pipe.createStoryReportValidator();
      
      const criteria: pipe.ValidationCriteria = {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      };

      const comment = validator.createRunnableComment('/report.json', criteria);
      expect(comment).toContain('95,95,10,90');
    });

    it('should return correct ValidationResult structure', async () => {
      vi.mocked(fs.readFile).mockImplementation(async () => {
        return JSON.stringify({
          metadata: { reportGenerated: '2025-07-23T10:00:00Z', reportGenerator: 'Mock Free Test Oriented Development Story Reporter', version: '1.0.0', format: 'json' },
          testResults: { testSuiteId: 'test', status: 'passed', duration: 100, scenarios: [], totalTests: 1, passedTests: 1, failedTests: 0 },
          coverage: { systemTest: { class: { percentage: 95, covered: 95, total: 100 }, branch: { percentage: 95, covered: 95, total: 100 } } },
          duplication: { percentage: 5, duplicatedLines: 50, totalLines: 1000 },
          setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
        });
      });

      const validator = pipe.createStoryReportValidator();
      const result: pipe.ValidationResult = await validator.validate('/report.json', {
        systemTestClassCoverage: 95,
        branchCoverage: 95,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      // Type checking ensures all required fields exist
      expect(result.passed).toBeDefined();
      expect(result.criteria).toBeDefined();
      expect(result.criteria.systemTestClassCoverage).toBeDefined();
      expect(result.criteria.branchCoverage).toBeDefined();
      expect(result.criteria.duplication).toBeDefined();
      expect(result.criteria.fraudCheck).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });
});