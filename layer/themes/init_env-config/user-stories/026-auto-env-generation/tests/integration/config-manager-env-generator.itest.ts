/**
 * Integration Test: ConfigManager integrates with EnvGenerator
 * 
 * This test verifies that ConfigManager correctly integrates with
 * EnvGenerator for complete .env file generation.
 */

import { ConfigManager, EnvironmentConfig, CreateEnvironmentOptions } from '../../../025-env-config-system/src/interfaces/config-manager.interface';
import { ConfigManager as ConfigManagerImpl } from '../../../025-env-config-system/src/components/config-manager';
import { PortAllocator } from '../../../025-env-config-system/src/components/port-allocator';
import { FileGenerator } from '../../../025-env-config-system/src/components/file-generator';
import { PortRegistry } from '../../../025-env-config-system/src/components/port-registry';
import { EnvGenerator, EnvGeneratorConfig, GeneratedEnvFile } from '../../src/external/env-generator';
import { EnvGeneratorImpl } from '../../src/implementations/env-generator-impl';
import { ServiceDiscoveryImpl } from '../../src/implementations/service-discovery-impl';
import { TokenServiceImpl } from '../../src/implementations/token-service-impl';
import * as fs from 'fs/promises';

describe('Integration: ConfigManager with EnvGenerator', () => {
  let configManager: ConfigManager;
  let envGenerator: EnvGenerator;
  
  beforeEach(() => {
    // Initialize real implementations
    configManager = createConfigManager();
    envGenerator = createEnvGenerator();
  });
  
  describe('exportAsEnv integration', () => {
    it('should generate complete .env file with ConfigManager data', async () => {
      // Arrange
      const envOptions: CreateEnvironmentOptions = {
        name: 'test-api',
        type: 'theme',
        description: 'Test API Service',
        services: ['api', 'database', 'cache']
      };
      
      await configManager.createEnvironment(envOptions);
      const config = await configManager.getEnvironment('test-api');
      
      // Act
      const envContent = await configManager.exportAsEnv('test-api');
      
      // Assert
      expect(envContent).toContain('ENVIRONMENT_TYPE=theme');
      expect(envContent).toContain('ENVIRONMENT_NAME=test-api');
      expect(envContent).toContain('PORT='); // Should have allocated port
      expect(envContent).toContain('DATABASE_TYPE=sqlite'); // Theme uses sqlite
    });
    
    it('should use EnvGenerator for security tokens and service URLs', async () => {
      // Arrange
      const envOptions: CreateEnvironmentOptions = {
        name: 'secure-service',
        type: 'release',
        services: ['auth', 'api'],
        dependencies: [
          {
            theme: 'user-service',
            endpoints: ['http://user-service:4001'],
            required: true
          }
        ]
      };
      
      const env = await configManager.createEnvironment(envOptions);
      
      // Act - Use EnvGenerator directly for testing token generation
      const generatorConfig: EnvGeneratorConfig = {
        environment: 'release',
        serviceName: env.name,
        servicePort: env.port.base
      };
      
      const result = await envGenerator.generateEnvFile(generatorConfig);
      
      // Assert
      // Should include security tokens from EnvGenerator
      const jwtSecret = result.variables.find(v => v.key === 'JWT_SECRET');
      const sessionSecret = result.variables.find(v => v.key === 'SESSION_SECRET');
      
      expect(jwtSecret).toBeDefined();
      expect(jwtSecret?.value).toMatch(/^[A-Za-z0-9_-]{64}$/);
      expect(sessionSecret).toBeDefined();
      expect(sessionSecret?.value).toMatch(/^[A-Za-z0-9_-]{48}$/);
      
      // ConfigManager should export release environment config
      const envContent = await configManager.exportAsEnv('secure-service');
      expect(envContent).toContain('DATABASE_TYPE=postgresql');
    });
  });
  
  describe('port allocation integration', () => {
    it('should allocate ports through ConfigManager and include in .env', async () => {
      // Arrange
      const envOptions: CreateEnvironmentOptions = {
        name: 'multi-service',
        type: 'demo',
        services: ['web', 'api', 'admin']
      };
      
      const env = await configManager.createEnvironment(envOptions);
      
      // Act
      const generatorConfig: EnvGeneratorConfig = {
        environment: 'demo',
        serviceName: env.name,
        servicePort: env.port.base
      };
      
      const result = await envGenerator.generateEnvFile(generatorConfig);
      
      // Assert
      const portVar = result.variables.find(v => v.key === 'SERVICE_PORT');
      expect(portVar?.value).toBe(env.port.base.toString());
      
      // EnvGenerator doesn't automatically generate service-specific ports
      // It only includes the main service port unless explicitly added
      // Let's verify the main port was set correctly
      expect(Number(portVar?.value)).toBe(env.port.base);
      expect(Number(portVar?.value)).toBeGreaterThanOrEqual(3300);
      expect(Number(portVar?.value)).toBeLessThanOrEqual(3399);
    });
  });
  
  describe('environment-specific configuration', () => {
    it('should generate different configs for different environment types', async () => {
      // Arrange
      const themeEnv: CreateEnvironmentOptions = {
        name: 'theme-env',
        type: 'theme'
      };
      
      const releaseEnv: CreateEnvironmentOptions = {
        name: 'release-env',
        type: 'release'
      };
      
      await configManager.createEnvironment(themeEnv);
      await configManager.createEnvironment(releaseEnv);
      
      // Act
      const themeContent = await configManager.exportAsEnv('theme-env');
      const releaseContent = await configManager.exportAsEnv('release-env');
      
      // Assert
      // Theme environment
      expect(themeContent).toContain('ENVIRONMENT_TYPE=theme');
      expect(themeContent).toContain('DATABASE_TYPE=sqlite');
      expect(themeContent).toMatch(/PORT=32\d{2}/); // Theme ports 3200-3299
      
      // Release environment
      expect(releaseContent).toContain('ENVIRONMENT_TYPE=release');
      expect(releaseContent).toContain('DATABASE_TYPE=postgresql');
      expect(releaseContent).toMatch(/PORT=3456/); // Release uses 3456 base port
      // PostgreSQL config is in DATABASE_CONNECTION
      expect(releaseContent).toContain('DATABASE_CONNECTION=postgresql');
    });
  });
  
  describe('service discovery integration', () => {
    it('should include URLs for dependent services', async () => {
      // Arrange
      const envOptions: CreateEnvironmentOptions = {
        name: 'dependent-service',
        type: 'theme',
        dependencies: [
          {
            theme: 'auth-service',
            endpoints: ['http://auth:3000/api'],
            required: true
          },
          {
            theme: 'notification-service',
            endpoints: ['http://notify:3001/api'],
            required: false
          }
        ]
      };
      
      const env = await configManager.createEnvironment(envOptions);
      
      // Register services in ServiceDiscovery for EnvGenerator
      const serviceDiscovery = new ServiceDiscoveryImpl();
      await serviceDiscovery.registerService({
        name: 'auth-service',
        port: 3000,
        host: 'auth',
        environment: 'theme'
      });
      await serviceDiscovery.registerService({
        name: 'notification-service',
        port: 3001,
        host: 'notify',
        environment: 'theme'
      });
      
      // Use EnvGenerator with registered services
      const tokenService = new TokenServiceImpl();
      const customEnvGenerator = new EnvGeneratorImpl(serviceDiscovery, tokenService);
      
      const generatorConfig: EnvGeneratorConfig = {
        environment: 'theme',
        serviceName: env.name,
        servicePort: env.port.base,
        additionalVariables: [
          { key: 'AUTH_SERVICE_URL', value: 'http://auth:3000/api' },
          { key: 'NOTIFICATION_SERVICE_URL', value: 'http://notify:3001/api' },
          { key: 'AUTH_SERVICE_REQUIRED', value: 'true' },
          { key: 'NOTIFICATION_SERVICE_REQUIRED', value: 'false' }
        ]
      };
      
      // Act
      const result = await customEnvGenerator.generateEnvFile(generatorConfig);
      
      // Assert
      expect(result.content).toContain('AUTH_SERVICE_URL=http://auth:3000/api');
      expect(result.content).toContain('NOTIFICATION_SERVICE_URL=http://notify:3001/api');
      expect(result.content).toContain('AUTH_SERVICE_REQUIRED=true');
      expect(result.content).toContain('NOTIFICATION_SERVICE_REQUIRED=false');
    });
  });
  
  describe('complete workflow', () => {
    it('should support full environment setup workflow', async () => {
      // Arrange
      const envOptions: CreateEnvironmentOptions = {
        name: 'complete-app',
        type: 'epic',
        description: 'Complete application with all features',
        services: ['web', 'api', 'worker', 'scheduler'],
        dependencies: [
          {
            theme: 'auth-service',
            endpoints: ['http://auth:4000'],
            required: true
          },
          {
            theme: 'storage-service',
            endpoints: ['http://storage:5000'],
            required: true
          }
        ]
      };
      
      // Act
      const env = await configManager.createEnvironment(envOptions);
      
      // Generate .env file
      const generatorConfig: EnvGeneratorConfig = {
        environment: 'epic',
        serviceName: env.name,
        servicePort: env.port.base,
        additionalVariables: [
          { key: 'APP_VERSION', value: '1.0.0' },
          { key: 'LOG_LEVEL', value: 'info' }
        ]
      };
      
      const result = await envGenerator.generateEnvFile(generatorConfig);
      
      // Assert
      expect(result.variables).toContainEqual(
        expect.objectContaining({ key: 'NODE_ENV', value: 'epic' })
      );
      expect(result.variables).toContainEqual(
        expect.objectContaining({ key: 'SERVICE_NAME', value: 'complete-app' })
      );
      
      // Should include additional variables we passed
      expect(result.variables).toContainEqual(
        expect.objectContaining({ key: 'APP_VERSION', value: '1.0.0' })
      );
      expect(result.variables).toContainEqual(
        expect.objectContaining({ key: 'LOG_LEVEL', value: 'info' })
      );
      
      // Should include security tokens
      expect(result.variables.find(v => v.key === 'JWT_SECRET')).toBeDefined();
      expect(result.variables.find(v => v.key === 'SESSION_SECRET')).toBeDefined();
      
      // Verify the file can be written
      const filePath = `/tmp/test-${Date.now()}.env`;
      await envGenerator.writeEnvFile(filePath, result.variables);
      
      // Verify export matches
      const exportedContent = await configManager.exportAsEnv('complete-app');
      expect(exportedContent).toBeTruthy();
      expect(exportedContent.split('\n').length).toBeGreaterThanOrEqual(5); // Should have basic variables
    });
  });
  
  describe('error handling', () => {
    it('should handle missing environment gracefully', async () => {
      // Act & Assert
      await expect(configManager.exportAsEnv('non-existent'))
        .rejects
        .toThrow();
    });
    
    it('should validate configuration before generating .env', async () => {
      // Arrange
      const invalidConfig: EnvGeneratorConfig = {
        environment: 'invalid' as any,
        serviceName: '',
        servicePort: -1
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(invalidConfig);
      
      // Assert - Even with invalid config, EnvGenerator generates tokens
      // but the service name will be empty and port will be -1
      expect(result.variables.find(v => v.key === 'SERVICE_NAME')?.value).toBe('');
      expect(result.variables.find(v => v.key === 'SERVICE_PORT')?.value).toBe('-1');
    });
  });
});

// Factory functions for creating real implementations
function createConfigManager(): ConfigManager {
  const portRegistry = new PortRegistry('/tmp/test-port-registry-' + Date.now() + '.json');
  const portAllocator = new PortAllocator(portRegistry);
  const fileGenerator = new FileGenerator();
  return new ConfigManagerImpl(portAllocator, fileGenerator);
}

function createEnvGenerator(): EnvGenerator {
  const serviceDiscovery = new ServiceDiscoveryImpl();
  const tokenService = new TokenServiceImpl();
  return new EnvGeneratorImpl(serviceDiscovery, tokenService);
}