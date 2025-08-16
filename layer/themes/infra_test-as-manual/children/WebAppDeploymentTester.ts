/**
 * WebAppDeploymentTester - Comprehensive testing for web app deployments
 * Tests apps across local dev, staging, and production environments
 */

import { DeploymentTestManager, DeploymentEnvironment, TestDeploymentConfig } from './DeploymentTestManager';
import { PlaywrightIntegration } from './PlaywrightIntegration';
import { TestPortManager } from './TestPortManager';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { spawn, ChildProcess } from 'child_process';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface WebAppConfig {
  appId: string;
  name: string;
  localDevPath: string;
  releasePath?: string;
  buildCommand?: string;
  startCommand: string;
  testCommand?: string;
  ports: {
    dev: number;
    release?: number;
  };
  healthEndpoints: {
    dev: string;
    release?: string;
  };
  dependencies?: string[];
  envVariables?: Record<string, string>;
}

export interface DeploymentTestSuite {
  name: string;
  environments: ('local-dev' | 'local-release' | 'staging' | "production")[];
  tests: DeploymentTest[];
  options?: {
    parallel?: boolean;
    stopOnFailure?: boolean;
    retries?: number;
    timeout?: number;
  };
}

export interface DeploymentTest {
  name: string;
  type: 'health' | "functional" | "integration" | "performance" | "security";
  test: (context: TestContext) => Promise<TestResult>;
  critical?: boolean;
  environments?: string[];
}

export interface TestContext {
  environment: DeploymentEnvironment;
  baseUrl: string;
  page?: any; // Playwright page
  apiClient?: any;
  config: WebAppConfig;
}

export interface TestResult {
  passed: boolean;
  message?: string;
  details?: any;
  duration?: number;
  screenshots?: string[];
  logs?: string[];
}

