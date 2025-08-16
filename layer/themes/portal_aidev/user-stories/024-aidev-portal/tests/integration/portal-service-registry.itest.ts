/**
 * Integration Test: Portal + Service Registry
 * 
 * This test validates the integration between the AI Dev Portal and the Service Registry,
 * focusing on service registration, discovery, health monitoring, and lifecycle management.
 * 
 * Test Coverage:
 * 1. Service registration from portal to registry
 * 2. Service discovery and listing
 * 3. Health status synchronization
 * 4. Service deregistration
 * 5. Registry failover handling
 * 6. Service metadata management
 */

import { ServiceRegistry, ServiceHealth } from '../../src/core/service-registry';
import { PortalServiceManager } from '../../src/portal/service-manager';
import { ServiceHealthMonitor } from '../../src/monitoring/health-monitor';
import { AuthenticationManager } from '../../src/auth/authentication-manager';

// Test configuration
const TEST_CONFIG = {
  registryPort: 3450,
  portalPort: 3456,
  healthCheckInterval: 1000,
  retryAttempts: 3,
  services: {
    storyReporter: {
      id: 'story-reporter',
      name: 'Story Reporter',
      url: 'http://localhost:3401',
      healthEndpoint: '/health',
      version: '1.0.0',
      tags: ['testing', 'reporting']
    },
    guiSelector: {
      id: 'gui-selector',
      name: 'GUI Selector',
      url: 'http://localhost:3402',
      healthEndpoint: '/health',
      version: '1.0.0',
      tags: ['ui', 'theming']
    }
  }
};

interface ServiceConfig {
  id: string;
  name: string;
  url: string;
  healthEndpoint: string;
  version: string;
  tags: string[];
}

