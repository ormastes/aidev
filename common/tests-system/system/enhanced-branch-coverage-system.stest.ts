import { TestReportGenerator } from '../../setup/test-env/report-generator';
import { DuplicationDetector } from '../../setup/test-env/duplication-detector';
import { ConfigManager } from '../../config/ConfigManager';
import { CoverageAnalyzer } from '../../setup/test-env/coverage-analyzer';
import { ThemeManager } from '../../setup/test-env/theme-manager';
import { FraudChecker } from '../../setup/test-env/fraud-checker';
import * as fs from 'fs/promises';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

async describe('Enhanced Branch Coverage System Tests', () => {
  let tempDir: string;
  let originalCwd: string;

  async beforeAll(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'enhanced-branch-coverage-'));
  });

  async afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async beforeEach(async () => {
    process.chdir(tempDir);
  });

  async describe('TestReportGenerator Branch Coverage', () => {
    async test('should cover all validation branches in generate method', async () => {
      const strictSchema = {
        type: 'object',
        required: ['theme', 'metrics'],
        properties: {
          theme: { type: 'string', minLength: 1 },
          metrics: { type: 'object' }
        }
      };

      const generator = new TestReportGenerator(strictSchema);

      // Branch 1: Valid data path
      const validData = { theme: 'valid', metrics: {} };
      const result1 = await generator.generate(validData);
      expect(result1).toEqual(validData);

      // Branch 2: Invalid data path (missing required field)
      const invalidData1 = { theme: 'test' };
      await expect(generator.generate(invalidData1 as any)).rejects.toThrow('Invalid report data');

      // Branch 3: Invalid data path (wrong type)
      const invalidData2 = { theme: 123, metrics: {} };
      await expect(generator.generate(invalidData2 as any)).rejects.toThrow('Invalid report data');

      // Branch 4: Invalid data path (fails minLength)
      const invalidData3 = { theme: '', metrics: {} };
      await expect(generator.generate(invalidData3 as any)).rejects.toThrow('Invalid report data');
    });

    async test('should cover all file creation branches in save method', async () => {
      const schema = {
        type: 'object',
        required: ['theme'],
        properties: { theme: { type: 'string' } }
      };
      
      const generator = new TestReportGenerator(schema);
      const reportData = { theme: 'branch-test' } as any;

      // Branch 1: Normal directory creation and file writing
      const normalDir = path.join(tempDir, 'normal');
      await generator.save(reportData, normalDir);
      
      const files = await fs.readdir(normalDir);
      expect(files.length).toBeGreaterThan(0);

      // Branch 2: Directory already exists (mkdir with recursive: true)
      await generator.save(reportData, normalDir); // Should not throw
      
      const filesAfterSecond = await fs.readdir(normalDir);
      expect(filesAfterSecond.length).toBeGreaterThan(0);

      // Branch 3: Nested directory creation path
      const nestedDir = path.join(tempDir, 'level1', 'level2', 'level3');
      await generator.save(reportData, nestedDir);
      
      const nestedDirStats = await fs.stat(nestedDir);
      expect(nestedDirStats.isDirectory()).toBe(true);
    });

    async test('should cover HTML generation branches with different violation scenarios', async () => {
      const schema = { type: 'object', properties: { theme: { type: 'string' } } };
      const generator = new TestReportGenerator(schema);

      // Branch 1: Report with no violations (violations section should be omitted)
      const reportWithoutViolations = {
        theme: 'no-violations',
        timestamp: new Date().toISOString(),
        environment: { type: 'test', version: '1.0.0' },
        status: {
          overall: 'passed',
          criteria: {
            classCoverage: { met: true, target: 95, actual: 98 },
            branchCoverage: { met: true, target: 90, actual: 92 },
            duplication: { met: true, target: 5, actual: 2 }
          }
        },
        metrics: {
          coverage: {
            class: { total: 10, covered: 10, percentage: 100 },
            branch: { total: 20, covered: 18, percentage: 90 },
            line: { total: 100, covered: 90, percentage: 90 },
            method: { total: 25, covered: 25, percentage: 100 }
          },
          duplication: { percentage: 2, duplicatedLines: 4, totalLines: 200, duplicatedBlocks: [] },
          fraudCheck: { passed: true, score: 100, violations: [] }
        }
      };

      const outputDir1 = path.join(tempDir, 'no-violations');
      await generator.save(reportWithoutViolations, outputDir1);

      const htmlContent1 = await fs.readFile(
        path.join(outputDir1, 'test-report-no-violations-latest.html'), 
        'utf8'
      );
      expect(htmlContent1).not.toContain('Fraud Check Violations');

      // Branch 2: Report with violations (violations section should be included)
      const reportWithViolations = {
        ...reportWithoutViolations,
        theme: 'with-violations',
        metrics: {
          ...reportWithoutViolations.metrics,
          fraudCheck: {
            passed: false,
            score: 85,
            violations: [
              { type: 'empty-test', severity: 'warning', message: 'Empty test', location: 'test1.ts:10' },
              { type: 'fake-assertions', severity: 'critical', message: 'Always true', location: 'test2.ts:15' }
            ]
          }
        }
      };

      const outputDir2 = path.join(tempDir, 'with-violations');
      await generator.save(reportWithViolations, outputDir2);

      const htmlContent2 = await fs.readFile(
        path.join(outputDir2, 'test-report-with-violations-latest.html'), 
        'utf8'
      );
      expect(htmlContent2).toContain('Fraud Check Violations');
      expect(htmlContent2).toContain('empty-test');
      expect(htmlContent2).toContain('fake-assertions');
    });

    async test('should cover progress bar color branches based on criteria', async () => {
      const schema = { type: 'object', properties: { theme: { type: 'string' } } };
      const generator = new TestReportGenerator(schema);

      // Create report data with different criteria met/not met combinations
      const reportWithMixedCriteria = {
        theme: 'mixed-criteria',
        timestamp: new Date().toISOString(),
        environment: { type: 'test', version: '1.0.0' },
        status: {
          overall: 'failed',
          criteria: {
            classCoverage: { met: false, target: 95, actual: 80 }, // Bad: < 90% of target
            branchCoverage: { met: false, target: 90, actual: 85 }, // Warning: >= 90% of target but not met
            duplication: { met: true, target: 5, actual: 3 } // Good: criteria met
          }
        },
        metrics: {
          coverage: {
            class: { total: 10, covered: 8, percentage: 80 },
            branch: { total: 20, covered: 17, percentage: 85 },
            line: { total: 100, covered: 90, percentage: 90 },
            method: { total: 25, covered: 23, percentage: 92 }
          },
          duplication: { percentage: 3, duplicatedLines: 6, totalLines: 200, duplicatedBlocks: [] },
          fraudCheck: { passed: true, score: 95, violations: [] }
        }
      };

      const outputDir = path.join(tempDir, 'mixed-criteria');
      await generator.save(reportWithMixedCriteria, outputDir);

      const htmlContent = await fs.readFile(
        path.join(outputDir, 'test-report-mixed-criteria-latest.html'), 
        'utf8'
      );

      // Should contain different progress bar classes based on criteria
      expect(htmlContent).toContain('progress-fill bad'); // For class coverage
      expect(htmlContent).toContain('progress-fill warning'); // For branch coverage  
      expect(htmlContent).toContain('progress-fill good'); // For duplication
    });
  });

  async describe('DuplicationDetector Branch Coverage', () => {
    async test('should cover all file collection branches', async () => {
      const detector = new DuplicationDetector();
      
      // Setup src directory with various file types and structures
      const srcDir = path.join(tempDir, 'src');
      await await fileAPI.createDirectory(srcDir);

      // Branch 1: Directory traversal - file entry
      await await fileAPI.createFile(path.join(srcDir, 'file.ts'), { type: FileType.TEMPORARY });
      
      // Branch 2: Directory traversal - directory entry (recursive call)
      const subDir = path.join(srcDir, 'subdir');
      await await fileAPI.createDirectory(subDir);
      await await fileAPI.createFile(path.join(subDir), { type: FileType.TEMPORARY });
      
      // Branch 3: File extension filtering - .ts file (included)
      await await fileAPI.createFile(path.join(srcDir, 'typescript.ts'), { type: FileType.TEMPORARY });
      
      // Branch 4: File extension filtering - .js file (included)  
      await await fileAPI.createFile(path.join(srcDir, 'javascript.js'), { type: FileType.TEMPORARY });
      
      // Branch 5: File extension filtering - other extensions (excluded)
      await await fileAPI.createFile(path.join(srcDir, 'config.json'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'readme.md'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'style.css'), { type: FileType.TEMPORARY });

      const metrics = await detector.detect();
      
      // Should process only .ts and .js files
      expect(metrics.totalLines).toBe(4); // 4 lines from .ts and .js files
    });

    async test('should cover tokenization branches with different code patterns', async () => {
      const detector = new DuplicationDetector();
      const srcDir = path.join(tempDir, 'src');
      await await fileAPI.createDirectory(srcDir);

      // Code with various tokenization scenarios
      const complexCode = `
/* Multi-line comment
   that should be removed */
export class TokenizationTest {
  // Single line comment
  private value: string = "string literal";
  private number: number = 12345;
  private float: number = 123.45;
  
  method(): void {
    const str1 = 'single quotes';
    const str2 = "double quotes";
    const template = \`template literal\`;
    
    // Comments at end of line
    const calc = 10 + 20; // calculation comment
    
    /* Block comment */ const inline = true;
  }
}`;

      await await fileAPI.createFile(path.join(srcDir, 'tokenization.ts'), { type: FileType.TEMPORARY });

      const metrics = await detector.detect();
      
      // Should handle all tokenization patterns
      expect(metrics.totalLines).toBeGreaterThan(0);
      expect(metrics.percentage).toBe(0); // Single file, no duplicates
    });

    async test('should cover duplicate detection branches', async () => {
      const detector = new DuplicationDetector();
      const srcDir = path.join(tempDir, 'src');
      await await fileAPI.createDirectory(srcDir);

      // Create scenario with blocks that meet minimum requirements
      const longCodeBlock = `
export class DuplicateDetectionTest {
  private items: any[] = [];
  
  constructor() {
    this.items = [];
    console.log('Initialized');
  }
  
  addItem(item: any): void {
    this.items.push(item);
    this.notifyChange();
  }
  
  removeItem(id: string): void {
    const index = this.items.findIndex(i => i.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
      this.notifyChange();
    }
  }
  
  private notifyChange(): void {
    console.log('Items changed');
  }
}`;

      // Branch 1: Blocks with same hash (duplicates found)
      await await fileAPI.createFile(path.join(srcDir, 'duplicate1.ts'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'duplicate2.ts'), { type: FileType.TEMPORARY });
      
      // Branch 2: Blocks with unique hash (no duplicates)
      await await fileAPI.createFile(path.join(srcDir, 'unique.ts'), { type: FileType.TEMPORARY }): string {
    return this.data;
  }
}`);

      const metrics = await detector.detect();
      
      // Should detect duplicates between duplicate1.ts and duplicate2.ts
      expect(metrics.duplicatedLines).toBeGreaterThan(0);
      expect(metrics.duplicatedBlocks.length).toBeGreaterThan(0);
      
      // Branch coverage: blocks with length > 1 (actual duplicates)
      const hasDuplicates = metrics.duplicatedBlocks.some(block => block.files.length >= 2);
      expect(hasDuplicates).toBe(true);
    });

    async test('should cover metric calculation branches with processed lines tracking', async () => {
      const detector = new DuplicationDetector();
      const srcDir = path.join(tempDir, 'src');
      await await fileAPI.createDirectory(srcDir);

      // Create overlapping duplicate blocks to test line processing logic
      const baseCode = `
async function sharedFunction() {
  console.log('This is shared');
  return true;
}

async function anotherFunction() {
  console.log('Another function');
  const result = sharedFunction();
  return result;
}`;

      const extendedCode = baseCode + `

async function extraFunction() {
  console.log('Extra functionality');
}`;

      await await fileAPI.createFile(path.join(srcDir, 'base.ts'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'extended.ts'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'another.ts'), { type: FileType.TEMPORARY }); // Same as base

      const metrics = await detector.detect();
      
      // Should handle overlapping duplicates correctly
      expect(metrics.duplicatedLines).toBeGreaterThan(0);
      expect(metrics.percentage).toBe((metrics.duplicatedLines / metrics.totalLines) * 100);
      
      // Branch: processedLines.has(lineKey) check for avoiding double-counting
      expect(metrics.duplicatedLines).toBeLessThanOrEqual(metrics.totalLines);
    });

    async test('should cover edge cases in minimum threshold branches', async () => {
      const detector = new DuplicationDetector();
      const srcDir = path.join(tempDir, 'src');
      await await fileAPI.createDirectory(srcDir);

      // Branch 1: Code blocks below minimum line threshold (5 lines)
      const shortCode = `
class Short {
  method() { return 1; }
}`;

      // Branch 2: Code blocks below minimum token threshold (50 tokens)
      const fewTokens = `
class FewTokens {
  a() { return 1; }
  b() { return 2; }
  c() { return 3; }
  d() { return 4; }
}`;

      // Branch 3: Code blocks meeting both thresholds
      const validCode = `
class ValidForDuplication {
  private data: Map<string, any> = new Map();
  
  constructor() {
    this.data = new Map();
    console.log('Constructed');
  }
  
  addData(key: string, value: any): void {
    this.data.set(key, value);
    console.log('Data added');
  }
  
  getData(key: string): any {
    return this.data.get(key);
  }
}`;

      await await fileAPI.createFile(path.join(srcDir, 'short1.ts'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'short2.ts'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'few-tokens1.ts'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'few-tokens2.ts'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'valid1.ts'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(srcDir, 'valid2.ts'), { type: FileType.TEMPORARY });

      const metrics = await detector.detect();
      
      // Only validCode should be detected as duplicates (meets both thresholds)
      expect(metrics.duplicatedBlocks.length).toBeGreaterThan(0);
      
      // Verify that duplicated blocks have sufficient lines and tokens
      metrics.duplicatedBlocks.forEach(block => {
        expect(block.lines).toBeGreaterThanOrEqual(5);
        expect(block.tokens).toBeGreaterThanOrEqual(50);
      });
    });
  });

  async describe('Cross-Class Integration Branch Coverage', () => {
    async test('should cover ConfigManager environment type branches in system context', async () => {
      const configDir = path.join(tempDir, 'config');
      await await fileAPI.createDirectory(configDir);

      const config = {
        environments: {
          theme: { name: "Theme", port_range: [3000, 3099], base_path: "layer/themes", db_prefix: "theme", services: { portal: 3001 } },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: [],
        inter_theme_connections: {}
      };

      await fs.writeFile(path.join(configDir, 'environments.json'), JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);

      // Branch coverage: Different environment types
      const themeEnv = manager.getEnvironment('theme');
      expect(themeEnv.name).toBe('Theme');
      
      const epicEnv = manager.getEnvironment('epic'); 
      expect(epicEnv.name).toBe('Epic');
      
      const demoEnv = manager.getEnvironment('demo');
      expect(demoEnv.name).toBe('Demo');
      
      const releaseEnv = manager.getEnvironment('release');
      expect(releaseEnv.name).toBe('Release');

      // Branch coverage: Database type selection
      const postgresConfig = manager.getDatabaseConfig('theme', 'postgres');
      expect(postgresConfig.host).toBe('localhost');
      
      const sqliteConfig = manager.getDatabaseConfig('theme', 'sqlite');
      expect(sqliteConfig.data_dir).toBe('data');
    });

    async test('should cover CoverageAnalyzer data source branches in integration', async () => {
      const analyzer = new CoverageAnalyzer();

      // Branch 1: testResults.coverageMap exists
      const testResultsWithCoverageMap = {
        coverageMap: {
          '/test/file1.ts': {
            l: { '1': 1, '2': 0 },
            b: { '0': [1, 0] },
            f: { 'func1': 1 },
            fnMap: { 'func1': { name: 'TestClass.method' } },
            code: 'class TestClass { method() {} }'
          }
        }
      };

      const metrics1 = await analyzer.analyze(testResultsWithCoverageMap);
      expect(metrics1.line.total).toBe(2);

      // Branch 2: coverageMap doesn't exist, tries to load from file
      const coverageDir = path.join(tempDir, 'coverage');
      await await fileAPI.createDirectory(coverageDir);
      
      const coverageData = {
        '/test/file2.ts': {
          l: { '1': 1, '2': 1, '3': 0 },
          b: { '0': [1, 1], '1': [0, 1] },
          f: { 'func2': 1 },
          fnMap: { 'func2': { name: 'AnotherClass.method' } },
          code: 'class AnotherClass { method() {} }'
        }
      };
      
      await fs.writeFile(
        path.join(coverageDir, 'coverage-final.json'),
        JSON.stringify(coverageData, null, 2)
      );

      const testResultsWithoutCoverageMap = {};
      const metrics2 = await analyzer.analyze(testResultsWithoutCoverageMap);
      expect(metrics2.line.total).toBe(3);

      // Branch 3: Both coverageMap and file don't exist, falls back to testResults
      await fs.rm(path.join(coverageDir, 'coverage-final.json'));
      
      const fallbackTestResults = {
        '/test/file3.ts': {
          l: { '1': 0 },
          b: {},
          f: {},
          fnMap: {},
          code: 'const fallback = true;'
        }
      };
      
      const metrics3 = await analyzer.analyze(fallbackTestResults);
      expect(metrics3.line.total).toBe(1);
    });

    async test('should cover ThemeManager configuration loading branches', async () => {
      const themeManager = new ThemeManager({});
      
      const themesDir = path.join(tempDir, 'setup', 'themes');
      await await fileAPI.createDirectory(themesDir);

      // Branch 1: Theme config exists and is valid
      const validThemeConfig = {
        theme: {
          id: 'test-theme',
          testCriteria: {
            production: { coverage: { class: { minimum: 90 } } },
            demo: { coverage: { class: { minimum: 80 } } }
          }
        }
      };
      
      await fs.writeFile(
        path.join(themesDir, 'test-theme.theme.json'),
        JSON.stringify(validThemeConfig, null, 2)
      );

      const prodCriteria = await themeManager.getCriteria('test-theme', 'production');
      expect(prodCriteria.coverage.class.minimum).toBe(90);

      const demoCriteria = await themeManager.getCriteria('test-theme', 'demo');
      expect(demoCriteria.coverage.class.minimum).toBe(80);

      // Branch 2: Theme config doesn't exist (falls back to defaults)
      const defaultCriteria = await themeManager.getCriteria('non-existent-theme', 'production');
      expect(defaultCriteria.coverage.class.minimum).toBe(95); // Default value

      // Branch 3: Theme config exists but doesn't have criteria for requested mode
      const partialThemeConfig = {
        theme: {
          id: 'partial-theme',
          testCriteria: {
            production: { coverage: { class: { minimum: 85 } } }
            // Missing demo criteria
          }
        }
      };
      
      await fs.writeFile(
        path.join(themesDir, 'partial-theme.theme.json'),
        JSON.stringify(partialThemeConfig, null, 2)
      );

      const fallbackCriteria = await themeManager.getCriteria('partial-theme', 'demo');
      expect(fallbackCriteria.coverage.class.minimum).toBe(95); // Falls back to default
    });

    async test('should cover FraudChecker file analysis branches', async () => {
      const fraudChecker = new FraudChecker();
      
      const testsDir = path.join(tempDir, 'tests');
      await await fileAPI.createDirectory(testsDir);

      // Branch 1: Test file with empty tests
      const emptyTestContent = `
async describe('Empty Test Suite', () => {
  async it('empty test', () => {
    // This test is empty
  });
  
  async it('another empty test', () => {
  });
});`;

      await await fileAPI.createFile(path.join(testsDir, 'empty.test.ts'), { type: FileType.TEMPORARY });

      // Branch 2: Test file with skip/only patterns
      const skipOnlyTestContent = `
async describe('Skip Only Test Suite', () => {
  it.skip('skipped test', () => {
    expect(true).toBe(true);
  });
  
  it.only('only test', () => {
    expect(false).toBe(false);
  });
  
  describe.skip('skipped describe', () => {
    async it('test in skipped describe', () => {
      expect(1).toBe(1);
    });
  });
});`;

      await await fileAPI.createFile(path.join(testsDir, 'skip-only.test.ts'), { type: FileType.TEMPORARY });

      // Branch 3: Test file with fake assertions
      const fakeAssertionContent = `
async describe('Fake Assertion Suite', () => {
  async it('always true assertion', () => {
    expect(true).toBe(true);
  });
  
  async it('always false assertion', () => {
    expect(false).toBe(false);
  });
  
  async it('valid assertion', () => {
    const result = 2 + 2;
    expect(result).toBe(4);
  });
});`;

      await await fileAPI.createFile(path.join(testsDir, 'fake-assertions.test.ts'), { type: FileType.TEMPORARY });

      // Branch 4: Test file with coverage manipulation
      const coverageManipulationContent = `
async describe('Coverage Manipulation Suite', () => {
  async it('test with istanbul ignore', () => {
    /* istanbul ignore next */
    const uncovered = () => { return false; };
    expect(true).toBe(true);
  });
  
  async it('test with c8 ignore', () => {
    /* c8 ignore start */
    const alsoUncovered = () => { return false; };
    /* c8 ignore stop */
    expect(true).toBe(true);
  });
});`;

      await await fileAPI.createFile(path.join(testsDir, 'coverage-manipulation.test.ts'), { type: FileType.TEMPORARY });

      const result = await fraudChecker.check({});

      // Should detect various fraud patterns
      expect(result.violations.length).toBeGreaterThan(0);
      
      // Verify different violation types were detected
      const violationTypes = result.violations.map(v => v.type);
      expect(violationTypes).toContain('empty-tests');
      expect(violationTypes).toContain('disabled-tests');  
      expect(violationTypes).toContain('fake-assertions');
      expect(violationTypes).toContain('coverage-manipulation');
    });
  });

  async describe('Error Path Branch Coverage', () => {
    async test('should cover error handling branches across all classes', async () => {
      // Test error scenarios that trigger different error handling branches
      
      // 1. ConfigManager with invalid config
      const invalidConfigDir = path.join(tempDir, 'invalid-config');
      await await fileAPI.createDirectory(invalidConfigDir);
      await await fileAPI.createFile(path.join(invalidConfigDir, 'config', { type: FileType.TEMPORARY }),
        '{ invalid json }'
      );

      async expect(() => new ConfigManager(path.join(tempDir, 'invalid-config')))
        .toThrow(); // Error handling branch

      // 2. TestReportGenerator with schema validation errors
      const invalidSchema = { type: 'invalid-type' };
      const generator = new TestReportGenerator(invalidSchema);
      
      await expect(generator.generate({ any: 'data' }))
        .rejects.toThrow(); // Validation error branch

      // 3. DuplicationDetector with non-existent src directory
      const detectorWithoutSrc = new DuplicationDetector();
      const emptySrcDir = path.join(tempDir, 'no-src');
      process.chdir(emptySrcDir);
      
      await expect(detectorWithoutSrc.detect())
        .rejects.toThrow(); // File system error branch

      // 4. CoverageAnalyzer with corrupted coverage file
      process.chdir(tempDir);
      const corruptedCoverageDir = path.join(tempDir, 'coverage');
      await await fileAPI.createDirectory(corruptedCoverageDir);
      await await fileAPI.createFile(path.join(corruptedCoverageDir, 'coverage-final.json'), { type: FileType.TEMPORARY });

      const analyzer = new CoverageAnalyzer();
      const metrics = await analyzer.analyze({}); // Should fallback gracefully
      expect(typeof metrics.line.percentage).toBe('number');

      // 5. ThemeManager with inaccessible themes directory
      const restrictedThemesDir = path.join(tempDir, 'setup', 'restricted-themes');
      await fs.mkdir(restrictedThemesDir, { recursive: true, mode: 0o000 });

      const themeManager = new ThemeManager({});
      
      try {
        const themes = await themeManager.listThemes();
        expect(themes).toEqual([]); // Error handling branch returns empty array
      } finally {
        await fs.chmod(restrictedThemesDir, 0o755); // Restore for cleanup
      }
    });
  });
});