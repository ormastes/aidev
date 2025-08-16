/**
 * TestPortManager - Test Theme (Manual)
 * Manages port allocation for all web system tests by connecting to Security Theme
 * This is part of the test theme, not the security theme
 */

import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


// Import from Security Theme's public API (pipe)
import { 
  EnhancedPortManager, 
  DeployType 
} from '../../portal_security/pipe';

// Import credential provider for auto-setup
import { TestCredentialProvider } from './TestCredentialProvider';

/**
 * TestPortManager - Part of Test Theme
 * Uses Security Theme's EnhancedPortManager for secure port allocation
 */
export class TestPortManager {
  private static instance: TestPortManager;
  private securityPortManager: EnhancedPortManager;
  private testRegistrations: Map<string, TestPortAllocation> = new Map();
  private testConfigFile: string;
  private static environmentSetup = false;
  
  // Test-specific port ranges (within security boundaries)
  private testPortRanges = {
    unit: { start: 90, end: 94 },      // e.g., 3490-3494 in release
    integration: { start: 95, end: 97 }, // e.g., 3495-3497 in release
    e2e: { start: 98, end: 99 }         // e.g., 3498-3499 in release
  };
  
  private constructor() {
    // Connect to Security Theme's EnhancedPortManager
    this.securityPortManager = EnhancedPortManager.getInstance();
    this.testConfigFile = path.join(__dirname, '../config/test-ports.json');
    this.loadTestConfiguration();
    
    // Auto-setup environment on first import
    this.setupTestEnvironment();
    
    // Auto-initialize credentials
    TestCredentialProvider.getInstance();
    
    console.log('✅ Test Theme: TestPortManager connected to Security Theme');
    console.log('🔐 Test Theme: Credentials configured');
  }
  
  static getInstance(): TestPortManager {
    if (!TestPortManager.instance) {
      TestPortManager.instance = new TestPortManager();
    }
    return TestPortManager.instance;
  }
  
  /**
   * Register a test suite and get allocated port through Security Theme
   * Also sets up process.env automatically
   */
  async registerTestSuite(options: {
    suiteName: string;
    testType: 'unit' | 'integration' | 'e2e';
    deployType?: DeployType;
    framework?: 'playwright' | 'jest' | 'mocha' | 'cypress';
  }): Promise<TestPortAllocation> {
    const { suiteName, testType, deployType = 'release', framework = 'playwright' } = options;
    
    // Generate unique test app ID
    const testAppId = `test-${testType}-${suiteName}`.toLowerCase().replace(/\s+/g, '-');
    
    // Calculate port based on test type and deploy type
    const portRange = this.testPortRanges[testType];
    const existingCount = Array.from(this.testRegistrations.values())
      .filter(reg => reg.testType === testType && reg.deployType === deployType).length;
    
    const portSuffix = portRange.start + (existingCount % (portRange.end - portRange.start + 1));
    const requestedPort = this.calculatePort(deployType, portSuffix);
    
    // Register with Security Theme's EnhancedPortManager
    const result = this.securityPortManager.registerApp({
      appId: testAppId,
      deployType,
      requestedPort
    });
    
    if (!result.success || !result.port) {
      throw new Error(`Failed to allocate test port through Security Theme: ${result.message}`);
    }
    
    // Create test allocation record with domain from test-as-manual
    const allocation: TestPortAllocation = {
      suiteName,
      testType,
      deployType,
      framework,
      port: result.port,
      baseUrl: this.buildTestUrl(result.port),
      appId: testAppId,
      createdAt: new Date(),
      status: 'allocated',
      securityRegistered: true
    };
    
    // Store allocation
    this.testRegistrations.set(testAppId, allocation);
    this.saveTestConfiguration();
    
    // Auto-setup environment variables for this test
    process.env.PORT = result.port.toString();
    process.env.TEST_PORT = result.port.toString();
    process.env.TEST_BASE_URL = allocation.baseUrl;
    process.env.TEST_APP_ID = testAppId;
    
    console.log(`✅ Test Theme: Port ${result.port} allocated via Security Theme for: ${suiteName} (${testType})`);
    console.log(`   Environment auto-configured: PORT=${result.port}, BASE_URL=${allocation.baseUrl}`);
    
    return allocation;
  }
  
