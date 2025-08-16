/**
 * PlaywrightIntegration - Test Theme (Manual)
 * Provides Playwright test integration with Security Theme port management
 */

import { TestPortManager } from './TestPortManager';
import { DeploymentTestManager } from './DeploymentTestManager';
import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


// Import from Security Theme for port validation
import { 
  EnhancedPortManager, 
  DeployType 
} from '../../portal_security/pipe';

/**
 * Main PlaywrightIntegration class
 */
export class PlaywrightIntegration {
  private static instance: PlaywrightIntegration;
  private browser: any;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  static getInstance(): PlaywrightIntegration {
    if (!PlaywrightIntegration.instance) {
      PlaywrightIntegration.instance = new PlaywrightIntegration();
    }
    return PlaywrightIntegration.instance;
  }
  
  async launchBrowser(options: any = {}): Promise<any> {
    // Mock implementation - would use actual Playwright
    const { chromium } = await this.getPlaywright();
    this.browser = await chromium.launch(options);
    return this.browser;
  }
  
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
  
  private async getPlaywright(): Promise<any> {
    try {
      return require("playwright");
    } catch {
      // Return mock if playwright not available
      return {
        chromium: {
          launch: async () => ({
            newPage: async () => ({
              goto: async () => {},
              waitForSelector: async () => {},
              click: async () => {},
              fill: async () => {},
              close: async () => {}
            }),
            close: async () => {}
          })
        }
      };
    }
  }
}

/**
 * Playwright Security Configuration Generator
 * Part of Test Theme - uses Security Theme for port management
 */
export class PlaywrightSecurityConfig {
  private testManager: TestPortManager;
  private deploymentManager: DeploymentTestManager;
  private securityPortManager: EnhancedPortManager;
  
  constructor() {
    this.testManager = TestPortManager.getInstance();
    this.deploymentManager = DeploymentTestManager.getInstance();
    this.securityPortManager = EnhancedPortManager.getInstance();
    
    console.log('✅ Test Theme: PlaywrightSecurityConfig initialized');
  }
  
  /**
   * Generate secure Playwright configuration
   */
  async generateConfig(options: {
    projectName: string;
    testDir?: string;
    deployType?: DeployType;
    serverCommand?: string;
    environment?: string;
  }): Promise<any> {
    const { 
      projectName, 
      testDir = './test', 
      deployType = 'release',
      serverCommand,
      environment = 'local'
    } = options;
    
    let port: number | undefined;
    let baseURL: string;
    
    // For local environments, use Security Theme port allocation
    if (environment === 'local' || environment === 'local-docker') {
      // Register main app with Security Theme
      const appResult = this.securityPortManager.registerApp({
        appId: projectName,
        deployType
      });
      
      if (!appResult.success || !appResult.port) {
        throw new Error(`Test Theme: Failed to register app with Security Theme: ${appResult.message}`);
      }
      
      port = appResult.port;
      baseURL = `http://localhost:${port}`;
      
      console.log(`✅ Test Theme: Using Security Theme port ${port} for ${projectName}`);
    } else {
      // For remote environments, use deployment configuration
      const deploymentConfig = await this.deploymentManager.createTestConfig({
        environmentName: environment,
        testSuite: `${projectName}-tests`
      });
      
      const env = deploymentConfig.environment;
      baseURL = `${env.protocol}://${env.domain}${
        env.port && env.port !== 80 && env.port !== 443 ? `:${env.port}` : ''
      }`;
      port = env.port;
      
      console.log(`✅ Test Theme: Using deployment environment ${environment}: ${baseURL}`);
    }
    
    // Generate configuration
    const config = {
      testDir,
      fullyParallel: false, // Sequential to prevent port conflicts
      forbidOnly: !!process.env.CI,
      retries: process.env.CI ? 2 : 0,
      workers: 1, // Single worker for port security
      reporter: [
        ['html', { outputFolder: 'test-results/html' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['list']
      ],
      use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        extraHTTPHeaders: {
          'X-Test-Suite': projectName,
          'X-Test-Environment': environment,
          'X-Security-Enforced': 'true',
          'X-Test-Theme': 'infra_test-as-manual'
        }
      },
      projects: [
        {
          name: "chromium",
          use: { 
            channel: 'chrome'
          }
        }
      ],
      // Only include webServer for local environments
      ...(environment === 'local' || environment === 'local-docker' ? {
        webServer: {
          command: serverCommand || `PORT=${port} npm run start`,
          port,
          reuseExistingServer: !process.env.CI,
          timeout: 30000,
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            ...process.env,
            PORT: port?.toString(),
            NODE_ENV: 'test',
            DEPLOY_TYPE: deployType,
            SECURITY_ENFORCED: 'true',
            TEST_APP_ID: projectName,
            TEST_THEME: 'infra_test-as-manual'
          }
        }
      } : {}),
      globalSetup: this.createGlobalSetup(projectName, port),
      globalTeardown: this.createGlobalTeardown(projectName)
    };
    
    return config;
  }
  
