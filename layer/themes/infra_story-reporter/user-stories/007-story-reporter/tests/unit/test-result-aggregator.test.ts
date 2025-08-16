import { TestResultAggregator } from '../../src/services/test-result-aggregator';
import { HierarchicalBuildResult } from '../../src/domain/hierarchical-build-config';

describe('TestResultAggregator', () => {
  let aggregator: TestResultAggregator;
  
  beforeEach(() => {
    aggregator = new TestResultAggregator();
  });

  describe('aggregateResults', () => {
    it('should aggregate simple build results without children', () => {
      const buildResult: HierarchicalBuildResult = {
        buildId: 'test-build',
        buildType: 'theme',
        status: 'passed',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:05:00Z'),
        duration: 300000,
        testResults: {
          total: 10,
          passed: 8,
          failed: 1,
          skipped: 1,
          errors: []
        },
        coverage: {
          lines: { total: 100, covered: 80, percentage: 80 },
          branches: { total: 50, covered: 40, percentage: 80 },
          functions: { total: 20, covered: 18, percentage: 90 },
          statements: { total: 100, covered: 85, percentage: 85 }
        },
        children: []
      };
      
      const aggregationStartSpy = jest.fn();
      const aggregationCompleteSpy = jest.fn();
      aggregator.on('aggregationStart', aggregationStartSpy);
      aggregator.on('aggregationComplete', aggregationCompleteSpy);
      
      const result = aggregator.aggregateResults(buildResult);
      
      expect(aggregationStartSpy).toHaveBeenCalled();
      expect(aggregationCompleteSpy).toHaveBeenCalled();
      
      expect(result.buildId).toBe('test-build');
      expect(result.totalBuilds).toBe(1);
      expect(result.totalTests).toBe(10);
      expect(result.passedTests).toBe(8);
      expect(result.failedTests).toBe(1);
      expect(result.skippedTests).toBe(1);
      
      expect(result.ownResults).toBeDefined();
      expect(result.ownResults?.tests.total).toBe(10);
      expect(result.ownResults?.coverage).toBeDefined();
      
      expect(result.aggregatedCoverage).toBeDefined();
      expect(result.aggregatedCoverage?.lines.percentage).toBe(80);
    });

    it('should aggregate hierarchical build results', () => {
      const child1: HierarchicalBuildResult = {
        buildId: 'child1',
        buildType: 'story',
        status: 'passed',
        testResults: {
          total: 5,
          passed: 5,
          failed: 0,
          skipped: 0,
          errors: []
        },
        coverage: {
          lines: { total: 50, covered: 45, percentage: 90 },
          branches: { total: 20, covered: 18, percentage: 90 },
          functions: { total: 10, covered: 9, percentage: 90 },
          statements: { total: 50, covered: 45, percentage: 90 }
        },
        children: []
      };
      
      const child2: HierarchicalBuildResult = {
        buildId: 'child2',
        buildType: 'story',
        status: 'failed',
        testResults: {
          total: 8,
          passed: 6,
          failed: 2,
          skipped: 0,
          errors: [
            { test: 'test1', error: 'Failed assertion' }
          ]
        },
        coverage: {
          lines: { total: 100, covered: 70, percentage: 70 },
          branches: { total: 40, covered: 28, percentage: 70 },
          functions: { total: 20, covered: 14, percentage: 70 },
          statements: { total: 100, covered: 70, percentage: 70 }
        },
        children: []
      };
      
      const parent: HierarchicalBuildResult = {
        buildId: 'parent',
        buildType: 'theme',
        status: 'passed',
        testResults: {
          total: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          errors: []
        },
        children: [child1, child2]
      };
      
      const result = aggregator.aggregateResults(parent);
      
      expect(result.totalBuilds).toBe(3); // parent + 2 children
      expect(result.totalTests).toBe(23); // 10 + 5 + 8
      expect(result.passedTests).toBe(21); // 10 + 5 + 6
      expect(result.failedTests).toBe(2); // 0 + 0 + 2
      
      expect(result.children).toHaveLength(2);
      expect(result.allBuilds).toHaveLength(3);
      expect(result.failedBuilds).toHaveLength(1);
      expect(result.failedBuilds[0].buildId).toBe('child2');
    });

    it('should aggregate coverage across builds', () => {
      const child1: HierarchicalBuildResult = {
        buildId: 'child1',
        buildType: 'story',
        status: 'passed',
        coverage: {
          lines: { total: 100, covered: 80, percentage: 80 },
          branches: { total: 50, covered: 40, percentage: 80 },
          functions: { total: 20, covered: 16, percentage: 80 },
          statements: { total: 100, covered: 80, percentage: 80 }
        },
        children: []
      };
      
      const child2: HierarchicalBuildResult = {
        buildId: 'child2',
        buildType: 'story',
        status: 'passed',
        coverage: {
          lines: { total: 200, covered: 180, percentage: 90 },
          branches: { total: 100, covered: 90, percentage: 90 },
          functions: { total: 40, covered: 36, percentage: 90 },
          statements: { total: 200, covered: 180, percentage: 90 }
        },
        children: []
      };
      
      const parent: HierarchicalBuildResult = {
        buildId: 'parent',
        buildType: 'theme',
        status: 'passed',
        children: [child1, child2]
      };
      
      const result = aggregator.aggregateResults(parent, { aggregateCoverage: true });
      
      expect(result.aggregatedCoverage).toBeDefined();
      
      // Total lines: 100 + 200 = 300, Covered: 80 + 180 = 260
      expect(result.aggregatedCoverage?.lines.total).toBe(300);
      expect(result.aggregatedCoverage?.lines.covered).toBe(260);
      expect(result.aggregatedCoverage?.lines.percentage).toBeCloseTo(86.67, 1);
      
      // Total branches: 50 + 100 = 150, Covered: 40 + 90 = 130
      expect(result.aggregatedCoverage?.branches.total).toBe(150);
      expect(result.aggregatedCoverage?.branches.covered).toBe(130);
      expect(result.aggregatedCoverage?.branches.percentage).toBeCloseTo(86.67, 1);
    });

    it('should apply status filter', () => {
      const builds: HierarchicalBuildResult[] = [
        {
          buildId: 'build1',
          buildType: 'story',
          status: 'passed',
          children: []
        },
        {
          buildId: 'build2',
          buildType: 'story',
          status: 'failed',
          children: []
        },
        {
          buildId: 'build3',
          buildType: 'story',
          status: 'skipped',
          children: []
        }
      ];
      
      const parent: HierarchicalBuildResult = {
        buildId: 'parent',
        buildType: 'theme',
        status: 'passed',
        children: builds
      };
      
      const result = aggregator.aggregateResults(parent, {
        filter: { status: 'failed' }
      });
      
      expect(result.allBuilds.filter(b => b.buildId === 'build2')).toHaveLength(1);
      expect(result.allBuilds.filter(b => b.buildId === 'build1')).toHaveLength(0);
      expect(result.allBuilds.filter(b => b.buildId === 'build3')).toHaveLength(0);
    });

    it('should apply build type filter', () => {
      const epic: HierarchicalBuildResult = {
        buildId: 'epic1',
        buildType: 'epic',
        status: 'passed',
        children: [
          {
            buildId: 'theme1',
            buildType: 'theme',
            status: 'passed',
            children: [
              {
                buildId: 'story1',
                buildType: 'story',
                status: 'passed',
                children: []
              }
            ]
          }
        ]
      };
      
      const result = aggregator.aggregateResults(epic, {
        filter: { buildType: 'theme' }
      });
      
      expect(result.allBuilds.filter(b => b.buildType === 'theme')).toHaveLength(1);
      expect(result.allBuilds.filter(b => b.buildType === 'epic')).toHaveLength(0);
      expect(result.allBuilds.filter(b => b.buildType === 'story')).toHaveLength(0);
    });

    it('should handle builds without test results', () => {
      const buildResult: HierarchicalBuildResult = {
        buildId: 'no-tests',
        buildType: 'theme',
        status: 'skipped',
        children: []
      };
      
      const result = aggregator.aggregateResults(buildResult);
      
      expect(result.totalTests).toBe(0);
      expect(result.passedTests).toBe(0);
      expect(result.failedTests).toBe(0);
      expect(result.skippedTests).toBe(0);
      expect(result.ownResults).toBeUndefined();
    });

    it('should collect test errors from all levels', () => {
      const grandchild: HierarchicalBuildResult = {
        buildId: 'grandchild',
        buildType: 'story',
        status: 'failed',
        testResults: {
          total: 2,
          passed: 1,
          failed: 1,
          skipped: 0,
          errors: [
            { test: 'grandchild-test', error: 'Grandchild error', stack: 'stack trace' }
          ]
        },
        children: []
      };
      
      const child: HierarchicalBuildResult = {
        buildId: 'child',
        buildType: 'theme',
        status: 'failed',
        testResults: {
          total: 3,
          passed: 2,
          failed: 1,
          skipped: 0,
          errors: [
            { test: 'child-test', error: 'Child error' }
          ]
        },
        children: [grandchild]
      };
      
      const parent: HierarchicalBuildResult = {
        buildId: 'parent',
        buildType: 'epic',
        status: 'failed',
        testResults: {
          total: 5,
          passed: 4,
          failed: 1,
          skipped: 0,
          errors: [
            { test: 'parent-test', error: 'Parent error' }
          ]
        },
        children: [child]
      };
      
      const result = aggregator.aggregateResults(parent);
      
      expect(result.totalTests).toBe(10); // 5 + 3 + 2
      expect(result.failedTests).toBe(3); // 1 + 1 + 1
      
      // All builds should be collected in flat view
      expect(result.allBuilds).toHaveLength(3);
      expect(result.failedBuilds).toHaveLength(3);
    });
  });

  describe('generateSummaryReport', () => {
    it('should generate comprehensive summary report', () => {
      const buildResult: HierarchicalBuildResult = {
        buildId: 'test-build',
        buildType: 'theme',
        status: 'passed',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:05:00Z'),
        duration: 300000,
        testResults: {
          total: 100,
          passed: 95,
          failed: 3,
          skipped: 2,
          errors: [
            { test: 'test1', error: 'Error 1' },
            { test: 'test2', error: 'Error 2' },
            { test: 'test3', error: 'Error 3' }
          ]
        },
        coverage: {
          lines: { total: 1000, covered: 850, percentage: 85 },
          branches: { total: 200, covered: 160, percentage: 80 },
          functions: { total: 100, covered: 90, percentage: 90 },
          statements: { total: 1000, covered: 850, percentage: 85 }
        },
        children: []
      };
      
      const aggregatedResult = aggregator.aggregateResults(buildResult);
      
      const summaryGeneratedSpy = jest.fn();
      aggregator.on('summaryGenerated', summaryGeneratedSpy);
      
      const report = aggregator.generateSummaryReport(aggregatedResult);
      
      expect(summaryGeneratedSpy).toHaveBeenCalled();
      
      expect(report.title).toContain('test-build');
      expect(report.buildType).toBe('theme');
      
      expect(report.overview.totalBuilds).toBe(1);
      expect(report.overview.totalTests).toBe(100);
      expect(report.overview.passedTests).toBe(95);
      expect(report.overview.failedTests).toBe(3);
      expect(report.overview.passRate).toBe('95.00%');
      expect(report.overview.status).toBe('passed');
      
      expect(report.coverage).toBeDefined();
      expect(report.coverage?.lines).toBe('85.00%');
      expect(report.coverage?.overall).toBe('85.00%');
      
      expect(report.testErrors).toHaveLength(3);
      expect(report.testErrors[0].test).toBe('test1');
      
      expect(report.performanceMetrics.totalDuration).toBe(300000);
    });

    it('should handle report without coverage', () => {
      const buildResult: HierarchicalBuildResult = {
        buildId: 'no-coverage',
        buildType: 'theme',
        status: 'passed',
        testResults: {
          total: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          errors: []
        },
        children: []
      };
      
      const aggregatedResult = aggregator.aggregateResults(buildResult);
      const report = aggregator.generateSummaryReport(aggregatedResult);
      
      expect(report.coverage).toBeUndefined();
    });

    it('should identify slowest and fastest builds', () => {
      const builds: HierarchicalBuildResult[] = [
        {
          buildId: 'fast',
          buildType: 'story',
          status: 'passed',
          duration: 1000,
          children: []
        },
        {
          buildId: 'medium',
          buildType: 'story',
          status: 'passed',
          duration: 5000,
          children: []
        },
        {
          buildId: 'slow',
          buildType: 'story',
          status: 'passed',
          duration: 10000,
          children: []
        }
      ];
      
      const parent: HierarchicalBuildResult = {
        buildId: 'parent',
        buildType: 'theme',
        status: 'passed',
        children: builds
      };
      
      const aggregatedResult = aggregator.aggregateResults(parent);
      const report = aggregator.generateSummaryReport(aggregatedResult);
      
      expect(report.performanceMetrics.averageBuildDuration).toBeCloseTo(5333.33, 1);
      expect(report.performanceMetrics.slowestBuild?.buildId).toBe('slow');
      expect(report.performanceMetrics.fastestBuild?.buildId).toBe('fast');
    });

    it('should generate build breakdown by type', () => {
      const epic: HierarchicalBuildResult = {
        buildId: 'epic1',
        buildType: 'epic',
        status: 'passed',
        testResults: { total: 10, passed: 10, failed: 0, skipped: 0, errors: [] },
        children: [
          {
            buildId: 'theme1',
            buildType: 'theme',
            status: 'passed',
            testResults: { total: 20, passed: 19, failed: 1, skipped: 0, errors: [] },
            children: [
              {
                buildId: 'story1',
                buildType: 'story',
                status: 'passed',
                testResults: { total: 5, passed: 5, failed: 0, skipped: 0, errors: [] },
                children: []
              },
              {
                buildId: 'story2',
                buildType: 'story',
                status: 'failed',
                testResults: { total: 8, passed: 6, failed: 2, skipped: 0, errors: [] },
                children: []
              }
            ]
          }
        ]
      };
      
      const aggregatedResult = aggregator.aggregateResults(epic);
      const report = aggregator.generateSummaryReport(aggregatedResult);
      
      expect(report.buildBreakdown).toHaveLength(3); // epic, theme, story
      
      const epicBreakdown = report.buildBreakdown.find(b => b.buildType === 'epic');
      expect(epicBreakdown?.count).toBe(1);
      expect(epicBreakdown?.totalTests).toBe(10);
      
      const storyBreakdown = report.buildBreakdown.find(b => b.buildType === 'story');
      expect(storyBreakdown?.count).toBe(2);
      expect(storyBreakdown?.failed).toBe(1);
      expect(storyBreakdown?.totalTests).toBe(13); // 5 + 8
    });
  });

  describe('exportResults', () => {
    it('should export results as JSON', async () => {
      const buildResult: HierarchicalBuildResult = {
        buildId: 'test',
        buildType: 'theme',
        status: 'passed',
        children: []
      };
      
      const aggregatedResult = aggregator.aggregateResults(buildResult);
      const json = await aggregator.exportResults(aggregatedResult, 'json');
      
      const parsed = JSON.parse(json);
      expect(parsed.buildId).toBe('test');
      expect(parsed.buildType).toBe('theme');
    });

    it('should export results as HTML', async () => {
      const buildResult: HierarchicalBuildResult = {
        buildId: 'test',
        buildType: 'theme',
        status: 'passed',
        testResults: {
          total: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          errors: []
        },
        children: []
      };
      
      const aggregatedResult = aggregator.aggregateResults(buildResult);
      const html = await aggregator.exportResults(aggregatedResult, 'html');
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>');
      expect(html).toContain('Total Tests: <strong>10</strong>');
      expect(html).toContain('Passed: <strong>10</strong>');
    });

    it('should export results as Markdown', async () => {
      const buildResult: HierarchicalBuildResult = {
        buildId: 'test',
        buildType: 'theme',
        status: 'passed',
        testResults: {
          total: 10,
          passed: 9,
          failed: 1,
          skipped: 0,
          errors: []
        },
        children: []
      };
      
      const aggregatedResult = aggregator.aggregateResults(buildResult);
      const markdown = await aggregator.exportResults(aggregatedResult, 'markdown');
      
      expect(markdown).toContain('# Test Results Summary');
      expect(markdown).toContain('## Overview');
      expect(markdown).toContain('- **Total Builds**: 1');
      expect(markdown).toContain('- **Total Tests**: 10');
      expect(markdown).toContain('- **Passed**: 9');
      expect(markdown).toContain('- **Failed**: 1');
    });

    it('should export results as CSV', async () => {
      const builds: HierarchicalBuildResult[] = [
        {
          buildId: 'build1',
          buildType: 'story',
          status: 'passed',
          testResults: { total: 5, passed: 5, failed: 0, skipped: 0, errors: [] },
          duration: 1000,
          children: []
        },
        {
          buildId: 'build2',
          buildType: 'story',
          status: 'failed',
          testResults: { total: 3, passed: 2, failed: 1, skipped: 0, errors: [] },
          duration: 2000,
          children: []
        }
      ];
      
      const parent: HierarchicalBuildResult = {
        buildId: 'parent',
        buildType: 'theme',
        status: 'passed',
        children: builds
      };
      
      const aggregatedResult = aggregator.aggregateResults(parent);
      const csv = await aggregator.exportResults(aggregatedResult, 'csv');
      
      const lines = csv.split('\n');
      expect(lines[0]).toBe('Build ID,Build Type,Status,Total Tests,Passed,Failed,Skipped,Duration (ms)');
      expect(lines).toHaveLength(4); // header + 3 builds
      expect(lines[2]).toContain('build1,story,passed,5,5,0,0,1000');
    });

    it('should throw error for unsupported format', async () => {
      const buildResult: HierarchicalBuildResult = {
        buildId: 'test',
        buildType: 'theme',
        status: 'passed',
        children: []
      };
      
      const aggregatedResult = aggregator.aggregateResults(buildResult);
      
      await expect(aggregator.exportResults(aggregatedResult, 'unsupported' as any))
        .rejects.toThrow('Unsupported export format: unsupported');
    });
  });
});