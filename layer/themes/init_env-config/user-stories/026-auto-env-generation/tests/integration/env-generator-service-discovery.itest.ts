/**
 * Integration Test: EnvGenerator integrates with ServiceDiscovery
 * 
 * This test verifies that the EnvGenerator correctly integrates with
 * ServiceDiscovery to include service URLs in generated .env files.
 */

import { EnvGenerator, EnvGeneratorConfig, EnvVariable } from '../../src/external/env-generator';
import { ServiceDiscovery, ServiceRegistration, ServiceInfo } from '../../src/external/service-discovery';
import { EnvGeneratorImpl } from '../../src/implementations/env-generator-impl';
import { ServiceDiscoveryImpl } from '../../src/implementations/service-discovery-impl';
import { TokenServiceImpl } from '../../src/implementations/token-service-impl';

describe('Integration: EnvGenerator with ServiceDiscovery', () => {
  let envGenerator: EnvGenerator;
  let serviceDiscovery: ServiceDiscovery;
  
  beforeEach(async () => {
    // Initialize real implementations with shared service discovery
    serviceDiscovery = new ServiceDiscoveryImpl();
    const tokenService = new TokenServiceImpl();
    envGenerator = new EnvGeneratorImpl(serviceDiscovery, tokenService);
    
    // Register some test services
    await registerTestServices();
  });
  
  afterEach(async () => {
    // Clean up registered services
    await cleanupTestServices();
  });
  
  describe("includeServiceUrls", () => {
    it('should include URLs for dependent services in .env file', async () => {
      // Arrange
      const dependencies = ['auth-service', 'database-service'];
      
      // Act
      const serviceUrls = await envGenerator.includeServiceUrls(dependencies);
      
      // Assert - should include URL and health check URL for auth-service, plus URL for database-service
      expect(serviceUrls).toHaveLength(3);
      
      const authUrl = serviceUrls.find(v => v.key === 'AUTH_SERVICE_URL');
      expect(authUrl).toBeDefined();
      expect(authUrl?.value).toBe('http://localhost:4000');
      
      const authHealthUrl = serviceUrls.find(v => v.key === 'AUTH_SERVICE_HEALTH_URL');
      expect(authHealthUrl).toBeDefined();
      expect(authHealthUrl?.value).toBe('http://localhost:4000/health');
      
      const dbUrl = serviceUrls.find(v => v.key === 'DATABASE_SERVICE_URL');
      expect(dbUrl).toBeDefined();
      expect(dbUrl?.value).toBe('http://localhost:5432');
    });
    
    it('should handle HTTPS services correctly', async () => {
      // Arrange - register an HTTPS service
      await serviceDiscovery.registerService({
        name: 'secure-api',
        port: 443,
        protocol: 'https',
        environment: 'release'
      });
      
      // Act
      const serviceUrls = await envGenerator.includeServiceUrls(['secure-api'], 'release');
      
      // Assert
      const secureUrl = serviceUrls.find(v => v.key === 'SECURE_API_URL');
      expect(secureUrl).toBeDefined();
      expect(secureUrl?.value).toMatch(/^https:\/\//);
    });
    
    it('should skip non-existent services gracefully', async () => {
      // Arrange
      const dependencies = ['auth-service', 'non-existent-service'];
      
      // Act
      const serviceUrls = await envGenerator.includeServiceUrls(dependencies);
      
      // Assert - auth-service has a health check path, so we get 2 URLs
      expect(serviceUrls).toHaveLength(2);
      expect(serviceUrls[0].key).toBe('AUTH_SERVICE_URL');
      expect(serviceUrls[1].key).toBe('AUTH_SERVICE_HEALTH_URL');
    });
  });
  
  describe('generateEnvFile with service discovery', () => {
    it('should automatically include dependent service URLs', async () => {
      // Arrange
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'api-gateway',
        servicePort: 8080
      };
      
      // Register api-gateway with dependencies
      await serviceDiscovery.registerService({
        name: 'api-gateway',
        port: 8080,
        environment: "development",
        dependencies: ['auth-service', 'user-service']
      });
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      const authUrl = result.variables.find(v => v.key === 'AUTH_SERVICE_URL');
      const userUrl = result.variables.find(v => v.key === 'USER_SERVICE_URL');
      
      expect(authUrl).toBeDefined();
      expect(userUrl).toBeDefined();
      expect(authUrl?.value).toBe('http://localhost:4000');
      expect(userUrl?.value).toBe('http://localhost:4001');
    });
    
    it('should use environment-specific service URLs', async () => {
      // Arrange
      // Register a frontend service with auth-service dependency
      await serviceDiscovery.registerService({
        name: "frontend",
        port: 3000,
        environment: "development",
        dependencies: ['auth-service']
      });
      
      await serviceDiscovery.registerService({
        name: "frontend",
        port: 3000,
        environment: 'release',
        dependencies: ['auth-service']
      });
      
      // Register auth-service in release with different host
      await serviceDiscovery.registerService({
        name: 'auth-service',
        port: 4000,
        host: 'auth.production.com',
        environment: 'release'
      });
      
      const devConfig: EnvGeneratorConfig = {
        environment: "development",
        serviceName: "frontend",
        servicePort: 3000
      };
      
      const releaseConfig: EnvGeneratorConfig = {
        environment: 'release',
        serviceName: "frontend",
        servicePort: 3000
      };
      
      // Act
      const devResult = await envGenerator.generateEnvFile(devConfig);
      const releaseResult = await envGenerator.generateEnvFile(releaseConfig);
      
      // Assert
      const devAuthUrl = devResult.variables.find(v => v.key === 'AUTH_SERVICE_URL');
      const releaseAuthUrl = releaseResult.variables.find(v => v.key === 'AUTH_SERVICE_URL');
      
      expect(devAuthUrl?.value).toContain("localhost");
      expect(releaseAuthUrl?.value).toBe('http://auth.production.com:4000');
    });
  });
  
  describe('service health integration', () => {
    it('should only include healthy services in .env', async () => {
      // Arrange
      // Mark one service as unhealthy
      await serviceDiscovery.updateServiceStatus('database-service', "development", "unhealthy");
      
      const dependencies = ['auth-service', 'database-service'];
      
      // Act
      const serviceUrls = await envGenerator.includeServiceUrls(dependencies);
      
      // Assert - auth-service has a health check path, so we get 2 URLs
      expect(serviceUrls).toHaveLength(2);
      expect(serviceUrls[0].key).toBe('AUTH_SERVICE_URL');
      expect(serviceUrls[1].key).toBe('AUTH_SERVICE_HEALTH_URL');
      // Database service should be excluded
    });
    
    it('should add health check URLs for services', async () => {
      // Arrange
      await serviceDiscovery.registerService({
        name: 'monitored-service',
        port: 9000,
        environment: "development",
        healthCheckPath: '/health'
      });
      
      // Register monitoring-client with monitored-service as dependency
      await serviceDiscovery.registerService({
        name: 'monitoring-client',
        port: 9001,
        environment: "development",
        dependencies: ['monitored-service']
      });
      
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'monitoring-client',
        servicePort: 9001
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      const serviceUrl = result.variables.find(v => v.key === 'MONITORED_SERVICE_URL');
      const healthUrl = result.variables.find(v => v.key === 'MONITORED_SERVICE_HEALTH_URL');
      expect(serviceUrl?.value).toBe('http://localhost:9000');
      expect(healthUrl?.value).toBe('http://localhost:9000/health');
    });
  });
  
  describe('cross-environment service discovery', () => {
    it('should handle services in different environments', async () => {
      // Arrange
      // Register services in different environments
      await serviceDiscovery.registerService({
        name: 'shared-cache',
        port: 6379,
        environment: 'shared'
      });
      
      // Register app-service with shared-cache as dependency
      await serviceDiscovery.registerService({
        name: 'app-service',
        port: 3000,
        environment: "development",
        dependencies: ['shared-cache']
      });
      
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'app-service',
        servicePort: 3000
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      const cacheUrl = result.variables.find(v => v.key === 'SHARED_CACHE_URL');
      expect(cacheUrl).toBeDefined();
      expect(cacheUrl?.value).toBe('http://localhost:6379');
    });
  });
  
  describe('service dependency chain', () => {
    it('should resolve transitive dependencies', async () => {
      // Arrange
      // Create a dependency chain: A -> B -> C
      await serviceDiscovery.registerService({
        name: 'service-c',
        port: 7003,
        environment: "development"
      });
      
      await serviceDiscovery.registerService({
        name: 'service-b',
        port: 7002,
        environment: "development",
        dependencies: ['service-c']
      });
      
      await serviceDiscovery.registerService({
        name: 'service-a',
        port: 7001,
        environment: "development",
        dependencies: ['service-b']
      });
      
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'service-a',
        servicePort: 7001
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      // Should include both direct (B) and transitive (C) dependencies
      const serviceBUrl = result.variables.find(v => v.key === 'SERVICE_B_URL');
      const serviceCUrl = result.variables.find(v => v.key === 'SERVICE_C_URL');
      
      expect(serviceBUrl).toBeDefined();
      expect(serviceCUrl).toBeDefined();
    });
  });
  
  describe('dynamic service updates', () => {
    it('should handle service registration during env generation', async () => {
      // Arrange
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'dynamic-client',
        servicePort: 8000
      };
      
      // Register a new service during the test
      setTimeout(async () => {
        await serviceDiscovery.registerService({
          name: 'late-service',
          port: 8001,
          environment: "development"
        });
      }, 100);
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      // The late service might or might not be included depending on timing
      // This test verifies the system doesn't crash with dynamic updates
      expect(result.variables).toBeDefined();
      expect(result.variables.length).toBeGreaterThan(0);
    });
  });
  
  describe('theme dependency integration', () => {
    it('should include service URLs when themes depend on each other', async () => {
      // Arrange - Set up a realistic multi-theme scenario
      // Theme 1: Authentication service
      await serviceDiscovery.registerService({
        name: 'auth-theme',
        port: 4000,
        environment: "development",
        healthCheckPath: '/api/health'
      });
      
      // Theme 2: User management service (depends on auth)
      await serviceDiscovery.registerService({
        name: 'user-theme',
        port: 4001,
        environment: "development",
        dependencies: ['auth-theme'],
        healthCheckPath: '/api/health'
      });
      
      // Theme 3: API Gateway (depends on both auth and user)
      await serviceDiscovery.registerService({
        name: 'api-gateway-theme',
        port: 8080,
        environment: "development",
        dependencies: ['auth-theme', 'user-theme']
      });
      
      // Theme 4: Frontend (depends on API Gateway)
      await serviceDiscovery.registerService({
        name: 'frontend-theme',
        port: 3000,
        environment: "development",
        dependencies: ['api-gateway-theme']
      });
      
      // Act - Generate env file for frontend theme
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'frontend-theme',
        servicePort: 3000,
        additionalVariables: [
          { key: 'REACT_APP_NAME', value: 'My App' }
        ]
      };
      
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      // Should include direct dependency (api-gateway)
      const apiGatewayUrl = result.variables.find(v => v.key === 'API_GATEWAY_THEME_URL');
      expect(apiGatewayUrl).toBeDefined();
      expect(apiGatewayUrl?.value).toBe('http://localhost:8080');
      
      // Should include transitive dependencies (auth and user)
      const authUrl = result.variables.find(v => v.key === 'AUTH_THEME_URL');
      expect(authUrl).toBeDefined();
      expect(authUrl?.value).toBe('http://localhost:4000');
      
      const authHealthUrl = result.variables.find(v => v.key === 'AUTH_THEME_HEALTH_URL');
      expect(authHealthUrl).toBeDefined();
      expect(authHealthUrl?.value).toBe('http://localhost:4000/api/health');
      
      const userUrl = result.variables.find(v => v.key === 'USER_THEME_URL');
      expect(userUrl).toBeDefined();
      expect(userUrl?.value).toBe('http://localhost:4001');
      
      const userHealthUrl = result.variables.find(v => v.key === 'USER_THEME_HEALTH_URL');
      expect(userHealthUrl).toBeDefined();
      expect(userHealthUrl?.value).toBe('http://localhost:4001/api/health');
      
      // Should include additional variables
      const appName = result.variables.find(v => v.key === 'REACT_APP_NAME');
      expect(appName?.value).toBe('My App');
      
      // Verify the generated content includes all service URLs
      expect(result.content).toContain('API_GATEWAY_THEME_URL=http://localhost:8080');
      expect(result.content).toContain('AUTH_THEME_URL=http://localhost:4000');
      expect(result.content).toContain('USER_THEME_URL=http://localhost:4001');
      
      // Verify proper categorization in the env file
      expect(result.content).toMatch(/# Basic Configuration[\s\S]*# Security Tokens/);
    });
  });
  
  // Helper functions
  async function registerTestServices(): Promise<void> {
    const testServices: ServiceRegistration[] = [
      {
        name: 'auth-service',
        port: 4000,
        environment: "development",
        healthCheckPath: '/health'
      },
      {
        name: 'user-service',
        port: 4001,
        environment: "development"
      },
      {
        name: 'database-service',
        port: 5432,
        environment: "development"
      }
    ];
    
    for (const service of testServices) {
      await serviceDiscovery.registerService(service);
    }
  }

  async function cleanupTestServices(): Promise<void> {
    // Get all registered services and clean them up
    const environments = ["development", 'test', 'release', 'shared'];
    const services = [
      'auth-service', 'user-service', 'database-service', 'secure-api',
      'api-gateway', "frontend", 'monitored-service', 'monitoring-client',
      'shared-cache', 'app-service', 'service-a', 'service-b', 'service-c',
      'dynamic-client', 'late-service', 'auth-theme', 'user-theme',
      'api-gateway-theme', 'frontend-theme'
    ];
    
    for (const env of environments) {
      for (const service of services) {
        try {
          await serviceDiscovery.unregisterService(service, env);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    }
  }
});