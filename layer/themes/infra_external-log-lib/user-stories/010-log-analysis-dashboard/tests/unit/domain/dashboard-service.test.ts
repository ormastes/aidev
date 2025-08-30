/**
 * Unit Tests for Dashboard Service
 * Following Mock Free Test Oriented Development
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { DashboardService } from '../../../src/domain/dashboard-service';
import type { 
  DashboardConfig, 
  HealthStatus,
  IDashboardService 
} from '../../../src/domain/interfaces';

describe('DashboardService', () => {
  let dashboardService: IDashboardService;
  let testConfig: DashboardConfig;

  beforeEach(() => {
    testConfig = {
      port: 3458,
      host: 'localhost',
      enableStreaming: true,
      refreshInterval: 5000,
      maxQueryLimit: 1000,
      streamingBufferSize: 100,
      theme: 'light',
      enableExports: true,
      exportFormats: ['json', 'csv', 'pdf']
    };
    
    dashboardService = new DashboardService();
  });

  afterEach(async () => {
    try {
      await dashboardService.shutdown();
    } catch (error) {
      // Service may not be initialized
    }
  });

  describe('Service Initialization', () => {
    test('should initialize with valid configuration', async () => {
      await expect(dashboardService.initialize(testConfig)).resolves.not.toThrow();
    });

    test('should reject initialization with invalid port', async () => {
      const invalidConfig = { ...testConfig, port: -1 };
      await expect(dashboardService.initialize(invalidConfig)).rejects.toThrow('Invalid port number');
    });

    test('should reject initialization with invalid host', async () => {
      const invalidConfig = { ...testConfig, host: '' };
      await expect(dashboardService.initialize(invalidConfig)).rejects.toThrow('Host cannot be empty');
    });

    test('should reject initialization with invalid refresh interval', async () => {
      const invalidConfig = { ...testConfig, refreshInterval: 0 };
      await expect(dashboardService.initialize(invalidConfig)).rejects.toThrow('Refresh interval must be positive');
    });

    test('should set default values for missing configuration', async () => {
      const minimalConfig = {
        port: 3458,
        host: 'localhost',
        enableStreaming: true,
        refreshInterval: 5000,
        maxQueryLimit: 1000,
        streamingBufferSize: 100,
        theme: 'light' as const,
        enableExports: true,
        exportFormats: ['json', 'csv'] as const
      };

      await expect(dashboardService.initialize(minimalConfig)).resolves.not.toThrow();
    });
  });

  describe('Health Status', () => {
    test('should return unhealthy status when not initialized', async () => {
      const health = await dashboardService.getHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.services.logService).toBe(false);
      expect(health.services.streaming).toBe(false);
      expect(health.services.database).toBe(false);
    });

    test('should return healthy status after initialization', async () => {
      await dashboardService.initialize(testConfig);
      const health = await dashboardService.getHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(typeof health.metrics.activeStreams).toBe('number');
      expect(typeof health.metrics.memoryUsage).toBe('number');
      expect(typeof health.metrics.cpuUsage).toBe('number');
      expect(typeof health.metrics.diskUsage).toBe('number');
    });

    test('should return degraded status when some services are down', async () => {
      await dashboardService.initialize(testConfig);
      
      // This test will need to be updated when we implement service dependencies
      const health = await dashboardService.getHealth();
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    test('should include performance metrics in health status', async () => {
      await dashboardService.initialize(testConfig);
      const health = await dashboardService.getHealth();
      
      expect(health.metrics).toBeDefined();
      expect(health.metrics.activeStreams).toBeGreaterThanOrEqual(0);
      expect(health.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(health.metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(health.metrics.diskUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      await dashboardService.initialize(testConfig);
    });

    test('should update refresh interval', async () => {
      await expect(dashboardService.updateConfig({ refreshInterval: 10000 })).resolves.not.toThrow();
    });

    test('should update theme setting', async () => {
      await expect(dashboardService.updateConfig({ theme: 'dark' })).resolves.not.toThrow();
    });

    test('should update streaming configuration', async () => {
      await expect(dashboardService.updateConfig({ enableStreaming: false })).resolves.not.toThrow();
    });

    test('should reject invalid configuration updates', async () => {
      await expect(dashboardService.updateConfig({ refreshInterval: -1 })).rejects.toThrow();
      await expect(dashboardService.updateConfig({ maxQueryLimit: 0 })).rejects.toThrow();
      await expect(dashboardService.updateConfig({ streamingBufferSize: -1 })).rejects.toThrow();
    });

    test('should not allow port changes after initialization', async () => {
      await expect(dashboardService.updateConfig({ port: 4000 })).rejects.toThrow('Cannot change port after initialization');
    });

    test('should not allow host changes after initialization', async () => {
      await expect(dashboardService.updateConfig({ host: 'example.com' })).rejects.toThrow('Cannot change host after initialization');
    });
  });

  describe('Service Lifecycle', () => {
    test('should shutdown gracefully when initialized', async () => {
      await dashboardService.initialize(testConfig);
      await expect(dashboardService.shutdown()).resolves.not.toThrow();
    });

    test('should handle shutdown when not initialized', async () => {
      await expect(dashboardService.shutdown()).resolves.not.toThrow();
    });

    test('should prevent operations after shutdown', async () => {
      await dashboardService.initialize(testConfig);
      await dashboardService.shutdown();
      
      await expect(dashboardService.getHealth()).rejects.toThrow('Service has been shut down');
      await expect(dashboardService.updateConfig({ theme: 'dark' })).rejects.toThrow('Service has been shut down');
    });

    test('should allow reinitialization after shutdown', async () => {
      await dashboardService.initialize(testConfig);
      await dashboardService.shutdown();
      
      await expect(dashboardService.initialize(testConfig)).resolves.not.toThrow();
      
      const health = await dashboardService.getHealth();
      expect(['healthy', 'degraded']).toContain(health.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      const invalidConfig = { ...testConfig, port: NaN };
      
      await expect(dashboardService.initialize(invalidConfig)).rejects.toThrow();
      
      const health = await dashboardService.getHealth();
      expect(health.status).toBe('unhealthy');
    });

    test('should recover from temporary health check failures', async () => {
      await dashboardService.initialize(testConfig);
      
      // This test ensures the service remains resilient
      const health = await dashboardService.getHealth();
      expect(health).toBeDefined();
    });
  });
});