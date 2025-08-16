/**
 * Core tests for Coverage Aggregator Theme
 */

describe('Coverage Aggregator Theme - Core Functionality', () => {
  describe('pipe gateway', () => {
    it('should export theme functionality through pipe', () => {
      const pipe = require('../../pipe/index');
      expect(pipe).toBeDefined();
    });
  });

  describe('coverage data aggregation', () => {
    it('should merge coverage reports from multiple sources', () => {
      const mergeCoverageReports = (reports: any[]) => {
        const merged = {
          statements: { covered: 0, total: 0, percentage: 0 },
          branches: { covered: 0, total: 0, percentage: 0 },
          functions: { covered: 0, total: 0, percentage: 0 },
          lines: { covered: 0, total: 0, percentage: 0 },
          files: new Map<string, any>()
        };

        reports.forEach(report => {
          // Aggregate totals
          merged.statements.covered += report.statements?.covered || 0;
          merged.statements.total += report.statements?.total || 0;
          merged.branches.covered += report.branches?.covered || 0;
          merged.branches.total += report.branches?.total || 0;
          merged.functions.covered += report.functions?.covered || 0;
          merged.functions.total += report.functions?.total || 0;
          merged.lines.covered += report.lines?.covered || 0;
          merged.lines.total += report.lines?.total || 0;

          // Merge file-level coverage
          if (report.files) {
            Object.entries(report.files).forEach(([filename, fileData]) => {
              merged.files.set(filename, fileData);
            });
          }
        });

        // Calculate percentages
        merged.statements.percentage = merged.statements.total > 0 ? 
          (merged.statements.covered / merged.statements.total) * 100 : 0;
        merged.branches.percentage = merged.branches.total > 0 ? 
          (merged.branches.covered / merged.branches.total) * 100 : 0;
        merged.functions.percentage = merged.functions.total > 0 ? 
          (merged.functions.covered / merged.functions.total) * 100 : 0;
        merged.lines.percentage = merged.lines.total > 0 ? 
          (merged.lines.covered / merged.lines.total) * 100 : 0;

        return merged;
      };

      const report1 = {
        statements: { covered: 80, total: 100 },
        branches: { covered: 15, total: 20 },
        functions: { covered: 8, total: 10 },
        lines: { covered: 75, total: 95 }
      };

      const report2 = {
        statements: { covered: 90, total: 120 },
        branches: { covered: 20, total: 25 },
        functions: { covered: 12, total: 15 },
        lines: { covered: 85, total: 110 }
      };

      const merged = mergeCoverageReports([report1, report2]);

      expect(merged.statements.covered).toBe(170);
      expect(merged.statements.total).toBe(220);
      expect(merged.statements.percentage).toBeCloseTo(77.27, 2);
      expect(merged.branches.covered).toBe(35);
      expect(merged.branches.total).toBe(45);
    });

    it('should handle different coverage formats', () => {
      const normalizeFormat = (report: any, format: 'lcov' | 'jest' | 'nyc') => {
        switch (format) {
          case 'jest':
            return {
              statements: {
                covered: report.numCoveredStatements,
                total: report.numStatements,
                percentage: report.statementsPercentage
              },
              branches: {
                covered: report.numCoveredBranches,
                total: report.numBranches,
                percentage: report.branchesPercentage
              },
              functions: {
                covered: report.numCoveredFunctions,
                total: report.numFunctions,
                percentage: report.functionsPercentage
              },
              lines: {
                covered: report.numCoveredLines,
                total: report.numLines,
                percentage: report.linesPercentage
              }
            };

          case 'nyc':
            return {
              statements: {
                covered: report.s.covered,
                total: report.s.total,
                percentage: report.s.pct
              },
              branches: {
                covered: report.b.covered,
                total: report.b.total,
                percentage: report.b.pct
              },
              functions: {
                covered: report.f.covered,
                total: report.f.total,
                percentage: report.f.pct
              },
              lines: {
                covered: report.l.covered,
                total: report.l.total,
                percentage: report.l.pct
              }
            };

          case 'lcov':
          default:
            return report; // Already in standard format
        }
      };

      const jestReport = {
        numCoveredStatements: 80,
        numStatements: 100,
        statementsPercentage: 80,
        numCoveredBranches: 15,
        numBranches: 20,
        branchesPercentage: 75
      };

      const normalized = normalizeFormat(jestReport, 'jest');
      
      expect(normalized.statements.covered).toBe(80);
      expect(normalized.statements.total).toBe(100);
      expect(normalized.statements.percentage).toBe(80);
    });
  });

  describe('coverage analysis', () => {
    it('should identify coverage gaps', () => {
      const identifyCoverageGaps = (filesCoverage: Record<string, any>, threshold = 80) => {
        const gaps = [];

        for (const [filename, coverage] of Object.entries(filesCoverage)) {
          const issues = [];

          if (coverage.statements.percentage < threshold) {
            issues.push({
              type: "statements",
              current: coverage.statements.percentage,
              target: threshold,
              gap: threshold - coverage.statements.percentage
            });
          }

          if (coverage.branches.percentage < threshold) {
            issues.push({
              type: "branches",
              current: coverage.branches.percentage,
              target: threshold,
              gap: threshold - coverage.branches.percentage
            });
          }

          if (coverage.functions.percentage < threshold) {
            issues.push({
              type: "functions",
              current: coverage.functions.percentage,
              target: threshold,
              gap: threshold - coverage.functions.percentage
            });
          }

          if (issues.length > 0) {
            gaps.push({
              filename,
              issues,
              priority: Math.max(...issues.map(i => i.gap))
            });
          }
        }

        return gaps.sort((a, b) => b.priority - a.priority);
      };

      const filesCoverage = {
        'src/utils.ts': {
          statements: { percentage: 60 },
          branches: { percentage: 50 },
          functions: { percentage: 70 }
        },
        'src/main.ts': {
          statements: { percentage: 90 },
          branches: { percentage: 85 },
          functions: { percentage: 95 }
        }
      };

      const gaps = identifyCoverageGaps(filesCoverage, 80);
      
      expect(gaps).toHaveLength(1);
      expect(gaps[0].filename).toBe('src/utils.ts');
      expect(gaps[0].issues).toHaveLength(3);
      expect(gaps[0].issues[0].type).toBe("statements");
      expect(gaps[0].issues[0].gap).toBe(20);
    });

    it('should track coverage trends over time', () => {
      const calculateTrend = (historicalData: Array<{ date: string; coverage: number }>) => {
        if (historicalData.length < 2) {
          return { trend: 'insufficient_data', change: 0 };
        }

        const recent = historicalData.slice(-2);
        const change = recent[1].coverage - recent[0].coverage;
        
        let trend: "improving" | "declining" | 'stable';
        if (Math.abs(change) < 1) {
          trend = 'stable';
        } else if (change > 0) {
          trend = "improving";
        } else {
          trend = "declining";
        }

        return {
          trend,
          change: Math.round(change * 100) / 100,
          current: recent[1].coverage,
          previous: recent[0].coverage
        };
      };

      const historicalData = [
        { date: '2023-01-01', coverage: 75.5 },
        { date: '2023-01-02', coverage: 78.2 },
        { date: '2023-01-03', coverage: 82.1 }
      ];

      const trend = calculateTrend(historicalData);
      
      expect(trend.trend).toBe("improving");
      expect(trend.change).toBe(3.9);
      expect(trend.current).toBe(82.1);
    });

    it('should generate coverage reports', () => {
      const generateReport = (coverageData: any, options = {}) => {
        const report = {
          timestamp: new Date().toISOString(),
          summary: {
            overall: {
              statements: coverageData.statements.percentage,
              branches: coverageData.branches.percentage,
              functions: coverageData.functions.percentage,
              lines: coverageData.lines.percentage
            },
            thresholds: {
              statements: 80,
              branches: 75,
              functions: 80,
              lines: 80
            },
            passed: true
          },
          details: {
            fileCount: coverageData.files ? coverageData.files.size : 0,
            totalStatements: coverageData.statements.total,
            coveredStatements: coverageData.statements.covered
          }
        };

        // Check if thresholds are met
        report.summary.passed = 
          report.summary.overall.statements >= report.summary.thresholds.statements &&
          report.summary.overall.branches >= report.summary.thresholds.branches &&
          report.summary.overall.functions >= report.summary.thresholds.functions &&
          report.summary.overall.lines >= report.summary.thresholds.lines;

        return report;
      };

      const coverageData = {
        statements: { covered: 85, total: 100, percentage: 85 },
        branches: { covered: 80, total: 100, percentage: 80 },
        functions: { covered: 90, total: 100, percentage: 90 },
        lines: { covered: 88, total: 100, percentage: 88 },
        files: new Map([['file1.ts', {}], ['file2.ts', {}]])
      };

      const report = generateReport(coverageData);
      
      expect(report.summary.overall.statements).toBe(85);
      expect(report.summary.passed).toBe(true);
      expect(report.details.fileCount).toBe(2);
      expect(report.details.totalStatements).toBe(100);
    });
  });

  describe('coverage metrics calculation', () => {
    it('should calculate weighted coverage scores', () => {
      const calculateWeightedScore = (coverage: any, weights = {}) => {
        const defaultWeights = {
          statements: 0.4,
          branches: 0.3,
          functions: 0.2,
          lines: 0.1
        };

        const finalWeights = { ...defaultWeights, ...weights };
        
        const score = 
          (coverage.statements.percentage * finalWeights.statements) +
          (coverage.branches.percentage * finalWeights.branches) +
          (coverage.functions.percentage * finalWeights.functions) +
          (coverage.lines.percentage * finalWeights.lines);

        return {
          score: Math.round(score * 100) / 100,
          weights: finalWeights,
          breakdown: {
            statements: coverage.statements.percentage * finalWeights.statements,
            branches: coverage.branches.percentage * finalWeights.branches,
            functions: coverage.functions.percentage * finalWeights.functions,
            lines: coverage.lines.percentage * finalWeights.lines
          }
        };
      };

      const coverage = {
        statements: { percentage: 80 },
        branches: { percentage: 70 },
        functions: { percentage: 90 },
        lines: { percentage: 85 }
      };

      const result = calculateWeightedScore(coverage);
      
      expect(result.score).toBe(78.5); // 80*0.4 + 70*0.3 + 90*0.2 + 85*0.1
      expect(result.breakdown.statements).toBe(32);
      expect(result.breakdown.branches).toBe(21);
    });

    it('should rank files by coverage quality', () => {
      const rankFilesByCoverage = (files: Record<string, any>) => {
        const ranked = Object.entries(files).map(([filename, coverage]) => {
          const averageScore = (
            coverage.statements.percentage +
            coverage.branches.percentage +
            coverage.functions.percentage +
            coverage.lines.percentage
          ) / 4;

          return {
            filename,
            score: Math.round(averageScore * 100) / 100,
            coverage
          };
        });

        return ranked.sort((a, b) => a.score - b.score); // Lowest first (needs attention)
      };

      const files = {
        'good-file.ts': {
          statements: { percentage: 95 },
          branches: { percentage: 90 },
          functions: { percentage: 100 },
          lines: { percentage: 92 }
        },
        'needs-work.ts': {
          statements: { percentage: 60 },
          branches: { percentage: 45 },
          functions: { percentage: 70 },
          lines: { percentage: 55 }
        }
      };

      const ranked = rankFilesByCoverage(files);
      
      expect(ranked[0].filename).toBe('needs-work.ts');
      expect(ranked[0].score).toBe(57.5);
      expect(ranked[1].filename).toBe('good-file.ts');
      expect(ranked[1].score).toBe(94.25);
    });
  });

  describe('coverage visualization', () => {
    it('should generate coverage heat map data', () => {
      const generateHeatMap = (files: Record<string, any>) => {
        return Object.entries(files).map(([filename, coverage]) => {
          const intensity = (
            coverage.statements.percentage +
            coverage.branches.percentage +
            coverage.functions.percentage +
            coverage.lines.percentage
          ) / 4;

          let color: 'red' | 'yellow' | 'green';
          if (intensity >= 80) color = 'green';
          else if (intensity >= 60) color = 'yellow';
          else color = 'red';

          return {
            filename,
            intensity: Math.round(intensity),
            color,
            details: coverage
          };
        });
      };

      const files = {
        'high-coverage.ts': {
          statements: { percentage: 90 },
          branches: { percentage: 85 },
          functions: { percentage: 95 },
          lines: { percentage: 88 }
        },
        'low-coverage.ts': {
          statements: { percentage: 45 },
          branches: { percentage: 40 },
          functions: { percentage: 50 },
          lines: { percentage: 35 }
        }
      };

      const heatMap = generateHeatMap(files);
      
      expect(heatMap[0].filename).toBe('high-coverage.ts');
      expect(heatMap[0].color).toBe('green');
      expect(heatMap[0].intensity).toBe(90);
      
      expect(heatMap[1].filename).toBe('low-coverage.ts');
      expect(heatMap[1].color).toBe('red');
      expect(heatMap[1].intensity).toBe(43);
    });

    it('should create coverage dashboard data', () => {
      const createDashboard = (aggregatedData: any) => {
        return {
          overview: {
            totalFiles: aggregatedData.files ? aggregatedData.files.size : 0,
            overallScore: Math.round(
              (aggregatedData.statements.percentage +
               aggregatedData.branches.percentage +
               aggregatedData.functions.percentage +
               aggregatedData.lines.percentage) / 4
            ),
            status: aggregatedData.statements.percentage >= 80 ? 'passing' : 'failing'
          },
          metrics: {
            statements: {
              covered: aggregatedData.statements.covered,
              total: aggregatedData.statements.total,
              percentage: aggregatedData.statements.percentage
            },
            branches: {
              covered: aggregatedData.branches.covered,
              total: aggregatedData.branches.total,
              percentage: aggregatedData.branches.percentage
            }
          },
          recommendations: []
        };
      };

      const aggregatedData = {
        statements: { covered: 80, total: 100, percentage: 80 },
        branches: { covered: 75, total: 100, percentage: 75 },
        functions: { covered: 90, total: 100, percentage: 90 },
        lines: { covered: 85, total: 100, percentage: 85 },
        files: new Map([['file1.ts', {}], ['file2.ts', {}], ['file3.ts', {}]])
      };

      const dashboard = createDashboard(aggregatedData);
      
      expect(dashboard.overview.totalFiles).toBe(3);
      expect(dashboard.overview.overallScore).toBe(83); // (80+75+90+85)/4
      expect(dashboard.overview.status).toBe('passing');
      expect(dashboard.metrics.statements.percentage).toBe(80);
    });
  });

  describe('integration with CI/CD', () => {
    it('should validate coverage thresholds for CI', () => {
      const validateForCI = (coverage: any, thresholds: any) => {
        const results = {
          passed: true,
          failures: [] as string[],
          coverage,
          thresholds
        };

        if (coverage.statements.percentage < thresholds.statements) {
          results.passed = false;
          results.failures.push(`Statements coverage ${coverage.statements.percentage}% below threshold ${thresholds.statements}%`);
        }

        if (coverage.branches.percentage < thresholds.branches) {
          results.passed = false;
          results.failures.push(`Branches coverage ${coverage.branches.percentage}% below threshold ${thresholds.branches}%`);
        }

        if (coverage.functions.percentage < thresholds.functions) {
          results.passed = false;
          results.failures.push(`Functions coverage ${coverage.functions.percentage}% below threshold ${thresholds.functions}%`);
        }

        return results;
      };

      const coverage = {
        statements: { percentage: 75 },
        branches: { percentage: 65 },
        functions: { percentage: 85 }
      };

      const thresholds = {
        statements: 80,
        branches: 70,
        functions: 80
      };

      const result = validateForCI(coverage, thresholds);
      
      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(2);
      expect(result.failures[0]).toContain('Statements coverage 75%');
      expect(result.failures[1]).toContain('Branches coverage 65%');
    });
  });
});