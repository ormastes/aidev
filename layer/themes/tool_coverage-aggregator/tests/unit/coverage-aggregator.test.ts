import { CoverageAggregator } from '../../user-stories/001-app-level-coverage/src/services/coverage-aggregator';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

// Mock fs module
jest.mock('fs');

describe("CoverageAggregator", () => {
  let aggregator: CoverageAggregator;
  const mockLayerPath = '/test/layer';

  beforeEach(() => {
    aggregator = new CoverageAggregator(mockLayerPath);
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it('should create aggregator with custom layer path', () => {
      expect(aggregator).toBeInstanceOf(CoverageAggregator);
    });

    it('should create aggregator with default layer path', () => {
      const defaultAggregator = new CoverageAggregator();
      expect(defaultAggregator).toBeInstanceOf(CoverageAggregator);
    });
  });

  describe("aggregateAppCoverage", () => {
    it('should aggregate coverage from epics and themes', async () => {
      const mockEpics = [{
        name: 'epic1',
        type: 'epic' as const,
        path: '/test/layer/epic/epic1',
        coverage: {
          lines: { total: 100, covered: 80, pct: 80 },
          statements: { total: 100, covered: 80, pct: 80 },
          functions: { total: 20, covered: 18, pct: 90 },
          branches: { total: 30, covered: 25, pct: 83.33 }
        },
        systemTestCoverage: { classCount: 10, coveredClassCount: 8, classCoveragePct: 80 },
        duplication: { duplicatedLines: 50, totalLines: 500, duplicationPct: 10 },
        children: [],
        timestamp: new Date()
      }];

      const mockThemes = [{
        name: 'theme1',
        type: 'theme' as const,
        path: '/test/layer/themes/theme1',
        coverage: {
          lines: { total: 200, covered: 160, pct: 80 },
          statements: { total: 200, covered: 160, pct: 80 },
          functions: { total: 40, covered: 36, pct: 90 },
          branches: { total: 60, covered: 50, pct: 83.33 }
        },
        systemTestCoverage: { classCount: 20, coveredClassCount: 16, classCoveragePct: 80 },
        duplication: { duplicatedLines: 100, totalLines: 1000, duplicationPct: 10 },
        children: [],
        timestamp: new Date()
      }];

      jest.spyOn(aggregator, "aggregateEpics").mockResolvedValue(mockEpics);
      jest.spyOn(aggregator, "aggregateThemes").mockResolvedValue(mockThemes);

      const result = await aggregator.aggregateAppCoverage();

      expect(result.name).toBe('AI Development Platform');
      expect(result.type).toBe('app');
      expect(result.path).toBe(mockLayerPath);
      expect(result.children).toEqual([...mockEpics, ...mockThemes]);
      expect(result.coverage.lines.total).toBe(300);
      expect(result.coverage.lines.covered).toBe(240);
      expect(result.coverage.lines.pct).toBe(80);
    });
  });

  describe("aggregateEpics", () => {
    it('should return empty array when epic directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await aggregator.aggregateEpics();

      expect(result).toEqual([]);
    });

    it('should aggregate epics from epic directory', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['epic1', 'epic2']);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      jest.spyOn(aggregator as any, "aggregateEpicThemes").mockResolvedValue([]);

      const result = await aggregator.aggregateEpics();

      expect(result).toEqual([]);
    });
  });

  describe("aggregateThemes", () => {
    it('should return empty array when themes directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await aggregator.aggregateThemes();

      expect(result).toEqual([]);
    });

    it('should aggregate themes excluding shared directory', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['theme1', 'shared', 'theme2']);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      const mockUserStories = [{
        name: 'story1',
        type: 'user-story' as const,
        path: '/test/story1',
        coverage: {
          lines: { total: 100, covered: 80, pct: 80 },
          statements: { total: 100, covered: 80, pct: 80 },
          functions: { total: 20, covered: 18, pct: 90 },
          branches: { total: 30, covered: 25, pct: 83.33 }
        },
        systemTestCoverage: { classCount: 10, coveredClassCount: 8, classCoveragePct: 80 },
        duplication: { duplicatedLines: 50, totalLines: 500, duplicationPct: 10 },
        timestamp: new Date()
      }];

      jest.spyOn(aggregator as any, "aggregateUserStories").mockResolvedValue(mockUserStories);

      const result = await aggregator.aggregateThemes();

      expect(result).toHaveLength(2); // theme1 and theme2, not shared
      expect(result[0].name).toBe('theme1');
      expect(result[0].type).toBe('theme');
    });
  });

  describe('private methods', () => {
    describe("loadStoryCoverage", () => {
      it('should return null when coverage file does not exist', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const result = await (aggregator as any).loadStoryCoverage('/test/story');

        expect(result).toBeNull();
      });

      it('should load and parse coverage data', async () => {
        const mockCoverageData = {
          '/test/file.ts': {
            statementMap: { '0': {}, '1': {} },
            s: { '0': 1, '1': 0 },
            fnMap: { '0': {} },
            f: { '0': 1 },
            branchMap: { '0': {} },
            b: { '0': [1, 0] }
          }
        };

        (fs.existsSync as jest.Mock).mockImplementation((path: string) => 
          path.includes('coverage-final.json')
        );
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockCoverageData));

        const result = await (aggregator as any).loadStoryCoverage('/test/story');

        expect(result).not.toBeNull();
        expect(result.coverage).toBeDefined();
        expect(result.systemTestCoverage).toBeDefined();
        expect(result.duplication).toBeDefined();
      });
    });

    describe("calculateSummary", () => {
      it('should calculate coverage summary from coverage data', () => {
        const mockCoverageData = {
          '/test/file1.ts': {
            statementMap: { '0': {}, '1': {}, '2': {} },
            s: { '0': 1, '1': 1, '2': 0 },
            fnMap: { '0': {}, '1': {} },
            f: { '0': 1, '1': 0 },
            branchMap: { '0': {} },
            b: { '0': [1, 1] }
          },
          '/test/file2.ts': {
            statementMap: { '0': {} },
            s: { '0': 1 },
            fnMap: {},
            f: {},
            branchMap: {},
            b: {}
          }
        };

        const result = (aggregator as any).calculateSummary(mockCoverageData);

        expect(result.statements.total).toBe(4);
        expect(result.statements.covered).toBe(3);
        expect(result.statements.pct).toBe(75);
        expect(result.functions.total).toBe(2);
        expect(result.functions.covered).toBe(1);
        expect(result.functions.pct).toBe(50);
        expect(result.branches.total).toBe(1);
        expect(result.branches.covered).toBe(1);
        expect(result.branches.pct).toBe(100);
      });

      it('should handle empty coverage data', () => {
        const result = (aggregator as any).calculateSummary({});

        expect(result.statements.total).toBe(0);
        expect(result.statements.covered).toBe(0);
        expect(result.statements.pct).toBe(0);
      });
    });

    describe("getAllFiles", () => {
      it('should recursively get all files with extension', () => {
        const mockFiles = [
          { name: 'file1.ts', isDirectory: false },
          { name: 'subdir', isDirectory: true },
          { name: 'file2.js', isDirectory: false }
        ];

        (fs.readdirSync as jest.Mock)
          .mockReturnValueOnce(['file1.ts', 'subdir', 'file2.js'])
          .mockReturnValueOnce(['file3.ts']);
        
        (fs.statSync as jest.Mock).mockImplementation((path: string) => ({
          isDirectory: () => path.includes('subdir'),
          isFile: () => !path.includes('subdir')
        }));

        const result = (aggregator as any).getAllFiles('/test', '.ts');

        expect(result).toContain('/test/file1.ts');
        expect(result).toContain('/test/subdir/file3.ts');
        expect(result).not.toContain('/test/file2.js');
      });

      it('should exclude node_modules', () => {
        (fs.readdirSync as jest.Mock).mockReturnValue(['src', 'node_modules']);
        (fs.statSync as jest.Mock).mockReturnValue({ 
          isDirectory: () => true,
          isFile: () => false
        });

        const result = (aggregator as any).getAllFiles('/test', '.ts');

        expect(fs.readdirSync).toHaveBeenCalledTimes(2); // Once for /test, once for /test/src
      });
    });

    describe("mergeCoverageData", () => {
      it('should merge multiple coverage data objects', () => {
        const coverages = [
          {
            coverage: {
              lines: { total: 100, covered: 80, pct: 80 },
              statements: { total: 100, covered: 80, pct: 80 },
              functions: { total: 20, covered: 18, pct: 90 },
              branches: { total: 30, covered: 25, pct: 83.33 }
            },
            systemTestCoverage: { classCount: 10, coveredClassCount: 8, classCoveragePct: 80 },
            duplication: { duplicatedLines: 50, totalLines: 500, duplicationPct: 10 }
          },
          {
            coverage: {
              lines: { total: 200, covered: 160, pct: 80 },
              statements: { total: 200, covered: 160, pct: 80 },
              functions: { total: 40, covered: 36, pct: 90 },
              branches: { total: 60, covered: 50, pct: 83.33 }
            },
            systemTestCoverage: { classCount: 20, coveredClassCount: 16, classCoveragePct: 80 },
            duplication: { duplicatedLines: 100, totalLines: 1000, duplicationPct: 10 }
          }
        ];

        const result = (aggregator as any).mergeCoverageData(coverages);

        expect(result.coverage.lines.total).toBe(300);
        expect(result.coverage.lines.covered).toBe(240);
        expect(result.coverage.lines.pct).toBe(80);
        expect(result.systemTestCoverage.classCount).toBe(30);
        expect(result.systemTestCoverage.coveredClassCount).toBe(24);
        expect(result.duplication.totalLines).toBe(1500);
      });

      it('should handle empty coverage array', () => {
        const result = (aggregator as any).mergeCoverageData([]);

        expect(result.coverage.lines.total).toBe(0);
        expect(result.coverage.lines.pct).toBe(0);
      });
    });
  });
});