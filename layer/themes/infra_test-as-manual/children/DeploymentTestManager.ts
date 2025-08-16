/**
 * DeploymentTestManager - Test Theme (Manual)
 * Manages testing across different deployment environments
 * Uses Security Theme for local port management
 */

import { TestPortManager } from './TestPortManager';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { https } from '../../infra_external-log-lib/src';
import { http } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


// Import from Security Theme for port management
import { 
  EnhancedPortManager, 
  DeployType 
} from '../../portal_security/pipe';

export interface DeploymentEnvironment {
  name: string;
  type: DeployType;
  domain: string;
  port?: number;
  protocol: 'http' | 'https';
  customHeaders?: Record<string, string>;
  authConfig?: {
    type: 'basic' | 'bearer' | 'apikey' | 'custom';
    credentials?: any;
  };
  healthCheckEndpoint?: string;
  timeout?: number;
}

export interface TestDeploymentConfig {
  environment: DeploymentEnvironment;
  testSuite: string;
  options?: {
    skipHealthCheck?: boolean;
    retryAttempts?: number;
    parallelTests?: boolean;
    recordVideo?: boolean;
    tracingEnabled?: boolean;
  };
}

/**
 * DeploymentTestManager - Part of Test Theme
 * Handles different deployment scenarios with Security Theme integration
 */
export class DeploymentTestManager {
  private static instance: DeploymentTestManager;
  // private testPortManager: TestPortManager; // Unused - keeping for future use
  private securityPortManager: EnhancedPortManager;
  private environments: Map<string, DeploymentEnvironment> = new Map();
  private activeTests: Map<string, TestDeploymentConfig> = new Map();
  
  // Predefined deployment environments
  private readonly defaultEnvironments: DeploymentEnvironment[] = [
    {
      name: 'local',
      type: 'local',
      domain: "localhost",
      protocol: 'http',
      healthCheckEndpoint: '/health'
    },
    {
      name: 'local-docker',
      type: 'local',
      domain: 'host.docker.internal',
      protocol: 'http',
      healthCheckEndpoint: '/health'
    },
    {
      name: 'dev',
      type: 'dev',
      domain: 'dev.aidev.local',
      protocol: 'http',
      healthCheckEndpoint: '/api/health'
    },
    {
      name: 'staging',
      type: 'demo',
      domain: 'staging.aidev.platform',
      protocol: 'https',
      healthCheckEndpoint: '/api/health',
      authConfig: {
        type: 'basic',
        credentials: { username: 'staging', password: process.env.STAGING_PASSWORD }
      }
    },
    {
      name: "production",
      type: "production",
      domain: 'app.aidev.platform',
      protocol: 'https',
      healthCheckEndpoint: '/api/health',
      authConfig: {
        type: 'bearer',
        credentials: { token: process.env.PROD_API_TOKEN }
      }
    }
  ];
  
  private constructor() {
    // Connect to Test Theme's TestPortManager
    // this.testPortManager = TestPortManager.getInstance(); // Unused - keeping for future use
    // Direct connection to Security Theme for local ports
    this.securityPortManager = EnhancedPortManager.getInstance();
    this.loadEnvironments();
    
    console.log('✅ Test Theme: DeploymentTestManager initialized');
  }
  
  static getInstance(): DeploymentTestManager {
    if (!DeploymentTestManager.instance) {
      DeploymentTestManager.instance = new DeploymentTestManager();
    }
    return DeploymentTestManager.instance;
  }
  
  /**
   * Register a deployment environment for testing
   */
  async registerEnvironment(env: DeploymentEnvironment): void {
    // For local environments, use Security Theme for port allocation
    if (!env.port && (env.domain === "localhost" || env.domain.includes('.local'))) {
      const result = this.securityPortManager.registerApp({
        appId: `test-env-${env.name}`,
        deployType: env.type
      });
      
      if (result.success && result.port) {
        env.port = result.port;
        console.log(`✅ Test Theme: Port ${result.port} allocated via Security Theme for environment: ${env.name}`);
      }
    }
    // For remote domains, use standard ports if not specified
    else if (!env.port) {
      env.port = env.protocol === 'https' ? 443 : 80;
    }
    
    this.environments.set(env.name, env);
    this.saveEnvironments();
    
    console.log(`✅ Test Theme: Registered environment: ${env.name} (${env.domain}:${env.port})`);
  }
  