export interface DeploymentReport {
  appId: string;
  appName: string;
  timestamp: string;
  environments: EnvironmentReport[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  recommendations: string[];
}

export interface EnvironmentReport {
  environment: string;
  status: 'success' | 'failure' | 'partial';
  tests: {
    name: string;
    type: string;
    result: TestResult;
  }[];
  metrics?: {
    responseTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

/**
 * Main WebAppDeploymentTester class
 */
export class WebAppDeploymentTester {
  private static instance: WebAppDeploymentTester;
  private deploymentManager: DeploymentTestManager;
  private portManager: TestPortManager;
  private playwrightIntegration: PlaywrightIntegration;
  private webApps: Map<string, WebAppConfig> = new Map();
  private activeProcesses: Map<string, ChildProcess> = new Map();
  
  private constructor() {
    this.deploymentManager = DeploymentTestManager.getInstance();
    this.portManager = TestPortManager.getInstance();
    this.playwrightIntegration = PlaywrightIntegration.getInstance();
    this.loadWebAppConfigs();
  }
  
  static getInstance(): WebAppDeploymentTester {
    if (!WebAppDeploymentTester.instance) {
      WebAppDeploymentTester.instance = new WebAppDeploymentTester();
    }
    return WebAppDeploymentTester.instance;
  }
  
  /**
   * Register a web app for deployment testing
   */
  async registerWebApp(config: WebAppConfig): void {
    // Validate paths
    if (!fs.existsSync(config.localDevPath)) {
      throw new Error(`Local dev path does not exist: ${config.localDevPath}`);
    }
    
    if (config.releasePath && !fs.existsSync(config.releasePath)) {
      console.warn(`Release path does not exist: ${config.releasePath}`);
    }
    
    this.webApps.set(config.appId, config);
    this.saveWebAppConfigs();
    
    console.log(`✅ Registered web app for deployment testing: ${config.name}`);
  }
  
  /**
   * Create comprehensive deployment test suite
   */
  async createDeploymentTestSuite(appId: string): DeploymentTestSuite {
    const app = this.webApps.get(appId);
    if (!app) {
      throw new Error(`Web app not found: ${appId}`);
    }
    
    return {
      name: `${app.name} Deployment Tests`,
      environments: ['local-dev', 'local-release', 'staging', "production"],
      tests: [
        // Health checks
        {
          name: 'Application Health Check',
          type: 'health',
          critical: true,
          test: async (ctx) => this.testHealth(ctx)
        },
        {
          name: 'Dependency Services Check',
          type: 'health',
          test: async (ctx) => this.testDependencies(ctx)
        },
        
        // Functional tests
        {
          name: 'Main Page Load',
          type: "functional",
          critical: true,
          test: async (ctx) => this.testMainPageLoad(ctx)
        },
        {
          name: 'Navigation Test',
          type: "functional",
          test: async (ctx) => this.testNavigation(ctx)
        },
        {
          name: 'Core Features Test',
          type: "functional",
          test: async (ctx) => this.testCoreFeatures(ctx)
        },
        
        // Integration tests
        {
          name: 'API Integration',
          type: "integration",
          test: async (ctx) => this.testAPIIntegration(ctx)
        },
        {
          name: 'Database Connectivity',
          type: "integration",
          test: async (ctx) => this.testDatabaseConnectivity(ctx),
          environments: ['local-dev', 'local-release', 'staging']
        },
        
        // Performance tests
        {
          name: 'Page Load Performance',
          type: "performance",
          test: async (ctx) => this.testPageLoadPerformance(ctx)
        },
        {
          name: 'API Response Time',
          type: "performance",
          test: async (ctx) => this.testAPIResponseTime(ctx)
        },
        
        // Security tests
        {
          name: 'Security Headers',
          type: "security",
          test: async (ctx) => this.testSecurityHeaders(ctx),
          environments: ['staging', "production"]
        },
        {
          name: 'SSL Certificate',
          type: "security",
          test: async (ctx) => this.testSSLCertificate(ctx),
          environments: ['staging', "production"]
        }
      ],
      options: {
        parallel: false,
        stopOnFailure: false,
        retries: 2,
        timeout: 30000
      }
    };
  }
  
  /**
   * Run deployment tests for an app
   */
  async runDeploymentTests(
    appId: string,
    environments?: string[]
  ): Promise<DeploymentReport> {
    const app = this.webApps.get(appId);
    if (!app) {
      throw new Error(`Web app not found: ${appId}`);
    }
    
    const suite = this.createDeploymentTestSuite(appId);
    const targetEnvs = environments || suite.environments;
    const report: DeploymentReport = {
      appId,
      appName: app.name,
      timestamp: new Date().toISOString(),
      environments: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      recommendations: []
    };
    
    const startTime = Date.now();
    
    for (const envName of targetEnvs) {
      console.log(`\n🚀 Testing ${app.name} in ${envName} environment...`);
      
      // Start app if local environment
      if (envName.startsWith('local-')) {
        await this.startLocalApp(app, envName === 'local-release');
      }
      
      const envReport = await this.runEnvironmentTests(app, envName, suite);
      report.environments.push(envReport);
      
      // Update summary
      for (const test of envReport.tests) {
        report.summary.totalTests++;
        if (test.result.passed) {
          report.summary.passed++;
        } else {
          report.summary.failed++;
        }
      }
      
      // Stop app if local environment
      if (envName.startsWith('local-')) {
        await this.stopLocalApp(app);
      }
    }
    
    report.summary.duration = Date.now() - startTime;
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);
    
    // Save report
    await this.saveReport(report);
    
    return report;
  }
  
  /**
   * Run tests for a specific environment
   */
  private async runEnvironmentTests(
    app: WebAppConfig,
    envName: string,
    suite: DeploymentTestSuite
  ): Promise<EnvironmentReport> {
    const environment = this.getEnvironmentConfig(app, envName);
    const baseUrl = this.buildBaseUrl(environment);
    
    const envReport: EnvironmentReport = {
      environment: envName,
      status: 'success',
      tests: [],
      metrics: {}
    };
    
    // Create test context
    const browser = await this.playwrightIntegration.launchBrowser();
    const page = await browser.newPage();
    
    const context: TestContext = {
      environment,
      baseUrl,
      page,
      config: app
    };
    
    // Run tests
    for (const test of suite.tests) {
      // Skip if test not for this environment
      if (test.environments && !test.environments.includes(envName)) {
        continue;
      }
      
      console.log(`  Running: ${test.name}`);
      
      const startTime = Date.now();
      let result: TestResult;
      
      try {
        result = await test.test(context);
        result.duration = Date.now() - startTime;
      } catch (error) {
        result = {
          passed: false,
          message: error.message,
          duration: Date.now() - startTime
        };
      }
      
      envReport.tests.push({
        name: test.name,
        type: test.type,
        result
      });
      
      if (!result.passed) {
        console.log(`    ❌ Failed: ${result.message}`);
        if (test.critical) {
          envReport.status = 'failure';
        } else if (envReport.status !== 'failure') {
          envReport.status = 'partial';
        }
      } else {
        console.log(`    ✅ Passed`);
      }
    }
    
    // Collect metrics
    envReport.metrics = await this.collectMetrics(context);
    
    await browser.close();
    
    return envReport;
  }
  
  /**
   * Test implementations
   */
  private async testHealth(ctx: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(`${ctx.baseUrl}${ctx.config.healthEndpoints.dev}`);
      return {
        passed: response.ok,
        message: response.ok ? 'Health check passed' : `Health check failed with status ${response.status}`,
        details: { status: response.status }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Health check failed: ${error.message}`
      };
    }
  }
  
  private async testDependencies(ctx: TestContext): Promise<TestResult> {
    if (!ctx.config.dependencies) {
      return { passed: true, message: 'No dependencies to check' };
    }
    
    const results: any[] = [];
    for (const dep of ctx.config.dependencies) {
      try {
        const response = await fetch(dep);
        results.push({
          dependency: dep,
          status: response.status,
          ok: response.ok
        });
      } catch (error) {
        results.push({
          dependency: dep,
          error: error.message,
          ok: false
        });
      }
    }
    
    const allOk = results.every(r => r.ok);
    return {
      passed: allOk,
      message: allOk ? 'All dependencies healthy' : 'Some dependencies failed',
      details: results
    };
  }
  
  private async testMainPageLoad(ctx: TestContext): Promise<TestResult> {
    try {
      await ctx.page.goto(ctx.baseUrl, { waitUntil: "networkidle" });
      const title = await ctx.page.title();
      
      return {
        passed: true,
        message: 'Main page loaded successfully',
        details: { title }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Failed to load main page: ${error.message}`
      };
    }
  }
  
