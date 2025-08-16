/**
 * Rate Limit Monitor Tests
 * Comprehensive test suite for rate limit monitoring and dashboard
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RateLimitMonitorService, RateLimitEvent } from '../src/services/RateLimitMonitorService';
import { EventEmitter } from '../../infra_external-log-lib/src';

describe('Rate Limit Monitor Service', () => {
  let service: RateLimitMonitorService;

  beforeEach(() => {
    service = new RateLimitMonitorService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Event Recording', () => {
    it('should record rate limit events', () => {
      const event = {
        endpoint: '/api/users',
        method: 'GET',
        clientId: 'client-123',
        ip: '192.168.1.1',
        remaining: 95,
        limit: 100,
        windowMs: 60000,
        blocked: false,
        statusCode: 200
      };

      service.recordEvent(event);
      const recent = service.getRecentEvents(1);
      
      expect(recent).toHaveLength(1);
      expect(recent[0]).toMatchObject(event);
      expect(recent[0].timestamp).toBeInstanceOf(Date);
    });

    it('should emit events for real-time monitoring', (done) => {
      const event = {
        endpoint: '/api/users',
        method: 'GET',
        clientId: 'client-123',
        ip: '192.168.1.1',
        remaining: 95,
        limit: 100,
        windowMs: 60000,
        blocked: false,
        statusCode: 200
      };

      service.on('rate-limit-event', (emitted: RateLimitEvent) => {
        expect(emitted).toMatchObject(event);
        done();
      });

      service.recordEvent(event);
    });

    it('should emit special event when rate limit is exceeded', (done) => {
      const event = {
        endpoint: '/api/users',
        method: 'POST',
        clientId: 'client-456',
        ip: '192.168.1.2',
        remaining: 0,
        limit: 100,
        windowMs: 60000,
        blocked: true,
        statusCode: 429
      };

      service.on('rate-limit-exceeded', (emitted: RateLimitEvent) => {
        expect(emitted.blocked).toBe(true);
        expect(emitted.statusCode).toBe(429);
        done();
      });

      service.recordEvent(event);
    });

    it('should maintain event history with max limit', () => {
      // Record many events
      for (let i = 0; i < 150; i++) {
        service.recordEvent({
          endpoint: '/api/test',
          method: 'GET',
          clientId: `client-${i}`,
          ip: '192.168.1.1',
          remaining: 50,
          limit: 100,
          windowMs: 60000,
          blocked: false,
          statusCode: 200
        });
      }

      const events = service.getRecentEvents(200);
      expect(events.length).toBeLessThanOrEqual(10000); // Max retention
    });
  });

  describe('Statistics Tracking', () => {
    it('should track endpoint statistics', () => {
      // Record multiple events for same endpoint
      for (let i = 0; i < 10; i++) {
        service.recordEvent({
          endpoint: '/api/users',
          method: 'GET',
          clientId: 'client-123',
          ip: '192.168.1.1',
          remaining: 100 - i,
          limit: 100,
          windowMs: 60000,
          blocked: i >= 8,
          statusCode: i >= 8 ? 429 : 200
        });
      }

      const stats = service.getStats('GET:/api/users');
      expect(stats).toHaveLength(1);
      expect(stats[0].totalRequests).toBe(10);
      expect(stats[0].blockedRequests).toBe(2);
    });

    it('should calculate usage percentages correctly', () => {
      service.recordEvent({
        endpoint: '/api/data',
        method: 'GET',
        clientId: 'client-123',
        ip: '192.168.1.1',
        remaining: 25,
        limit: 100,
        windowMs: 60000,
        blocked: false,
        statusCode: 200
      });

      const stats = service.getStats('GET:/api/data');
      expect(stats[0].averageUsage).toBe(75); // (100-25)/100 * 100
      expect(stats[0].peakUsage).toBe(75);
    });

    it('should track peak usage across multiple events', () => {
      const usageValues = [50, 75, 60, 90, 45];
      
      usageValues.forEach(remaining => {
        service.recordEvent({
          endpoint: '/api/data',
          method: 'GET',
          clientId: 'client-123',
          ip: '192.168.1.1',
          remaining,
          limit: 100,
          windowMs: 60000,
          blocked: false,
          statusCode: 200
        });
      });

      const stats = service.getStats('GET:/api/data');
      expect(stats[0].peakUsage).toBe(90); // 100-10 = 90% usage
    });
  });

  describe('Client Usage Tracking', () => {
    it('should track individual client usage', () => {
      const clientId = 'client-789';
      
      // Record events for client
      service.recordEvent({
        endpoint: '/api/users',
        method: 'GET',
        clientId,
        ip: '192.168.1.5',
        remaining: 95,
        limit: 100,
        windowMs: 60000,
        blocked: false,
        statusCode: 200
      });

      service.recordEvent({
        endpoint: '/api/posts',
        method: 'POST',
        clientId,
        ip: '192.168.1.5',
        remaining: 0,
        limit: 50,
        windowMs: 60000,
        blocked: true,
        statusCode: 429
      });

      const usage = service.getClientUsage(clientId);
      expect(usage).toHaveLength(1);
      expect(usage[0].totalRequests).toBe(2);
      expect(usage[0].totalBlocked).toBe(1);
      expect(usage[0].endpoints.size).toBe(2);
    });

    it('should identify top offenders', () => {
      // Create multiple clients with different block counts
      const clients = [
        { id: 'good-client', blocked: 0, total: 100 },
        { id: 'bad-client-1', blocked: 50, total: 60 },
        { id: 'bad-client-2', blocked: 30, total: 40 },
        { id: 'worst-client', blocked: 80, total: 85 }
      ];

      clients.forEach(client => {
        for (let i = 0; i < client.total; i++) {
          service.recordEvent({
            endpoint: '/api/data',
            method: 'GET',
            clientId: client.id,
            ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
            remaining: i < client.blocked ? 0 : 50,
            limit: 100,
            windowMs: 60000,
            blocked: i < client.blocked,
            statusCode: i < client.blocked ? 429 : 200
          });
        }
      });

      const offenders = service.getTopOffenders(3);
      expect(offenders[0].clientId).toBe('worst-client');
      expect(offenders[0].totalBlocked).toBe(80);
      expect(offenders[1].clientId).toBe('bad-client-1');
      expect(offenders[2].clientId).toBe('bad-client-2');
    });
  });

  describe('Configuration Management', () => {
    it('should register rate limit configurations', () => {
      const config = {
        endpoint: '/api/users',
        limit: 100,
        windowMs: 60000,
        skipSuccessfulRequests: false,
        skipFailedRequests: true
      };

      service.registerConfig(config);
      const configs = service.getConfigs();
      
      expect(configs).toContainEqual(config);
    });

    it('should update existing configurations', () => {
      const config = {
        endpoint: '/api/users',
        limit: 100,
        windowMs: 60000
      };

      service.registerConfig(config);
      
      const success = service.updateConfig('/api/users', { limit: 200 });
      expect(success).toBe(true);

      const configs = service.getConfigs();
      expect(configs[0].limit).toBe(200);
    });

    it('should emit event when configuration is updated', (done) => {
      const config = {
        endpoint: '/api/users',
        limit: 100,
        windowMs: 60000
      };

      service.registerConfig(config);

      service.on('config-updated', (data: any) => {
        expect(data.endpoint).toBe('/api/users');
        expect(data.config.limit).toBe(150);
        done();
      });

      service.updateConfig('/api/users', { limit: 150 });
    });
  });

  describe('Event Filtering', () => {
    it('should filter events by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const twoHoursAgo = new Date(now.getTime() - 7200000);

      // Record events at different times
      const events = [
        { timestamp: twoHoursAgo, clientId: 'old' },
        { timestamp: oneHourAgo, clientId: 'recent' },
        { timestamp: now, clientId: 'current' }
      ];

      // Mock the events array
      (service as any).events = events.map(e => ({
        ...e,
        endpoint: '/api/test',
        method: 'GET',
        ip: '192.168.1.1',
        remaining: 50,
        limit: 100,
        windowMs: 60000,
        blocked: false,
        statusCode: 200
      }));

      const filtered = service.getEventsByTimeRange(
        new Date(oneHourAgo.getTime() - 1000),
        new Date(now.getTime() + 1000)
      );

      expect(filtered).toHaveLength(2);
      expect(filtered[0].clientId).toBe('recent');
      expect(filtered[1].clientId).toBe('current');
    });
  });

  describe('Metrics Aggregation', () => {
    it('should calculate aggregated metrics', () => {
      // Record diverse events
      for (let i = 0; i < 100; i++) {
        service.recordEvent({
          endpoint: i % 3 === 0 ? '/api/users' : '/api/posts',
          method: i % 2 === 0 ? 'GET' : 'POST',
          clientId: `client-${i % 10}`,
          ip: `192.168.1.${i % 255}`,
          remaining: i % 10 === 0 ? 0 : 50,
          limit: 100,
          windowMs: 60000,
          blocked: i % 10 === 0,
          statusCode: i % 10 === 0 ? 429 : 200
        });
      }

      const metrics = service.getAggregatedMetrics();
      
      expect(metrics.totalRequests).toBe(100);
      expect(metrics.totalBlocked).toBe(10);
      expect(metrics.blockRate).toBeCloseTo(10, 1);
      expect(metrics.uniqueClients).toBe(10);
      expect(metrics.activeEndpoints).toBeGreaterThan(0);
      expect(metrics.topEndpoints).toBeDefined();
      expect(metrics.topEndpoints.length).toBeLessThanOrEqual(5);
    });

    it('should identify top endpoints by request count', () => {
      // Create events with different endpoints
      const endpoints = [
        { path: '/api/popular', count: 50 },
        { path: '/api/moderate', count: 30 },
        { path: '/api/rare', count: 10 }
      ];

      endpoints.forEach(endpoint => {
        for (let i = 0; i < endpoint.count; i++) {
          service.recordEvent({
            endpoint: endpoint.path,
            method: 'GET',
            clientId: 'client-123',
            ip: '192.168.1.1',
            remaining: 50,
            limit: 100,
            windowMs: 60000,
            blocked: false,
            statusCode: 200
          });
        }
      });

      const metrics = service.getAggregatedMetrics();
      expect(metrics.topEndpoints[0].endpoint).toBe('/api/popular');
      expect(metrics.topEndpoints[0].requests).toBe(50);
    });
  });

  describe('Data Export', () => {
    it('should export all collected data', () => {
      // Add some test data
      service.registerConfig({
        endpoint: '/api/users',
        limit: 100,
        windowMs: 60000
      });

      service.recordEvent({
        endpoint: '/api/users',
        method: 'GET',
        clientId: 'client-123',
        ip: '192.168.1.1',
        remaining: 95,
        limit: 100,
        windowMs: 60000,
        blocked: false,
        statusCode: 200
      });

      const exported = service.exportData();
      
      expect(exported).toHaveProperty('events');
      expect(exported).toHaveProperty('stats');
      expect(exported).toHaveProperty('clientUsage');
      expect(exported).toHaveProperty('configs');
      expect(exported).toHaveProperty('metrics');
      
      expect(exported.events).toBeInstanceOf(Array);
      expect(exported.configs).toHaveLength(1);
      expect(exported.metrics.totalRequests).toBe(1);
    });
  });

  describe('Statistics Reset', () => {
    it('should reset all statistics', () => {
      // Add some data
      service.recordEvent({
        endpoint: '/api/users',
        method: 'GET',
        clientId: 'client-123',
        ip: '192.168.1.1',
        remaining: 95,
        limit: 100,
        windowMs: 60000,
        blocked: false,
        statusCode: 200
      });

      expect(service.getStats()).toHaveLength(1);
      
      service.resetStats();
      
      expect(service.getStats()).toHaveLength(0);
    });

    it('should reset statistics for specific endpoint', () => {
      // Add data for multiple endpoints
      service.recordEvent({
        endpoint: '/api/users',
        method: 'GET',
        clientId: 'client-123',
        ip: '192.168.1.1',
        remaining: 95,
        limit: 100,
        windowMs: 60000,
        blocked: false,
        statusCode: 200
      });

      service.recordEvent({
        endpoint: '/api/posts',
        method: 'GET',
        clientId: 'client-123',
        ip: '192.168.1.1',
        remaining: 95,
        limit: 100,
        windowMs: 60000,
        blocked: false,
        statusCode: 200
      });

      service.resetStats('GET:/api/users');
      
      const stats = service.getStats();
      expect(stats).toHaveLength(1);
      expect(stats[0].endpoint).toBe('/api/posts');
    });

    it('should emit event when stats are reset', (done) => {
      service.on('stats-reset', (data: any) => {
        expect(data.endpoint).toBeUndefined();
        done();
      });

      service.resetStats();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up resources on destroy', () => {
      const removeAllListenersSpy = jest.spyOn(service, 'removeAllListeners');
      
      service.destroy();
      
      expect(removeAllListenersSpy).toHaveBeenCalled();
    });

    it('should handle metrics collection interval', () => {
      jest.useFakeTimers();
      
      const emitSpy = jest.spyOn(service, 'emit');
      
      // Fast-forward time to trigger metrics collection
      jest.advanceTimersByTime(60000);
      
      expect(emitSpy).toHaveBeenCalledWith('metrics-collected', expect.any(Object));
      
      jest.useRealTimers();
    });
  });
});

describe('Rate Limit API Integration', () => {
  let service: RateLimitMonitorService;
  
  beforeEach(() => {
    service = new RateLimitMonitorService();
  });

  afterEach(() => {
    service.destroy();
  });

  it('should handle concurrent event recording', async () => {
    const promises = [];
    
    // Simulate concurrent requests
    for (let i = 0; i < 100; i++) {
      promises.push(
        new Promise<void>((resolve) => {
          service.recordEvent({
            endpoint: '/api/concurrent',
            method: 'GET',
            clientId: `client-${i}`,
            ip: `192.168.1.${i}`,
            remaining: 50,
            limit: 100,
            windowMs: 60000,
            blocked: false,
            statusCode: 200
          });
          resolve();
        })
      );
    }

    await Promise.all(promises);
    
    const events = service.getRecentEvents(100);
    expect(events).toHaveLength(100);
  });

  it('should maintain data consistency under load', () => {
    const clientId = 'load-test-client';
    const numEvents = 1000;
    
    for (let i = 0; i < numEvents; i++) {
      service.recordEvent({
        endpoint: '/api/load',
        method: 'GET',
        clientId,
        ip: '192.168.1.1',
        remaining: i % 2 === 0 ? 50 : 0,
        limit: 100,
        windowMs: 60000,
        blocked: i % 2 === 1,
        statusCode: i % 2 === 1 ? 429 : 200
      });
    }

    const usage = service.getClientUsage(clientId);
    expect(usage[0].totalRequests).toBe(numEvents);
    expect(usage[0].totalBlocked).toBe(numEvents / 2);
  });
});