  /**
   * Get deployment environment by name
   */
  async getEnvironment(name: string): DeploymentEnvironment | undefined {
    return this.environments.get(name);
  }
  
  /**
   * Create test configuration for specific deployment
   */
  async createTestConfig(options: {
    environmentName: string;
    testSuite: string;
    customDomain?: string;
    customPort?: number;
    testOptions?: TestDeploymentConfig['options'];
  }): Promise<TestDeploymentConfig> {
    const { environmentName, testSuite, customDomain, customPort, testOptions } = options;
    
    // Get base environment
    let environment = this.environments.get(environmentName);
    
    if (!environment) {
      // Create custom environment if not found
      environment = {
        name: environmentName,
        type: 'local' as DeployType,
        domain: customDomain || "localhost",
        port: customPort,
        protocol: 'http',
        healthCheckEndpoint: '/health'
      };
      
      this.registerEnvironment(environment);
    } else if (customDomain || customPort) {
      // Override with custom values
      environment = {
        ...environment,
        domain: customDomain || environment.domain,
        port: customPort || environment.port
      };
    }
    
    const config: TestDeploymentConfig = {
      environment,
      testSuite,
      options: testOptions
    };
    
    // Perform health check unless skipped
    if (!testOptions?.skipHealthCheck) {
      const isHealthy = await this.performHealthCheck(environment);
      if (!isHealthy) {
        console.warn(`⚠️ Test Theme: Health check failed for ${environment.name}`);
      }
    }
    
    // Store active test configuration
    const testId = `${testSuite}-${environment.name}-${Date.now()}`;
    this.activeTests.set(testId, config);
    
    return config;
  }
  
