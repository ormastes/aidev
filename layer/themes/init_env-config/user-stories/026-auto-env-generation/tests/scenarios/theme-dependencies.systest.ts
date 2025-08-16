/**
 * Scenario Test: Service discovery URLs are automatically included when themes depend on each other
 * 
 * This test verifies that when multiple themes have dependencies on each other,
 * the service discovery mechanism automatically includes the correct service URLs
 * in the generated .env files.
 */

import { EnvGenerator, EnvGeneratorConfig } from '../../src/external/env-generator';
import { ServiceDiscovery } from '../../src/external/service-discovery';
import { EnvGeneratorImpl } from '../../src/implementations/env-generator-impl';
import { ServiceDiscoveryImpl } from '../../src/implementations/service-discovery-impl';
import { TokenServiceImpl } from '../../src/implementations/token-service-impl';

describe('Scenario: Service discovery URLs are automatically included when themes depend on each other', () => {
  let envGenerator: EnvGenerator;
  let serviceDiscovery: ServiceDiscovery;
  
  beforeEach(async () => {
    serviceDiscovery = new ServiceDiscoveryImpl();
    const tokenService = new TokenServiceImpl();
    envGenerator = new EnvGeneratorImpl(serviceDiscovery, tokenService);
  });
  
  afterEach(async () => {
    // Clean up all registered services
    const services = [
      'auth-theme', 'user-theme', 'notification-theme', 
      'api-gateway-theme', 'frontend-theme', 'admin-theme',
      'shared-cache-theme', 'logger-theme'
    ];
    
    for (const service of services) {
      for (const env of ["development", 'test', 'release', 'shared']) {
        try {
          await serviceDiscovery.unregisterService(service, env);
        } catch (e) {
          // Ignore
        }
      }
    }
  });
  
  it('should include direct dependency URLs in generated .env file', async () => {
    // Given: Auth theme is registered
    await serviceDiscovery.registerService({
      name: 'auth-theme',
      port: 4000,
      environment: "development",
      healthCheckPath: '/health'
    });
    
    // And: User theme depends on auth theme
    await serviceDiscovery.registerService({
      name: 'user-theme',
      port: 4001,
      environment: "development",
      dependencies: ['auth-theme']
    });
    
    // When: Generating env file for user theme
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'user-theme',
      servicePort: 4001
    };
    
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Auth theme URL should be included
    expect(result.content).toContain('AUTH_THEME_URL=http://localhost:4000');
    expect(result.content).toContain('AUTH_THEME_HEALTH_URL=http://localhost:4000/health');
  });
  
  it('should include transitive dependency URLs through dependency chain', async () => {
    // Given: A chain of dependencies: Frontend -> API Gateway -> Auth & User
    await serviceDiscovery.registerService({
      name: 'auth-theme',
      port: 4000,
      environment: "development"
    });
    
    await serviceDiscovery.registerService({
      name: 'user-theme',
      port: 4001,
      environment: "development"
    });
    
    await serviceDiscovery.registerService({
      name: 'api-gateway-theme',
      port: 8080,
      environment: "development",
      dependencies: ['auth-theme', 'user-theme']
    });
    
    await serviceDiscovery.registerService({
      name: 'frontend-theme',
      port: 3000,
      environment: "development",
      dependencies: ['api-gateway-theme']
    });
    
    // When: Generating env file for frontend theme
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'frontend-theme',
      servicePort: 3000
    };
    
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: All transitive dependencies should be included
    expect(result.content).toContain('API_GATEWAY_THEME_URL=http://localhost:8080');
    expect(result.content).toContain('AUTH_THEME_URL=http://localhost:4000');
    expect(result.content).toContain('USER_THEME_URL=http://localhost:4001');
  });
  
  it('should handle cross-environment dependencies correctly', async () => {
    // Given: Shared cache service in 'shared' environment
    await serviceDiscovery.registerService({
      name: 'shared-cache-theme',
      port: 6379,
      environment: 'shared',
      healthCheckPath: '/health'
    });
    
    // And: API service in "development" that depends on shared cache
    await serviceDiscovery.registerService({
      name: 'api-theme',
      port: 5000,
      environment: "development",
      dependencies: ['shared-cache-theme']
    });
    
    // When: Generating env file for API theme
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'api-theme',
      servicePort: 5000
    };
    
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Shared cache URL should be included
    expect(result.content).toContain('SHARED_CACHE_THEME_URL=http://localhost:6379');
    expect(result.content).toContain('SHARED_CACHE_THEME_HEALTH_URL=http://localhost:6379/health');
  });
  
  it('should handle circular dependencies gracefully', async () => {
    // Given: Services with circular dependencies
    await serviceDiscovery.registerService({
      name: 'service-a',
      port: 7001,
      environment: "development",
      dependencies: ['service-b']
    });
    
    await serviceDiscovery.registerService({
      name: 'service-b',
      port: 7002,
      environment: "development",
      dependencies: ['service-c']
    });
    
    await serviceDiscovery.registerService({
      name: 'service-c',
      port: 7003,
      environment: "development",
      dependencies: ['service-a'] // Creates circular dependency
    });
    
    // When: Generating env file for service-a
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'service-a',
      servicePort: 7001
    };
    
    // Then: Should not throw and should include all services once
    const result = await envGenerator.generateEnvFile(config);
    
    expect(result.content).toContain('SERVICE_B_URL=http://localhost:7002');
    expect(result.content).toContain('SERVICE_C_URL=http://localhost:7003');
    
    // Verify no duplicate entries
    const serviceBCount = (result.content.match(/SERVICE_B_URL=/g) || []).length;
    const serviceCCount = (result.content.match(/SERVICE_C_URL=/g) || []).length;
    
    expect(serviceBCount).toBe(1);
    expect(serviceCCount).toBe(1);
  });
  
  it('should only include healthy services in dependency URLs', async () => {
    // Given: Multiple services with different health statuses
    await serviceDiscovery.registerService({
      name: 'healthy-service',
      port: 8001,
      environment: "development"
    });
    
    await serviceDiscovery.registerService({
      name: 'unhealthy-service',
      port: 8002,
      environment: "development"
    });
    
    // Mark one service as unhealthy
    await serviceDiscovery.updateServiceStatus('unhealthy-service', "development", "unhealthy");
    
    await serviceDiscovery.registerService({
      name: 'consumer-service',
      port: 8003,
      environment: "development",
      dependencies: ['healthy-service', 'unhealthy-service']
    });
    
    // When: Generating env file for consumer service
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'consumer-service',
      servicePort: 8003
    };
    
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Only healthy service URL should be included
    expect(result.content).toContain('HEALTHY_SERVICE_URL=http://localhost:8001');
    expect(result.content).not.toContain('UNHEALTHY_SERVICE_URL');
  });
  
  it('should handle complex multi-theme architecture', async () => {
    // Given: A complex microservices architecture
    // Core services
    await serviceDiscovery.registerService({
      name: 'auth-theme',
      port: 4000,
      environment: 'release',
      host: 'auth.prod.com',
      healthCheckPath: '/api/health'
    });
    
    await serviceDiscovery.registerService({
      name: 'user-theme',
      port: 4001,
      environment: 'release',
      host: 'user.prod.com',
      dependencies: ['auth-theme'],
      healthCheckPath: '/api/health'
    });
    
    await serviceDiscovery.registerService({
      name: 'notification-theme',
      port: 4002,
      environment: 'release',
      host: 'notify.prod.com',
      dependencies: ['user-theme']
    });
    
    // Shared services
    await serviceDiscovery.registerService({
      name: 'logger-theme',
      port: 5001,
      environment: 'shared',
      host: 'logger.internal.com'
    });
    
    // API Gateway depends on all core services and logger
    await serviceDiscovery.registerService({
      name: 'api-gateway-theme',
      port: 443,
      protocol: 'https',
      environment: 'release',
      host: 'api.prod.com',
      dependencies: ['auth-theme', 'user-theme', 'notification-theme', 'logger-theme']
    });
    
    // Frontend depends on API Gateway
    await serviceDiscovery.registerService({
      name: 'frontend-theme',
      port: 443,
      protocol: 'https',
      environment: 'release',
      host: 'app.prod.com',
      dependencies: ['api-gateway-theme']
    });
    
    // Admin panel depends on API Gateway and has direct access to user service
    await serviceDiscovery.registerService({
      name: 'admin-theme',
      port: 443,
      protocol: 'https',
      environment: 'release',
      host: 'admin.prod.com',
      dependencies: ['api-gateway-theme', 'user-theme']
    });
    
    // When: Generating env files for different themes
    const frontendConfig: EnvGeneratorConfig = {
      environment: 'release',
      serviceName: 'frontend-theme',
      servicePort: 443
    };
    
    const adminConfig: EnvGeneratorConfig = {
      environment: 'release',
      serviceName: 'admin-theme',
      servicePort: 443
    };
    
    const frontendResult = await envGenerator.generateEnvFile(frontendConfig);
    const adminResult = await envGenerator.generateEnvFile(adminConfig);
    
    // Then: Frontend should have all transitive dependencies
    expect(frontendResult.content).toContain('API_GATEWAY_THEME_URL=https://api.prod.com:443');
    expect(frontendResult.content).toContain('AUTH_THEME_URL=http://auth.prod.com:4000');
    expect(frontendResult.content).toContain('USER_THEME_URL=http://user.prod.com:4001');
    expect(frontendResult.content).toContain('NOTIFICATION_THEME_URL=http://notify.prod.com:4002');
    expect(frontendResult.content).toContain('LOGGER_THEME_URL=http://logger.internal.com:5001');
    
    // And: Admin should have its specific dependencies
    expect(adminResult.content).toContain('API_GATEWAY_THEME_URL=https://api.prod.com:443');
    expect(adminResult.content).toContain('USER_THEME_URL=http://user.prod.com:4001');
    
    // And: Health check URLs should be included where available
    expect(frontendResult.content).toContain('AUTH_THEME_HEALTH_URL=http://auth.prod.com:4000/api/health');
    expect(frontendResult.content).toContain('USER_THEME_HEALTH_URL=http://user.prod.com:4001/api/health');
  });
  
  it('should update dependencies when services are re-registered', async () => {
    // Given: Initial service registration
    await serviceDiscovery.registerService({
      name: 'service-x',
      port: 9001,
      environment: "development",
      dependencies: ['service-y']
    });
    
    await serviceDiscovery.registerService({
      name: 'service-y',
      port: 9002,
      environment: "development"
    });
    
    // When: Service X is re-registered with new dependencies
    await serviceDiscovery.registerService({
      name: 'service-x',
      port: 9001,
      environment: "development",
      dependencies: ['service-y', 'service-z']
    });
    
    await serviceDiscovery.registerService({
      name: 'service-z',
      port: 9003,
      environment: "development"
    });
    
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'service-x',
      servicePort: 9001
    };
    
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Both old and new dependencies should be included
    expect(result.content).toContain('SERVICE_Y_URL=http://localhost:9002');
    expect(result.content).toContain('SERVICE_Z_URL=http://localhost:9003');
  });
});