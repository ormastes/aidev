import { IntegratedCoverageService } from './integrated-coverage-service';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

// Mock only fs module, not the other dependencies
jest.mock('fs');

describe('IntegratedCoverageService - Unmocked Dependencies', () => {
  let service: IntegratedCoverageService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it('should initialize with default paths', () => {
      service = new IntegratedCoverageService();
      
      // The constructor should have created the dependencies
      expect(service).toBeDefined();
      expect((service as any).coverageAggregator).toBeDefined();
      expect((service as any).reportGenerator).toBeDefined();
    });

    it('should initialize with custom paths', () => {
      service = new IntegratedCoverageService('/custom/layer', '/custom/output');
      
      expect(service).toBeDefined();
      expect((service as any).coverageAggregator).toBeDefined();
      expect((service as any).reportGenerator).toBeDefined();
    });
  });

  describe("loadSetupCoverage", () => {
    beforeEach(() => {
      service = new IntegratedCoverageService();
    });

    it('should return null when metrics file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const result = await (service as any).loadSetupCoverage();
      
      expect(result).toBeNull();
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'scripts/setup/aggregated-metrics.json')
      );
    });

    it('should return null when setup data has no themes', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ noThemes: true }));
      
      const result = await (service as any).loadSetupCoverage();
      
      expect(result).toBeNull();
    });

    it('should return null when setup data themes is not an array', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ themes: "not-an-array" }));
      
      const result = await (service as any).loadSetupCoverage();
      
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json {');
      
      const result = await (service as any).loadSetupCoverage();
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load setup coverage:',
        expect.any(Error)
      );
    });

    it('should handle file read errors', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = await (service as any).loadSetupCoverage();
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load setup coverage:',
        expect.any(Error)
      );
    });
  });

  describe("mergeThemeCoverage", () => {
    beforeEach(() => {
      service = new IntegratedCoverageService();
    });

    it('should merge theme coverage preferring setup data', () => {
      const layerTheme = {
        name: 'test-theme',
        type: 'theme' as const,
        path: '/test/theme',
        coverage: {
          lines: { total: 100, covered: 70, pct: 70 },
          statements: { total: 100, covered: 70, pct: 70 },
          functions: { total: 10, covered: 7, pct: 70 },
          branches: { total: 20, covered: 14, pct: 70 }
        },
        systemTestCoverage: {
          classCount: 5,
          coveredClassCount: 3,
          classCoveragePct: 60
        },
        duplication: {
          duplicatedLines: 10,
          totalLines: 100,
          duplicationPct: 10
        },
        children: [
          {
            name: 'story1',
            type: "userStory" as const,
            path: '/test/theme/story1',
            coverage: {
              lines: { total: 50, covered: 35, pct: 70 },
              statements: { total: 50, covered: 35, pct: 70 },
              functions: { total: 5, covered: 3, pct: 60 },
              branches: { total: 10, covered: 7, pct: 70 }
            },
            systemTestCoverage: {
              classCount: 2,
              coveredClassCount: 1,
              classCoveragePct: 50
            },
            duplication: {
              duplicatedLines: 5,
              totalLines: 50,
              duplicationPct: 10
            },
            timestamp: new Date()
          }
        ],
        timestamp: new Date()
      };

      const setupTheme = {
        name: 'test-theme',
        type: 'theme' as const,
        path: '/test/theme',
        coverage: {
          lines: { total: 100, covered: 85, pct: 85 },
          statements: { total: 100, covered: 85, pct: 85 },
          functions: { total: 10, covered: 9, pct: 90 },
          branches: { total: 20, covered: 18, pct: 90 }
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

      const result = (service as any).mergeThemeCoverage(layerTheme, setupTheme);

      expect(result.name).toBe('test-theme');
      expect(result.type).toBe('theme');
      expect(result.path).toBe('/test/theme');
      expect(result.coverage).toEqual(setupTheme.coverage);
      expect(result.systemTestCoverage).toEqual(setupTheme.systemTestCoverage);
      expect(result.duplication).toEqual(setupTheme.duplication);
      expect(result.children).toEqual(layerTheme.children);
    });
  });

  describe('mergeLayerAndSetupCoverage edge cases', () => {
    beforeEach(() => {
      service = new IntegratedCoverageService();
    });

    it('should handle layer coverage without children', () => {
      const layerCoverage = {
        name: 'AI Development Platform',
        type: 'app' as const,
        path: '/test',
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
        // No children property
        timestamp: new Date()
      };

      const setupCoverage = {
        name: 'AI Development Platform (Setup)',
        type: 'app' as const,
        path: '/test',
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
        children: [
          {
            name: 'theme1',
            type: 'theme' as const,
            path: '/test/theme1',
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
          }
        ],
        timestamp: new Date()
      };

      const result = (service as any).mergeLayerAndSetupCoverage(layerCoverage, setupCoverage);

      expect(result.name).toBe('AI Development Platform (Integrated)');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].name).toBe('theme1');
    });
  });

  describe('recalculateMetrics edge cases', () => {
    beforeEach(() => {
      service = new IntegratedCoverageService();
    });

    it('should handle children with zero totals', () => {
      const children = [
        {
          name: 'empty-child',
          type: 'theme' as const,
          path: '/empty',
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
        }
      ];

      const result = (service as any).recalculateMetrics(children);

      expect(result.coverage.lines.pct).toBe(0);
      expect(result.coverage.statements.pct).toBe(0);
      expect(result.coverage.functions.pct).toBe(0);
      expect(result.coverage.branches.pct).toBe(0);
      expect(result.systemTestCoverage.classCoveragePct).toBe(0);
      expect(result.duplication.duplicationPct).toBe(0);
    });
  });
});