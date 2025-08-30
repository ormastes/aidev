/**
 * Unit Tests for Pipe Interface
 * Testing HEA gateway exports and factory functions
 */

import { describe, test, expect } from '@jest/globals';
import {
  DashboardService,
  createDashboard,
  validateLogLevel,
  validateLogFormat,
  parseLogLevel,
  formatTimestamp,
  isHealthy,
  DASHBOARD_DEFAULTS,
  LOG_LEVELS,
  LOG_FORMATS
} from '../../../src/pipe';

describe('Pipe Interface', () => {
  describe('Service Exports', () => {
    test('should export DashboardService class', () => {
      expect(DashboardService).toBeDefined();
      expect(typeof DashboardService).toBe('function');
    });

    test('should create dashboard service instance', () => {
      const dashboard = new DashboardService();
      expect(dashboard).toBeInstanceOf(DashboardService);
    });
  });

  describe('Factory Functions', () => {
    test('should create dashboard with default configuration', () => {
      const dashboard = createDashboard();
      expect(dashboard).toBeInstanceOf(DashboardService);
    });

    test('should create dashboard with custom configuration', () => {
      const config = {
        port: 3459,
        theme: 'dark' as const,
        enableStreaming: false
      };
      const dashboard = createDashboard(config);
      expect(dashboard).toBeInstanceOf(DashboardService);
    });
  });

  describe('Validation Functions', () => {
    test('should validate log levels correctly', () => {
      expect(validateLogLevel('ERROR')).toBe(true);
      expect(validateLogLevel('WARN')).toBe(true);
      expect(validateLogLevel('INFO')).toBe(true);
      expect(validateLogLevel('DEBUG')).toBe(true);
      expect(validateLogLevel('invalid')).toBe(false);
      expect(validateLogLevel('')).toBe(false);
    });

    test('should validate log formats correctly', () => {
      expect(validateLogFormat('json')).toBe(true);
      expect(validateLogFormat('plain')).toBe(true);
      expect(validateLogFormat('structured')).toBe(true);
      expect(validateLogFormat('invalid')).toBe(false);
      expect(validateLogFormat('')).toBe(false);
    });

    test('should parse log levels with fallback', () => {
      expect(parseLogLevel('error')).toBe('ERROR');
      expect(parseLogLevel('ERROR')).toBe('ERROR');
      expect(parseLogLevel('warn')).toBe('WARN');
      expect(parseLogLevel('invalid')).toBe('INFO'); // fallback
      expect(parseLogLevel('')).toBe('INFO'); // fallback
    });
  });

  describe('Utility Functions', () => {
    test('should format timestamps correctly', () => {
      const date = new Date('2025-08-27T10:30:15.123Z');
      const formatted = formatTimestamp(date);
      expect(formatted).toBe('2025-08-27T10:30:15.123Z');
    });

    test('should check health status correctly', () => {
      const healthyStatus = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: { logService: true, streaming: true, database: true },
        metrics: { activeStreams: 0, memoryUsage: 50, cpuUsage: 25, diskUsage: 40 }
      };
      
      const unhealthyStatus = {
        status: 'unhealthy' as const,
        timestamp: new Date(),
        services: { logService: false, streaming: false, database: false },
        metrics: { activeStreams: 0, memoryUsage: 90, cpuUsage: 80, diskUsage: 95 }
      };

      expect(isHealthy(healthyStatus)).toBe(true);
      expect(isHealthy(unhealthyStatus)).toBe(false);
    });
  });

  describe('Constants', () => {
    test('should export default configuration constants', () => {
      expect(DASHBOARD_DEFAULTS.PORT).toBe(3458);
      expect(DASHBOARD_DEFAULTS.HOST).toBe('localhost');
      expect(DASHBOARD_DEFAULTS.REFRESH_INTERVAL).toBe(5000);
      expect(DASHBOARD_DEFAULTS.ENABLE_STREAMING).toBe(true);
      expect(DASHBOARD_DEFAULTS.THEME).toBe('light');
    });

    test('should export log level constants', () => {
      expect(LOG_LEVELS.ERROR).toBe('ERROR');
      expect(LOG_LEVELS.WARN).toBe('WARN');
      expect(LOG_LEVELS.INFO).toBe('INFO');
      expect(LOG_LEVELS.DEBUG).toBe('DEBUG');
      expect(LOG_LEVELS.TRACE).toBe('TRACE');
      expect(LOG_LEVELS.FATAL).toBe('FATAL');
    });

    test('should export log format constants', () => {
      expect(LOG_FORMATS.JSON).toBe('json');
      expect(LOG_FORMATS.PLAIN).toBe('plain');
      expect(LOG_FORMATS.STRUCTURED).toBe('structured');
      expect(LOG_FORMATS.SYSLOG).toBe('syslog');
    });
  });

  describe('Type Safety', () => {
    test('should maintain type safety through pipe interface', () => {
      // This test verifies TypeScript compilation succeeds with proper types
      const dashboard = createDashboard({
        port: 3458,
        host: 'localhost',
        enableStreaming: true,
        refreshInterval: 5000,
        maxQueryLimit: 1000,
        streamingBufferSize: 100,
        theme: 'light',
        enableExports: true,
        exportFormats: ['json', 'csv']
      });

      expect(dashboard).toBeInstanceOf(DashboardService);
    });
  });
});