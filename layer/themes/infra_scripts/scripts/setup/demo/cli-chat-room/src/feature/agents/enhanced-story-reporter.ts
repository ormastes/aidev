/**
 * Enhanced Story Reporter Agent
 * Reports on stories, system tests, coverage, and external calls
 */

import { BaseCoordinatorAgent } from './coordinator-interface';
import { WSMessage, MessageType } from '../types/messages';
import { externalLogLib } from '../logging/external-log-lib';
import { MermaidParser, ParsedSequenceDiagram } from '../utils/mermaid-parser';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { StoryReportGenerator } from '../../scripts/generate-story-reports';

export interface TestCoverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface SystemTest {
  name: string;
  storyId: string;
  diagramId: string;
  status: 'IN_PROGRESS' | 'failed' | 'skipped';
  coverage?: TestCoverage;
  duration: number;
  externalCalls: string[];
}

export interface EnhancedStoryReport {
  reportId: string;
  timestamp: Date;
  roomId: string;
  storyId: string;
  storyStatus: 'IN_PROGRESS' | 'FAILURE' | 'UNKNOWN';
  narrative: string;
  events: any[];
  systemTests: SystemTest[];
  sequenceDiagrams: {
    id: string;
    expectedCalls: string[];
    actualCalls: string[];
    validation: {
      matched: boolean;
      missing: string[];
      unexpected: string[];
    };
  }[];
  coverage: {
    overall: TestCoverage;
    byTest: Record<string, TestCoverage>;
  };
  externalAccess: {
    totalCalls: number;
    byFunction: Record<string, number>;
    byType: Record<string, number>;
  };
  failureReasons?: string[];
}

export interface EnhancedStoryReporterConfig {
  reportInterval?: number;
  storyLogDir?: string;
  testResultsDir?: string;
  sequenceDiagramsDir?: string;
  includeStackTraces?: boolean;
}

export class EnhancedStoryReporterAgent extends BaseCoordinatorAgent {
  private config: EnhancedStoryReporterConfig;
  private storyBuffer: any[] = [];
  private reportTimer?: NodeJS.Timeout;
  private testResults: Map<string, SystemTest> = new Map();
  private sequenceDiagrams: Map<string, ParsedSequenceDiagram> = new Map();
  private reportGenerator: StoryReportGenerator;

  constructor(
    serverUrl: string,
    roomId: string,
    agentName: string = 'EnhancedStoryReporter',
    config: EnhancedStoryReporterConfig = {}
  ) {
    super(serverUrl, roomId, agentName);
    
    this.config = {
      reportInterval: config.reportInterval || 60000,
      storyLogDir: config.storyLogDir || path.join(process.cwd(), 'logs', 'stories'),
      testResultsDir: config.testResultsDir || path.join(process.cwd(), 'test-results'),
      sequenceDiagramsDir: config.sequenceDiagramsDir || path.join(process.cwd(), 'docs', 'diagrams'),
      includeStackTraces: config.includeStackTraces || false
    };
    
    this.ensureDirectories();
    this.loadSequenceDiagrams();
    this.reportGenerator = new StoryReportGenerator();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.config.storyLogDir,
      this.config.testResultsDir,
      this.config.sequenceDiagramsDir
    ];
    
    dirs.forEach(dir => {
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private loadSequenceDiagrams(): void {
    if (!this.config.sequenceDiagramsDir || !fs.existsSync(this.config.sequenceDiagramsDir)) {
      return;
    }

    const files = fs.readdirSync(this.config.sequenceDiagramsDir)
      .filter(f => f.endsWith('.mermaid'));

    files.forEach(file => {
      const content = fs.readFileSync(
        path.join(this.config.sequenceDiagramsDir!, file),
        'utf8'
      );
      
      const diagramId = file.replace('.mermaid', '');
      const parsed = MermaidParser.parseSequenceDiagram(content, diagramId);
      this.sequenceDiagrams.set(diagramId, parsed);
    });

    console.log(`Loaded ${this.sequenceDiagrams.size} sequence diagrams`);
  }

  protected async handleConnect(): Promise<void> {
    await super.handleConnect();
    console.log(`📊 Enhanced Story Reporter connected to room ${this.roomId}`);
    
    // Enable external logging
    externalLogLib.enable();
    
    // Start periodic reporting
    this.startReporting();
    
    // Announce capabilities
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: "📊 Enhanced Story Reporter active. Tracking stories, tests, coverage, and external calls.",
      metadata: {
        agent: this.agentName,
        capabilities: [
          'story_tracking',
          'test_coverage',
          'sequence_diagram_validation',
          'external_call_monitoring'
        ]
      }
    });
  }

