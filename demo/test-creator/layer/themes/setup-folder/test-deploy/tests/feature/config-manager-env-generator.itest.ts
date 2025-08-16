import { EnvGenerator, ConfigManager } from '../../src/external_interface/pipe';
import * as fs from 'fs-extra';
import { path } from '../../../../../../../../layer/themes/infra_external-log-lib/dist';

describe('ConfigManager integrates with EnvGenerator', () => {
  const testDir = path.join(process.cwd(), 'temp/test-config-env');
  let envGenerator: EnvGenerator;
  let configManager: ConfigManager;

  beforeEach(async () => {
    // Create test directory
    await fs.ensureDir(testDir);
    
    // Initialize services
    envGenerator = new EnvGenerator();
    configManager = new ConfigManager();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('Then ConfigManager integrates with EnvGenerator for In Progress .env generation', () => {
    it('should provide port allocations for environment configuration', async () => {
      // Given: ConfigManager with environment configurations
      configManager.setEnvironmentConfig('development', {
        portRange: { start: 3000, end: 3099 },
        mainPort: 3000,
        services: {
          api: 3001,
          websocket: 3002,
          admin: 3003
        }
      });

      configManager.setEnvironmentConfig('production', {
        portRange: { start: 3400, end: 3499 },
        mainPort: 3456,
        services: {
          api: 3457,
          websocket: 3458,
          admin: 3459
        }
      });

      // And: EnvGenerator with ConfigManager
      envGenerator.setConfigManager(configManager);
      envGenerator.addConfig('APP_NAME', 'test-app');

      // When: Generate env file for development
      const devPath = path.join(testDir, '.env.development');
      const devContent = await envGenerator.generate({
        outputPath: devPath,
        environment: 'development',
        includePortAllocations: true
      });

      // Then: Content should include port allocations
      expect(devContent).toContain('# Port Allocations');
      expect(devContent).toContain('PORT=3000');
      expect(devContent).toContain('API_PORT=3001');
      expect(devContent).toContain('WEBSOCKET_PORT=3002');
      expect(devContent).toContain('ADMIN_PORT=3003');
      expect(devContent).toContain('PORT_RANGE_START=3000');
      expect(devContent).toContain('PORT_RANGE_END=3099');

      // When: Generate for production
      const prodPath = path.join(testDir, '.env.production');
      const prodContent = await envGenerator.generate({
        outputPath: prodPath,
        environment: 'production',
        includePortAllocations: true
      });

      // Then: Production should have different ports
      expect(prodContent).toContain('PORT=3456');
      expect(prodContent).toContain('API_PORT=3457');
      expect(prodContent).toContain('WEBSOCKET_PORT=3458');
    });

    it('should provide database configuration based on environment', async () => {
      // Given: ConfigManager with database configurations
      configManager.setDatabaseConfig('development', {
        type: 'sqlite',
        path: './data/dev.db'
      });

      configManager.setDatabaseConfig('production', {
        type: 'postgres',
        host: 'db.example.com',
        port: 5432,
        database: 'prod_db',
        user: 'prod_user'
      });

      envGenerator.setConfigManager(configManager);

      // When: Generate with database config
      const devPath = path.join(testDir, '.env.dev');
      const devContent = await envGenerator.generate({
        outputPath: devPath,
        environment: 'development',
        includeDatabaseConfig: true
      });

      // Then: Development should have SQLite config
      expect(devContent).toContain('# Database Configuration');
      expect(devContent).toContain('DB_TYPE=sqlite');
      expect(devContent).toContain('DB_PATH=./data/dev.db');

      // When: Generate for production
      const prodPath = path.join(testDir, '.env.prod');
      const prodContent = await envGenerator.generate({
        outputPath: prodPath,
        environment: 'production',
        includeDatabaseConfig: true
      });

      // Then: Production should have PostgreSQL config
      expect(prodContent).toContain('DB_TYPE=postgres');
      expect(prodContent).toContain('DB_HOST=db.example.com');
      expect(prodContent).toContain('DB_PORT=5432');
      expect(prodContent).toContain('DB_NAME=prod_db');
      expect(prodContent).toContain('DB_USER=prod_user');
    });

    it('should provide feature flags and global settings', async () => {
      // Given: ConfigManager with feature flags
      configManager.setFeatureFlags({
        mcpEnabled: true,
        vfModeDefault: true,
        autoBackup: false,
        debugMode: true
      });

      configManager.setGlobalConfig({
        appVersion: '1.0.0',
        apiVersion: 'v1',
        timezone: 'UTC',
        logLevel: 'info'
      });

      envGenerator.setConfigManager(configManager);

      // When: Generate with features and globals
      const outputPath = path.join(testDir, '.env');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'development',
        includeFeatureFlags: true,
        includeGlobalConfig: true
      });

      // Then: Should include feature flags
      expect(content).toContain('# Feature Flags');
      expect(content).toContain('FEATURE_MCP_ENABLED=true');
      expect(content).toContain('FEATURE_VF_MODE_DEFAULT=true');
      expect(content).toContain('FEATURE_AUTO_BACKUP=false');
      expect(content).toContain('FEATURE_DEBUG_MODE=true');

      // And: Should include global config
      expect(content).toContain('# Global Configuration');
      expect(content).toContain('APP_VERSION=1.0.0');
      expect(content).toContain('API_VERSION=v1');
      expect(content).toContain('TIMEZONE=UTC');
      expect(content).toContain('LOG_LEVEL=info');
    });

    it('should handle complete configuration with all integrations', async () => {
      // Given: Complete setup with all services
      const { TokenService, ServiceDiscovery } = await import('../../src/external_interface/pipe');
      
      const tokenService = new TokenService({ prefix: 'AUTH_' });
      const serviceDiscovery = new ServiceDiscovery();
      
      // Configure services
      serviceDiscovery.registerService('api-gateway', {
        name: 'API Gateway',
        url: 'http://localhost:3001',
        port: 3001
      });

      configManager.setEnvironmentConfig('staging', {
        portRange: { start: 3300, end: 3399 },
        mainPort: 3300,
        services: { api: 3301, ws: 3302 }
      });

      configManager.setDatabaseConfig('staging', {
        type: 'postgres',
        host: 'staging-db.local',
        port: 5432,
        database: 'staging'
      });

      configManager.setFeatureFlags({
        mcpEnabled: true,
        vfModeDefault: false
      });

      // Wire up all services
      envGenerator.setTokenService(tokenService);
      envGenerator.setServiceDiscovery(serviceDiscovery);
      envGenerator.setConfigManager(configManager);

      // When: Generate complete configuration
      const outputPath = path.join(testDir, '.env.staging');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'staging',
        includeTokens: true,
        includeServiceUrls: true,
        includePortAllocations: true,
        includeDatabaseConfig: true,
        includeFeatureFlags: true
      });

      // Then: Should have all sections
      expect(content).toContain('NODE_ENV=staging');
      expect(content).toContain('# Security Tokens');
      expect(content).toContain('AUTH_');
      expect(content).toContain('# Service URLs');
      expect(content).toContain('API_GATEWAY_URL=');
      expect(content).toContain('# Port Allocations');
      expect(content).toContain('PORT=3300');
      expect(content).toContain('# Database Configuration');
      expect(content).toContain('DB_TYPE=postgres');
      expect(content).toContain('# Feature Flags');
      expect(content).toContain('FEATURE_MCP_ENABLED=true');
    });

    it('should validate port allocations against environment ranges', async () => {
      // Given: ConfigManager with strict port validation
      configManager.setEnvironmentConfig('test', {
        portRange: { start: 3100, end: 3199 },
        mainPort: 3100,
        services: { api: 3101 },
        strictValidation: true
      });

      envGenerator.setConfigManager(configManager);

      // When: Try to add a port outside the range
      const invalidPort = () => {
        configManager.addServicePort('test', 'invalid', 3200); // Outside range
      };

      // Then: Should throw validation error
      expect(invalidPort).toThrow('Port 3200 is outside valid range for test environment: 3100-3199');
    });

    it('should load configuration from JSON file', async () => {
      // Given: A configuration file
      const configFile = path.join(testDir, 'environments.json');
      const configData = {
        environments: {
          test: {
            portRange: { start: 3100, end: 3199 },
            mainPort: 3100,
            services: { api: 3101, websocket: 3102 }
          },
          production: {
            portRange: { start: 3400, end: 3499 },
            mainPort: 3456,
            services: { api: 3457, websocket: 3458 }
          }
        },
        database: {
          postgres: { host: 'localhost', port: 5432 },
          sqlite: { path: './data/${env}.db' }
        },
        features: {
          mcpEnabled: true,
          vfModeDefault: true
        }
      };

      await fs.writeJson(configFile, configData);

      // When: Load configuration from file
      await configManager.loadFromFile(configFile);
      envGenerator.setConfigManager(configManager);

      // Then: Generate env with loaded config
      const outputPath = path.join(testDir, '.env.test');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'test',
        includePortAllocations: true,
        includeFeatureFlags: true
      });

      expect(content).toContain('PORT=3100');
      expect(content).toContain('API_PORT=3101');
      expect(content).toContain('FEATURE_MCP_ENABLED=true');
    });
  });
});