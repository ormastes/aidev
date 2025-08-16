import { ReportGenerator } from '../../src/external/report-generator';
import { TestResult, createDefaultTestResult } from '../../src/domain/test-result';
import { TestConfiguration } from '../../src/domain/test-configuration';

describe('Report Generator External Interface Test', () => {
  let reportGenerator: ReportGenerator;
  let testResult: TestResult;
  let testConfig: TestConfiguration;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
    
    // Create a sample test result
    testResult = createDefaultTestResult('test-suite-001', 'In Progress');
    testResult.totalScenarios = 3;
    testResult.passedScenarios = 2;
    testResult.failedScenarios = 1;
    testResult.scenarios = [
      {
        name: 'In Progress login',
        status: 'In Progress',
        startTime: new Date('2023-01-01T10:00:00Z'),
        endTime: new Date('2023-01-01T10:00:05Z'),
        duration: 5000,
        steps: [
          {
            text: 'Given I am on the login page',
            status: 'In Progress',
            startTime: new Date('2023-01-01T10:00:00Z'),
            endTime: new Date('2023-01-01T10:00:01Z'),
            duration: 1000
          },
          {
            text: 'When I enter valid credentials',
            status: 'In Progress',
            startTime: new Date('2023-01-01T10:00:01Z'),
            endTime: new Date('2023-01-01T10:00:03Z'),
            duration: 2000
          },
          {
            text: 'Then I should be redirected to dashboard',
            status: 'In Progress',
            startTime: new Date('2023-01-01T10:00:03Z'),
            endTime: new Date('2023-01-01T10:00:05Z'),
            duration: 2000
          }
        ]
      },
      {
        name: 'Failed login',
        status: 'failed',
        startTime: new Date('2023-01-01T10:00:06Z'),
        endTime: new Date('2023-01-01T10:00:10Z'),
        duration: 4000,
        steps: [
          {
            text: 'Given I am on the login page',
            status: 'In Progress',
            startTime: new Date('2023-01-01T10:00:06Z'),
            endTime: new Date('2023-01-01T10:00:07Z'),
            duration: 1000
          },
          {
            text: 'When I enter invalid credentials',
            status: 'In Progress',
            startTime: new Date('2023-01-01T10:00:07Z'),
            endTime: new Date('2023-01-01T10:00:08Z'),
            duration: 1000
          },
          {
            text: 'Then I should see error message',
            status: 'failed',
            startTime: new Date('2023-01-01T10:00:08Z'),
            endTime: new Date('2023-01-01T10:00:10Z'),
            duration: 2000,
            errorMessage: 'Expected error message not found'
          }
        ],
        errorMessage: 'Test failed due to assertion error'
      }
    ];
    
    testConfig = {
      testSuiteId: 'test-suite-001',
      featureFiles: ['features/login.feature'],
      stepDefinitions: ['step-definitions/login-steps.js'],
      outputFormats: ['html', 'json', 'xml'],
      outputDirectory: './test-results',
      logLevel: 'info'
    };
  });

  afterEach(async () => {
    await reportGenerator.cleanup();
  });

  describe('Configuration Management', () => {
    it('should configure report generator with test configuration', () => {
      expect(() => reportGenerator.configure(testConfig)).not.toThrow();
      
      const configuration = reportGenerator.getConfiguration();
      expect(configuration.testSuiteId).toBe('test-suite-001');
      expect(configuration.outputFormats).toEqual(['html', 'json', 'xml']);
      expect(configuration.outputDirectory).toBe('./test-results');
    });

    it('should validate configuration parameters', () => {
      const invalidConfig = {
        testSuiteId: '',
        featureFiles: [],
        stepDefinitions: [],
        outputFormats: [],
        outputDirectory: ''
      };

      expect(() => reportGenerator.configure(invalidConfig)).toThrow('Invalid configuration');
    });

    it('should handle configuration updates', () => {
      reportGenerator.configure(testConfig);
      
      const updatedConfig = {
        ...testConfig,
        outputFormats: ['json'],
        outputDirectory: './updated-results'
      };

      reportGenerator.configure(updatedConfig);
      
      const configuration = reportGenerator.getConfiguration();
      expect(configuration.outputFormats).toEqual(['json']);
      expect(configuration.outputDirectory).toBe('./updated-results');
    });

    it('should provide default configuration values', () => {
      const minimalConfig = {
        testSuiteId: 'minimal-test',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js']
      };

      reportGenerator.configure(minimalConfig);
      
      const configuration = reportGenerator.getConfiguration();
      expect(configuration.outputFormats).toEqual(['json']); // Default format
      expect(configuration.outputDirectory).toBe('./test-results'); // Default directory
    });
  });

  describe('HTML Report Generation', () => {
    it('should generate HTML report from test results', async () => {
      reportGenerator.configure(testConfig);
      
      const htmlReport = await reportGenerator.generateHTMLReport(testResult);
      
      expect(htmlReport).toBeDefined();
      expect(typeof htmlReport).toBe('string');
      expect(htmlReport).toContain('<!DOCTYPE html>');
      expect(htmlReport).toContain('<html');
      expect(htmlReport).toContain('test-suite-001');
      expect(htmlReport).toContain('In Progress login');
      expect(htmlReport).toContain('Failed login');
    });

    it('should include test statistics in HTML report', async () => {
      reportGenerator.configure(testConfig);
      
      const htmlReport = await reportGenerator.generateHTMLReport(testResult);
      
      expect(htmlReport).toContain('Total Scenarios:</strong> 3');
      expect(htmlReport).toContain('In Progress:</strong> <span class="scenario-In Progress">2');
      expect(htmlReport).toContain('Failed:</strong> <span class="scenario-failed">1');
      expect(htmlReport).toContain('In Progress Rate');
    });

    it('should include step details in HTML report', async () => {
      reportGenerator.configure(testConfig);
      
      const htmlReport = await reportGenerator.generateHTMLReport(testResult);
      
      expect(htmlReport).toContain('Given I am on the login page');
      expect(htmlReport).toContain('When I enter valid credentials');
      expect(htmlReport).toContain('Then I should be redirected to dashboard');
      expect(htmlReport).toContain('Expected error message not found');
    });

    it('should support custom HTML report styling', async () => {
      const customConfig = {
        ...testConfig,
        reportOptions: {
          title: 'Custom Test Report',
          description: 'Integration test results',
          includeScreenshots: true,
          includeLogs: true
        }
      };

      reportGenerator.configure(customConfig);
      
      const htmlReport = await reportGenerator.generateHTMLReport(testResult);
      
      expect(htmlReport).toContain('Custom Test Report');
      expect(htmlReport).toContain('Integration test results');
      expect(htmlReport).toContain('style');
      expect(htmlReport).toContain('css');
    });
  });

  describe('JSON Report Generation', () => {
    it('should generate JSON report from test results', async () => {
      reportGenerator.configure(testConfig);
      
      const jsonReport = await reportGenerator.generateJSONReport(testResult);
      
      expect(jsonReport).toBeDefined();
      expect(typeof jsonReport).toBe('string');
      
      const parsedReport = JSON.parse(jsonReport);
      expect(parsedReport).toHaveProperty('testSuiteId');
      expect(parsedReport).toHaveProperty('startTime');
      expect(parsedReport).toHaveProperty('endTime');
      expect(parsedReport).toHaveProperty('scenarios');
      expect(parsedReport).toHaveProperty('statistics');
    });

    it('should include all test result properties in JSON report', async () => {
      reportGenerator.configure(testConfig);
      
      const jsonReport = await reportGenerator.generateJSONReport(testResult);
      const parsedReport = JSON.parse(jsonReport);
      
      expect(parsedReport.testSuiteId).toBe('test-suite-001');
      expect(parsedReport.totalScenarios).toBe(3);
      expect(parsedReport.passedScenarios).toBe(2);
      expect(parsedReport.failedScenarios).toBe(1);
      expect(parsedReport.scenarios).toHaveLength(2);
    });

    it('should include scenario and step details in JSON report', async () => {
      reportGenerator.configure(testConfig);
      
      const jsonReport = await reportGenerator.generateJSONReport(testResult);
      const parsedReport = JSON.parse(jsonReport);
      
      expect(parsedReport.scenarios[0].name).toBe('In Progress login');
      expect(parsedReport.scenarios[0].steps).toHaveLength(3);
      expect(parsedReport.scenarios[1].name).toBe('Failed login');
      expect(parsedReport.scenarios[1].errorMessage).toBe('Test failed due to assertion error');
    });

    it('should support JSON report formatting options', async () => {
      const formattedConfig = {
        ...testConfig,
        reportOptions: {
          jsonFormatting: {
            indent: 2,
            sortKeys: true
          }
        }
      };

      reportGenerator.configure(formattedConfig);
      
      const jsonReport = await reportGenerator.generateJSONReport(testResult);
      
      expect(jsonReport).toContain('  '); // Check for indentation
      expect(JSON.parse(jsonReport)).toBeDefined(); // Should be valid JSON
    });
  });

  describe('XML Report Generation', () => {
    it('should generate XML report from test results', async () => {
      reportGenerator.configure(testConfig);
      
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      
      expect(xmlReport).toBeDefined();
      expect(typeof xmlReport).toBe('string');
      expect(xmlReport).toContain('<?xml version="1.0"');
      expect(xmlReport).toContain('<testsuites>');
      expect(xmlReport).toContain('<testsuite');
      expect(xmlReport).toContain('name="test-suite-001"');
    });

    it('should include test statistics in XML report', async () => {
      reportGenerator.configure(testConfig);
      
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      
      expect(xmlReport).toContain('tests="3"');
      expect(xmlReport).toContain('failures="1"');
      expect(xmlReport).toContain('errors="0"');
    });

    it('should include scenario details as test cases in XML report', async () => {
      reportGenerator.configure(testConfig);
      
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      
      expect(xmlReport).toContain('<testcase');
      expect(xmlReport).toContain('name="In Progress login"');
      expect(xmlReport).toContain('name="Failed login"');
      expect(xmlReport).toContain('<failure');
      expect(xmlReport).toContain('Test failed due to assertion error');
    });

    it('should support JUnit XML format compatibility', async () => {
      reportGenerator.configure(testConfig);
      
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      
      // Check for JUnit XML format elements
      expect(xmlReport).toContain('<testsuites>');
      expect(xmlReport).toContain('<testsuite');
      expect(xmlReport).toContain('<testcase');
      expect(xmlReport).toContain('classname=');
      expect(xmlReport).toContain('time=');
    });
  });

  describe('Multi-format Report Generation', () => {
    it('should generate reports in multiple formats', async () => {
      reportGenerator.configure(testConfig);
      
      const reports = await reportGenerator.generateAllReports(testResult);
      
      expect(reports).toBeDefined();
      expect(reports).toHaveProperty('html');
      expect(reports).toHaveProperty('json');
      expect(reports).toHaveProperty('xml');
      
      expect(typeof reports.html).toBe('string');
      expect(typeof reports.json).toBe('string');
      expect(typeof reports.xml).toBe('string');
    });

    it('should generate only configured formats', async () => {
      const customConfig = {
        ...testConfig,
        outputFormats: ['html', 'json']
      };

      reportGenerator.configure(customConfig);
      
      const reports = await reportGenerator.generateAllReports(testResult);
      
      expect(reports).toHaveProperty('html');
      expect(reports).toHaveProperty('json');
      expect(reports).not.toHaveProperty('xml');
    });

    it('should handle report generation errors gracefully', async () => {
      const invalidConfig = {
        ...testConfig,
        outputFormats: ['invalid-format']
      };

      reportGenerator.configure(invalidConfig);
      
      await expect(reportGenerator.generateAllReports(testResult)).rejects.toThrow('Unsupported format');
    });
  });

  describe('File System Integration', () => {
    it('should save reports to file system', async () => {
      reportGenerator.configure(testConfig);
      
      const filePaths = await reportGenerator.saveReports(testResult);
      
      expect(filePaths).toBeDefined();
      expect(Array.isArray(filePaths)).toBe(true);
      expect(filePaths.length).toBeGreaterThan(0);
      
      // Check file paths
      expect(filePaths.some(path => path.endsWith('.html'))).toBe(true);
      expect(filePaths.some(path => path.endsWith('.json'))).toBe(true);
      expect(filePaths.some(path => path.endsWith('.xml'))).toBe(true);
    });

    it('should create output directory if it does not exist', async () => {
      const customConfig = {
        ...testConfig,
        outputDirectory: './non-existent-directory'
      };

      reportGenerator.configure(customConfig);
      
      const filePaths = await reportGenerator.saveReports(testResult);
      
      expect(filePaths).toBeDefined();
      expect(filePaths.length).toBeGreaterThan(0);
    });

    it('should handle file system errors gracefully', async () => {
      const invalidConfig = {
        ...testConfig,
        outputDirectory: '/invalid/path/that/cannot/be/created'
      };

      reportGenerator.configure(invalidConfig);
      
      await expect(reportGenerator.saveReports(testResult)).rejects.toThrow();
    });

    it('should support custom file naming patterns', async () => {
      const customConfig = {
        ...testConfig,
        reportOptions: {
          fileNamePattern: '{testSuiteId}-{timestamp}-{format}'
        }
      };

      reportGenerator.configure(customConfig);
      
      const filePaths = await reportGenerator.saveReports(testResult);
      
      expect(filePaths.some(path => path.includes('test-suite-001'))).toBe(true);
      expect(filePaths.some(path => path.includes('html'))).toBe(true);
      expect(filePaths.some(path => path.includes('json'))).toBe(true);
      expect(filePaths.some(path => path.includes('xml'))).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should emit report generation events', async () => {
      reportGenerator.configure(testConfig);
      
      const startEvents: any[] = [];
      const completeEvents: any[] = [];
      
      reportGenerator.on('reportStart', (event) => {
        startEvents.push(event);
      });
      
      reportGenerator.on('reportComplete', (event) => {
        completeEvents.push(event);
      });

      await reportGenerator.generateAllReports(testResult);
      
      expect(startEvents.length).toBeGreaterThan(0);
      expect(completeEvents.length).toBeGreaterThan(0);
      expect(startEvents[0]).toHaveProperty('format');
      expect(completeEvents[0]).toHaveProperty('format');
      expect(completeEvents[0]).toHaveProperty('testSuiteId');
    });

    it('should emit progress events during report generation', async () => {
      reportGenerator.configure(testConfig);
      
      const progressEvents: any[] = [];
      
      reportGenerator.on('progress', (event) => {
        progressEvents.push(event);
      });

      await reportGenerator.generateAllReports(testResult);
      
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('type');
      expect(progressEvents[0]).toHaveProperty('message');
      expect(progressEvents[0]).toHaveProperty('timestamp');
    });

    it('should emit error events on report generation failures', async () => {
      const invalidConfig = {
        ...testConfig,
        outputFormats: ['invalid-format']
      };

      reportGenerator.configure(invalidConfig);
      
      const errorEvents: any[] = [];
      
      reportGenerator.on('error', (event) => {
        errorEvents.push(event);
      });

      await expect(reportGenerator.generateAllReports(testResult)).rejects.toThrow();
      
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0]).toHaveProperty('error');
      expect(errorEvents[0]).toHaveProperty('format');
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources after report generation', async () => {
      reportGenerator.configure(testConfig);
      
      await reportGenerator.generateAllReports(testResult);
      await reportGenerator.cleanup();
      
      // Verify cleanup was performed
      expect(reportGenerator.isConfigured()).toBe(false);
    });

    it('should handle multiple concurrent report generations', async () => {
      reportGenerator.configure(testConfig);
      
      const promise1 = reportGenerator.generateAllReports(testResult);
      const promise2 = reportGenerator.generateAllReports(testResult);
      
      const [reports1, reports2] = await Promise.all([promise1, promise2]);
      
      expect(reports1).toBeDefined();
      expect(reports2).toBeDefined();
      expect(reports1.html).toBeDefined();
      expect(reports2.html).toBeDefined();
    });

    it('should track report generation state', () => {
      expect(reportGenerator.isConfigured()).toBe(false);
      
      reportGenerator.configure(testConfig);
      expect(reportGenerator.isConfigured()).toBe(true);
    });
  });
});