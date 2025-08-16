/**
 * Advanced Rate Limiting Middleware
 * Provides comprehensive rate limiting with multiple strategies
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  skip?: (req: Request) => boolean;
  requestWasSuccessful?: (req: Request, res: Response) => boolean;
  store?: RateLimitStore;
}

interface RateLimitStore {
  increment(key: string): Promise<{ totalHits: number; resetTime?: Date }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  resetAll(): Promise<void>;
}

/**
 * Redis-based store for distributed rate limiting
 */
export class RedisStore implements RateLimitStore {
  private client: Redis;
  private prefix: string;
  private windowMs: number;

  constructor(client: Redis, prefix: string = 'rate-limit:', windowMs: number = 60000) {
    this.client = client;
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const fullKey = `${this.prefix}${key}`;
    const multi = this.client.multi();
    
    multi.incr(fullKey);
    multi.pexpire(fullKey, this.windowMs);
    
    const results = await multi.exec();
    const totalHits = results?.[0]?.[1] as number || 1;
    
    const ttl = await this.client.pttl(fullKey);
    const resetTime = new Date(Date.now() + ttl);
    
    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    await this.client.decr(fullKey);
  }

  async resetKey(key: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    await this.client.del(fullKey);
  }

  async resetAll(): Promise<void> {
    const keys = await this.client.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}

/**
 * Memory-based store for single-instance rate limiting
 */
export class MemoryStore implements RateLimitStore {
  private hits: Map<string, { count: number; resetTime: Date }> = new Map();
  private windowMs: number;

  constructor(windowMs: number = 60000) {
    this.windowMs = windowMs;
    this.cleanupInterval();
  }

  private cleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.hits.entries()) {
        if (value.resetTime.getTime() <= now) {
          this.hits.delete(key);
        }
      }
    }, this.windowMs);
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const now = Date.now();
    const resetTime = new Date(now + this.windowMs);
    
    const current = this.hits.get(key);
    
    if (!current || current.resetTime.getTime() <= now) {
      this.hits.set(key, { count: 1, resetTime });
      return { totalHits: 1, resetTime };
    }
    
    current.count++;
    return { totalHits: current.count, resetTime: current.resetTime };
  }

  async decrement(key: string): Promise<void> {
    const current = this.hits.get(key);
    if (current && current.count > 0) {
      current.count--;
    }
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }

  async resetAll(): Promise<void> {
    this.hits.clear();
  }
}

/**
 * Advanced rate limiter with multiple strategies
 */
export class RateLimiter {
  private options: Required<RateLimitOptions>;
  private store: RateLimitStore;

  constructor(options: RateLimitOptions = {}) {
    this.options = {
      windowMs: options.windowMs ?? 60 * 1000, // 1 minute
      max: options.max ?? 100, // 100 requests per window
      message: options.message ?? 'Too many requests, please try again later.',
      standardHeaders: options.standardHeaders ?? true,
      legacyHeaders: options.legacyHeaders ?? false,
      skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
      skipFailedRequests: options.skipFailedRequests ?? false,
      keyGenerator: options.keyGenerator ?? this.defaultKeyGenerator,
      handler: options.handler ?? this.defaultHandler,
      skip: options.skip ?? (() => false),
      requestWasSuccessful: options.requestWasSuccessful ?? ((req, res) => res.statusCode < 400),
      store: options.store ?? new MemoryStore(options.windowMs ?? 60000)
    };
    
    this.store = this.options.store;
  }

  private defaultKeyGenerator(req: Request): string {
    // Use IP address as default key
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private defaultHandler(req: Request, res: Response): void {
    res.status(429).json({
      error: 'Too Many Requests',
      message: this.options.message,
      retryAfter: res.getHeader('Retry-After')
    });
  }

  /**
   * Express middleware function
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check if should skip
      if (await this.options.skip(req)) {
        return next();
      }

      const key = this.options.keyGenerator(req);
      
      try {
        const { totalHits, resetTime } = await this.store.increment(key);
        
        // Set headers
        if (this.options.standardHeaders) {
          res.setHeader('RateLimit-Limit', this.options.max);
          res.setHeader('RateLimit-Remaining', Math.max(0, this.options.max - totalHits));
          res.setHeader('RateLimit-Reset', resetTime?.toISOString() || new Date(Date.now() + this.options.windowMs).toISOString());
        }
        
        if (this.options.legacyHeaders) {
          res.setHeader('X-RateLimit-Limit', this.options.max);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, this.options.max - totalHits));
          res.setHeader('X-RateLimit-Reset', resetTime?.getTime() || Date.now() + this.options.windowMs);
        }
        
        // Check if limit exceeded
        if (totalHits > this.options.max) {
          res.setHeader('Retry-After', Math.ceil(this.options.windowMs / 1000));
          return this.options.handler(req, res);
        }
        
        // Continue to next middleware
        res.on('finish', async () => {
          const wasSuccessful = this.options.requestWasSuccessful(req, res);
          
          // Optionally skip counting based on response
          if ((wasSuccessful && this.options.skipSuccessfulRequests) ||
              (!wasSuccessful && this.options.skipFailedRequests)) {
            await this.store.decrement(key);
          }
        });
        
        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        next(); // Don't block requests on rate limiter errors
      }
    };
  }
}

/**
 * Create different rate limiters for different endpoints
 */
export const createRateLimiters = (redisClient?: Redis) => {
  const store = redisClient ? new RedisStore(redisClient) : new MemoryStore();
  
  return {
    // Strict rate limit for authentication endpoints
    auth: new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many authentication attempts, please try again later',
      store,
      keyGenerator: (req) => `auth:${req.ip}`
    }),
    
    // Standard API rate limit
    api: new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      store,
      keyGenerator: (req) => `api:${req.ip}`
    }),
    
    // Relaxed rate limit for static assets
    assets: new RateLimiter({
      windowMs: 60 * 1000,
      max: 500,
      store,
      keyGenerator: (req) => `assets:${req.ip}`
    }),
    
    // Per-user rate limiting (requires authentication)
    user: new RateLimiter({
      windowMs: 60 * 1000,
      max: 200,
      store,
      keyGenerator: (req) => `user:${(req as any).user?.id || req.ip}`
    }),
    
    // Dynamic rate limiting based on user tier
    dynamic: (tier: 'free' | 'basic' | 'premium') => {
      const limits = {
        free: 50,
        basic: 200,
        premium: 1000
      };
      
      return new RateLimiter({
        windowMs: 60 * 1000,
        max: limits[tier],
        store,
        keyGenerator: (req) => `${tier}:${(req as any).user?.id || req.ip}`
      });
    }
  };
};

/**
 * Sliding window rate limiter for more accurate limiting
 */
export class SlidingWindowRateLimiter {
  private store: Map<string, number[]> = new Map();
  private windowMs: number;
  private max: number;

  constructor(windowMs: number = 60000, max: number = 100) {
    this.windowMs = windowMs;
    this.max = max;
  }

  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create request history
    let requests = this.store.get(key) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (requests.length >= this.max) {
      this.store.set(key, requests);
      return false;
    }
    
    // Add current request
    requests.push(now);
    this.store.set(key, requests);
    
    return true;
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip || 'unknown';
      
      if (await this.isAllowed(key)) {
        next();
      } else {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests in sliding window'
        });
      }
    };
  }
}

export default RateLimiter;