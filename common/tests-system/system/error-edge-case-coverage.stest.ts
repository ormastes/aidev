import { ConfigManager } from '../../config/ConfigManager';
import { CoverageAnalyzer } from '../../setup/test-env/coverage-analyzer';
import { ThemeManager } from '../../setup/test-env/theme-manager';
import { FraudChecker } from '../../setup/test-env/fraud-checker';
import { DuplicationDetector } from '../../setup/test-env/duplication-detector';
import { ReportGenerator } from '../../setup/test-env/report-generator';
import * as fs from 'fs/promises';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

describe('Error Handling and Edge Case Coverage Tests', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'error-edge-test-'));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    process.chdir(tempDir);
  });

  describe('ConfigManager Error Handling', () => {
    test('should handle missing configuration file', () => {
      async expect(() => {
        new ConfigManager('/completely/non/existent/path');
      }).toThrow();
    });

    test('should handle malformed JSON configuration', async () => {
      const configDir = path.join(tempDir, 'config');
      await fileAPI.createDirectory(configDir);
      
      // Create malformed JSON
      await fs.writeFile(
        path.join(configDir, 'environments.json'),
        '{ "malformed": json, content }'
      );

      async expect(() => {
        new ConfigManager(tempDir);
      }).toThrow();
    });

    test('should handle configuration with missing required fields', async () => {
      const configDir = path.join(tempDir, 'config');
      await fileAPI.createDirectory(configDir);
      
      // Create config missing environments
      const incompleteConfig = {
        database: { postgres: { host: "localhost", port: 5432, ssl: false } },
        themes: []
      };

      await fs.writeFile(
        path.join(configDir, 'environments.json'),
        JSON.stringify(incompleteConfig, null, 2)
      );

      async expect(() => {
        const manager = new ConfigManager(tempDir);
        manager.getEnvironment('theme'); // Should fail
      }).toThrow();
    });

    test('should handle configuration with invalid environment names', async () => {
      const configDir = path.join(tempDir, 'config');
      await fileAPI.createDirectory(configDir);
      
      const validConfig = {
        environments: {
          theme: { name: "Theme", port_range: [3000, 3099], base_path: "layer/themes", db_prefix: "theme", services: { portal: 3001, story_reporter: 3002, gui_selector: 3003, auth_service: 3004, db_service: 3005 } },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: [],
        inter_theme_connections: {}
      };

      await fs.writeFile(
        path.join(configDir, 'environments.json'),
        JSON.stringify(validConfig, null, 2)
      );

      const manager = new ConfigManager(tempDir);

      async expect(() => {
        manager.getEnvironment('invalid' as any);
      }).toThrow();

      async expect(() => {
        manager.getServicePort('invalid' as any, 'portal');
      }).toThrow();

      async expect(() => {
        manager.getDatabaseConfig('invalid' as any, 'postgres');
      }).toThrow();
    });

    test('should handle configuration with invalid service names', async () => {
      const configDir = path.join(tempDir, 'config');
      await fileAPI.createDirectory(configDir);
      
      const validConfig = {
        environments: {
          theme: { name: "Theme", port_range: [3000, 3099], base_path: "layer/themes", db_prefix: "theme", services: { portal: 3001, story_reporter: 3002, gui_selector: 3003, auth_service: 3004, db_service: 3005 } },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: [],
        inter_theme_connections: {}
      };

      await fs.writeFile(
        path.join(configDir, 'environments.json'),
        JSON.stringify(validConfig, null, 2)
      );

      const manager = new ConfigManager(tempDir);

      async expect(() => {
        manager.getServicePort('theme', 'invalid_service' as any);
      }).toThrow();
    });

    test('should handle file system errors during env file creation', async () => {
      const configDir = path.join(tempDir, 'config');
      await fileAPI.createDirectory(configDir);
      
      const validConfig = {
        environments: {
          theme: { name: "Theme", port_range: [3000, 3099], base_path: "layer/themes", db_prefix: "theme", services: { portal: 3001, story_reporter: 3002, gui_selector: 3003, auth_service: 3004, db_service: 3005 } },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: [],
        inter_theme_connections: {}
      };

      await fs.writeFile(
        path.join(configDir, 'environments.json'),
        JSON.stringify(validConfig, null, 2)
      );

      const manager = new ConfigManager(tempDir);

      // Try to save to read-only directory
      const readOnlyDir = path.join(tempDir, 'readonly');
      await fileAPI.createDirectory(readOnlyDir);
      
      const readOnlyPath = path.join(readOnlyDir, 'test.env');
      
      async expect(async () => {
        manager.saveEnvFile('theme', 'portal', readOnlyPath);
      }).rejects.toThrow();

      // Restore permissions for cleanup
      await fs.chmod(readOnlyDir, 0o755);
    });

    test('should handle extreme port range configurations', async () => {
      const configDir = path.join(tempDir, 'config');
      await fileAPI.createDirectory(configDir);
      
      // Config with inverted port range (max < min)
      const invertedConfig = {
        environments: {
          theme: { 
            name: "Inverted", 
            port_range: [3099, 3000], // Invalid: max < min
            base_path: "layer/themes", 
            db_prefix: "theme", 
            services: { portal: 3001 } 
          },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: [],
        inter_theme_connections: {}
      };

      await fs.writeFile(
        path.join(configDir, 'environments.json'),
        JSON.stringify(invertedConfig, null, 2)
      );

      const manager = new ConfigManager(tempDir);
      
      // This should handle the invalid range gracefully
      const port = manager.getNextAvailablePort('theme');
      expect(port).toBeNull(); // No valid ports in inverted range
    });
  });

  describe('CoverageAnalyzer Error Handling', () => {
    test('should handle corrupted coverage files', async () => {
      const coverageDir = path.join(tempDir, 'coverage');
      await fileAPI.createDirectory(coverageDir);
      
      // Create corrupted coverage file
      await fileAPI.createFile(path.join(coverageDir, 'coverage-final.json'), { type: FileType.TEMPORARY });

      const analyzer = new CoverageAnalyzer();
      
      // Should fall back to test results when coverage file is corrupted
      const metrics = await analyzer.analyze({
        '/test/fallback.ts': {
          l: { '1': 1, '2': 0 },
          b: { '0': [1, 0] },
          f: { 'func1': 1 },
          fnMap: { 'func1': { name: 'TestClass.method' } },
          code: 'class TestClass { method() {} }'
        }
      });

      expect(metrics.line.total).toBe(2);
      expect(metrics.line.covered).toBe(1);
    });

    test('should handle extremely large coverage data', async () => {
      const analyzer = new CoverageAnalyzer();
      
      // Create artificially large coverage data
      const largeCoverageData: any = {};
      
      // Generate 1000 files with coverage data
      for (let i = 0; i < 1000; i++) {
        const filename = `/test/file${i}.ts`;
        largeCoverageData[filename] = {
          l: Array.from({ length: 100 }, (_, idx) => ({ [idx + 1]: Math.random() > 0.5 ? 1 : 0 })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
          b: Array.from({ length: 50 }, (_, idx) => ({ [idx]: [Math.random() > 0.5 ? 1 : 0, Math.random() > 0.5 ? 1 : 0] })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
          f: Array.from({ length: 20 }, (_, idx) => ({ [`func${idx}`]: Math.random() > 0.5 ? 1 : 0 })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
          fnMap: Array.from({ length: 20 }, (_, idx) => ({ [`func${idx}`]: { name: `Class${i}.method${idx}` } })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
          code: `class Class${i} { ${Array.from({ length: 20 }, (_, idx) => `method${idx}() {}`).join(' ')} }`
        };
      }

      // Should handle large data without crashing
      const metrics = await analyzer.analyze({ coverageMap: largeCoverageData });
      
      expect(metrics.class.total).toBeGreaterThan(0);
      expect(metrics.line.total).toBeGreaterThan(0);
      expect(metrics.branch.total).toBeGreaterThan(0);
      expect(metrics.method.total).toBeGreaterThan(0);
    });

    test('should handle malformed coverage data structures', async () => {
      const analyzer = new CoverageAnalyzer();
      
      const malformedData = {
        '/test/malformed1.ts': {
          l: 'not an object',
          b: 12345,
          f: [],
          fnMap: 'invalid',
          code: null
        },
        '/test/malformed2.ts': {
          l: { 'non-numeric-key': 1, '2': 'non-numeric-value' },
          b: { '0': 'not-an-array', '1': [1, 'non-numeric'] },
          f: { 'func1': 'not-a-number', 'func2': null },
          fnMap: { 'func1': 'not-an-object', 'func2': { name: 123 } },
          code: undefined
        },
        'not-a-file-path': null,
        '/test/circular.ts': null
      };

      // Add circular reference
      const circular: any = { circular: null };
      circular.circular = circular;
      malformedData['/test/circular.ts'] = circular;

      // Should handle malformed data gracefully
      const metrics = await analyzer.analyze({ coverageMap: malformedData });
      
      expect(typeof metrics.class.percentage).toBe('number');
      expect(typeof metrics.line.percentage).toBe('number');
      expect(typeof metrics.branch.percentage).toBe('number');
      expect(typeof metrics.method.percentage).toBe('number');
    });

    test('should handle coverage data with special characters in filenames', async () => {
      const analyzer = new CoverageAnalyzer();
      
      const specialCharData = {
        '/test/file with spaces.ts': {
          l: { '1': 1 },
          b: { '0': [1, 0] },
          f: { 'method': 1 },
          fnMap: { 'method': { name: 'SpecialClass.method' } },
          code: 'class SpecialClass { method() {} }'
        },
        '/test/file-with-unicode-🚀.ts': {
          l: { '1': 1 },
          b: { '0': [1, 1] },
          f: { 'unicodeMethod': 1 },
          fnMap: { 'unicodeMethod': { name: 'UnicodeClass.unicodeMethod' } },
          code: 'class UnicodeClass { unicodeMethod() {} }'
        },
        '/test/file.with.dots.ts': {
          l: { '1': 0 },
          b: {},
          f: { 'dotMethod': 0 },
          fnMap: { 'dotMethod': { name: 'DotClass.dotMethod' } },
          code: 'class DotClass { dotMethod() {} }'
        }
      };

      const metrics = await analyzer.analyze({ coverageMap: specialCharData });
      
      expect(metrics.class.total).toBe(3);
      expect(metrics.class.covered).toBe(2); // Two classes have tested methods
    });
  });

  describe('ThemeManager Error Handling', () => {
    test('should handle inaccessible themes directory', async () => {
      // Create directory without read permissions
      const restrictedDir = path.join(tempDir, 'setup', 'themes');
      await fs.mkdir(restrictedDir, { recursive: true, mode: 0o000 });

      const themeManager = new ThemeManager({});
      
      // Should return empty array when directory is inaccessible
      const themes = await themeManager.listThemes();
      expect(themes).toEqual([]);

      // Should return default criteria when theme cannot be loaded
      const criteria = await themeManager.getCriteria('any-theme', 'production');
      expect(criteria.coverage.class.minimum).toBe(95); // Default value

      // Restore permissions for cleanup
      await fs.chmod(restrictedDir, 0o755);
    });

    test('should handle extremely large theme configuration files', async () => {
      const themesDir = path.join(tempDir, 'setup', 'themes');
      await fileAPI.createDirectory(themesDir);
      
      // Create very large theme config
      const largeTheme = {
        theme: {
          id: 'large-theme',
          name: 'Large Theme',
          testCriteria: {
            production: { coverage: { class: { minimum: 90 } } }
          },
          epics: Array.from({ length: 1000 }, (_, i) => ({
            id: `epic-${i}`,
            name: `Epic ${i}`,
            userStories: Array.from({ length: 100 }, (_, j) => ({
              id: `story-${i}-${j}`,
              description: `Story ${j} in Epic ${i}`,
              acceptanceCriteria: Array.from({ length: 10 }, (_, k) => `Criteria ${k}`)
            }))
          }))
        }
      };

      await fs.writeFile(
        path.join(themesDir, 'large-theme.theme.json'),
        JSON.stringify(largeTheme, null, 2)
      );

      const themeManager = new ThemeManager({});
      
      // Should handle large files without issues
      const criteria = await themeManager.getCriteria('large-theme', 'production');
      expect(criteria.coverage.class.minimum).toBe(90);
      
      const epicInfo = await themeManager.getEpicInfo('large-theme');
      expect(epicInfo).toBeDefined();
      expect(epicInfo.epics).toHaveLength(1000);
    });

    test('should handle theme files with invalid JSON structure', async () => {
      const themesDir = path.join(tempDir, 'setup', 'themes');
      await fileAPI.createDirectory(themesDir);
      
      const invalidStructures = [
        '{"theme": "not an object"}',
        '{"theme": {"testCriteria": "not an object"}}',
        '{"theme": {"testCriteria": {"production": "not an object"}}}',
        '{"theme": {"epics": "not an array"}}',
        '{"theme": {"epics": [{"userStories": "not an array"}]}}',
        'null',
        '[]',
        '"just a string"',
        '{"completely": {"different": "structure"}}'
      ];

      const themeManager = new ThemeManager({});

      for (let i = 0; i < invalidStructures.length; i++) {
        const filename = `invalid-${i}.theme.json`;
        await fileAPI.createFile(path.join(themesDir, filename), { type: FileType.TEMPORARY });
        
        // Should return defaults for invalid structures
        const criteria = await themeManager.getCriteria(`invalid-${i}`, 'production');
        expect(criteria.coverage.class.minimum).toBe(95); // Default
        
        const epicInfo = await themeManager.getEpicInfo(`invalid-${i}`);
        expect(epicInfo).toBeUndefined();
      }
    });

    test('should handle concurrent access to theme configurations', async () => {
      const themesDir = path.join(tempDir, 'setup', 'themes');
      await fileAPI.createDirectory(themesDir);
      
      const concurrentTheme = {
        theme: {
          id: 'concurrent-theme',
          testCriteria: {
            production: { coverage: { class: { minimum: 85 } } }
          }
        }
      };

      await fs.writeFile(
        path.join(themesDir, 'concurrent-theme.theme.json'),
        JSON.stringify(concurrentTheme, null, 2)
      );

      const themeManager = new ThemeManager({});
      
      // Make multiple concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        themeManager.getCriteria('concurrent-theme', 'production')
      );

      const results = await Promise.all(promises);
      
      // All results should be the same
      results.forEach(result => {
        expect(result.coverage.class.minimum).toBe(85);
      });
    });
  });

  describe('FraudChecker Error Handling', () => {
    test('should handle inaccessible test directories', async () => {
      // Create test directory without read permissions
      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir, { recursive: true, mode: 0o000 });

      const fraudChecker = new FraudChecker();
      
      // Should handle inaccessible directories gracefully
      const result = await fraudChecker.check({});
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toHaveLength(0);

      // Restore permissions for cleanup
      await fs.chmod(testDir, 0o755);
    });

    test('should handle extremely large test files', async () => {
      const testDir = path.join(tempDir, 'tests');
      await fileAPI.createDirectory(testDir);
      
      // Create very large test file
      let largeTestContent = 'describe("Large Test Suite", () => {\n';
      
      // Add 10000 test cases
      for (let i = 0; i < 10000; i++) {
        largeTestContent += `  it('test ${i}', () => { expect(${i}).toBe(${i}); });\n`;
      }
      
      largeTestContent += '});';

      await fileAPI.createFile(path.join(testDir, 'large.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      
      // Should handle large files without performance issues
      const startTime = Date.now();
      const result = await fraudChecker.check({});
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should handle test files with binary content', async () => {
      const testDir = path.join(tempDir, 'tests');
      await fileAPI.createDirectory(testDir);
      
      // Create file with binary content
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD]);
      await fileAPI.createFile(path.join(testDir, 'binary.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      
      // Should handle binary files gracefully
      const result = await fraudChecker.check({});
      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
    });

    test('should handle test files with extremely long lines', async () => {
      const testDir = path.join(tempDir, 'tests');
      await fileAPI.createDirectory(testDir);
      
      // Create test with very long line
      const longLine = 'a'.repeat(1000000); // 1MB line
      const longLineContent = `
describe('Long Line Test', () => {
  it('test with long line', () => {
    const longString = '${longLine}';
    expect(longString.length).toBe(1000000);
  });
});
`;

      await fileAPI.createFile(path.join(testDir, 'long-line.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      
      // Should handle long lines without issues
      const result = await fraudChecker.check({});
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should handle regex pattern edge cases', async () => {
      const testDir = path.join(tempDir, 'tests');
      await fileAPI.createDirectory(testDir);
      
      // Create test file with edge cases that might break regex patterns
      const edgeCaseContent = `
describe('Edge Case Test', () => {
  // Test with nested quotes and special characters
  it('test with "nested" and 'mixed' quotes', () => {
    expect(true).toBe(true); // This should be detected
  });
  
  // Test with regex special characters
  it('test with regex chars []{}()*+?.^$|\\', () => {
    const result = /[]{}()*+?.^$|\\/.test('test');
    expect(result).toBe(false);
  });
  
  // Test with very similar but not exact patterns
  it('almost empty but not quite', () => {
    // This comment prevents it from being truly empty
  });
  
  // Test with unicode characters
  it('unicode test 🎉', () => {
    expect('🚀').toBe('🚀');
  });
  
  // Test with escape sequences
  it('escape \\t\\n\\r test', () => {
    expect('\\t').toBe('\\t');
  });
});
`;

      await fileAPI.createFile(path.join(testDir, 'edge-case.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      // Should detect the always-true assertion but handle other edge cases
      expect(result.violations.length).toBeGreaterThan(0);
      const alwaysTrueViolations = result.violations.filter(v => 
        v.type === 'fake-assertions' && v.message.includes('Always-true')
      );
      expect(alwaysTrueViolations.length).toBe(1);
    });
  });

  describe('Integration Error Handling', () => {
    test('should handle system-wide errors gracefully', async () => {
      // Create a scenario with multiple failing components
      const errorPaths = {
        config: path.join(tempDir, 'config'),
        themes: path.join(tempDir, 'setup', 'themes'),
        tests: path.join(tempDir, 'tests'),
        coverage: path.join(tempDir, 'coverage')
      };

      // Create directories
      for (const dir of Object.values(errorPaths)) {
        await fileAPI.createDirectory(dir);
      }

      // Create invalid config
      await fileAPI.createFile(path.join(errorPaths.config, 'environments.json'), { type: FileType.TEMPORARY });

      // Create inaccessible themes directory
      await fs.chmod(errorPaths.themes, 0o000);

      // Create corrupted coverage file
      await fileAPI.createFile(path.join(errorPaths.coverage, 'coverage-final.json'), { type: FileType.TEMPORARY });

      // Create test file with fraud
      await fs.writeFile(
        path.join(errorPaths.tests, 'fraud.test.ts'),
        'describe("Fraud", () => { it("fake", () => { expect(true).toBe(true); }); });'
      );

      // Test each component individually
      async expect(() => new ConfigManager(tempDir)).toThrow();

      const themeManager = new ThemeManager({});
      const themes = await themeManager.listThemes();
      expect(themes).toEqual([]);

      const coverageAnalyzer = new CoverageAnalyzer();
      const metrics = await coverageAnalyzer.analyze({});
      expect(metrics.line.percentage).toBe(0);

      const fraudChecker = new FraudChecker();
      const fraudResult = await fraudChecker.check({});
      expect(fraudResult.passed).toBe(false);

      // Restore permissions for cleanup
      await fs.chmod(errorPaths.themes, 0o755);
    });

    test('should handle resource exhaustion scenarios', async () => {
      // Test with many concurrent operations
      const operations = [];
      
      for (let i = 0; i < 100; i++) {
        const themeManager = new ThemeManager({});
        operations.push(themeManager.getCriteria('non-existent', 'production'));
        
        const fraudChecker = new FraudChecker();
        operations.push(fraudChecker.check({}));
        
        const coverageAnalyzer = new CoverageAnalyzer();
        operations.push(coverageAnalyzer.analyze({}));
      }

      // All operations should complete without throwing
      const results = await Promise.allSettled(operations);
      
      // Count successful operations
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // At least some operations should succeed
      expect(successful).toBeGreaterThan(0);
      
      // Log any failures for debugging (but don't fail the test)
      if (failed > 0) {
        console.warn(`${failed} operations failed out of ${operations.length}`);
      }
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('should handle memory-intensive operations', async () => {
      // Monitor memory usage during operations
      const initialMemory = process.memoryUsage();
      
      // Create large data structures
      const largeCoverageData: any = {};
      for (let i = 0; i < 5000; i++) {
        largeCoverageData[`/test/file${i}.ts`] = {
          l: Object.fromEntries(Array.from({ length: 1000 }, (_, j) => [j + 1, Math.random() > 0.5 ? 1 : 0])),
          b: Object.fromEntries(Array.from({ length: 200 }, (_, j) => [j, [Math.random() > 0.5 ? 1 : 0, Math.random() > 0.5 ? 1 : 0]])),
          f: Object.fromEntries(Array.from({ length: 100 }, (_, j) => [`func${j}`, Math.random() > 0.5 ? 1 : 0])),
          fnMap: Object.fromEntries(Array.from({ length: 100 }, (_, j) => [`func${j}`, { name: `Class${i}.method${j}` }])),
          code: `class Class${i} { ${Array.from({ length: 100 }, (_, j) => `method${j}() {}`).join(' ')} }`
        };
      }

      const coverageAnalyzer = new CoverageAnalyzer();
      const metrics = await coverageAnalyzer.analyze({ coverageMap: largeCoverageData });
      
      expect(metrics).toBeDefined();
      expect(metrics.class.total).toBeGreaterThan(0);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 500MB)
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);
    });

    test('should handle timeout scenarios', async () => {
      // Create operations that might timeout
      const timeoutTests = [];
      
      for (let i = 0; i < 10; i++) {
        // Each operation should complete within reasonable time
        const timeoutPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Operation timed out'));
          }, 30000); // 30 second timeout
          
          const coverageAnalyzer = new CoverageAnalyzer();
          coverageAnalyzer.analyze({}).then(result => {
            clearTimeout(timeout);
            resolve(result);
          }).catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        
        timeoutTests.push(timeoutPromise);
      }

      // All operations should complete within timeout
      const results = await Promise.allSettled(timeoutTests);
      const timedOut = results.filter(r => r.status === 'rejected' && 
        r.reason.message.includes('timed out')).length;
      
      expect(timedOut).toBe(0); // No operations should timeout
    });
  });
});