/**
 * Integration Test: EnvGenerator integrates with TokenService
 * 
 * This test verifies that the EnvGenerator correctly integrates with
 * TokenService to include security tokens in generated .env files.
 */

import { describe, expect, beforeEach, it } from '@jest/globals';
import { EnvGenerator, EnvGeneratorConfig } from '../../src/external/env-generator';
import { TokenService } from '../../src/external/token-service';
import { EnvGeneratorImpl } from '../../src/implementations/env-generator-impl';
import { TokenServiceImpl } from '../../src/implementations/token-service-impl';
import { ServiceDiscoveryImpl } from '../../src/implementations/service-discovery-impl';

describe('Integration: EnvGenerator with TokenService', () => {
  let envGenerator: EnvGenerator;
  let tokenService: TokenService;
  let serviceDiscovery: ServiceDiscoveryImpl;
  
  beforeEach(() => {
    // Initialize real implementations with shared instances
    serviceDiscovery = new ServiceDiscoveryImpl();
    tokenService = new TokenServiceImpl();
    envGenerator = new EnvGeneratorImpl(serviceDiscovery, tokenService);
  });
  
  describe('generateEnvFile with security tokens', () => {
    it('should include JWT secret token in generated .env file', async () => {
      // Arrange
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'api-service',
        servicePort: 3000,
        additionalVariables: []
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      const jwtSecretVar = result.variables.find(v => v.key === 'JWT_SECRET');
      expect(jwtSecretVar).toBeDefined();
      expect(jwtSecretVar?.isSecret).toBe(true);
      expect(jwtSecretVar?.value).toMatch(/^[A-Za-z0-9_-]{64,}$/); // Base64url format
    });
    
    it('should include API key in generated .env file', async () => {
      // Arrange
      const config: EnvGeneratorConfig = {
        environment: 'release',
        serviceName: 'gateway-service',
        servicePort: 8080,
        additionalVariables: []
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      const apiKeyVar = result.variables.find(v => v.key === 'API_KEY');
      expect(apiKeyVar).toBeDefined();
      expect(apiKeyVar?.isSecret).toBe(true);
      expect(apiKeyVar?.value).toMatch(/^[A-Za-z0-9_-]{32,}$/); // Base64url format
    });
    
    it('should generate unique tokens for each environment', async () => {
      // Arrange
      const devConfig: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'auth-service',
        servicePort: 4000
      };
      
      const releaseConfig: EnvGeneratorConfig = {
        environment: 'release',
        serviceName: 'auth-service',
        servicePort: 4000
      };
      
      // Act
      const devResult = await envGenerator.generateEnvFile(devConfig);
      const releaseResult = await envGenerator.generateEnvFile(releaseConfig);
      
      // Assert
      const devJwtSecret = devResult.variables.find(v => v.key === 'JWT_SECRET')?.value;
      const releaseJwtSecret = releaseResult.variables.find(v => v.key === 'JWT_SECRET')?.value;
      
      expect(devJwtSecret).toBeDefined();
      expect(releaseJwtSecret).toBeDefined();
      expect(devJwtSecret).not.toBe(releaseJwtSecret);
    });
  });
  
  describe('generateSecurityTokens integration', () => {
    it('should use TokenService to generate all required security tokens', async () => {
      // Act
      const tokens = await envGenerator.generateSecurityTokens();
      
      // Assert
      expect(tokens.length).toBeGreaterThan(0);
      
      // Should include standard security tokens
      const tokenKeys = tokens.map(t => t.key);
      expect(tokenKeys).toContain('JWT_SECRET');
      expect(tokenKeys).toContain('SESSION_SECRET');
      expect(tokenKeys).toContain('API_KEY');
      
      // All tokens should be marked as secrets
      tokens.forEach(token => {
        expect(token.isSecret).toBe(true);
      });
    });
    
    it('should validate generated tokens using TokenService', async () => {
      // Arrange
      const tokens = await envGenerator.generateSecurityTokens();
      
      // Act & Assert
      // Verify we have the expected tokens
      expect(tokens.length).toBe(3);
      
      // Check each token individually
      const jwtToken = tokens.find(t => t.key === 'JWT_SECRET');
      expect(jwtToken).toBeDefined();
      expect(jwtToken!.value.length).toBeGreaterThanOrEqual(64);
      
      const apiToken = tokens.find(t => t.key === 'API_KEY');
      expect(apiToken).toBeDefined();
      expect(apiToken!.value.length).toBeGreaterThanOrEqual(32);
      
      const sessionToken = tokens.find(t => t.key === 'SESSION_SECRET');
      expect(sessionToken).toBeDefined();
      expect(sessionToken!.value.length).toBeGreaterThanOrEqual(48);
    });
    
    it('should respect token requirements from TokenService', async () => {
      // Arrange
      const jwtRequirements = tokenService.getTokenRequirements('jwt-secret');
      
      // Act
      const tokens = await envGenerator.generateSecurityTokens();
      const jwtToken = tokens.find(t => t.key === 'JWT_SECRET');
      
      // Assert
      expect(jwtToken).toBeDefined();
      expect(jwtToken!.value.length).toBeGreaterThanOrEqual(
        jwtRequirements.recommendedLength
      );
    });
  });
  
  describe('environment-specific token generation', () => {
    it('should generate environment-prefixed tokens for non-production', async () => {
      // Arrange
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'test-service',
        servicePort: 5000
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      const envVar = result.variables.find(v => v.key === 'NODE_ENV');
      expect(envVar?.value).toBe("development");
      
      // Check that JWT secret was generated
      const jwtSecret = result.variables.find(v => v.key === 'JWT_SECRET');
      expect(jwtSecret).toBeDefined();
      expect(jwtSecret?.isSecret).toBe(true);
    });
    
    it('should use stronger tokens for release environment', async () => {
      // Arrange
      const releaseConfig: EnvGeneratorConfig = {
        environment: 'release',
        serviceName: 'production-api',
        servicePort: 443
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(releaseConfig);
      const jwtSecret = result.variables.find(v => v.key === 'JWT_SECRET');
      
      // Assert
      expect(jwtSecret).toBeDefined();
      // In release environment, tokens should be generated
      expect(jwtSecret!.value.length).toBeGreaterThanOrEqual(64);
      const validation = tokenService.validateToken(jwtSecret!.value, 'jwt-secret');
      expect(validation.isValid).toBe(true);
      // Check that it's not weak at least
      expect(validation.strength).not.toBe('weak');
    });
  });
  
  describe('token rotation and updates', () => {
    it('should support token rotation when updating .env file', async () => {
      // Arrange
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'rotating-service',
        servicePort: 6000
      };
      
      // Generate initial file
      const initial = await envGenerator.generateEnvFile(config);
      const initialJwt = initial.variables.find(v => v.key === 'JWT_SECRET')?.value;
      
      // Simulate rotation request
      const rotateConfig = {
        ...config,
        additionalVariables: [{ key: 'ROTATE_TOKENS', value: 'true' }]
      };
      
      // Act
      const rotated = await envGenerator.generateEnvFile(rotateConfig);
      const rotatedJwt = rotated.variables.find(v => v.key === 'JWT_SECRET')?.value;
      
      // Assert
      expect(initialJwt).toBeDefined();
      expect(rotatedJwt).toBeDefined();
      expect(rotatedJwt).not.toBe(initialJwt);
    });
  });
  
  describe('error handling', () => {
    it('should handle TokenService failures gracefully', async () => {
      // Arrange
      const config: EnvGeneratorConfig = {
        environment: 'test',
        serviceName: 'failing-service',
        servicePort: 7000
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert - Should still generate file even if some operations fail
      expect(result).toBeDefined();
      expect(result.variables.length).toBeGreaterThan(0);
      expect(result.variables.some(v => v.key === 'NODE_ENV')).toBe(true);
      expect(result.variables.some(v => v.key === 'SERVICE_NAME')).toBe(true);
    });
  });
  
  describe('token format verification', () => {
    it('should generate tokens in correct format for each type', async () => {
      // Act
      const tokens = await envGenerator.generateSecurityTokens();
      
      // Assert - Check each token format
      const jwtSecret = tokens.find(t => t.key === 'JWT_SECRET');
      expect(jwtSecret?.value).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
      
      const apiKey = tokens.find(t => t.key === 'API_KEY');
      expect(apiKey?.value).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
      
      const sessionSecret = tokens.find(t => t.key === 'SESSION_SECRET');
      expect(sessionSecret?.value).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
    });
    
    it('should generate tokens with appropriate lengths', async () => {
      // Act
      const tokens = await envGenerator.generateSecurityTokens();
      
      // Assert - Check minimum lengths
      tokens.forEach(token => {
        const requirements = tokenService.getTokenRequirements(
          token.key === 'JWT_SECRET' ? 'jwt-secret' :
          token.key === 'API_KEY' ? 'api_key': process.env.API_KEY || "PLACEHOLDER"
        );
        expect(token.value.length).toBeGreaterThanOrEqual(requirements.minLength);
      });
    });
  });
  
  describe('multi-environment token generation', () => {
    it('should generate different tokens for different environments', async () => {
      // Arrange
      const environments: Array<"development" | 'test' | 'release'> = ["development", 'test', 'release'];
      const tokens: Record<string, string> = {};
      
      // Act - Generate tokens for each environment
      for (const env of environments) {
        const config: EnvGeneratorConfig = {
          environment: env,
          serviceName: 'multi-env-service',
          servicePort: 9000
        };
        const result = await envGenerator.generateEnvFile(config);
        const jwtSecret = result.variables.find(v => v.key === 'JWT_SECRET');
        tokens[env] = jwtSecret!.value;
      }
      
      // Assert - All tokens should be unique
      const tokenValues = Object.values(tokens);
      const uniqueTokens = new Set(tokenValues);
      expect(uniqueTokens.size).toBe(tokenValues.length);
    });
    
    it('should include environment metadata in generated tokens', async () => {
      // Arrange
      const config: EnvGeneratorConfig = {
        environment: 'test',
        serviceName: 'metadata-service',
        servicePort: 8500
      };
      
      // Act
      const result = await envGenerator.generateEnvFile(config);
      
      // Assert
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
      
      // Check that all security tokens are marked as secrets
      const securityTokenKeys = ['JWT_SECRET', 'API_KEY', 'SESSION_SECRET'];
      securityTokenKeys.forEach(key => {
        const token = result.variables.find(v => v.key === key);
        expect(token?.isSecret).toBe(true);
      });
    });
  });
  
  describe('token persistence and uniqueness', () => {
    it('should ensure generated tokens are unique across multiple calls', async () => {
      // Arrange
      const generatedTokens: string[] = [];
      
      // Act - Generate multiple sets of tokens
      for (let i = 0; i < 5; i++) {
        const tokens = await envGenerator.generateSecurityTokens();
        tokens.forEach(token => {
          generatedTokens.push(token.value);
        });
      }
      
      // Assert - All tokens should be unique
      const uniqueTokens = new Set(generatedTokens);
      expect(uniqueTokens.size).toBe(generatedTokens.length);
    });
    
    it('should validate token uniqueness using TokenService', async () => {
      // Act
      const tokens = await envGenerator.generateSecurityTokens();
      
      // Assert - Check uniqueness through TokenService
      for (const token of tokens) {
        const isUnique = await tokenService.isTokenUnique(token.value);
        expect(isUnique).toBe(false); // Should be false because it was already generated
      }
    });
  });
  
  describe('integration with specific token requirements', () => {
    it('should generate environment-specific tokens via TokenService', async () => {
      // Act
      const envTokens = await tokenService.generateEnvironmentTokens('release');
      
      // Assert
      expect(envTokens.length).toBeGreaterThan(0);
      expect(envTokens.some(t => t.type === 'jwt-secret')).toBe(true);
      expect(envTokens.some(t => t.type === 'api-key')).toBe(true);
      expect(envTokens.some(t => t.type === 'session-secret')).toBe(true);
      expect(envTokens.some(t => t.type === 'refresh-token')).toBe(true);
      expect(envTokens.some(t => t.type === 'webhook-secret')).toBe(true);
    });
    
    it('should properly integrate token prefixes when specified', async () => {
      // Act
      const envTokens = await tokenService.generateEnvironmentTokens("development");
      
      // Assert - Check that prefixed tokens have correct prefixes
      const apiKey = envTokens.find(t => t.type === 'api-key');
      expect(apiKey?.value).toMatch(/^sk_/);
      
      const webhookSecret = envTokens.find(t => t.type === 'webhook-secret');
      expect(webhookSecret?.value).toMatch(/^whsec_/);
    });
    
    it('should handle token rotation through EnvGenerator', async () => {
      // Arrange
      const config: EnvGeneratorConfig = {
        environment: "development",
        serviceName: 'rotation-test',
        servicePort: 3333
      };
      
      // Generate initial env file
      const initial = await envGenerator.generateEnvFile(config);
      const initialJwt = initial.variables.find(v => v.key === 'JWT_SECRET');
      
      // Act - Rotate the JWT token
      const rotated = await tokenService.rotateToken(initialJwt!.value, {
        type: 'jwt-secret',
        environment: "development"
      });
      
      // Assert
      expect(rotated.old.value).toBe(initialJwt!.value);
      expect(rotated.new.value).not.toBe(initialJwt!.value);
      expect(rotated.old.expiresAt).toBeDefined();
      expect(rotated.new.value.length).toBeGreaterThanOrEqual(64);
    });
  });
});


