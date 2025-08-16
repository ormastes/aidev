import { CoverageAnalyzer } from '../../setup/test-env/coverage-analyzer';
import { fs } from '../../../layer/themes/infra_external-log-lib/dist';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

describe('CoverageAnalyzer System Tests', () => {
  let coverageAnalyzer: CoverageAnalyzer;
  let tempDir: string;
  let coverageDir: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-test-'));
    coverageDir = path.join(tempDir, 'coverage');
    await fileAPI.createDirectory(coverageDir);
    coverageAnalyzer = new CoverageAnalyzer();
  });

  afterAll(async () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Change working directory to temp dir for tests
    process.chdir(tempDir);
  });

  describe('Coverage Data Loading', () => {
    test('should load coverage data from file system', async () => {
      const mockCoverageData = {
        '/path/to/file1.ts': {
          l: { '1': 1, '2': 0, '3': 1, '4': 2 },
          b: { '0': [1, 0], '1': [2, 1] },
          f: { 'func1': 1, 'func2': 0, 'func3': 2 },
          fnMap: {
            'func1': { name: 'TestClass.method1' },
            'func2': { name: 'TestClass.method2' },
            'func3': { name: 'AnotherClass.method1' }
          },
          code: 'class TestClass { method1() {} method2() {} } class AnotherClass { method1() {} }'
        },
        '/path/to/file2.ts': {
          l: { '1': 1, '2': 1, '3': 0 },
          b: { '0': [1, 1], '1': [0, 0] },
          f: { 'func1': 1, 'func2': 1 },
          fnMap: {
            'func1': { name: 'UtilClass.helper' },
            'func2': { name: 'UtilClass.process' }
          },
          code: 'class UtilClass { helper() {} process() {} }'
        }
      };

      const coverageFile = path.join(coverageDir, 'coverage-final.json');
      await fileAPI.createFile(coverageFile, JSON.stringify(mockCoverageData, { type: FileType.TEMPORARY }));

      const testResults = {};
      const metrics = await coverageAnalyzer.analyze(testResults);

      expect(metrics).toBeDefined();
      expect(metrics.class).toBeDefined();
      expect(metrics.branch).toBeDefined();
      expect(metrics.line).toBeDefined();
      expect(metrics.method).toBeDefined();
    });

    test('should handle missing coverage file gracefully', async () => {
      // Remove coverage file if it exists
      const coverageFile = path.join(coverageDir, 'coverage-final.json');
      if (fs.existsSync(coverageFile)) {
        fs.unlinkSync(coverageFile);
      }

      const testResults = {
        '/test/file.ts': {
          l: { '1': 1, '2': 0 },
          b: { '0': [1, 0] },
          f: { 'func1': 1 },
          fnMap: { 'func1': { name: 'TestClass.method' } },
          code: 'class TestClass { method() {} }'
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      expect(metrics).toBeDefined();
      expect(metrics.line.total).toBeGreaterThan(0);
    });

    test('should use coverageMap from test results when available', async () => {
      const testResults = {
        coverageMap: {
          '/test/file.ts': {
            l: { '1': 1, '2': 1, '3': 1 },
            b: { '0': [1, 1] },
            f: { 'func1': 1 },
            fnMap: { 'func1': { name: 'TestClass.method' } },
            code: 'class TestClass { method() {} }'
          }
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      expect(metrics.line.percentage).toBe(100);
      expect(metrics.branch.percentage).toBe(100);
    });
  });

  describe('Class Coverage Analysis', () => {
    test('should accurately calculate class coverage', async () => {
      const testResults = {
        '/test/classes.ts': {
          l: { '1': 1, '2': 1, '3': 0, '4': 0 },
          b: {},
          f: { 'TestedClass.method1': 2, 'TestedClass.method2': 1, 'UntestedClass.method1': 0 },
          fnMap: {
            'TestedClass.method1': { name: 'TestedClass.method1' },
            'TestedClass.method2': { name: 'TestedClass.method2' },
            'UntestedClass.method1': { name: 'UntestedClass.method1' }
          },
          code: `
            class TestedClass {
              method1() { return 'tested'; }
              method2() { return 'also tested'; }
            }
            class UntestedClass {
              method1() { return 'not tested'; }
            }
            class AnotherUntestedClass {
              method1() { return 'also not tested'; }
            }
          `
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      
      // Should detect 3 classes total
      expect(metrics.class.total).toBe(3);
      // Only TestedClass should be considered covered (has tested methods)
      expect(metrics.class.covered).toBe(1);
      expect(metrics.class.percentage).toBeCloseTo(33.33, 1);
    });

    test('should handle files with no classes', async () => {
      const testResults = {
        '/test/utils.ts': {
          l: { '1': 1, '2': 1 },
          b: {},
          f: { 'utilFunction': 1, 'helperFunction': 0 },
          fnMap: {
            'utilFunction': { name: 'utilFunction' },
            'helperFunction': { name: 'helperFunction' }
          },
          code: `
            function utilFunction() { return 'util'; }
            function helperFunction() { return 'helper'; }
          `
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      expect(metrics.class.total).toBe(0);
      expect(metrics.class.covered).toBe(0);
      expect(metrics.class.percentage).toBe(0);
    });
  });

  describe('Branch Coverage Analysis', () => {
    test('should accurately calculate branch coverage', async () => {
      const testResults = {
        '/test/branches.ts': {
          l: { '1': 1, '2': 1, '3': 1 },
          b: {
            '0': [1, 0], // if-else: if branch taken, else not taken
            '1': [2, 2], // another if-else: both branches taken
            '2': [0, 0], // untested if-else: neither branch taken
            '3': [1, 1, 0] // switch statement: 2 of 3 cases taken
          },
          f: { 'testFunction': 1 },
          fnMap: { 'testFunction': { name: 'testFunction' } },
          code: `
            function testFunction(x, y) {
              if (x > 0) return 'positive';
              else return 'non-positive';
              
              if (y > 0) return 'y positive';
              else return 'y non-positive';
              
              if (false) return 'never';
              else return 'also never';
              
              switch(x) {
                case 1: return 'one';
                case 2: return 'two';
                case 3: return 'three';
              }
            }
          `
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      
      // Total branches: 2 + 2 + 2 + 3 = 9
      expect(metrics.branch.total).toBe(9);
      // Covered branches: 1 + 2 + 0 + 2 = 5
      expect(metrics.branch.covered).toBe(5);
      expect(metrics.branch.percentage).toBeCloseTo(55.56, 1);
    });

    test('should handle files with no branches', async () => {
      const testResults = {
        '/test/simple.ts': {
          l: { '1': 1, '2': 1 },
          b: {},
          f: { 'simpleFunction': 1 },
          fnMap: { 'simpleFunction': { name: 'simpleFunction' } },
          code: `
            function simpleFunction() {
              return 'no branches here';
            }
          `
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      expect(metrics.branch.total).toBe(0);
      expect(metrics.branch.covered).toBe(0);
      expect(metrics.branch.percentage).toBe(0);
    });
  });

  describe('Line Coverage Analysis', () => {
    test('should accurately calculate line coverage', async () => {
      const testResults = {
        '/test/lines.ts': {
          l: {
            '1': 2,  // executed 2 times
            '2': 1,  // executed 1 time
            '3': 0,  // not executed
            '4': 0,  // not executed
            '5': 1   // executed 1 time
          },
          b: {},
          f: { 'testFunction': 1 },
          fnMap: { 'testFunction': { name: 'testFunction' } },
          code: 'function testFunction() { /* code */ }'
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      
      expect(metrics.line.total).toBe(5);
      expect(metrics.line.covered).toBe(3); // lines 1, 2, and 5
      expect(metrics.line.percentage).toBe(60);
    });

    test('should handle empty line coverage data', async () => {
      const testResults = {
        '/test/empty.ts': {
          l: {},
          b: {},
          f: {},
          fnMap: {},
          code: ''
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      expect(metrics.line.total).toBe(0);
      expect(metrics.line.covered).toBe(0);
      expect(metrics.line.percentage).toBe(0);
    });
  });

  describe('Method Coverage Analysis', () => {
    test('should accurately calculate method coverage', async () => {
      const testResults = {
        '/test/methods.ts': {
          l: { '1': 1, '2': 1, '3': 0 },
          b: {},
          f: {
            'method1': 3,  // executed 3 times
            'method2': 1,  // executed 1 time
            'method3': 0,  // not executed
            'method4': 0,  // not executed
            'method5': 2   // executed 2 times
          },
          fnMap: {
            'method1': { name: 'Class1.method1' },
            'method2': { name: 'Class1.method2' },
            'method3': { name: 'Class2.method3' },
            'method4': { name: 'Class2.method4' },
            'method5': { name: 'Class3.method5' }
          },
          code: 'class definitions here'
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      
      expect(metrics.method.total).toBe(5);
      expect(metrics.method.covered).toBe(3); // method1, method2, method5
      expect(metrics.method.percentage).toBe(60);
    });

    test('should handle files with no methods', async () => {
      const testResults = {
        '/test/constants.ts': {
          l: { '1': 1, '2': 1 },
          b: {},
          f: {},
          fnMap: {},
          code: `
            const CONSTANT1 = 'value1';
            const CONSTANT2 = 'value2';
          `
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      expect(metrics.method.total).toBe(0);
      expect(metrics.method.covered).toBe(0);
      expect(metrics.method.percentage).toBe(0);
    });
  });

  describe('Comprehensive Coverage Analysis', () => {
    test('should analyze multiple files with complex coverage scenarios', async () => {
      const testResults = {
        '/src/core/ConfigManager.ts': {
          l: { '1': 1, '2': 1, '3': 0, '4': 1, '5': 0, '6': 1 },
          b: { '0': [1, 0], '1': [1, 1], '2': [0, 0] },
          f: { 'ConfigManager.loadConfig': 1, 'ConfigManager.getEnvironment': 2, 'ConfigManager.validateConfig': 0 },
          fnMap: {
            'ConfigManager.loadConfig': { name: 'ConfigManager.loadConfig' },
            'ConfigManager.getEnvironment': { name: 'ConfigManager.getEnvironment' },
            'ConfigManager.validateConfig': { name: 'ConfigManager.validateConfig' }
          },
          code: 'class ConfigManager { loadConfig() {} getEnvironment() {} validateConfig() {} }'
        },
        '/src/utils/helpers.ts': {
          l: { '1': 2, '2': 2, '3': 1, '4': 1 },
          b: { '0': [1, 1], '1': [2, 0] },
          f: { 'formatString': 2, 'parseData': 1, 'validateInput': 0 },
          fnMap: {
            'formatString': { name: 'formatString' },
            'parseData': { name: 'parseData' },
            'validateInput': { name: 'validateInput' }
          },
          code: 'function formatString() {} function parseData() {} function validateInput() {}'
        },
        '/src/services/ApiClient.ts': {
          l: { '1': 0, '2': 0, '3': 0 },
          b: { '0': [0, 0] },
          f: { 'ApiClient.request': 0, 'ApiClient.handleError': 0 },
          fnMap: {
            'ApiClient.request': { name: 'ApiClient.request' },
            'ApiClient.handleError': { name: 'ApiClient.handleError' }
          },
          code: 'class ApiClient { request() {} handleError() {} }'
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);

      // Verify overall metrics make sense
      expect(metrics.class.total).toBe(2); // ConfigManager and ApiClient
      expect(metrics.class.covered).toBe(1); // Only ConfigManager has tested methods
      expect(metrics.class.percentage).toBe(50);

      expect(metrics.line.total).toBe(13); // 6 + 4 + 3
      expect(metrics.line.covered).toBe(8); // 4 + 4 + 0
      expect(metrics.line.percentage).toBeCloseTo(61.54, 1);

      expect(metrics.branch.total).toBe(8); // 2+2+2 + 2+2 + 2
      expect(metrics.branch.covered).toBe(5); // 1+1+0 + 1+1 + 0
      expect(metrics.branch.percentage).toBe(62.5);

      expect(metrics.method.total).toBe(8); // 3 + 3 + 2
      expect(metrics.method.covered).toBe(4); // 2 + 2 + 0
      expect(metrics.method.percentage).toBe(50);
    });

    test('should handle edge case with perfect coverage', async () => {
      const testResults = {
        '/test/perfect.ts': {
          l: { '1': 1, '2': 2, '3': 1 },
          b: { '0': [1, 1], '1': [2, 1] },
          f: { 'method1': 1, 'method2': 2 },
          fnMap: {
            'method1': { name: 'PerfectClass.method1' },
            'method2': { name: 'PerfectClass.method2' }
          },
          code: 'class PerfectClass { method1() {} method2() {} }'
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);

      expect(metrics.class.percentage).toBe(100);
      expect(metrics.line.percentage).toBe(100);
      expect(metrics.branch.percentage).toBe(100);
      expect(metrics.method.percentage).toBe(100);
    });

    test('should handle edge case with zero coverage', async () => {
      const testResults = {
        '/test/uncovered.ts': {
          l: { '1': 0, '2': 0, '3': 0 },
          b: { '0': [0, 0], '1': [0, 0] },
          f: { 'method1': 0, 'method2': 0 },
          fnMap: {
            'method1': { name: 'UncoveredClass.method1' },
            'method2': { name: 'UncoveredClass.method2' }
          },
          code: 'class UncoveredClass { method1() {} method2() {} }'
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);

      expect(metrics.class.percentage).toBe(0);
      expect(metrics.line.percentage).toBe(0);
      expect(metrics.branch.percentage).toBe(0);
      expect(metrics.method.percentage).toBe(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle malformed coverage data gracefully', async () => {
      const testResults = {
        '/test/malformed.ts': {
          l: null,
          b: undefined,
          f: 'not an object',
          fnMap: [],
          code: null
        }
      };

      const metrics = await coverageAnalyzer.analyze(testResults);
      
      // Should not throw and return reasonable defaults
      expect(metrics).toBeDefined();
      expect(typeof metrics.class.percentage).toBe('number');
      expect(typeof metrics.line.percentage).toBe('number');
      expect(typeof metrics.branch.percentage).toBe('number');
      expect(typeof metrics.method.percentage).toBe('number');
    });

    test('should handle empty test results', async () => {
      const testResults = {};
      const metrics = await coverageAnalyzer.analyze(testResults);
      
      expect(metrics.class.percentage).toBe(0);
      expect(metrics.line.percentage).toBe(0);
      expect(metrics.branch.percentage).toBe(0);
      expect(metrics.method.percentage).toBe(0);
    });
  });
});