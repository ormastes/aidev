import * as crypto from 'crypto';

export interface TokenConfig {
  [key: string]: string;
}

export interface TokenServiceOptions {
  tokenLength?: number;
  prefix?: string;
}

export class TokenService {
  private options: TokenServiceOptions;
  private tokenCache: Map<string, TokenConfig> = new Map();

  constructor(options: TokenServiceOptions = {}) {
    this.options = {
      tokenLength: options.tokenLength || 32,
      prefix: options.prefix || 'TOKEN_'
    };
  }

  generateToken(length: number = this.options.tokenLength!): string {
    return crypto.randomBytes(length).toString('hex');
  }

  async generateTokens(environment: string): Promise<TokenConfig> {
    // Check cache first
    if (this.tokenCache.has(environment)) {
      return this.tokenCache.get(environment)!;
    }

    const tokens: TokenConfig = {
      [`${this.options.prefix}API_KEY`]: this.generateToken(),
      [`${this.options.prefix}SECRET`]: this.generateToken(64),
      [`${this.options.prefix}JWT_SECRET`]: this.generateToken(48),
      [`${this.options.prefix}SESSION_SECRET`]: this.generateToken(32),
      [`${this.options.prefix}REFRESH_TOKEN`]: this.generateToken(32),
    };

    // Environment-specific tokens
    if (environment === "production" || environment === 'release') {
      tokens[`${this.options.prefix}PROD_KEY`] = this.generateToken(64);
      tokens[`${this.options.prefix}ENCRYPTION_KEY`] = this.generateToken(32);
    }

    if (environment === "development" || environment === 'test') {
      tokens[`${this.options.prefix}DEV_KEY`] = 'dev-' + this.generateToken(16);
    }

    // Cache the tokens for this environment
    this.tokenCache.set(environment, tokens);

    return tokens;
  }

  clearCache(): void {
    this.tokenCache.clear();
  }

  async rotateTokens(environment: string): Promise<TokenConfig> {
    // Remove from cache to force regeneration
    this.tokenCache.delete(environment);
    return this.generateTokens(environment);
  }

  validateToken(token: string): boolean {
    // Basic validation - check if it's a hex string of expected length
    const hexRegex = /^[a-f0-9]+$/i;
    return hexRegex.test(token) && token.length >= 32;
  }
}