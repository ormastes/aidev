/**
 * Scenario Test: Security tokens are generated uniquely per environment
 * 
 * This test verifies that security tokens (JWT secrets, API keys, session secrets)
 * are generated uniquely for each environment and service, ensuring proper security isolation.
 */

import { EnvGenerator, EnvGeneratorConfig } from '../../src/external/env-generator';
import { TokenService } from '../../src/external/token-service';
import { EnvGeneratorImpl } from '../../src/implementations/env-generator-impl';
import { ServiceDiscoveryImpl } from '../../src/implementations/service-discovery-impl';
import { TokenServiceImpl } from '../../src/implementations/token-service-impl';

describe('Scenario: Security tokens are generated uniquely per environment', () => {
  let envGenerator: EnvGenerator;
  let tokenService: TokenService;
  
  beforeEach(() => {
    const serviceDiscovery = new ServiceDiscoveryImpl();
    tokenService = new TokenServiceImpl();
    envGenerator = new EnvGeneratorImpl(serviceDiscovery, tokenService);
  });
  
  it('should generate different tokens for different environments', async () => {
    // Given: Same service in different environments
    const devConfig: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'api-service',
      servicePort: 3000
    };
    
    const testConfig: EnvGeneratorConfig = {
      environment: 'test',
      serviceName: 'api-service',
      servicePort: 3000
    };
    
    const releaseConfig: EnvGeneratorConfig = {
      environment: 'release',
      serviceName: 'api-service',
      servicePort: 3000
    };
    
    // When: Generating env files for each environment
    const devResult = await envGenerator.generateEnvFile(devConfig);
    const testResult = await envGenerator.generateEnvFile(testConfig);
    const releaseResult = await envGenerator.generateEnvFile(releaseConfig);
    
    // Then: Each environment should have unique tokens
    const devJwt = devResult.variables.find(v => v.key === 'JWT_SECRET')?.value;
    const testJwt = testResult.variables.find(v => v.key === 'JWT_SECRET')?.value;
    const releaseJwt = releaseResult.variables.find(v => v.key === 'JWT_SECRET')?.value;
    
    expect(devJwt).toBeDefined();
    expect(testJwt).toBeDefined();
    expect(releaseJwt).toBeDefined();
    
    // All JWT secrets should be different
    expect(devJwt).not.toBe(testJwt);
    expect(devJwt).not.toBe(releaseJwt);
    expect(testJwt).not.toBe(releaseJwt);
    
    // Same for API keys
    const devApiKey = devResult.variables.find(v => v.key === 'API_KEY')?.value;
    const testApiKey = testResult.variables.find(v => v.key === 'API_KEY')?.value;
    const releaseApiKey = releaseResult.variables.find(v => v.key === 'API_KEY')?.value;
    
    expect(devApiKey).not.toBe(testApiKey);
    expect(devApiKey).not.toBe(releaseApiKey);
    expect(testApiKey).not.toBe(releaseApiKey);
    
    // And session secrets
    const devSession = devResult.variables.find(v => v.key === 'SESSION_SECRET')?.value;
    const testSession = testResult.variables.find(v => v.key === 'SESSION_SECRET')?.value;
    const releaseSession = releaseResult.variables.find(v => v.key === 'SESSION_SECRET')?.value;
    
    expect(devSession).not.toBe(testSession);
    expect(devSession).not.toBe(releaseSession);
    expect(testSession).not.toBe(releaseSession);
  });
  
  it('should generate different tokens for different services in same environment', async () => {
    // Given: Different services in the same environment
    const authConfig: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'auth-service',
      servicePort: 4000
    };
    
    const userConfig: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'user-service',
      servicePort: 4001
    };
    
    const apiConfig: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'api-service',
      servicePort: 4002
    };
    
    // When: Generating env files for each service
    const authResult = await envGenerator.generateEnvFile(authConfig);
    const userResult = await envGenerator.generateEnvFile(userConfig);
    const apiResult = await envGenerator.generateEnvFile(apiConfig);
    
    // Then: Each service should have unique tokens
    const authJwt = authResult.variables.find(v => v.key === 'JWT_SECRET')?.value;
    const userJwt = userResult.variables.find(v => v.key === 'JWT_SECRET')?.value;
    const apiJwt = apiResult.variables.find(v => v.key === 'JWT_SECRET')?.value;
    
    expect(authJwt).not.toBe(userJwt);
    expect(authJwt).not.toBe(apiJwt);
    expect(userJwt).not.toBe(apiJwt);
  });
  
  it('should maintain token format and strength requirements', async () => {
    // Given: Multiple environment configurations
    const configs: EnvGeneratorConfig[] = [
      { environment: "development", serviceName: 'service-1', servicePort: 3001 },
      { environment: 'test', serviceName: 'service-2', servicePort: 3002 },
      { environment: 'release', serviceName: 'service-3', servicePort: 3003 },
      { environment: 'theme', serviceName: 'service-4', servicePort: 3004 },
      { environment: 'demo', serviceName: 'service-5', servicePort: 3005 },
      { environment: 'epic', serviceName: 'service-6', servicePort: 3006 }
    ];
    
    // When: Generating env files for all configurations
    const results = await Promise.all(
      configs.map(config => envGenerator.generateEnvFile(config))
    );
    
    // Then: All tokens should meet security requirements
    for (const result of results) {
      const jwtSecret = result.variables.find(v => v.key === 'JWT_SECRET')?.value;
      const apiKey = result.variables.find(v => v.key === 'API_KEY')?.value;
      const sessionSecret = result.variables.find(v => v.key === 'SESSION_SECRET')?.value;
      
      // JWT secrets should be 64 characters (URL-safe base64)
      expect(jwtSecret).toMatch(/^[A-Za-z0-9_-]{64}$/);
      
      // API keys should be 32 characters
      expect(apiKey).toMatch(/^[A-Za-z0-9_-]{32}$/);
      
      // Session secrets should be 48 characters
      expect(sessionSecret).toMatch(/^[A-Za-z0-9_-]{48}$/);
    }
  });
  
  it('should generate unique tokens even when called rapidly', async () => {
    // Given: Same configuration
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'rapid-service',
      servicePort: 5000
    };
    
    // When: Generating multiple env files rapidly
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(envGenerator.generateEnvFile(config));
    }
    
    const results = await Promise.all(promises);
    
    // Then: All tokens should be unique
    const jwtSecrets = results.map(r => r.variables.find(v => v.key === 'JWT_SECRET')?.value);
    const uniqueJwtSecrets = new Set(jwtSecrets);
    
    expect(uniqueJwtSecrets.size).toBe(10);
    
    const apiKeys = results.map(r => r.variables.find(v => v.key === 'API_KEY')?.value);
    const uniqueApiKeys = new Set(apiKeys);
    
    expect(uniqueApiKeys.size).toBe(10);
  });
  
  it('should mark security tokens as secret in metadata', async () => {
    // Given: Any configuration
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'metadata-test',
      servicePort: 6000
    };
    
    // When: Generating env file
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Security tokens should be marked as secret
    const jwtSecret = result.variables.find(v => v.key === 'JWT_SECRET');
    const apiKey = result.variables.find(v => v.key === 'API_KEY');
    const sessionSecret = result.variables.find(v => v.key === 'SESSION_SECRET');
    
    expect(jwtSecret?.isSecret).toBe(true);
    expect(apiKey?.isSecret).toBe(true);
    expect(sessionSecret?.isSecret).toBe(true);
    
    // But non-security variables should not be marked as secret
    const nodeEnv = result.variables.find(v => v.key === 'NODE_ENV');
    const serviceName = result.variables.find(v => v.key === 'SERVICE_NAME');
    
    expect(nodeEnv?.isSecret).toBeUndefined();
    expect(serviceName?.isSecret).toBeUndefined();
  });
  
  it('should include appropriate security token descriptions', async () => {
    // Given: Any configuration
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'description-test',
      servicePort: 7000
    };
    
    // When: Generating env file
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Security tokens should have appropriate descriptions
    const jwtSecret = result.variables.find(v => v.key === 'JWT_SECRET');
    const apiKey = result.variables.find(v => v.key === 'API_KEY');
    const sessionSecret = result.variables.find(v => v.key === 'SESSION_SECRET');
    
    expect(jwtSecret?.description).toContain('JWT');
    expect(apiKey?.description).toContain('API');
    expect(sessionSecret?.description?.toLowerCase()).toContain('session');
  });
  
  it('should handle custom security tokens alongside generated ones', async () => {
    // Given: Configuration with custom security tokens
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'custom-security',
      servicePort: 8000,
      additionalVariables: [
        { 
          key: 'OAUTH_CLIENT_SECRET', 
          value: 'custom-oauth-secret-123',
          description: 'OAuth client secret',
          isSecret: true
        },
        {
          key: 'ENCRYPTION_KEY',
          value: 'custom-encryption-key-456',
          description: 'Data encryption key',
          isSecret: true
        }
      ]
    };
    
    // When: Generating env file
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should include both generated and custom security tokens
    const jwtSecret = result.variables.find(v => v.key === 'JWT_SECRET');
    const apiKey = result.variables.find(v => v.key === 'API_KEY');
    const oauthSecret = result.variables.find(v => v.key === 'OAUTH_CLIENT_SECRET');
    const encryptionKey = result.variables.find(v => v.key === 'ENCRYPTION_KEY');
    
    expect(jwtSecret).toBeDefined();
    expect(apiKey).toBeDefined();
    expect(oauthSecret?.value).toBe('custom-oauth-secret-123');
    expect(encryptionKey?.value).toBe('custom-encryption-key-456');
    
    // All should be marked as secret
    expect(jwtSecret?.isSecret).toBe(true);
    expect(apiKey?.isSecret).toBe(true);
    expect(oauthSecret?.isSecret).toBe(true);
    expect(encryptionKey?.isSecret).toBe(true);
    
    // Generated tokens should still be unique
    expect(jwtSecret?.value).not.toBe('custom-oauth-secret-123');
    expect(apiKey?.value).not.toBe('custom-encryption-key-456');
  });
  
  it('should use token service for consistent token generation', async () => {
    // Given: Direct token generation from token service
    const directJwt = await tokenService.generateToken({ type: 'jwt-secret' });
    const directApiKey = await tokenService.generateToken({ type: 'api-key' });
    const directSession = await tokenService.generateToken({ type: 'session-secret' });
    
    // When: Generating env file
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'token-service-test',
      servicePort: 9000
    };
    
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Generated tokens should have same format as direct generation
    const envJwt = result.variables.find(v => v.key === 'JWT_SECRET')?.value;
    const envApiKey = result.variables.find(v => v.key === 'API_KEY')?.value;
    const envSession = result.variables.find(v => v.key === 'SESSION_SECRET')?.value;
    
    // Check format, not values (should be different)
    expect(envJwt).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(envApiKey).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(envSession).toMatch(/^[A-Za-z0-9_-]{48}$/);
    
    // But values should be unique
    expect(envJwt).not.toBe(directJwt.value);
    expect(envApiKey).not.toBe(directApiKey.value);
    expect(envSession).not.toBe(directSession.value);
  });
});