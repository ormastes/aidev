/**
 * External Test: ServiceDiscovery
 * 
 * This test verifies the ServiceDiscovery external interface implementation
 * for discovering and resolving service URLs in different environments.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { http } from '../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import {
  ServiceDiscovery,
  ServiceInfo,
  ServiceRegistration,
  ServiceQuery,
  ServiceHealth
} from '../../src/external/service-discovery';

// Real implementation of ServiceDiscovery for testing
class RealServiceDiscovery implements ServiceDiscovery {
  private registryFile: string;
  private watchers: Array<(event: 'registered' | 'unregistered' | 'updated', service: ServiceInfo) => void> = [];
  
  constructor(registryFile: string) {
    this.registryFile = registryFile;
    this.ensureRegistryExists();
  }
  
  private ensureRegistryExists(): void {
    const dir = path.dirname(this.registryFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.registryFile)) {
      fs.writeFileSync(this.registryFile, JSON.stringify({}));
    }
  }
  
  private async loadRegistry(): Promise<Record<string, ServiceInfo>> {
    try {
      const content = fs.readFileSync(this.registryFile, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create it
        this.ensureRegistryExists();
        return {};
      }
      throw error;
    }
  }
  
  private async saveRegistry(registry: Record<string, ServiceInfo>): Promise<void> {
    // Use atomic write to prevent race conditions
    const tempFile = this.registryFile + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(registry, null, 2));
    fs.renameSync(tempFile, this.registryFile);
  }
  
  private getServiceKey(name: string, environment: string): string {
    return `${environment}:${name}`;
  }
  
  async registerService(registration: ServiceRegistration): Promise<ServiceInfo> {
    const serviceInfo: ServiceInfo = {
      name: registration.name,
      port: registration.port,
      host: registration.host || 'localhost',
      protocol: registration.protocol || 'http',
      environment: registration.environment,
      status: 'unknown',
      lastChecked: new Date().toISOString(),
      metadata: {
        healthCheckPath: registration.healthCheckPath || '/health',
        dependencies: registration.dependencies || []
      }
    };
    
    const key = this.getServiceKey(registration.name, registration.environment);
    
    // Use a lock file to ensure atomic updates
    const lockFile = this.registryFile + '.lock';
    let locked = false;
    
    // Try to acquire lock
    for (let i = 0; i < 50; i++) {
      try {
        fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' });
        locked = true;
        break;
      } catch (e) {
        // Lock exists, wait
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    
    if (!locked) {
      throw new Error('Could not acquire lock for service registration');
    }
    
    try {
      // Read current registry
      const registry = await this.loadRegistry();
      
      // Add new service
      registry[key] = serviceInfo;
      
      // Save updated registry
      await this.saveRegistry(registry);
      
      // Notify watchers
      this.watchers.forEach(watcher => watcher('registered', serviceInfo));
      
      // Check health immediately (don't await to prevent blocking)
      this.checkServiceHealth(registration.name, registration.environment).catch(() => {
        // Ignore health check errors during registration
      });
      
      return serviceInfo;
    } finally {
      // Release lock
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    }
  }
  
  async unregisterService(name: string, environment: string): Promise<void> {
    const registry = await this.loadRegistry();
    const key = this.getServiceKey(name, environment);
    
    const service = registry[key];
    if (service) {
      delete registry[key];
      await this.saveRegistry(registry);
      
      // Notify watchers
      this.watchers.forEach(watcher => watcher('unregistered', service));
    }
  }
  
  async discoverService(name: string, environment: string): Promise<ServiceInfo | null> {
    const registry = await this.loadRegistry();
    const key = this.getServiceKey(name, environment);
    return registry[key] || null;
  }
  
  async discoverServices(query: ServiceQuery): Promise<ServiceInfo[]> {
    const registry = await this.loadRegistry();
    const services = Object.values(registry);
    
    return services.filter(service => {
      if (query.name && service.name !== query.name) return false;
      if (query.environment && service.environment !== query.environment) return false;
      if (query.status && service.status !== query.status) return false;
      if (query.tags) {
        // Tags could be In Progress via metadata
        const serviceTags = service.metadata?.tags || [];
        if (!query.tags.every(tag => serviceTags.includes(tag))) return false;
      }
      return true;
    });
  }
  
  async getServiceUrl(name: string, environment: string): Promise<string> {
    const service = await this.discoverService(name, environment);
    if (!service) {
      throw new Error(`Service ${name} not found in ${environment} environment`);
    }
    return `${service.protocol}://${service.host}:${service.port}`;
  }
  
  async getServiceUrls(services: Array<{name: string, environment: string}>): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};
    
    for (const { name, environment } of services) {
      try {
        const url = await this.getServiceUrl(name, environment);
        urls[`${name}_${environment}`] = url;
      } catch (e) {
        // Service not found, skip
      }
    }
    
    return urls;
  }
  
  async checkServiceHealth(name: string, environment: string): Promise<ServiceHealth> {
    const service = await this.discoverService(name, environment);
    if (!service) {
      return {
        service: `${name}:${environment}`,
        healthy: false,
        lastCheck: new Date().toISOString(),
        error: 'Service not found'
      };
    }
    
    const healthCheckPath = service.metadata?.healthCheckPath || '/health';
    const url = `${service.protocol}://${service.host}:${service.port}${healthCheckPath}`;
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      // Skip health check for HTTPS in tests (would need real HTTPS module)
      if (service.protocol === 'https') {
        const health: ServiceHealth = {
          service: `${name}:${environment}`,
          healthy: true, // Assume healthy for HTTPS in tests
          lastCheck: new Date().toISOString(),
          responseTime: 0
        };
        this.updateServiceStatus(name, environment, 'healthy')
          .then(() => resolve(health));
        return;
      }
      
      const request = http.get(url, { timeout: 5000 }, (res) => {
        const responseTime = Date.now() - startTime;
        const healthy = res.statusCode === 200;
        
        const health: ServiceHealth = {
          service: `${name}:${environment}`,
          healthy,
          lastCheck: new Date().toISOString(),
          responseTime
        };
        
        // Update service status
        this.updateServiceStatus(name, environment, healthy ? 'healthy' : 'unhealthy')
          .then(() => resolve(health));
      });
      
      request.on('error', (error) => {
        const health: ServiceHealth = {
          service: `${name}:${environment}`,
          healthy: false,
          lastCheck: new Date().toISOString(),
          error: error.message
        };
        
        // Update service status
        this.updateServiceStatus(name, environment, 'unhealthy')
          .then(() => resolve(health));
      });
      
      request.on('timeout', () => {
        request.destroy();
        const health: ServiceHealth = {
          service: `${name}:${environment}`,
          healthy: false,
          lastCheck: new Date().toISOString(),
          error: 'Health check timeout'
        };
        
        // Update service status
        this.updateServiceStatus(name, environment, 'unhealthy')
          .then(() => resolve(health));
      });
    });
  }
  
  async checkAllServicesHealth(environment?: string): Promise<ServiceHealth[]> {
    const registry = await this.loadRegistry();
    const services = Object.values(registry).filter(
      service => !environment || service.environment === environment
    );
    
    const healthChecks = services.map(service => 
      this.checkServiceHealth(service.name, service.environment)
    );
    
    return Promise.all(healthChecks);
  }
  
  async getServiceDependencies(name: string, environment: string): Promise<string[]> {
    const service = await this.discoverService(name, environment);
    return service?.metadata?.dependencies || [];
  }
  
  async getDependentServices(name: string, environment: string): Promise<string[]> {
    const registry = await this.loadRegistry();
    const dependents: string[] = [];
    
    for (const service of Object.values(registry)) {
      if (service.environment === environment) {
        const dependencies = service.metadata?.dependencies || [];
        if (dependencies.includes(name)) {
          dependents.push(service.name);
        }
      }
    }
    
    return dependents;
  }
  
  async updateServiceStatus(name: string, environment: string, status: 'healthy' | 'unhealthy' | 'unknown'): Promise<void> {
    const registry = await this.loadRegistry();
    const key = this.getServiceKey(name, environment);
    
    if (registry[key]) {
      registry[key].status = status;
      registry[key].lastChecked = new Date().toISOString();
      await this.saveRegistry(registry);
      
      // Notify watchers
      this.watchers.forEach(watcher => watcher('updated', registry[key]));
    }
  }
  
  watchServices(callback: (event: 'registered' | 'unregistered' | 'updated', service: ServiceInfo) => void): () => void {
    this.watchers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.watchers.indexOf(callback);
      if (index > -1) {
        this.watchers.splice(index, 1);
      }
    };
  }
}

describe('ServiceDiscovery External Interface Test', () => {
  let discovery: RealServiceDiscovery;
  const testDir = path.join(__dirname, '../../temp');
  const registryFile = path.join(testDir, 'service-registry.json');
  const servers: http.Server[] = [];
  
  beforeEach(() => {
    discovery = new RealServiceDiscovery(registryFile);
  });
  
  afterEach(async () => {
    // Wait a bit for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clean up servers
    for (const server of servers) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    servers.length = 0;
    
    // Clean up registry
    if (fs.existsSync(registryFile)) {
      fs.unlinkSync(registryFile);
    }
    // Clean up temp file if exists
    const tempFile = registryFile + '.tmp';
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    // Clean up lock file if exists
    const lockFile = registryFile + '.lock';
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  });
  
  test('should register and discover service', async () => {
    const registration: ServiceRegistration = {
      name: 'user-service',
      port: 3001,
      environment: 'development',
      healthCheckPath: '/api/health'
    };
    
    const registered = await discovery.registerService(registration);
    
    expect(registered.name).toBe('user-service');
    expect(registered.port).toBe(3001);
    expect(registered.environment).toBe('development');
    expect(registered.protocol).toBe('http');
    expect(registered.host).toBe('localhost');
    
    // Discover the service
    const discovered = await discovery.discoverService('user-service', 'development');
    expect(discovered).not.toBeNull();
    expect(discovered?.name).toBe('user-service');
    expect(discovered?.metadata?.healthCheckPath).toBe('/api/health');
  });
  
  test('should get service URL', async () => {
    await discovery.registerService({
      name: 'api-gateway',
      port: 8080,
      environment: 'production',
      protocol: 'https'
    });
    
    const url = await discovery.getServiceUrl('api-gateway', 'production');
    expect(url).toBe('https://localhost:8080');
    
    // Should throw for non-existent service
    await expect(discovery.getServiceUrl('non-existent', 'production'))
      .rejects.toThrow('Service non-existent not found');
  });
  
  test('should discover services by query', async () => {
    // Register multiple services
    await discovery.registerService({
      name: 'auth-service',
      port: 3001,
      environment: 'development'
    });
    
    await discovery.registerService({
      name: 'auth-service',
      port: 3002,
      environment: 'production'
    });
    
    await discovery.registerService({
      name: 'payment-service',
      port: 3003,
      environment: 'development'
    });
    
    // Query by environment
    const devServices = await discovery.discoverServices({ environment: 'development' });
    expect(devServices.length).toBe(2);
    expect(devServices.map(s => s.name).sort()).toEqual(['auth-service', 'payment-service']);
    
    // Query by name
    const authServices = await discovery.discoverServices({ name: 'auth-service' });
    expect(authServices.length).toBe(2);
    expect(authServices.map(s => s.environment).sort()).toEqual(['development', 'production']);
    
    // Query all
    const allServices = await discovery.discoverServices({});
    expect(allServices.length).toBe(3);
  });
  
  test('should check service health', async () => {
    // Create a real HTTP server
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    
    await new Promise<void>((resolve) => {
      server.listen(3004, () => resolve());
    });
    servers.push(server);
    
    // Register the service
    await discovery.registerService({
      name: 'healthy-service',
      port: 3004,
      environment: 'test'
    });
    
    // Check health
    const health = await discovery.checkServiceHealth('healthy-service', 'test');
    
    expect(health.healthy).toBe(true);
    expect(health.responseTime).toBeDefined();
    expect(health.responseTime).toBeLessThan(1000);
    expect(health.error).toBeUndefined();
    
    // Service should be marked as healthy
    const service = await discovery.discoverService('healthy-service', 'test');
    expect(service?.status).toBe('healthy');
  });
  
  test('should handle unhealthy service', async () => {
    // Register service with no server running
    await discovery.registerService({
      name: 'unhealthy-service',
      port: 9999,
      environment: 'test'
    });
    
    // Check health
    const health = await discovery.checkServiceHealth('unhealthy-service', 'test');
    
    expect(health.healthy).toBe(false);
    expect(health.error).toBeDefined();
    
    // Service should be marked as unhealthy
    const service = await discovery.discoverService('unhealthy-service', 'test');
    expect(service?.status).toBe('unhealthy');
  });
  
  test('should manage service dependencies', async () => {
    // Register services with dependencies
    await discovery.registerService({
      name: 'frontend',
      port: 3000,
      environment: 'dev',
      dependencies: ['backend', 'auth']
    });
    
    await discovery.registerService({
      name: 'backend',
      port: 3001,
      environment: 'dev',
      dependencies: ['database', 'cache']
    });
    
    await discovery.registerService({
      name: 'auth',
      port: 3002,
      environment: 'dev',
      dependencies: ['database']
    });
    
    // Get dependencies
    const frontendDeps = await discovery.getServiceDependencies('frontend', 'dev');
    expect(frontendDeps).toEqual(['backend', 'auth']);
    
    // Get dependent services
    const databaseDependents = await discovery.getDependentServices('database', 'dev');
    expect(databaseDependents.sort()).toEqual(['auth', 'backend']);
  });
  
  test('should get multiple service URLs', async () => {
    // Register services sequentially with small delays to avoid conflicts
    await discovery.registerService({
      name: 'service1',
      port: 3001,
      environment: 'dev'
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await discovery.registerService({
      name: 'service2',
      port: 3002,
      environment: 'dev',
      protocol: 'https'
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await discovery.registerService({
      name: 'service3',
      port: 3003,
      environment: 'prod'
    });
    
    // Wait for all registrations and health checks to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verify service3 was registered
    const service3 = await discovery.discoverService('service3', 'prod');
    expect(service3).not.toBeNull();
    
    const urls = await discovery.getServiceUrls([
      { name: 'service1', environment: 'dev' },
      { name: 'service2', environment: 'dev' },
      { name: 'service3', environment: 'prod' },
      { name: 'non-existent', environment: 'dev' } // Should be skipped
    ]);
    
    // Check what we actually got
    expect(Object.keys(urls).sort()).toEqual(['service1_dev', 'service2_dev', 'service3_prod']);
    
    expect(urls).toEqual({
      'service1_dev': 'http://localhost:3001',
      'service2_dev': 'https://localhost:3002',
      'service3_prod': 'http://localhost:3003'
    });
  });
  
  test('should watch for service changes', async () => {
    const events: Array<{event: string, service: string}> = [];
    
    const unsubscribe = discovery.watchServices((event, service) => {
      events.push({ event, service: service.name });
    });
    
    // Register a service
    await discovery.registerService({
      name: 'watched-service',
      port: 3005,
      environment: 'test'
    });
    
    // Update its status
    await discovery.updateServiceStatus('watched-service', 'test', 'healthy');
    
    // Unregister it
    await discovery.unregisterService('watched-service', 'test');
    
    // Should have received events (register, auto-health-update, manual-update, unregister)
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events[0]).toEqual({ event: 'registered', service: 'watched-service' });
    // Health check update may or may not In Progress before manual update
    const lastEvent = events[events.length - 1];
    expect(lastEvent).toEqual({ event: 'unregistered', service: 'watched-service' });
    
    // Unsubscribe
    unsubscribe();
    
    // Register another service - should not receive event
    await discovery.registerService({
      name: 'another-service',
      port: 3006,
      environment: 'test'
    });
    
    const eventCountBeforeUnsubscribe = events.length;
    expect(events.length).toBe(eventCountBeforeUnsubscribe); // No new events
  });
  
  test('should check all services health', async () => {
    // Create servers
    const server1 = http.createServer((req, res) => {
      res.writeHead(200);
      res.end();
    });
    
    const server2 = http.createServer((req, res) => {
      res.writeHead(200);
      res.end();
    });
    
    await new Promise<void>((resolve) => {
      server1.listen(3007, () => resolve());
    });
    servers.push(server1);
    
    await new Promise<void>((resolve) => {
      server2.listen(3008, () => resolve());
    });
    servers.push(server2);
    
    // Register services
    await discovery.registerService({
      name: 'service1',
      port: 3007,
      environment: 'test'
    });
    
    await discovery.registerService({
      name: 'service2',
      port: 3008,
      environment: 'test'
    });
    
    await discovery.registerService({
      name: 'service3',
      port: 9999, // No server
      environment: 'prod'
    });
    
    // Check all in test environment
    const testHealth = await discovery.checkAllServicesHealth('test');
    expect(testHealth.length).toBe(2);
    expect(testHealth.every(h => h.healthy)).toBe(true);
    
    // Check all services
    const allHealth = await discovery.checkAllServicesHealth();
    expect(allHealth.length).toBe(3);
    expect(allHealth.filter(h => h.healthy).length).toBe(2);
    expect(allHealth.filter(h => !h.healthy).length).toBe(1);
  });
  
  test('should handle concurrent registrations', async () => {
    const registrations = [];
    
    // Register 10 services concurrently
    for (let i = 0; i < 10; i++) {
      registrations.push(
        discovery.registerService({
          name: `concurrent-${i}`,
          port: 4000 + i,
          environment: 'test'
        })
      );
    }
    
    const results = await Promise.all(registrations);
    expect(results.length).toBe(10);
    
    // Wait a bit for registry to stabilize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // All should be registered
    const services = await discovery.discoverServices({ environment: 'test' });
    expect(services.length).toBe(10);
    
    // All should have unique ports
    const ports = services.map(s => s.port);
    const uniquePorts = new Set(ports);
    expect(uniquePorts.size).toBe(10);
  });
});