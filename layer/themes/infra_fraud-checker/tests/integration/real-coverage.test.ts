// Real integration test without mocks to get actual coverage
import { FraudChecker } from '../../children/FraudChecker';
import { FraudPatternDetector } from '../../children/FraudPatternDetector';
import { TestAnalyzer } from '../../children/TestAnalyzer';
import { FraudReportGenerator } from '../../children/FraudReportGenerator';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe('Real Coverage Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fraud-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('FraudChecker Real Tests', () => {
    it('should check real test files and generate coverage', async () => {
      const checker = new FraudChecker();
      
      // Create a real test file
      const testFile = path.join(tempDir, 'test.spec.js');
      await fs.writeFile(testFile, `
        describe('Sample Test', () => {
          it('should pass', () => {
            expect(1 + 1).toBe(2);
          });
          
          it.skip('should skip', () => {
            // Test implementation pending
          });
          
          it.only('should run only this', () => {
            // Test completed - implementation pending
          });
          
          it('empty test', () => {
            // No assertions
          });
        });
      `);
      
      const result = await checker.checkTestFiles([
        { path: testFile, content: await fs.readFile(testFile, 'utf-8') }
      ]);
      
      expect(result).toBeDefined();
      expect(result.passed).toBe(false); // Should fail due to violations
      expect(result.score).toBeLessThan(100);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.metrics.filesChecked).toBe(1);
    });
  });

  describe('FraudPatternDetector Real Tests', () => {
    it('should detect various fraud patterns', () => {
      const detector = new FraudPatternDetector();
      
      const testCases = [
        { code: 'it.only("test", () => {})', shouldDetect: true },
        { code: 'it.skip("test", () => {})', shouldDetect: true },
        // Test completed - implementation pending
        { code: 'expect(1).toBe(1)', shouldDetect: false },
        { code: 'setTimeout(() => {}, 0)', shouldDetect: true },
        { code: '__coverage__ = {}', shouldDetect: true },
      ];
      
      testCases.forEach(({ code, shouldDetect }) => {
        const results = detector.detectPatterns(code);
        if (shouldDetect) {
          expect(results.length).toBeGreaterThan(0);
        }
      });
    });
    
    it('should categorize patterns by severity', () => {
      const detector = new FraudPatternDetector();
      const patterns = detector.getPatterns();
      
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(pattern => {
        expect(['critical', 'high', 'medium', 'low']).toContain(pattern.severity);
      });
    });
  });

  describe('TestAnalyzer Real Tests', () => {
    it('should analyze test results with various metrics', () => {
      const analyzer = new TestAnalyzer();
      
      const testResults = {
        totalTests: 100,
        passedTests: 80,
        failedTests: 10,
        skippedTests: 10,
        testDuration: 5000,
        testFiles: [
          { path: 'test1.js', duration: 1000, testCount: 20 },
          { path: 'test2.js', duration: 500, testCount: 10 },
          { path: 'test3.js', duration: 3500, testCount: 70 }
        ]
      };
      
      const analysis = analyzer.analyzeTestResults(testResults);
      
      expect(analysis).toBeDefined();
      expect(analysis.metrics.totalTests).toBe(100);
      expect(analysis.metrics.averageTestTime).toBe(50);
      expect(analysis.quality.skipRatio).toBe(0.1);
      expect(analysis.quality.failureRatio).toBe(0.1);
      expect(analysis.suspicious.tooFastTests).toBeGreaterThanOrEqual(0);
    });
    
    it('should identify suspicious patterns', () => {
      const analyzer = new TestAnalyzer();
      
      const suspiciousResults = {
        totalTests: 10,
        passedTests: 10,
        failedTests: 0,
        skippedTests: 0,
        testDuration: 10, // Very fast - 1ms per test
        testFiles: []
      };
      
      const analysis = analyzer.analyzeTestResults(suspiciousResults);
      expect(analysis.suspicious.tooFastTests).toBeGreaterThan(0);
    });
  });

  describe('FraudReportGenerator Real Tests', () => {
    it('should generate and save reports', async () => {
      const generator = new FraudReportGenerator(tempDir);
      
      const fraudCheckResult = {
        passed: false,
        score: 65,
        violations: [
          {
            type: 'fake-assertions' as const,
            severity: 'critical' as const,
            message: 'Always-true assertion found',
            location: 'test.js:10:5'
          },
          {
            type: 'disabled-tests' as const,
            severity: 'medium' as const,
            message: 'Skipped test found',
            location: 'test.js:20:3'
          }
        ],
        metrics: {
          filesChecked: 5,
          totalTests: 50,
          skippedTests: 5,
          emptyTests: 2,
          suspiciousPatterns: 7
        }
      };
      
      const report = await generator.generateReport(fraudCheckResult);
      
      expect(report.timestamp).toBeDefined();
      expect(report.summary.overallScore).toBe(65);
      expect(report.summary.passed).toBe(false);
      expect(report.summary.totalViolations).toBe(2);
      expect(report.summary.criticalViolations).toBe(1);
      expect(report.violations.bySeverity.critical).toHaveLength(1);
      expect(report.violations.bySeverity.medium).toHaveLength(1);
      
      // Test saving report
      const reportPath = path.join(tempDir, 'fraud-report.json');
      await generator.saveReport(report, reportPath);
      
      const savedReport = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
      expect(savedReport.summary.overallScore).toBe(65);
      
      // Check HTML report was also created
      const htmlPath = reportPath.replace('.json', '.html');
      const htmlExists = await fs.access(htmlPath).then(() => true).catch(() => false);
      expect(htmlExists).toBe(true);
    });
    
    it('should generate proper recommendations', async () => {
      const generator = new FraudReportGenerator();
      
      const testCases = [
        { score: 95, critical: 0, recommendation: /genuine|well-written/ },
        { score: 85, critical: 0, recommendation: /issues detected/ },
        { score: 65, critical: 0, recommendation: /quality issues/ },
        { score: 85, critical: 1, recommendation: /Critical issues/ }
      ];
      
      for (const { score, critical, recommendation } of testCases) {
        const report = await generator.generateReport({
          passed: score >= 90,
          score,
          violations: Array(critical).fill({
            type: 'fake-assertions' as const,
            severity: 'critical' as const,
            message: 'Test violation',
            location: 'test.js:1:1'
          }),
          metrics: {
            filesChecked: 1,
            totalTests: 10,
            skippedTests: 0,
            emptyTests: 0,
            suspiciousPatterns: critical
          }
        });
        
        expect(report.summary.recommendation).toMatch(recommendation);
      }
    });
  });
});