  private async testNavigation(ctx: TestContext): Promise<TestResult> {
    try {
      await ctx.page.goto(ctx.baseUrl);
      
      // Find and test navigation links
      const links = await ctx.page.$$eval('a[href]', (links: any[]) => 
        links.map(link => ({ text: link.textContent, href: link.href }))
      );
      
      const results: any[] = [];
      for (const link of links.slice(0, 5)) { // Test first 5 links
        try {
          await ctx.page.goto(link.href, { waitUntil: "domcontentloaded" });
          results.push({ link: link.text, status: 'success' });
        } catch (error) {
          results.push({ link: link.text, status: 'failed', error: error.message });
        }
      }
      
      return {
        passed: results.every(r => r.status === 'success'),
        message: 'Navigation test completed',
        details: results
      };
    } catch (error) {
      return {
        passed: false,
        message: `Navigation test failed: ${error.message}`
      };
    }
  }
  
  private async testCoreFeatures(ctx: TestContext): Promise<TestResult> {
    // App-specific core features test
    // This should be customized per app
    try {
      await ctx.page.goto(ctx.baseUrl);
      
      // Example: Test if main components exist
      const hasHeader = await ctx.page.$('header, nav, .navbar') !== null;
      const hasContent = await ctx.page.$('main, .content, #app') !== null;
      const hasFooter = await ctx.page.$('footer, .footer') !== null;
      
      return {
        passed: hasHeader && hasContent,
        message: 'Core features present',
        details: { hasHeader, hasContent, hasFooter }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Core features test failed: ${error.message}`
      };
    }
  }
  
  private async testAPIIntegration(ctx: TestContext): Promise<TestResult> {
    try {
      const apiEndpoint = `${ctx.baseUrl}/api/health`;
      const response = await fetch(apiEndpoint);
      
      return {
        passed: response.ok,
        message: response.ok ? 'API integration successful' : `API returned ${response.status}`,
        details: { 
          status: response.status,
          endpoint: apiEndpoint
        }
      };
    } catch (error) {
      return {
        passed: false,
        message: `API integration failed: ${error.message}`
      };
    }
  }
  
  private async testDatabaseConnectivity(ctx: TestContext): Promise<TestResult> {
    // Check if app has database connectivity
    try {
      const response = await fetch(`${ctx.baseUrl}/api/db/health`);
      const data = await response.json().catch(() => ({}));
      
      return {
        passed: response.ok && data.connected,
        message: 'Database connectivity check',
        details: data
      };
    } catch (error) {
      return {
        passed: false,
        message: `Database connectivity test failed: ${error.message}`
      };
    }
  }
  
  private async testPageLoadPerformance(ctx: TestContext): Promise<TestResult> {
    try {
      const startTime = Date.now();
      await ctx.page.goto(ctx.baseUrl, { waitUntil: "networkidle" });
      const loadTime = Date.now() - startTime;
      
      const metrics = await ctx.page.evaluate(() => {
        const perf = window.performance.timing;
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
          fullyLoaded: perf.loadEventEnd - perf.navigationStart
        };
      });
      
      const passed = loadTime < 3000; // 3 second threshold
      
      return {
        passed,
        message: `Page loaded in ${loadTime}ms`,
        details: { loadTime, ...metrics }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Performance test failed: ${error.message}`
      };
    }
  }
  
