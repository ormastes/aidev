import { IntegratedCoverageService } from './integrated-coverage-service';
import { CoverageAggregator } from './coverage-aggregator';
import { CoverageReportGenerator } from './coverage-report-generator';
import { SetupAggregatorAdapter } from './setup-aggregator-adapter';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

jest.mock('./coverage-aggregator');
jest.mock('./coverage-report-generator');
jest.mock('./setup-aggregator-adapter');
jest.mock('fs');

describe("IntegratedCoverageService", () => {
  let service: IntegratedCoverageService;
  let mockAggregator: jest.Mocked<CoverageAggregator>;
  let mockReportGenerator: jest.Mocked<CoverageReportGenerator>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console.log to reduce test output noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    service = new IntegratedCoverageService('/test/layer', '/test/output');
    
    mockAggregator = (CoverageAggregator as jest.MockedClass<typeof CoverageAggregator>).mock.instances[0] as jest.Mocked<CoverageAggregator>;
    mockReportGenerator = (CoverageReportGenerator as jest.MockedClass<typeof CoverageReportGenerator>).mock.instances[0] as jest.Mocked<CoverageReportGenerator>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("generateIntegratedReport", () => {
    const mockLayerCoverage = {
      name: 'AI Development Platform',
      type: 'app' as const,
      path: '/test/layer',
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
      children: [
        {
          name: 'theme1',
          type: 'theme' as const,
          path: '/test/layer/themes/theme1',
          coverage: {
            lines: { total: 500, covered: 400, pct: 80 },
            statements: { total: 500, covered: 400, pct: 80 },
            functions: { total: 50, covered: 40, pct: 80 },
            branches: { total: 100, covered: 80, pct: 80 }
          },
          systemTestCoverage: {
            classCount: 25,
            coveredClassCount: 20,
            classCoveragePct: 80
          },
          duplication: {
            duplicatedLines: 25,
            totalLines: 500,
            duplicationPct: 5
          },
          timestamp: new Date()
        }
      ],
      timestamp: new Date()
    };

    it('should generate report with layer coverage only when no setup coverage exists', async () => {
      mockAggregator.aggregateAppCoverage.mockResolvedValue(mockLayerCoverage);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await service.generateIntegratedReport();

      expect(mockAggregator.aggregateAppCoverage).toHaveBeenCalled();
      expect(mockReportGenerator.generateReport).toHaveBeenCalledWith(mockLayerCoverage);
    });

    it('should integrate setup coverage when available', async () => {
      const mockSetupData = {
        themes: [
          {
            name: 'theme1',
            path: '/test/layer/themes/theme1',
            coverage: {
              systemTest: {
                class: { percentage: 85, covered: 21, total: 25 },
                branch: { percentage: 82, covered: 82, total: 100 },
                line: { percentage: 85, covered: 425, total: 500 },
                method: { percentage: 84, covered: 42, total: 50 }
              },
              overall: {
                class: { percentage: 90, covered: 22, total: 25 },
                branch: { percentage: 85, covered: 85, total: 100 },
                line: { percentage: 88, covered: 440, total: 500 },
                method: { percentage: 86, covered: 43, total: 50 }
              }
            },
            duplication: {
              percentage: 4,
              duplicatedLines: 20,
              totalLines: 500
            }
          }
        ]
      };

      const mockSetupCoverage = {
        name: 'AI Development Platform (Setup)',
        type: 'app' as const,
        path: process.cwd(),
        coverage: {
          lines: { total: 500, covered: 440, pct: 88 },
          statements: { total: 500, covered: 440, pct: 88 },
          functions: { total: 50, covered: 43, pct: 86 },
          branches: { total: 100, covered: 85, pct: 85 }
        },
        systemTestCoverage: {
          classCount: 25,
          coveredClassCount: 21,
          classCoveragePct: 84
        },
        duplication: {
          duplicatedLines: 20,
          totalLines: 500,
          duplicationPct: 4
        },
        children: [],
        timestamp: new Date()
      };

      mockAggregator.aggregateAppCoverage.mockResolvedValue(mockLayerCoverage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockSetupData));
      (SetupAggregatorAdapter.createAppCoverageFromSetup as jest.Mock).mockReturnValue(mockSetupCoverage);

      await service.generateIntegratedReport();

      expect(mockAggregator.aggregateAppCoverage).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'scripts/setup/aggregated-metrics.json'),
        'utf8'
      );
      expect(SetupAggregatorAdapter.createAppCoverageFromSetup).toHaveBeenCalledWith(mockSetupData.themes);
      expect(mockReportGenerator.generateReport).toHaveBeenCalled();

      // Verify the report was called with integrated data
      const reportArg = mockReportGenerator.generateReport.mock.calls[0][0];
      expect(reportArg.name).toBe('AI Development Platform (Integrated)');
    });

    it('should handle invalid setup coverage data', async () => {
      mockAggregator.aggregateAppCoverage.mockResolvedValue(mockLayerCoverage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      await service.generateIntegratedReport();

      expect(mockReportGenerator.generateReport).toHaveBeenCalledWith(mockLayerCoverage);
    });

    it('should handle file read errors gracefully', async () => {
      mockAggregator.aggregateAppCoverage.mockResolvedValue(mockLayerCoverage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });

      await service.generateIntegratedReport();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to load setup coverage:',
        expect.any(Error)
      );
      expect(mockReportGenerator.generateReport).toHaveBeenCalledWith(mockLayerCoverage);
    });
  });

  describe("mergeLayerAndSetupCoverage", () => {
    it('should merge themes from both sources', () => {
      const layerCoverage = {
        name: 'AI Development Platform',
        type: 'app' as const,
        path: '/test',
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
        children: [
          {
            name: 'theme1',
            type: 'theme' as const,
            path: '/test/theme1',
            coverage: {
              lines: { total: 500, covered: 400, pct: 80 },
              statements: { total: 500, covered: 400, pct: 80 },
              functions: { total: 50, covered: 40, pct: 80 },
              branches: { total: 100, covered: 80, pct: 80 }
            },
            systemTestCoverage: {
              classCount: 25,
              coveredClassCount: 20,
              classCoveragePct: 80
            },
            duplication: {
              duplicatedLines: 25,
              totalLines: 500,
              duplicationPct: 5
            },
            timestamp: new Date()
          },
          {
            name: 'epic1',
            type: 'epic' as const,
            path: '/test/epic1',
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
          }
        ],
        timestamp: new Date()
      };

      const setupCoverage = {
        name: 'AI Development Platform (Setup)',
        type: 'app' as const,
        path: '/test',
        coverage: {
          lines: { total: 600, covered: 510, pct: 85 },
          statements: { total: 600, covered: 510, pct: 85 },
          functions: { total: 60, covered: 51, pct: 85 },
          branches: { total: 120, covered: 102, pct: 85 }
        },
        systemTestCoverage: {
          classCount: 30,
          coveredClassCount: 25,
          classCoveragePct: 83.33
        },
        duplication: {
          duplicatedLines: 24,
          totalLines: 600,
          duplicationPct: 4
        },
        children: [
          {
            name: 'theme1',
            type: 'theme' as const,
            path: '/test/theme1',
            coverage: {
              lines: { total: 500, covered: 425, pct: 85 },
              statements: { total: 500, covered: 425, pct: 85 },
              functions: { total: 50, covered: 42, pct: 84 },
              branches: { total: 100, covered: 85, pct: 85 }
            },
            systemTestCoverage: {
              classCount: 25,
              coveredClassCount: 21,
              classCoveragePct: 84
            },
            duplication: {
              duplicatedLines: 20,
              totalLines: 500,
              duplicationPct: 4
            },
            timestamp: new Date()
          },
          {
            name: 'theme2',
            type: 'theme' as const,
            path: '/test/theme2',
            coverage: {
              lines: { total: 100, covered: 85, pct: 85 },
              statements: { total: 100, covered: 85, pct: 85 },
              functions: { total: 10, covered: 9, pct: 90 },
              branches: { total: 20, covered: 17, pct: 85 }
            },
            systemTestCoverage: {
              classCount: 5,
              coveredClassCount: 4,
              classCoveragePct: 80
            },
            duplication: {
              duplicatedLines: 4,
              totalLines: 100,
              duplicationPct: 4
            },
            timestamp: new Date()
          }
        ],
        timestamp: new Date()
      };

      const result = (service as any).mergeLayerAndSetupCoverage(layerCoverage, setupCoverage);

      expect(result.name).toBe('AI Development Platform (Integrated)');
      expect(result.type).toBe('app');
      
      // Should have 1 epic and 2 themes
      expect(result.children).toHaveLength(3);
      
      const themes = result.children.filter((c: any) => c.type === 'theme');
      expect(themes).toHaveLength(2);
      
      // theme1 should use setup coverage (more accurate)
      const theme1 = themes.find((t: any) => t.name === 'theme1');
      expect(theme1.coverage.lines.pct).toBe(85);
      
      // theme2 should be added from setup
      const theme2 = themes.find((t: any) => t.name === 'theme2');
      expect(theme2).toBeDefined();
      expect(theme2.coverage.lines.pct).toBe(85);
      
      // epic1 should remain from layer coverage
      const epic1 = result.children.find((c: any) => c.type === 'epic');
      expect(epic1).toBeDefined();
      expect(epic1.name).toBe('epic1');
    });
  });

  describe("recalculateMetrics", () => {
    it('should correctly aggregate metrics from children', () => {
      const children = [
        {
          name: 'child1',
          type: 'theme' as const,
          path: '/child1',
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
        },
        {
          name: 'child2',
          type: 'theme' as const,
          path: '/child2',
          coverage: {
            lines: { total: 200, covered: 180, pct: 90 },
            statements: { total: 200, covered: 180, pct: 90 },
            functions: { total: 20, covered: 18, pct: 90 },
            branches: { total: 40, covered: 36, pct: 90 }
          },
          systemTestCoverage: {
            classCount: 10,
            coveredClassCount: 9,
            classCoveragePct: 90
          },
          duplication: {
            duplicatedLines: 6,
            totalLines: 200,
            duplicationPct: 3
          },
          timestamp: new Date()
        }
      ];

      const result = (service as any).recalculateMetrics(children);

      expect(result.coverage.lines).toEqual({
        total: 300,
        covered: 260,
        pct: expect.closeTo(86.67, 1)
      });

      expect(result.systemTestCoverage).toEqual({
        classCount: 15,
        coveredClassCount: 13,
        classCoveragePct: expect.closeTo(86.67, 1)
      });

      expect(result.duplication).toEqual({
        duplicatedLines: 11,
        totalLines: 300,
        duplicationPct: expect.closeTo(3.67, 1)
      });
    });

    it('should handle empty children array', () => {
      const result = (service as any).recalculateMetrics([]);

      expect(result.coverage.lines).toEqual({
        total: 0,
        covered: 0,
        pct: 0
      });

      expect(result.systemTestCoverage).toEqual({
        classCount: 0,
        coveredClassCount: 0,
        classCoveragePct: 0
      });
    });
  });
});