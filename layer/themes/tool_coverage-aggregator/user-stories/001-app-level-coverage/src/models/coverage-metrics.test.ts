import {
  CoverageMetrics,
  SystemTestCoverage,
  DuplicationMetrics,
  AggregatedCoverage,
  CoverageReport
} from './coverage-metrics';

describe('Coverage Metrics Models', () => {
  describe("CoverageMetrics", () => {
    it('should create valid coverage metrics', () => {
      const metrics: CoverageMetrics = {
        lines: { total: 100, covered: 80, pct: 80 },
        statements: { total: 100, covered: 80, pct: 80 },
        functions: { total: 10, covered: 8, pct: 80 },
        branches: { total: 20, covered: 16, pct: 80 }
      };

      expect(metrics.lines.pct).toBe(80);
      expect(metrics.branches.total).toBe(20);
    });
  });

  describe("SystemTestCoverage", () => {
    it('should create valid system test coverage', () => {
      const coverage: SystemTestCoverage = {
        classCount: 50,
        coveredClassCount: 40,
        classCoveragePct: 80
      };

      expect(coverage.classCoveragePct).toBe(80);
      expect(coverage.coveredClassCount).toBeLessThanOrEqual(coverage.classCount);
    });
  });

  describe("DuplicationMetrics", () => {
    it('should create valid duplication metrics', () => {
      const duplication: DuplicationMetrics = {
        duplicatedLines: 50,
        totalLines: 1000,
        duplicationPct: 5
      };

      expect(duplication.duplicationPct).toBe(5);
      expect(duplication.duplicatedLines).toBeLessThanOrEqual(duplication.totalLines);
    });
  });

  describe("AggregatedCoverage", () => {
    it('should create valid aggregated coverage for user story', () => {
      const coverage: AggregatedCoverage = {
        name: '001-feature',
        type: 'user-story',
        path: '/path/to/story',
        coverage: {
          lines: { total: 100, covered: 80, pct: 80 },
          statements: { total: 100, covered: 80, pct: 80 },
          functions: { total: 10, covered: 8, pct: 80 },
          branches: { total: 20, covered: 16, pct: 80 }
        },
        systemTestCoverage: {
          classCount: 5,
          coveredClassCount: 4,
          classCoveragePct: 80
        },
        duplication: {
          duplicatedLines: 5,
          totalLines: 100,
          duplicationPct: 5
        },
        timestamp: new Date()
      };

      expect(coverage.type).toBe('user-story');
      expect(coverage.children).toBeUndefined();
    });

    it('should create valid aggregated coverage for theme with children', () => {
      const userStory: AggregatedCoverage = {
        name: '001-feature',
        type: 'user-story',
        path: '/path/to/story',
        coverage: {
          lines: { total: 100, covered: 80, pct: 80 },
          statements: { total: 100, covered: 80, pct: 80 },
          functions: { total: 10, covered: 8, pct: 80 },
          branches: { total: 20, covered: 16, pct: 80 }
        },
        systemTestCoverage: {
          classCount: 5,
          coveredClassCount: 4,
          classCoveragePct: 80
        },
        duplication: {
          duplicatedLines: 5,
          totalLines: 100,
          duplicationPct: 5
        },
        timestamp: new Date()
      };

      const theme: AggregatedCoverage = {
        name: 'feature-theme',
        type: 'theme',
        path: '/path/to/theme',
        coverage: {
          lines: { total: 100, covered: 80, pct: 80 },
          statements: { total: 100, covered: 80, pct: 80 },
          functions: { total: 10, covered: 8, pct: 80 },
          branches: { total: 20, covered: 16, pct: 80 }
        },
        systemTestCoverage: {
          classCount: 5,
          coveredClassCount: 4,
          classCoveragePct: 80
        },
        duplication: {
          duplicatedLines: 5,
          totalLines: 100,
          duplicationPct: 5
        },
        children: [userStory],
        timestamp: new Date()
      };

      expect(theme.type).toBe('theme');
      expect(theme.children).toHaveLength(1);
      expect(theme.children![0]).toBe(userStory);
    });

    it('should support all coverage types', () => {
      const types: Array<AggregatedCoverage['type']> = ['user-story', 'theme', 'epic', 'app'];
      
      types.forEach(type => {
        const coverage: AggregatedCoverage = {
          name: `test-${type}`,
          type,
          path: `/path/to/${type}`,
          coverage: {
            lines: { total: 100, covered: 80, pct: 80 },
            statements: { total: 100, covered: 80, pct: 80 },
            functions: { total: 10, covered: 8, pct: 80 },
            branches: { total: 20, covered: 16, pct: 80 }
          },
          systemTestCoverage: {
            classCount: 5,
            coveredClassCount: 4,
            classCoveragePct: 80
          },
          duplication: {
            duplicatedLines: 5,
            totalLines: 100,
            duplicationPct: 5
          },
          timestamp: new Date()
        };

        expect(coverage.type).toBe(type);
      });
    });
  });

  describe("CoverageReport", () => {
    it('should create valid coverage report', () => {
      const app: AggregatedCoverage = {
        name: 'Test App',
        type: 'app',
        path: '/app',
        coverage: {
          lines: { total: 1000, covered: 800, pct: 80 },
          statements: { total: 1000, covered: 800, pct: 80 },
          functions: { total: 100, covered: 80, pct: 80 },
          branches: { total: 200, covered: 160, pct: 80 }
        },
        systemTestCoverage: {
          classCount: 50,
          coveredClassCount: 40,
          classCoveragePct: 80
        },
        duplication: {
          duplicatedLines: 50,
          totalLines: 1000,
          duplicationPct: 5
        },
        timestamp: new Date()
      };

      const epic: AggregatedCoverage = {
        name: 'epic1',
        type: 'epic',
        path: '/epic1',
        coverage: {
          lines: { total: 200, covered: 160, pct: 80 },
          statements: { total: 200, covered: 160, pct: 80 },
          functions: { total: 20, covered: 16, pct: 80 },
          branches: { total: 40, covered: 32, pct: 80 }
        },
        systemTestCoverage: {
          classCount: 10,
          coveredClassCount: 8,
          classCoveragePct: 80
        },
        duplication: {
          duplicatedLines: 10,
          totalLines: 200,
          duplicationPct: 5
        },
        timestamp: new Date()
      };

      const theme: AggregatedCoverage = {
        name: 'theme1',
        type: 'theme',
        path: '/theme1',
        coverage: {
          lines: { total: 300, covered: 240, pct: 80 },
          statements: { total: 300, covered: 240, pct: 80 },
          functions: { total: 30, covered: 24, pct: 80 },
          branches: { total: 60, covered: 48, pct: 80 }
        },
        systemTestCoverage: {
          classCount: 15,
          coveredClassCount: 12,
          classCoveragePct: 80
        },
        duplication: {
          duplicatedLines: 15,
          totalLines: 300,
          duplicationPct: 5
        },
        timestamp: new Date()
      };

      const userStory: AggregatedCoverage = {
        name: 'story1',
        type: 'user-story',
        path: '/story1',
        coverage: {
          lines: { total: 100, covered: 80, pct: 80 },
          statements: { total: 100, covered: 80, pct: 80 },
          functions: { total: 10, covered: 8, pct: 80 },
          branches: { total: 20, covered: 16, pct: 80 }
        },
        systemTestCoverage: {
          classCount: 5,
          coveredClassCount: 4,
          classCoveragePct: 80
        },
        duplication: {
          duplicatedLines: 5,
          totalLines: 100,
          duplicationPct: 5
        },
        timestamp: new Date()
      };

      const report: CoverageReport = {
        app,
        epics: [epic],
        themes: [theme],
        userStories: [userStory],
        generatedAt: new Date(),
        thresholds: {
          systemTestClassCoverage: 80,
          branchCoverage: 80,
          duplication: 5
        }
      };

      expect(report.app.type).toBe('app');
      expect(report.epics).toHaveLength(1);
      expect(report.themes).toHaveLength(1);
      expect(report.userStories).toHaveLength(1);
      expect(report.thresholds.systemTestClassCoverage).toBe(80);
    });

    it('should support empty arrays', () => {
      const app: AggregatedCoverage = {
        name: 'Empty App',
        type: 'app',
        path: '/app',
        coverage: {
          lines: { total: 0, covered: 0, pct: 0 },
          statements: { total: 0, covered: 0, pct: 0 },
          functions: { total: 0, covered: 0, pct: 0 },
          branches: { total: 0, covered: 0, pct: 0 }
        },
        systemTestCoverage: {
          classCount: 0,
          coveredClassCount: 0,
          classCoveragePct: 0
        },
        duplication: {
          duplicatedLines: 0,
          totalLines: 0,
          duplicationPct: 0
        },
        timestamp: new Date()
      };

      const report: CoverageReport = {
        app,
        epics: [],
        themes: [],
        userStories: [],
        generatedAt: new Date(),
        thresholds: {
          systemTestClassCoverage: 80,
          branchCoverage: 80,
          duplication: 5
        }
      };

      expect(report.epics).toHaveLength(0);
      expect(report.themes).toHaveLength(0);
      expect(report.userStories).toHaveLength(0);
    });
  });
});