  /**
   * Validate that a test is using Security Theme approved ports
   */
  async validateTestPort(port: number, testAppId: string): boolean {
    const allocation = this.testRegistrations.get(testAppId);
    
    if (!allocation) {
      console.error(`❌ Test '${testAppId}' not registered with TestPortManager`);
      return false;
    }
    
    if (!allocation.securityRegistered) {
      console.error(`❌ Test '${testAppId}' not registered with Security Theme`);
      return false;
    }
    
    if (allocation.port !== port) {
      console.error(`❌ Test '${testAppId}' using unauthorized port ${port} (should be ${allocation.port})`);
      return false;
    }
    
    // Verify with Security Theme
    const securityRegistrations = this.securityPortManager.getAllRegistrations();
    const securityReg = securityRegistrations.find(r => r.appId === testAppId && r.assignedPort === port);
    
    if (!securityReg) {
      console.error(`❌ Port ${port} not registered with Security Theme`);
      return false;
    }
    
    console.log(`✅ Port ${port} validated with Security Theme`);
    return true;
  }
  
  /**
   * Release test port
   */
  async releaseTestPort(testAppId: string): void {
    const allocation = this.testRegistrations.get(testAppId);
    
    if (allocation) {
      allocation.status = 'released';
      this.saveTestConfiguration();
      console.log(`🔓 Test Theme: Released port ${allocation.port} for ${allocation.suiteName}`);
    }
  }
  
  /**
   * Get all active test allocations
   */
  async getActiveAllocations(): TestPortAllocation[] {
    return Array.from(this.testRegistrations.values())
      .filter(alloc => alloc.status === 'allocated');
  }
  
  /**
   * Clean up stale test allocations
   */
  async cleanupStaleAllocations(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    
    for (const [appId, allocation] of this.testRegistrations.entries()) {
      const age = now.getTime() - allocation.createdAt.getTime();
      
      if (age > maxAge && allocation.status === 'allocated') {
        this.releaseTestPort(appId);
        this.testRegistrations.delete(appId);
      }
    }
    
    this.saveTestConfiguration();
    console.log(`🧹 Test Theme: Cleaned up stale allocations older than ${maxAgeHours} hours`);
  }
  
  /**
   * Setup test environment automatically on import
   * This ensures all process.env access goes through test-as-manual
   */
  private async setupTestEnvironment(): void {
    if (TestPortManager.environmentSetup) {
      return;
    }
    
    // Override process.env with controlled values
    const testDomain = this.getTestDomain();
    const testProtocol = this.getTestProtocol();
    
    // Set default test environment variables
    process.env.TEST_DOMAIN = testDomain;
    process.env.TEST_PROTOCOL = testProtocol;
    process.env.SECURITY_MODULE = 'portal_security';
    process.env.TEST_THEME = 'infra_test-as-manual';
    process.env.PORT_MANAGED_BY_SECURITY = 'true';
    
    // Intercept PORT and TEST_PORT access
    if (!process.env.PORT) {
      // Will be set dynamically when test allocates
      process.env.PORT = '';
    }
    
    // Mark as setup and log
    TestPortManager.environmentSetup = true;
    console.log('🔐 Test Environment Auto-Setup:');
    console.log(`   Domain: ${testDomain} (from test-as-manual)`);
    console.log(`   Protocol: ${testProtocol}`);
    console.log(`   Theme: infra_test-as-manual`);
    console.log(`   Port Management: Controlled by security module`);
    console.log(`   Credentials: Managed by test-as-manual`);
  }
  
