import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

interface StoryExecution {
  storyId: string;
  storyName: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  logs: LogEntry[];
  testResults?: {
    passed: number;
    failed: number;
    skipped: number;
  };
}

interface ReportTemplate {
  name: string;
  format: 'html' | 'json' | 'markdown';
  template: string;
  includeLogDetails: boolean;
  includeMetrics: boolean;
}

class ExternalLogStoryReporter {
  private executions: Map<string, StoryExecution> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private logBuffer: LogEntry[] = [];
  private isCollecting = false;

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // HTML Template
    this.templates.set('html', {
      name: 'HTML Report',
      format: 'html',
      includeLogDetails: true,
      includeMetrics: true,
      template: `
<!DOCTYPE html>
<html>
<head>
    <title>Story Execution Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .story { border: 1px solid #dee2e6; margin: 15px 0; border-radius: 8px; overflow: hidden; }
        .story-header { background: #007bff; color: white; padding: 15px; }
        .story-content { padding: 15px; }
        .log-entry { margin: 5px 0; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .log-debug { background: #f8f9fa; }
        .log-info { background: #d1ecf1; }
        .log-warn { background: #fff3cd; }
        .log-error { background: #f8d7da; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border: 1px solid #dee2e6; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .status-completed { background: #d4edda; }
        .status-failed { background: #f8d7da; }
        .status-running { background: #fff3cd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Story Execution Report</h1>
        <p>Generated on {{timestamp}}</p>
        <p>Total Stories: {{totalStories}}</p>
    </div>
    
    {{#if includeMetrics}}
    <div class="metrics">
        <div class="metric">
            <div class="metric-value">{{completedStories}}</div>
            <div>Completed Stories</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{failedStories}}</div>
            <div>Failed Stories</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{totalLogs}}</div>
            <div>Total Log Entries</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{averageDuration}}</div>
            <div>Avg Duration (ms)</div>
        </div>
    </div>
    {{/if}}

    <div class="stories">
        {{#each stories}}
        <div class="story status-{{status}}">
            <div class="story-header">
                <h3>{{storyName}} ({{storyId}})</h3>
                <p>Status: {{status}} | Duration: {{duration}}ms | Logs: {{logCount}}</p>
            </div>
            <div class="story-content">
                {{#if testResults}}
                <div class="test-results">
                    <strong>Test Results:</strong>
                    Passed: {{testResults.passed}}, 
                    Failed: {{testResults.failed}}, 
                    Skipped: {{testResults.skipped}}
                </div>
                {{/if}}
                
                {{#if includeLogDetails}}
                <div class="logs">
                    <h4>Log Entries</h4>
                    {{#each logs}}
                    <div class="log-entry log-{{level}}">
                        <strong>[{{timestamp}}] {{level.toUpperCase()}}</strong> - {{source}}: {{message}}
                        {{#if metadata}}
                        <div class="metadata">{{metadata}}</div>
                        {{/if}}
                    </div>
                    {{/each}}
                </div>
                {{/if}}
            </div>
        </div>
        {{/each}}
    </div>
</body>
</html>`
    });

    // JSON Template
    this.templates.set('json', {
      name: 'JSON Report',
      format: 'json',
      includeLogDetails: true,
      includeMetrics: true,
      template: JSON.stringify({
        reportInfo: {
          generatedAt: '{{timestamp}}',
          totalStories: '{{totalStories}}',
          format: 'json'
        },
        metrics: {
          completedStories: '{{completedStories}}',
          failedStories: '{{failedStories}}',
          totalLogs: '{{totalLogs}}',
          averageDuration: '{{averageDuration}}'
        },
        stories: '{{stories}}'
      }, null, 2)
    });

