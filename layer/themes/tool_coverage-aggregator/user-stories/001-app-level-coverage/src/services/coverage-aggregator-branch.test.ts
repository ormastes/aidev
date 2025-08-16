import { CoverageAggregator } from './coverage-aggregator';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

jest.mock('fs');

describe('CoverageAggregator - Branch Coverage', () => {
  let aggregator: CoverageAggregator;
  const mockLayerPath = '/mock/layer';

  beforeEach(() => {
    aggregator = new CoverageAggregator(mockLayerPath);
    jest.clearAllMocks();
  });

  describe('edge cases and branches', () => {
    it('should handle themes with no user stories', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('themes')) {
          return ['empty-theme'];
        }
        if (path.includes('user-stories')) {
          return []; // No user stories
        }
        return [];
      });

      (fs.statSync as jest.Mock).mockImplementation(() => ({
        isDirectory: () => true
      }));

      const themes = await aggregator.aggregateThemes();
      expect(themes).toHaveLength(0); // Theme should not be included if it has no stories
    });

    it('should handle epics with no themes', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('epic')) {
          return ['empty-epic'];
        }
        return [];
      });

      (fs.statSync as jest.Mock).mockImplementation(() => ({
        isDirectory: () => true
      }));

      const epics = await aggregator.aggregateEpics();
      expect(epics).toHaveLength(0); // Epic should not be included if it has no themes
    });

    it('should handle non-directory entries in themes folder', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('themes')) {
          return ['theme1', 'README.md']; // Mix of directories and files
        }
        if (path.includes('user-stories')) {
          return ['001-story'];
        }
        return [];
      });

      (fs.statSync as jest.Mock).mockImplementation((path: string) => ({
        isDirectory: () => !path.includes('README.md')
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
      expect(themes[0].name).toBe('theme1');
    });

    it('should handle coverage data with partially covered branches', async () => {
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

      (fs.statSync as jest.Mock).mockImplementation(() => ({
        isDirectory: () => true
      }));

      // Test with branch array that is not fully covered
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        'file1.js': {
          statementMap: { '0': {}, '1': {} },
          s: { '0': 1, '1': 1 },
          fnMap: { '0': {} },
          f: { '0': 1 },
          branchMap: { '0': {}, '1': {}, '2': {} },
          b: { 
            '0': [1, 1], // Fully covered
            '1': [1, 0], // Partially covered
            '2': [0, 0]  // Not covered
          }
        }
      }));

      const themes = await aggregator.aggregateThemes();
      expect(themes[0].coverage.branches.covered).toBe(1); // Only one branch fully covered
      expect(themes[0].coverage.branches.total).toBe(3);
    });

    it('should handle files without branch data', async () => {
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

      (fs.statSync as jest.Mock).mockImplementation(() => ({
        isDirectory: () => true
      }));

      // Coverage data without branch information
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        'file1.js': {
          statementMap: { '0': {} },
          s: { '0': 1 },
          fnMap: { '0': {} },
          f: { '0': 1 }
          // No branchMap or b properties
        }
      }));

      const themes = await aggregator.aggregateThemes();
      expect(themes[0].coverage.branches.total).toBe(0);
      expect(themes[0].coverage.branches.covered).toBe(0);
      expect(themes[0].coverage.branches.pct).toBe(0);
    });

    it('should handle invalid branch data structure', async () => {
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

      (fs.statSync as jest.Mock).mockImplementation(() => ({
        isDirectory: () => true
      }));

      // Test with non-array branch data
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        'file1.js': {
          statementMap: { '0': {} },
          s: { '0': 1 },
          fnMap: {},
          f: {},
          branchMap: { '0': {} },
          b: { 
            '0': 'invalid' // Not an array
          }
        }
      }));

      const themes = await aggregator.aggregateThemes();
      expect(themes[0].coverage.branches.covered).toBe(0); // Should handle gracefully
    });

    it('should handle metrics with zero totals', () => {
      const coverages = [
        {
          name: 'empty-story',
          type: 'user-story' as const,
          path: '/path1',
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

      const merged = (aggregator as any).mergeCoverageData(coverages);
      
      expect(merged.coverage.lines.pct).toBe(0);
      expect(merged.coverage.branches.pct).toBe(0);
      expect(merged.systemTestCoverage.classCoveragePct).toBe(0);
      expect(merged.duplication.duplicationPct).toBe(0);
    });

    it('should handle missing coverage directory', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('coverage')) {
          return false; // No coverage directory
        }
        return true;
      });

      (fs.readdirSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('themes')) {
          return ['theme1'];
        }
        if (path.includes('user-stories')) {
          return ['001-story'];
        }
        return [];
      });

      (fs.statSync as jest.Mock).mockImplementation(() => ({
        isDirectory: () => true
      }));

      const themes = await aggregator.aggregateThemes();
      expect(themes).toHaveLength(0); // No themes should be included without coverage
    });

    it('should handle system test coverage calculation with no files', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('src')) {
          return false; // No src directory
        }
        return true;
      });

      const coverage = (aggregator as any).calculateSystemTestCoverage('/mock/story');
      
      expect(coverage).toEqual({
        classCount: 0,
        coveredClassCount: 0,
        classCoveragePct: 0
      });
    });

    it('should calculate duplication metrics correctly', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path.includes('src');
      });

      (fs.readdirSync as jest.Mock).mockImplementation(() => ['file1.ts', 'file2.ts']);

      (fs.statSync as jest.Mock).mockImplementation(() => ({
        isDirectory: () => false,
        isFile: () => true
      }));

      (fs.readFileSync as jest.Mock).mockImplementation(() => 
        'line1\nline2\n\n\nline5\n' // 3 non-empty lines
      );

      const duplication = await (aggregator as any).calculateDuplication('/mock/story');
      
      expect(duplication.totalLines).toBe(6); // 2 files * 3 lines each
      expect(duplication.duplicatedLines).toBe(0);
      expect(duplication.duplicationPct).toBe(0);
    });
  });
});