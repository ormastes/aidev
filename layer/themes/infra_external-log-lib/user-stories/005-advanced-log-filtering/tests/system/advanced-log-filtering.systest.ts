import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

interface FilterRule {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'greater' | 'less' | 'between';
  value: any;
  negate?: boolean;
}

class AdvancedLogFilter {
  private rules: FilterRule[] = [];

  addRule(rule: FilterRule): void {
    this.rules.push(rule);
  }

  clearRules(): void {
    this.rules = [];
  }

  filter(logs: LogEntry[]): LogEntry[] {
    return logs.filter(log => this.matchesAllRules(log));
  }

  private matchesAllRules(log: LogEntry): boolean {
    return this.rules.every(rule => this.matchesRule(log, rule));
  }

  private matchesRule(log: LogEntry, rule: FilterRule): boolean {
    let matches = false;
    const value = this.getFieldValue(log, rule.field);

    switch (rule.operator) {
      case 'equals':
        matches = value === rule.value;
        break;
      case 'contains':
        matches = String(value).includes(String(rule.value));
        break;
      case 'startsWith':
        matches = String(value).startsWith(String(rule.value));
        break;
      case 'endsWith':
        matches = String(value).endsWith(String(rule.value));
        break;
      case 'regex':
        matches = new RegExp(rule.value).test(String(value));
        break;
      case 'greater':
        matches = Number(value) > Number(rule.value);
        break;
      case 'less':
        matches = Number(value) < Number(rule.value);
        break;
      case 'between':
        const [min, max] = rule.value;
        matches = Number(value) >= Number(min) && Number(value) <= Number(max);
        break;
    }

    return rule.negate ? !matches : matches;
  }

  private getFieldValue(log: LogEntry, field: string): any {
    if (field.startsWith('metadata.')) {
      const metadataField = field.substring(9);
      return log.metadata?.[metadataField];
    }
    return (log as any)[field];
  }
}

