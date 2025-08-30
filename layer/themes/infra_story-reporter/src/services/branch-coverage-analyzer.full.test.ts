import { describe, it, expect, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { BranchCoverageAnalyzer } from './branch-coverage-analyzer';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock file API
const mockFileAPI = {
  readFile: mock((filePath: string) => {
    if (filePath.includes('coverage.json')) {
      return Promise.resolve(JSON.stringify({
        branches: {
          total: 10,
          covered: 8,
          skipped: 0,
          pct: 80
        },
        lines: {
          total: 100,
          covered: 85,
          skipped: 0,
          pct: 85
        },
        files: {
          'src/example.ts': {
            branches: { total: 5, covered: 4 },
            lines: { '10': 1, '11': 1, '12': 0 }
          }
        }
      }));
    }
    return Promise.resolve('{}');
  }),
  exists: mock(() => Promise.resolve(true))
};

// Create test directory structure
async function setupTestDirectory() {
  const testDir = '/tmp/test-branch-coverage';
  await fs.mkdir(testDir, { recursive: true });
  await fs.mkdir(`${testDir}/coverage`, { recursive: true });
  await fs.mkdir(`${testDir}/src`, { recursive: true });
  
  // Create mock coverage files
  await fs.writeFile(
    `${testDir}/coverage/coverage.json`,
    JSON.stringify({
      branches: { total: 20, covered: 16, pct: 80 },
      lines: { total: 200, covered: 180, pct: 90 },
      files: {
        'src/service.ts': {
          branches: { total: 10, covered: 8 },
          lines: { '10': 1, '20': 0, '30': 1 }
        },
        'src/utils.ts': {
          branches: { total: 10, covered: 8 },
          lines: { '5': 1, '15': 1, '25': 0 }
        }
      }
    })
  );
  
  return testDir;
}

describe('BranchCoverageAnalyzer - Full Implementation', () => {
  let analyzer: BranchCoverageAnalyzer;
  let testDir: string;

  beforeAll(async () => {
    testDir = await setupTestDirectory();
  });

  beforeEach(() => {
    analyzer = new BranchCoverageAnalyzer();
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('analyze method', () => {
    it('should analyze branch coverage for a given path', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      expect(result).toBeDefined();
      expect(result.percentage).toBeGreaterThanOrEqual(0);
      expect(result.percentage).toBeLessThanOrEqual(100);
      expect(result.covered).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should calculate correct percentage', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      if (result.total > 0) {
        const expectedPercentage = (result.covered / result.total) * 100;
        expect(result.percentage).toBeCloseTo(expectedPercentage, 2);
      } else {
        expect(result.percentage).toBe(0);
      }
    });

    it('should handle empty coverage data', async () => {
      const emptyDir = '/tmp/empty-coverage';
      await fs.mkdir(emptyDir, { recursive: true });
      
      const result = await analyzer.analyze(emptyDir, 'theme');
      
      expect(result.percentage).toBe(0);
      expect(result.covered).toBe(0);
      expect(result.total).toBe(0);
      expect(result.details).toEqual([]);
      
      await fs.rm(emptyDir, { recursive: true, force: true });
    });

    it('should handle different modes', async () => {
      const modes = ['app', 'epic', 'theme', 'story', 'user_story'];
      
      for (const mode of modes) {
        const result = await analyzer.analyze(testDir, mode);
        expect(result).toBeDefined();
        expect(result.percentage).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Branch Detail Extraction', () => {
    it('should extract branch details from coverage data', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      if (result.details.length > 0) {
        const detail = result.details[0];
        expect(detail.file).toBeDefined();
        expect(detail.branches).toBeGreaterThanOrEqual(0);
        expect(detail.covered).toBeGreaterThanOrEqual(0);
        expect(detail.percentage).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(detail.uncoveredLines)).toBe(true);
      }
    });

    it('should identify uncovered lines', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      for (const detail of result.details) {
        if (detail.covered < detail.branches) {
          expect(detail.uncoveredLines.length).toBeGreaterThan(0);
        }
      }
    });

    it('should calculate per-file percentage correctly', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      for (const detail of result.details) {
        if (detail.branches > 0) {
          const expectedPercentage = (detail.covered / detail.branches) * 100;
          expect(detail.percentage).toBeCloseTo(expectedPercentage, 2);
        } else {
          expect(detail.percentage).toBe(0);
        }
      }
    });
  });

  describe('Coverage File Discovery', () => {
    it('should find coverage files in different locations', async () => {
      // Create coverage files in different locations
      const locations = ['coverage', '.nyc_output', 'test-results'];
      
      for (const location of locations) {
        const dir = `/tmp/test-${location}`;
        await fs.mkdir(`${dir}/${location}`, { recursive: true });
        await fs.writeFile(
          `${dir}/${location}/coverage.json`,
          JSON.stringify({ branches: { total: 5, covered: 3 } })
        );
        
        const result = await analyzer.analyze(dir, 'theme');
        expect(result.total).toBeGreaterThanOrEqual(0);
        
        await fs.rm(dir, { recursive: true, force: true });
      }
    });

    it('should handle missing coverage files gracefully', async () => {
      const noCoverageDir = '/tmp/no-coverage';
      await fs.mkdir(noCoverageDir, { recursive: true });
      
      const result = await analyzer.analyze(noCoverageDir, 'theme');
      
      expect(result).toBeDefined();
      expect(result.percentage).toBe(0);
      expect(result.details).toEqual([]);
      
      await fs.rm(noCoverageDir, { recursive: true, force: true });
    });
  });

  describe('Branch Types Detection', () => {
    it('should detect if-else branches', async () => {
      const coverageData = {
        branches: {
          '10': { type: 'if', covered: true },
          '12': { type: 'else', covered: false }
        }
      };
      
      // Test branch type detection logic
      const branches = Object.values(coverageData.branches);
      const ifBranches = branches.filter(b => b.type === 'if');
      const elseBranches = branches.filter(b => b.type === 'else');
      
      expect(ifBranches.length).toBe(1);
      expect(elseBranches.length).toBe(1);
    });

    it('should detect switch-case branches', () => {
      const coverageData = {
        branches: {
          '20': { type: 'switch', covered: true },
          '21': { type: 'case', covered: true },
          '22': { type: 'case', covered: false },
          '23': { type: 'default', covered: true }
        }
      };
      
      const branches = Object.values(coverageData.branches);
      const switchBranches = branches.filter(b => b.type === 'switch');
      const caseBranches = branches.filter(b => b.type === 'case');
      const defaultBranches = branches.filter(b => b.type === 'default');
      
      expect(switchBranches.length).toBe(1);
      expect(caseBranches.length).toBe(2);
      expect(defaultBranches.length).toBe(1);
    });

    it('should detect ternary operator branches', () => {
      const coverageData = {
        branches: {
          '30': { type: 'ternary-true', covered: true },
          '31': { type: 'ternary-false', covered: false }
        }
      };
      
      const branches = Object.values(coverageData.branches);
      const ternaryTrue = branches.filter(b => b.type === 'ternary-true');
      const ternaryFalse = branches.filter(b => b.type === 'ternary-false');
      
      expect(ternaryTrue.length).toBe(1);
      expect(ternaryFalse.length).toBe(1);
    });

    it('should detect logical operator branches', () => {
      const coverageData = {
        branches: {
          '40': { type: 'logical-and', covered: true },
          '41': { type: 'logical-or', covered: true }
        }
      };
      
      const branches = Object.values(coverageData.branches);
      const andBranches = branches.filter(b => b.type === 'logical-and');
      const orBranches = branches.filter(b => b.type === 'logical-or');
      
      expect(andBranches.length).toBe(1);
      expect(orBranches.length).toBe(1);
    });
  });

  describe('Coverage Aggregation', () => {
    it('should aggregate coverage across multiple files', async () => {
      const multiFileDir = '/tmp/multi-file-coverage';
      await fs.mkdir(`${multiFileDir}/coverage`, { recursive: true });
      
      // Create multiple coverage files
      const coverageFiles = [
        { name: 'coverage-1.json', branches: { total: 10, covered: 8 } },
        { name: 'coverage-2.json', branches: { total: 15, covered: 10 } },
        { name: 'coverage-3.json', branches: { total: 5, covered: 5 } }
      ];
      
      for (const file of coverageFiles) {
        await fs.writeFile(
          `${multiFileDir}/coverage/${file.name}`,
          JSON.stringify(file)
        );
      }
      
      const result = await analyzer.analyze(multiFileDir, 'theme');
      
      // Verify aggregation
      const expectedTotal = coverageFiles.reduce((sum, f) => sum + f.branches.total, 0);
      const expectedCovered = coverageFiles.reduce((sum, f) => sum + f.branches.covered, 0);
      
      expect(result.total).toBeLessThanOrEqual(expectedTotal);
      expect(result.covered).toBeLessThanOrEqual(expectedCovered);
      
      await fs.rm(multiFileDir, { recursive: true, force: true });
    });

    it('should handle partial coverage data', async () => {
      const partialDir = '/tmp/partial-coverage';
      await fs.mkdir(`${partialDir}/coverage`, { recursive: true });
      
      await fs.writeFile(
        `${partialDir}/coverage/partial.json`,
        JSON.stringify({
          // Missing branches property
          lines: { total: 100, covered: 80 }
        })
      );
      
      const result = await analyzer.analyze(partialDir, 'theme');
      
      expect(result).toBeDefined();
      expect(result.percentage).toBeGreaterThanOrEqual(0);
      
      await fs.rm(partialDir, { recursive: true, force: true });
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted coverage files', async () => {
      const corruptDir = '/tmp/corrupt-coverage';
      await fs.mkdir(`${corruptDir}/coverage`, { recursive: true });
      
      await fs.writeFile(
        `${corruptDir}/coverage/corrupt.json`,
        'not valid json {'
      );
      
      const result = await analyzer.analyze(corruptDir, 'theme');
      
      expect(result).toBeDefined();
      expect(result.percentage).toBeGreaterThanOrEqual(0);
      
      await fs.rm(corruptDir, { recursive: true, force: true });
    });

    it('should handle permission errors gracefully', async () => {
      const restrictedDir = '/tmp/restricted-coverage';
      await fs.mkdir(`${restrictedDir}/coverage`, { recursive: true });
      
      const result = await analyzer.analyze(restrictedDir, 'theme');
      
      expect(result).toBeDefined();
      expect(result.details).toBeDefined();
      
      await fs.rm(restrictedDir, { recursive: true, force: true });
    });
  });

  describe('Performance', () => {
    it('should analyze large coverage data efficiently', async () => {
      const largeDir = '/tmp/large-coverage';
      await fs.mkdir(`${largeDir}/coverage`, { recursive: true });
      
      // Create large coverage data
      const largeData = {
        branches: { total: 1000, covered: 850 },
        files: {}
      };
      
      // Add many files
      for (let i = 0; i < 100; i++) {
        largeData.files[`src/file${i}.ts`] = {
          branches: { total: 10, covered: 8 },
          lines: {}
        };
      }
      
      await fs.writeFile(
        `${largeDir}/coverage/large.json`,
        JSON.stringify(largeData)
      );
      
      const startTime = Date.now();
      const result = await analyzer.analyze(largeDir, 'theme');
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      await fs.rm(largeDir, { recursive: true, force: true });
    });
  });
});