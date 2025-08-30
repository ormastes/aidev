#!/usr/bin/env bun
/**
 * Explorer QA Agent - Web App Bug Detection for AI Dev Platform
 * Tests for vulnerabilities, console errors, API issues, and performance problems
 */

import { chromium, Browser, Page, ConsoleMessage } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  timestamp: string;
  flow: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'error' | 'warning' | 'performance' | 'security';
  description: string;
  stepsToReproduce: string[];
  expected: string;
  actual: string;
  evidence: Record<string, any>;
  testCode?: string;
}

interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  responseTime: number;
}

class ExplorerQAAgent {
  private findings: Finding[] = [];
  private browser?: Browser;
  private page?: Page;
  private consoleErrors: string[] = [];
  private networkFailures: NetworkRequest[] = [];
  private sessionId: string;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Explorer QA Agent');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Monitor console errors
    this.page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });

    // Monitor network failures
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.networkFailures.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          responseTime: Date.now()
        });
      }
    });
  }

  async testPortal(portalPath: string = ''): Promise<void> {
    const targetUrl = `${this.baseUrl}${portalPath}`;
    console.log(`\n🔍 Testing portal at: ${targetUrl}`);
    
    try {
      // Navigate to portal
      await this.page!.goto(targetUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Check for common vulnerabilities
      await this.checkXSSVulnerabilities();
      await this.checkAPISchemaValidation();
      await this.checkSecurityHeaders();
      await this.checkPerformanceIssues();
      await this.checkAuthenticationFlows();
      await this.checkErrorHandling();
      
      // Report console errors
      if (this.consoleErrors.length > 0) {
        this.addFinding({
          timestamp: new Date().toISOString(),
          flow: 'portal-load',
          title: 'Console Errors Detected',
          severity: 'medium',
          type: 'error',
          description: `Found ${this.consoleErrors.length} console errors on page load`,
          stepsToReproduce: [
            `Navigate to ${targetUrl}`,
            'Open browser console',
            'Observe errors'
          ],
          expected: 'No console errors',
          actual: `${this.consoleErrors.length} console errors`,
          evidence: { errors: this.consoleErrors }
        });
      }

      // Report network failures
      if (this.networkFailures.length > 0) {
        this.addFinding({
          timestamp: new Date().toISOString(),
          flow: 'portal-load',
          title: 'Network Request Failures',
          severity: 'high',
          type: 'error',
          description: `Found ${this.networkFailures.length} failed network requests`,
          stepsToReproduce: [
            `Navigate to ${targetUrl}`,
            'Open network tab',
            'Observe failed requests'
          ],
          expected: 'All requests succeed (2xx/3xx)',
          actual: `${this.networkFailures.length} failed requests`,
          evidence: { failures: this.networkFailures }
        });
      }

    } catch (error: any) {
      this.addFinding({
        timestamp: new Date().toISOString(),
        flow: 'portal-load',
        title: 'Portal Load Failure',
        severity: 'critical',
        type: 'error',
        description: `Failed to load portal: ${error.message}`,
        stepsToReproduce: [`Navigate to ${targetUrl}`],
        expected: 'Portal loads successfully',
        actual: `Error: ${error.message}`,
        evidence: { error: error.stack }
      });
    }
  }

  private async checkXSSVulnerabilities(): Promise<void> {
    console.log('  ✓ Checking for XSS vulnerabilities...');
    
    // Test common XSS vectors
    const xssVectors = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>'
    ];

    for (const vector of xssVectors) {
      // Find all input fields
      const inputs = await this.page!.$$('input[type="text"], input[type="search"], textarea');
      
      for (const input of inputs) {
        try {
          await input.fill(vector);
          await this.page!.keyboard.press('Enter');
          
          // Check if script executed
          const hasAlert = await this.page!.evaluate(() => {
            return window.alert !== undefined;
          });

          if (hasAlert) {
            this.addFinding({
              timestamp: new Date().toISOString(),
              flow: 'xss-check',
              title: 'XSS Vulnerability Detected',
              severity: 'critical',
              type: 'security',
              description: 'Input field vulnerable to XSS attack',
              stepsToReproduce: [
                'Find input field',
                `Enter: ${vector}`,
                'Submit form'
              ],
              expected: 'Input sanitized',
              actual: 'Script executed',
              evidence: { vector, field: await input.getAttribute('name') }
            });
          }
        } catch (error) {
          // Input might not be interactable
        }
      }
    }
  }

  private async checkAPISchemaValidation(): Promise<void> {
    console.log('  ✓ Checking API schema validation...');
    
    // Intercept API calls
    const apiCalls: any[] = [];
    
    this.page!.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });

    // Trigger some interactions to generate API calls
    await this.page!.click('body'); // Simple interaction
    
    // Analyze API calls
    for (const call of apiCalls) {
      if (call.postData) {
        try {
          const data = JSON.parse(call.postData);
          // Check for sensitive data exposure
          if (data.password || data.token || data.apiKey) {
            this.addFinding({
              timestamp: new Date().toISOString(),
              flow: 'api-validation',
              title: 'Sensitive Data in API Request',
              severity: 'high',
              type: 'security',
              description: 'Sensitive data sent in plain text',
              stepsToReproduce: [
                `Make API call to ${call.url}`,
                'Inspect request payload'
              ],
              expected: 'Sensitive data encrypted',
              actual: 'Sensitive data in plain text',
              evidence: { url: call.url, method: call.method }
            });
          }
        } catch (error) {
          // Not JSON data
        }
      }
    }
  }

  private async checkSecurityHeaders(): Promise<void> {
    console.log('  ✓ Checking security headers...');
    
    const response = await this.page!.goto(this.baseUrl);
    if (response) {
      const headers = response.headers();
      
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security',
        'content-security-policy'
      ];

      for (const header of requiredHeaders) {
        if (!headers[header]) {
          this.addFinding({
            timestamp: new Date().toISOString(),
            flow: 'security-headers',
            title: `Missing Security Header: ${header}`,
            severity: 'medium',
            type: 'security',
            description: `Security header ${header} is not set`,
            stepsToReproduce: [
              `Navigate to ${this.baseUrl}`,
              'Check response headers'
            ],
            expected: `Header ${header} present`,
            actual: 'Header missing',
            evidence: { missingHeader: header }
          });
        }
      }
    }
  }

  private async checkPerformanceIssues(): Promise<void> {
    console.log('  ✓ Checking performance issues...');
    
    const metrics = await this.page!.evaluate(() => {
      const perfData = window.performance.timing;
      return {
        loadTime: perfData.loadEventEnd - perfData.navigationStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        firstPaint: perfData.responseEnd - perfData.navigationStart
      };
    });

    if (metrics.loadTime > 5000) {
      this.addFinding({
        timestamp: new Date().toISOString(),
        flow: 'performance',
        title: 'Slow Page Load',
        severity: 'medium',
        type: 'performance',
        description: `Page load time exceeds 5 seconds (${metrics.loadTime}ms)`,
        stepsToReproduce: [
          `Navigate to ${this.baseUrl}`,
          'Measure load time'
        ],
        expected: 'Load time < 5000ms',
        actual: `Load time: ${metrics.loadTime}ms`,
        evidence: metrics
      });
    }
  }

  private async checkAuthenticationFlows(): Promise<void> {
    console.log('  ✓ Checking authentication flows...');
    
    // Look for login forms
    const loginForm = await this.page!.$('form[action*="login"], form[action*="signin"]');
    
    if (loginForm) {
      // Try to submit empty form
      try {
        await this.page!.click('button[type="submit"]');
        
        // Check for client-side validation
        const errors = await this.page!.$$('.error, .alert, [role="alert"]');
        if (errors.length === 0) {
          this.addFinding({
            timestamp: new Date().toISOString(),
            flow: 'authentication',
            title: 'Missing Client-Side Validation',
            severity: 'medium',
            type: 'security',
            description: 'Login form lacks client-side validation',
            stepsToReproduce: [
              'Find login form',
              'Submit empty form',
              'Check for validation errors'
            ],
            expected: 'Validation errors shown',
            actual: 'No validation errors',
            evidence: { formFound: true }
          });
        }
      } catch (error) {
        // Form might not be interactable
      }
    }
  }

  private async checkErrorHandling(): Promise<void> {
    console.log('  ✓ Checking error handling...');
    
    // Try to access non-existent page
    const response = await this.page!.goto(`${this.baseUrl}/non-existent-page-12345`, {
      waitUntil: 'networkidle'
    });

    if (response && response.status() === 404) {
      const content = await this.page!.content();
      
      // Check for stack traces
      if (content.includes('stack trace') || content.includes('traceback')) {
        this.addFinding({
          timestamp: new Date().toISOString(),
          flow: 'error-handling',
          title: 'Stack Trace Exposed',
          severity: 'high',
          type: 'security',
          description: 'Stack trace exposed in error page',
          stepsToReproduce: [
            'Navigate to non-existent page',
            'Check error page content'
          ],
          expected: 'Generic error message',
          actual: 'Stack trace exposed',
          evidence: { url: `${this.baseUrl}/non-existent-page-12345` }
        });
      }
    }
  }

  private addFinding(finding: Finding): void {
    this.findings.push(finding);
    console.log(`    ⚠️  ${finding.title} (${finding.severity})`);
  }

  async generateReport(): Promise<void> {
    const reportDir = 'gen/doc/explorer-qa-reports';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generate markdown report
    const reportPath = path.join(reportDir, `explorer-qa-${this.sessionId}.md`);
    let reportContent = `# Explorer QA Report
    
**Session ID:** ${this.sessionId}  
**Target:** ${this.baseUrl}  
**Timestamp:** ${new Date().toISOString()}  
**Total Findings:** ${this.findings.length}

## Summary

| Severity | Count |
|----------|-------|
| Critical | ${this.findings.filter(f => f.severity === 'critical').length} |
| High | ${this.findings.filter(f => f.severity === 'high').length} |
| Medium | ${this.findings.filter(f => f.severity === 'medium').length} |
| Low | ${this.findings.filter(f => f.severity === 'low').length} |

## Findings

`;

    for (const finding of this.findings) {
      reportContent += `### ${finding.title}

**Severity:** ${finding.severity}  
**Type:** ${finding.type}  
**Flow:** ${finding.flow}  

**Description:** ${finding.description}

**Steps to Reproduce:**
${finding.stepsToReproduce.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Expected:** ${finding.expected}  
**Actual:** ${finding.actual}

**Evidence:**
\`\`\`json
${JSON.stringify(finding.evidence, null, 2)}
\`\`\`

---

`;
    }

    fs.writeFileSync(reportPath, reportContent);
    console.log(`\n✅ Report saved to ${reportPath}`);
    
    // Generate JSON report
    const jsonReportPath = path.join(reportDir, `explorer-qa-${this.sessionId}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify({
      sessionId: this.sessionId,
      targetUrl: this.baseUrl,
      timestamp: new Date().toISOString(),
      totalFindings: this.findings.length,
      findings: this.findings
    }, null, 2));
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runFullSuite(): Promise<void> {
    await this.initialize();
    
    // Test main portal
    await this.testPortal();
    
    // Test other known endpoints
    const endpoints = [
      '/dashboard',
      '/setup',
      '/monitoring',
      '/api/docs'
    ];

    for (const endpoint of endpoints) {
      // Reset state for each test
      this.consoleErrors = [];
      this.networkFailures = [];
      
      await this.testPortal(endpoint);
    }

    await this.generateReport();
    await this.cleanup();
    
    // Summary
    console.log('\n📊 Explorer QA Summary:');
    console.log(`  Total Findings: ${this.findings.length}`);
    console.log(`  Critical: ${this.findings.filter(f => f.severity === 'critical').length}`);
    console.log(`  High: ${this.findings.filter(f => f.severity === 'high').length}`);
    console.log(`  Medium: ${this.findings.filter(f => f.severity === 'medium').length}`);
    console.log(`  Low: ${this.findings.filter(f => f.severity === 'low').length}`);
  }
}

// Main execution
async function main() {
  const targetUrl = process.env.TARGET_URL || 'http://localhost:3000';
  const agent = new ExplorerQAAgent(targetUrl);
  
  try {
    await agent.runFullSuite();
  } catch (error) {
    console.error('❌ Explorer QA failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { ExplorerQAAgent };