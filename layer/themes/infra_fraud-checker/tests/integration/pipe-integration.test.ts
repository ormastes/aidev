import { createFraudChecker, createTestAnalyzer, createFraudReportGenerator } from '../../pipe/index';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe('Pipe Integration Tests', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fraud-checker-pipe-'));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clear temp directory contents
    const files = await fs.readdir(tempDir);
    await Promise.all(files.map(file => fs.rm(path.join(tempDir, file), { recursive: true })));
  });

  describe('Fraud Checker Factory', () => {
    it('should create functional fraud checker instance', async () => {
      const fraudChecker = createFraudChecker();
      
      expect(fraudChecker).toBeDefined();
      expect(typeof fraudChecker.checkTestFiles).toBe('function');
      expect(typeof fraudChecker.checkDirectory).toBe('function');
      expect(typeof fraudChecker.getFileSystemMetrics).toBe('function');
      expect(typeof fraudChecker.getParserMetrics).toBe('function');
    });

    it('should create fraud checker with custom base path', async () => {
      const fraudChecker = createFraudChecker(tempDir);
      
      // Create a test file
      const testFile = path.join(tempDir, 'pipe-test.test.ts');
      await fs.writeFile(testFile, `
        describe('Pipe test', () => {
          test('should work with pipe factory', () => {
            expect(1 + 1).toBe(2);
          });
        });
      `);

      const result = await fraudChecker.checkDirectory('.');
      
      expect(result.metrics.filesChecked).toBe(1);
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should support logging through pipe interface', async () => {
      const fraudChecker = createFraudChecker(tempDir);
      const logEntries: any[] = [];
      
      fraudChecker.onLog((entry) => {
        logEntries.push(entry);
      });

      // Create a test file to trigger logging
      const testFile = path.join(tempDir, 'logging-test.test.ts');
      await fs.writeFile(testFile, `
        test('logging test', () => {
          // Test implementation pending
        });
      `);

      await fraudChecker.checkDirectory('.');
      
      expect(logEntries.length).toBeGreaterThan(0);
      expect(logEntries[0]).toHaveProperty('timestamp');
      expect(logEntries[0]).toHaveProperty('level');
      expect(logEntries[0]).toHaveProperty('message');
    });
  });

  describe('Test Analyzer Factory', () => {
    it('should create functional test analyzer instance', () => {
      const testAnalyzer = createTestAnalyzer();
      
      expect(testAnalyzer).toBeDefined();
      expect(typeof testAnalyzer.analyzeTestResults).toBe('function');
      expect(typeof testAnalyzer.compareTestRuns).toBe('function');
    });

    it('should analyze test results correctly through pipe interface', () => {
      const testAnalyzer = createTestAnalyzer();
      
      const testResults = {
        totalTests: 15,
        passedTests: 12,
        failedTests: 2,
        skippedTests: 1,
        duration: 3000,
        scenarios: [
          { name: 'test1', duration: 0.5, status: 'passed' }, // Too fast
          { name: 'test2', duration: 200, status: 'passed' },
          { name: 'test3', duration: 150, status: 'failed' }
        ]
      };

      const analysis = testAnalyzer.analyzeTestResults(testResults);
      
      expect(analysis.metrics.totalTests).toBe(15);
      expect(analysis.metrics.averageTestTime).toBe(200); // 3000ms / 15 tests
      expect(analysis.quality.skipRatio).toBeCloseTo(0.067, 2); // 1/15
      expect(analysis.suspicious.tooFastTests).toBe(1);
    });

    it('should compare test runs correctly', () => {
      const testAnalyzer = createTestAnalyzer();
      
      const previousAnalysis = {
        metrics: { totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, testDuration: 1000, averageTestTime: 100 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.0, skipRatio: 0.0, failureRatio: 0.1 },
        suspicious: { tooFastTests: 0, identicalTests: 0, noAssertionTests: 0 }
      };

      const currentAnalysis = {
        metrics: { totalTests: 12, passedTests: 11, failedTests: 1, skippedTests: 0, testDuration: 1200, averageTestTime: 100 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.2, skipRatio: 0.0, failureRatio: 0.083 },
        suspicious: { tooFastTests: 0, identicalTests: 0, noAssertionTests: 0 }
      };

      const comparison = testAnalyzer.compareTestRuns(previousAnalysis, currentAnalysis);
      
      expect(comparison.improved).toBe(true);
      expect(comparison.changes).toContain('Added 2 new tests');
      expect(comparison.warnings).toHaveLength(0);
    });
  });

  describe('Report Generator Factory', () => {
    it('should create functional report generator instance', () => {
      const reportGenerator = createFraudReportGenerator();
      
      expect(reportGenerator).toBeDefined();
      expect(typeof reportGenerator.generateReport).toBe('function');
      expect(typeof reportGenerator.saveReport).toBe('function');
      expect(typeof reportGenerator.generateMarkdownReport).toBe('function');
    });

    it('should generate report correctly through pipe interface', async () => {
      const reportGenerator = createFraudReportGenerator(tempDir);
      
      const fraudCheckResult = {
        passed: false,
        score: 80,
        violations: [
          {
            type: 'disabled-tests' as const,
            severity: 'medium' as const,
            message: 'Skipped test detected',
            location: 'test.ts:5:2'
          }
        ],
        metrics: {
          filesChecked: 2,
          totalTests: 8,
          skippedTests: 1,
          emptyTests: 0,
          suspiciousPatterns: 1
        }
      };

      const report = await reportGenerator.generateReport(fraudCheckResult);
      
      expect(report.summary.overallScore).toBe(80);
      expect(report.summary.passed).toBe(false);
      expect(report.summary.totalViolations).toBe(1);
      expect(report.violations.bySeverity.medium).toHaveLength(1);
    });

    it('should save reports with proper file structure', async () => {
      const reportGenerator = createFraudReportGenerator(tempDir);
      
      const fraudCheckResult = {
        passed: true,
        score: 95,
        violations: [],
        metrics: {
          filesChecked: 3,
          totalTests: 12,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 0
        }
      };

      const report = await reportGenerator.generateReport(fraudCheckResult);
      const outputPath = path.join(tempDir, 'pipe-report.json');
      
      await reportGenerator.saveReport(report, outputPath);
      
      // Verify files exist
      const jsonExists = await fs.access(outputPath).then(() => true).catch(() => false);
      const htmlExists = await fs.access(outputPath.replace('.json', '.html')).then(() => true).catch(() => false);
      
      expect(jsonExists).toBe(true);
      expect(htmlExists).toBe(true);
      
      // Verify JSON content
      const jsonContent = await fs.readFile(outputPath, 'utf8');
      const parsedReport = JSON.parse(jsonContent);
      
      expect(parsedReport.summary.overallScore).toBe(95);
      expect(parsedReport.summary.passed).toBe(true);
    });

    it('should generate markdown report correctly', async () => {
      const reportGenerator = createFraudReportGenerator();
      
      const fraudCheckResult = {
        passed: false,
        score: 70,
        violations: [
          {
            type: 'fake-assertions' as const,
            severity: 'high' as const,
            message: 'Always-true assertion found',
            location: 'test.ts:10:5'
          }
        ],
        metrics: {
          filesChecked: 1,
          totalTests: 5,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 1
        }
      };

      const report = await reportGenerator.generateReport(fraudCheckResult);
      const markdown = reportGenerator.generateMarkdownReport(report);
      
      expect(markdown).toContain('# Test Fraud Detection Report');
      expect(markdown).toContain('- **Status**: ❌ FAILED');
      expect(markdown).toContain('- **Overall Score**: 70/100');
      expect(markdown).toContain('### High (1)');
      expect(markdown).toContain('Always-true assertion found');
    });
  });

  describe('Full Workflow Integration', () => {
    it('should complete full fraud detection workflow using pipe factories', async () => {
      // Create instances using pipe factories
      const fraudChecker = createFraudChecker(tempDir);
      const testAnalyzer = createTestAnalyzer();
      const reportGenerator = createFraudReportGenerator(tempDir);
      
      // Create test files with various patterns
      const testFiles = [
        {
          name: 'clean.test.ts',
          content: `
            describe('Clean tests', () => {
              test('should work correctly', () => {
                expect(2 + 2).toBe(4);
              });
              
              test('should handle strings', () => {
                const message = 'hello world';
                expect(message).toContain('world');
              });
            });
          `
        },
        {
          name: 'suspicious.test.ts',
          content: `
            describe('Suspicious tests', () => {
              test.skip('skipped test', () => {
                expect(1).toBe(1);
              });
              
              test('fake assertion', () => {
                // Test implementation pending
              });
            });
          `
        }
      ];
      
      // Write test files
      for (const testFile of testFiles) {
        await fs.writeFile(path.join(tempDir, testFile.name), testFile.content);
      }
      
      // Step 1: Run fraud detection
      const fraudResult = await fraudChecker.checkDirectory('.');
      
      expect(fraudResult.metrics.filesChecked).toBe(2);
      expect(fraudResult.passed).toBe(false); // Should fail due to suspicious patterns
      expect(fraudResult.violations.length).toBeGreaterThan(0);
      
      // Step 2: Analyze test results (simulate test execution results)
      const mockTestResults = {
        totalTests: 4,
        passedTests: 3,
        failedTests: 0,
        skippedTests: 1,
        duration: 500,
        scenarios: [
          { name: 'should work correctly', duration: 100, status: 'passed' },
          { name: 'should handle strings', duration: 150, status: 'passed' },
          { name: 'skipped test', duration: 0, status: 'skipped' },
          { name: 'fake assertion', duration: 50, status: 'passed' }
        ]
      };
      
      const testAnalysis = testAnalyzer.analyzeTestResults(mockTestResults);
      
      expect(testAnalysis.metrics.totalTests).toBe(4);
      expect(testAnalysis.quality.skipRatio).toBe(0.25); // 1 skipped out of 4
      
      // Step 3: Generate comprehensive report
      const report = await reportGenerator.generateReport(fraudResult, testAnalysis);
      
      expect(report.summary.passed).toBe(false);
      expect(report.details.fraudCheck).toEqual(fraudResult);
      expect(report.details.testAnalysis).toEqual(testAnalysis);
      
      // Step 4: Save report in multiple formats
      const outputPath = path.join(tempDir, 'workflow-report.json');
      await reportGenerator.saveReport(report, outputPath);
      
      // Verify all files were created
      const jsonExists = await fs.access(outputPath).then(() => true).catch(() => false);
      const htmlExists = await fs.access(outputPath.replace('.json', '.html')).then(() => true).catch(() => false);
      
      expect(jsonExists).toBe(true);
      expect(htmlExists).toBe(true);
      
      // Verify report content
      const savedReport = JSON.parse(await fs.readFile(outputPath, 'utf8'));
      expect(savedReport.summary.totalViolations).toBeGreaterThan(0);
      expect(savedReport.violations.bySeverity).toBeDefined();
      expect(savedReport.violations.byType).toBeDefined();
    });

    it('should handle error scenarios gracefully in full workflow', async () => {
      const fraudChecker = createFraudChecker('/non-existent-directory');
      const testAnalyzer = createTestAnalyzer();
      const reportGenerator = createFraudReportGenerator(tempDir);
      
      // Try to check non-existent directory
      const fraudResult = await fraudChecker.checkDirectory('.');
      
      // Should return clean result for empty/error case
      expect(fraudResult.metrics.filesChecked).toBe(0);
      expect(fraudResult.passed).toBe(true);
      expect(fraudResult.violations).toHaveLength(0);
      
      // Analyze empty test results
      const testAnalysis = testAnalyzer.analyzeTestResults({});
      
      expect(testAnalysis.metrics.totalTests).toBe(0);
      expect(testAnalysis.quality.skipRatio).toBe(0);
      
      // Generate report for error case
      const report = await reportGenerator.generateReport(fraudResult, testAnalysis);
      
      expect(report.summary.passed).toBe(true);
      expect(report.summary.overallScore).toBe(100);
      expect(report.summary.totalViolations).toBe(0);
    });

    it('should support log aggregation across all components', async () => {
      const fraudChecker = createFraudChecker(tempDir);
      const allLogEntries: any[] = [];
      
      // Set up logging for fraud checker
      fraudChecker.onLog((entry) => {
        allLogEntries.push({ component: 'fraudChecker', ...entry });
      });
      
      // Create a test file to trigger logging
      await fs.writeFile(path.join(tempDir, 'log-test.test.ts'), `
        test('logging integration test', () => {
          expect(1).toBe(1);
        });
      `);
      
      await fraudChecker.checkDirectory('.');
      
      expect(allLogEntries.length).toBeGreaterThan(0);
      
      // Check that we have logs from different components
      const fileSystemLogs = allLogEntries.filter(entry => 
        entry.message.includes('Reading file') || entry.message.includes('Reading directory')
      );
      const parserLogs = allLogEntries.filter(entry => 
        entry.message.includes('Parsing test file') || entry.message.includes('Analyzing test patterns')
      );
      
      expect(fileSystemLogs.length).toBeGreaterThan(0);
      expect(parserLogs.length).toBeGreaterThan(0);
    });

    it('should provide metrics aggregation across all components', async () => {
      const fraudChecker = createFraudChecker(tempDir);
      
      // Create multiple test files
      const testFiles = [
        'test1.test.ts',
        'test2.test.ts',
        'test3.test.ts'
      ];
      
      for (const fileName of testFiles) {
        await fs.writeFile(path.join(tempDir, fileName), `
          test('metrics test', () => {
            // Test implementation pending
          });
        `);
      }
      
      await fraudChecker.checkDirectory('.');
      
      // Get metrics from both wrappers
      const fsMetrics = fraudChecker.getFileSystemMetrics();
      const parserMetrics = fraudChecker.getParserMetrics();
      
      expect(fsMetrics.readCount).toBeGreaterThanOrEqual(3); // At least 3 files read
      expect(parserMetrics.filesAnalyzed).toBe(3); // Exactly 3 files parsed
      expect(parserMetrics.parseTime).toBeGreaterThan(0);
      expect(fsMetrics.totalBytesRead).toBeGreaterThan(0);
    });
  });

  describe('Factory Configuration', () => {
    it('should create instances with default configurations', () => {
      const fraudChecker = createFraudChecker();
      const testAnalyzer = createTestAnalyzer();
      const reportGenerator = createFraudReportGenerator();
      
      expect(fraudChecker).toBeDefined();
      expect(testAnalyzer).toBeDefined();
      expect(reportGenerator).toBeDefined();
      
      // Test that they have expected methods
      expect(typeof fraudChecker.checkTestFiles).toBe('function');
      expect(typeof testAnalyzer.analyzeTestResults).toBe('function');
      expect(typeof reportGenerator.generateReport).toBe('function');
    });

    it('should create instances with custom configurations', () => {
      const customPath = '/custom/path';
      
      const fraudChecker = createFraudChecker(customPath);
      const reportGenerator = createFraudReportGenerator(customPath);
      
      expect(fraudChecker).toBeDefined();
      expect(reportGenerator).toBeDefined();
      
      // These should still work even with custom paths
      expect(typeof fraudChecker.getFileSystemMetrics).toBe('function');
      expect(typeof reportGenerator.saveReport).toBe('function');
    });

    it('should support method chaining and fluent interface', async () => {
      const fraudChecker = createFraudChecker(tempDir);
      
      // Create test file
      await fs.writeFile(path.join(tempDir, 'fluent.test.ts'), `
        test('fluent test', () => {
          expect(1).toBe(1);
        });
      `);
      
      const logEntries: any[] = [];
      
      // Test fluent interface
      const result = await fraudChecker
        .onLog((entry) => logEntries.push(entry))
        .checkDirectory('.');
      
      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
      expect(logEntries.length).toBeGreaterThan(0);
    });
  });
});