  /**
   * Get test domain (without protocol or port)
   */
  async getTestDomain(): string {
    // All test domains come from test-as-manual theme
    // This ensures no hardcoded localhost in tests
    return 'localhost';
  }
  
  /**
   * Get test protocol
   */
  async getTestProtocol(): string {
    return 'http';
  }
  
  /**
   * Build test URL from components
   */
  async buildTestUrl(port: number): string {
    return `${this.getTestProtocol()}://${this.getTestDomain()}:${port}`;
  }
  
  /**
   * Get test environment variables
   */
  async getTestEnvironment(testAppId: string): NodeJS.ProcessEnv {
    const allocation = this.testRegistrations.get(testAppId);
    
    if (!allocation) {
      throw new Error(`Test '${testAppId}' not registered`);
    }
    
    return {
      ...process.env,
      TEST_PORT: allocation.port.toString(),
      TEST_BASE_URL: allocation.baseUrl,
      TEST_APP_ID: testAppId,
      TEST_TYPE: allocation.testType,
      TEST_DEPLOY_TYPE: allocation.deployType,
      SECURITY_ENFORCED: 'true',
      TEST_THEME: 'infra_test-as-manual'
    };
  }
  
  /**
   * Get Security Theme connection status
   */
  async getSecurityStatus(): {
    connected: boolean;
    registrations: number;
    testPorts: number[];
  } {
    try {
      const registrations = this.securityPortManager.getAllRegistrations();
      const testPorts = registrations
        .filter(r => r.appId.startsWith('test-'))
        .map(r => r.assignedPort || 0)
        .filter(p => p > 0);
      
      return {
        connected: true,
        registrations: registrations.length,
        testPorts
      };
    } catch (error) {
      return {
        connected: false,
        registrations: 0,
        testPorts: []
      };
    }
  }
  
  private async calculatePort(deployType: DeployType, suffix: number): number {
    const prefixMap: Record<DeployType, number> = {
      local: 31,
      dev: 32,
      demo: 33,
      release: 34,
      production: 35
    };
    
    return prefixMap[deployType] * 100 + suffix;
  }
  
  private async saveTestConfiguration(): void {
    const config = {
      registrations: Array.from(this.testRegistrations.entries()),
      timestamp: new Date().toISOString()
    };
    
    const dir = path.dirname(this.testConfigFile);
    if (!fs.existsSync(dir)) {
      await fileAPI.createDirectory(dir);
    }
    
    await fileAPI.createFile(this.testConfigFile, JSON.stringify(config, { type: FileType.TEMPORARY }));
  }
  
  private async loadTestConfiguration(): void {
    if (fs.existsSync(this.testConfigFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(this.testConfigFile, 'utf-8'));
        
        if (config.registrations) {
          const registrations = config.registrations.map(([key, value]: [string, any]) => {
            value.createdAt = new Date(value.createdAt);
            return [key, value];
          });
          
          this.testRegistrations = new Map(registrations);
        }
        
        console.log(`📋 Test Theme: Loaded ${this.testRegistrations.size} test port allocations`);
      } catch (err) {
        console.error('Test Theme: Failed to load test configuration:', err);
      }
    }
  }
}

/**
 * Test port allocation record
 */
export interface TestPortAllocation {
  suiteName: string;
  testType: 'unit' | 'integration' | 'e2e';
  deployType: DeployType;
  framework: 'playwright' | 'jest' | 'mocha' | 'cypress';
  port: number;
  baseUrl: string;
  appId: string;
  createdAt: Date;
  status: 'allocated' | 'released';
  securityRegistered: boolean;
}

// Auto-initialize on import to setup environment
const initializeTestEnvironment = () => {
  // This runs immediately when module is imported
  const instance = TestPortManager.getInstance();
  console.log('🚀 Test-as-Manual Theme Initialized - Environment Configured');
  return instance;
};

// Export singleton instance (auto-initializes)
export const testPortManager = initializeTestEnvironment();