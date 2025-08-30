import { test, expect, Page, Browser } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestDocument {
  id: string;
  title: string;
  content: string;
  format: 'gherkin' | 'mftod' | 'unit' | 'integration';
  metadata: {
    theme: string;
    userStory: string;
    priority: 'high' | 'medium' | 'low';
    tags: string[];
  };
}

interface ManualTemplate {
  name: string;
  format: 'html' | 'pdf' | 'markdown' | 'json';
  template: string;
  styles?: string;
}

interface GenerationReport {
  totalDocuments: number;
  successfulGenerations: number;
  failedGenerations: number;
  formats: string[];
  duration: number;
  outputFiles: string[];
}

class EnhancedManualGenerator {
  private templates: Map<string, ManualTemplate> = new Map();
  private documents: TestDocument[] = [];

  addTemplate(template: ManualTemplate): void {
    this.templates.set(`${template.name}-${template.format}`, template);
  }

  addDocument(document: TestDocument): void {
    this.documents.push(document);
  }

  async generateManual(
    templateName: string,
    format: string,
    outputPath: string,
    options: {
      includeScreenshots?: boolean;
      batchMode?: boolean;
      theme?: string;
      customStyles?: string;
    } = {}
  ): Promise<GenerationReport> {
    const startTime = Date.now();
    const template = this.templates.get(`${templateName}-${format}`);
    
    if (!template) {
      throw new Error(`Template ${templateName} not found for format ${format}`);
    }

    const documentsToProcess = options.theme 
      ? this.documents.filter(doc => doc.metadata.theme === options.theme)
      : this.documents;

    const report: GenerationReport = {
      totalDocuments: documentsToProcess.length,
      successfulGenerations: 0,
      failedGenerations: 0,
      formats: [format],
      duration: 0,
      outputFiles: []
    };

    for (const document of documentsToProcess) {
      try {
        const generatedContent = await this.processTemplate(template, document, options);
        const filename = `${document.id}_${templateName}.${format}`;
        const filepath = path.join(outputPath, filename);
        
        await fs.writeFile(filepath, generatedContent);
        
        report.successfulGenerations++;
        report.outputFiles.push(filepath);
      } catch (error) {
        console.error(`Failed to generate manual for ${document.id}:`, error);
        report.failedGenerations++;
      }
    }

    report.duration = Date.now() - startTime;
    return report;
  }

  private async processTemplate(
    template: ManualTemplate,
    document: TestDocument,
    options: any
  ): Promise<string> {
    let content = template.template;
    
    // Replace template variables
    content = content.replace(/{{title}}/g, document.title);
    content = content.replace(/{{id}}/g, document.id);
    content = content.replace(/{{content}}/g, document.content);
    content = content.replace(/{{theme}}/g, document.metadata.theme);
    content = content.replace(/{{userStory}}/g, document.metadata.userStory);
    content = content.replace(/{{priority}}/g, document.metadata.priority);
    content = content.replace(/{{tags}}/g, document.metadata.tags.join(', '));
    content = content.replace(/{{timestamp}}/g, new Date().toISOString());
    
    // Add custom styles if provided
    if (options.customStyles && template.format === 'html') {
      content = content.replace('</head>', `<style>${options.customStyles}</style></head>`);
    }
    
    // Process screenshots if requested
    if (options.includeScreenshots && template.format === 'html') {
      content = await this.addScreenshotPlaceholders(content);
    }

    return content;
  }

  private async addScreenshotPlaceholders(content: string): Promise<string> {
    // Add screenshot placeholders for manual testing
    const screenshotSection = `
<div class="screenshot-section">
    <h3>Screenshots</h3>
    <div class="screenshot-placeholder">
        <p>📷 Screenshot: Initial State</p>
        <div class="screenshot-box" style="border: 2px dashed #ccc; height: 200px; display: flex; align-items: center; justify-content: center; margin: 10px 0;">
            Click to add screenshot
        </div>
    </div>
    <div class="screenshot-placeholder">
        <p>📷 Screenshot: Expected Result</p>
        <div class="screenshot-box" style="border: 2px dashed #ccc; height: 200px; display: flex; align-items: center; justify-content: center; margin: 10px 0;">
            Click to add screenshot
        </div>
    </div>
</div>`;

    return content.replace('</body>', `${screenshotSection}</body>`);
  }

