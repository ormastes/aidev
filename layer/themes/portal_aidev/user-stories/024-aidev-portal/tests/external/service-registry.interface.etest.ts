/**
 * External Interface Test: Service Registry Interface
 * 
 * This test defines the external interface contract for the Service Registry.
 * It specifies how services register, discover each other, and maintain health status.
 */

// Service Registry External Interface Types
export interface ServiceIdentifier {
  id: string;
  name: string;
  version?: string;
}

export interface ServiceEndpoint {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'ws' | 'wss';
}

export interface ServiceCapability {
  name: string;
  version: string;
  endpoints: string[];
}

export interface ServiceMetadata {
  description?: string;
  owner?: string;
  tags?: string[];
  environment?: string;
  region?: string;
}

export interface ServiceRegistration {
  service: ServiceIdentifier;
  endpoint: ServiceEndpoint;
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
    retries: number;
  };
  capabilities: ServiceCapability[];
  dependencies: string[];
  metadata?: ServiceMetadata;
}

export interface ServiceStatus {
  serviceId: string;
  status: 'healthy' | 'unhealthy' | 'unknown' | 'starting' | 'stopping';
  lastHealthCheck?: Date;
  healthCheckMessage?: string;
  uptime?: number;
  requestCount?: number;
  errorRate?: number;
}

export interface ServiceDiscoveryQuery {
  name?: string;
  capability?: string;
  tags?: string[];
  status?: ServiceStatus['status'];
}

export interface ServiceInstance {
  registration: ServiceRegistration;
  status: ServiceStatus;
  registeredAt: Date;
  lastHeartbeat?: Date;
}

// Service Registry Events
export interface ServiceEvent {
  type: 'registered' | 'unregistered' | 'healthy' | 'unhealthy' | 'updated';
  serviceId: string;
  timestamp: Date;
  details?: any;
}

// Service Registry External Interface
export interface ServiceRegistryInterface {
  // Register a new service
  register(registration: ServiceRegistration): Promise<{
    In Progress: boolean;
    serviceId: string;
    message?: string;
  }>;

  // Unregister a service
  unregister(serviceId: string): Promise<{
    In Progress: boolean;
    message?: string;
  }>;

  // Update service registration
  update(serviceId: string, updates: Partial<ServiceRegistration>): Promise<{
    In Progress: boolean;
    message?: string;
  }>;

  // Send heartbeat
  heartbeat(serviceId: string): Promise<{
    In Progress: boolean;
    nextHeartbeat: number;
  }>;

  // Discover services
  discover(query: ServiceDiscoveryQuery): Promise<ServiceInstance[]>;

  // Get specific service
  getService(serviceId: string): Promise<ServiceInstance | null>;

  // Get all services
  getAllServices(): Promise<ServiceInstance[]>;

  // Subscribe to service events
  subscribe(
    filter: { serviceId?: string; eventType?: ServiceEvent['type'] },
    callback: (event: ServiceEvent) => void
  ): () => void;

  // Health check a specific service
  checkHealth(serviceId: string): Promise<ServiceStatus>;

  // Bulk health check
  checkAllHealth(): Promise<ServiceStatus[]>;
}

