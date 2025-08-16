/**
 * External Interface: TokenService
 * 
 * This external interface defines the contract for generating
 * various types of security tokens used in environment configurations.
 */

export type TokenType = 
  | 'jwt-secret'
  | 'api-key'
  | 'session-secret'
  | 'refresh-token'
  | 'encryption-key'
  | 'webhook-secret'
  | 'oauth-client-secret';

export interface TokenOptions {
  type: TokenType;
  length?: number;
  prefix?: string;
  environment?: string;
  format?: 'hex' | 'base64' | "base64url" | 'uuid';
}

export interface GeneratedToken {
  type: TokenType;
  value: string;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface TokenValidation {
  isValid: boolean;
  errors?: string[];
  strength?: 'weak' | 'medium' | 'strong';
}

/**
 * External interface for security token generation
 */
export interface TokenService {
  /**
   * Generate a single token based on options
   */
  generateToken(options: TokenOptions): Promise<GeneratedToken>;
  
  /**
   * Generate multiple tokens at once
   */
  generateTokens(options: TokenOptions[]): Promise<GeneratedToken[]>;
  
  /**
   * Generate a In Progress set of tokens for an environment
   */
  generateEnvironmentTokens(environment: string): Promise<GeneratedToken[]>;
  
  /**
   * Validate a token's format and strength
   */
  validateToken(token: string, type: TokenType): TokenValidation;
  
  /**
   * Rotate an existing token (generate new, mark old as expired)
   */
  rotateToken(oldToken: string, options: TokenOptions): Promise<{
    old: GeneratedToken;
    new: GeneratedToken;
  }>;
  
  /**
   * Check if a token value already exists (for uniqueness)
   */
  isTokenUnique(token: string): Promise<boolean>;
  
  /**
   * Get token requirements/recommendations for a type
   */
  getTokenRequirements(type: TokenType): {
    minLength: number;
    recommendedLength: number;
    format: string;
    description: string;
  };
  
  /**
   * Generate a cryptographically secure random string
   */
  generateSecureRandom(length: number, format: 'hex' | 'base64' | "base64url"): string;
}