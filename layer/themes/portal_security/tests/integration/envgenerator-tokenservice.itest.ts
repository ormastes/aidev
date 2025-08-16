/**
 * Integration Test: EnvGenerator integrates with TokenService to include security tokens
 * 
 * This test verifies that the EnvGenerator can successfully obtain security tokens
 * from TokenService and include them in generated .env files.
 * 
 * Following Mock Free Test Oriented Development - No mocks, real implementations only.
 */

import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { EnvGenerator } from '../../children/EnvGenerator';
import { TokenService } from '../../children/TokenService';
import { ConfigManager } from '../../children/ConfigManager';
import { ServiceDiscovery } from '../../children/ServiceDiscovery';

describe('EnvGenerator integrates with TokenService', () => {
  let envGenerator: EnvGenerator;
  let tokenService: TokenService;
  let configManager: ConfigManager;
  let serviceDiscovery: ServiceDiscovery;
  const testOutputDir = path.join(__dirname, '../temp/env-test');

  beforeAll(() => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Initialize real services - no mocks
    tokenService = new TokenService({
      secret: 'test-secret-key-for-integration-testing',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      issuer: 'portal-security-test'
    });

    configManager = new ConfigManager(
      path.join(testOutputDir, 'config')
    );

    serviceDiscovery = new ServiceDiscovery(
      configManager,
      { 
        enableAutoDiscovery: false,
        healthCheckInterval: 60000 
      }
    );

    envGenerator = new EnvGenerator(
      tokenService,
      configManager,
      serviceDiscovery
    );
  });

  afterEach(() => {
    // Clean up generated files
    const files = fs.readdirSync(testOutputDir);
    for (const file of files) {
      if (file.startsWith('.env')) {
        fs.unlinkSync(path.join(testOutputDir, file));
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

  describe('Security Token Generation', () => {
    it('should generate .env file with JWT secrets from TokenService', async () => {
      // Act
      const result = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test'),
        includeSecrets: true,
        includeServiceUrls: false,
        includePorts: false
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.path).toBe(path.join(testOutputDir, '.env.test'));
      expect(result.environment).toBe('test');
      expect(result.variables).toBeDefined();

      // Verify JWT secrets are included
      expect(result.variables.JWT_SECRET).toBeDefined();
      expect(result.variables.JWT_SECRET.length).toBeGreaterThan(32);
      expect(result.variables.JWT_ACCESS_SECRET).toContain('_access_test');
      expect(result.variables.JWT_REFRESH_SECRET).toContain('_refresh_test');

      // Verify file was created
      expect(fs.existsSync(result.path)).toBe(true);

      // Read and verify file contents
      const fileContent = fs.readFileSync(result.path, 'utf-8');
      expect(fileContent).toContain('JWT_SECRET=');
      expect(fileContent).toContain('JWT_ACCESS_SECRET=');
      expect(fileContent).toContain('JWT_REFRESH_SECRET=');
    });

    it('should generate unique API keys using TokenService', async () => {
      // Act
      const result = await envGenerator.generateEnvFile({
        environment: 'development',
        outputPath: path.join(testOutputDir, '.env.dev'),
        includeSecrets: true
      });

      // Assert
      expect(result.variables.API_KEY).toBeDefined();
      expect(result.variables.API_KEY).toMatch(/^ak_[\w-]+$/);
      expect(result.variables.INTERNAL_API_KEY).toBeDefined();
      expect(result.variables.INTERNAL_API_KEY).toMatch(/^ak_[\w-]+$/);
      
      // Verify API keys are different
      expect(result.variables.API_KEY).not.toBe(result.variables.INTERNAL_API_KEY);
    });

    it('should generate session secrets using TokenService', async () => {
      // Act
      const result = await envGenerator.generateEnvFile({
        environment: 'demo',
        outputPath: path.join(testOutputDir, '.env.demo'),
        includeSecrets: true
      });

      // Assert
      expect(result.variables.SESSION_SECRET).toBeDefined();
      expect(result.variables.SESSION_SECRET.length).toBeGreaterThanOrEqual(64);
      expect(result.variables.SESSION_TIMEOUT).toBeDefined();
    });

    it('should generate environment-specific security tokens', async () => {
      // Generate for multiple environments
      const devResult = await envGenerator.generateEnvFile({
        environment: 'development',
        outputPath: path.join(testOutputDir, '.env.development')
      });

      const prodResult = await envGenerator.generateEnvFile({
        environment: 'release',
        outputPath: path.join(testOutputDir, '.env.release')
      });

      // Verify each environment has unique tokens
      expect(devResult.variables.JWT_SECRET).not.toBe(prodResult.variables.JWT_SECRET);
      expect(devResult.variables.API_KEY).not.toBe(prodResult.variables.API_KEY);
      expect(devResult.variables.SESSION_SECRET).not.toBe(prodResult.variables.SESSION_SECRET);

      // Verify environment-specific suffixes
      expect(devResult.variables.JWT_ACCESS_SECRET).toContain('_development');
      expect(prodResult.variables.JWT_ACCESS_SECRET).toContain('_release');
    });
  });

  describe('TokenService Integration', () => {
    it('should use TokenService.generateSecret for creating JWT secrets', async () => {
      // Spy on TokenService methods
      const generateSecretSpy = jest.spyOn(tokenService, 'generateSecret');
      const generateApiKeySpy = jest.spyOn(tokenService, 'generateApiKey');

      // Act
      await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test'),
        includeSecrets: true
      });

      // Assert - verify TokenService methods were called
      expect(generateSecretSpy).toHaveBeenCalled();
      expect(generateApiKeySpy).toHaveBeenCalled();

      // Clean up spies
      generateSecretSpy.mockRestore();
      generateApiKeySpy.mockRestore();
    });

    it('should validate generated tokens can be used by TokenService', async () => {
      // Generate env file with security tokens
      const result = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.test'),
        includeSecrets: true
      });

      // Create new TokenService with generated secret
      const testTokenService = new TokenService({
        secret: result.variables.JWT_SECRET,
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d'
      });

      // Generate and verify a token using the generated secret
      const token = await testTokenService.generateToken({
        userId: 'test-user',
        username: 'testuser',
        roles: ['user']
      });

      const verified = await testTokenService.verifyToken(token);

      // Assert token can be verified with generated secret
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe('test-user');
      expect(verified?.username).toBe('testuser');
    });
  });

  describe('Complete Environment Generation', () => {
    it('should generate complete .env file with all security configurations', async () => {
      // Register a test service with ServiceDiscovery
      await serviceDiscovery.registerService('test', {
        name: 'test-api',
        port: 3001,
        protocol: 'http',
        healthCheckPath: '/health'
      });

      // Act
      const result = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.complete'),
        includeSecrets: true,
        includeServiceUrls: true,
        includePorts: true,
        customVariables: {
          CUSTOM_VAR: 'custom-value',
          APP_NAME: 'Portal Security Test'
        }
      });

      // Assert - verify all sections are present
      expect(result.variables.NODE_ENV).toBe('test');
      expect(result.variables.JWT_SECRET).toBeDefined();
      expect(result.variables.API_KEY).toBeDefined();
      expect(result.variables.SESSION_SECRET).toBeDefined();
      expect(result.variables.CORS_ENABLED).toBeDefined();
      expect(result.variables.DB_TYPE).toBe('sqlite');
      expect(result.variables.CUSTOM_VAR).toBe('custom-value');
      expect(result.variables.APP_NAME).toBe('Portal Security Test');

      // Verify file formatting
      const fileContent = fs.readFileSync(result.path, 'utf-8');
      expect(fileContent).toContain('# Environment');
      expect(fileContent).toContain('# Security');
      expect(fileContent).toContain('# Database');
      expect(fileContent).toContain('# Custom');
    });

    it('should update existing .env file with new security tokens', async () => {
      const envPath = path.join(testOutputDir, '.env.update');

      // Create initial env file
      const initial = await envGenerator.generateEnvFile({
        environment: 'test',
        outputPath: envPath,
        includeSecrets: false,
        customVariables: {
          EXISTING_VAR: 'existing-value'
        }
      });

      // Update with security tokens
      const updated = await envGenerator.updateEnvFile('test', {
        JWT_SECRET: await tokenService.generateSecret(),
        API_KEY: await tokenService.generateApiKey(),
        NEW_VAR: 'new-value'
      }, envPath);

      // Assert
      expect(updated.variables.EXISTING_VAR).toBe('existing-value');
      expect(updated.variables.JWT_SECRET).toBeDefined();
      expect(updated.variables.API_KEY).toBeDefined();
      expect(updated.variables.NEW_VAR).toBe('new-value');
    });
  });

  describe('Error Handling', () => {
    it('should handle TokenService errors gracefully', async () => {
      // Create EnvGenerator with a TokenService that will fail
      const failingTokenService = new TokenService({
        secret: '' // Invalid secret
      });

      const failingEnvGenerator = new EnvGenerator(
        failingTokenService,
        configManager,
        serviceDiscovery
      );

      // Should still generate env file even if some token operations fail
      const result = await failingEnvGenerator.generateEnvFile({
        environment: 'test',
        outputPath: path.join(testOutputDir, '.env.error'),
        includeSecrets: true
      });

      expect(result).toBeDefined();
      expect(result.variables.NODE_ENV).toBe('test');
    });
  });

  describe('Security Best Practices', () => {
    it('should set secure flags appropriately for different environments', async () => {
      // Development environment
      const devResult = await envGenerator.generateEnvFile({
        environment: 'development',
        outputPath: path.join(testOutputDir, '.env.dev.security')
      });

      expect(devResult.variables.CORS_ENABLED).toBe('true');
      expect(devResult.variables.SECURE_COOKIES).toBe('false');
      expect(devResult.variables.HTTPS_ONLY).toBe('false');

      // Production/Release environment
      const prodResult = await envGenerator.generateEnvFile({
        environment: 'release',
        outputPath: path.join(testOutputDir, '.env.release.security')
      });

      expect(prodResult.variables.CORS_ENABLED).toBe('false');
      expect(prodResult.variables.SECURE_COOKIES).toBe('true');
      expect(prodResult.variables.HTTPS_ONLY).toBe('true');
    });

    it('should use different session timeouts for different environments', async () => {
      const devResult = await envGenerator.generateEnvFile({
        environment: 'development',
        outputPath: path.join(testOutputDir, '.env.dev.session')
      });

      const prodResult = await envGenerator.generateEnvFile({
        environment: 'release',
        outputPath: path.join(testOutputDir, '.env.release.session')
      });

      // Development should have longer session timeout
      expect(parseInt(devResult.variables.SESSION_TIMEOUT)).toBeGreaterThan(
        parseInt(prodResult.variables.SESSION_TIMEOUT)
      );
    });
  });
});