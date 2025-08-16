import { FraudReportGenerator, FraudReport } from '../../children/FraudReportGenerator';
import { FraudCheckResult, FraudViolation } from '../../children/FraudChecker';
import { TestAnalysis } from '../../children/TestAnalyzer';
import { FileSystemWrapper } from '../../external/FileSystemWrapper';

// Mock the FileSystemWrapper
jest.mock('../../external/FileSystemWrapper');

describe("FraudReportGenerator", () => {
  let generator: FraudReportGenerator;
  let mockFileSystem: jest.Mocked<FileSystemWrapper>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockFileSystem = new FileSystemWrapper() as jest.Mocked<FileSystemWrapper>;
    (FileSystemWrapper as jest.Mock).mockReturnValue(mockFileSystem);
    
    // Reset mock implementations
    mockFileSystem.writeFile = jest.fn().mockResolvedValue(undefined);
    mockFileSystem.readFile = jest.fn().mockResolvedValue('');
    mockFileSystem.readdir = jest.fn().mockResolvedValue([]);
    mockFileSystem.stat = jest.fn().mockResolvedValue({} as any);
    mockFileSystem.exists = jest.fn().mockResolvedValue(true);
    
    generator = new FraudReportGenerator('/test/path');
  });

  describe("constructor", () => {
    it('should initialize with provided base path', () => {
      expect(FileSystemWrapper).toHaveBeenCalledWith('/test/path');
    });

    it('should use current working directory as default', () => {
      new FraudReportGenerator();
      expect(FileSystemWrapper).toHaveBeenCalledWith(process.cwd());
    });
  });

  describe("generateReport", () => {
    it('should generate comprehensive report with all sections', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 75,
        violations: [
          {
            type: 'test-manipulation',
            severity: 'high',
            message: 'Test isolation detected',
            location: 'test.ts:10:5'
          },
          {
            type: 'fake-assertions',
            severity: "critical",
            message: 'Always-true assertion',
            location: 'test.ts:15:8'
          }
        ],
        metrics: {
          filesChecked: 5,
          totalTests: 20,
          skippedTests: 2,
          emptyTests: 1,
          suspiciousPatterns: 3
        }
      };

      const testAnalysis: TestAnalysis = {
        metrics: {
          totalTests: 20,
          passedTests: 18,
          failedTests: 0,
          skippedTests: 2,
          testDuration: 5000,
          averageTestTime: 250
        },
        quality: {
          hasEnoughTests: true,
          testCoverageRatio: 0.8,
          skipRatio: 0.1,
          failureRatio: 0.0
        },
        suspicious: {
          tooFastTests: 1,
          identicalTests: 0,
          noAssertionTests: 1
        }
      };

      const report = await generator.generateReport(fraudCheckResult, testAnalysis);

      expect(report).toMatchObject({
        timestamp: expect.any(String),
        summary: {
          overallScore: 75,
          passed: false,
          totalViolations: 2,
          criticalViolations: 1,
          recommendation: 'Critical issues detected. Immediate review and fixes required.'
        },
        details: {
          fraudCheck: fraudCheckResult,
          testAnalysis: testAnalysis
        },
        violations: {
          bySeverity: {
            critical: [expect.objectContaining({ severity: "critical" })],
            high: [expect.objectContaining({ severity: 'high' })],
            medium: [],
            low: []
          },
          byType: {
            'test-manipulation': [expect.objectContaining({ type: 'test-manipulation' })],
            'fake-assertions': [expect.objectContaining({ type: 'fake-assertions' })],
            'coverage-bypass': [],
            'disabled-tests': []
          }
        }
      });
    });

    it('should generate report without test analysis', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: true,
        score: 100,
        violations: [],
        metrics: {
          filesChecked: 3,
          totalTests: 10,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 0
        }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.details.testAnalysis).toBeUndefined();
      expect(report.summary.passed).toBe(true);
      expect(report.summary.overallScore).toBe(100);
    });

    it('should categorize violations correctly by severity', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 60,
        violations: [
          { type: 'test-manipulation', severity: "critical", message: 'Critical issue', location: 'file1.ts' },
          { type: 'fake-assertions', severity: 'high', message: 'High issue', location: 'file2.ts' },
          { type: 'disabled-tests', severity: 'medium', message: 'Medium issue', location: 'file3.ts' },
          { type: 'coverage-bypass', severity: 'low', message: 'Low issue', location: 'file4.ts' }
        ],
        metrics: { filesChecked: 4, totalTests: 15, skippedTests: 1, emptyTests: 0, suspiciousPatterns: 4 }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.violations.bySeverity.critical).toHaveLength(1);
      expect(report.violations.bySeverity.high).toHaveLength(1);
      expect(report.violations.bySeverity.medium).toHaveLength(1);
      expect(report.violations.bySeverity.low).toHaveLength(1);
    });

    it('should categorize violations correctly by type', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 70,
        violations: [
          { type: 'test-manipulation', severity: 'high', message: 'Manipulation 1', location: 'file1.ts' },
          { type: 'test-manipulation', severity: 'medium', message: 'Manipulation 2', location: 'file2.ts' },
          { type: 'fake-assertions', severity: "critical", message: 'Fake assertion', location: 'file3.ts' }
        ],
        metrics: { filesChecked: 3, totalTests: 12, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 3 }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.violations.byType['test-manipulation']).toHaveLength(2);
      expect(report.violations.byType['fake-assertions']).toHaveLength(1);
      expect(report.violations.byType['coverage-bypass']).toHaveLength(0);
      expect(report.violations.byType['disabled-tests']).toHaveLength(0);
    });
  });

  describe('summary generation', () => {
    it('should generate appropriate recommendation for clean tests', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: true,
        score: 100,
        violations: [],
        metrics: { filesChecked: 5, totalTests: 25, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 0 }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.summary.recommendation).toBe('Tests appear to be genuine and well-written.');
    });

    it('should generate critical recommendation for critical violations', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 50,
        violations: [
          { type: 'fake-assertions', severity: "critical", message: 'Critical issue', location: 'test.ts' }
        ],
        metrics: { filesChecked: 1, totalTests: 5, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 1 }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.summary.recommendation).toBe('Critical issues detected. Immediate review and fixes required.');
    });

    it('should generate major refactoring recommendation for low scores', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 65,
        violations: [
          { type: 'disabled-tests', severity: 'medium', message: 'Medium issue', location: 'test.ts' }
        ],
        metrics: { filesChecked: 1, totalTests: 5, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 1 }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.summary.recommendation).toBe('Significant quality issues found. Major refactoring recommended.');
    });

    it('should generate moderate recommendation for medium scores', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 85,
        violations: [
          { type: 'disabled-tests', severity: 'low', message: 'Low issue', location: 'test.ts' }
        ],
        metrics: { filesChecked: 1, totalTests: 5, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 1 }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.summary.recommendation).toBe('Some issues detected. Review and improve test quality.');
    });
  });

  describe("saveReport", () => {
    it('should save JSON and HTML reports', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: true,
        score: 100,
        violations: [],
        metrics: { filesChecked: 1, totalTests: 5, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 0 }
      };

      const report = await generator.generateReport(fraudCheckResult);
      const outputPath = '/output/report.json';

      await generator.saveReport(report, outputPath);

      expect(mockFileSystem.writeFile).toHaveBeenCalledTimes(2);
      
      // Check JSON report
      expect(mockFileSystem.writeFile).toHaveBeenNthCalledWith(
        1,
        outputPath,
        expect.stringContaining('"overallScore": 100')
      );

      // Check HTML report
      expect(mockFileSystem.writeFile).toHaveBeenNthCalledWith(
        2,
        '/output/report.html',
        expect.stringContaining('<!DOCTYPE html>')
      );
    });

    it('should handle file system errors during save', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: true,
        score: 100,
        violations: [],
        metrics: { filesChecked: 1, totalTests: 5, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 0 }
      };

      const report = await generator.generateReport(fraudCheckResult);
      const error = new Error('Write failed');
      
      mockFileSystem.writeFile.mockRejectedValue(error);

      await expect(generator.saveReport(report, '/output/report.json')).rejects.toThrow('Write failed');
    });
  });

  describe('HTML report generation', () => {
    it('should generate valid HTML with correct structure', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 75,
        violations: [
          { type: 'test-manipulation', severity: 'high', message: 'High severity issue', location: 'test.ts:10' }
        ],
        metrics: { filesChecked: 2, totalTests: 8, skippedTests: 1, emptyTests: 0, suspiciousPatterns: 1 }
      };

      const report = await generator.generateReport(fraudCheckResult);
      await generator.saveReport(report, '/test/report.json');

      const htmlContent = mockFileSystem.writeFile.mock.calls[1][1] as string;

      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<title>Fraud Detection Report');
      expect(htmlContent).toContain('75/100');
      expect(htmlContent).toContain('FAILED');
      expect(htmlContent).toContain('High severity issue');
      expect(htmlContent).toContain('Files Checked');
      expect(htmlContent).toContain('Total Violations');
    });

    it('should show PASSED status for clean reports', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: true,
        score: 100,
        violations: [],
        metrics: { filesChecked: 3, totalTests: 15, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 0 }
      };

      const report = await generator.generateReport(fraudCheckResult);
      await generator.saveReport(report, '/test/report.json');

      const htmlContent = mockFileSystem.writeFile.mock.calls[1][1] as string;

      expect(htmlContent).toContain('100/100');
      expect(htmlContent).toContain('PASSED');
      expect(htmlContent).toContain('#28a745'); // Green color for passed
    });

    it('should include test analysis metrics when provided', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: true,
        score: 95,
        violations: [],
        metrics: { filesChecked: 2, totalTests: 10, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 0 }
      };

      const testAnalysis: TestAnalysis = {
        metrics: { totalTests: 10, passedTests: 10, failedTests: 0, skippedTests: 0, testDuration: 2000, averageTestTime: 200 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.0, skipRatio: 0.0, failureRatio: 0.0 },
        suspicious: { tooFastTests: 1, identicalTests: 0, noAssertionTests: 0 }
      };

      const report = await generator.generateReport(fraudCheckResult, testAnalysis);
      await generator.saveReport(report, '/test/report.json');

      const htmlContent = mockFileSystem.writeFile.mock.calls[1][1] as string;

      expect(htmlContent).toContain('Skip Ratio');
      expect(htmlContent).toContain('Suspiciously Fast Tests');
      expect(htmlContent).toContain('Duplicate Tests');
    });

    it('should color-code violations by severity', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 60,
        violations: [
          { type: 'fake-assertions', severity: "critical", message: 'Critical issue', location: 'test1.ts' },
          { type: 'test-manipulation', severity: 'high', message: 'High issue', location: 'test2.ts' },
          { type: 'disabled-tests', severity: 'medium', message: 'Medium issue', location: 'test3.ts' },
          { type: 'coverage-bypass', severity: 'low', message: 'Low issue', location: 'test4.ts' }
        ],
        metrics: { filesChecked: 4, totalTests: 16, skippedTests: 2, emptyTests: 1, suspiciousPatterns: 4 }
      };

      const report = await generator.generateReport(fraudCheckResult);
      await generator.saveReport(report, '/test/report.json');

      const htmlContent = mockFileSystem.writeFile.mock.calls[1][1] as string;

      expect(htmlContent).toContain('#dc3545'); // Critical - red
      expect(htmlContent).toContain('#fd7e14'); // High - orange
      expect(htmlContent).toContain('#ffc107'); // Medium - yellow
      expect(htmlContent).toContain('#6c757d'); // Low - gray
    });
  });

  describe('Markdown report generation', () => {
    it('should generate well-formatted markdown report', () => {
      const report: FraudReport = {
        timestamp: '2023-07-23T12:00:00.000Z',
        summary: {
          overallScore: 85,
          passed: false,
          totalViolations: 2,
          criticalViolations: 0,
          recommendation: 'Some issues detected. Review and improve test quality.'
        },
        details: {
          fraudCheck: {
            passed: false,
            score: 85,
            violations: [
              { type: 'disabled-tests', severity: 'medium', message: 'Skipped test found', location: 'test.ts:5' }
            ],
            metrics: { filesChecked: 3, totalTests: 12, skippedTests: 2, emptyTests: 0, suspiciousPatterns: 1 }
          }
        },
        violations: {
          bySeverity: {
            critical: [],
            high: [],
            medium: [
              { type: 'disabled-tests', severity: 'medium', message: 'Skipped test found', location: 'test.ts:5' }
            ],
            low: []
          },
          byType: {
            'test-manipulation': [],
            'coverage-bypass': [],
            'fake-assertions': [],
            'disabled-tests': [
              { type: 'disabled-tests', severity: 'medium', message: 'Skipped test found', location: 'test.ts:5' }
            ]
          }
        }
      };

      const markdown = generator.generateMarkdownReport(report);

      expect(markdown).toContain('# Test Fraud Detection Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('- **Status**: ❌ FAILED');
      expect(markdown).toContain('- **Overall Score**: 85/100');
      expect(markdown).toContain('- **Total Violations**: 2');
      expect(markdown).toContain('### Recommendation');
      expect(markdown).toContain('Some issues detected. Review and improve test quality.');
      expect(markdown).toContain('## Metrics');
      expect(markdown).toContain('- Files Checked: 3');
      expect(markdown).toContain('## Violations');
      expect(markdown).toContain('### Medium (1)');
      expect(markdown).toContain('- **disabled-tests**: Skipped test found');
      expect(markdown).toContain('- Location: `test.ts:5`');
    });

    it('should show PASSED status for clean reports in markdown', () => {
      const report: FraudReport = {
        timestamp: '2023-07-23T12:00:00.000Z',
        summary: {
          overallScore: 100,
          passed: true,
          totalViolations: 0,
          criticalViolations: 0,
          recommendation: 'Tests appear to be genuine and well-written.'
        },
        details: {
          fraudCheck: {
            passed: true,
            score: 100,
            violations: [],
            metrics: { filesChecked: 2, totalTests: 8, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 0 }
          }
        },
        violations: {
          bySeverity: { critical: [], high: [], medium: [], low: [] },
          byType: { 'test-manipulation': [], 'coverage-bypass': [], 'fake-assertions': [], 'disabled-tests': [] }
        }
      };

      const markdown = generator.generateMarkdownReport(report);

      expect(markdown).toContain('- **Status**: ✅ PASSED');
      expect(markdown).toContain('- **Overall Score**: 100/100');
    });

    it('should skip empty violation categories in markdown', () => {
      const report: FraudReport = {
        timestamp: '2023-07-23T12:00:00.000Z',
        summary: {
          overallScore: 90,
          passed: false,
          totalViolations: 1,
          criticalViolations: 0,
          recommendation: 'Minor issues detected.'
        },
        details: {
          fraudCheck: {
            passed: false,
            score: 90,
            violations: [
              { type: 'disabled-tests', severity: 'low', message: 'Minor issue', location: 'test.ts' }
            ],
            metrics: { filesChecked: 1, totalTests: 5, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 1 }
          }
        },
        violations: {
          bySeverity: {
            critical: [],
            high: [],
            medium: [],
            low: [
              { type: 'disabled-tests', severity: 'low', message: 'Minor issue', location: 'test.ts' }
            ]
          },
          byType: {
            'test-manipulation': [],
            'coverage-bypass': [],
            'fake-assertions': [],
            'disabled-tests': [
              { type: 'disabled-tests', severity: 'low', message: 'Minor issue', location: 'test.ts' }
            ]
          }
        }
      };

      const markdown = generator.generateMarkdownReport(report);

      expect(markdown).not.toContain('### Critical (0)');
      expect(markdown).not.toContain('### High (0)');
      expect(markdown).not.toContain('### Medium (0)');
      expect(markdown).toContain('### Low (1)');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle violations without patterns', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 80,
        violations: [
          { type: 'test-manipulation', severity: 'medium', message: 'Issue without pattern', location: 'test.ts' }
        ],
        metrics: { filesChecked: 1, totalTests: 5, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 1 }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.violations.bySeverity.medium).toHaveLength(1);
      expect(report.violations.bySeverity.medium[0]).not.toHaveProperty('pattern');
    });

    it('should handle empty violations array', async () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: true,
        score: 100,
        violations: [],
        metrics: { filesChecked: 0, totalTests: 0, skippedTests: 0, emptyTests: 0, suspiciousPatterns: 0 }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.summary.totalViolations).toBe(0);
      expect(report.summary.criticalViolations).toBe(0);
      expect(Object.values(report.violations.bySeverity).every(arr => arr.length === 0)).toBe(true);
      expect(Object.values(report.violations.byType).every(arr => arr.length === 0)).toBe(true);
    });

    it('should handle very large numbers of violations', async () => {
      const violations: FraudViolation[] = [];
      for (let i = 0; i < 1000; i++) {
        violations.push({
          type: 'fake-assertions',
          severity: 'low',
          message: `Violation ${i}`,
          location: `test${i}.ts`
        });
      }

      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 0,
        violations,
        metrics: { filesChecked: 1000, totalTests: 5000, skippedTests: 100, emptyTests: 50, suspiciousPatterns: 1000 }
      };

      const report = await generator.generateReport(fraudCheckResult);

      expect(report.summary.totalViolations).toBe(1000);
      expect(report.violations.bySeverity.low).toHaveLength(1000);
      expect(report.violations.byType['fake-assertions']).toHaveLength(1000);
    });
  });
});