  /**
   * Perform health check on deployment environment
   */
  async performHealthCheck(env: DeploymentEnvironment): Promise<boolean> {
    const url = `${env.protocol}://${env.domain}${
      env.port && env.port !== 80 && env.port !== 443 ? `:${env.port}` : ''
    }${env.healthCheckEndpoint || '/'}`;
    
    return new Promise((resolve) => {
      const client = env.protocol === 'https' ? https : http;
      
      const options = {
        timeout: 5000,
        headers: {
          ...env.customHeaders,
          ...this.getAuthHeaders(env)
        }
      };
      
      client.get(url, options, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 204);
      }).on('error', () => {
        resolve(false);
      });
    });
  }
  
  /**
   * Create test runner for specific deployment
   */
  async createDeploymentTestRunner(config: TestDeploymentConfig): DeploymentTestRunner {
    return new DeploymentTestRunner(config, this);
  }
  
  /**
   * Compare environments for testing
   */
  async compareEnvironments(
    envNames: string[],
    testSuite: string
  ): Promise<ComparisonReport> {
    const results: EnvironmentTestResult[] = [];
    
    for (const envName of envNames) {
      const config = await this.createTestConfig({
        environmentName: envName,
        testSuite
      });
      
      const runner = this.createDeploymentTestRunner(config);
      const result = await runner.run();
      
      results.push({
        environment: envName,
        ...result
      });
    }
    
    return this.generateComparisonReport(results);
  }
  
  /**
   * Get authentication headers for environment
   */
  private async getAuthHeaders(env: DeploymentEnvironment): Record<string, string> {
    if (!env.authConfig) return {};
    
    switch (env.authConfig.type) {
      case 'basic':
        const { username, password } = env.authConfig.credentials || {};
        if (username && password) {
          const auth = Buffer.from(`${username}:${password}`).toString('base64');
          return { "Authorization": `Basic ${auth}` };
        }
        break;
        
      case 'bearer':
        const { token } = env.authConfig.credentials || {};
        if (token) {
          return { "Authorization": `Bearer ${token}` };
        }
        break;
        
      case 'apikey':
        const { key, value } = env.authConfig.credentials || {};
        if (key && value) {
          return { [key]: value };
        }
        break;
        
      case 'custom':
        return env.authConfig.credentials || {};
    }
    
    return {};
  }
  
  /**
   * Generate comparison report
   */
  private async generateComparisonReport(results: EnvironmentTestResult[]): ComparisonReport {
    const report: ComparisonReport = {
      timestamp: new Date().toISOString(),
      environments: results.map(r => r.environment),
      summary: {
        totalTests: results[0]?.totalTests || 0,
        results: {}
      },
      differences: [],
      recommendations: []
    };
    
    // Analyze results
    for (const result of results) {
      report.summary.results[result.environment] = {
        passed: result.passed,
        failed: result.failed,
        duration: result.duration
      };
    }
    
    // Find differences
    const baseline = results[0];
    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      if (current.failed !== baseline.failed) {
        report.differences.push({
          type: 'test_failure',
          baseline: baseline.environment,
          compared: current.environment,
          details: `Different failure count: ${baseline.failed} vs ${current.failed}`
        });
      }
    }
    
    // Generate recommendations
    if (report.differences.length > 0) {
      report.recommendations.push('Investigate environment-specific failures');
      report.recommendations.push('Check configuration differences between environments');
    }
    
    return report;
  }
  
  /**
   * Load saved environments
   */
  private async loadEnvironments(): void {
    // Load defaults
    for (const env of this.defaultEnvironments) {
      this.environments.set(env.name, env);
    }
    
    // Load custom environments from file
    const configFile = path.join(__dirname, '../config/deployment-environments.json');
    if (fs.existsSync(configFile)) {
      try {
        const data = JSON.parse(fileAPI.readFileSync(configFile, 'utf-8'));
        for (const env of data.environments || []) {
          this.environments.set(env.name, env);
        }
        console.log(`📋 Test Theme: Loaded ${data.environments?.length || 0} custom environments`);
      } catch (error) {
        console.error('Test Theme: Failed to load deployment environments:', error);
      }
    }
  }
  
  /**
   * Save environments to file
   */
  private async saveEnvironments(): void {
    const configFile = path.join(__dirname, '../config/deployment-environments.json');
    const dir = path.dirname(configFile);
    
    if (!fs.existsSync(dir)) {
      await fileAPI.createDirectory(dir);
    }
    
    const data = {
      environments: Array.from(this.environments.values()),
      timestamp: new Date().toISOString()
    };
    
    await fileAPI.createFile(configFile, JSON.stringify(data, { type: FileType.TEMPORARY }));
  }
  
  /**
   * Get all registered environments
   */
  async getAllEnvironments(): DeploymentEnvironment[] {
    return Array.from(this.environments.values());
  }
  
  /**
   * Clear active tests
   */
  async clearActiveTests(): void {
    this.activeTests.clear();
  }
}

/**
 * Deployment Test Runner
 */
export class DeploymentTestRunner {
  constructor(
    private config: TestDeploymentConfig,
    private manager: DeploymentTestManager
  ) {}
  
  async run(): Promise<TestRunResult> {
    const startTime = Date.now();
    console.log(`🚀 Test Theme: Running tests for ${this.config.environment.name}`);
    
    try {
      // Mock implementation - would use actual test runner
      const result: TestRunResult = {
        success: true,
        totalTests: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
        duration: Date.now() - startTime,
        environment: this.config.environment.name
      };
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: Date.now() - startTime,
        environment: this.config.environment.name,
        error: error.message
      };
    }
  }
}

// Type definitions
export interface TestRunResult {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  environment: string;
  error?: string;
}

export interface EnvironmentTestResult extends TestRunResult {
  environment: string;
}

export interface ComparisonReport {
  timestamp: string;
  environments: string[];
  summary: {
    totalTests: number;
    results: Record<string, {
      passed: number;
      failed: number;
      duration: number;
    }>;
  };
  differences: Array<{
    type: string;
    baseline: string;
    compared: string;
    details: string;
  }>;
  recommendations: string[];
}

// Export singleton
export const deploymentTestManager = DeploymentTestManager.getInstance();