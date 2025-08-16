/**
 * Advanced Scenario Tests for Environment Configuration
 * 
 * This test file covers multiple advanced scenarios for the environment
 * configuration system including service updates, port allocations,
 * theme configuration, and service discovery.
 */

import { EnvGenerator, EnvGeneratorConfig } from '../../src/external/env-generator';
import { ServiceDiscovery } from '../../src/external/service-discovery';
import { ConfigManager, CreateEnvironmentOptions } from '../../../025-env-config-system/src/interfaces/config-manager.interface';
import { EnvGeneratorImpl } from '../../src/implementations/env-generator-impl';
import { ServiceDiscoveryImpl } from '../../src/implementations/service-discovery-impl';
import { TokenServiceImpl } from '../../src/implementations/token-service-impl';
import { ConfigManager as ConfigManagerImpl } from '../../../025-env-config-system/src/components/config-manager';
import { PortAllocator } from '../../../025-env-config-system/src/components/port-allocator';
import { FileGenerator } from '../../../025-env-config-system/src/components/file-generator';
import { PortRegistry } from '../../../025-env-config-system/src/components/port-registry';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('Advanced Environment Configuration Scenarios', () => {
  let envGenerator: EnvGenerator;
  let serviceDiscovery: ServiceDiscovery;
  let configManager: ConfigManager;
  
  beforeEach(async () => {
    serviceDiscovery = new ServiceDiscoveryImpl();
    const tokenService = new TokenServiceImpl();
    envGenerator = new EnvGeneratorImpl(serviceDiscovery, tokenService);
    
    // Setup ConfigManager
    const portRegistry = new PortRegistry('/tmp/test-port-registry-' + Date.now() + '.json');
    const portAllocator = new PortAllocator(portRegistry);
    const fileGenerator = new FileGenerator();
    configManager = new ConfigManagerImpl(portAllocator, fileGenerator);
  });
  
  afterEach(async () => {
    // Clean up registered services
    const services = [
      'api-service', 'auth-service', 'user-service', 'notification-service',
      'payment-service', 'analytics-service', 'cache-service', 'search-service',
      'frontend-theme', 'backend-theme', 'admin-theme', 'mobile-theme'
    ];
    
    for (const service of services) {
      for (const env of ["development", 'test', 'release', 'theme', 'demo', 'epic', 'shared']) {
        try {
          await serviceDiscovery.unregisterService(service, env);
        } catch (e) {
          // Ignore
        }
      }
    }
  });
  
  describe('Scenario: Adding new service updates .env file with service-specific variables', () => {
    it('should include service-specific configuration when a new service is added', async () => {
      // Given: Existing service
      await serviceDiscovery.registerService({
        name: 'api-service',
        port: 3000,
        environment: "development"
      });
      
      // When: Adding a new payment service with specific configuration
      await serviceDiscovery.registerService({
        name: 'payment-service',
        port: 3001,
        environment: "development"
      });
      
      // And: API service depends on payment service
      await serviceDiscovery.registerService({
        name: 'api-service',
        port: 3000,
        environment: "development",
        dependencies: ['payment-service']
      });
      
      // When: Generating env file for API service
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'api-service',
        servicePort: 3000,
        additionalVariables: [
          { key: 'PAYMENT_API_VERSION', value: 'v2' },
          { key: 'PAYMENT_WEBHOOK_URL', value: '/webhooks/payment' },
          { key: 'PAYMENT_SSL_REQUIRED', value: 'true' }
        ]
      };
      
      const result = await envGenerator.generateEnvFile(config);
      
      // Then: Should include payment service URL and specific variables
      expect(result.content).toContain('PAYMENT_SERVICE_URL=http://localhost:3001');
      expect(result.content).toContain('PAYMENT_API_VERSION=v2');
      expect(result.content).toContain('PAYMENT_WEBHOOK_URL=/webhooks/payment');
      expect(result.content).toContain('PAYMENT_SSL_REQUIRED=true');
    });
    
    it('should update dependent services when new service is added', async () => {
      // Given: Services with dependencies
      await serviceDiscovery.registerService({
        name: 'auth-service',
        port: 4000,
        environment: "development"
      });
      
      await serviceDiscovery.registerService({
        name: 'user-service',
        port: 4001,
        environment: "development",
        dependencies: ['auth-service']
      });
      
      // When: Adding notification service that user service depends on
      await serviceDiscovery.registerService({
        name: 'notification-service',
        port: 4002,
        environment: "development"
      });
      
      // Update user service to depend on notification
      await serviceDiscovery.registerService({
        name: 'user-service',
        port: 4001,
        environment: "development",
        dependencies: ['auth-service', 'notification-service']
      });
      
      // Generate env for user service
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'user-service',
        servicePort: 4001,
        additionalVariables: [
          { key: 'EMAIL_PROVIDER', value: "sendgrid" },
          { key: 'SMS_PROVIDER', value: 'twilio' }
        ]
      };
      
      const result = await envGenerator.generateEnvFile(config);
      
      // Then: Should include both dependencies and service-specific vars
      expect(result.content).toContain('AUTH_SERVICE_URL=http://localhost:4000');
      expect(result.content).toContain('NOTIFICATION_SERVICE_URL=http://localhost:4002');
      expect(result.content).toContain('EMAIL_PROVIDER=sendgrid');
      expect(result.content).toContain('SMS_PROVIDER=twilio');
    });
  });
  
  describe('Scenario: .env files include all port allocations from ConfigManager', () => {
    it('should include all allocated ports in the env file', async () => {
      // Given: Create environment with multiple services
      const envOptions: CreateEnvironmentOptions = {
        name: 'multi-service-app',
        type: 'theme',
        services: ['web', 'api', 'admin', 'worker']
      };
      
      const env = await configManager.createEnvironment(envOptions);
      
      // When: Generating env file with port information
      const config: EnvGeneratorConfig = {
        environment: 'theme',
        serviceName: env.name,
        servicePort: env.port.base,
        additionalVariables: [
          { key: 'PORT', value: env.port.base.toString() },
          { key: 'PORT_RANGE_START', value: env.port.range[0].toString() },
          { key: 'PORT_RANGE_END', value: env.port.range[1].toString() },
          { key: 'WEB_PORT', value: (env.port.base + 1).toString() },
          { key: 'API_PORT', value: (env.port.base + 2).toString() },
          { key: 'ADMIN_PORT', value: (env.port.base + 3).toString() },
          { key: 'WORKER_PORT', value: (env.port.base + 4).toString() }
        ]
      };
      
      const result = await envGenerator.generateEnvFile(config);
      
      // Then: Should include all port allocations
      expect(result.content).toContain('PORT=' + env.port.base);
      expect(result.content).toContain('PORT_RANGE_START=' + env.port.range[0]);
      expect(result.content).toContain('PORT_RANGE_END=' + env.port.range[1]);
      expect(result.content).toContain('WEB_PORT=' + (env.port.base + 1));
      expect(result.content).toContain('API_PORT=' + (env.port.base + 2));
      expect(result.content).toContain('ADMIN_PORT=' + (env.port.base + 3));
      expect(result.content).toContain('WORKER_PORT=' + (env.port.base + 4));
      
      // Verify ports are in the correct range for theme type (3200-3299)
      expect(env.port.base).toBeGreaterThanOrEqual(3200);
      expect(env.port.base).toBeLessThanOrEqual(3299);
    });
    
    it('should allocate different port ranges for different environment types', async () => {
      // Given: Different environment types
      const environments = [
        { name: 'release-app', type: 'release' as const },
        { name: 'test-app', type: 'test' as const },
        { name: 'theme-app', type: 'theme' as const },
        { name: 'demo-app', type: 'demo' as const },
        { name: 'epic-app', type: 'epic' as const }
      ];
      
      const results = [];
      
      for (const envConfig of environments) {
        const env = await configManager.createEnvironment({
          name: envConfig.name,
          type: envConfig.type,
          services: ['web', 'api']
        });
        
        const config: EnvGeneratorConfig = {
          environment: envConfig.type,
          serviceName: env.name,
          servicePort: env.port.base,
          additionalVariables: [
            { key: 'BASE_PORT', value: env.port.base.toString() }
          ]
        };
        
        const result = await envGenerator.generateEnvFile(config);
        results.push({ type: envConfig.type, port: env.port.base, content: result.content });
      }
      
      // Then: Each environment type should have ports in its designated range
      const releaseResult = results.find(r => r.type === 'release');
      expect(releaseResult?.port).toBe(3456); // Release base port
      
      const testResult = results.find(r => r.type === 'test');
      expect(testResult?.port).toBeGreaterThanOrEqual(3100);
      expect(testResult?.port).toBeLessThanOrEqual(3199);
      
      const themeResult = results.find(r => r.type === 'theme');
      expect(themeResult?.port).toBeGreaterThanOrEqual(3200);
      expect(themeResult?.port).toBeLessThanOrEqual(3299);
      
      const demoResult = results.find(r => r.type === 'demo');
      expect(demoResult?.port).toBeGreaterThanOrEqual(3300);
      expect(demoResult?.port).toBeLessThanOrEqual(3399);
      
      const epicResult = results.find(r => r.type === 'epic');
      expect(epicResult?.port).toBeGreaterThanOrEqual(3500);
      expect(epicResult?.port).toBeLessThanOrEqual(3599);
    });
  });
  
  describe('Scenario: Developer configures new theme with automatic port allocation', () => {
    it('should automatically allocate ports when developer creates a new theme', async () => {
      // Given: Developer creates a new theme
      const themeOptions: CreateEnvironmentOptions = {
        name: 'new-feature-theme',
        type: 'theme',
        description: 'Theme for new feature development',
        services: ["frontend", 'backend', "database"]
      };
      
      // When: Creating the environment
      const theme = await configManager.createEnvironment(themeOptions);
      
      // And: Registering the theme services
      await serviceDiscovery.registerService({
        name: 'new-feature-frontend',
        port: theme.port.base + 1,
        environment: 'theme'
      });
      
      await serviceDiscovery.registerService({
        name: 'new-feature-backend',
        port: theme.port.base + 2,
        environment: 'theme',
        dependencies: ['new-feature-frontend']
      });
      
      // Generate env file
      const config: EnvGeneratorConfig = {
        environment: 'theme',
        serviceName: 'new-feature-backend',
        servicePort: theme.port.base + 2,
        additionalVariables: [
          { key: 'THEME_NAME', value: theme.name },
          { key: 'THEME_BASE_PORT', value: theme.port.base.toString() },
          { key: 'FRONTEND_PORT', value: (theme.port.base + 1).toString() },
          { key: 'BACKEND_PORT', value: (theme.port.base + 2).toString() },
          { key: 'DATABASE_PORT', value: (theme.port.base + 3).toString() }
        ]
      };
      
      const result = await envGenerator.generateEnvFile(config);
      
      // Then: Should have automatic port allocation
      expect(result.content).toContain('THEME_NAME=new-feature-theme');
      expect(result.content).toContain('THEME_BASE_PORT=' + theme.port.base);
      expect(result.content).toContain('NEW_FEATURE_FRONTEND_URL=http://localhost:' + (theme.port.base + 1));
      
      // Verify theme gets ports in theme range (3200-3299)
      expect(theme.port.base).toBeGreaterThanOrEqual(3200);
      expect(theme.port.base).toBeLessThanOrEqual(3299);
    });
    
    it('should avoid port conflicts when multiple themes are created', async () => {
      // Given: Multiple themes being created
      const theme1 = await configManager.createEnvironment({
        name: 'theme-one',
        type: 'theme',
        services: ['web']
      });
      
      const theme2 = await configManager.createEnvironment({
        name: 'theme-two',
        type: 'theme',
        services: ['web']
      });
      
      const theme3 = await configManager.createEnvironment({
        name: 'theme-three',
        type: 'theme',
        services: ['web']
      });
      
      // Then: Each theme should have unique ports
      expect(theme1.port.base).not.toBe(theme2.port.base);
      expect(theme2.port.base).not.toBe(theme3.port.base);
      expect(theme1.port.base).not.toBe(theme3.port.base);
      
      // All should be in theme range
      [theme1, theme2, theme3].forEach(theme => {
        expect(theme.port.base).toBeGreaterThanOrEqual(3200);
        expect(theme.port.base).toBeLessThanOrEqual(3299);
      });
    });
  });
  
  describe('Scenario: Multiple themes discover and connect to each other', () => {
    it('should enable themes to discover and connect to each other', async () => {
      // Given: Multiple interconnected themes
      await serviceDiscovery.registerService({
        name: 'frontend-theme',
        port: 3000,
        environment: "development",
        healthCheckPath: '/health'
      });
      
      await serviceDiscovery.registerService({
        name: 'backend-theme',
        port: 3001,
        environment: "development",
        healthCheckPath: '/api/health'
      });
      
      await serviceDiscovery.registerService({
        name: 'admin-theme',
        port: 3002,
        environment: "development",
        dependencies: ['backend-theme']
      });
      
      await serviceDiscovery.registerService({
        name: 'mobile-theme',
        port: 3003,
        environment: "development",
        dependencies: ['backend-theme']
      });
      
      // When: Frontend discovers all available services
      const availableServices = await serviceDiscovery.discoverServices({ environment: "development" });
      
      // Update frontend to connect to backend
      await serviceDiscovery.registerService({
        name: 'frontend-theme',
        port: 3000,
        environment: "development",
        dependencies: ['backend-theme'],
        healthCheckPath: '/health'
      });
      
      // Generate env for frontend
      const frontendConfig: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'frontend-theme',
        servicePort: 3000
      };
      
      const frontendResult = await envGenerator.generateEnvFile(frontendConfig);
      
      // Generate env for admin
      const adminConfig: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'admin-theme',
        servicePort: 3002
      };
      
      const adminResult = await envGenerator.generateEnvFile(adminConfig);
      
      // Then: Themes should be able to connect to each other
      expect(frontendResult.content).toContain('BACKEND_THEME_URL=http://localhost:3001');
      expect(frontendResult.content).toContain('BACKEND_THEME_HEALTH_URL=http://localhost:3001/api/health');
      
      expect(adminResult.content).toContain('BACKEND_THEME_URL=http://localhost:3001');
      
      // Verify discovery includes all themes
      expect(availableServices).toHaveLength(4);
      const serviceNames = availableServices.map(s => s.name);
      expect(serviceNames).toContain('frontend-theme');
      expect(serviceNames).toContain('backend-theme');
      expect(serviceNames).toContain('admin-theme');
      expect(serviceNames).toContain('mobile-theme');
    });
    
    it('should handle complex theme dependency graphs', async () => {
      // Given: Complex dependency structure
      // Cache (shared by all)
      await serviceDiscovery.registerService({
        name: 'cache-service',
        port: 6379,
        environment: 'shared'
      });
      
      // Auth service (base dependency)
      await serviceDiscovery.registerService({
        name: 'auth-service',
        port: 4000,
        environment: "development",
        dependencies: ['cache-service']
      });
      
      // User service depends on auth
      await serviceDiscovery.registerService({
        name: 'user-service',
        port: 4001,
        environment: "development",
        dependencies: ['auth-service', 'cache-service']
      });
      
      // Analytics service
      await serviceDiscovery.registerService({
        name: 'analytics-service',
        port: 4002,
        environment: "development",
        dependencies: ['cache-service']
      });
      
      // API Gateway depends on all services
      await serviceDiscovery.registerService({
        name: 'api-gateway',
        port: 8080,
        environment: "development",
        dependencies: ['auth-service', 'user-service', 'analytics-service']
      });
      
      // When: Generating env for API Gateway
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'api-gateway',
        servicePort: 8080
      };
      
      const result = await envGenerator.generateEnvFile(config);
      
      // Then: Should include all direct and transitive dependencies
      expect(result.content).toContain('AUTH_SERVICE_URL=http://localhost:4000');
      expect(result.content).toContain('USER_SERVICE_URL=http://localhost:4001');
      expect(result.content).toContain('ANALYTICS_SERVICE_URL=http://localhost:4002');
      expect(result.content).toContain('CACHE_SERVICE_URL=http://localhost:6379');
      
      // Verify no duplicates
      const cacheMatches = (result.content.match(/CACHE_SERVICE_URL=/g) || []).length;
      expect(cacheMatches).toBe(1);
    });
  });
  
  describe('Scenario: Environment-specific .env files are generated automatically', () => {
    it('should generate different .env files for each environment automatically', async () => {
      // Given: Same service in multiple environments
      const serviceName = 'multi-env-service';
      const environments: Array<EnvGeneratorConfig["environment"]> = 
        ["development", 'test', 'release', 'theme', 'demo', 'epic'];
      
      const results = [];
      
      for (const env of environments) {
        // Register service in each environment
        await serviceDiscovery.registerService({
          name: serviceName,
          port: 3000 + environments.indexOf(env),
          environment: env
        });
        
        // Generate env file for each environment
        const config: EnvGeneratorConfig = {
          environment: env,
          serviceName: serviceName,
          servicePort: 3000 + environments.indexOf(env)
        };
        
        const result = await envGenerator.generateEnvFile(config);
        results.push({ env, content: result.content });
      }
      
      // Then: Each environment should have unique configuration
      results.forEach(result => {
        expect(result.content).toContain(`NODE_ENV=${result.env}`);
        expect(result.content).toContain(`SERVICE_NAME=${serviceName}`);
        
        // Each should have unique tokens
        expect(result.content).toMatch(/JWT_SECRET=[A-Za-z0-9_-]{64}/);
        expect(result.content).toMatch(/API_KEY=[A-Za-z0-9_-]{32}/);
      });
      
      // Verify tokens are unique across environments
      const jwtSecrets = results.map(r => {
        const match = r.content.match(/JWT_SECRET=([A-Za-z0-9_-]{64})/);
        return match ? match[1] : null;
      }).filter(Boolean);
      
      const uniqueJwtSecrets = new Set(jwtSecrets);
      expect(uniqueJwtSecrets.size).toBe(jwtSecrets.length);
    });
  });
  
  describe('Scenario: Configuration changes propagate across dependent services', () => {
    it('should propagate configuration changes to dependent services', async () => {
      // Given: Initial service configuration
      await serviceDiscovery.registerService({
        name: 'config-service',
        port: 5000,
        environment: "development"
      });
      
      await serviceDiscovery.registerService({
        name: 'dependent-service',
        port: 5001,
        environment: "development",
        dependencies: ['config-service']
      });
      
      // Initial env generation
      const initialConfig: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'dependent-service',
        servicePort: 5001,
        additionalVariables: [
          { key: 'CONFIG_API_VERSION', value: 'v1' },
          { key: 'CONFIG_TIMEOUT', value: '30000' }
        ]
      };
      
      const initialResult = await envGenerator.generateEnvFile(initialConfig);
      
      // When: Configuration service updates
      await serviceDiscovery.registerService({
        name: 'config-service',
        port: 5000,
        environment: "development"
      });
      
      // Generate updated env for dependent service
      const updatedConfig: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'dependent-service',
        servicePort: 5001,
        additionalVariables: [
          { key: 'CONFIG_API_VERSION', value: 'v2' },
          { key: 'CONFIG_TIMEOUT', value: '60000' },
          { key: 'CONFIG_NEW_FEATURE', value: 'enabled' }
        ]
      };
      
      const updatedResult = await envGenerator.generateEnvFile(updatedConfig);
      
      // Then: Configuration changes should be reflected
      expect(initialResult.content).toContain('CONFIG_API_VERSION=v1');
      expect(initialResult.content).toContain('CONFIG_TIMEOUT=30000');
      expect(initialResult.content).not.toContain('CONFIG_NEW_FEATURE');
      
      expect(updatedResult.content).toContain('CONFIG_API_VERSION=v2');
      expect(updatedResult.content).toContain('CONFIG_TIMEOUT=60000');
      expect(updatedResult.content).toContain('CONFIG_NEW_FEATURE=enabled');
    });
  });
  
  describe('Scenario: System manages different database configs for release vs development', () => {
    it('should use appropriate database configuration based on environment', async () => {
      // Given: Services in different environments
      const devConfig: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'db-service',
        servicePort: 3000,
        databaseConfig: {
          type: 'sqlite',
          database: 'dev_db'
        },
        additionalVariables: [
          { key: 'DB_LOGGING', value: 'true' },
          { key: 'DB_SYNC', value: 'true' }
        ]
      };
      
      const releaseConfig: EnvGeneratorConfig = {
        environment: 'release',
        serviceName: 'db-service',
        servicePort: 443,
        databaseConfig: {
          type: "postgresql",
          host: 'prod-db.example.com',
          port: 5432,
          database: 'prod_db',
          user: 'prod_user',
          password: "PLACEHOLDER"
        },
        additionalVariables: [
          { key: 'DB_LOGGING', value: 'false' },
          { key: 'DB_SYNC', value: 'false' },
          { key: 'DB_SSL', value: 'true' },
          { key: 'DB_POOL_SIZE', value: '20' }
        ]
      };
      
      // When: Generating env files
      const devResult = await envGenerator.generateEnvFile(devConfig);
      const releaseResult = await envGenerator.generateEnvFile(releaseConfig);
      
      // Then: Development should use SQLite with dev settings
      expect(devResult.content).toContain('DB_TYPE=sqlite');
      expect(devResult.content).toContain('DATABASE_URL=sqlite://./dev_db.db');
      expect(devResult.content).toContain('DB_LOGGING=true');
      expect(devResult.content).toContain('DB_SYNC=true');
      expect(devResult.content).not.toContain('DB_SSL');
      expect(devResult.content).not.toContain('DB_POOL_SIZE');
      
      // Release should use PostgreSQL with production settings
      expect(releaseResult.content).toContain('DB_TYPE=postgresql');
      expect(releaseResult.content).toContain('DB_HOST=prod-db.example.com');
      expect(releaseResult.content).toContain('DATABASE_URL=postgresql://prod_user:secure_password@prod-db.example.com:5432/prod_db');
      expect(releaseResult.content).toContain('DB_LOGGING=false');
      expect(releaseResult.content).toContain('DB_SYNC=false');
      expect(releaseResult.content).toContain('DB_SSL=true');
      expect(releaseResult.content).toContain('DB_POOL_SIZE=20');
    });
  });
});