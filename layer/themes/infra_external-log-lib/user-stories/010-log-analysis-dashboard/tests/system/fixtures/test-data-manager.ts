import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { LogEntry, DashboardConfig } from '../../../src/domain/interfaces';

/**
 * Manages test data for system tests
 * Provides realistic data fixtures and cleanup
 */
export class TestDataManager {
  private readonly testDataDir = join(process.cwd(), 'tests/system/fixtures/data');
  
  async setupTestData(): Promise<void> {
    console.log('📋 Setting up test data...');
    
    // Create test data directory
    await mkdir(this.testDataDir, { recursive: true });
    
    // Generate test log entries
    const testLogs = this.generateTestLogs();
    await this.saveTestLogs(testLogs);
    
    // Create test dashboard configurations
    const dashboardConfigs = this.generateDashboardConfigs();
    await this.saveDashboardConfigs(dashboardConfigs);
    
    // Create test authentication data
    await this.setupAuthenticationData();
  }
  
  async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...');
    
    try {
      await rm(this.testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Test data cleanup warning:', error);
    }
  }
  
  private generateTestLogs(): LogEntry[] {
    const levels = ['error', 'warn', 'info', 'debug'];
    const sources = ['api-server', 'database', 'auth-service', 'ui-components'];
    const logs: LogEntry[] = [];
    
    // Generate 1000 test log entries
    for (let i = 0; i < 1000; i++) {
      logs.push({
        id: `test-log-${i}`,
        timestamp: new Date(Date.now() - (i * 60000)).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)] as any,
        source: sources[Math.floor(Math.random() * sources.length)],
        message: `Test log message ${i}: ${this.generateRandomMessage()}`,
        metadata: {
          userId: `user-${Math.floor(Math.random() * 100)}`,
          requestId: `req-${Math.floor(Math.random() * 10000)}`,
          component: sources[Math.floor(Math.random() * sources.length)]
        }
      });
    }
    
    return logs;
  }
  
  private generateRandomMessage(): string {
    const messages = [
      'Database connection established',
      'User authentication successful',
      'API request processed',
      'Cache miss occurred',
      'Background task completed',
      'Validation failed for input',
      'External service call timeout',
      'Memory usage threshold exceeded'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  private generateDashboardConfigs(): DashboardConfig[] {
    return [
      {
        id: 'test-config-1',
        name: 'Test Production Dashboard',
        filters: {
          levels: ['error', 'warn'],
          sources: ['api-server', 'database'],
          timeRange: { start: new Date(Date.now() - 86400000), end: new Date() }
        },
        refreshInterval: 5000,
        maxEntries: 1000
      },
      {
        id: 'test-config-2',
        name: 'Test Debug Dashboard',
        filters: {
          levels: ['debug', 'info'],
          sources: ['ui-components'],
          timeRange: { start: new Date(Date.now() - 3600000), end: new Date() }
        },
        refreshInterval: 2000,
        maxEntries: 500
      }
    ];
  }
  
  private async saveTestLogs(logs: LogEntry[]): Promise<void> {
    const filePath = join(this.testDataDir, 'test-logs.json');
    await writeFile(filePath, JSON.stringify(logs, null, 2));
  }
  
  private async saveDashboardConfigs(configs: DashboardConfig[]): Promise<void> {
    const filePath = join(this.testDataDir, 'dashboard-configs.json');
    await writeFile(filePath, JSON.stringify(configs, null, 2));
  }
  
  private async setupAuthenticationData(): Promise<void> {
    const authData = {
      validUsers: [
        { username: 'test-admin', password: 'test-password-123', role: 'admin' },
        { username: 'test-user', password: 'test-password-456', role: 'user' },
        { username: 'test-viewer', password: 'test-password-789', role: 'viewer' }
      ],
      sessions: [],
      apiKeys: [
        { key: 'test-api-key-123', permissions: ['read', 'write'] },
        { key: 'test-api-key-456', permissions: ['read'] }
      ]
    };
    
    const filePath = join(this.testDataDir, 'auth-data.json');
    await writeFile(filePath, JSON.stringify(authData, null, 2));
  }
  
  async getTestLogs(): Promise<LogEntry[]> {
    const filePath = join(this.testDataDir, 'test-logs.json');
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  }
  
  async getDashboardConfigs(): Promise<DashboardConfig[]> {
    const filePath = join(this.testDataDir, 'dashboard-configs.json');
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  }
}
