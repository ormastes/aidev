import { EventEmitter } from 'node:events';
import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';
import { TestResult } from '../domain/test-result';
import { TestConfiguration, validateTestConfiguration } from '../domain/test-configuration';
import { ReportConfig, MultiFormatReports, createDefaultReportConfig } from '../domain/report-config';
import { MockExternalLogger } from '../internal/mock-external-logger';
import { SetupAggregator } from '../services/setup-aggregator';
import { PassCriteriaValidator } from '../services/pass-criteria-validator';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


/**
 * Report Generator - External Interface Implementation
 * 
 * Generates comprehensive test reports in multiple formats (HTML, JSON, XML)
 * with support for custom styling, metadata, and file system integration.
 */
export class ReportGenerator extends EventEmitter {
  private configuration: TestConfiguration | null = null;
  private reportConfig: ReportConfig;
  private externalLogger: MockExternalLogger | null = null;
  private setupAggregator: SetupAggregator;
  private passCriteriaValidator: PassCriteriaValidator;

  constructor() {
    super();
    this.reportConfig = createDefaultReportConfig();
    this.setupAggregator = new SetupAggregator();
    this.passCriteriaValidator = new PassCriteriaValidator(this.setupAggregator);
  }

  /**
   * Configure the report generator with test configuration
   * @param config Test configuration object
   */
  async configure(config: any): void {
    validateTestConfiguration(config);
    
    // Apply defaults for missing fields
    this.configuration = {
      outputFormats: ['json'],
      outputDirectory: './test-results',
      logLevel: 'info',
      ...config
    };
    
    // Update report config with any provided report options
    if (config.reportOptions) {
      this.reportConfig = {
        ...this.reportConfig,
        ...config.reportOptions
      };
    }
    
    this.emit('log', `[INFO] Report Generator configured for suite: ${config.testSuiteId}`);
  }

  /**
   * Set external logger for report generation
   * @param logger External logger instance
   */
  async setExternalLogger(logger: MockExternalLogger): void {
    this.externalLogger = logger;
    this.emit('log', '[INFO] External logger set for Report Generator');
  }

  /**
   * Get current configuration
   * @returns Current test configuration
   */
  async getConfiguration(): TestConfiguration {
    if (!this.configuration) {
      throw new Error('Report generator not configured');
    }
    return { ...this.configuration };
  }

