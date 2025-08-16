import { SetupAggregatorAdapter } from './setup-aggregator-adapter';

describe("SetupAggregatorAdapter", () => {
  describe("convertThemeMetrics", () => {
    it('should convert setup theme metrics to aggregated coverage format', () => {
      const setupMetrics = {
        name: 'test-theme',
        path: '/path/to/theme',
        coverage: {
          systemTest: {
            class: { percentage: 85, covered: 17, total: 20 },
            branch: { percentage: 80, covered: 40, total: 50 },
            line: { percentage: 90, covered: 180, total: 200 },
            method: { percentage: 88, covered: 44, total: 50 }
          },
          overall: {
            class: { percentage: 90, covered: 18, total: 20 },
            branch: { percentage: 85, covered: 42, total: 50 },
            line: { percentage: 92, covered: 184, total: 200 },
            method: { percentage: 90, covered: 45, total: 50 }
          }
        },
        duplication: {
          percentage: 3.5,
          duplicatedLines: 7,
          totalLines: 200
        }
      };

      const result = SetupAggregatorAdapter.convertThemeMetrics(setupMetrics);

      expect(result).toMatchObject({
        name: 'test-theme',
        type: 'theme',
        path: '/path/to/theme',
        coverage: {
          lines: { total: 200, covered: 184, pct: 92 },
          statements: { total: 200, covered: 184, pct: 92 },
          functions: { total: 50, covered: 45, pct: 90 },
          branches: { total: 50, covered: 42, pct: 85 }
        },
        systemTestCoverage: {
          classCount: 20,
          coveredClassCount: 17,
          classCoveragePct: 85
        },
        duplication: {
          duplicatedLines: 7,
          totalLines: 200,
          duplicationPct: 3.5
        }
      });
    });

    it('should handle zero coverage metrics', () => {
      const setupMetrics = {
        name: 'empty-theme',
        path: '/path/to/empty',
        coverage: {
          systemTest: {
            class: { percentage: 0, covered: 0, total: 0 },
            branch: { percentage: 0, covered: 0, total: 0 },
            line: { percentage: 0, covered: 0, total: 0 },
            method: { percentage: 0, covered: 0, total: 0 }
          },
          overall: {
            class: { percentage: 0, covered: 0, total: 0 },
            branch: { percentage: 0, covered: 0, total: 0 },
            line: { percentage: 0, covered: 0, total: 0 },
            method: { percentage: 0, covered: 0, total: 0 }
          }
        },
        duplication: {
          percentage: 0,
          duplicatedLines: 0,
          totalLines: 0
        }
      };

      const result = SetupAggregatorAdapter.convertThemeMetrics(setupMetrics);

      expect(result.coverage.lines).toEqual({ total: 0, covered: 0, pct: 0 });
      expect(result.systemTestCoverage).toEqual({
        classCount: 0,
        coveredClassCount: 0,
        classCoveragePct: 0
      });
    });
  });

  describe("convertMultipleThemes", () => {
    it('should convert multiple theme metrics', () => {
      const setupThemes = [
        {
          name: 'theme1',
          path: '/path1',
          coverage: {
            systemTest: {
              class: { percentage: 80, covered: 8, total: 10 },
              branch: { percentage: 75, covered: 15, total: 20 },
              line: { percentage: 85, covered: 85, total: 100 },
              method: { percentage: 82, covered: 41, total: 50 }
            },
            overall: {
              class: { percentage: 85, covered: 8, total: 10 },
              branch: { percentage: 80, covered: 16, total: 20 },
              line: { percentage: 88, covered: 88, total: 100 },
              method: { percentage: 84, covered: 42, total: 50 }
            }
          },
          duplication: {
            percentage: 5,
            duplicatedLines: 5,
            totalLines: 100
          }
        },
        {
          name: 'theme2',
          path: '/path2',
          coverage: {
            systemTest: {
              class: { percentage: 90, covered: 9, total: 10 },
              branch: { percentage: 85, covered: 17, total: 20 },
              line: { percentage: 92, covered: 92, total: 100 },
              method: { percentage: 88, covered: 44, total: 50 }
            },
            overall: {
              class: { percentage: 95, covered: 9, total: 10 },
              branch: { percentage: 90, covered: 18, total: 20 },
              line: { percentage: 95, covered: 95, total: 100 },
              method: { percentage: 90, covered: 45, total: 50 }
            }
          },
          duplication: {
            percentage: 3,
            duplicatedLines: 3,
            totalLines: 100
          }
        }
      ];

      const results = SetupAggregatorAdapter.convertMultipleThemes(setupThemes);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('theme1');
      expect(results[1].name).toBe('theme2');
      expect(results[0].type).toBe('theme');
      expect(results[1].type).toBe('theme');
    });
  });

  describe("createAppCoverageFromSetup", () => {
    it('should create aggregated app coverage from setup themes', () => {
      const setupThemes = [
        {
          name: 'theme1',
          path: '/path1',
          coverage: {
            systemTest: {
              class: { percentage: 80, covered: 16, total: 20 },
              branch: { percentage: 75, covered: 30, total: 40 },
              line: { percentage: 85, covered: 170, total: 200 },
              method: { percentage: 82, covered: 82, total: 100 }
            },
            overall: {
              class: { percentage: 85, covered: 17, total: 20 },
              branch: { percentage: 80, covered: 32, total: 40 },
              line: { percentage: 88, covered: 176, total: 200 },
              method: { percentage: 84, covered: 84, total: 100 }
            }
          },
          duplication: {
            percentage: 5,
            duplicatedLines: 10,
            totalLines: 200
          }
        },
        {
          name: 'theme2',
          path: '/path2',
          coverage: {
            systemTest: {
              class: { percentage: 90, covered: 27, total: 30 },
              branch: { percentage: 85, covered: 51, total: 60 },
              line: { percentage: 92, covered: 276, total: 300 },
              method: { percentage: 88, covered: 132, total: 150 }
            },
            overall: {
              class: { percentage: 95, covered: 28, total: 30 },
              branch: { percentage: 90, covered: 54, total: 60 },
              line: { percentage: 95, covered: 285, total: 300 },
              method: { percentage: 90, covered: 135, total: 150 }
            }
          },
          duplication: {
            percentage: 3,
            duplicatedLines: 9,
            totalLines: 300
          }
        }
      ];

      const result = SetupAggregatorAdapter.createAppCoverageFromSetup(setupThemes);

      expect(result).toMatchObject({
        name: 'AI Development Platform (Setup)',
        type: 'app',
        coverage: {
          lines: {
            total: 500,
            covered: 461,
            pct: expect.closeTo(92.2, 1)
          },
          branches: {
            total: 100,
            covered: 86,
            pct: 86
          }
        },
        systemTestCoverage: {
          classCount: 50,
          coveredClassCount: 43,
          classCoveragePct: 86
        },
        duplication: {
          duplicatedLines: 19,
          totalLines: 500,
          duplicationPct: expect.closeTo(3.8, 1)
        }
      });

      expect(result.children).toHaveLength(2);
      expect(result.children![0].name).toBe('theme1');
      expect(result.children![1].name).toBe('theme2');
    });

    it('should handle empty theme list', () => {
      const result = SetupAggregatorAdapter.createAppCoverageFromSetup([]);

      expect(result).toMatchObject({
        name: 'AI Development Platform (Setup)',
        type: 'app',
        coverage: {
          lines: { total: 0, covered: 0, pct: 0 },
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
        children: []
      });
    });

    it('should calculate percentages correctly with partial coverage', () => {
      const setupThemes = [
        {
          name: 'partial-theme',
          path: '/partial',
          coverage: {
            systemTest: {
              class: { percentage: 50, covered: 5, total: 10 },
              branch: { percentage: 25, covered: 5, total: 20 },
              line: { percentage: 40, covered: 40, total: 100 },
              method: { percentage: 30, covered: 15, total: 50 }
            },
            overall: {
              class: { percentage: 60, covered: 6, total: 10 },
              branch: { percentage: 35, covered: 7, total: 20 },
              line: { percentage: 50, covered: 50, total: 100 },
              method: { percentage: 40, covered: 20, total: 50 }
            }
          },
          duplication: {
            percentage: 15,
            duplicatedLines: 15,
            totalLines: 100
          }
        }
      ];

      const result = SetupAggregatorAdapter.createAppCoverageFromSetup(setupThemes);

      expect(result.coverage.lines.pct).toBe(50);
      expect(result.coverage.branches.pct).toBe(35);
      expect(result.systemTestCoverage.classCoveragePct).toBe(50);
      expect(result.duplication.duplicationPct).toBe(15);
    });
  });
});