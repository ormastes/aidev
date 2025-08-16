import { TestReportGenerator } from '../../setup/test-env/report-generator';
import { TestReport } from '../../setup/test-env/index';
import * as fs from 'fs/promises';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

async describe('TestReportGenerator System Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let reportGenerator: TestReportGenerator;
  let testSchema: any;

  async beforeAll(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'report-generator-system-'));
    
    // Define a basic schema for testing
    testSchema = {
      type: 'object',
      required: ['theme', 'timestamp', 'environment', 'status', 'metrics'],
      properties: {
        theme: { type: 'string' },
        timestamp: { type: 'string' },
        environment: { 
          type: 'object',
          required: ['type', 'version'],
          properties: {
            type: { type: 'string' },
            version: { type: 'string' }
          }
        },
        status: {
          type: 'object',
          required: ['overall', 'criteria'],
          properties: {
            overall: { type: 'string' },
            criteria: { type: 'object' }
          }
        },
        metrics: {
          type: 'object',
          required: ['coverage', 'duplication', 'fraudCheck'],
          properties: {
            coverage: { type: 'object' },
            duplication: { type: 'object' },
            fraudCheck: { type: 'object' }
          }
        }
      }
    };
  });

  async afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async beforeEach(async () => {
    process.chdir(tempDir);
    reportGenerator = new TestReportGenerator(testSchema);
  });

  async describe('Report Generation and Validation', () => {
    async test('should generate valid report with complete data', async () => {
      const validReportData: TestReport = {
        theme: 'test-theme',
        timestamp: new Date().toISOString(),
        environment: {
          type: 'development',
          version: '1.0.0'
        },
        status: {
          overall: 'passed',
          criteria: {
            classCoverage: { met: true, target: 95, actual: 98 },
            branchCoverage: { met: true, target: 90, actual: 92 },
            duplication: { met: true, target: 5, actual: 3 }
          }
        },
        metrics: {
          coverage: {
            class: { total: 10, covered: 9, percentage: 90 },
            branch: { total: 50, covered: 46, percentage: 92 },
            line: { total: 100, covered: 85, percentage: 85 },
            method: { total: 30, covered: 28, percentage: 93.3 }
          },
          duplication: {
            percentage: 3.5,
            duplicatedLines: 7,
            totalLines: 200,
            duplicatedBlocks: []
          },
          fraudCheck: {
            passed: true,
            score: 95,
            violations: []
          }
        }
      };

      const result = await reportGenerator.generate(validReportData);
      expect(result).toEqual(validReportData);
    });

    async test('should reject invalid report data with missing required fields', async () => {
      const invalidReportData = {
        theme: 'test-theme'
        // Missing required fields: timestamp, environment, status, metrics
      };

      await expect(reportGenerator.generate(invalidReportData as any))
        .rejects.toThrow('Invalid report data');
    });

    async test('should reject report data with incorrect field types', async () => {
      const invalidReportData = {
        theme: 123, // Should be string
        timestamp: new Date().toISOString(),
        environment: {
          type: 'development',
          version: '1.0.0'
        },
        status: {
          overall: 'passed',
          criteria: {}
        },
        metrics: {
          coverage: {},
          duplication: {},
          fraudCheck: {}
        }
      };

      await expect(reportGenerator.generate(invalidReportData as any))
        .rejects.toThrow('Invalid report data');
    });

    async test('should handle edge cases in environment field validation', async () => {
      const edgeCaseData = {
        theme: 'edge-case-theme',
        timestamp: new Date().toISOString(),
        environment: {
          type: '', // Empty string
          version: null // Null value
        },
        status: {
          overall: 'failed',
          criteria: {}
        },
        metrics: {
          coverage: {},
          duplication: {},
          fraudCheck: {}
        }
      };

      await expect(reportGenerator.generate(edgeCaseData as any))
        .rejects.toThrow('Invalid report data');
    });
  });

  async describe('File System Operations', () => {
    async test('should save JSON and HTML reports with timestamp', async () => {
      const reportData: TestReport = {
        theme: 'save-test-theme',
        timestamp: new Date().toISOString(),
        environment: {
          type: 'production',
          version: '2.1.0'
        },
        status: {
          overall: 'passed',
          criteria: {
            classCoverage: { met: true, target: 95, actual: 96 },
            branchCoverage: { met: false, target: 90, actual: 85 },
            duplication: { met: true, target: 5, actual: 2.5 }
          }
        },
        metrics: {
          coverage: {
            class: { total: 20, covered: 19, percentage: 95 },
            branch: { total: 80, covered: 68, percentage: 85 },
            line: { total: 500, covered: 425, percentage: 85 },
            method: { total: 60, covered: 57, percentage: 95 }
          },
          duplication: {
            percentage: 2.5,
            duplicatedLines: 12,
            totalLines: 480,
            duplicatedBlocks: [
              { files: ['file1.ts', 'file2.ts'], lines: 6, tokens: 25 }
            ]
          },
          fraudCheck: {
            passed: false,
            score: 80,
            violations: [
              { type: 'empty-test', severity: 'warning', message: 'Empty test found', location: 'test1.ts:15' }
            ]
          }
        }
      };

      const outputDir = path.join(tempDir, 'reports');
      await reportGenerator.save(reportData, outputDir);

      // Check that output directory was created
      const dirStats = await fs.stat(outputDir);
      expect(dirStats.isDirectory()).toBe(true);

      // Check for JSON files
      const files = await fs.readdir(outputDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const htmlFiles = files.filter(f => f.endsWith('.html'));

      expect(jsonFiles.length).toBeGreaterThanOrEqual(2); // timestamped + latest
      expect(htmlFiles.length).toBeGreaterThanOrEqual(1); // latest HTML

      // Verify latest JSON file content
      const latestJsonPath = path.join(outputDir, 'test-report-save-test-theme-latest.json');
      const savedContent = await fs.readFile(latestJsonPath, 'utf8');
      const savedData = JSON.parse(savedContent);
      expect(savedData).toEqual(reportData);

      // Verify HTML file exists and contains theme name
      const latestHtmlPath = path.join(outputDir, 'test-report-save-test-theme-latest.html');
      const htmlContent = await fs.readFile(latestHtmlPath, 'utf8');
      expect(htmlContent).toContain('save-test-theme');
      expect(htmlContent).toContain('<!DOCTYPE html>');
    });

    async test('should handle file system errors during save operations', async () => {
      const reportData: TestReport = {
        theme: 'error-test',
        timestamp: new Date().toISOString(),
        environment: { type: 'test', version: '1.0.0' },
        status: { overall: 'passed', criteria: {} },
        metrics: { coverage: {}, duplication: {}, fraudCheck: {} }
      } as any;

      // Try to save to a path that will cause permission error
      const readOnlyDir = path.join(tempDir, 'readonly');
      await await fileAPI.createDirectory(readOnlyDir);

      try {
        await expect(reportGenerator.save(reportData, readOnlyDir))
          .rejects.toThrow();
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(readOnlyDir, 0o755);
      }
    });

    async test('should create nested output directories recursively', async () => {
      const reportData: TestReport = {
        theme: 'nested-test',
        timestamp: new Date().toISOString(),
        environment: { type: 'test', version: '1.0.0' },
        status: { overall: 'passed', criteria: {} },
        metrics: { coverage: {}, duplication: {}, fraudCheck: {} }
      } as any;

      const nestedDir = path.join(tempDir, 'deep', 'nested', 'structure', 'reports');
      await reportGenerator.save(reportData, nestedDir);

      // Verify nested directory was created
      const dirStats = await fs.stat(nestedDir);
      expect(dirStats.isDirectory()).toBe(true);

      // Verify files were created in nested directory
      const files = await fs.readdir(nestedDir);
      expect(files.length).toBeGreaterThan(0);
    });

    async test('should handle concurrent save operations', async () => {
      const baseReportData = {
        timestamp: new Date().toISOString(),
        environment: { type: 'concurrent', version: '1.0.0' },
        status: { overall: 'passed', criteria: {} },
        metrics: { coverage: {}, duplication: {}, fraudCheck: {} }
      } as any;

      const concurrentSaves = [];
      const outputDir = path.join(tempDir, 'concurrent-reports');

      // Create multiple concurrent save operations
      for (let i = 0; i < 5; i++) {
        const reportData = {
          ...baseReportData,
          theme: `concurrent-theme-${i}`
        };
        concurrentSaves.push(reportGenerator.save(reportData, outputDir));
      }

      // All saves should complete successfully
      await Promise.all(concurrentSaves);

      // Verify all files were created
      const files = await fs.readdir(outputDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const htmlFiles = files.filter(f => f.endsWith('.html'));

      expect(jsonFiles.length).toBeGreaterThanOrEqual(10); // 5 themes × 2 files each (timestamped + latest)
      expect(htmlFiles.length).toBe(5); // 5 themes × 1 HTML each
    });
  });

  async describe('HTML Report Generation', () => {
    async test('should generate complete HTML report with all sections', async () => {
      const reportData: TestReport = {
        theme: 'html-test-theme',
        timestamp: new Date().toISOString(),
        environment: {
          type: 'staging',
          version: '3.2.1'
        },
        status: {
          overall: 'failed',
          criteria: {
            classCoverage: { met: false, target: 95, actual: 88 },
            branchCoverage: { met: true, target: 85, actual: 90 },
            duplication: { met: false, target: 5, actual: 8.5 }
          }
        },
        metrics: {
          coverage: {
            class: { total: 25, covered: 22, percentage: 88 },
            branch: { total: 120, covered: 108, percentage: 90 },
            line: { total: 800, covered: 720, percentage: 90 },
            method: { total: 100, covered: 95, percentage: 95 }
          },
          duplication: {
            percentage: 8.5,
            duplicatedLines: 68,
            totalLines: 800,
            duplicatedBlocks: [
              { files: ['utils.ts', 'helpers.ts'], lines: 12, tokens: 45 },
              { files: ['service1.ts', 'service2.ts'], lines: 8, tokens: 30 }
            ]
          },
          fraudCheck: {
            passed: false,
            score: 75,
            violations: [
              { type: 'empty-test', severity: 'warning', message: 'Test with no assertions', location: 'empty.test.ts:20' },
              { type: 'fake-assertions', severity: 'critical', message: 'Always-true assertion detected', location: 'fake.test.ts:15' },
              { type: 'disabled-tests', severity: 'warning', message: 'Test marked as skip', location: 'disabled.test.ts:8' }
            ]
          }
        }
      };

      const outputDir = path.join(tempDir, 'html-reports');
      await reportGenerator.save(reportData, outputDir);

      const htmlPath = path.join(outputDir, 'test-report-html-test-theme-latest.html');
      const htmlContent = await fs.readFile(htmlPath, 'utf8');

      // Verify HTML structure
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="en">');
      expect(htmlContent).toContain('</html>');

      // Verify title and theme
      expect(htmlContent).toContain('<title>Test Report - html-test-theme</title>');
      expect(htmlContent).toContain('Test Report: html-test-theme');

      // Verify environment info
      expect(htmlContent).toContain('Environment: staging');
      expect(htmlContent).toContain('Version: 3.2.1');

      // Verify status
      expect(htmlContent).toContain('class="status failed"');
      expect(htmlContent).toContain('FAILED');

      // Verify coverage metrics
      expect(htmlContent).toContain('Class Coverage');
      expect(htmlContent).toContain('88.0%'); // Class coverage percentage
      expect(htmlContent).toContain('22 / 25 covered'); // Class coverage detail
      expect(htmlContent).toContain('Target: 95%'); // Class coverage target

      expect(htmlContent).toContain('Branch Coverage');
      expect(htmlContent).toContain('90.0%'); // Branch coverage percentage
      expect(htmlContent).toContain('108 / 120 covered'); // Branch coverage detail

      // Verify code quality metrics
      expect(htmlContent).toContain('Code Duplication');
      expect(htmlContent).toContain('8.5%'); // Duplication percentage
      expect(htmlContent).toContain('68 / 800 lines'); // Duplication detail

      expect(htmlContent).toContain('Fraud Check Score');
      expect(htmlContent).toContain('75'); // Fraud score
      expect(htmlContent).toContain('3 violations found'); // Violation count

      // Verify fraud violations section
      expect(htmlContent).toContain('Fraud Check Violations');
      expect(htmlContent).toContain('empty-test');
      expect(htmlContent).toContain('fake-assertions');
      expect(htmlContent).toContain('disabled-tests');
      expect(htmlContent).toContain('critical');
      expect(htmlContent).toContain('Test with no assertions');
      expect(htmlContent).toContain('empty.test.ts:20');

      // Verify CSS styling
      expect(htmlContent).toContain('.container {');
      expect(htmlContent).toContain('.metrics {');
      expect(htmlContent).toContain('.progress-bar {');
      expect(htmlContent).toContain('.violation {');
    });

    async test('should generate HTML report without violations section when no violations exist', async () => {
      const cleanReportData: TestReport = {
        theme: 'clean-theme',
        timestamp: new Date().toISOString(),
        environment: { type: 'production', version: '1.0.0' },
        status: {
          overall: 'passed',
          criteria: {
            classCoverage: { met: true, target: 95, actual: 98 },
            branchCoverage: { met: true, target: 90, actual: 95 },
            duplication: { met: true, target: 5, actual: 2 }
          }
        },
        metrics: {
          coverage: {
            class: { total: 10, covered: 10, percentage: 100 },
            branch: { total: 50, covered: 48, percentage: 96 },
            line: { total: 200, covered: 190, percentage: 95 },
            method: { total: 40, covered: 40, percentage: 100 }
          },
          duplication: {
            percentage: 2,
            duplicatedLines: 4,
            totalLines: 200,
            duplicatedBlocks: []
          },
          fraudCheck: {
            passed: true,
            score: 100,
            violations: []
          }
        }
      };

      const outputDir = path.join(tempDir, 'clean-html-reports');
      await reportGenerator.save(cleanReportData, outputDir);

      const htmlPath = path.join(outputDir, 'test-report-clean-theme-latest.html');
      const htmlContent = await fs.readFile(htmlPath, 'utf8');

      // Should not contain violations section
      expect(htmlContent).not.toContain('Fraud Check Violations');
      expect(htmlContent).not.toContain('violations');
      
      // Should show clean status
      expect(htmlContent).toContain('class="status passed"');
      expect(htmlContent).toContain('PASSED');
      expect(htmlContent).toContain('100'); // Perfect fraud score
    });

    async test('should handle special characters and encoding in HTML output', async () => {
      const specialCharData: TestReport = {
        theme: 'special-chars-<>&"\'',
        timestamp: new Date().toISOString(),
        environment: { type: 'test', version: '1.0.0' },
        status: { overall: 'passed', criteria: {} },
        metrics: {
          coverage: {
            class: { total: 1, covered: 1, percentage: 100 },
            branch: { total: 1, covered: 1, percentage: 100 },
            line: { total: 1, covered: 1, percentage: 100 },
            method: { total: 1, covered: 1, percentage: 100 }
          },
          duplication: { percentage: 0, duplicatedLines: 0, totalLines: 100, duplicatedBlocks: [] },
          fraudCheck: {
            passed: true,
            score: 100,
            violations: [
              { 
                type: 'test-violation', 
                severity: 'warning', 
                message: 'Special chars: <script>alert("xss")</script>', 
                location: 'file-with-<>&"\'.test.ts:10' 
              }
            ]
          }
        }
      } as any;

      const outputDir = path.join(tempDir, 'special-char-reports');
      await reportGenerator.save(specialCharData, outputDir);

      // The HTML should be generated without errors
      const files = await fs.readdir(outputDir);
      const htmlFiles = files.filter(f => f.endsWith('.html'));
      expect(htmlFiles.length).toBe(1);

      const htmlPath = path.join(outputDir, htmlFiles[0]);
      const htmlContent = await fs.readFile(htmlPath, 'utf8');
      
      // Should contain the special characters (they will be handled by the browser)
      expect(htmlContent).toContain('special-chars-<>&');
      expect(htmlContent).toContain('alert("xss")'); // Raw content in HTML
    });
  });

  async describe('Error Handling and Edge Cases', () => {
    async test('should handle extremely large report data', async () => {
      const largeReportData: TestReport = {
        theme: 'large-data-theme',
        timestamp: new Date().toISOString(),
        environment: { type: 'test', version: '1.0.0' },
        status: { overall: 'passed', criteria: {} },
        metrics: {
          coverage: {
            class: { total: 10000, covered: 9500, percentage: 95 },
            branch: { total: 50000, covered: 47500, percentage: 95 },
            line: { total: 100000, covered: 95000, percentage: 95 },
            method: { total: 25000, covered: 23750, percentage: 95 }
          },
          duplication: {
            percentage: 5,
            duplicatedLines: 5000,
            totalLines: 100000,
            duplicatedBlocks: Array.from({ length: 1000 }, (_, i) => ({
              files: [`file${i}a.ts`, `file${i}b.ts`],
              lines: 10,
              tokens: 50
            }))
          },
          fraudCheck: {
            passed: false,
            score: 85,
            violations: Array.from({ length: 500 }, (_, i) => ({
              type: 'test-violation',
              severity: i % 3 === 0 ? 'critical' : 'warning',
              message: `Violation ${i}: Large dataset test issue`,
              location: `large-file-${i}.test.ts:${i + 1}`
            }))
          }
        }
      } as any;

      const outputDir = path.join(tempDir, 'large-data-reports');
      
      // Should handle large data without errors
      await expect(reportGenerator.save(largeReportData, outputDir)).resolves.not.toThrow();

      // Verify files were created
      const files = await fs.readdir(outputDir);
      expect(files.length).toBeGreaterThan(0);

      // Verify HTML report contains large data
      const htmlFiles = files.filter(f => f.endsWith('.html'));
      const htmlPath = path.join(outputDir, htmlFiles[0]);
      const htmlContent = await fs.readFile(htmlPath, 'utf8');
      
      expect(htmlContent).toContain('10000'); // Large class total
      expect(htmlContent).toContain('500 violations found'); // Large violation count
    });

    async test('should validate schema with custom validation rules', async () => {
      const strictSchema = {
        type: 'object',
        required: ['theme', 'timestamp'],
        properties: {
          theme: { 
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '^[a-zA-Z0-9-_]+$'
          },
          timestamp: { 
            type: 'string',
            format: 'date-time'
          }
        },
        additionalProperties: false
      };

      const strictGenerator = new TestReportGenerator(strictSchema);

      // Valid data should pass
      const validData = {
        theme: 'valid-theme-123',
        timestamp: '2023-12-01T10:00:00.000Z'
      };
      await expect(strictGenerator.generate(validData)).resolves.toEqual(validData);

      // Invalid theme pattern should fail
      const invalidThemeData = {
        theme: 'invalid theme with spaces!',
        timestamp: '2023-12-01T10:00:00.000Z'
      };
      await expect(strictGenerator.generate(invalidThemeData)).rejects.toThrow();

      // Too short theme should fail
      const shortThemeData = {
        theme: 'ab',
        timestamp: '2023-12-01T10:00:00.000Z'
      };
      await expect(strictGenerator.generate(shortThemeData)).rejects.toThrow();

      // Invalid timestamp format should fail
      const invalidTimestampData = {
        theme: 'valid-theme',
        timestamp: 'not-a-timestamp'
      };
      await expect(strictGenerator.generate(invalidTimestampData)).rejects.toThrow();
    });

    async test('should handle malformed schema gracefully', async () => {
      const malformedSchema = {
        type: 'not-a-valid-type',
        properties: null,
        required: 'should-be-array'
      };

      // Constructor should handle malformed schema
      async expect(() => new TestReportGenerator(malformedSchema)).not.toThrow();

      const malformedGenerator = new TestReportGenerator(malformedSchema);
      
      // Generation should fail with malformed schema
      await expect(malformedGenerator.generate({ any: 'data' }))
        .rejects.toThrow();
    });
  });

  async describe('Performance and Memory Usage', () => {
    async test('should handle report generation within reasonable time limits', async () => {
      const performanceReportData: TestReport = {
        theme: 'performance-test',
        timestamp: new Date().toISOString(),
        environment: { type: 'performance', version: '1.0.0' },
        status: { overall: 'passed', criteria: {} },
        metrics: {
          coverage: {
            class: { total: 1000, covered: 950, percentage: 95 },
            branch: { total: 5000, covered: 4750, percentage: 95 },
            line: { total: 10000, covered: 9500, percentage: 95 },
            method: { total: 2500, covered: 2375, percentage: 95 }
          },
          duplication: {
            percentage: 3,
            duplicatedLines: 300,
            totalLines: 10000,
            duplicatedBlocks: Array.from({ length: 100 }, (_, i) => ({
              files: [`perf${i}a.ts`, `perf${i}b.ts`],
              lines: 3,
              tokens: 15
            }))
          },
          fraudCheck: {
            passed: true,
            score: 90,
            violations: Array.from({ length: 50 }, (_, i) => ({
              type: 'perf-violation',
              severity: 'warning',
              message: `Performance test violation ${i}`,
              location: `perf-test-${i}.test.ts:${i * 2 + 1}`
            }))
          }
        }
      } as any;

      const outputDir = path.join(tempDir, 'performance-reports');
      
      const startTime = Date.now();
      await reportGenerator.save(performanceReportData, outputDir);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 5 seconds for moderately large data)
      expect(endTime - startTime).toBeLessThan(5000);

      // Verify output was created correctly
      const files = await fs.readdir(outputDir);
      expect(files.length).toBeGreaterThan(0);
    });

    async test('should not cause memory leaks with multiple report generations', async () => {
      const baseReportData = {
        theme: 'memory-test',
        timestamp: new Date().toISOString(),
        environment: { type: 'memory', version: '1.0.0' },
        status: { overall: 'passed', criteria: {} },
        metrics: { coverage: {}, duplication: {}, fraudCheck: {} }
      } as any;

      const initialMemory = process.memoryUsage().heapUsed;

      // Generate many reports
      for (let i = 0; i < 100; i++) {
        const reportData = {
          ...baseReportData,
          theme: `memory-test-${i}`
        };
        await reportGenerator.generate(reportData);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 100 generations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});