  async generateBatchReport(outputPath: string, reports: GenerationReport[]): Promise<void> {
    const totalDocs = reports.reduce((sum, r) => sum + r.totalDocuments, 0);
    const totalSuccess = reports.reduce((sum, r) => sum + r.successfulGenerations, 0);
    const totalFailed = reports.reduce((sum, r) => sum + r.failedGenerations, 0);
    const totalDuration = reports.reduce((sum, r) => sum + r.duration, 0);
    const allFormats = [...new Set(reports.flatMap(r => r.formats))];

    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Manual Generation Batch Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .report-item { border: 1px solid #dee2e6; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .success { border-left: 4px solid #28a745; }
        .partial { border-left: 4px solid #ffc107; }
        .failed { border-left: 4px solid #dc3545; }
        .file-list { background: #f8f9fa; padding: 10px; border-radius: 3px; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>
    <h1>Enhanced Manual Generator - Batch Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${totalDocs}</div>
                <div>Total Documents</div>
            </div>
            <div class="metric">
                <div class="metric-value">${totalSuccess}</div>
                <div>Successful</div>
            </div>
            <div class="metric">
                <div class="metric-value">${totalFailed}</div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(totalDuration / 1000).toFixed(1)}s</div>
                <div>Total Duration</div>
            </div>
            <div class="metric">
                <div class="metric-value">${allFormats.length}</div>
                <div>Output Formats</div>
            </div>
            <div class="metric">
                <div class="metric-value">${((totalSuccess / totalDocs) * 100).toFixed(1)}%</div>
                <div>Success Rate</div>
            </div>
        </div>
    </div>

    <div class="details">
        <h2>Generation Details</h2>
        ${reports.map((report, index) => {
          const status = report.failedGenerations === 0 ? 'success' : 
                        report.successfulGenerations > 0 ? 'partial' : 'failed';
          return `
            <div class="report-item ${status}">
                <h3>Generation ${index + 1}</h3>
                <p><strong>Documents:</strong> ${report.totalDocuments}</p>
                <p><strong>Success:</strong> ${report.successfulGenerations}</p>
                <p><strong>Failed:</strong> ${report.failedGenerations}</p>
                <p><strong>Duration:</strong> ${(report.duration / 1000).toFixed(2)}s</p>
                <p><strong>Formats:</strong> ${report.formats.join(', ')}</p>
                <div class="file-list">
                    <strong>Generated Files:</strong><br>
                    ${report.outputFiles.map(file => path.basename(file)).join('<br>')}
                </div>
            </div>
          `;
        }).join('')}
    </div>

    <footer>
        <p><em>Generated on ${new Date().toISOString()}</em></p>
    </footer>
</body>
</html>`;

    await fs.writeFile(path.join(outputPath, 'batch_report.html'), reportHtml);
  }

  async scanThemesForTests(themesPath: string): Promise<TestDocument[]> {
    const discoveredTests: TestDocument[] = [];
    
    try {
      const themes = await fs.readdir(themesPath, { withFileTypes: true });
      
      for (const theme of themes) {
        if (theme.isDirectory()) {
          const themePath = path.join(themesPath, theme.name);
          const userStoriesPath = path.join(themePath, 'user-stories');
          
          try {
            const stories = await fs.readdir(userStoriesPath, { withFileTypes: true });
            
            for (const story of stories) {
              if (story.isDirectory()) {
                const testsPath = path.join(userStoriesPath, story.name, 'tests');
                
                try {
                  await this.scanTestDirectory(testsPath, theme.name, story.name, discoveredTests);
                } catch (error) {
                  // Skip if tests directory doesn't exist
                }
              }
            }
          } catch (error) {
            // Skip if user-stories directory doesn't exist
          }
        }
      }
    } catch (error) {
      console.error('Error scanning themes:', error);
    }
    
    return discoveredTests;
  }

  private async scanTestDirectory(
    testsPath: string,
    themeName: string,
    storyName: string,
    discoveredTests: TestDocument[]
  ): Promise<void> {
    try {
      const testFiles = await this.findTestFiles(testsPath);
      
      for (const testFile of testFiles) {
        try {
          const content = await fs.readFile(testFile, 'utf-8');
          const testDoc = this.parseTestFile(testFile, content, themeName, storyName);
          if (testDoc) {
            discoveredTests.push(testDoc);
          }
        } catch (error) {
          console.error(`Error processing test file ${testFile}:`, error);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
  }

  private async findTestFiles(directory: string): Promise<string[]> {
    const testFiles: string[] = [];
    
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(directory, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.findTestFiles(itemPath);
          testFiles.push(...subFiles);
        } else if (this.isTestFile(item.name)) {
          testFiles.push(itemPath);
        }
      }
    } catch (error) {
      // Handle directory access errors
    }
    
    return testFiles;
  }

  private isTestFile(filename: string): boolean {
    return filename.endsWith('.test.ts') ||
           filename.endsWith('.test.js') ||
           filename.endsWith('.spec.ts') ||
           filename.endsWith('.spec.js') ||
           filename.endsWith('.systest.ts') ||
           filename.endsWith('.feature');
  }

  private parseTestFile(
    filePath: string,
    content: string,
    themeName: string,
    storyName: string
  ): TestDocument | null {
    const filename = path.basename(filePath);
    const format = this.detectTestFormat(content);
    
    return {
      id: `${themeName}-${storyName}-${filename.replace(/\.[^.]+$/, '')}`,
      title: this.extractTitle(content, filename),
      content: content.substring(0, 2000), // Truncate for summary
      format,
      metadata: {
        theme: themeName,
        userStory: storyName,
        priority: this.detectPriority(content),
        tags: this.extractTags(content, filename)
      }
    };
  }

  private detectTestFormat(content: string): 'gherkin' | 'mftod' | 'unit' | 'integration' {
    if (content.includes('Feature:') && content.includes('Scenario:')) return 'gherkin';
    if (content.includes('describe(') && content.includes('test(')) return 'unit';
    if (content.includes('test.describe(') && content.includes('System Tests')) return 'integration';
    return 'mftod';
  }

  private extractTitle(content: string, filename: string): string {
    // Try to extract title from test describe blocks
    const describeMatch = content.match(/test\.describe\(['"`]([^'"`]+)['"`]/);
    if (describeMatch) return describeMatch[1];
    
    const featureMatch = content.match(/Feature:\s*(.+)/);
    if (featureMatch) return featureMatch[1].trim();
    
    // Fallback to filename
    return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  }

  private detectPriority(content: string): 'high' | 'medium' | 'low' {
    if (content.includes('priority: high') || content.includes('critical')) return 'high';
    if (content.includes('priority: low')) return 'low';
    return 'medium';
  }

  private extractTags(content: string, filename: string): string[] {
    const tags: string[] = [];
    
    // Extract from filename
    if (filename.includes('system') || filename.includes('systest')) tags.push('system');
    if (filename.includes('integration') || filename.includes('itest')) tags.push('integration');
    if (filename.includes('unit')) tags.push('unit');
    if (filename.includes('e2e')) tags.push('e2e');
    
    // Extract from content
    const tagMatches = content.match(/@[\w-]+/g);
    if (tagMatches) {
      tags.push(...tagMatches.map(tag => tag.substring(1)));
    }
    
    return [...new Set(tags)];
  }
}

test.describe('Enhanced Manual Generator System Tests', () => {
  let tempDir: string;
  let generator: EnhancedManualGenerator;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `generator-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    generator = new EnhancedManualGenerator();
    
    // Setup default templates
    const htmlTemplate: ManualTemplate = {
      name: 'professional',
      format: 'html',
      template: `
<!DOCTYPE html>
<html>
<head>
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        .metadata { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 15px 0; }
        .content { line-height: 1.6; }
        .priority-high { border-left: 4px solid #dc3545; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <div class="header priority-{{priority}}">
        <h1>{{title}}</h1>
        <p><strong>ID:</strong> {{id}}</p>
        <p><strong>Theme:</strong> {{theme}}</p>
        <p><strong>User Story:</strong> {{userStory}}</p>
    </div>
    
    <div class="metadata">
        <div><strong>Priority:</strong> {{priority}}</div>
        <div><strong>Tags:</strong> {{tags}}</div>
        <div><strong>Generated:</strong> {{timestamp}}</div>
    </div>
    
    <div class="content">
        <h2>Test Content</h2>
        <pre>{{content}}</pre>
    </div>
</body>
</html>`
    };

    const markdownTemplate: ManualTemplate = {
      name: 'simple',
      format: 'markdown',
      template: `# {{title}}

**Test ID:** {{id}}
**Theme:** {{theme}}
**User Story:** {{userStory}}
**Priority:** {{priority}}
**Tags:** {{tags}}
**Generated:** {{timestamp}}

## Test Content

\`\`\`
{{content}}
\`\`\`

## Manual Test Steps

1. [ ] Prepare test environment
2. [ ] Execute test scenarios
3. [ ] Verify expected results
4. [ ] Document any issues

## Notes

_Generated by Enhanced Manual Generator_
`
    };

    generator.addTemplate(htmlTemplate);
    generator.addTemplate(markdownTemplate);
    
    // Create a browser page for screenshot testing
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    if (page) await page.close();
    
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should generate professional HTML manuals from test documents', async () => {
    const testDoc: TestDocument = {
      id: 'TEST-001',
      title: 'User Authentication System Test',
      content: `describe('User Authentication', () => {
  test('should login with valid credentials', async () => {
    // Test implementation
    expect(true).toBe(true);
  });
});`,
      format: 'unit',
      metadata: {
        theme: 'auth',
        userStory: 'login-flow',
        priority: 'high',
        tags: ['authentication', 'security', 'smoke']
      }
    };

    generator.addDocument(testDoc);

    const report = await generator.generateManual('professional', 'html', tempDir, {
      includeScreenshots: true,
      customStyles: '.custom { color: blue; }'
    });

    expect(report.totalDocuments).toBe(1);
    expect(report.successfulGenerations).toBe(1);
    expect(report.failedGenerations).toBe(0);
    expect(report.outputFiles).toHaveLength(1);

    // Verify generated file
    const generatedFile = report.outputFiles[0];
    const content = await fs.readFile(generatedFile, 'utf-8');
    
    expect(content).toContain('User Authentication System Test');
    expect(content).toContain('TEST-001');
    expect(content).toContain('priority-high');
    expect(content).toContain('authentication, security, smoke');
    expect(content).toContain('.custom { color: blue; }');
    expect(content).toContain('📷 Screenshot: Initial State');
    expect(content).toContain('describe(\'User Authentication\'');
  });

  test('should generate markdown manuals with proper formatting', async () => {
    const testDoc: TestDocument = {
      id: 'API-001',
      title: 'REST API Endpoint Testing',
      content: `Feature: User Management API
  Scenario: Create new user
    Given API is accessible
    When POST request is sent to /api/users
    Then user is created successfully`,
      format: 'gherkin',
      metadata: {
        theme: 'api',
        userStory: 'user-management',
        priority: 'medium',
        tags: ['api', 'rest', 'integration']
      }
    };

    generator.addDocument(testDoc);

    const report = await generator.generateManual('simple', 'markdown', tempDir);

    expect(report.successfulGenerations).toBe(1);

    const generatedFile = report.outputFiles[0];
    const content = await fs.readFile(generatedFile, 'utf-8');

    expect(content).toContain('# REST API Endpoint Testing');
    expect(content).toContain('**Test ID:** API-001');
    expect(content).toContain('**Priority:** medium');
    expect(content).toContain('**Tags:** api, rest, integration');
    expect(content).toContain('Feature: User Management API');
    expect(content).toContain('## Manual Test Steps');
    expect(content).toContain('1. [ ] Prepare test environment');
  });

  test('should perform batch generation across multiple themes', async () => {
    const testDocs: TestDocument[] = [
      {
        id: 'AUTH-001',
        title: 'Login Test',
        content: 'Login test content...',
        format: 'unit',
        metadata: { theme: 'auth', userStory: 'login', priority: 'high', tags: ['auth'] }
      },
      {
        id: 'API-001',
        title: 'API Test',
        content: 'API test content...',
        format: 'integration',
        metadata: { theme: 'api', userStory: 'endpoints', priority: 'medium', tags: ['api'] }
      },
      {
        id: 'UI-001',
        title: 'UI Test',
        content: 'UI test content...',
        format: 'unit',
        metadata: { theme: 'ui', userStory: 'components', priority: 'low', tags: ['ui'] }
      }
    ];

    testDocs.forEach(doc => generator.addDocument(doc));

    // Generate in batch mode
    const htmlReport = await generator.generateManual('professional', 'html', tempDir, { batchMode: true });
    const mdReport = await generator.generateManual('simple', 'markdown', tempDir, { batchMode: true });

    expect(htmlReport.totalDocuments).toBe(3);
    expect(htmlReport.successfulGenerations).toBe(3);
    expect(htmlReport.outputFiles).toHaveLength(3);

    expect(mdReport.totalDocuments).toBe(3);
    expect(mdReport.successfulGenerations).toBe(3);
    expect(mdReport.outputFiles).toHaveLength(3);

    // Generate batch report
    await generator.generateBatchReport(tempDir, [htmlReport, mdReport]);

    const batchReportExists = await fs.access(path.join(tempDir, 'batch_report.html'))
      .then(() => true)
      .catch(() => false);
    expect(batchReportExists).toBe(true);

    const batchContent = await fs.readFile(path.join(tempDir, 'batch_report.html'), 'utf-8');
    expect(batchContent).toContain('Enhanced Manual Generator - Batch Report');
    expect(batchContent).toContain('Total Documents');
    expect(batchContent).toContain('6'); // 3 docs × 2 formats
    expect(batchContent).toContain('100.0%'); // Success rate
  });

  test('should scan and discover tests from theme directories', async () => {
    // Create mock theme structure
    const mockThemesDir = path.join(tempDir, 'mock_themes');
    await fs.mkdir(mockThemesDir, { recursive: true });

    // Create auth theme structure
    const authThemeDir = path.join(mockThemesDir, 'infra_auth');
    const authStoryDir = path.join(authThemeDir, 'user-stories', '001-login-flow');
    const authTestsDir = path.join(authStoryDir, 'tests', 'system');
    await fs.mkdir(authTestsDir, { recursive: true });

    const authTestContent = `describe('Authentication System Tests', () => {
  test('should handle user login correctly', async () => {
    // @priority: high
    // @tags: auth, login, critical
    expect(true).toBe(true);
  });
});`;

    await fs.writeFile(path.join(authTestsDir, 'auth.systest.ts'), authTestContent);

    // Create api theme structure
    const apiThemeDir = path.join(mockThemesDir, 'infra_api');
    const apiStoryDir = path.join(apiThemeDir, 'user-stories', '002-endpoints');
    const apiTestsDir = path.join(apiStoryDir, 'tests', 'integration');
    await fs.mkdir(apiTestsDir, { recursive: true });

    const apiTestContent = `Feature: API Endpoints
  Scenario: Get user data
    Given user exists in system
    When GET /api/users/:id is called
    Then user data is returned`;

    await fs.writeFile(path.join(apiTestsDir, 'endpoints.feature'), apiTestContent);

    // Scan themes
    const discoveredTests = await generator.scanThemesForTests(mockThemesDir);

    expect(discoveredTests).toHaveLength(2);

    const authTest = discoveredTests.find(t => t.metadata.theme === 'infra_auth');
    const apiTest = discoveredTests.find(t => t.metadata.theme === 'infra_api');

    expect(authTest).toBeDefined();
    expect(authTest!.title).toBe('Authentication System Tests');
    expect(authTest!.metadata.priority).toBe('high');
    expect(authTest!.metadata.tags).toContain('auth');
    expect(authTest!.format).toBe('unit');

    expect(apiTest).toBeDefined();
    expect(apiTest!.title).toBe('API Endpoints');
    expect(apiTest!.format).toBe('gherkin');
    expect(apiTest!.metadata.theme).toBe('infra_api');
  });

  test('should handle theme-specific generation with filtering', async () => {
    const testDocs: TestDocument[] = [
      {
        id: 'AUTH-001',
        title: 'Auth Test 1',
        content: 'Auth content...',
        format: 'unit',
        metadata: { theme: 'auth', userStory: 'login', priority: 'high', tags: ['auth'] }
      },
      {
        id: 'AUTH-002',
        title: 'Auth Test 2',
        content: 'Auth content 2...',
        format: 'unit',
        metadata: { theme: 'auth', userStory: 'logout', priority: 'medium', tags: ['auth'] }
      },
      {
        id: 'API-001',
        title: 'API Test 1',
        content: 'API content...',
        format: 'integration',
        metadata: { theme: 'api', userStory: 'endpoints', priority: 'medium', tags: ['api'] }
      }
    ];

    testDocs.forEach(doc => generator.addDocument(doc));

    // Generate only for auth theme
    const authReport = await generator.generateManual('professional', 'html', tempDir, { 
      theme: 'auth' 
    });

    expect(authReport.totalDocuments).toBe(2); // Only auth tests
    expect(authReport.successfulGenerations).toBe(2);
    expect(authReport.outputFiles).toHaveLength(2);

    // Verify only auth tests were generated
    for (const filePath of authReport.outputFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('<strong>Theme:</strong> auth');
    }
  });

  test('should handle generation errors gracefully', async () => {
    // Add a document that will cause template processing to fail
    const problematicDoc: TestDocument = {
      id: 'FAIL-001',
      title: 'Test with {{invalid template syntax',
      content: 'Content with unclosed {{braces',
      format: 'unit',
      metadata: {
        theme: 'test',
        userStory: 'error-handling',
        priority: 'low',
        tags: []
      }
    };

    const validDoc: TestDocument = {
      id: 'PASS-001',
      title: 'Valid Test',
      content: 'Valid content',
      format: 'unit',
      metadata: {
        theme: 'test',
        userStory: 'success',
        priority: 'medium',
        tags: []
      }
    };

    generator.addDocument(problematicDoc);
    generator.addDocument(validDoc);

    const report = await generator.generateManual('professional', 'html', tempDir);

    expect(report.totalDocuments).toBe(2);
    expect(report.successfulGenerations).toBe(1); // Only valid doc succeeds
    expect(report.failedGenerations).toBe(1); // Problematic doc fails
    expect(report.outputFiles).toHaveLength(1); // Only successful generation
  });

  test('should generate responsive mobile-friendly manuals', async () => {
    const mobileTestDoc: TestDocument = {
      id: 'MOBILE-001',
      title: 'Mobile App Test',
      content: 'Mobile testing scenario...',
      format: 'unit',
      metadata: {
        theme: 'mobile',
        userStory: 'responsive-design',
        priority: 'high',
        tags: ['mobile', 'responsive', 'ui']
      }
    };

    generator.addDocument(mobileTestDoc);

    const mobileStyles = `
      @media (max-width: 768px) {
        .metadata { grid-template-columns: 1fr; }
        .header { padding: 10px; }
        body { margin: 10px; font-size: 14px; }
      }
      @media print {
        .no-print { display: none; }
      }`;

    const report = await generator.generateManual('professional', 'html', tempDir, {
      customStyles: mobileStyles
    });

    expect(report.successfulGenerations).toBe(1);

    const content = await fs.readFile(report.outputFiles[0], 'utf-8');
    expect(content).toContain('@media (max-width: 768px)');
    expect(content).toContain('grid-template-columns: 1fr');
    expect(content).toContain('@media print');
  });

  test('should integrate with browser for visual testing', async () => {
    const visualTestDoc: TestDocument = {
      id: 'VISUAL-001',
      title: 'Visual Regression Test',
      content: 'Visual testing content with UI elements...',
      format: 'unit',
      metadata: {
        theme: 'ui',
        userStory: 'visual-testing',
        priority: 'high',
        tags: ['visual', 'ui', 'regression']
      }
    };

    generator.addDocument(visualTestDoc);

    const report = await generator.generateManual('professional', 'html', tempDir, {
      includeScreenshots: true
    });

    // Load the generated manual in browser
    const manualFile = report.outputFiles[0];
    await page.goto(`file://${manualFile}`);

    // Verify the manual loads correctly
    await expect(page.locator('h1')).toContainText('Visual Regression Test');
    await expect(page.locator('.priority-high')).toBeVisible();
    
    // Verify screenshot placeholders are present
    const screenshotBoxes = page.locator('.screenshot-box');
    await expect(screenshotBoxes).toHaveCount(2);
    
    // Take a screenshot of the generated manual
    const screenshotPath = path.join(tempDir, 'manual_screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const screenshotExists = await fs.access(screenshotPath).then(() => true).catch(() => false);
    expect(screenshotExists).toBe(true);

    // Verify responsive design
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.metadata')).toBeVisible();
  });
});