  protected async handleMessage(message: WSMessage<any>): Promise<void> {
    // Track all messages
    this.trackEvent(message);
    
    if (message.type === MessageType.USER_MESSAGE) {
      const content = message.content.toLowerCase();
      
      if (content.includes('story report') || content.includes('test report')) {
        await this.generateEnhancedReport();
      } else if (content.includes('coverage')) {
        await this.reportCoverage();
      } else if (content.includes('external calls')) {
        await this.reportExternalCalls();
      } else if (content.includes('test') && content.includes('In Progress')) {
        // Parse test result from message
        this.parseTestResult(message.content);
      }
    }
  }

  private trackEvent(message: WSMessage<any>): void {
    this.storyBuffer.push({
      timestamp: new Date(),
      type: message.type,
      sender: message.sender,
      content: message.content,
      metadata: message.metadata
    });

    // Keep buffer manageable
    if (this.storyBuffer.length > 1000) {
      this.storyBuffer = this.storyBuffer.slice(-500);
    }
  }

  private parseTestResult(content: string): void {
    // Pattern: "test_US001_SD001_login In Progress with Improving coverage"
    const match = content.match(/test_(\w+)_(\w+)_(\w+)\s+(In Progress|failed|skipped)(?:\s+with\s+(\d+)%\s+coverage)?/);
    
    if (match) {
      const [, storyId, diagramId, scenario, status, coverage] = match;
      const testName = `test_${storyId}_${diagramId}_${scenario}`;
      
      const test: SystemTest = {
        name: testName,
        storyId,
        diagramId,
        status: status as 'IN_PROGRESS' | 'failed' | 'skipped',
        duration: 0, // Would come from actual test runner
        externalCalls: externalLogLib.getLogsForTest(testName).map(l => l.functionName),
        coverage: coverage ? {
          statements: parseInt(coverage),
          branches: parseInt(coverage),
          functions: parseInt(coverage),
          lines: parseInt(coverage)
        } : undefined
      };
      
      this.testResults.set(testName, test);
    }
  }

  private startReporting(): void {
    this.reportTimer = setInterval(() => {
      this.generatePeriodicReport();
    }, this.config.reportInterval!);
  }