  /**
   * Validate existing Playwright configuration
   */
  async validateConfig(configPath: string): ValidationResult {
    try {
      const config = require(configPath);
      const issues: string[] = [];
      const warnings: string[] = [];
      
      // Check if webServer port is hardcoded
      if (config.webServer?.port && typeof config.webServer.port === 'number') {
        const port = config.webServer.port;
        
        // Check if port is in Security Theme approved ranges
        const validPrefixes = [31, 32, 33, 34, 35];
        const prefix = Math.floor(port / 100);
        
        if (!validPrefixes.includes(prefix)) {
          issues.push(`Port ${port} is outside Security Theme approved ranges`);
        } else {
          warnings.push(`Port ${port} should be allocated via Test Theme's TestPortManager`);
        }
      }
      
      // Check for Test Theme integration
      const testFiles = this.findTestFiles(config.testDir || './test');
      for (const file of testFiles) {
        const content = fileAPI.readFileSync(file, 'utf-8');
        
        if (content.includes('localhost:') && !content.includes("TestPortManager")) {
          warnings.push(`Test file ${file} uses hardcoded localhost port without Test Theme`);
        }
      }
      
      // Check workers configuration
      if (config.workers && config.workers > 1) {
        warnings.push('Multiple workers may cause port conflicts. Consider using workers: 1');
      }
      
      return {
        valid: issues.length === 0,
        issues,
        warnings,
        recommendation: issues.length > 0 
          ? 'Configuration has security issues that must be fixed'
          : warnings.length > 0 
            ? 'Configuration works but should use Test Theme'
            : 'Configuration follows Test Theme best practices'
      };
      
    } catch (error) {
      return {
        valid: false,
        issues: [`Failed to load config: ${error.message}`],
        warnings: [],
        recommendation: 'Fix configuration file errors'
      };
    }
  }
  
  /**
   * Create global setup with Test Theme validation
   */
  private async createGlobalSetup(projectName: string, port?: number): string {
    const setupContent = `
// Auto-generated by Test Theme
import { TestPortManager } from '${path.relative(process.cwd(), __dirname)}/TestPortManager';

export default async function globalSetup() {
  console.log('🔐 Test Theme: Global Setup for ${projectName}');
  
  // Verify Test Theme connection to Security Theme
  const testManager = TestPortManager.getInstance();
  const status = testManager.getSecurityStatus();
  
  if (!status.connected) {
    throw new Error('Test Theme: Not connected to Security Theme');
  }
  
  console.log('✅ Test Theme: Connected to Security Theme');
  console.log('   Registrations: ' + status.registrations);
  console.log('   Test Ports: ' + status.testPorts.join(', '));
  
  // Clean up stale allocations
  testManager.cleanupStaleAllocations(1);
  
  return async () => {
    console.log('🧹 Test Theme: Cleaning up test environment');
  };
}
`;
    
    const setupPath = path.join(process.cwd(), 'test', 'global-setup.ts');
    const dir = path.dirname(setupPath);
    
    if (!fs.existsSync(dir)) {
      await fileAPI.createDirectory(dir);
    }
    
    await fileAPI.createFile(setupPath, setupContent, { type: FileType.TEMPORARY });
    return setupPath;
  }
  
  /**
   * Create global teardown
   */
  private async createGlobalTeardown(projectName: string): string {
    const teardownContent = `
// Auto-generated by Test Theme
import { TestPortManager } from '${path.relative(process.cwd(), __dirname)}/TestPortManager';

export default async function globalTeardown() {
  console.log('🔓 Test Theme: Global Teardown for ${projectName}');
  
  // Release all test ports
  const testManager = TestPortManager.getInstance();
  const allocations = testManager.getActiveAllocations();
  
  for (const allocation of allocations) {
    if (allocation.suiteName.includes('${projectName}')) {
      testManager.releaseTestPort(allocation.appId);
    }
  }
  
  console.log('✅ Test Theme: All test ports released');
}
`;
    
    const teardownPath = path.join(process.cwd(), 'test', 'global-teardown.ts');
    await fileAPI.createFile(teardownPath, teardownContent, { type: FileType.TEMPORARY });
    return teardownPath;
  }
  
  private async findTestFiles(testDir: string): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(testDir)) return files;
    
    const entries = fs.readdirSync(testDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(testDir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...this.findTestFiles(fullPath));
      } else if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}

/**
 * Helper functions for test writing
 */
export const testHelpers = {
  /**
   * Create test suite with Security Theme port allocation
   */
  async createTestSuite(options: {
    name: string;
    type?: 'unit' | "integration" | 'e2e';
    deployType?: DeployType;
  }) {
    const testManager = TestPortManager.getInstance();
    
    const allocation = await testManager.registerTestSuite({
      suiteName: options.name,
      testType: options.type || 'e2e',
      deployType: options.deployType || 'release'
    });
    
    console.log(`✅ Test Theme: Test suite '${options.name}' allocated port ${allocation.port}`);
    
    return {
      port: allocation.port,
      baseUrl: allocation.baseUrl,
      cleanup: () => testManager.releaseTestPort(allocation.appId)
    };
  },
  
  /**
   * Validate test is using Security Theme approved port
   */
  async validatePort(port: number, testId: string): boolean {
    const testManager = TestPortManager.getInstance();
    return testManager.validateTestPort(port, testId);
  }
};

interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  recommendation: string;
}

// Export singleton instance
export const playwrightSecurity = new PlaywrightSecurityConfig();