test.describe('Advanced Log Filtering System Tests', () => {
  let tempDir: string;
  let filter: AdvancedLogFilter;
  let testLogs: LogEntry[];

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `filter-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    filter = new AdvancedLogFilter();

    // Generate comprehensive test dataset
    testLogs = [
      {
        timestamp: '2025-08-28T10:00:00Z',
        level: 'INFO',
        message: 'User login successful',
        source: 'auth-service',
        metadata: { userId: 1001, duration: 150, success: true }
      },
      {
        timestamp: '2025-08-28T10:01:00Z',
        level: 'ERROR',
        message: 'Database connection failed',
        source: 'db-service',
        metadata: { retries: 3, duration: 5000, error_code: 'CONN_TIMEOUT' }
      },
      {
        timestamp: '2025-08-28T10:02:00Z',
        level: 'WARN',
        message: 'High memory usage detected',
        source: 'monitoring-service',
        metadata: { memory_percent: 85, threshold: 80, action: 'alert' }
      },
      {
        timestamp: '2025-08-28T10:03:00Z',
        level: 'INFO',
        message: 'API request processed',
        source: 'api-gateway',
        metadata: { endpoint: '/users', method: 'GET', status_code: 200, duration: 45 }
      },
      {
        timestamp: '2025-08-28T10:04:00Z',
        level: 'DEBUG',
        message: 'Cache hit for user profile',
        source: 'cache-service',
        metadata: { key: 'user:1001', hit_rate: 0.95, size_mb: 2.3 }
      },
      {
        timestamp: '2025-08-28T10:05:00Z',
        level: 'ERROR',
        message: 'Payment processing failed',
        source: 'payment-service',
        metadata: { amount: 99.99, currency: 'USD', error_code: 'CARD_DECLINED' }
      },
      {
        timestamp: '2025-08-28T10:06:00Z',
        level: 'INFO',
        message: 'Email notification sent',
        source: 'notification-service',
        metadata: { template: 'welcome', recipient_count: 1, delivery_time: 200 }
      }
    ];
  });

  test.afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should filter logs by exact field matches', async () => {
    filter.addRule({ field: 'level', operator: 'equals', value: 'ERROR' });
    
    const filtered = filter.filter(testLogs);
    
    expect(filtered).toHaveLength(2);
    expect(filtered.every(log => log.level === 'ERROR')).toBe(true);
    expect(filtered[0].message).toBe('Database connection failed');
    expect(filtered[1].message).toBe('Payment processing failed');
  });

  test('should filter logs by message content', async () => {
    filter.addRule({ field: 'message', operator: 'contains', value: 'failed' });
    
    const filtered = filter.filter(testLogs);
    
    expect(filtered).toHaveLength(2);
    expect(filtered.every(log => log.message.includes('failed'))).toBe(true);
  });

  test('should filter logs using regex patterns', async () => {
    filter.addRule({ field: 'source', operator: 'regex', value: '.*-service$' });
    
    const filtered = filter.filter(testLogs);
    
    expect(filtered).toHaveLength(7); // All test logs end with -service
    expect(filtered.every(log => log.source.endsWith('-service'))).toBe(true);
  });

  test('should filter logs by metadata fields', async () => {
    filter.addRule({ field: 'metadata.duration', operator: 'greater', value: 100 });
    
    const filtered = filter.filter(testLogs);
    
    expect(filtered).toHaveLength(4);
    filtered.forEach(log => {
      expect(log.metadata?.duration).toBeGreaterThan(100);
    });
  });

  test('should filter logs using range operators', async () => {
    filter.addRule({ field: 'metadata.duration', operator: 'between', value: [100, 1000] });
    
    const filtered = filter.filter(testLogs);
    
    expect(filtered).toHaveLength(3);
    filtered.forEach(log => {
      expect(log.metadata?.duration).toBeGreaterThanOrEqual(100);
      expect(log.metadata?.duration).toBeLessThanOrEqual(1000);
    });
  });

  test('should support negated filter rules', async () => {
    filter.addRule({ field: 'level', operator: 'equals', value: 'INFO', negate: true });
    
    const filtered = filter.filter(testLogs);
    
    expect(filtered).toHaveLength(4); // All non-INFO logs
    expect(filtered.every(log => log.level !== 'INFO')).toBe(true);
  });

  test('should combine multiple filter rules with AND logic', async () => {
    filter.addRule({ field: 'level', operator: 'equals', value: 'ERROR' });
    filter.addRule({ field: 'source', operator: 'contains', value: 'service' });
    filter.addRule({ field: 'metadata.duration', operator: 'greater', value: 1000 });
    
    const filtered = filter.filter(testLogs);
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].message).toBe('Database connection failed');
    expect(filtered[0].level).toBe('ERROR');
    expect(filtered[0].metadata?.duration).toBe(5000);
  });

  test('should filter logs by timestamp ranges', async () => {
    filter.addRule({
      field: 'timestamp',
      operator: 'between',
      value: ['2025-08-28T10:01:00Z', '2025-08-28T10:04:00Z']
    });
    
    const filtered = filter.filter(testLogs);
    
    expect(filtered).toHaveLength(3);
    filtered.forEach(log => {
      expect(log.timestamp >= '2025-08-28T10:01:00Z').toBe(true);
      expect(log.timestamp <= '2025-08-28T10:04:00Z').toBe(true);
    });
  });

  test('should handle complex metadata filtering', async () => {
    // Filter for logs with successful operations (status_code 200 or success: true)
    filter.addRule({ field: 'metadata.status_code', operator: 'equals', value: 200 });
    
    const successfulRequests = filter.filter(testLogs);
    expect(successfulRequests).toHaveLength(1);
    
    filter.clearRules();
    filter.addRule({ field: 'metadata.success', operator: 'equals', value: true });
    
    const successfulOperations = filter.filter(testLogs);
    expect(successfulOperations).toHaveLength(1);
  });

  test('should filter logs with string pattern matching', async () => {
    filter.addRule({ field: 'message', operator: 'startsWith', value: 'User' });
    
    const userLogs = filter.filter(testLogs);
    expect(userLogs).toHaveLength(1);
    expect(userLogs[0].message).toBe('User login successful');
    
    filter.clearRules();
    filter.addRule({ field: 'source', operator: 'endsWith', value: 'gateway' });
    
    const gatewayLogs = filter.filter(testLogs);
    expect(gatewayLogs).toHaveLength(1);
    expect(gatewayLogs[0].source).toBe('api-gateway');
  });

  test('should handle large datasets efficiently', async () => {
    // Generate a large dataset
    const largeLogs: LogEntry[] = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 10000; i++) {
      largeLogs.push({
        timestamp: new Date(startTime + i * 1000).toISOString(),
        level: ['INFO', 'WARN', 'ERROR', 'DEBUG'][i % 4],
        message: `Log message ${i}`,
        source: `service-${i % 10}`,
        metadata: {
          id: i,
          duration: Math.floor(Math.random() * 1000),
          success: i % 3 === 0
        }
      });
    }
    
    // Apply complex filter
    const filterStart = Date.now();
    filter.addRule({ field: 'level', operator: 'equals', value: 'ERROR' });
    filter.addRule({ field: 'metadata.duration', operator: 'greater', value: 500 });
    
    const filtered = filter.filter(largeLogs);
    const filterEnd = Date.now();
    
    const filterTime = filterEnd - filterStart;
    expect(filterTime).toBeLessThan(1000); // Should filter 10k logs in under 1 second
    
    // Verify filtering accuracy
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach(log => {
      expect(log.level).toBe('ERROR');
      expect(log.metadata?.duration).toBeGreaterThan(500);
    });
  });

  test('should support dynamic filter rule updates during streaming', async () => {
    let currentFilter = new AdvancedLogFilter();
    const filteredResults: LogEntry[][] = [];
    
    // Simulate streaming logs with changing filter rules
    const streamingLogs = [...testLogs];
    
    // Initial filter: INFO level logs
    currentFilter.addRule({ field: 'level', operator: 'equals', value: 'INFO' });
    filteredResults.push(currentFilter.filter(streamingLogs));
    
    // Update filter: ERROR level logs
    currentFilter.clearRules();
    currentFilter.addRule({ field: 'level', operator: 'equals', value: 'ERROR' });
    filteredResults.push(currentFilter.filter(streamingLogs));
    
    // Update filter: High duration operations
    currentFilter.clearRules();
    currentFilter.addRule({ field: 'metadata.duration', operator: 'greater', value: 1000 });
    filteredResults.push(currentFilter.filter(streamingLogs));
    
    // Verify filter updates worked
    expect(filteredResults[0]).toHaveLength(3); // INFO logs
    expect(filteredResults[1]).toHaveLength(2); // ERROR logs
    expect(filteredResults[2]).toHaveLength(1); // High duration logs
    
    expect(filteredResults[0].every(log => log.level === 'INFO')).toBe(true);
    expect(filteredResults[1].every(log => log.level === 'ERROR')).toBe(true);
    expect(filteredResults[2].every(log => log.metadata?.duration && log.metadata.duration > 1000)).toBe(true);
  });

  test('should handle edge cases and malformed data gracefully', async () => {
    const malformedLogs: LogEntry[] = [
      ...testLogs,
      {
        timestamp: 'invalid-timestamp',
        level: 'INFO',
        message: 'Test with invalid timestamp',
        source: 'test-service'
      },
      {
        timestamp: '2025-08-28T10:10:00Z',
        level: 'INFO',
        message: 'Test with missing metadata',
        source: 'test-service'
        // metadata is undefined
      },
      {
        timestamp: '2025-08-28T10:11:00Z',
        level: 'INFO',
        message: 'Test with null metadata',
        source: 'test-service',
        metadata: null as any
      }
    ];
    
    // Filter by metadata field that may not exist
    filter.addRule({ field: 'metadata.nonexistent', operator: 'equals', value: 'test' });
    
    const filtered = filter.filter(malformedLogs);
    expect(filtered).toHaveLength(0); // No logs should match nonexistent field
    
    // Filter by existing fields should still work
    filter.clearRules();
    filter.addRule({ field: 'level', operator: 'equals', value: 'INFO' });
    
    const infoLogs = filter.filter(malformedLogs);
    expect(infoLogs.length).toBeGreaterThan(0);
  });

  test('should persist and load filter configurations', async () => {
    const configFile = path.join(tempDir, 'filter_config.json');
    
    // Setup complex filter configuration
    const filterConfig = [
      { field: 'level', operator: 'equals', value: 'ERROR' },
      { field: 'source', operator: 'contains', value: 'service' },
      { field: 'metadata.duration', operator: 'greater', value: 100 }
    ];
    
    await fs.writeFile(configFile, JSON.stringify(filterConfig, null, 2));
    
    // Load and apply configuration
    const loadedConfig = JSON.parse(await fs.readFile(configFile, 'utf-8'));
    
    const loadedFilter = new AdvancedLogFilter();
    loadedConfig.forEach((rule: FilterRule) => loadedFilter.addRule(rule));
    
    const filtered = loadedFilter.filter(testLogs);
    
    // Should match the same result as manually configured filter
    filter.addRule({ field: 'level', operator: 'equals', value: 'ERROR' });
    filter.addRule({ field: 'source', operator: 'contains', value: 'service' });
    filter.addRule({ field: 'metadata.duration', operator: 'greater', value: 100 });
    
    const manualFiltered = filter.filter(testLogs);
    
    expect(filtered).toHaveLength(manualFiltered.length);
    expect(filtered.map(l => l.message)).toEqual(manualFiltered.map(l => l.message));
  });
});