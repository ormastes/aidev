/**
 * Implementation of TokenService
 * 
 * This implementation provides secure token generation for
 * environment configurations using Node.js crypto module.
 */

import { crypto } from '../../../../../infra_external-log-lib/src';
import {
  TokenService,
  TokenType,
  TokenOptions,
  GeneratedToken,
  TokenValidation
} from '../external/token-service';

export class TokenServiceImpl implements TokenService {
  private generatedTokens: Set<string> = new Set();
  
  async generateToken(options: TokenOptions): Promise<GeneratedToken> {
    const requirements = this.getTokenRequirements(options.type);
    const length = options.length || requirements.recommendedLength;
    const format = options.format || 'base64url';
    
    let value: string;
    
    // Generate unique token
    do {
      if (format === 'uuid') {
        // Generate UUID v4
        value = crypto.randomUUID();
      } else {
        value = this.generateSecureRandom(length, format as 'hex' | 'base64' | 'base64url');
      }
      
      // Add prefix if specified
      if (options.prefix) {
        value = `${options.prefix}_${value}`;
      }
    } while (this.generatedTokens.has(value));
    
    this.generatedTokens.add(value);
    
    const token: GeneratedToken = {
      type: options.type,
      value,
      createdAt: new Date().toISOString(),
      metadata: {
        environment: options.environment,
        length,
        format
      }
    };
    
    // Add expiration for certain token types
    if (options.type === 'refresh-token' || options.type === 'api-key') {
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1); // 1 year
      token.expiresAt = expirationDate.toISOString();
    }
    
    return token;
  }
  
  async generateTokens(options: TokenOptions[]): Promise<GeneratedToken[]> {
    const tokens: GeneratedToken[] = [];
    
    for (const option of options) {
      const token = await this.generateToken(option);
      tokens.push(token);
    }
    
    return tokens;
  }
  
  async generateEnvironmentTokens(environment: string): Promise<GeneratedToken[]> {
    const tokenOptions: TokenOptions[] = [
      { type: 'jwt-secret', environment },
      { type: 'api-key', environment, prefix: 'sk' },
      { type: 'session-secret', environment },
      { type: 'refresh-token', environment },
      { type: 'webhook-secret', environment, prefix: 'whsec' }
    ];
    
    return this.generateTokens(tokenOptions);
  }
  
  validateToken(token: string, type: TokenType): TokenValidation {
    const requirements = this.getTokenRequirements(type);
    const errors: string[] = [];
    
    // Only remove prefix if it matches known prefixes (e.g., 'sk_', 'whsec_')
    let tokenValue = token;
    const knownPrefixes = ['sk_', 'whsec_'];
    for (const prefix of knownPrefixes) {
      if (token.startsWith(prefix)) {
        tokenValue = token.substring(prefix.length);
        break;
      }
    }
    
    // Check length
    if (tokenValue.length < requirements.minLength) {
      errors.push(`Token is too short. Minimum length is ${requirements.minLength} characters.`);
    }
    
    // Check format
    if (requirements.format === 'hex' && !/^[a-f0-9]+$/i.test(tokenValue)) {
      errors.push('Token must be in hexadecimal format.');
    } else if (requirements.format === 'base64' && !/^[A-Za-z0-9+/]+=*$/.test(tokenValue)) {
      errors.push('Token must be in base64 format.');
    } else if (requirements.format === 'base64url' && !/^[A-Za-z0-9_-]+$/.test(tokenValue)) {
      errors.push('Token must be in base64url format.');
    }
    
    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (tokenValue.length >= requirements.recommendedLength * 0.75) {
      strength = 'medium';
    }
    if (tokenValue.length >= requirements.recommendedLength) {
      strength = 'strong';
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
    // Mark old token as expired
    const oldTokenData: GeneratedToken = {
      type: options.type,
      value: oldToken,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      expiresAt: new Date().toISOString(),
      metadata: { rotated: true }
    };
    
    // Generate new token
    const newToken = await this.generateToken(options);
    
    return {
      old: oldTokenData,
      new: newToken
    };
  }
  
  async isTokenUnique(token: string): Promise<boolean> {
    return !this.generatedTokens.has(token);
  }
  
  getTokenRequirements(type: TokenType): {
    minLength: number;
    recommendedLength: number;
    format: string;
    description: string;
  } {
    const requirements: Record<TokenType, {
      minLength: number;
      recommendedLength: number;
      format: string;
      description: string;
    }> = {
      'jwt-secret': {
        minLength: 32,
        recommendedLength: 64,
        format: 'base64url',
        description: 'Secret key for signing JWT tokens'
      },
      'api-key': {
        minLength: 24,
        recommendedLength: 32,
        format: 'base64url',
        description: 'API authentication key'
      },
      'session-secret': {
        minLength: 32,
        recommendedLength: 48,
        format: 'base64url',
        description: 'Secret for encrypting session data'
      },
      'refresh-token': {
        minLength: 32,
        recommendedLength: 48,
        format: 'base64url',
        description: 'Token for refreshing authentication'
      },
      'encryption-key': {
        minLength: 32,
        recommendedLength: 32,
        format: 'hex',
        description: 'Key for data encryption'
      },
      'webhook-secret': {
        minLength: 24,
        recommendedLength: 32,
        format: 'base64url',
        description: 'Secret for validating webhook signatures'
      },
      'oauth-client-secret': {
        minLength: 32,
        recommendedLength: 48,
        format: 'base64url',
        description: 'OAuth client secret'
      }
    };
    
    return requirements[type];
  }
  
  generateSecureRandom(length: number, format: 'hex' | 'base64' | 'base64url'): string {
    // Calculate bytes needed based on format
    let bytesNeeded: number;
    
    switch (format) {
      case 'hex':
        bytesNeeded = Math.ceil(length / 2);
        break;
      case 'base64':
      case 'base64url':
        // Base64 encoding produces 4 characters for every 3 bytes
        // So we need length * 3/4 bytes, but we round up to ensure we have enough
        bytesNeeded = Math.ceil(length * 0.75);
        break;
      default:
        bytesNeeded = length;
    }
    
    const buffer = crypto.randomBytes(bytesNeeded);
    
    switch (format) {
      case 'hex':
        return buffer.toString('hex').slice(0, length);
      case 'base64':
        return buffer.toString('base64').slice(0, length);
      case 'base64url':
        // Ensure we generate enough characters
        let result = buffer.toString('base64url');
        while (result.length < length) {
          result += crypto.randomBytes(3).toString('base64url');
        }
        return result.slice(0, length);
      default:
        return buffer.toString('base64url').slice(0, length);
    }
  }
}