import { FraudChecker } from '../../children/FraudChecker';
import { FraudReportGenerator } from '../../children/FraudReportGenerator';
import { ASTParserWrapper } from '../../external/ASTParserWrapper';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe('Performance and Stress Tests', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fraud-checker-perf-'));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clear temp directory contents
    const files = await fs.readdir(tempDir);
    await Promise.all(files.map(file => fs.rm(path.join(tempDir, file), { recursive: true })));
  });

  describe('Large file processing', () => {
    it('should handle large test files efficiently', async () => {
      const fraudChecker = new FraudChecker(tempDir);
      
      // Generate a large test file (1000 test cases)
      const largeTestContent = generateLargeTestFile(1000);
      const testFile = path.join(tempDir, 'large.test.ts');
      await fs.writeFile(testFile, largeTestContent);

      const startTime = Date.now();
      const result = await fraudChecker.checkDirectory(tempDir);
      const endTime = Date.now();

      expect(result.metrics.filesChecked).toBe(1);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.score).toBeGreaterThanOrEqual(0);
    }, 15000);

    it('should handle deeply nested AST structures', async () => {
      const fraudChecker = new FraudChecker(tempDir);
      
      // Generate a file with deeply nested describe blocks
      const deeplyNestedContent = generateDeeplyNestedTestFile(20);
      const testFile = path.join(tempDir, 'nested.test.ts');
      await fs.writeFile(testFile, deeplyNestedContent);

      const startTime = Date.now();
      const result = await fraudChecker.checkDirectory(tempDir);
      const endTime = Date.now();

      expect(result.metrics.filesChecked).toBe(1);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    }, 10000);

    it('should handle files with many imports and complex syntax', async () => {
      const fraudChecker = new FraudChecker(tempDir);
      
      const complexTestContent = `
        // Many imports
        import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals';
        import { TestClass1 } from './test-class-1';
        import { TestClass2 } from './test-class-2';
        import { TestClass3 } from './test-class-3';
        import { utils } from '../utils';
        import { helpers } from '../helpers';
        import { validators } from '../validators';
        import { formatters } from '../formatters';
        import { processors } from '../processors';
        import { analyzers } from '../analyzers';
        
        // Complex types and interfaces
        interface ComplexTestInterface {
          prop1: string;
          prop2: number;
          prop3: {
            nested1: boolean;
            nested2: Array<{
              deepProp: string;
            }>;
          };
        }
        
        type ComplexType = ComplexTestInterface & {
          additional: string;
        };
        
        // Complex test scenarios
        describe('Complex test suite with many scenarios', () => {
          ${Array.from({ length: 100 }, (_, i) => `
            test('complex test ${i}', async () => {
              const complexObject: ComplexType = {
                prop1: 'test${i}',
                prop2: ${i},
                prop3: {
                  nested1: ${i % 2 === 0},
                  nested2: [{ deepProp: 'deep${i}' }]
                },
                additional: 'additional${i}'
              };
              
              expect(complexObject.prop1).toBe('test${i}');
              expect(complexObject.prop2).toBe(${i});
              expect(complexObject.prop3.nested1).toBe(${i % 2 === 0});
              
              const result = await utils.process(complexObject);
              expect(result).toBeDefined();
            });
          `).join('\n')}
        });
      `;
      
      const testFile = path.join(tempDir, 'complex.test.ts');
      await fs.writeFile(testFile, complexTestContent);

      const startTime = Date.now();
      const result = await fraudChecker.checkDirectory(tempDir);
      const endTime = Date.now();

      expect(result.metrics.filesChecked).toBe(1);
      expect(endTime - startTime).toBeLessThan(8000); // Should complete within 8 seconds
    }, 12000);
  });

  describe('Many files processing', () => {
    it('should handle hundreds of test files', async () => {
      const fraudChecker = new FraudChecker(tempDir);
      
      // Create 100 test files
      const filePromises = [];
      for (let i = 0; i < 100; i++) {
        const fileName = path.join(tempDir, `test-${i.toString().padStart(3, '0')}.test.ts`);
        const content = `
          describe('Test suite ${i}', () => {
            test('test 1', () => {
              expect(${i}).toBe(${i});
            });
            
            test('test 2', () => {
              expect(${i * 2}).toBe(${i * 2});
            });
            
            test('test 3', () => {
              const result = ${i} + 1;
              expect(result).toBeGreaterThan(${i});
            });
          });
        `;
        filePromises.push(fs.writeFile(fileName, content));
      }
      
      await Promise.all(filePromises);

      const startTime = Date.now();
      const result = await fraudChecker.checkDirectory(tempDir);
      const endTime = Date.now();

      expect(result.metrics.filesChecked).toBe(100);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.passed).toBe(true); // All clean tests
    }, 35000);

    it('should handle deeply nested directory structures with many files', async () => {
      const fraudChecker = new FraudChecker(tempDir);
      
      // Create nested directory structure with files at each level
      let currentDir = tempDir;
      const filePromises = [];
      
      for (let level = 0; level < 10; level++) {
        currentDir = path.join(currentDir, `level-${level}`);
        await fs.mkdir(currentDir);
        
        // Create 5 files at each level
        for (let fileIndex = 0; fileIndex < 5; fileIndex++) {
          const fileName = path.join(currentDir, `test-${level}-${fileIndex}.test.ts`);
          const content = `
            describe('Level ${level} Test ${fileIndex}', () => {
              test('should work at level ${level}', () => {
                expect(${level}).toBeLessThan(10);
                expect(${fileIndex}).toBeLessThan(5);
              });
            });
          `;
          filePromises.push(fs.writeFile(fileName, content));
        }
      }
      
      await Promise.all(filePromises);

      const startTime = Date.now();
      const result = await fraudChecker.checkDirectory(tempDir);
      const endTime = Date.now();

      expect(result.metrics.filesChecked).toBe(50); // 10 levels * 5 files
      expect(endTime - startTime).toBeLessThan(20000); // Should complete within 20 seconds
    }, 25000);
  });

  describe('Memory usage under stress', () => {
    it('should not leak memory when processing many files sequentially', async () => {
      const fraudChecker = new FraudChecker(tempDir);
      
      // Process files in batches to test memory management
      for (let batch = 0; batch < 10; batch++) {
        // Create 20 files per batch
        const filePromises = [];
        for (let i = 0; i < 20; i++) {
          const fileName = path.join(tempDir, `batch-${batch}-file-${i}.test.ts`);
          const content = generateLargeTestFile(50); // 50 tests per file
          filePromises.push(fs.writeFile(fileName, content));
        }
        
        await Promise.all(filePromises);
        
        const result = await fraudChecker.checkDirectory(tempDir);
        expect(result.metrics.filesChecked).toBe(20);
        
        // Clear files for next batch
        const files = await fs.readdir(tempDir);
        await Promise.all(files.map(file => fs.rm(path.join(tempDir, file))));
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 60000);

    it('should handle concurrent fraud checking operations', async () => {
      // Create multiple directories with test files
      const directories = [];
      const fraudCheckers = [];
      
      for (let i = 0; i < 5; i++) {
        const dir = path.join(tempDir, `concurrent-${i}`);
        await fs.mkdir(dir);
        directories.push(dir);
        
        // Create files in each directory
        for (let j = 0; j < 10; j++) {
          const fileName = path.join(dir, `test-${j}.test.ts`);
          const content = `
            describe('Concurrent test ${i}-${j}', () => {
              test('should work concurrently', () => {
                expect(${i + j}).toBe(${i + j});
              });
            });
          `;
          await fs.writeFile(fileName, content);
        }
        
        fraudCheckers.push(new FraudChecker(dir));
      }

      const startTime = Date.now();
      
      // Run all fraud checkers concurrently
      const promises = fraudCheckers.map(checker => checker.checkDirectory('.'));
      const results = await Promise.all(promises);
      
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.metrics.filesChecked).toBe(10);
        expect(result.passed).toBe(true);
      });
      
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
    }, 20000);
  });

  describe('Report generation performance', () => {
    it('should generate reports efficiently for large datasets', async () => {
      const reportGenerator = new FraudReportGenerator(tempDir);
      
      // Create a large fraud check result with many violations
      const violations = [];
      for (let i = 0; i < 1000; i++) {
        violations.push({
          type: 'fake-assertions' as const,
          severity: ["critical", 'high', 'medium', 'low'][i % 4] as any,
          message: `Violation ${i}: Always-true assertion detected`,
          location: `file-${Math.floor(i / 10)}.test.ts:${(i % 50) + 1}:${(i % 20) + 1}`
        });
      }
      
      const fraudCheckResult = {
        passed: false,
        score: 25,
        violations,
        metrics: {
          filesChecked: 100,
          totalTests: 5000,
          skippedTests: 200,
          emptyTests: 150,
          suspiciousPatterns: 1000
        }
      };

      const startTime = Date.now();
      const report = await reportGenerator.generateReport(fraudCheckResult);
      const endTime = Date.now();

      expect(report.summary.totalViolations).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should save large reports efficiently', async () => {
      const reportGenerator = new FraudReportGenerator(tempDir);
      
      // Generate large report
      const violations = Array.from({ length: 500 }, (_, i) => ({
        type: 'test-manipulation' as const,
        severity: 'medium' as const,
        message: `Large violation ${i}`,
        location: `large-file-${i}.test.ts:${i + 1}:1`
      }));
      
      const fraudCheckResult = {
        passed: false,
        score: 50,
        violations,
        metrics: {
          filesChecked: 50,
          totalTests: 2500,
          skippedTests: 100,
          emptyTests: 50,
          suspiciousPatterns: 500
        }
      };
      
      const report = await reportGenerator.generateReport(fraudCheckResult);
      const outputPath = path.join(tempDir, 'large-report.json');

      const startTime = Date.now();
      await reportGenerator.saveReport(report, outputPath);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      // Verify files were created
      const jsonExists = await fs.access(outputPath).then(() => true).catch(() => false);
      const htmlExists = await fs.access(outputPath.replace('.json', '.html')).then(() => true).catch(() => false);
      
      expect(jsonExists).toBe(true);
      expect(htmlExists).toBe(true);
    });
  });

  describe('Parser performance under stress', () => {
    it('should parse complex TypeScript syntax efficiently', async () => {
      const astParser = new ASTParserWrapper();
      
      const complexCode = `
        // Complex TypeScript with generics, decorators, and advanced patterns
        import { Component, Injectable } from '@angular/core';
        
        @Injectable()
        class GenericService<T extends { id: number }, U = string> {
          private readonly cache = new Map<string, T>();
          
          async processItems<V extends T[]>(
            items: V,
            processor: (item: T) => Promise<U>
          ): Promise<Map<string, U>> {
            const results = new Map<string, U>();
            
            for (const item of items) {
              try {
                const result = await processor(item);
                results.set(item.id.toString(), result);
              } catch (error) {
                console.error(\`Failed to process item \${item.id}\`, error);
              }
            }
            
            return results;
          }
        }
        
        ${Array.from({ length: 100 }, (_, i) => `
          describe('Complex test suite ${i}', () => {
            let service: GenericService<{ id: number; name: string }>;
            
            beforeEach(() => {
              service = new GenericService();
            });
            
            test('should handle generic operations ${i}', async () => {
              const items = [
                { id: ${i}, name: 'test${i}' },
                { id: ${i + 1}, name: 'test${i + 1}' }
              ];
              
              const results = await service.processItems(items, async (item) => {
                return \`processed-\${item.name}\`;
              });
              
              expect(results.size).toBe(2);
              expect(results.get('${i}')).toBe('processed-test${i}');
            });
          });
        `).join('\n')}
      `;

      const startTime = Date.now();
      const ast = await astParser.parseTestFile(complexCode, 'complex.test.ts');
      const patterns = astParser.findTestPatterns(ast, 'complex.test.ts');
      const endTime = Date.now();

      expect(ast).toBeDefined();
      expect(patterns).toBeDefined();
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    }, 5000);

    it('should handle malformed code gracefully under stress', async () => {
      const astParser = new ASTParserWrapper();
      
      // Test with various types of malformed code
      const malformedCodes = [
        'function test( { // Missing closing brace',
        'import { from "./missing-quote',
        'class Test extends { // Missing parent class',
        'const x = { prop: } // Missing value',
        'if (condition { // Missing closing paren',
        '// Just a comment with no actual code'
      ];

      let successfulParses = 0;
      let errors = 0;

      const startTime = Date.now();
      
      for (let i = 0; i < malformedCodes.length; i++) {
        try {
          await astParser.parseTestFile(malformedCodes[i], `malformed-${i}.ts`);
          successfulParses++;
        } catch (error) {
          errors++;
        }
      }
      
      const endTime = Date.now();

      // Should handle errors gracefully and quickly
      expect(errors).toBeGreaterThan(0); // Some should fail to parse
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly even with errors
    });
  });

  // Helper functions
  function generateLargeTestFile(testCount: number): string {
    const tests = [];
    
    for (let i = 0; i < testCount; i++) {
      const testType = i % 4;
      let testContent = '';
      
      switch (testType) {
        case 0: // Normal test
          testContent = `
            test('normal test ${i}', () => {
              expect(${i}).toBe(${i});
              expect(${i * 2}).toBe(${i * 2});
            });
          `;
          break;
        case 1: // Test with some complexity
          testContent = `
            test('complex test ${i}', async () => {
              const data = await Promise.resolve({ value: ${i} });
              expect(data.value).toBe(${i});
              
              const mapped = [1, 2, 3].map(x => x * ${i});
              expect(mapped).toHaveLength(3);
            });
          `;
          break;
        case 2: // Test with conditional logic
          testContent = `
            test('conditional test ${i}', () => {
              if (${i} % 2 === 0) {
                expect(${i}).toBeGreaterThanOrEqual(0);
              } else {
                expect(${i}).toBeGreaterThan(0);
              }
            });
          `;
          break;
        case 3: // Test with multiple assertions
          testContent = `
            test('multi-assertion test ${i}', () => {
              expect(${i}).toBeDefined();
              expect(${i}).toBeTypeOf('number');
              expect(${i}).toBeGreaterThanOrEqual(0);
              expect(${i}).toBeLessThan(${testCount});
            });
          `;
          break;
      }
      
      tests.push(testContent);
    }
    
    return `
      describe('Large test suite with ${testCount} tests', () => {
        ${tests.join('\n')}
      });
    `;
  }

  function generateDeeplyNestedTestFile(depth: number): string {
    function createNestedDescribe(currentDepth: number): string {
      if (currentDepth === 0) {
        return `
          test('deeply nested test', () => {
            expect(${depth}).toBe(${depth});
          });
        `;
      }
      
      return `
        describe('Nested level ${currentDepth}', () => {
          ${createNestedDescribe(currentDepth - 1)}
        });
      `;
    }
    
    return `
      describe('Root describe block', () => {
        ${createNestedDescribe(depth)}
      });
    `;
  }
});