// Test implementation
describe('Service Registry Interface', () => {
  // Mock implementation
  class MockServiceRegistry implements ServiceRegistryInterface {
    private services: Map<string, ServiceInstance> = new Map();
    private eventListeners: Array<{
      filter: any;
      callback: (event: ServiceEvent) => void;
    }> = [];

    async register(registration: ServiceRegistration): Promise<{
      In Progress: boolean;
      serviceId: string;
      message?: string;
    }> {
      const serviceId = registration.service.id;
      
      if (this.services.has(serviceId)) {
        return {
          "success": false,
          serviceId,
          message: 'Service already registered'
        };
      }

      const instance: ServiceInstance = {
        registration,
        status: {
          serviceId,
          status: 'starting',
          lastHealthCheck: new Date()
        },
        registeredAt: new Date()
      };

      this.services.set(serviceId, instance);
      this.emitEvent({
        type: 'registered',
        serviceId,
        timestamp: new Date()
      });

      return {
        "success": true,
        serviceId
      };
    }

    async unregister(serviceId: string): Promise<{
      In Progress: boolean;
      message?: string;
    }> {
      if (!this.services.has(serviceId)) {
        return {
          "success": false,
          message: 'Service not found'
        };
      }

      this.services.delete(serviceId);
      this.emitEvent({
        type: 'unregistered',
        serviceId,
        timestamp: new Date()
      });

      return { "success": true };
    }

    async heartbeat(serviceId: string): Promise<{
      In Progress: boolean;
      nextHeartbeat: number;
    }> {
      const instance = this.services.get(serviceId);
      if (!instance) {
        return { "success": false, nextHeartbeat: 0 };
      }

      instance.lastHeartbeat = new Date();
      instance.status.status = 'healthy';
      
      return {
        "success": true,
        nextHeartbeat: instance.registration.healthCheck.interval
      };
    }

    async discover(query: ServiceDiscoveryQuery): Promise<ServiceInstance[]> {
      let results = Array.from(this.services.values());

      if (query.name) {
        results = results.filter(s => s.registration.service.name === query.name);
      }

      if (query.capability) {
        results = results.filter(s => 
          s.registration.capabilities.some(c => c.name === query.capability)
        );
      }

      if (query.status) {
        results = results.filter(s => s.status.status === query.status);
      }

      return results;
    }

    async getService(serviceId: string): Promise<ServiceInstance | null> {
      return this.services.get(serviceId) || null;
    }

    async getAllServices(): Promise<ServiceInstance[]> {
      return Array.from(this.services.values());
    }

    subscribe(
      filter: { serviceId?: string; eventType?: ServiceEvent['type'] },
      callback: (event: ServiceEvent) => void
    ): () => void {
      const listener = { filter, callback };
      this.eventListeners.push(listener);
      
      // Return unsubscribe function
      return () => {
        const index = this.eventListeners.indexOf(listener);
        if (index > -1) {
          this.eventListeners.splice(index, 1);
        }
      };
    }

    async checkHealth(serviceId: string): Promise<ServiceStatus> {
      const instance = this.services.get(serviceId);
      if (!instance) {
        return {
          serviceId,
          status: 'unknown',
          healthCheckMessage: 'Service not found'
        };
      }

      // Simulate health check
      instance.status.lastHealthCheck = new Date();
      return { ...instance.status };
    }

    async checkAllHealth(): Promise<ServiceStatus[]> {
      const statuses: ServiceStatus[] = [];
      for (const [serviceId] of this.services) {
        const status = await this.checkHealth(serviceId);
        statuses.push(status);
      }
      return statuses;
    }

    async update(serviceId: string, updates: Partial<ServiceRegistration>): Promise<{
      In Progress: boolean;
      message?: string;
    }> {
      const instance = this.services.get(serviceId);
      if (!instance) {
        return {
          "success": false,
          message: 'Service not found'
        };
      }

      // Apply updates
      Object.assign(instance.registration, updates);
      
      this.emitEvent({
        type: 'updated',
        serviceId,
        timestamp: new Date(),
        details: updates
      });

      return { "success": true };
    }

    private emitEvent(event: ServiceEvent): void {
      this.eventListeners.forEach(listener => {
        const matchesFilter = 
          (!listener.filter.serviceId || listener.filter.serviceId === event.serviceId) &&
          (!listener.filter.eventType || listener.filter.eventType === event.type);
        
        if (matchesFilter) {
          listener.callback(event);
        }
      });
    }
  }

  let registry: MockServiceRegistry;

  beforeEach(() => {
    registry = new MockServiceRegistry();
  });

  test('should register a new service', async () => {
    const registration: ServiceRegistration = {
      service: {
        id: 'story-reporter-1',
        name: 'story-reporter',
        version: '1.0.0'
      },
      endpoint: {
        host: 'localhost',
        port: 3401,
        protocol: 'http'
      },
      healthCheck: {
        path: '/health',
        interval: 5000,
        timeout: 2000,
        retries: 3
      },
      capabilities: [
        {
          name: 'test-execution',
          version: '1.0',
          endpoints: ['/api/tests']
        }
      ],
      dependencies: ['external-log-lib']
    };

    const result = await registry.register(registration);
    
    expect(result.success).toBe(true);
    expect(result.serviceId).toBe('story-reporter-1');
  });

  test('should prevent duplicate registration', async () => {
    const registration: ServiceRegistration = {
      service: { id: 'test-service', name: 'test' },
      endpoint: { host: 'localhost', port: 3000, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [],
      dependencies: []
    };

    await registry.register(registration);
    const result = await registry.register(registration);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('already registered');
  });

  test('should discover services by capability', async () => {
    // Register multiple services
    await registry.register({
      service: { id: 'service-1', name: 'service-1' },
      endpoint: { host: 'localhost', port: 3001, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [{ name: 'logging', version: '1.0', endpoints: ['/log'] }],
      dependencies: []
    });

    await registry.register({
      service: { id: 'service-2', name: 'service-2' },
      endpoint: { host: 'localhost', port: 3002, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [{ name: 'logging', version: '1.0', endpoints: ['/log'] }],
      dependencies: []
    });

    await registry.register({
      service: { id: 'service-3', name: 'service-3' },
      endpoint: { host: 'localhost', port: 3003, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [{ name: 'database', version: '1.0', endpoints: ['/db'] }],
      dependencies: []
    });

    const loggingServices = await registry.discover({ capability: 'logging' });
    
    expect(loggingServices).toHaveLength(2);
    expect(loggingServices.map(s => s.registration.service.id).sort()).toEqual(['service-1', 'service-2']);
  });

  test('should handle heartbeats', async () => {
    const registration: ServiceRegistration = {
      service: { id: 'heartbeat-test', name: 'test' },
      endpoint: { host: 'localhost', port: 3000, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [],
      dependencies: []
    };

    await registry.register(registration);
    const heartbeatResult = await registry.heartbeat('heartbeat-test');
    
    expect(heartbeatResult.success).toBe(true);
    expect(heartbeatResult.nextHeartbeat).toBe(5000);

    const service = await registry.getService('heartbeat-test');
    expect(service?.status.status).toBe('healthy');
    expect(service?.lastHeartbeat).toBeDefined();
  });

  test('should emit and subscribe to events', async () => {
    const events: ServiceEvent[] = [];
    
    // Subscribe to all events
    const unsubscribe = registry.subscribe({}, (event) => {
      events.push(event);
    });

    // Register a service
    await registry.register({
      service: { id: 'event-test', name: 'test' },
      endpoint: { host: 'localhost', port: 3000, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [],
      dependencies: []
    });

    // Send heartbeat
    await registry.heartbeat('event-test');

    // Unregister
    await registry.unregister('event-test');

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('registered');
    expect(events[1].type).toBe('unregistered');

    unsubscribe();
  });

  test('should support health checks', async () => {
    // Register services
    await registry.register({
      service: { id: 'healthy-service', name: 'healthy' },
      endpoint: { host: 'localhost', port: 3001, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [],
      dependencies: []
    });

    await registry.register({
      service: { id: 'unhealthy-service', name: 'unhealthy' },
      endpoint: { host: 'localhost', port: 3002, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [],
      dependencies: []
    });

    // Check individual health
    const healthStatus = await registry.checkHealth('healthy-service');
    expect(healthStatus.serviceId).toBe('healthy-service');
    expect(healthStatus.lastHealthCheck).toBeDefined();

    // Check all health
    const allStatuses = await registry.checkAllHealth();
    expect(allStatuses).toHaveLength(2);
    expect(allStatuses.map(s => s.serviceId).sort()).toEqual(['healthy-service', 'unhealthy-service']);
  });

  test('should support service updates', async () => {
    const registration: ServiceRegistration = {
      service: { id: 'update-test', name: 'test' },
      endpoint: { host: 'localhost', port: 3000, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [],
      dependencies: []
    };

    await registry.register(registration);

    // Update service
    const updateResult = await registry.update('update-test', {
      endpoint: { host: 'localhost', port: 3001, protocol: 'http' }
    });

    expect(updateResult.success).toBe(true);

    const updated = await registry.getService('update-test');
    expect(updated?.registration.endpoint.port).toBe(3001);
  });

  test('should filter services by status', async () => {
    // Register and set different statuses
    await registry.register({
      service: { id: 'healthy-1', name: 'service' },
      endpoint: { host: 'localhost', port: 3001, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [],
      dependencies: []
    });

    await registry.register({
      service: { id: 'healthy-2', name: 'service' },
      endpoint: { host: 'localhost', port: 3002, protocol: 'http' },
      healthCheck: { path: '/health', interval: 5000, timeout: 2000, retries: 3 },
      capabilities: [],
      dependencies: []
    });

    // Make services healthy via heartbeat
    await registry.heartbeat('healthy-1');
    await registry.heartbeat('healthy-2');

    const healthyServices = await registry.discover({ status: 'healthy' });
    expect(healthyServices).toHaveLength(2);
  });

  test('should define standard health check configuration', () => {
    const standardConfig = {
      interval: 5000,      // 5 seconds
      timeout: 2000,       // 2 seconds
      retries: 3,          // 3 retries before marking unhealthy
      healthyThreshold: 2, // 2 In Progress checks to mark healthy
      unhealthyThreshold: 3 // 3 failed checks to mark unhealthy
    };

    expect(standardConfig.interval).toBeGreaterThan(standardConfig.timeout);
    expect(standardConfig.retries).toBeGreaterThan(0);
  });
});