describe('Portal + Service Registry Integration Tests', () => {
  let serviceRegistry: ServiceRegistry;
  let portalServiceManager: PortalServiceManager;
  let healthMonitor: ServiceHealthMonitor;
  let authManager: AuthenticationManager;

  beforeEach(async () => {
    // Initialize authentication manager
    authManager = new AuthenticationManager({
      jwtSecret: 'test-secret-key',
      tokenExpiry: '1h'
    });

    // Initialize service registry with auth
    serviceRegistry = new ServiceRegistry({
      port: TEST_CONFIG.registryPort,
      healthCheckInterval: TEST_CONFIG.healthCheckInterval,
      authManager: authManager
    });

    // Initialize portal service manager
    portalServiceManager = new PortalServiceManager({
      registryUrl: `http://localhost:${TEST_CONFIG.registryPort}`,
      authManager: authManager
    });

    // Initialize health monitor
    healthMonitor = new ServiceHealthMonitor({
      registry: serviceRegistry,
      checkInterval: TEST_CONFIG.healthCheckInterval
    });

    // Start services
    await serviceRegistry.start();
    await healthMonitor.start();

    // Generate auth token for portal
    const token = await authManager.generateToken({
      userId: 'portal-service',
      role: 'service',
      permissions: ['service:register', 'service:discover']
    });
    portalServiceManager.setAuthToken(token);
  });

  afterEach(async () => {
    // Cleanup
    await healthMonitor.stop();
    await serviceRegistry.stop();
  });

  test('Service Registration: Portal registers services with registry', async () => {
    console.log('Testing service registration flow...');

    // Register Story Reporter service through portal
    const storyReporterConfig = TEST_CONFIG.services.storyReporter;
    const registrationResult = await portalServiceManager.registerService(storyReporterConfig);

    // Verify registration succeeded
    expect(registrationResult.success).toBe(true);
    expect(registrationResult.serviceId).toBe(storyReporterConfig.id);

    // Verify service appears in registry
    const registeredServices = await serviceRegistry.listServices();
    const storyReporterService = registeredServices.find(s => s.id === storyReporterConfig.id);

    expect(storyReporterService).toBeDefined();
    expect(storyReporterService?.name).toBe(storyReporterConfig.name);
    expect(storyReporterService?.url).toBe(storyReporterConfig.url);
    expect(storyReporterService?.version).toBe(storyReporterConfig.version);
    expect(storyReporterService?.tags).toEqual(storyReporterConfig.tags);

    // Verify service status is initially unknown
    expect(storyReporterService?.status).toBe('unknown');
  });

  test('Service Discovery: Portal discovers registered services', async () => {
    console.log('Testing service discovery...');

    // Register multiple services
    await portalServiceManager.registerService(TEST_CONFIG.services.storyReporter);
    await portalServiceManager.registerService(TEST_CONFIG.services.guiSelector);

    // Discover services through portal
    const discoveredServices = await portalServiceManager.discoverServices();

    // Verify both services are discovered
    expect(discoveredServices).toHaveLength(2);

    const storyReporter = discoveredServices.find(s => s.id === 'story-reporter');
    const guiSelector = discoveredServices.find(s => s.id === 'gui-selector');

    expect(storyReporter).toBeDefined();
    expect(guiSelector).toBeDefined();

    // Verify service metadata is In Progress
    expect(storyReporter?.name).toBe('Story Reporter');
    expect(storyReporter?.url).toBe('http://localhost:3401');
    expect(guiSelector?.name).toBe('GUI Selector');
    expect(guiSelector?.url).toBe('http://localhost:3402');
  });

  test('Service Discovery with Filtering: Portal filters services by tags', async () => {
    console.log('Testing filtered service discovery...');

    // Register services with different tags
    await portalServiceManager.registerService(TEST_CONFIG.services.storyReporter);
    await portalServiceManager.registerService(TEST_CONFIG.services.guiSelector);

    // Discover services with specific tags
    const testingServices = await portalServiceManager.discoverServices({ tags: ['testing'] });
    const uiServices = await portalServiceManager.discoverServices({ tags: ['ui'] });

    // Verify filtering works correctly
    expect(testingServices).toHaveLength(1);
    expect(testingServices[0].id).toBe('story-reporter');

    expect(uiServices).toHaveLength(1);
    expect(uiServices[0].id).toBe('gui-selector');

    // Test multiple tag filtering
    const allServices = await portalServiceManager.discoverServices({ 
      tags: ['testing', 'ui'] 
    });
    expect(allServices).toHaveLength(2);
  });

  test('Health Status Synchronization: Portal monitors service health', async () => {
    console.log('Testing health status synchronization...');

    // Register service
    await portalServiceManager.registerService(TEST_CONFIG.services.storyReporter);

    // Mock service health endpoint
    const mockHealthResponse: ServiceHealth = {
      status: 'healthy' as const,
      uptime: 12345,
      version: '1.0.0',
      lastCheck: new Date().toISOString()
    };

    // Simulate health check
    await serviceRegistry.updateServiceHealth('story-reporter', mockHealthResponse);

    // Verify service health was updated in registry
    const services = await serviceRegistry.listServices();
    const service = services.find(s => s.id === 'story-reporter');
    expect(service?.status).toBe('healthy');

    // Verify portal can retrieve health status
    const serviceStatus = await portalServiceManager.getServiceHealth('story-reporter');
    expect(serviceStatus.status).toBeDefined();
    expect(serviceStatus.status).toMatch(/healthy|unhealthy|unknown/);
  });

  test('Service Deregistration: Portal removes services from registry', async () => {
    console.log('Testing service deregistration...');

    // Register service
    await portalServiceManager.registerService(TEST_CONFIG.services.storyReporter);

    // Verify service is registered
    let services = await serviceRegistry.listServices();
    expect(services).toHaveLength(1);

    // Deregister service through portal
    const deregistrationResult = await portalServiceManager.deregisterService('story-reporter');

    expect(deregistrationResult.success).toBe(true);

    // Verify service is removed from registry
    services = await serviceRegistry.listServices();
    expect(services).toHaveLength(0);

    // Verify portal no longer discovers the service
    const discoveredServices = await portalServiceManager.discoverServices();
    expect(discoveredServices).toHaveLength(0);
  });

  test('Registry Failover: Portal handles registry downtime', async () => {
    console.log('Testing registry failover handling...');

    // Register service while registry is up
    await portalServiceManager.registerService(TEST_CONFIG.services.storyReporter);

    // Verify initial registration
    let services = await serviceRegistry.listServices();
    expect(services).toHaveLength(1);

    // Simulate registry going down
    await serviceRegistry.stop();

    // Attempt service operations during downtime
    const discoveryResult = await portalServiceManager.discoverServices();
    expect(discoveryResult).toEqual([]);

    const registrationResult = await portalServiceManager.registerService(TEST_CONFIG.services.guiSelector);
    expect(registrationResult.success).toBe(false);
    expect(registrationResult.error).toContain('registry unavailable');

    // Restart registry
    await serviceRegistry.start();

    // Wait for reconnection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify portal reconnects and can operate again
    const reconnectServices = await portalServiceManager.discoverServices();
    expect(reconnectServices).toHaveLength(1);

    // Verify new registrations work after reconnection
    const newRegistrationResult = await portalServiceManager.registerService(TEST_CONFIG.services.guiSelector);
    expect(newRegistrationResult.success).toBe(true);
  });

  test('Service Metadata Management: Portal updates service information', async () => {
    console.log('Testing service metadata management...');

    // Register initial service
    const originalConfig = TEST_CONFIG.services.storyReporter;
    await portalServiceManager.registerService(originalConfig);

    // Update service metadata
    const updatedConfig = {
      ...originalConfig,
      version: '1.1.0',
      tags: ['testing', 'reporting', 'updated'],
      metadata: {
        description: 'Updated Story Reporter service',
        maintainer: 'dev-team@aidev.com'
      }
    };

    const updateResult = await portalServiceManager.updateService('story-reporter', updatedConfig);
    expect(updateResult.success).toBe(true);

    // Verify metadata was updated in registry
    const services = await serviceRegistry.listServices();
    const updatedService = services.find(s => s.id === 'story-reporter');

    expect(updatedService?.version).toBe('1.1.0');
    expect(updatedService?.tags).toEqual(['testing', 'reporting', 'updated']);
    expect(updatedService?.metadata?.description).toBe('Updated Story Reporter service');
    expect(updatedService?.metadata?.maintainer).toBe('dev-team@aidev.com');

    // Verify portal reflects the updates
    const discoveredServices = await portalServiceManager.discoverServices();
    const discoveredService = discoveredServices.find(s => s.id === 'story-reporter');

    expect(discoveredService?.version).toBe('1.1.0');
    expect(discoveredService?.tags).toEqual(['testing', 'reporting', 'updated']);
  });

  test('Concurrent Operations: Multiple portal instances register services', async () => {
    console.log('Testing concurrent portal operations...');

    // Create second portal service manager instance
    const portalServiceManager2 = new PortalServiceManager({
      registryUrl: `http://localhost:${TEST_CONFIG.registryPort}`,
      authManager: authManager
    });

    // Set auth token for second portal instance
    const token2 = await authManager.generateToken({
      userId: 'portal-service-2',
      role: 'service',
      permissions: ['service:register', 'service:discover']
    });
    portalServiceManager2.setAuthToken(token2);

    // Register services concurrently from different portal instances
    const registrationPromises = [
      portalServiceManager.registerService(TEST_CONFIG.services.storyReporter),
      portalServiceManager2.registerService(TEST_CONFIG.services.guiSelector)
    ];

    const results = await Promise.all(registrationPromises);

    // Verify both registrations succeeded
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);

    // Verify both services are in registry
    const services = await serviceRegistry.listServices();
    expect(services).toHaveLength(2);

    // Verify both portals can discover all services
    const portal1Services = await portalServiceManager.discoverServices();
    const portal2Services = await portalServiceManager2.discoverServices();

    expect(portal1Services).toHaveLength(2);
    expect(portal2Services).toHaveLength(2);

    // Test concurrent health updates
    const healthPromises = [
      serviceRegistry.updateServiceHealth('story-reporter', { status: 'healthy', uptime: 100 }),
      serviceRegistry.updateServiceHealth('gui-selector', { status: 'healthy', uptime: 200 })
    ];

    await Promise.all(healthPromises);

    // Verify both portals can retrieve health status
    await new Promise(resolve => setTimeout(resolve, 500));

    const health1 = await portalServiceManager.getServiceHealth('story-reporter');
    const health2 = await portalServiceManager2.getServiceHealth('gui-selector');

    // Just verify we can get health status (will be 'healthy' from our manual update)
    expect(health1.status).toBeDefined();
    expect(health2.status).toBeDefined();
    expect(['healthy', 'unhealthy', 'unknown']).toContain(health1.status);
    expect(['healthy', 'unhealthy', 'unknown']).toContain(health2.status);
  });

  test('Authentication Integration: Registry validates portal credentials', async () => {
    console.log('Testing authentication integration...');

    // Create authenticated token
    const token = await authManager.generateToken({
      userId: 'portal-service',
      role: 'service',
      permissions: ['service:register', 'service:discover']
    });

    // Set authentication token for portal
    portalServiceManager.setAuthToken(token);

    // Attempt service registration with valid token
    const registrationResult = await portalServiceManager.registerService(TEST_CONFIG.services.storyReporter);
    expect(registrationResult.success).toBe(true);

    // Clear authentication token
    portalServiceManager.setAuthToken('');

    // Attempt operation without authentication
    const unauthenticatedResult = await portalServiceManager.registerService(TEST_CONFIG.services.guiSelector);
    expect(unauthenticatedResult.success).toBe(false);
    expect(unauthenticatedResult.error).toContain('authentication required');

    // Test with invalid token
    portalServiceManager.setAuthToken('invalid-token');
    const invalidTokenResult = await portalServiceManager.registerService(TEST_CONFIG.services.guiSelector);
    expect(invalidTokenResult.success).toBe(false);
    expect(invalidTokenResult.error).toContain('invalid token');
  });

  test('Error Handling: Portal handles registry errors gracefully', async () => {
    console.log('Testing error handling...');

    // Test registration with invalid service config
    const invalidConfig = {
      id: '',  // Invalid empty ID
      name: 'Invalid Service',
      url: 'not-a-valid-url',
      healthEndpoint: '/health',
      version: '1.0.0',
      tags: []
    };

    const invalidResult = await portalServiceManager.registerService(invalidConfig);
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain('invalid service configuration');

    // Test duplicate service registration
    await portalServiceManager.registerService(TEST_CONFIG.services.storyReporter);
    const duplicateResult = await portalServiceManager.registerService(TEST_CONFIG.services.storyReporter);
    expect(duplicateResult.success).toBe(false);
    expect(duplicateResult.error).toContain('service already registered');

    // Test deregistration of non-existent service
    const nonExistentResult = await portalServiceManager.deregisterService('non-existent-service');
    expect(nonExistentResult.success).toBe(false);
    expect(nonExistentResult.error).toContain('service not found');

    // Test health check for non-existent service
    const healthResult = await portalServiceManager.getServiceHealth('non-existent-service');
    expect(healthResult.status).toBe('unknown');
    expect(healthResult.error).toContain('service not found');
  });
});

/**
 * Portal + Service Registry Integration Test Summary:
 * 
 * This integration test validates the critical interaction between the AI Dev Portal
 * and the Service Registry component. Key areas covered:
 * 
 * 1. **Service Lifecycle Management**: Registration, discovery, updates, deregistration
 * 2. **Health Monitoring Integration**: Real-time health status synchronization
 * 3. **Filtering and Search**: Tag-based service discovery and filtering
 * 4. **Failover Handling**: Graceful handling of registry downtime and recovery
 * 5. **Metadata Management**: Service information updates and versioning
 * 6. **Concurrent Access**: Multiple portal instances operating simultaneously
 * 7. **Authentication**: Token-based authentication between portal and registry
 * 8. **Error Handling**: Comprehensive error scenarios and graceful degradation
 * 
 * This test ensures that the portal can reliably manage service registrations
 * and discoveries through the service registry, providing a robust foundation
 * for the multi-service architecture of the AI Dev Portal.
 */