  private async testAPIResponseTime(ctx: TestContext): Promise<TestResult> {
    try {
      const endpoints = [
        '/api/health',
        '/api/status',
        '/api/version'
      ];
      
      const results: any[] = [];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        try {
          await fetch(`${ctx.baseUrl}${endpoint}`);
          const responseTime = Date.now() - startTime;
          results.push({
            endpoint,
            responseTime,
            passed: responseTime < 500
          });
        } catch (error) {
          results.push({
            endpoint,
            error: error.message,
            passed: false
          });
        }
      }
      
      return {
        passed: results.every(r => r.passed),
        message: 'API response time test',
        details: results
      };
    } catch (error) {
      return {
        passed: false,
        message: `API response time test failed: ${error.message}`
      };
    }
  }
  
  private async testSecurityHeaders(ctx: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(ctx.baseUrl);
      const headers = response.headers;
      
      const securityHeaders = {
        'X-Content-Type-Options': headers.get('x-content-type-options'),
        'X-Frame-Options': headers.get('x-frame-options'),
        'X-XSS-Protection': headers.get('x-xss-protection'),
        'Strict-Transport-Security': headers.get('strict-transport-security'),
        'Content-Security-Policy': headers.get('content-security-policy')
      };
      
      const missing = Object.entries(securityHeaders)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
      
      return {
        passed: missing.length === 0,
        message: missing.length === 0 
          ? 'All security headers present' 
          : `Missing security headers: ${missing.join(', ')}`,
        details: securityHeaders
      };
    } catch (error) {
      return {
        passed: false,
        message: `Security headers test failed: ${error.message}`
      };
    }
  }
  
  private async testSSLCertificate(ctx: TestContext): Promise<TestResult> {
    if (!ctx.baseUrl.startsWith('https://')) {
      return {
        passed: false,
        message: 'SSL not enabled for this environment'
      };
    }
    
    try {
      const response = await fetch(ctx.baseUrl);
      return {
        passed: true,
        message: 'SSL certificate is valid',
        details: { url: ctx.baseUrl }
      };
    } catch (error) {
      return {
        passed: false,
        message: `SSL certificate test failed: ${error.message}`
      };
    }
  }
  
  /**
   * Helper methods
   */
  private async startLocalApp(app: WebAppConfig, isRelease: boolean): Promise<void> {
    const appPath = isRelease ? app.releasePath : app.localDevPath;
    if (!appPath) {
      throw new Error(`Path not configured for ${isRelease ? 'release' : 'dev'} environment`);
    }
    
    // Build if necessary
    if (isRelease && app.buildCommand) {
      console.log(`  Building ${app.name}...`);
      await this.runCommand(app.buildCommand, appPath);
    }
    
    // Start the app
    console.log(`  Starting ${app.name}...`);
    const env = {
      ...process.env,
      ...app.envVariables,
      PORT: String(isRelease ? app.ports.release : app.ports.dev)
    };
    
    const appProcess = spawn(app.startCommand, [], {
      cwd: appPath,
      env,
      shell: true
    });
    
    this.activeProcesses.set(app.appId, appProcess);
    
    // Wait for app to be ready
    await this.waitForAppReady(app, isRelease);
  }
  
  private async stopLocalApp(app: WebAppConfig): Promise<void> {
    const process = this.activeProcesses.get(app.appId);
    if (process) {
      console.log(`  Stopping ${app.name}...`);
      process.kill();
      this.activeProcesses.delete(app.appId);
      
      // Wait a bit for port to be released
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  private async waitForAppReady(app: WebAppConfig, isRelease: boolean): Promise<void> {
    const port = isRelease ? app.ports.release : app.ports.dev;
    const healthEndpoint = isRelease ? app.healthEndpoints.release : app.healthEndpoints.dev;
    const url = `http://localhost:${port}${healthEndpoint || '/'}`;
    
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          console.log(`  ✅ ${app.name} is ready`);
          return;
        }
      } catch (error) {
        // App not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`${app.name} failed to start within 30 seconds`);
  }
  
  private async runCommand(command: string, cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, [], { cwd, shell: true });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      
      process.on('error', reject);
    });
  }
  
  private async getEnvironmentConfig(app: WebAppConfig, envName: string): DeploymentEnvironment {
    let environment = this.deploymentManager.getEnvironment(envName);
    
    if (!environment) {
      // Create default environment config
      const port = envName === 'local-release' 
        ? app.ports.release || app.ports.dev
        : app.ports.dev;
        
      environment = {
        name: envName,
        type: 'local',
        domain: "localhost",
        port,
        protocol: 'http',
        healthCheckEndpoint: app.healthEndpoints.dev
      };
    }
    
    return environment;
  }
  
  private async buildBaseUrl(env: DeploymentEnvironment): string {
    const port = env.port && env.port !== 80 && env.port !== 443 
      ? `:${env.port}` 
      : '';
    return `${env.protocol}://${env.domain}${port}`;
  }
  
  private async collectMetrics(ctx: TestContext): Promise<any> {
    try {
      const metrics = await ctx.page.evaluate(() => {
        const perf = window.performance;
        const memory = (performance as any).memory;
        
        return {
          navigation: perf.timing.loadEventEnd - perf.timing.navigationStart,
          memory: memory ? {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize
          } : null
        };
      });
      
      return metrics;
    } catch (error) {
      return {};
    }
  }
  
  private async generateRecommendations(report: DeploymentReport): string[] {
    const recommendations: string[] = [];
    
    // Check for failures
    if (report.summary.failed > 0) {
      recommendations.push(`Fix ${report.summary.failed} failing tests before deployment`);
    }
    
    // Check for environment-specific issues
    const envStatuses = report.environments.map(e => e.status);
    if (envStatuses.includes('failure')) {
      recommendations.push('Critical failures detected - do not deploy to production');
    } else if (envStatuses.includes('partial')) {
      recommendations.push('Some non-critical tests failed - review before production deployment');
    }
    
    // Performance recommendations
    for (const env of report.environments) {
      const perfTest = env.tests.find(t => t.type === "performance");
      if (perfTest && !perfTest.result.passed) {
        recommendations.push('Performance issues detected - optimize before production');
        break;
      }
    }
    
    // Security recommendations
    for (const env of report.environments) {
      const secTest = env.tests.find(t => t.type === "security");
      if (secTest && !secTest.result.passed) {
        recommendations.push('Security issues detected - address before production deployment');
        break;
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All tests passed - ready for deployment');
    }
    
    return recommendations;
  }
  
  private async saveReport(report: DeploymentReport): Promise<void> {
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      await fileAPI.createDirectory(reportsDir);
    }
    
    const filename = `deployment-report-${report.appId}-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);
    
    await fileAPI.createFile(filepath, JSON.stringify(report, { type: FileType.TEMPORARY }));
    console.log(`\n📄 Report saved to: ${filepath}`);
  }
  
  private async loadWebAppConfigs(): void {
    const configFile = path.join(__dirname, '../config/web-apps.json');
    if (fs.existsSync(configFile)) {
      try {
        const data = JSON.parse(fileAPI.readFileSync(configFile, 'utf-8'));
        for (const app of data.apps || []) {
          this.webApps.set(app.appId, app);
        }
        console.log(`📋 Loaded ${data.apps?.length || 0} web app configurations`);
      } catch (error) {
        console.error('Failed to load web app configs:', error);
      }
    }
  }
  
  private async saveWebAppConfigs(): void {
    const configFile = path.join(__dirname, '../config/web-apps.json');
    const dir = path.dirname(configFile);
    
    if (!fs.existsSync(dir)) {
      await fileAPI.createDirectory(dir);
    }
    
    const data = {
      apps: Array.from(this.webApps.values()),
      timestamp: new Date().toISOString()
    };
    
    await fileAPI.createFile(configFile, JSON.stringify(data, { type: FileType.TEMPORARY }));
  }
}

// Export singleton
export const webAppDeploymentTester = WebAppDeploymentTester.getInstance();