  /**
   * Generate HTML report from test results
   * @param testResult Test results to generate report from
   * @returns Generated HTML report content
   */
  async generateHTMLReport(testResult: TestResult): Promise<string> {
    this.emit("reportStart", {
      format: 'html',
      testSuiteId: testResult.testSuiteId,
      timestamp: new Date()
    });

    this.emit("progress", {
      type: 'html-generation',
      message: 'Generating HTML report',
      timestamp: new Date()
    });

    try {
      const htmlContent = this.buildHTMLReport(testResult);
      
      this.emit("reportComplete", {
        format: 'html',
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date(),
        size: htmlContent.length
      });

      return htmlContent;
    } catch (error) {
      this.emit('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        format: 'html',
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Generate JSON report from test results
   * @param testResult Test results to generate report from
   * @returns Generated JSON report content
   */
  async generateJSONReport(testResult: TestResult): Promise<string> {
    this.emit("reportStart", {
      format: 'json',
      testSuiteId: testResult.testSuiteId,
      timestamp: new Date()
    });
    
    // Log to external logger if available
    if (this.externalLogger && this.configuration) {
      this.externalLogger.log(this.configuration.testSuiteId, 'info', 'Generating JSON report');
    }

    this.emit("progress", {
      type: 'json-generation',
      message: 'Generating JSON report',
      timestamp: new Date()
    });

    try {
      const jsonContent = await this.buildJSONReport(testResult);
      
      this.emit("reportComplete", {
        format: 'json',
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date(),
        size: jsonContent.length
      });

      return jsonContent;
    } catch (error) {
      this.emit('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        format: 'json',
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Generate Markdown report from test results
   * @param testResult Test results to generate report from
   * @returns Generated Markdown report content
   */
  async generateMarkdownReport(testResult: TestResult): Promise<string> {
    this.emit("reportStart", {
      format: "markdown",
      testSuiteId: testResult.testSuiteId,
      timestamp: new Date()
    });

    this.emit("progress", {
      type: 'markdown-generation',
      message: 'Generating Markdown report',
      timestamp: new Date()
    });

    try {
      const markdownContent = await this.buildMarkdownReport(testResult);
      
      this.emit("reportComplete", {
        format: "markdown",
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date(),
        size: markdownContent.length
      });

      return markdownContent;
    } catch (error) {
      this.emit('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        format: "markdown",
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Generate XML report from test results
   * @param testResult Test results to generate report from
   * @returns Generated XML report content
   */
  async generateXMLReport(testResult: TestResult): Promise<string> {
    this.emit("reportStart", {
      format: 'xml',
      testSuiteId: testResult.testSuiteId,
      timestamp: new Date()
    });

    this.emit("progress", {
      type: 'xml-generation',
      message: 'Generating XML report',
      timestamp: new Date()
    });

    try {
      const xmlContent = this.buildXMLReport(testResult);
      
      this.emit("reportComplete", {
        format: 'xml',
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date(),
        size: xmlContent.length
      });

      return xmlContent;
    } catch (error) {
      this.emit('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        format: 'xml',
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Generate CSV report from test results
   * @param testResult Test results to generate report from
   * @returns Generated CSV report content
   */
  async generateCSVReport(testResult: TestResult): Promise<string> {
    this.emit("reportStart", {
      format: 'csv',
      testSuiteId: testResult.testSuiteId,
      timestamp: new Date()
    });

    this.emit("progress", {
      type: 'csv-generation',
      message: 'Generating CSV report',
      timestamp: new Date()
    });

    try {
      const csvContent = this.buildCSVReport(testResult);
      
      this.emit("reportComplete", {
        format: 'csv',
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date(),
        size: csvContent.length
      });

      return csvContent;
    } catch (error) {
      this.emit('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        format: 'csv',
        testSuiteId: testResult.testSuiteId,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Generate reports in all configured formats
   * @param testResult Test results to generate reports from
   * @returns Generated reports in all formats
   */
  async generateAllReports(testResult: TestResult): Promise<MultiFormatReports> {
    const reports: MultiFormatReports = {};
    const outputFormats = this.configuration?.outputFormats || ['json'];

    this.emit("progress", {
      type: 'multi-format-generation',
      message: `Generating reports in ${outputFormats.length} formats`,
      timestamp: new Date()
    });

    for (const format of outputFormats) {
      switch (format) {
        case 'html':
          reports.html = await this.generateHTMLReport(testResult);
          break;
        case 'json':
          reports.json = await this.generateJSONReport(testResult);
          break;
        case 'xml':
          reports.xml = await this.generateXMLReport(testResult);
          break;
        case 'csv':
          reports.csv = await this.generateCSVReport(testResult);
          break;
        case "markdown":
        case 'md':
          reports.markdown = await this.generateMarkdownReport(testResult);
          break;
        default:
          this.emit('error', {
            error: `Unsupported format: ${format}`,
            format,
            testSuiteId: testResult.testSuiteId,
            timestamp: new Date()
          });
          throw new Error(`Unsupported format: ${format}`);
      }
    }

    return reports;
  }

  /**
   * Save reports to file system
   * @param testResult Test results to generate and save reports from
   * @returns Array of file paths where reports were saved
   */
  async saveReports(testResult: TestResult): Promise<string[]> {
    const reports = await this.generateAllReports(testResult);
    const outputDirectory = this.configuration?.outputDirectory || './test-results';
    const filePaths: string[] = [];

    // Ensure output directory exists
    await fileAPI.createDirectory(outputDirectory);

    // Save each report format
    for (const [format, content] of Object.entries(reports)) {
      if (content) {
        const fileName = this.generateFileName(testResult.testSuiteId, format);
        const filePath = join(outputDirectory, fileName);
        
        await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY })
        });
      }
    }

    return filePaths;
  }

  /**
   * Check if report generator is configured
   * @returns True if configured, false otherwise
   */
  async isConfigured(): boolean {
    return this.configuration !== null;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.configuration = null;
    this.reportConfig = createDefaultReportConfig();
    this.removeAllListeners();
    
    this.emit('log', '[INFO] Report generator cleanup In Progress');
  }

  /**
   * Build HTML report content
   * @param testResult Test results to build report from
   * @returns Generated HTML content
   */
  private async buildHTMLReport(testResult: TestResult): string {
    const title = this.reportConfig.title || 'Mock Free Test Oriented Development Test Report';
    const description = this.reportConfig.description || 'Automated Mock Free Test Oriented Development test execution results';
    const theme = this.reportConfig.htmlStyling?.theme || 'light';
    const includeBootstrap = this.reportConfig.htmlStyling?.includeBootstrap ?? true;
    
    const bootstrapCSS = includeBootstrap ? 
      '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">' : '';
    
    const customCSS = this.reportConfig.htmlStyling?.customCSS || '';
    
    const statsHTML = this.buildStatsHTML(testResult);
    const scenariosHTML = this.buildScenariosHTML(testResult);
    const logsHTML = this.buildLogsHTML(testResult);
    
    return `<!DOCTYPE html>
<html lang="en" data-bs-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${bootstrapCSS}
    <style>
        ${customCSS}
        .scenario-In Progress { color: #28a745; }
        .scenario-failed { color: #dc3545; }
        .scenario-pending { color: #ffc107; }
        .scenario-skipped { color: #6c757d; }
        .step-In Progress { color: #28a745; }
        .step-failed { color: #dc3545; }
        .step-pending { color: #ffc107; }
        .step-skipped { color: #6c757d; }
        .error-message { font-family: monospace; background-color: #f8f9fa; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container mt-4">
        <h1>${title}</h1>
        <p class="lead">${description}</p>
        
        <div class="row mb-4">
            <div class="col-md-6">
                <h3>Test Suite: ${testResult.testSuiteId}</h3>
                <p><strong>Start Time:</strong> ${testResult.startTime.toISOString()}</p>
                <p><strong>End Time:</strong> ${testResult.endTime.toISOString()}</p>
                <p><strong>Duration:</strong> ${testResult.statistics.executionTime}ms</p>
            </div>
            <div class="col-md-6">
                ${statsHTML}
            </div>
        </div>
        
        <h3>Test Scenarios</h3>
        ${scenariosHTML}
        
        <h3 class="mt-4">Test Execution Logs</h3>
        ${logsHTML}
        
        <footer class="mt-5 pt-3 border-top">
            <p class="text-muted">Generated on ${new Date().toISOString()}</p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * Build statistics HTML section
   * @param testResult Test results to build stats from
   * @returns Generated statistics HTML
   */
  private async buildStatsHTML(testResult: TestResult): string {
    const successRate = ((testResult.passedScenarios / testResult.totalScenarios) * 100).toFixed(1);
    
    return `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Test Statistics</h5>
                <p><strong>Total Scenarios:</strong> ${testResult.totalScenarios}</p>
                <p><strong>In Progress:</strong> <span class="scenario-In Progress">${testResult.passedScenarios}</span></p>
                <p><strong>Failed:</strong> <span class="scenario-failed">${testResult.failedScenarios}</span></p>
                <p><strong>Pending:</strong> <span class="scenario-pending">${testResult.pendingScenarios}</span></p>
                <p><strong>Skipped:</strong> <span class="scenario-skipped">${testResult.skippedScenarios}</span></p>
                <p><strong>In Progress Rate:</strong> ${successRate}%</p>
            </div>
        </div>
    `;
  }

  /**
   * Build scenarios HTML section
   * @param testResult Test results to build scenarios from
   * @returns Generated scenarios HTML
   */
  private async buildScenariosHTML(testResult: TestResult): string {
    return testResult.scenarios.map(scenario => {
      const stepsHTML = scenario.steps.map(step => `
        <li class="list-group-item d-flex justify-content-between align-items-start">
            <div class="ms-2 me-auto">
                <div class="fw-bold step-${step.status}">${step.text}</div>
                <small>Duration: ${step.duration}ms</small>
                ${step.errorMessage ? `<div class="error-message mt-2">${step.errorMessage}</div>` : ''}
            </div>
            <span class="badge bg-${step.status === 'passed' ? 'success' : step.status === 'failed' ? 'danger' : "secondary"} rounded-pill">
                ${step.status}
            </span>
        </li>
      `).join('');
      
      return `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0 scenario-${scenario.status}">${scenario.name}</h5>
                <span class="badge bg-${scenario.status === 'passed' ? 'success' : scenario.status === 'failed' ? 'danger' : "secondary"}">
                    ${scenario.status}
                </span>
            </div>
            <div class="card-body">
                <p><strong>Duration:</strong> ${scenario.duration}ms</p>
                ${scenario.errorMessage ? `<div class="error-message mb-3">${scenario.errorMessage}</div>` : ''}
                <h6>Steps:</h6>
                <ol class="list-group list-group-numbered">
                    ${stepsHTML}
                </ol>
            </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Build JSON report content
   * @param testResult Test results to build report from
   * @returns Generated JSON content
   */
  private async buildJSONReport(testResult: TestResult): Promise<string> {
    const indent = this.reportConfig.jsonFormatting?.indent || 2;
    const sortKeys = this.reportConfig.jsonFormatting?.sortKeys || false;
    
    // Aggregate setup folder metrics
    let aggregatedMetrics = null;
    let setupConfig = null;
    
    try {
      aggregatedMetrics = await this.setupAggregator.aggregateMetrics();
      setupConfig = await this.setupAggregator.getSetupConfig();
    } catch (error) {
      this.emit('log', `[WARN] Failed to aggregate setup metrics: ${error}`);
    }
    
    const reportData = {
      ...testResult,
      metadata: {
        ...testResult.metadata,
        reportGenerated: new Date().toISOString(),
        reportGenerator: 'Mock Free Test Oriented Development Story Reporter',
        ...this.reportConfig.metadata,
        // Add aggregated coverage and duplication data
        coverage: aggregatedMetrics ? {
          systemTest: aggregatedMetrics.aggregatedMetrics.systemTest,
          overall: aggregatedMetrics.aggregatedMetrics.overall
        } : testResult.metadata?.coverage,
        duplication: aggregatedMetrics && aggregatedMetrics.themes.length > 0 ? {
          percentage: aggregatedMetrics.passCriteria.duplicationThreshold.actual,
          duplicatedLines: aggregatedMetrics.themes.reduce((sum, t) => sum + t.duplication.duplicatedLines, 0),
          totalLines: aggregatedMetrics.themes.reduce((sum, t) => sum + t.duplication.totalLines, 0),
          duplicatedBlocks: aggregatedMetrics.themes.flatMap(t => t.duplication.duplicatedBlocks)
        } : testResult.metadata?.duplication,
        setupConfig: setupConfig || testResult.metadata?.setupConfig
      },
      logs: testResult.metadata?.logEntries || []
    };
    
    if (sortKeys) {
      return JSON.stringify(reportData, Object.keys(reportData).sort(), indent);
    }
    
    return JSON.stringify(reportData, null, indent);
  }

  /**
   * Build logs HTML section
   * @param testResult Test results containing log entries
   * @returns Generated logs HTML
   */
  private async buildLogsHTML(testResult: TestResult): string {
    const logEntries = testResult.metadata?.logEntries || [];
    
    if (logEntries.length === 0) {
      return '<div class="alert alert-info">No log entries available</div>';
    }
    
    const logsHTML = logEntries.map((log: any) => {
      const levelClass: Record<string, string> = {
        'error': 'danger',
        'warn': 'warning',
        'info': 'info',
        'debug': "secondary",
        'trace': 'light'
      };
      const badgeClass = levelClass[log.level] || "secondary";
      
      return `
        <div class="log-entry mb-2">
          <span class="badge bg-${badgeClass}">${log.level.toUpperCase()}</span>
          <span class="text-muted">${new Date(log.timestamp).toISOString()}</span>
          <span class="ms-2">${log.message}</span>
        </div>
      `;
    }).join('');
    
    return `
      <div class="card">
        <div class="card-body" style="max-height: 400px; overflow-y: auto;">
          ${logsHTML}
        </div>
      </div>
    `;
  }

  /**
   * Build XML report content (JUnit format)
   * @param testResult Test results to build report from
   * @returns Generated XML content
   */
  private async buildXMLReport(testResult: TestResult): string {
    const encoding = this.reportConfig.xmlFormatting?.encoding || 'UTF-8';
    const standalone = this.reportConfig.xmlFormatting?.standalone ?? true;
    const indent = this.reportConfig.xmlFormatting?.indent || 2;
    
    const xmlHeader = `<?xml version="1.0" encoding="${encoding}"${standalone ? ' standalone="yes"' : ''}?>`;
    
    const testCases = testResult.scenarios.map(scenario => {
      const duration = (scenario.duration / 1000).toFixed(3); // Convert to seconds
      const className = testResult.testSuiteId;
      
      let testCaseContent = `<testcase name="${this.escapeXML(scenario.name)}" classname="${className}" time="${duration}">`;
      
      if (scenario.status === 'failed') {
        testCaseContent += `
${' '.repeat(indent * 3)}<failure message="${this.escapeXML(scenario.errorMessage || 'Test failed')}" type="AssertionError">
${' '.repeat(indent * 4)}${this.escapeXML(scenario.errorMessage || 'Test failed')}
${' '.repeat(indent * 3)}</failure>`;
      } else if (scenario.status === 'skipped') {
        testCaseContent += `
${' '.repeat(indent * 3)}<skipped message="Test skipped" />`;
      }
      
      testCaseContent += `
${' '.repeat(indent * 2)}</testcase>`;
      
      return testCaseContent;
    }).join('');
    
    const executionTime = (testResult.statistics.executionTime / 1000).toFixed(3);
    
    return `${xmlHeader}
<testsuites>
${' '.repeat(indent)}<testsuite name="${this.escapeXML(testResult.testSuiteId)}" 
${' '.repeat(indent * 2)}tests="${testResult.totalScenarios}" 
${' '.repeat(indent * 2)}failures="${testResult.failedScenarios}" 
${' '.repeat(indent * 2)}errors="0" 
${' '.repeat(indent * 2)}time="${executionTime}"
${' '.repeat(indent * 2)}timestamp="${testResult.startTime.toISOString()}">
${testCases}
${' '.repeat(indent)}</testsuite>
</testsuites>`;
  }

  /**
   * Generate file name based on pattern
   * @param testSuiteId Test suite identifier
   * @param format Report format
   * @returns Generated file name
   */
  private async generateFileName(testSuiteId: string, format: string): string {
    const pattern = this.reportConfig.fileNamePattern || '{testSuiteId}-{timestamp}-{format}';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    return pattern
      .replace('{testSuiteId}', testSuiteId)
      .replace('{timestamp}', timestamp)
      .replace('{format}', format) + `.${format}`;
  }

  /**
   * Escape XML special characters
   * @param text Text to escape
   * @returns Escaped text
   */
  private async escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Build CSV report content
   * @param testResult Test results to build report from
   * @returns Generated CSV content
   */
  private async buildCSVReport(testResult: TestResult): string {
    const rows: string[] = [];
    
    // Add header
    rows.push('scenario_name,status,duration_ms,steps_total,steps_passed,steps_failed,error_message');
    
    // Add scenario data
    testResult.scenarios.forEach(scenario => {
      const stepsPassed = scenario.steps.filter(s => s.status === 'passed').length;
      const stepsFailed = scenario.steps.filter(s => s.status === 'failed').length;
      
      const row = [
        this.escapeCSV(scenario.name),
        scenario.status,
        scenario.duration.toString(),
        scenario.steps.length.toString(),
        stepsPassed.toString(),
        stepsFailed.toString(),
        this.escapeCSV(scenario.errorMessage || '')
      ].join(',');
      
      rows.push(row);
    });
    
    return rows.join('\n');
  }

  /**
   * Build Markdown report content
   * @param testResult Test results to build report from
   * @returns Generated Markdown content
   */
  private async buildMarkdownReport(testResult: TestResult): Promise<string> {
    const now = new Date();
    const sections: string[] = [];
    
    // Header
    sections.push(`# Test Report: ${testResult.testSuiteId}`);
    sections.push(`\n**Generated:** ${now.toISOString()}`);
    sections.push(`**Status:** ${testResult.status}`);
    sections.push(`**Duration:** ${testResult.statistics.executionTime}ms`);
    
    // Summary Statistics
    sections.push('\n## Summary');
    sections.push('| Metric | Value |');
    sections.push('|--------|-------|');
    sections.push(`| Total Scenarios | ${testResult.totalScenarios} |`);
    sections.push(`| Passed | ${testResult.passedScenarios} |`);
    sections.push(`| Failed | ${testResult.failedScenarios} |`);
    sections.push(`| Success Rate | ${testResult.statistics.successRate.toFixed(2)}% |`);
    sections.push(`| Execution Time | ${testResult.statistics.executionTime}ms |`);
    
    // Coverage Information (if available)
    if (testResult.metadata?.coverage) {
      const coverage = testResult.metadata.coverage;
      sections.push('\n## Coverage');
      sections.push('| Type | Percentage | Covered/Total |');
      sections.push('|------|------------|---------------|');
      if (coverage.systemTest) {
        const st = coverage.systemTest;
        sections.push(`| System Test Classes | ${st.class?.percentage || 0}% | ${st.class?.covered || 0}/${st.class?.total || 0} |`);
        sections.push(`| System Test Branches | ${st.branch?.percentage || 0}% | ${st.branch?.covered || 0}/${st.branch?.total || 0} |`);
      }
      if (coverage.overall) {
        const ov = coverage.overall;
        sections.push(`| Overall Classes | ${ov.class?.percentage || 0}% | ${ov.class?.covered || 0}/${ov.class?.total || 0} |`);
        sections.push(`| Overall Branches | ${ov.branch?.percentage || 0}% | ${ov.branch?.covered || 0}/${ov.branch?.total || 0} |`);
        sections.push(`| Overall Lines | ${ov.line?.percentage || 0}% | ${ov.line?.covered || 0}/${ov.line?.total || 0} |`);
        sections.push(`| Overall Methods | ${ov.method?.percentage || 0}% | ${ov.method?.covered || 0}/${ov.method?.total || 0} |`);
      }
    }
    
    // Duplication Information (if available)
    if (testResult.metadata?.duplication) {
      const dup = testResult.metadata.duplication;
      sections.push('\n## Code Duplication');
      sections.push(`- **Duplication Percentage:** ${dup.percentage || 0}%`);
      sections.push(`- **Duplicated Lines:** ${dup.duplicatedLines || 0} / ${dup.totalLines || 0}`);
      if (dup.duplicatedBlocks && dup.duplicatedBlocks.length > 0) {
        sections.push(`- **Duplicated Blocks:** ${dup.duplicatedBlocks.length}`);
      }
    }
    
    // Scenarios
    sections.push('\n## Test Scenarios');
    testResult.scenarios.forEach((scenario, idx) => {
      sections.push(`\n### ${idx + 1}. ${scenario.name}`);
      sections.push(`- **Status:** ${scenario.status}`);
      sections.push(`- **Duration:** ${scenario.duration}ms`);
      
      if (scenario.errorMessage) {
        sections.push(`- **Error:** ${scenario.errorMessage}`);
      }
      
      if (scenario.steps && scenario.steps.length > 0) {
        sections.push('\n**Steps:**');
        scenario.steps.forEach((step, stepIdx) => {
          const icon = step.status === 'passed' ? '✅' : step.status === 'failed' ? '❌' : '⏭️';
          sections.push(`${stepIdx + 1}. ${icon} ${step.text}`);
          if (step.errorMessage) {
            sections.push(`   - Error: ${step.errorMessage}`);
          }
        });
      }
    });
    
    // Log Entries
    const logEntries = testResult.metadata?.logEntries || [];
    if (logEntries.length > 0) {
      sections.push('\n## Log Entries');
      sections.push('```');
      logEntries.forEach((log: any) => {
        sections.push(`[${log.level.toUpperCase()}] ${new Date(log.timestamp).toISOString()} - ${log.message}`);
      });
      sections.push('```');
    }
    
    // Setup Configuration (if available)
    if (testResult.metadata?.setupConfig) {
      const setup = testResult.metadata.setupConfig;
      sections.push('\n## Test Setup Configuration');
      sections.push(`- **Test Framework:** ${setup.testFramework || 'N/A'}`);
      sections.push(`- **Environment:** ${setup.environment || 'N/A'}`);
      sections.push(`- **Test Timeout:** ${setup.testTimeout || 'N/A'}ms`);
      if (setup.coverageThreshold) {
        sections.push('- **Coverage Thresholds:**');
        Object.entries(setup.coverageThreshold).forEach(([key, value]) => {
          sections.push(`  - ${key}: ${value}%`);
        });
      }
    }
    
    // Pass Criteria Validation
    try {
      const validation = await this.passCriteriaValidator.validate(testResult);
      sections.push('\n## Pass Criteria Validation');
      sections.push(`**Overall Status:** ${validation.passed ? '✅ PASSED' : '❌ FAILED'}`);
      sections.push(`**Passed Criteria:** ${validation.summary.passedCriteria}/${validation.summary.totalCriteria}`);
      
      sections.push('\n### Criteria Results');
      validation.criteria.forEach(criterion => {
        const icon = criterion.passed ? '✅' : '❌';
        sections.push(`- ${icon} **${criterion.name}**: ${criterion.actual.toFixed(2)}% (threshold: ${criterion.threshold}%)`);
      });
    } catch (error) {
      sections.push('\n## Pass Criteria Validation');
      sections.push('⚠️ Unable to validate pass criteria: ' + error);
    }
    
    // Footer
    sections.push('\n---');
    sections.push(`*Report generated by ${this.reportConfig.metadata?.reportGenerator || 'Mock Free Test Oriented Development Story Reporter'}*`);
    
    return sections.join('\n');
  }

  /**
   * Escape CSV special characters
   * @param text Text to escape
   * @returns Escaped text
   */
  private async escapeCSV(text: string): string {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }
}