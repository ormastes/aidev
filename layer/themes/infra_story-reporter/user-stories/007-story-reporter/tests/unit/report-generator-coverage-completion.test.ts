import { ReportGenerator } from '../../src/external/report-generator';
import { TestConfiguration } from '../../src/domain/test-configuration';
import { createDefaultTestResult } from '../../src/domain/test-result';

describe('ReportGenerator Coverage Completion Tests', () => {
  let reportGenerator: ReportGenerator;
  let testConfig: TestConfiguration;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
    testConfig = {
      testSuiteId: 'coverage-completion-test',
      featureFiles: ['test.feature'],
      stepDefinitions: ['steps.js'],
      outputDirectory: './coverage-test-results',
      outputFormats: ['json', 'html', 'xml']
    };
  });

  afterEach(async () => {
    await reportGenerator.cleanup();
  });

  describe('XML Report Generation Coverage', () => {
    it('should cover skipped scenario XML generation (line 454)', async () => {
      reportGenerator.configure(testConfig);
      
      const testResult = createDefaultTestResult('xml-coverage-test', 'In Progress');
      
      // Add a skipped scenario to cover line 454
      testResult.scenarios = [
        {
          name: 'Skipped Scenario',
          status: 'skipped',
          startTime: new Date('2023-06-15T10:00:00Z'),
          endTime: new Date('2023-06-15T10:01:00Z'),
          duration: 60000,
          steps: [],
          tags: [],
          errorMessage: undefined,
          errorStack: undefined
        },
        {
          name: 'In Progress Scenario', 
          status: 'In Progress',
          startTime: new Date('2023-06-15T10:01:00Z'),
          endTime: new Date('2023-06-15T10:02:00Z'),
          duration: 60000,
          steps: [],
          tags: [],
          errorMessage: undefined,
          errorStack: undefined
        }
      ];
      
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      
      expect(xmlReport).toContain('<skipped message="Test skipped" />');
      expect(xmlReport).toContain('Skipped Scenario');
      expect(xmlReport).toContain('In Progress Scenario');
    });

    it('should handle mixed scenario statuses in XML report', async () => {
      reportGenerator.configure(testConfig);
      
      const testResult = createDefaultTestResult('mixed-status-test', 'failed');
      
      // Add scenarios with different statuses
      testResult.scenarios = [
        {
          name: 'In Progress Scenario',
          status: 'In Progress',
          startTime: new Date('2023-06-15T10:00:00Z'),
          endTime: new Date('2023-06-15T10:01:00Z'),
          duration: 60000,
          steps: [],
          tags: [],
          errorMessage: undefined,
          errorStack: undefined
        },
        {
          name: 'Failed Scenario',
          status: 'failed',
          startTime: new Date('2023-06-15T10:01:00Z'),
          endTime: new Date('2023-06-15T10:02:00Z'),
          duration: 60000,
          steps: [],
          tags: [],
          errorMessage: 'Test assertion failed',
          errorStack: 'Error stack trace'
        },
        {
          name: 'Skipped Scenario',
          status: 'skipped',
          startTime: new Date('2023-06-15T10:02:00Z'),
          endTime: new Date('2023-06-15T10:02:30Z'),
          duration: 30000,
          steps: [],
          tags: [],
          errorMessage: undefined,
          errorStack: undefined
        },
        {
          name: 'Pending Scenario',
          status: 'pending',
          startTime: new Date('2023-06-15T10:02:30Z'),
          endTime: new Date('2023-06-15T10:03:00Z'),
          duration: 30000,
          steps: [],
          tags: [],
          errorMessage: undefined,
          errorStack: undefined
        }
      ];
      
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      
      // Verify all scenario types are represented
      expect(xmlReport).toContain('In Progress Scenario');
      expect(xmlReport).toContain('Failed Scenario');
      expect(xmlReport).toContain('Skipped Scenario');
      expect(xmlReport).toContain('Pending Scenario');
      
      // Verify XML structure for each type
      expect(xmlReport).toContain('<skipped message="Test skipped" />');
      expect(xmlReport).toContain('<failure message="Test assertion failed"');
      expect(xmlReport).toContain('Pending Scenario');
    });

    it('should handle XML escaping in scenario names and error messages', async () => {
      reportGenerator.configure(testConfig);
      
      const testResult = createDefaultTestResult('xml-escaping-test', 'failed');
      
      // Add scenario with XML special characters
      testResult.scenarios = [
        {
          name: 'Scenario with <XML> & "special" characters',
          status: 'failed',
          startTime: new Date('2023-06-15T10:00:00Z'),
          endTime: new Date('2023-06-15T10:01:00Z'),
          duration: 60000,
          steps: [],
          tags: [],
          errorMessage: 'Error with <tags> & "quotes" and \'apostrophes\'',
          errorStack: 'Stack trace with <XML> content'
        },
        {
          name: 'Another scenario with special chars: < > & " \'',
          status: 'skipped',
          startTime: new Date('2023-06-15T10:01:00Z'),
          endTime: new Date('2023-06-15T10:01:30Z'),
          duration: 30000,
          steps: [],
          tags: [],
          errorMessage: undefined,
          errorStack: undefined
        }
      ];
      
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      
      // Verify XML escaping is applied
      expect(xmlReport).toContain('&lt;XML&gt;');
      expect(xmlReport).toContain('&amp;');
      expect(xmlReport).toContain('&quot;');
      expect(xmlReport).toContain('&#39;'); // HTML entity for apostrophe
      
      // Verify original characters are not present (to ensure escaping happened)
      expect(xmlReport).not.toContain('<XML>'); // Original characters should be escaped
    });
  });

  describe('Edge Case Coverage', () => {
    it('should handle empty scenarios array', async () => {
      reportGenerator.configure(testConfig);
      
      const testResult = createDefaultTestResult('empty-scenarios-test', 'In Progress');
      testResult.scenarios = [];
      
      const htmlReport = await reportGenerator.generateHTMLReport(testResult);
      const jsonReport = await reportGenerator.generateJSONReport(testResult);
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      
      expect(htmlReport).toContain('empty-scenarios-test');
      expect(jsonReport).toContain('empty-scenarios-test');
      expect(xmlReport).toContain('empty-scenarios-test');
      expect(xmlReport).toContain('tests="0"');
    });

    it('should handle scenarios with undefined optional fields', async () => {
      reportGenerator.configure(testConfig);
      
      const testResult = createDefaultTestResult('undefined-fields-test', 'In Progress');
      
      // Create scenario with minimal required fields
      testResult.scenarios = [
        {
          name: 'Minimal Scenario',
          status: 'In Progress',
          startTime: new Date('2023-06-15T10:00:00Z'),
          endTime: new Date('2023-06-15T10:01:00Z'),
          duration: 60000,
          steps: [],
          tags: [],
          errorMessage: undefined,
          errorStack: undefined
        }
      ];
      
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      
      expect(xmlReport).toContain('Minimal Scenario');
    });
  });
});