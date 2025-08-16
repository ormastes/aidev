import { CoverageAggregator } from './coverage-aggregator';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

jest.mock('fs');

describe('CoverageAggregator', () => {
  let aggregator: CoverageAggregator;
  const mockLayerPath = '/mock/layer';

  beforeEach(() => {
    aggregator = new CoverageAggregator(mockLayerPath);
    jest.clearAllMocks();
  });

  describe('aggregateAppCoverage', () => {
    it('should aggregate coverage from themes and epics', async () => {
      // Mock file system structure
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path.includes('themes') || path.includes('epic');
      });

      (fs.readdirSync as jest.Mock).mockImplementation((path: string) => {
        if (path.endsWith('/themes')) {
          return ['theme1', 'theme2', 'shared'];
        }
        if (path.endsWith('/epic')) {
          return ['epic1'];
        }
        if (path.endsWith('/user-stories')) {
          return ['001-story', '002-story'];
        }
        if (path.includes('/src')) {
          return ['index.ts', 'service.ts'];
        }
        return [];
      });

      (fs.statSync as jest.Mock).mockImplementation((path: string) => ({
        isDirectory: () => !path.endsWith('.ts'),
        isFile: () => path.endsWith('.ts')
      }));

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        'file1.js': {
          statementMap: { '0': {}, '1': {} },
          s: { '0': 1, '1': 0 },
          fnMap: { '0': {} },
          f: { '0': 1 },
          branchMap: { '0': {} },
          b: { '0': [1, 0] }
        }
      }));

      const result = await aggregator.aggregateAppCoverage();

      expect(result).toMatchObject({
        name: 'AI Development Platform',
        type: 'app',
        path: mockLayerPath,
        coverage: expect.objectContaining({
          lines: expect.objectContaining({
            total: expect.any(Number),
            covered: expect.any(Number),
            pct: expect.any(Number)
          })
        })
      });
    });
  });

  describe('aggregateThemes', () => {
    it('should aggregate user stories within themes', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('themes')) {
          return ['theme1'];
        }
        if (path.includes('user-stories')) {
          return ['001-story'];
        }
        return [];
      });

      (fs.statSync as jest.Mock).mockImplementation((path: string) => ({
        isDirectory: () => !path.endsWith('.ts'),
        isFile: () => path.endsWith('.ts')
      }));

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        'file1.js': {
          statementMap: { '0': {} },
          s: { '0': 1 },
          fnMap: {},
          f: {},
          branchMap: {},
          b: {}
        }
      }));

      const themes = await aggregator.aggregateThemes();

      expect(themes).toHaveLength(1);
      expect(themes[0]).toMatchObject({
        name: 'theme1',
        type: 'theme',
        children: expect.arrayContaining([
          expect.objectContaining({
            name: '001-story',
            type: 'user-story'
          })
        ])
      });
    });

    it('should exclude shared theme from aggregation', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['theme1', 'shared']);
      (fs.statSync as jest.Mock).mockImplementation((path: string) => ({
        isDirectory: () => !path.endsWith('.ts'),
        isFile: () => path.endsWith('.ts')
      }));

      const themes = await aggregator.aggregateThemes();
      
      const themeNames = themes.map(t => t.name);
      expect(themeNames).not.toContain('shared');
    });
  });

  describe('coverage calculations', () => {
    it('should calculate system test coverage correctly', async () => {
      const mockStoryPath = '/mock/story';
      
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path.includes('src') || path.includes('coverage');
      });

      (fs.readdirSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('src')) {
          return ['service.ts', 'service.stest.ts', 'model.ts'];
        }
        return [];
      });

      (fs.statSync as jest.Mock).mockImplementation((path: string) => ({
        isDirectory: () => false,
        isFile: () => true
      }));

      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('service.ts') && !path.includes('stest')) {
          return 'class ServiceClass {}';
        }
        if (path.includes('model.ts')) {
          return 'class ModelClass {}';
        }
        if (path.includes('coverage-final.json')) {
          return JSON.stringify({});
        }
        return '';
      });

      const coverage = await (aggregator as any).loadStoryCoverage(mockStoryPath);

      expect(coverage).toBeTruthy();
      expect(coverage.systemTestCoverage).toMatchObject({
        classCount: 2,
        coveredClassCount: 1,
        classCoveragePct: 50
      });
    });

    it('should merge coverage metrics correctly', () => {
      const coverages = [
        {
          name: 'story1',
          type: 'user-story' as const,
          path: '/path1',
          coverage: {
            lines: { total: 100, covered: 80, pct: 80 },
            statements: { total: 100, covered: 80, pct: 80 },
            functions: { total: 10, covered: 8, pct: 80 },
            branches: { total: 20, covered: 15, pct: 75 }
          },
          systemTestCoverage: {
            classCount: 5,
            coveredClassCount: 4,
            classCoveragePct: 80
          },
          duplication: {
            duplicatedLines: 10,
            totalLines: 100,
            duplicationPct: 10
          },
          timestamp: new Date()
        },
        {
          name: 'story2',
          type: 'user-story' as const,
          path: '/path2',
          coverage: {
            lines: { total: 50, covered: 45, pct: 90 },
            statements: { total: 50, covered: 45, pct: 90 },
            functions: { total: 5, covered: 5, pct: 100 },
            branches: { total: 10, covered: 9, pct: 90 }
          },
          systemTestCoverage: {
            classCount: 3,
            coveredClassCount: 3,
            classCoveragePct: 100
          },
          duplication: {
            duplicatedLines: 2,
            totalLines: 50,
            duplicationPct: 4
          },
          timestamp: new Date()
        }
      ];

      const merged = (aggregator as any).mergeCoverageData(coverages);

      expect(merged.coverage.lines).toMatchObject({
        total: 150,
        covered: 125,
        pct: expect.closeTo(83.33, 1)
      });

      expect(merged.systemTestCoverage).toMatchObject({
        classCount: 8,
        coveredClassCount: 7,
        classCoveragePct: 87.5
      });

      expect(merged.duplication).toMatchObject({
        duplicatedLines: 12,
        totalLines: 150,
        duplicationPct: 8
      });
    });
  });
});