  private async generatePeriodicReport(): Promise<void> {
    const report = await this.createEnhancedReport();
    
    // Generate both JSON and Markdown reports
    const paths = await this.reportGenerator.generateReports(report);
    
    // Also save to legacy location if configured
    if (this.config.storyLogDir) {
      const filename = `enhanced-story-${Date.now()}.json`;
      const filepath = path.join(this.config.storyLogDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    }
    
    // Send summary to chat
    const summary = this.summarizeReport(report);
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: `📊 **Enhanced Story Report**\n${summary}\n\n📁 Report saved:\n- JSON: ${path.basename(paths.json)}\n- Markdown: ${path.basename(paths.markdown)}`,
      metadata: {
        agent: this.agentName,
        reportType: 'periodic',
        reportId: report.reportId,
        reportPaths: paths
      }
    });
  }

  private async createEnhancedReport(): Promise<EnhancedStoryReport> {
    const storyId = this.detectCurrentStory();
    const systemTests = Array.from(this.testResults.values())
      .filter(t => t.storyId === storyId);
    
    // Get external calls
    const externalLogs = externalLogLib.getLogs();
    const externalStats = externalLogLib.getStats();
    
    // Validate sequence diagrams
    const diagramValidations = this.validateSequenceDiagrams(systemTests);
    
    // Calculate coverage
    const coverage = this.calculateCoverage(systemTests);
    
    // Determine story status and collect failure reasons
    const { status, failureReasons } = this.determineStoryStatus(storyId, systemTests, coverage, diagramValidations);
    
    return {
      reportId: `enhanced-${Date.now()}`,
      timestamp: new Date(),
      roomId: this.roomId,
      storyId,
      storyStatus: status,
      narrative: this.generateNarrative(storyId, systemTests, coverage),
      events: this.storyBuffer,
      systemTests,
      sequenceDiagrams: diagramValidations,
      coverage,
      externalAccess: {
        totalCalls: externalLogs.length,
        byFunction: externalStats.byFunction,
        byType: externalStats.byType
      },
      failureReasons: failureReasons.length > 0 ? failureReasons : undefined
    };
  }
  
  private determineStoryStatus(
    storyId: string,
    tests: SystemTest[],
    coverage: EnhancedStoryReport['coverage'],
    diagramValidations: EnhancedStoryReport['sequenceDiagrams']
  ): { status: 'IN_PROGRESS' | 'FAILURE' | 'UNKNOWN'; failureReasons: string[] } {
    const failureReasons: string[] = [];
    const MIN_COVERAGE = 80;
    const MIN_TESTS = 1;
    
    // Check for no tests
    if (tests.length === 0) {
      failureReasons.push('No system tests found');
      return { status: 'FAILURE', failureReasons };
    }
    
    // Check naming convention
    if (!this.testsFollowNamingConvention(tests)) {
      failureReasons.push('Tests do not follow naming convention');
    }
    
    // Check test count
    if (tests.length < MIN_TESTS) {
      failureReasons.push(`Insufficient tests (found: ${tests.length}, required: ${MIN_TESTS})`);
    }
    
    // Check coverage
    if (coverage.overall.statements < MIN_COVERAGE) {
      failureReasons.push(`Coverage too low (${coverage.overall.statements.toFixed(1)}% < ${MIN_COVERAGE}%)`);
    }
    
    // Check failed tests
    const failedTests = tests.filter(t => t.status === 'failed');
    if (failedTests.length > 0) {
      failureReasons.push(`${failedTests.length} test(s) failed`);
    }
    
    // Check sequence diagram validation
    const invalidDiagrams = diagramValidations.filter(d => !d.validation.matched);
    if (invalidDiagrams.length > 0) {
      failureReasons.push(`${invalidDiagrams.length} sequence diagram(s) validation failed`);
    }
    
    if (failureReasons.length > 0) {
      return { status: 'FAILURE', failureReasons };
    }
    
    return { status: 'IN_PROGRESS', failureReasons: [] };
  }

  private detectCurrentStory(): string {
    // Analyze recent events to detect story
    const recentTests = Array.from(this.testResults.values())
      .slice(-5);
    
    if (recentTests.length > 0) {
      // Use most common story ID from recent tests
      const storyCounts = new Map<string, number>();
      recentTests.forEach(test => {
        storyCounts.set(test.storyId, (storyCounts.get(test.storyId) || 0) + 1);
      });
      
      return Array.from(storyCounts.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    return 'US001_Unknown';
  }

  private validateSequenceDiagrams(tests: SystemTest[]): EnhancedStoryReport['sequenceDiagrams'] {
    const validations: EnhancedStoryReport['sequenceDiagrams'] = [];
    
    // Group tests by diagram
    const testsByDiagram = new Map<string, SystemTest[]>();
    tests.forEach(test => {
      const diagTests = testsByDiagram.get(test.diagramId) || [];
      diagTests.push(test);
      testsByDiagram.set(test.diagramId, diagTests);
    });
    
    // Validate each diagram
    testsByDiagram.forEach((diagTests, diagramId) => {
      const diagram = this.sequenceDiagrams.get(diagramId);
      if (!diagram) return;
      
      // Collect all external calls from tests
      const actualCalls = new Set<string>();
      diagTests.forEach(test => {
        test.externalCalls.forEach(call => actualCalls.add(call));
      });
      
      const validation = MermaidParser.validateExternalCalls(
        diagram,
        Array.from(actualCalls)
      );
      
      validations.push({
        id: diagramId,
        expectedCalls: diagram.externalCalls,
        actualCalls: Array.from(actualCalls),
        validation
      });
    });
    
    return validations;
  }

  private calculateCoverage(tests: SystemTest[]): EnhancedStoryReport['coverage'] {
    const byTest: Record<string, TestCoverage> = {};
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;
    let count = 0;
    
    tests.forEach(test => {
      if (test.coverage) {
        byTest[test.name] = test.coverage;
        
        // Aggregate coverage (simplified - real implementation would merge coverage data)
        coveredStatements += test.coverage.statements;
        coveredBranches += test.coverage.branches;
        coveredFunctions += test.coverage.functions;
        coveredLines += test.coverage.lines;
        count++;
      }
    });
    
    const overall: TestCoverage = count > 0 ? {
      statements: coveredStatements / count,
      branches: coveredBranches / count,
      functions: coveredFunctions / count,
      lines: coveredLines / count
    } : {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    };
    
    return { overall, byTest };
  }

  private generateNarrative(
    storyId: string,
    tests: SystemTest[],
    coverage: EnhancedStoryReport['coverage']
  ): string {
    const inProgress = tests.filter(t => t.status === 'IN_PROGRESS').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const coveragePercent = coverage.overall.statements;
    
    // Define minimum requirements
    const MIN_COVERAGE = 80;
    const MIN_TESTS = 1;
    
    let narrative = `Story ${storyId}: `;
    let storyStatus = 'UNKNOWN';
    
    // Check failure conditions
    if (tests.length === 0) {
      storyStatus = 'FAILURE';
      narrative += '❌ FAILURE - No system tests found. Every story must have at least one system test.';
    } else if (!this.testsFollowNamingConvention(tests)) {
      storyStatus = 'FAILURE';
      narrative += '❌ FAILURE - Tests do not follow naming convention (test_<STORY_ID>_<DIAGRAM_ID>_<SCENARIO>).';
    } else if (tests.length < MIN_TESTS) {
      storyStatus = 'FAILURE';
      narrative += `❌ FAILURE - Insufficient tests. Required: ${MIN_TESTS}, Found: ${tests.length}.`;
    } else if (coveragePercent < MIN_COVERAGE) {
      storyStatus = 'FAILURE';
      narrative += `❌ FAILURE - Coverage too low. Required: ${MIN_COVERAGE}%, Actual: ${coveragePercent.toFixed(1)}%.`;
    } else if (failed > 0) {
      storyStatus = 'FAILURE';
      narrative += `❌ FAILURE - ${failed} test(s) failed. All tests must pass.`;
    } else {
      storyStatus = 'IN_PROGRESS';
      narrative += `🔄 In Progress - All ${inProgress} system tests IN_PROGRESS with ${coveragePercent.toFixed(1)}% coverage.`;
    }
    
    // Add failure details
    if (storyStatus === 'FAILURE') {
      narrative += '\n\n**Required Actions:**';
      if (tests.length === 0) {
        narrative += '\n- Create system tests following naming convention: test_' + storyId + '_<DIAGRAM_ID>_<SCENARIO>';
      }
      if (coveragePercent < MIN_COVERAGE && tests.length > 0) {
        narrative += `\n- Increase test coverage to at least ${MIN_COVERAGE}%`;
      }
      if (failed > 0) {
        narrative += '\n- Fix failing tests';
      }
    }
    
    return narrative;
  }
  
  private testsFollowNamingConvention(tests: SystemTest[]): boolean {
    // Pattern: test_<STORY_ID>_<DIAGRAM_ID>_<SCENARIO>
    const pattern = /^test_[A-Z0-9]+_[A-Z0-9]+_\w+$/;
    return tests.every(test => pattern.test(test.name));
  }

  private summarizeReport(report: EnhancedStoryReport): string {
    const { systemTests, coverage, sequenceDiagrams, externalAccess } = report;
    
    const inProgress = systemTests.filter(t => t.status === 'IN_PROGRESS').length;
    const total = systemTests.length;
    const diagValidations = sequenceDiagrams.filter(d => d.validation.matched).length;
    const totalDiagrams = sequenceDiagrams.length;
    
    return `
- Story: ${report.storyId}
- Tests: ${inProgress}/${total} in progress
- Coverage: ${coverage.overall.statements.toFixed(1)}% statements
- Diagrams: ${diagValidations}/${totalDiagrams} validated
- External Calls: ${externalAccess.totalCalls} total
- ${report.narrative}`;
  }

  private async generateEnhancedReport(): Promise<void> {
    const report = await this.createEnhancedReport();
    
    // Generate both JSON and Markdown reports
    const paths = await this.reportGenerator.generateReports(report);
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: `📊 **Enhanced Story Report**\n${this.createDetailedSummary(report)}\n\n📁 Report saved:\n- JSON: ${path.basename(paths.json)}\n- Markdown: ${path.basename(paths.markdown)}\n- Full path: ${paths.combined}`,
      metadata: {
        agent: this.agentName,
        reportType: 'requested',
        fullReport: report,
        reportPaths: paths
      }
    });
  }

  private createDetailedSummary(report: EnhancedStoryReport): string {
    // Start with story status
    const statusIcon = report.storyStatus === 'IN_PROGRESS' ? '🔄' : '❌';
    let summary = `\n**STORY STATUS: ${statusIcon} ${report.storyStatus}**\n`;
    
    // Add failure reasons if any
    if (report.failureReasons && report.failureReasons.length > 0) {
      summary += '\n**Failure Reasons:**';
      report.failureReasons.forEach(reason => {
        summary += `\n- ❌ ${reason}`;
      });
      summary += '\n';
    }
    
    summary += '\n' + this.summarizeReport(report);
    
    // Add test details
    if (report.systemTests.length > 0) {
      summary += '\n\n**System Tests:**';
      report.systemTests.forEach(test => {
        const coverage = test.coverage ? ` (${test.coverage.statements}% coverage)` : '';
        const testStatus = test.status === 'IN_PROGRESS' ? '🔄' : '❌';
        summary += `\n- ${testStatus} ${test.name}: ${test.status}${coverage}`;
      });
    } else {
      summary += '\n\n**System Tests:**\n- ❌ NO TESTS FOUND';
    }
    
    // Add diagram validation
    if (report.sequenceDiagrams.length > 0) {
      summary += '\n\n**Sequence Diagram Validation:**';
      report.sequenceDiagrams.forEach(diag => {
        const status = diag.validation.matched ? '🔄' : '❌';
        summary += `\n- ${diag.id}: ${status}`;
        if (diag.validation.missing.length > 0) {
          summary += ` Missing: ${diag.validation.missing.join(', ')}`;
        }
        if (diag.validation.unexpected.length > 0) {
          summary += ` Unexpected: ${diag.validation.unexpected.join(', ')}`;
        }
      });
    }
    
    // Add external call summary
    const topCalls = Object.entries(report.externalAccess.byFunction)
      .sort((a, b) => (b[1] as any).count - (a[1] as any).count)
      .slice(0, 5);
    
    if (topCalls.length > 0) {
      summary += '\n\n**Top External Calls:**';
      topCalls.forEach(([func, stats]) => {
        summary += `\n- ${func}: ${(stats as any).count} calls`;
      });
    }
    
    return summary;
  }

  private async reportCoverage(): Promise<void> {
    const tests = Array.from(this.testResults.values());
    const coverage = this.calculateCoverage(tests);
    
    let report = `📊 **Test Coverage Report**\n`;
    report += `- Overall: ${coverage.overall.statements.toFixed(1)}% statements\n`;
    report += `- Branches: ${coverage.overall.branches.toFixed(1)}%\n`;
    report += `- Functions: ${coverage.overall.functions.toFixed(1)}%\n`;
    report += `- Lines: ${coverage.overall.lines.toFixed(1)}%\n`;
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: report,
      metadata: {
        agent: this.agentName,
        reportType: 'coverage'
      }
    });
  }

  private async reportExternalCalls(): Promise<void> {
    const stats = externalLogLib.getStats();
    const functions = externalLogLib.getUniqueFunctions();
    
    let report = `🌐 **External Calls Report**\n`;
    report += `- Total Calls: ${stats.totalCalls}\n`;
    report += `- Unique Functions: ${functions.length}\n`;
    report += `- Error Rate: ${stats.errorRate.toFixed(1)}%\n`;
    report += `- Avg Duration: ${stats.avgDuration.toFixed(0)}ms\n`;
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: report,
      metadata: {
        agent: this.agentName,
        reportType: 'external_calls'
      }
    });
  }

  public async shutdown(): Promise<void> {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
    
    // Generate final report
    await this.generatePeriodicReport();
    
    // Export test results
    if (this.config.testResultsDir) {
      const resultsPath = path.join(this.config.testResultsDir, `test-results-${Date.now()}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify({
        tests: Array.from(this.testResults.values()),
        timestamp: new Date()
      }, null, 2));
    }
    
    await super.shutdown();
  }
}

// Export factory function
export function createEnhancedStoryReporter(
  serverUrl: string,
  roomId: string,
  agentName?: string,
  config?: EnhancedStoryReporterConfig
): EnhancedStoryReporterAgent {
  return new EnhancedStoryReporterAgent(serverUrl, roomId, agentName, config);
}