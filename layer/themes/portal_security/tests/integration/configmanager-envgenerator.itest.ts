/**
 * Integration Test: ConfigManager integrates with EnvGenerator for automatic .env generation
 * 
 * This test verifies that ConfigManager can provide configuration data to EnvGenerator
 * for automatic .env file generation with proper port allocations, database configs,
 * and environment-specific settings.
 * 
 * Following Mock Free Test Oriented Development - No mocks, real implementations only.
 */

import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { ConfigManager } from '../../children/ConfigManager';
import { EnvGenerator } from '../../children/EnvGenerator';
import { TokenService } from '../../children/TokenService';
import { ServiceDiscovery } from '../../children/ServiceDiscovery';

describe('ConfigManager integrates with EnvGenerator', () => {
  let configManager: ConfigManager;
  let envGenerator: EnvGenerator;
  let tokenService: TokenService;
  let serviceDiscovery: ServiceDiscovery;
  const testOutputDir = path.join(__dirname, '../temp/config-env-test');
  const configDir = path.join(testOutputDir, 'config');

  beforeAll(() => {
    // Create test directories
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Initialize real services - no mocks
    configManager = new ConfigManager(configDir);
    tokenService = new TokenService();
    serviceDiscovery = new ServiceDiscovery(configManager, {
      enableAutoDiscovery: false
    });

    envGenerator = new EnvGenerator(
      tokenService,
      configManager,
      serviceDiscovery
    );
  });

  afterEach(() => {
    // Clean up generated files
    if (fs.existsSync(testOutputDir)) {
      const files = fs.readdirSync(testOutputDir);
      for (const file of files) {
        if (file.startsWith('.env')) {
          fs.unlinkSync(path.join(testOutputDir, file));
        }
      }
    }

    // Stop health checks
    serviceDiscovery.stopAllHealthChecks();
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Port Allocation Integration', () => {
    it('should include port allocations from ConfigManager in .env file', async () => {
      // Get port allocations from ConfigManager
      const ports = await configManager.getPortAllocations("development");

      // Generate env file
      const result = await envGenerator.generateEnvFile({
        environment: "development",
        outputPath: path.join(testOutputDir, '.env.dev'),
        includePorts: true,
        includeSecrets: false,
        includeServiceUrls: false
      });

      // Assert default ports are included
      expect(result.variables.MAIN_PORT).toBe('3456');
      expect(result.variables.API_PORT).toBe('3457');
      expect(result.variables.AUTH_PORT).toBe('3458');
      expect(result.variables.ADMIN_PORT).toBe('3459');
      expect(result.variables.WEBSOCKET_PORT).toBe('3460');

      // Verify port allocations match ConfigManager
      expect(result.variables.MAIN_PORT).toBe(String(ports.main));
      expect(result.variables.API_PORT).toBe(String(ports.api));
      expect(result.variables.AUTH_PORT).toBe(String(ports.auth));
    });

    it('should allocate new ports for dynamic services', async () => {
      // Add a new service through ConfigManager
      await configManager.addService('test', {
        name: 'custom-service',
        port: 0, // Will be auto-allocated
        enabled: true
      });

      // Get allocated port
      const allocatedPort = await configManager.allocateServicePort('test', 'custom-service');

      // Generate env file
      const result = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test'),
        includePorts: true
      });

      // Assert custom service port is included
      expect(result.variables.CUSTOM_SERVICE_PORT).toBe(String(allocatedPort));
      expect(parseInt(result.variables.CUSTOM_SERVICE_PORT)).toBeGreaterThan(0);
      expect(parseInt(result.variables.CUSTOM_SERVICE_PORT)).toBeLessThanOrEqual(65535);
    });

    it('should handle port allocations for different environments', async () => {
      // Generate env files for different environments
      const devResult = await envGenerator.generateEnvFile({
        environment: "development",
        outputPath: path.join(testOutputDir, '.env.dev.ports'),
        includePorts: true,
        includeSecrets: false
      });

      const testResult = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test.ports'),
        includePorts: true,
        includeSecrets: false
      });

      const releaseResult = await envGenerator.generateEnvFile({
        environment: 'release',
        outputPath: path.join(testOutputDir, '.env.release.ports'),
        includePorts: true,
        includeSecrets: false
      });

      // Assert different port ranges for different environments
      expect(devResult.variables.MAIN_PORT).toBe('3456');
      expect(testResult.variables.MAIN_PORT).toBe('4456');
      expect(releaseResult.variables.MAIN_PORT).toBe('443');

      // Verify each environment has distinct port allocations
      expect(devResult.variables.API_PORT).not.toBe(testResult.variables.API_PORT);
      expect(testResult.variables.API_PORT).not.toBe(releaseResult.variables.API_PORT);
    });
  });

  describe('Database Configuration Integration', () => {
    it('should use SQLite for development and test environments', async () => {
      // Generate dev env
      const devResult = await envGenerator.generateEnvFile({
        environment: "development",
        outputPath: path.join(testOutputDir, '.env.dev.db'),
        includeSecrets: false
      });

      // Generate test env
      const testResult = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test.db'),
        includeSecrets: false
      });

      // Assert SQLite configuration
      expect(devResult.variables.DB_TYPE).toBe('sqlite');
      expect(devResult.variables.DB_PATH).toBe('./data/development.db');
      expect(devResult.variables.DB_IN_MEMORY).toBe('false');

      expect(testResult.variables.DB_TYPE).toBe('sqlite');
      expect(testResult.variables.DB_IN_MEMORY).toBe('true');
    });

    it('should use PostgreSQL for release environment', async () => {
      // Generate release env
      const result = await envGenerator.generateEnvFile({
        environment: 'release',
        outputPath: path.join(testOutputDir, '.env.release.db'),
        includeSecrets: false
      });

      // Assert PostgreSQL configuration
      expect(result.variables.DB_TYPE).toBe("postgresql");
      expect(result.variables.DB_HOST).toBeDefined();
      expect(result.variables.DB_PORT).toBe('5432');
      expect(result.variables.DB_NAME).toBe('portal_security_prod');
      expect(result.variables.DB_SSL).toBe('true');
      expect(result.variables.DB_CONNECTION_POOL_SIZE).toBe('20');
    });

    it('should get database config from ConfigManager', async () => {
      // Get database config from ConfigManager
      const dbConfig = await configManager.getDatabaseConfig('demo');

      // Generate env file
      const result = await envGenerator.generateEnvFile({
        environment: 'demo',
        outputPath: path.join(testOutputDir, '.env.demo.db')
      });

      // Assert database config matches ConfigManager
      expect(result.variables.DB_TYPE).toBe(dbConfig.type);
      if (dbConfig.type === 'sqlite') {
        expect(result.variables.DB_PATH).toBe(dbConfig.path || './data/demo.db');
      }
    });
  });

  describe('Security Configuration Integration', () => {
    it('should apply security settings from ConfigManager', async () => {
      // Get security config from ConfigManager
      const securityConfig = await configManager.getSecurityConfig("development");

      // Generate env file
      const result = await envGenerator.generateEnvFile({
        environment: "development",
        outputPath: path.join(testOutputDir, '.env.dev.security')
      });

      // Assert security settings match ConfigManager
      expect(result.variables.CORS_ENABLED).toBe(String(securityConfig.corsEnabled));
      expect(result.variables.HTTPS_ONLY).toBe(String(securityConfig.httpsOnly));
      expect(result.variables.SECURE_COOKIES).toBe(String(securityConfig.secureCookies));
      expect(result.variables.SESSION_TIMEOUT).toBe(String(securityConfig.sessionTimeout));
    });

    it('should have different security settings per environment', async () => {
      // Get configs from ConfigManager
      const devSecurity = await configManager.getSecurityConfig("development");
      const releaseSecurity = await configManager.getSecurityConfig('release');

      // Generate env files
      const devResult = await envGenerator.generateEnvFile({
        environment: "development",
        outputPath: path.join(testOutputDir, '.env.dev.sec')
      });

      const releaseResult = await envGenerator.generateEnvFile({
        environment: 'release',
        outputPath: path.join(testOutputDir, '.env.release.sec')
      });

      // Assert development is less restrictive
      expect(devResult.variables.CORS_ENABLED).toBe('true');
      expect(devResult.variables.HTTPS_ONLY).toBe('false');
      expect(devResult.variables.SECURE_COOKIES).toBe('false');

      // Assert release is more restrictive
      expect(releaseResult.variables.CORS_ENABLED).toBe('false');
      expect(releaseResult.variables.HTTPS_ONLY).toBe('true');
      expect(releaseResult.variables.SECURE_COOKIES).toBe('true');

      // Verify they match ConfigManager settings
      expect(devResult.variables.CORS_ENABLED).toBe(String(devSecurity.corsEnabled));
      expect(releaseResult.variables.CORS_ENABLED).toBe(String(releaseSecurity.corsEnabled));
    });
  });

  describe('Service Configuration Integration', () => {
    it('should include all enabled services from ConfigManager', async () => {
      // Add custom services
      await configManager.addService('test', {
        name: "monitoring",
        port: 3500,
        enabled: true
      });

      await configManager.addService('test', {
        name: 'metrics',
        port: 3501,
        enabled: true
      });

      await configManager.addService('test', {
        name: 'disabled-svc',
        port: 3502,
        enabled: false
      });

      // Generate env file
      const result = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test.services'),
        includePorts: true,
        includeServiceUrls: true
      });

      // Assert enabled services are included
      expect(result.variables.MONITORING_PORT).toBe('3500');
      expect(result.variables.METRICS_PORT).toBe('3501');
      expect(result.variables.MONITORING_SERVICE_URL).toContain(':3500');
      expect(result.variables.METRICS_SERVICE_URL).toContain(':3501');

      // Disabled service should not be included
      expect(result.variables.DISABLED_SVC_PORT).toBeUndefined();
      expect(result.variables.DISABLED_SVC_SERVICE_URL).toBeUndefined();
    });

    it('should handle service dependencies from ConfigManager', async () => {
      // Add services with dependencies
      await configManager.addService('test', {
        name: "frontend",
        port: 3000,
        enabled: true,
        dependencies: ['backend', 'auth']
      });

      await configManager.addService('test', {
        name: 'backend',
        port: 3001,
        enabled: true,
        dependencies: ["database"]
      });

      await configManager.addService('test', {
        name: "database",
        port: 5432,
        enabled: true
      });

      // Generate env file
      const result = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test.deps'),
        includePorts: true
      });

      // All services should be included regardless of dependencies
      expect(result.variables.FRONTEND_PORT).toBe('3000');
      expect(result.variables.BACKEND_PORT).toBe('3001');
      expect(result.variables.DATABASE_PORT).toBe('5432');
    });
  });

  describe('Configuration Updates', () => {
    it('should reflect ConfigManager updates in generated env files', async () => {
      // Generate initial env file
      const initialResult = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test.update'),
        includePorts: true
      });

      const initialMainPort = initialResult.variables.MAIN_PORT;

      // Update service configuration
      await configManager.updateServiceConfig('test', 'main', {
        port: 9999
      });

      // Generate new env file
      const updatedResult = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test.updated'),
        includePorts: true
      });

      // Assert port was updated
      expect(updatedResult.variables.MAIN_PORT).toBe('9999');
      expect(updatedResult.variables.MAIN_PORT).not.toBe(initialMainPort);
    });

    it('should handle feature flag updates', async () => {
      // Update feature flags
      await configManager.updateFeatureFlag('test', "newFeature", true);
      await configManager.updateFeatureFlag('test', "betaFeature", false);

      // Get feature flags
      const features = await configManager.getFeatureFlags('test');

      // Generate env file with custom variables for feature flags
      const result = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test.features'),
        customVariables: {
          FEATURE_NEW_FEATURE: String(features.newFeature),
          FEATURE_BETA_FEATURE: String(features.betaFeature),
          FEATURE_DEBUG_MODE: String(features.debugMode)
        }
      });

      // Assert feature flags are included
      expect(result.variables.FEATURE_NEW_FEATURE).toBe('true');
      expect(result.variables.FEATURE_BETA_FEATURE).toBe('false');
      expect(result.variables.FEATURE_DEBUG_MODE).toBeDefined();
    });
  });

  describe('Configuration Propagation', () => {
    it('should propagate configuration changes across environments', async () => {
      // Add a service to development
      await configManager.addService("development", {
        name: 'new-service',
        port: 7000,
        enabled: true,
        dependencies: ['auth']
      });

      // Propagate to other environments
      await configManager.propagateConfigChange(
        "development",
        ['test', 'demo'],
        "services"
      );

      // Generate env files for each environment
      const testResult = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test.propagated'),
        includePorts: true
      });

      const demoResult = await envGenerator.generateEnvFile({
        environment: 'demo',
        outputPath: path.join(testOutputDir, '.env.demo.propagated'),
        includePorts: true
      });

      // Assert service was propagated (with different ports)
      expect(testResult.variables.NEW_SERVICE_PORT).toBeDefined();
      expect(demoResult.variables.NEW_SERVICE_PORT).toBeDefined();
      
      // Ports should be different per environment
      expect(testResult.variables.NEW_SERVICE_PORT).not.toBe('7000');
      expect(demoResult.variables.NEW_SERVICE_PORT).not.toBe('7000');
      expect(testResult.variables.NEW_SERVICE_PORT).not.toBe(demoResult.variables.NEW_SERVICE_PORT);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration before generating env file', async () => {
      // Validate configuration
      const validation = await configManager.validateConfig("development");

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Generate env file only if valid
      if (validation.valid) {
        const result = await envGenerator.generateEnvFile({
          environment: "development",
          outputPath: path.join(testOutputDir, '.env.dev.validated')
        });

        expect(result).toBeDefined();
        expect(fs.existsSync(result.path)).toBe(true);
      }
    });
  });

  describe('Complete Integration', () => {
    it('should generate complete env file using all ConfigManager features', async () => {
      // Setup complex configuration
      await configManager.addService('test', {
        name: 'graphql',
        port: 4000,
        enabled: true,
        dependencies: ['auth', "database"]
      });

      await configManager.updateFeatureFlag('test', "graphqlPlayground", true);

      // Generate complete env file
      const result = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test.complete'),
        includeSecrets: true,
        includeServiceUrls: true,
        includePorts: true,
        customVariables: {
          APP_VERSION: '1.0.0',
          DEPLOYMENT_ID: 'test-deployment'
        }
      });

      // Verify all sections are present
      expect(result.variables.NODE_ENV).toBe('test');
      expect(result.variables.JWT_SECRET).toBeDefined();
      expect(result.variables.MAIN_PORT).toBeDefined();
      expect(result.variables.GRAPHQL_PORT).toBe('4000');
      expect(result.variables.DB_TYPE).toBe('sqlite');
      expect(result.variables.CORS_ENABLED).toBeDefined();
      expect(result.variables.APP_VERSION).toBe('1.0.0');
      expect(result.variables.BASE_URL).toBeDefined();

      // Verify file structure
      const content = fs.readFileSync(result.path, 'utf-8');
      expect(content).toContain('# Environment');
      expect(content).toContain('# Security');
      expect(content).toContain('# Ports');
      expect(content).toContain('# Database');
      expect(content).toContain('# URLs');
      expect(content).toContain('# Custom');
    });
  });
});