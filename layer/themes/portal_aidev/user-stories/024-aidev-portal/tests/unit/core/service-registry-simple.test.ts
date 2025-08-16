import { ServiceRegistry } from '../../../src/core/service-registry';
import { AuthenticationManager } from '../../../src/auth/authentication-manager';

// Mock dependencies
jest.mock('../../../src/auth/authentication-manager');

describe('ServiceRegistry - Unit Tests', () => {
  let registry: ServiceRegistry;
  let mockAuthManager: jest.Mocked<AuthenticationManager>;
  
  const validService = {
    id: 'test-service',
    name: 'Test Service',
    url: 'http://localhost:3000',
    healthEndpoint: '/health',
    version: '1.0.0',
    tags: ['test', 'service']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAuthManager = new AuthenticationManager({
      jwtsecret: process.env.SECRET || "PLACEHOLDER",
      tokenExpiry: '1h'
    }) as jest.Mocked<AuthenticationManager>;
    
    registry = new ServiceRegistry({
      port: 5555,
      healthCheckInterval: 5000,
      authManager: mockAuthManager
    });
  });

  describe("listServices", () => {
    it('should return empty array initially', async () => {
      const services = await registry.listServices();
      expect(services).toEqual([]);
    });

    it('should return all registered services', async () => {
      // Add services directly to internal map
      (registry as any).services.set("service1", {
        ...validService,
        id: "service1",
        status: 'healthy'
      });
      
      (registry as any).services.set("service2", {
        ...validService,
        id: "service2",
        status: 'unknown'
      });
      
      const services = await registry.listServices();
      
      expect(services).toHaveLength(2);
      expect(services.map(s => s.id)).toContain("service1");
      expect(services.map(s => s.id)).toContain("service2");
    });
  });

  describe("getService", () => {
    it('should return service by id', () => {
      const serviceData = {
        ...validService,
        status: 'healthy' as const,
        lastHealthCheck: new Date()
      };
      
      (registry as any).services.set(validService.id, serviceData);
      
      const service = registry.getService(validService.id);
      expect(service).toEqual(serviceData);
    });

    it('should return undefined for non-existent service', () => {
      const service = registry.getService('non-existent');
      expect(service).toBeUndefined();
    });
  });

  describe("updateServiceHealth", () => {
    it('should update service health status', async () => {
      const service = {
        ...validService,
        status: 'unknown' as const
      };
      
      (registry as any).services.set(validService.id, service);
      
      await registry.updateServiceHealth(validService.id, {
        status: 'healthy',
        uptime: 3600
      });
      
      const updatedService = registry.getService(validService.id);
      expect(updatedService?.status).toBe('healthy');
      expect(updatedService?.lastHealthCheck).toBeDefined();
    });

    it('should update service version if provided', async () => {
      const service = {
        ...validService,
        status: 'unknown' as const
      };
      
      (registry as any).services.set(validService.id, service);
      
      await registry.updateServiceHealth(validService.id, {
        status: 'healthy',
        version: '1.1.0'
      });
      
      const updatedService = registry.getService(validService.id);
      expect(updatedService?.version).toBe('1.1.0');
    });

    it('should emit service:health:updated event', async () => {
      const eventHandler = jest.fn();
      registry.on('service:health:updated', eventHandler);
      
      (registry as any).services.set(validService.id, validService);
      
      const health = { status: 'healthy' as const, uptime: 3600 };
      await registry.updateServiceHealth(validService.id, health);
      
      expect(eventHandler).toHaveBeenCalledWith({
        serviceId: validService.id,
        health
      });
    });

    it('should do nothing for non-existent service', async () => {
      const eventHandler = jest.fn();
      registry.on('service:health:updated', eventHandler);
      
      await registry.updateServiceHealth('non-existent', {
        status: 'healthy'
      });
      
      expect(eventHandler).not.toHaveBeenCalled();
    });
  });

  describe('Internal service management', () => {
    it('should maintain service map', () => {
      const services = (registry as any).services;
      expect(services).toBeInstanceOf(Map);
      expect(services.size).toBe(0);
      
      services.set('test', validService);
      expect(services.size).toBe(1);
    });

    it('should maintain health check intervals', () => {
      const intervals = (registry as any).healthCheckIntervals;
      expect(intervals).toBeInstanceOf(Map);
      expect(intervals.size).toBe(0);
    });
  });

  describe("Configuration", () => {
    it('should store configuration', () => {
      const config = (registry as any).config;
      expect(config.port).toBe(5555);
      expect(config.healthCheckInterval).toBe(5000);
      expect(config.authManager).toBe(mockAuthManager);
    });

    it('should work without auth manager', () => {
      const noAuthRegistry = new ServiceRegistry({
        port: 5556,
        healthCheckInterval: 5000
      });
      
      expect((noAuthRegistry as any).authManager).toBeUndefined();
    });
  });

  describe('Event emission', () => {
    it('should be an EventEmitter', () => {
      expect(registry.on).toBeDefined();
      expect(registry.emit).toBeDefined();
      expect(registry.removeListener).toBeDefined();
    });
  });
});