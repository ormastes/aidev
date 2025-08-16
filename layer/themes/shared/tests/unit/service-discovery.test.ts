import { ServiceDiscovery } from '../../children/services/ServiceDiscovery';

interface Service {
  name: string;
  port: number;
  endpoints: string[];
  health?: string;
  lastSeen?: Date;
}

describe('ServiceDiscovery', () => {
  let serviceDiscovery: ServiceDiscovery;

  beforeEach(() => {
    // Reset singleton instance for testing
    (ServiceDiscovery as any).instance = undefined;
    serviceDiscovery = ServiceDiscovery.getInstance();
    
    // Stop health checks during tests
    serviceDiscovery.stop();
  });

  afterEach(() => {
    serviceDiscovery.stop();
    (ServiceDiscovery as any).instance = undefined;
  });

  describe('register', () => {
    it('should register a new service', async () => {
      const service: Service = {
        name: 'test-service',
        port: 3000,
        endpoints: ['/api/v1', '/health']
      };

      await serviceDiscovery.register(service);
      
      const found = serviceDiscovery.getService('test-service');
      expect(found).toBeDefined();
      expect(found?.name).toBe('test-service');
      expect(found?.port).toBe(3000);
      expect(found?.endpoints).toEqual(['/api/v1', '/health']);
      expect(found?.lastSeen).toBeDefined();
    });

    it('should update existing service', async () => {
      const service: Service = {
        name: 'test-service',
        port: 3000,
        endpoints: ['/api/v1']
      };

      await serviceDiscovery.register(service);
      
      const updated: Service = {
        name: 'test-service',
        port: 4000,
        endpoints: ['/api/v2']
      };
      
      await serviceDiscovery.register(updated);
      
      const found = serviceDiscovery.getService('test-service');
      expect(found?.port).toBe(4000);
      expect(found?.endpoints).toEqual(['/api/v2']);
    });

    it('should set default health endpoint', async () => {
      const service: Service = {
        name: 'test-service',
        port: 3000,
        endpoints: ['/api/v1']
      };

      await serviceDiscovery.register(service);
      
      const found = serviceDiscovery.getService('test-service');
      expect(found?.health).toBe('/health');
    });
  });

  describe('deregister', () => {
    it('should remove registered service', async () => {
      const service: Service = {
        name: 'test-service',
        port: 3000,
        endpoints: ['/api/v1']
      };

      await serviceDiscovery.register(service);
      expect(serviceDiscovery.getService('test-service')).toBeTruthy();
      
      await serviceDiscovery.deregister('test-service');
      expect(serviceDiscovery.getService('test-service')).toBeUndefined();
    });

    it('should handle deregistering non-existent service', async () => {
      await expect(serviceDiscovery.deregister('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getService', () => {
    it('should return undefined for non-existent service', () => {
      expect(serviceDiscovery.getService('non-existent')).toBeUndefined();
    });

    it('should return registered service', async () => {
      const service: Service = {
        name: 'test-service',
        port: 3000,
        endpoints: ['/api/v1']
      };

      await serviceDiscovery.register(service);
      const found = serviceDiscovery.getService('test-service');
      expect(found?.name).toBe('test-service');
      expect(found?.port).toBe(3000);
    });
  });

  describe('getAllServices', () => {
    it('should return empty array when no services', () => {
      expect(serviceDiscovery.getAllServices()).toEqual([]);
    });

    it('should return all registered services', async () => {
      const service1: Service = {
        name: 'service-1',
        port: 3001,
        endpoints: ['/api/v1']
      };

      const service2: Service = {
        name: 'service-2',
        port: 3002,
        endpoints: ['/api/v2']
      };

      await serviceDiscovery.register(service1);
      await serviceDiscovery.register(service2);

      const services = serviceDiscovery.getAllServices();
      expect(services).toHaveLength(2);
      expect(services.map(s => s.name)).toContain('service-1');
      expect(services.map(s => s.name)).toContain('service-2');
    });
  });

  describe('getServiceUrl', () => {
    it('should return undefined for non-existent service', () => {
      expect(serviceDiscovery.getServiceUrl('non-existent')).toBeUndefined();
    });

    it('should return URL for registered service', async () => {
      const service: Service = {
        name: 'test-service',
        port: 3000,
        endpoints: ['/api/v1']
      };

      await serviceDiscovery.register(service);
      const url = serviceDiscovery.getServiceUrl('test-service');
      expect(url).toBe('http://localhost:3000');
    });

    it('should return correct URLs for multiple services', async () => {
      await serviceDiscovery.register({
        name: 'api-service',
        port: 3001,
        endpoints: ['/api']
      });

      await serviceDiscovery.register({
        name: 'web-service',
        port: 8080,
        endpoints: ['/']
      });

      expect(serviceDiscovery.getServiceUrl('api-service')).toBe('http://localhost:3001');
      expect(serviceDiscovery.getServiceUrl('web-service')).toBe('http://localhost:8080');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ServiceDiscovery.getInstance();
      const instance2 = ServiceDiscovery.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', async () => {
      const instance1 = ServiceDiscovery.getInstance();
      await instance1.register({
        name: 'test-service',
        port: 3000,
        endpoints: ['/api']
      });

      const instance2 = ServiceDiscovery.getInstance();
      const service = instance2.getService('test-service');
      expect(service?.name).toBe('test-service');
    });
  });

  describe('stop', () => {
    it('should stop health checks', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      serviceDiscovery.stop();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle multiple stop calls', () => {
      expect(() => {
        serviceDiscovery.stop();
        serviceDiscovery.stop();
      }).not.toThrow();
    });
  });
});