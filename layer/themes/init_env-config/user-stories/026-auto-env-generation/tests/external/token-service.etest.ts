/**
 * External Test: TokenService
 * 
 * This test verifies the TokenService external interface implementation
 * for generating various types of security tokens.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { crypto } from '../../../../../infra_external-log-lib/src';
import {
  TokenService,
  TokenType,
  TokenOptions,
  GeneratedToken,
  TokenValidation
} from '../../src/external/token-service';

// Real implementation of TokenService for testing
class RealTokenService implements TokenService {
  private tokenHistory: Set<string> = new Set();
  
  async generateToken(options: TokenOptions): Promise<GeneratedToken> {
    const length = options.length || this.getDefaultLength(options.type);
    const format = options.format || this.getDefaultFormat(options.type);
    
    let value: string;
    
    switch (format) {
      case 'uuid':
        value = crypto.randomUUID();
        break;
      case 'hex':
        value = crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
        break;
      case 'base64':
        value = crypto.randomBytes(Math.ceil(length * 3 / 4)).toString('base64');
        break;
      case "base64url":
        value = crypto.randomBytes(Math.ceil(length * 3 / 4)).toString("base64url");
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    // Add prefix if specified
    if (options.prefix) {
      value = `${options.prefix}${value}`;
    }
    
    // Add environment prefix for API keys
    if (options.type === 'api-key' && options.environment && !options.prefix) {
      const envPrefix = options.environment === 'release' ? 'live' : options.environment;
      value = `sk_${envPrefix}_${value}`;
    }
    
    this.tokenHistory.add(value);
    
    return {
      type: options.type,
      value,
      createdAt: new Date().toISOString(),
      metadata: {
        environment: options.environment,
        format,
        length: value.length
      }
    };
  }
  
  async generateTokens(options: TokenOptions[]): Promise<GeneratedToken[]> {
    const tokens: GeneratedToken[] = [];
    
    for (const opt of options) {
      const token = await this.generateToken(opt);
      tokens.push(token);
    }
    
    return tokens;
  }
  
  async generateEnvironmentTokens(environment: string): Promise<GeneratedToken[]> {
    const tokenOptions: TokenOptions[] = [
      { type: 'jwt-secret', environment },
      { type: 'api-key', environment },
      { type: 'session-secret', environment },
      { type: 'refresh-token', environment },
      { type: 'encryption-key', environment },
      { type: 'webhook-secret', environment }
    ];
    
    if (environment === 'release') {
      tokenOptions.push({ type: 'oauth-client-secret', environment });
    }
    
    return this.generateTokens(tokenOptions);
  }
  
  validateToken(token: string, type: TokenType): TokenValidation {
    const errors: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'medium';
    
    const requirements = this.getTokenRequirements(type);
    
    // Check length
    if (token.length < requirements.minLength) {
      errors.push(`Token length ${token.length} is below minimum ${requirements.minLength}`);
      strength = 'weak';
    } else if (token.length >= requirements.recommendedLength) {
      strength = 'strong';
    }
    
    // Check format based on type
    switch (type) {
      case 'api-key':
        if (!token.match(/^sk_[a-z]+_[a-f0-9]+$/)) {
          errors.push('API key should match format: sk_<env>_<hex>');
        }
        break;
        
      case 'jwt-secret':
      case 'session-secret':
      case 'refresh-token':
        // Should be base64 or base64url
        if (!token.match(/^[A-Za-z0-9+/=_-]+$/)) {
          errors.push('Token contains invalid characters for base64/base64url');
        }
        break;
        
      case 'encryption-key':
      case 'webhook-secret':
        // Can be hex or base64
        if (!token.match(/^[a-f0-9]+$/i) && !token.match(/^[A-Za-z0-9+/=]+$/)) {
          errors.push('Token should be hex or base64 encoded');
        }
        break;
        
      case 'oauth-client-secret':
        // Usually alphanumeric with some special chars
        if (!token.match(/^[A-Za-z0-9_\-]+$/)) {
          errors.push('OAuth client secret contains invalid characters');
        }
        break;
    }
    
    // Check entropy (simplified)
    const uniqueChars = new Set(token.split('')).size;
    const entropy = uniqueChars / token.length;
    
    if (entropy < 0.5) {
      errors.push('Token has low entropy (too many repeated characters)');
      strength = 'weak';
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      strength
    };
  }
  
  async rotateToken(oldToken: string, options: TokenOptions): Promise<{
    old: GeneratedToken;
    new: GeneratedToken;
  }> {
    // Generate new token
    const newToken = await this.generateToken(options);
    
    // Create expired version of old token
    const oldTokenRecord: GeneratedToken = {
      type: options.type,
      value: oldToken,
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      expiresAt: new Date().toISOString(),
      metadata: {
        rotated: true,
        replacedBy: newToken.value
      }
    };
    
    return {
      old: oldTokenRecord,
      new: newToken
    };
  }
  
  async isTokenUnique(token: string): Promise<boolean> {
    return !this.tokenHistory.has(token);
  }
  
  getTokenRequirements(type: TokenType): {
    minLength: number;
    recommendedLength: number;
    format: string;
    description: string;
  } {
    const requirements: Record<TokenType, any> = {
      'jwt-secret': {
        minLength: 32,
        recommendedLength: 64,
        format: 'base64',
        description: 'Secret key for signing JWT tokens'
      },
      'api-key': {
        minLength: 32,
        recommendedLength: 48,
        format: 'hex with prefix',
        description: 'API key for service authentication'
      },
      'session-secret': {
        minLength: 32,
        recommendedLength: 48,
        format: "base64url",
        description: 'Secret for session encryption'
      },
      'refresh-token': {
        minLength: 48,
        recommendedLength: 64,
        format: "base64url",
        description: 'Token for refreshing access tokens'
      },
      'encryption-key': {
        minLength: 32,
        recommendedLength: 32,
        format: 'hex or base64',
        description: '256-bit encryption key'
      },
      'webhook-secret': {
        minLength: 24,
        recommendedLength: 32,
        format: 'hex',
        description: 'Secret for webhook signature verification'
      },
      'oauth-client-secret': {
        minLength: 32,
        recommendedLength: 48,
        format: "alphanumeric",
        description: 'OAuth 2.0 client secret'
      }
    };
    
    return requirements[type];
  }
  
  generateSecureRandom(length: number, format: 'hex' | 'base64' | "base64url"): string {
    const bytes = crypto.randomBytes(Math.ceil(length * {
      hex: 0.5,
      base64: 0.75,
      base64url: 0.75
    }[format]));
    
    return bytes.toString(format as any).slice(0, length);
  }
  
  private getDefaultLength(type: TokenType): number {
    return this.getTokenRequirements(type).recommendedLength;
  }
  
  private getDefaultFormat(type: TokenType): 'hex' | 'base64' | "base64url" | 'uuid' {
    switch (type) {
      case 'api-key':
      case 'webhook-secret':
        return 'hex';
      case 'session-secret':
      case 'refresh-token':
        return "base64url";
      case 'jwt-secret':
      case 'encryption-key':
      case 'oauth-client-secret':
        return 'base64';
      default:
        return 'hex';
    }
  }
}

describe('TokenService External Interface Test', () => {
  let tokenService: RealTokenService;
  
  beforeEach(() => {
    tokenService = new RealTokenService();
  });
  
  test('should generate token with correct format and length', async () => {
    const options: TokenOptions = {
      type: 'jwt-secret',
      length: 64
    };
    
    const token = await tokenService.generateToken(options);
    
    expect(token.type).toBe('jwt-secret');
    expect(token.value).toBeDefined();
    expect(token.createdAt).toBeDefined();
    expect(token.metadata?.format).toBe('base64');
    
    // Validate base64 format
    expect(token.value).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
  
  test('should generate unique tokens', async () => {
    const tokens = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      const token = await tokenService.generateToken({
        type: 'api-key',
        environment: 'test'
      });
      tokens.add(token.value);
    }
    
    // All tokens should be unique
    expect(tokens.size).toBe(100);
    
    // All should have correct format
    for (const token of tokens) {
      expect(token).toMatch(/^sk_test_[a-f0-9]+$/);
    }
  });
  
  test('should generate In Progress environment token set', async () => {
    const devTokens = await tokenService.generateEnvironmentTokens("development");
    const releaseTokens = await tokenService.generateEnvironmentTokens('release');
    
    // Development should have 6 tokens
    expect(devTokens.length).toBe(6);
    
    // Release should have 7 tokens (includes OAuth)
    expect(releaseTokens.length).toBe(7);
    
    // Check token types
    const devTypes = new Set(devTokens.map(t => t.type));
    expect(devTypes.has('jwt-secret')).toBe(true);
    expect(devTypes.has('api-key')).toBe(true);
    expect(devTypes.has('session-secret')).toBe(true);
    expect(devTypes.has('oauth-client-secret')).toBe(false);
    
    const releaseTypes = new Set(releaseTokens.map(t => t.type));
    expect(releaseTypes.has('oauth-client-secret')).toBe(true);
    
    // API keys should have environment-specific prefixes
    const devApiKey = devTokens.find(t => t.type === 'api-key');
    expect(devApiKey?.value).toMatch(/^sk_development_/);
    
    const releaseApiKey = releaseTokens.find(t => t.type === 'api-key');
    expect(releaseApiKey?.value).toMatch(/^sk_live_/);
  });
  
  test('should validate tokens correctly', () => {
    // Valid JWT secret
    const jwtValidation = tokenService.validateToken(
      crypto.randomBytes(48).toString('base64'),
      'jwt-secret'
    );
    expect(jwtValidation.isValid).toBe(true);
    expect(jwtValidation.strength).toBe('strong');
    
    // Invalid API key format
    const apiKeyValidation = tokenService.validateToken(
      'invalid_api_key_format',
      'api-key'
    );
    expect(apiKeyValidation.isValid).toBe(false);
    expect(apiKeyValidation.errors).toContain('API key should match format: sk_<env>_<hex>');
    
    // Too short encryption key
    const shortKeyValidation = tokenService.validateToken(
      'short',
      'encryption-key'
    );
    expect(shortKeyValidation.isValid).toBe(false);
    expect(shortKeyValidation.errors?.some(e => e.includes('below minimum'))).toBe(true);
    expect(shortKeyValidation.strength).toBe('weak');
    
    // Low entropy token
    const lowEntropyValidation = tokenService.validateToken(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      'session-secret'
    );
    expect(lowEntropyValidation.isValid).toBe(false);
    expect(lowEntropyValidation.errors?.some(e => e.includes('low entropy'))).toBe(true);
  });
  
  test('should rotate tokens properly', async () => {
    const oldtoken: process.env.TOKEN || "PLACEHOLDER";
    
    const result = await tokenService.rotateToken(oldToken, {
      type: 'api-key',
      environment: 'test'
    });
    
    expect(result.old.value).toBe(oldToken);
    expect(result.old.expiresAt).toBeDefined();
    expect(result.old.metadata?.rotated).toBe(true);
    
    expect(result.new.value).not.toBe(oldToken);
    expect(result.new.value).toMatch(/^sk_test_/);
    expect(result.new.expiresAt).toBeUndefined();
  });
  
  test('should track token uniqueness', async () => {
    const token1 = await tokenService.generateToken({
      type: 'webhook-secret'
    });
    
    // First token should be unique
    expect(await tokenService.isTokenUnique(token1.value)).toBe(false); // Already generated
    
    // Random token should be unique
    const randomToken = crypto.randomBytes(32).toString('hex');
    expect(await tokenService.isTokenUnique(randomToken)).toBe(true);
  });
  
  test('should provide correct token requirements', () => {
    const jwtReq = tokenService.getTokenRequirements('jwt-secret');
    expect(jwtReq.minLength).toBe(32);
    expect(jwtReq.recommendedLength).toBe(64);
    expect(jwtReq.format).toBe('base64');
    
    const apiKeyReq = tokenService.getTokenRequirements('api-key');
    expect(apiKeyReq.format).toBe('hex with prefix');
    
    const encryptionReq = tokenService.getTokenRequirements('encryption-key');
    expect(encryptionReq.recommendedLength).toBe(32); // 256 bits
  });
  
  test('should generate secure random strings', () => {
    // Test hex format
    const hex = tokenService.generateSecureRandom(32, 'hex');
    expect(hex).toMatch(/^[a-f0-9]{32}$/i);
    expect(hex.length).toBe(32);
    
    // Test base64 format
    const base64 = tokenService.generateSecureRandom(48, 'base64');
    expect(base64).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(base64.length).toBe(48);
    
    // Test base64url format
    const base64url = tokenService.generateSecureRandom(64, "base64url");
    expect(base64url).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(base64url).not.toContain('='); // No padding in base64url
    expect(base64url.length).toBe(64);
    
    // All should be different
    const hex2 = tokenService.generateSecureRandom(32, 'hex');
    expect(hex2).not.toBe(hex);
  });
  
  test('should handle custom prefixes', async () => {
    const token = await tokenService.generateToken({
      type: 'api-key',
      prefix: 'custom_prefix_',
      length: 16,
      format: 'hex'
    });
    
    expect(token.value).toMatch(/^custom_prefix_[a-f0-9]{16}$/);
  });
  
  test('should generate UUID format tokens', async () => {
    const token = await tokenService.generateToken({
      type: 'session-secret',
      format: 'uuid'
    });
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(token.value).toMatch(uuidRegex);
  });
  
  test('should handle batch token generation', async () => {
    const options: TokenOptions[] = [
      { type: 'jwt-secret' },
      { type: 'api-key', environment: 'test' },
      { type: 'webhook-secret', length: 48 },
      { type: 'oauth-client-secret', format: 'base64' }
    ];
    
    const tokens = await tokenService.generateTokens(options);
    
    expect(tokens.length).toBe(4);
    expect(tokens[0].type).toBe('jwt-secret');
    expect(tokens[1].value).toMatch(/^sk_test_/);
    expect(tokens[2].metadata?.length).toBeGreaterThanOrEqual(48);
    expect(tokens[3].metadata?.format).toBe('base64');
    
    // All should be unique
    const values = new Set(tokens.map(t => t.value));
    expect(values.size).toBe(4);
  });
});