/**
 * Health Monitoring and Logging System Tests
 * Tests for HealthCheckService, RequestLoggingMiddleware, ErrorHandlingMiddleware, and ExternalLogService
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HealthCheckService, HealthStatus } from '../src/services/HealthCheckService';
import { RequestLoggingMiddleware } from '../src/middleware/RequestLoggingMiddleware';
import { 
  ErrorHandlingMiddleware, 
  ApplicationError, 
  ValidationError,
  AuthenticationError,
  ErrorSeverity,
  ErrorCategory 
} from '../src/middleware/ErrorHandlingMiddleware';
import { ExternalLogService, LogLevel } from '../src/services/ExternalLogService';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs/promises';
import { path } from '../../layer/themes/infra_external-log-lib/src';

// Test directories
const TEST_LOG_DIR = path.join(__dirname, 'test-logs');
const TEST_DB_PATH = path.join(__dirname, 'test-monitoring.db');

describe('Health Monitoring and Logging System', () => {
  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(TEST_LOG_DIR, { recursive: true });
    
    // Set test environment
    process.env.DATABASE_PATH = TEST_DB_PATH;
    process.env.NODE_ENV = 'test';
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(TEST_LOG_DIR, { recursive: true, force: true });
      await fs.unlink(TEST_DB_PATH);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("HealthCheckService", () => {
    let healthService: HealthCheckService;

    beforeEach(() => {
      healthService = new HealthCheckService();
    });

    describe('Health Checks', () => {
      it('should perform full health check', async () => {
        const health = await healthService.checkHealth();

        expect(health).toBeDefined();
        expect(health.status).toBeDefined();
        expect(health.timestamp).toBeInstanceOf(Date);
        expect(health.uptime).toBeGreaterThanOrEqual(0);
        expect(health.checks).toBeInstanceOf(Array);
        expect(health.system).toBeDefined();
        expect(health.version).toBeDefined();
        expect(health.environment).toBe('test');
      });

      it('should return healthy status when all checks pass', async () => {
        // Register a healthy check
        healthService.registerDependency({
          name: 'test_service',
          type: 'service',
          check: async () => ({
            name: 'test_service',
            status: HealthStatus.HEALTHY,
            message: 'Service is healthy'
          })
        });

        const health = await healthService.checkHealth();
        expect(health.status).toBe(HealthStatus.HEALTHY);
      });

      it('should return degraded status for non-critical failures', async () => {
        // Register a degraded check
        healthService.registerDependency({
          name: 'test_cache',
          type: 'service',
          critical: false,
          check: async () => ({
            name: 'test_cache',
            status: HealthStatus.DEGRADED,
            message: 'Cache is slow'
          })
        });

        const health = await healthService.checkHealth();
        expect(health.status).toBe(HealthStatus.DEGRADED);
      });

      it('should return unhealthy status for critical failures', async () => {
        // Register a critical unhealthy check
        healthService.registerDependency({
          name: 'test_database',
          type: "database",
          critical: true,
          check: async () => ({
            name: 'test_database',
            status: HealthStatus.UNHEALTHY,
            message: 'Database connection failed'
          })
        });

        const health = await healthService.checkHealth();
        expect(health.status).toBe(HealthStatus.UNHEALTHY);
      });

      it('should cache health check results', async () => {
        const firstCheck = await healthService.checkHealth();
        const secondCheck = await healthService.checkHealth(true);

        expect(secondCheck.timestamp).toEqual(firstCheck.timestamp);
      });

      it('should bypass cache when requested', async () => {
        const firstCheck = await healthService.checkHealth();
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const secondCheck = await healthService.checkHealth(false);

        expect(secondCheck.timestamp.getTime()).toBeGreaterThan(firstCheck.timestamp.getTime());
      });
    });

    describe('Simple Health Status', () => {
      it('should return OK for healthy status', async () => {
        const status = await healthService.getSimpleHealth();
        
        expect(status.status).toBe('OK');
        expect(status.code).toBe(200);
      });

      it('should return 503 for unhealthy status', async () => {
        // Register unhealthy check
        healthService.registerDependency({
          name: 'critical_service',
          type: 'service',
          critical: true,
          check: async () => ({
            name: 'critical_service',
            status: HealthStatus.UNHEALTHY,
            message: 'Critical failure'
          })
        });

        const status = await healthService.getSimpleHealth();
        
        expect(status.status).toBe("UNHEALTHY");
        expect(status.code).toBe(503);
      });
    });

    describe('Liveness and Readiness', () => {
      it('should report liveness', async () => {
        const liveness = await healthService.getLiveness();
        
        expect(liveness.alive).toBe(true);
        expect(liveness.uptime).toBeGreaterThanOrEqual(0);
      });

      it('should report readiness when critical dependencies are healthy', async () => {
        const readiness = await healthService.getReadiness();
        
        expect(readiness.ready).toBe(true);
        expect(readiness.checks).toEqual([]);
      });

      it('should report not ready when critical dependencies fail', async () => {
        // Register critical unhealthy check
        healthService.registerDependency({
          name: 'critical_db',
          type: "database",
          critical: true,
          check: async () => ({
            name: 'critical_db',
            status: HealthStatus.UNHEALTHY,
            message: 'Database down'
          })
        });

        const readiness = await healthService.getReadiness();
        
        expect(readiness.ready).toBe(false);
        expect(readiness.checks).toContain('critical_db');
      });
    });

    describe('Health Statistics', () => {
      it('should track health statistics', async () => {
        // Perform some health checks
        await healthService.checkHealth(false);
        await new Promise(resolve => setTimeout(resolve, 10));
        await healthService.checkHealth(false);

        const stats = healthService.getHealthStatistics();

        expect(stats.totalChecks).toBeGreaterThan(0);
        expect(stats.uptime).toBeGreaterThan(0);
        expect(stats.uptimePercentage).toBeGreaterThanOrEqual(0);
        expect(stats.uptimePercentage).toBeLessThanOrEqual(100);
      });

      it('should track response times in statistics', async () => {
        // Register check with response time
        healthService.registerDependency({
          name: 'timed_service',
          type: 'service',
          check: async () => ({
            name: 'timed_service',
            status: HealthStatus.HEALTHY,
            responseTime: 50,
            message: 'Service responded'
          })
        });

        await healthService.checkHealth(false);
        const stats = healthService.getHealthStatistics();

        expect(stats.averageResponseTime).toBeGreaterThan(0);
      });
    });

    describe('Dependency Management', () => {
      it('should register and unregister dependencies', async () => {
        const depName = 'test_dependency';
        
        healthService.registerDependency({
          name: depName,
          type: 'service',
          check: async () => ({
            name: depName,
            status: HealthStatus.HEALTHY,
            message: 'Test dependency healthy'
          })
        });

        expect(healthService.getDependencies()).toContain(depName);

        healthService.unregisterDependency(depName);
        expect(healthService.getDependencies()).not.toContain(depName);
      });

      it('should check specific dependency', async () => {
        const depName = 'specific_dep';
        
        healthService.registerDependency({
          name: depName,
          type: 'api',
          check: async () => ({
            name: depName,
            status: HealthStatus.HEALTHY,
            message: 'API is up'
          })
        });

        const check = await healthService.checkDependency(depName);
        
        expect(check).toBeDefined();
        expect(check?.status).toBe(HealthStatus.HEALTHY);
      });

      it('should return null for non-existent dependency', async () => {
        const check = await healthService.checkDependency('non_existent');
        expect(check).toBeNull();
      });
    });
  });

  describe("RequestLoggingMiddleware", () => {
    let requestLogger: RequestLoggingMiddleware;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      requestLogger = new RequestLoggingMiddleware({
        persistToDatabase: false,
        logToConsole: false
      });

      mockReq = {
        method: 'GET',
        path: '/api/test',
        query: { page: '1' },
        body: { data: 'test' },
        headers: {
          'user-agent': 'test-agent',
          'content-type': 'application/json'
        },
        socket: {
          remoteAddress: '127.0.0.1'
        } as any
      };

      mockRes = {
        statusCode: 200,
        send: jest.fn(),
        json: jest.fn(),
        on: jest.fn()
      };

      mockNext = jest.fn();
    });

    describe('Request Logging', () => {
      it('should log incoming requests', () => {
        const middleware = requestLogger.middleware();
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect((mockReq as any).requestId).toBeDefined();
      });

      it('should exclude specified paths', () => {
        const logger = new RequestLoggingMiddleware({
          excludePaths: ['/health'],
          persistToDatabase: false
        });

        mockReq.path = '/health';
        const middleware = logger.middleware();
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect((mockReq as any).requestId).toBeUndefined();
      });

      it('should sanitize sensitive fields', () => {
        const logger = new RequestLoggingMiddleware({
          sensitiveFields: ["password"],
          persistToDatabase: false
        });

        mockReq.body = { username: 'test', password: "PLACEHOLDER" };
        
        // Spy on internal method
        const sanitizeSpy = jest.spyOn(logger as any, "sanitizeData");
        
        const middleware = logger.middleware();
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(sanitizeSpy).toHaveBeenCalled();
      });

      it('should capture response metrics', (done) => {
        mockRes.on = jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(() => {
              callback();
              
              const metrics = requestLogger.getMetrics();
              expect(metrics.totalRequests).toBeGreaterThan(0);
              done();
            }, 10);
          }
        });

        const middleware = requestLogger.middleware();
        middleware(mockReq as Request, mockRes as Response, mockNext);
      });
    });

    describe('Request Metrics', () => {
      it('should track request metrics', () => {
        const metrics = requestLogger.getMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
        expect(metrics.requestsByMethod).toBeDefined();
        expect(metrics.requestsByPath).toBeDefined();
        expect(metrics.requestsByStatus).toBeDefined();
      });

      it('should track requests per minute', () => {
        const metrics = requestLogger.getMetrics();
        expect(metrics.requestsPerMinute).toBeGreaterThanOrEqual(0);
      });

      it('should maintain request history', () => {
        const history = requestLogger.getRequestHistory();
        expect(history).toBeInstanceOf(Array);
      });
    });

    describe('Error Logging', () => {
      it('should log request errors', () => {
        const errorMiddleware = requestLogger.errorMiddleware();
        const error = new Error('Test error');

        errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error);
      });
    });
  });

  describe("ErrorHandlingMiddleware", () => {
    let errorHandler: ErrorHandlingMiddleware;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      errorHandler = new ErrorHandlingMiddleware({
        persistErrors: false,
        logErrors: false
      });

      mockReq = {
        method: 'GET',
        path: '/api/test',
        headers: {},
        socket: {
          remoteAddress: '127.0.0.1'
        } as any
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        headersSent: false
      };

      mockNext = jest.fn();
    });

    describe('Error Handling', () => {
      it('should handle ApplicationError', async () => {
        const error = new ApplicationError('Test error', 400, {
          code: 'TEST_ERROR',
          severity: ErrorSeverity.LOW,
          category: ErrorCategory.VALIDATION
        });

        const middleware = errorHandler.middleware();
        await middleware(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalled();
      });

      it('should handle ValidationError', async () => {
        const error = new ValidationError('Invalid input');

        const middleware = errorHandler.middleware();
        await middleware(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should handle AuthenticationError', async () => {
        const error = new AuthenticationError();

        const middleware = errorHandler.middleware();
        await middleware(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      it('should handle generic errors', async () => {
        const error = new Error('Generic error');

        const middleware = errorHandler.middleware();
        await middleware(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });

    describe('Error Recovery', () => {
      it('should attempt recovery for non-critical errors', async () => {
        const recoverySpy = jest.fn().mockResolvedValue(true);
        
        errorHandler.registerRecoveryStrategy({
          name: 'test_recovery',
          condition: (error) => error.message === "Recoverable",
          recover: recoverySpy
        });

        const error = new Error("Recoverable");
        
        const middleware = errorHandler.middleware();
        await middleware(error, mockReq as Request, mockRes as Response, mockNext);

        expect(recoverySpy).toHaveBeenCalled();
      });

      it('should not attempt recovery for critical errors', async () => {
        const recoverySpy = jest.fn().mockResolvedValue(true);
        
        errorHandler.registerRecoveryStrategy({
          name: 'test_recovery',
          condition: () => true,
          recover: recoverySpy
        });

        const error = new ApplicationError("Critical", 500, {
          severity: ErrorSeverity.CRITICAL
        });
        
        const middleware = errorHandler.middleware();
        await middleware(error, mockReq as Request, mockRes as Response, mockNext);

        expect(recoverySpy).not.toHaveBeenCalled();
      });
    });

    describe('Error Statistics', () => {
      it('should track error statistics', () => {
        const stats = errorHandler.getStatistics();

        expect(stats).toBeDefined();
        expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
        expect(stats.errorsByCategory).toBeDefined();
        expect(stats.errorsBySeverity).toBeDefined();
        expect(stats.errorRate).toBeGreaterThanOrEqual(0);
      });

      it('should track critical errors separately', async () => {
        const error = new ApplicationError("Critical", 500, {
          severity: ErrorSeverity.CRITICAL
        });

        const middleware = errorHandler.middleware();
        await middleware(error, mockReq as Request, mockRes as Response, mockNext);

        const stats = errorHandler.getStatistics();
        expect(stats.criticalErrors).toBeGreaterThan(0);
      });
    });

    describe('Not Found Handler', () => {
      it('should handle 404 errors', () => {
        mockReq.path = '/non-existent';
        
        const notFoundHandler = errorHandler.notFoundHandler();
        notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = (mockNext as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(404);
      });
    });

    describe('Async Handler', () => {
      it('should wrap async functions', async () => {
        const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
        const wrapped = errorHandler.asyncHandler(asyncFn);

        await wrapped(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = (mockNext as jest.Mock).mock.calls[0][0];
        expect(error.message).toBe('Async error');
      });
    });
  });

  describe("ExternalLogService", () => {
    let logService: ExternalLogService;

    beforeEach(() => {
      logService = new ExternalLogService({
        service: 'test-service',
        logDir: TEST_LOG_DIR,
        logToConsole: false,
        flushInterval: 100
      });
    });

    afterEach(() => {
      logService.destroy();
    });

    describe('Logging', () => {
      it('should log messages at different levels', async () => {
        logService.debug('Debug message');
        logService.info('Info message');
        logService.warn('Warning message');
        logService.error('Error message');
        logService.critical('Critical message');

        await logService.flush();

        const logs = await logService.getLogs();
        expect(logs.length).toBeGreaterThan(0);
      });

      it('should respect log level configuration', async () => {
        const service = new ExternalLogService({
          logDir: TEST_LOG_DIR,
          logLevel: LogLevel.WARN,
          logToConsole: false
        });

        service.debug('Debug - should not log');
        service.info('Info - should not log');
        service.warn('Warning - should log');
        service.error('Error - should log');

        await service.flush();

        const logs = await service.getLogs();
        const logMessages = logs.map(l => l.message);
        
        expect(logMessages).not.toContain('Debug - should not log');
        expect(logMessages).not.toContain('Info - should not log');
        expect(logMessages).toContain('Warning - should log');
        expect(logMessages).toContain('Error - should log');

        service.destroy();
      });

      it('should include metadata in logs', async () => {
        const metadata = { userId: 123, action: 'test' };
        logService.info('Test with metadata', metadata);

        await logService.flush();

        const logs = await logService.getLogs();
        expect(logs[0].metadata).toEqual(metadata);
      });
    });

    describe('Log Retrieval', () => {
      beforeEach(async () => {
        // Add some test logs
        logService.info('Log 1', { userId: '1' });
        logService.warn('Log 2', { userId: '2' });
        logService.error('Log 3', { userId: '1' });
        await logService.flush();
      });

      it('should retrieve logs with filters', async () => {
        const logs = await logService.getLogs({
          level: LogLevel.WARN,
          limit: 10
        });

        expect(logs.length).toBeGreaterThan(0);
        logs.forEach(log => {
          const levelValue = (logService as any).logLevels.get(log.level);
          const warnValue = (logService as any).logLevels.get(LogLevel.WARN);
          expect(levelValue).toBeGreaterThanOrEqual(warnValue);
        });
      });

      it('should search logs', async () => {
        const results = await logService.searchLogs('Log 2');
        
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].message).toContain('Log 2');
      });
    });

    describe('Log Statistics', () => {
      it('should calculate log statistics', async () => {
        logService.info('Info log');
        logService.error('Error log');
        await logService.flush();

        const stats = await logService.getStatistics();

        expect(stats.totalLogs).toBeGreaterThan(0);
        expect(stats.logsByLevel).toBeDefined();
        expect(stats.logsByService).toBeDefined();
        expect(stats.totalSize).toBeGreaterThan(0);
      });
    });

    describe('Log Rotation', () => {
      it('should rotate logs when size limit exceeded', async () => {
        const service = new ExternalLogService({
          logDir: TEST_LOG_DIR,
          maxFileSize: 100, // Very small for testing
          logToConsole: false
        });

        // Write enough data to trigger rotation
        for (let i = 0; i < 10; i++) {
          service.info(`Long message ${i}: ${'x'.repeat(50)}`);
        }

        await service.flush();
        
        const files = await fs.readdir(TEST_LOG_DIR);
        const logFiles = files.filter(f => f.endsWith('.log'));
        
        expect(logFiles.length).toBeGreaterThanOrEqual(1);

        service.destroy();
      });
    });

    describe('Event Emission', () => {
      it('should emit log events', (done) => {
        logService.on('log', (entry) => {
          expect(entry).toBeDefined();
          expect(entry.message).toBe('Test event');
          done();
        });

        logService.info('Test event');
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Complete Monitoring Flow', () => {
      it('should integrate all monitoring components', async () => {
        // Initialize services
        const healthService = new HealthCheckService();
        const requestLogger = new RequestLoggingMiddleware({
          persistToDatabase: false
        });
        const errorHandler = new ErrorHandlingMiddleware({
          persistErrors: false
        });
        const logService = new ExternalLogService({
          logDir: TEST_LOG_DIR,
          logToConsole: false
        });

        // Perform health check
        const health = await healthService.checkHealth();
        expect(health.status).toBeDefined();

        // Log the health check
        logService.info('Health check performed', {
          status: health.status,
          checks: health.checks.length
        });

        // Simulate a request
        const mockReq = {
          method: 'GET',
          path: '/api/health',
          headers: {},
          socket: { remoteAddress: '127.0.0.1' }
        } as any;

        const mockRes = {
          statusCode: 200,
          on: jest.fn(),
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        // Process request through middleware
        const reqMiddleware = requestLogger.middleware();
        reqMiddleware(mockReq, mockRes, mockNext);

        // Simulate an error
        const error = new ValidationError('Test validation error');
        const errMiddleware = errorHandler.middleware();
        await errMiddleware(error, mockReq, mockRes, mockNext);

        // Get statistics
        const errorStats = errorHandler.getStatistics();
        const requestMetrics = requestLogger.getMetrics();

        expect(errorStats.totalErrors).toBeGreaterThan(0);
        expect(requestMetrics.totalRequests).toBeGreaterThan(0);

        // Cleanup
        logService.destroy();
      });
    });

    describe('Health Endpoint Middleware', () => {
      it('should serve health endpoints', async () => {
        const healthService = new HealthCheckService();
        const middleware = healthService.middleware();

        const testEndpoints = [
          { path: '/health', expectedStatus: 200 },
          { path: '/health/status', expectedStatus: 200 },
          { path: '/health/live', expectedStatus: 200 },
          { path: '/health/ready', expectedStatus: 200 },
          { path: '/health/stats', expectedStatus: 200 },
          { path: '/health/history', expectedStatus: 200 }
        ];

        for (const endpoint of testEndpoints) {
          const mockReq = { path: endpoint.path } as any;
          const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
          } as any;
          const mockNext = jest.fn();

          await middleware(mockReq, mockRes, mockNext);

          if (endpoint.path === '/health/status') {
            expect(mockRes.status).toHaveBeenCalledWith(endpoint.expectedStatus);
            expect(mockRes.send).toHaveBeenCalled();
          } else {
            expect(mockRes.status).toHaveBeenCalledWith(endpoint.expectedStatus);
            expect(mockRes.json).toHaveBeenCalled();
          }
        }
      });
    });
  });
});