    // Markdown Template
    this.templates.set('markdown', {
      name: 'Markdown Report',
      format: 'markdown',
      includeLogDetails: false,
      includeMetrics: true,
      template: `# Story Execution Report

Generated on {{timestamp}}

## Summary

- **Total Stories**: {{totalStories}}
- **Completed**: {{completedStories}}
- **Failed**: {{failedStories}}
- **Total Log Entries**: {{totalLogs}}
- **Average Duration**: {{averageDuration}}ms

## Stories

{{#each stories}}
### {{storyName}} ({{storyId}})

- **Status**: {{status}}
- **Duration**: {{duration}}ms
- **Log Count**: {{logCount}}

{{#if testResults}}
#### Test Results
- Passed: {{testResults.passed}}
- Failed: {{testResults.failed}}
- Skipped: {{testResults.skipped}}
{{/if}}

{{#if includeLogDetails}}
#### Logs
{{#each logs}}
- \`{{timestamp}}\` **{{level.toUpperCase()}}** - {{source}}: {{message}}
{{/each}}
{{/if}}

---
{{/each}}`
    });
  }

  startStoryExecution(storyId: string, storyName: string): void {
    const execution: StoryExecution = {
      storyId,
      storyName,
      status: 'running',
      startTime: new Date().toISOString(),
      logs: []
    };

    this.executions.set(storyId, execution);
    this.logToStory(storyId, 'info', 'story-reporter', `Started story execution: ${storyName}`);
  }

  endStoryExecution(storyId: string, status: 'completed' | 'failed', testResults?: StoryExecution['testResults']): void {
    const execution = this.executions.get(storyId);
    if (!execution) return;

    execution.status = status;
    execution.endTime = new Date().toISOString();
    execution.testResults = testResults;

    this.logToStory(storyId, 'info', 'story-reporter', 
      `Ended story execution: ${execution.storyName} (${status})`);

    this.executions.set(storyId, execution);
  }

  logToStory(storyId: string, level: LogEntry['level'], source: string, message: string, metadata?: Record<string, any>): void {
    const execution = this.executions.get(storyId);
    if (!execution) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      metadata
    };

    execution.logs.push(logEntry);
    this.executions.set(storyId, execution);

    // Also add to global buffer if collecting
    if (this.isCollecting) {
      this.logBuffer.push({
        ...logEntry,
        metadata: { ...metadata, storyId }
      });
    }
  }

  startLogCollection(): void {
    this.isCollecting = true;
    this.logBuffer = [];
  }

  stopLogCollection(): LogEntry[] {
    this.isCollecting = false;
    const collected = [...this.logBuffer];
    this.logBuffer = [];
    return collected;
  }

  getStoryExecution(storyId: string): StoryExecution | null {
    return this.executions.get(storyId) || null;
  }

  getAllExecutions(): StoryExecution[] {
    return Array.from(this.executions.values());
  }

  getExecutionStats(): {
    totalStories: number;
    completedStories: number;
    failedStories: number;
    runningStories: number;
    totalLogs: number;
    averageDuration: number;
    logsByLevel: Record<string, number>;
  } {
    const executions = this.getAllExecutions();
    const stats = {
      totalStories: executions.length,
      completedStories: 0,
      failedStories: 0,
      runningStories: 0,
      totalLogs: 0,
      averageDuration: 0,
      logsByLevel: { debug: 0, info: 0, warn: 0, error: 0 }
    };

    let totalDuration = 0;
    let completedCount = 0;

    executions.forEach(execution => {
      switch (execution.status) {
        case 'completed': stats.completedStories++; break;
        case 'failed': stats.failedStories++; break;
        case 'running': stats.runningStories++; break;
      }

      stats.totalLogs += execution.logs.length;

      // Count logs by level
      execution.logs.forEach(log => {
        stats.logsByLevel[log.level]++;
      });

      // Calculate duration for completed/failed stories
      if (execution.endTime) {
        const duration = new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime();
        totalDuration += duration;
        completedCount++;
      }
    });

    stats.averageDuration = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0;

    return stats;
  }

  async generateReport(templateName: string, outputPath: string, options: {
    includeLogDetails?: boolean;
    filterByStatus?: StoryExecution['status'];
    maxLogsPerStory?: number;
  } = {}): Promise<void> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    let executions = this.getAllExecutions();

    // Filter by status if specified
    if (options.filterByStatus) {
      executions = executions.filter(e => e.status === options.filterByStatus);
    }

    // Limit logs per story if specified
    if (options.maxLogsPerStory) {
      executions = executions.map(execution => ({
        ...execution,
        logs: execution.logs.slice(-options.maxLogsPerStory)
      }));
    }

    const stats = this.getExecutionStats();
    
    // Prepare data for template
    const reportData = {
      timestamp: new Date().toISOString(),
      totalStories: stats.totalStories,
      completedStories: stats.completedStories,
      failedStories: stats.failedStories,
      totalLogs: stats.totalLogs,
      averageDuration: stats.averageDuration,
      includeLogDetails: options.includeLogDetails ?? template.includeLogDetails,
      includeMetrics: template.includeMetrics,
      stories: executions.map(execution => ({
        ...execution,
        duration: execution.endTime ? 
          new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime() : 0,
        logCount: execution.logs.length
      }))
    };

    let content = template.template;

    // Simple template replacement (in a real implementation, use a proper template engine)
    content = this.processTemplate(content, reportData);

    await fs.writeFile(outputPath, content);
  }

  private processTemplate(template: string, data: any): string {
    let content = template;

    // Replace simple variables
    Object.keys(data).forEach(key => {
      if (typeof data[key] !== 'object') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, String(data[key]));
      }
    });

    // Handle stories array (simplified)
    if (template.includes('{{#each stories}}') && template.includes('{{/each}}')) {
      const storiesMatch = content.match(/{{#each stories}}(.*?){{\/each}}/s);
      if (storiesMatch) {
        const storyTemplate = storiesMatch[1];
        const storiesHtml = data.stories.map((story: any) => {
          let storyContent = storyTemplate;
          
          // Replace story properties
          Object.keys(story).forEach(key => {
            if (typeof story[key] !== 'object') {
              const regex = new RegExp(`{{${key}}}`, 'g');
              storyContent = storyContent.replace(regex, String(story[key]));
            }
          });

          // Handle logs array
          if (storyTemplate.includes('{{#each logs}}')) {
            const logsMatch = storyContent.match(/{{#each logs}}(.*?){{\/each}}/s);
            if (logsMatch) {
              const logTemplate = logsMatch[1];
              const logsHtml = story.logs.map((log: LogEntry) => {
                let logContent = logTemplate;
                Object.keys(log).forEach(logKey => {
                  if (typeof log[logKey] !== 'object') {
                    const regex = new RegExp(`{{${logKey}}}`, 'g');
                    logContent = logContent.replace(regex, String(log[logKey]));
                  }
                });
                return logContent;
              }).join('');
              
              storyContent = storyContent.replace(/{{#each logs}}.*?{{\/each}}/s, logsHtml);
            }
          }

          // Handle conditional blocks
          if (data.includeLogDetails) {
            storyContent = storyContent.replace(/{{#if includeLogDetails}}(.*?){{\/if}}/s, '$1');
          } else {
            storyContent = storyContent.replace(/{{#if includeLogDetails}}.*?{{\/if}}/s, '');
          }

          if (story.testResults) {
            storyContent = storyContent.replace(/{{#if testResults}}(.*?){{\/if}}/s, '$1');
          } else {
            storyContent = storyContent.replace(/{{#if testResults}}.*?{{\/if}}/s, '');
          }

          return storyContent;
        }).join('');

        content = content.replace(/{{#each stories}}.*?{{\/each}}/s, storiesHtml);
      }
    }

    // Handle top-level conditionals
    if (data.includeMetrics) {
      content = content.replace(/{{#if includeMetrics}}(.*?){{\/if}}/s, '$1');
    } else {
      content = content.replace(/{{#if includeMetrics}}.*?{{\/if}}/s, '');
    }

    return content;
  }

  async importLogsFromFile(filePath: string, storyId?: string): Promise<number> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    let importedCount = 0;

    for (const line of lines) {
      try {
        const logEntry = JSON.parse(line);
        const targetStoryId = storyId || logEntry.storyId || 'imported';

        // Ensure story exists
        if (!this.executions.has(targetStoryId)) {
          this.startStoryExecution(targetStoryId, `Imported Story ${targetStoryId}`);
        }

        this.logToStory(
          targetStoryId,
          logEntry.level || 'info',
          logEntry.source || 'imported',
          logEntry.message || line,
          logEntry.metadata
        );

        importedCount++;
      } catch (error) {
        // Skip invalid JSON lines
        console.warn(`Failed to parse log line: ${line}`);
      }
    }

    return importedCount;
  }

  async exportStoryData(storyId: string, format: 'json' | 'csv'): Promise<string> {
    const execution = this.executions.get(storyId);
    if (!execution) {
      throw new Error(`Story ${storyId} not found`);
    }

    if (format === 'json') {
      return JSON.stringify(execution, null, 2);
    } else if (format === 'csv') {
      const headers = 'timestamp,level,source,message,metadata\n';
      const rows = execution.logs.map(log =>
        `"${log.timestamp}","${log.level}","${log.source}","${log.message}","${JSON.stringify(log.metadata || {})}"`
      ).join('\n');
      
      return headers + rows;
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  clearExecution(storyId: string): boolean {
    return this.executions.delete(storyId);
  }

  clearAllExecutions(): void {
    this.executions.clear();
  }

  addCustomTemplate(name: string, template: ReportTemplate): void {
    this.templates.set(name, template);
  }
}

test.describe('External Log Story Reporter System Tests', () => {
  let tempDir: string;
  let reporter: ExternalLogStoryReporter;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `reporter-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    reporter = new ExternalLogStoryReporter();
  });

  test.afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should track story execution lifecycle with logs', async () => {
    const storyId = 'story-001';
    const storyName = 'User Authentication Flow';

    // Start story execution
    reporter.startStoryExecution(storyId, storyName);

    let execution = reporter.getStoryExecution(storyId);
    expect(execution).toBeDefined();
    expect(execution!.storyId).toBe(storyId);
    expect(execution!.storyName).toBe(storyName);
    expect(execution!.status).toBe('running');
    expect(execution!.logs).toHaveLength(1); // Start log

    // Add various log entries
    reporter.logToStory(storyId, 'info', 'test-setup', 'Setting up test environment');
    reporter.logToStory(storyId, 'debug', 'auth-service', 'Validating credentials', { userId: 12345 });
    reporter.logToStory(storyId, 'warn', 'auth-service', 'Password strength warning');
    reporter.logToStory(storyId, 'info', 'database', 'User record updated');

    execution = reporter.getStoryExecution(storyId);
    expect(execution!.logs).toHaveLength(5); // Start + 4 added logs

    // End story execution
    reporter.endStoryExecution(storyId, 'completed', {
      passed: 8,
      failed: 0,
      skipped: 1
    });

    execution = reporter.getStoryExecution(storyId);
    expect(execution!.status).toBe('completed');
    expect(execution!.endTime).toBeDefined();
    expect(execution!.testResults).toEqual({
      passed: 8,
      failed: 0,
      skipped: 1
    });
    expect(execution!.logs).toHaveLength(6); // Previous + end log
  });

  test('should generate HTML reports with comprehensive formatting', async () => {
    // Create multiple story executions
    const stories = [
      { id: 'story-1', name: 'Login Process', status: 'completed', testResults: { passed: 5, failed: 0, skipped: 0 } },
      { id: 'story-2', name: 'Password Reset', status: 'completed', testResults: { passed: 3, failed: 1, skipped: 0 } },
      { id: 'story-3', name: 'Profile Update', status: 'failed', testResults: { passed: 2, failed: 3, skipped: 1 } }
    ];

    stories.forEach(story => {
      reporter.startStoryExecution(story.id, story.name);
      
      // Add diverse log entries
      reporter.logToStory(story.id, 'info', 'test-runner', 'Starting test execution');
      reporter.logToStory(story.id, 'debug', 'api-client', 'Making API request', { endpoint: '/api/test' });
      reporter.logToStory(story.id, 'warn', 'validator', 'Validation warning detected');
      
      if (story.status === 'failed') {
        reporter.logToStory(story.id, 'error', 'test-runner', 'Test execution failed', { error: 'Timeout exceeded' });
      }
      
      reporter.endStoryExecution(story.id, story.status as 'completed' | 'failed', story.testResults);
    });

    // Generate HTML report
    const htmlPath = path.join(tempDir, 'story-report.html');
    await reporter.generateReport('html', htmlPath, {
      includeLogDetails: true
    });

    // Verify HTML file was created
    const htmlExists = await fs.access(htmlPath).then(() => true).catch(() => false);
    expect(htmlExists).toBe(true);

    // Verify HTML content
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    
    expect(htmlContent).toContain('<title>Story Execution Report</title>');
    expect(htmlContent).toContain('Login Process');
    expect(htmlContent).toContain('Password Reset');
    expect(htmlContent).toContain('Profile Update');
    expect(htmlContent).toContain('status-completed');
    expect(htmlContent).toContain('status-failed');
    expect(htmlContent).toContain('log-info');
    expect(htmlContent).toContain('log-error');
    expect(htmlContent).toContain('Passed: 5');
    expect(htmlContent).toContain('Failed: 3');
  });

  test('should generate JSON and Markdown reports', async () => {
    // Create test data
    reporter.startStoryExecution('json-test', 'JSON Test Story');
    reporter.logToStory('json-test', 'info', 'tester', 'Test log entry');
    reporter.endStoryExecution('json-test', 'completed');

    // Generate JSON report
    const jsonPath = path.join(tempDir, 'story-report.json');
    await reporter.generateReport('json', jsonPath);

    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    
    expect(jsonData).toHaveProperty('reportInfo');
    expect(jsonData).toHaveProperty('metrics');
    expect(jsonData.reportInfo).toContain('json-test');

    // Generate Markdown report
    const mdPath = path.join(tempDir, 'story-report.md');
    await reporter.generateReport('markdown', mdPath);

    const mdContent = await fs.readFile(mdPath, 'utf-8');
    expect(mdContent).toContain('# Story Execution Report');
    expect(mdContent).toContain('## Summary');
    expect(mdContent).toContain('### JSON Test Story');
    expect(mdContent).toContain('- **Status**: completed');
  });

  test('should collect and manage log buffers', async () => {
    // Start log collection
    reporter.startLogCollection();

    // Create story and add logs
    reporter.startStoryExecution('buffer-test', 'Buffer Test Story');
    reporter.logToStory('buffer-test', 'info', 'service-a', 'First log');
    reporter.logToStory('buffer-test', 'warn', 'service-b', 'Second log');
    reporter.logToStory('buffer-test', 'error', 'service-c', 'Third log');

    // Stop collection and get buffer
    const collectedLogs = reporter.stopLogCollection();

    expect(collectedLogs).toHaveLength(4); // 3 explicit + 1 start log
    expect(collectedLogs.some(log => log.metadata?.storyId === 'buffer-test')).toBe(true);
    expect(collectedLogs.map(log => log.level)).toContain('info');
    expect(collectedLogs.map(log => log.level)).toContain('warn');
    expect(collectedLogs.map(log => log.level)).toContain('error');
  });

  test('should import logs from external files', async () => {
    // Create external log file
    const logEntries = [
      { timestamp: '2025-08-28T10:00:00Z', level: 'info', source: 'external', message: 'External log 1' },
      { timestamp: '2025-08-28T10:01:00Z', level: 'warn', source: 'external', message: 'External log 2' },
      { timestamp: '2025-08-28T10:02:00Z', level: 'error', source: 'external', message: 'External log 3' }
    ];

    const logFile = path.join(tempDir, 'external_logs.jsonl');
    const logContent = logEntries.map(entry => JSON.stringify(entry)).join('\n');
    await fs.writeFile(logFile, logContent);

    // Import logs
    const importedCount = await reporter.importLogsFromFile(logFile, 'imported-story');

    expect(importedCount).toBe(3);

    const execution = reporter.getStoryExecution('imported-story');
    expect(execution).toBeDefined();
    expect(execution!.logs.length).toBeGreaterThanOrEqual(3);
    
    // Check that imported logs are present
    const logMessages = execution!.logs.map(log => log.message);
    expect(logMessages).toContain('External log 1');
    expect(logMessages).toContain('External log 2');
    expect(logMessages).toContain('External log 3');
  });

  test('should provide comprehensive execution statistics', async () => {
    // Create diverse story executions
    const stories = [
      { id: 'stats-1', name: 'Story 1', logs: 5, status: 'completed' as const },
      { id: 'stats-2', name: 'Story 2', logs: 8, status: 'failed' as const },
      { id: 'stats-3', name: 'Story 3', logs: 3, status: 'running' as const },
      { id: 'stats-4', name: 'Story 4', logs: 12, status: 'completed' as const }
    ];

    stories.forEach(story => {
      reporter.startStoryExecution(story.id, story.name);
      
      // Add specified number of logs
      for (let i = 0; i < story.logs; i++) {
        const level = ['info', 'debug', 'warn', 'error'][i % 4] as LogEntry['level'];
        reporter.logToStory(story.id, level, 'test', `Log entry ${i + 1}`);
      }
      
      if (story.status !== 'running') {
        reporter.endStoryExecution(story.id, story.status);
      }
    });

    const stats = reporter.getExecutionStats();

    expect(stats.totalStories).toBe(4);
    expect(stats.completedStories).toBe(2);
    expect(stats.failedStories).toBe(1);
    expect(stats.runningStories).toBe(1);
    expect(stats.totalLogs).toBe(5 + 8 + 3 + 12 + 4); // logs + start logs
    expect(stats.averageDuration).toBeGreaterThan(0);
    expect(stats.logsByLevel.info).toBeGreaterThan(0);
    expect(stats.logsByLevel.debug).toBeGreaterThan(0);
    expect(stats.logsByLevel.warn).toBeGreaterThan(0);
    expect(stats.logsByLevel.error).toBeGreaterThan(0);
  });

  test('should export individual story data in multiple formats', async () => {
    const storyId = 'export-test';
    
    reporter.startStoryExecution(storyId, 'Export Test Story');
    reporter.logToStory(storyId, 'info', 'test', 'Test message 1');
    reporter.logToStory(storyId, 'warn', 'test', 'Test message 2', { extra: 'data' });
    reporter.endStoryExecution(storyId, 'completed', { passed: 5, failed: 1, skipped: 0 });

    // Export as JSON
    const jsonExport = await reporter.exportStoryData(storyId, 'json');
    const jsonData = JSON.parse(jsonExport);
    
    expect(jsonData.storyId).toBe(storyId);
    expect(jsonData.storyName).toBe('Export Test Story');
    expect(jsonData.status).toBe('completed');
    expect(jsonData.logs).toHaveLength(3); // start + 2 added + end
    expect(jsonData.testResults).toEqual({ passed: 5, failed: 1, skipped: 0 });

    // Export as CSV
    const csvExport = await reporter.exportStoryData(storyId, 'csv');
    const csvLines = csvExport.split('\n');
    
    expect(csvLines[0]).toBe('timestamp,level,source,message,metadata');
    expect(csvLines.length).toBe(4); // header + 3 logs
    expect(csvLines[1]).toContain('info');
    expect(csvLines[2]).toContain('Test message 1');
  });

  test('should support custom report templates', async () => {
    // Add custom template
    const customTemplate: ReportTemplate = {
      name: 'Custom XML Report',
      format: 'html', // File extension will be based on this
      includeLogDetails: false,
      includeMetrics: true,
      template: `<?xml version="1.0" encoding="UTF-8"?>
<report>
    <metadata>
        <generated>{{timestamp}}</generated>
        <totalStories>{{totalStories}}</totalStories>
    </metadata>
    <stories>
        {{#each stories}}
        <story id="{{storyId}}" name="{{storyName}}" status="{{status}}" duration="{{duration}}">
            <logCount>{{logCount}}</logCount>
            {{#if testResults}}
            <testResults passed="{{testResults.passed}}" failed="{{testResults.failed}}" skipped="{{testResults.skipped}}"/>
            {{/if}}
        </story>
        {{/each}}
    </stories>
</report>`
    };

    reporter.addCustomTemplate('xml', customTemplate);

    // Create test data
    reporter.startStoryExecution('custom-test', 'Custom Template Test');
    reporter.logToStory('custom-test', 'info', 'test', 'Custom test log');
    reporter.endStoryExecution('custom-test', 'completed', { passed: 1, failed: 0, skipped: 0 });

    // Generate report with custom template
    const xmlPath = path.join(tempDir, 'custom-report.xml');
    await reporter.generateReport('xml', xmlPath);

    const xmlContent = await fs.readFile(xmlPath, 'utf-8');
    
    expect(xmlContent).toContain('<?xml version="1.0"');
    expect(xmlContent).toContain('<report>');
    expect(xmlContent).toContain('<story id="custom-test"');
    expect(xmlContent).toContain('name="Custom Template Test"');
    expect(xmlContent).toContain('status="completed"');
    expect(xmlContent).toContain('passed="1"');
  });

  test('should handle high-volume logging with performance', async () => {
    const storyId = 'performance-test';
    const logCount = 1000;
    
    reporter.startStoryExecution(storyId, 'Performance Test Story');
    
    const startTime = Date.now();
    
    // Add many log entries
    for (let i = 0; i < logCount; i++) {
      const level = ['info', 'debug', 'warn', 'error'][i % 4] as LogEntry['level'];
      reporter.logToStory(storyId, level, `service-${i % 10}`, `Performance test log ${i}`, {
        iteration: i,
        batch: Math.floor(i / 100)
      });
    }
    
    const loggingTime = Date.now() - startTime;
    
    reporter.endStoryExecution(storyId, 'completed');
    
    // Verify all logs were captured
    const execution = reporter.getStoryExecution(storyId);
    expect(execution!.logs).toHaveLength(logCount + 2); // + start and end logs
    
    // Performance assertions
    expect(loggingTime).toBeLessThan(5000); // Should complete within 5 seconds
    const logsPerSecond = logCount / (loggingTime / 1000);
    expect(logsPerSecond).toBeGreaterThan(100); // Should handle at least 100 logs/second
    
    console.log(`Performance: ${logsPerSecond.toFixed(0)} logs/second`);
    
    // Test report generation performance
    const reportStartTime = Date.now();
    const reportPath = path.join(tempDir, 'performance-report.html');
    await reporter.generateReport('html', reportPath, {
      includeLogDetails: true,
      maxLogsPerStory: 100 // Limit for performance
    });
    const reportTime = Date.now() - reportStartTime;
    
    expect(reportTime).toBeLessThan(2000); // Report generation should be fast
    
    // Verify report was generated
    const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
    expect(reportExists).toBe(true);
  });

  test('should handle concurrent story executions', async () => {
    const storyCount = 10;
    const storiesPerBatch = 3;
    
    // Create concurrent stories
    const storyPromises = Array.from({ length: storyCount }, async (_, i) => {
      const storyId = `concurrent-${i}`;
      const storyName = `Concurrent Story ${i}`;
      
      reporter.startStoryExecution(storyId, storyName);
      
      // Add logs with random delays
      for (let j = 0; j < storiesPerBatch; j++) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        reporter.logToStory(storyId, 'info', 'concurrent-test', `Log ${j} from story ${i}`);
      }
      
      const status = i % 3 === 0 ? 'failed' : 'completed';
      reporter.endStoryExecution(storyId, status, {
        passed: storiesPerBatch - (status === 'failed' ? 1 : 0),
        failed: status === 'failed' ? 1 : 0,
        skipped: 0
      });
      
      return storyId;
    });
    
    const completedStoryIds = await Promise.all(storyPromises);
    
    // Verify all stories were tracked
    expect(completedStoryIds).toHaveLength(storyCount);
    completedStoryIds.forEach(storyId => {
      const execution = reporter.getStoryExecution(storyId);
      expect(execution).toBeDefined();
      expect(execution!.logs.length).toBe(storiesPerBatch + 2); // logs + start/end
    });
    
    // Verify statistics
    const stats = reporter.getExecutionStats();
    expect(stats.totalStories).toBe(storyCount);
    expect(stats.completedStories + stats.failedStories).toBe(storyCount);
    
    // Generate concurrent report
    const concurrentReportPath = path.join(tempDir, 'concurrent-report.html');
    await reporter.generateReport('html', concurrentReportPath);
    
    const reportContent = await fs.readFile(concurrentReportPath, 'utf-8');
    expect(reportContent).toContain('Concurrent Story 0');
    expect(reportContent).toContain('Concurrent Story 9');
  });
});