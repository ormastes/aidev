/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import { CacheManager } from '../cache/cache-manager';
import { logger } from '../utils/logger';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export class RateLimiter {
  private cache: CacheManager;
  private limiters: Map<string, any> = new Map();

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  /**
   * Create a rate limiter with specific configuration
   */
  public createLimiter(config: RateLimitConfig): any {
    const key = `${config.windowMs}-${config.max}`;
    
    if (this.limiters.has(key)) {
      return this.limiters.get(key);
    }

    const limiter = rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: config.message || 'Too many requests, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      
      // Use Redis store for distributed rate limiting
      store: new RedisStore({
        client: this.cache.getClient(),
        prefix: 'rl:',
      }),

      // Custom key generator
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,

      // Custom handler for rate limit exceeded
      handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: config.message || 'Rate limit exceeded',
          retryAfter: res.getHeader('Retry-After'),
          limit: res.getHeader('X-RateLimit-Limit'),
          remaining: res.getHeader('X-RateLimit-Remaining'),
          reset: res.getHeader('X-RateLimit-Reset'),
        });
      },

      // Skip certain requests
      skip: (req: Request) => {
        // Skip health checks and metrics
        if (req.path === '/health' || req.path === '/metrics') {
          return true;
        }
        
        // Skip if user has unlimited access (e.g., internal services)
        if (req.headers['x-internal-service'] === 'true') {
          return true;
        }

        return false;
      },
    });

    this.limiters.set(key, limiter);
    return limiter;
  }

  /**
   * Default key generator for rate limiting
   */
  private defaultKeyGenerator(req: Request): string {
    // Use a combination of IP and user ID if authenticated
    const userId = (req as any).user?.id;
    const ip = req.ip || req.connection.remoteAddress;
    
    if (userId) {
      return `user:${userId}`;
    }
    
    return `ip:${ip}`;
  }

  /**
   * Create API key based rate limiter
   */
  public createAPIKeyLimiter(limits: { [key: string]: RateLimitConfig }): any {
    return (req: Request, res: Response, next: Function) => {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return this.createLimiter({
          windowMs: 60000,
          max: 10, // Very restrictive for unauthenticated requests
        })(req, res, next);
      }

      // Get limits for specific API key
      const keyLimits = limits[apiKey] || {
        windowMs: 60000,
        max: 100, // Default for authenticated API keys
      };

      return this.createLimiter({
        ...keyLimits,
        keyGenerator: () => `apikey:${apiKey}`,
      })(req, res, next);
    };
  }

  /**
   * Create tiered rate limiter based on user plan
   */
  public createTieredLimiter(): any {
    const tiers = {
      free: { windowMs: 60000, max: 10 },
      basic: { windowMs: 60000, max: 100 },
      pro: { windowMs: 60000, max: 1000 },
      enterprise: { windowMs: 60000, max: 10000 },
    };

    return (req: Request, res: Response, next: Function) => {
      const user = (req as any).user;
      const tier = user?.plan || 'free';
      
      const limits = tiers[tier as keyof typeof tiers] || tiers.free;
      
      return this.createLimiter({
        ...limits,
        keyGenerator: (req) => {
          const userId = (req as any).user?.id;
          return userId ? `tier:${tier}:user:${userId}` : `tier:free:ip:${req.ip}`;
        },
      })(req, res, next);
    };
  }

  /**
   * Create dynamic rate limiter based on endpoint
   */
  public createEndpointLimiter(endpoints: { [path: string]: RateLimitConfig }): any {
    return (req: Request, res: Response, next: Function) => {
      const path = req.path;
      
      // Find matching endpoint configuration
      let config: RateLimitConfig | undefined;
      
      for (const [pattern, limits] of Object.entries(endpoints)) {
        if (path.match(new RegExp(pattern))) {
          config = limits;
          break;
        }
      }

      // Use default if no specific configuration found
      if (!config) {
        config = {
          windowMs: 60000,
          max: 100,
        };
      }

      return this.createLimiter(config)(req, res, next);
    };
  }

  /**
   * Create sliding window rate limiter
   */
  public createSlidingWindowLimiter(config: RateLimitConfig): any {
    return async (req: Request, res: Response, next: Function) => {
      const key = config.keyGenerator ? config.keyGenerator(req) : this.defaultKeyGenerator(req);
      const now = Date.now();
      const window = config.windowMs;
      const limit = config.max;

      try {
        // Get current request count from Redis
        const requests = await this.cache.getList(`sliding:${key}`);
        
        // Remove old requests outside the window
        const validRequests = requests.filter((timestamp: number) => 
          now - timestamp < window
        );

        if (validRequests.length >= limit) {
          // Rate limit exceeded
          res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded (sliding window)',
            limit,
            window,
            resetAt: new Date(Math.min(...validRequests) + window).toISOString(),
          });
          return;
        }

        // Add current request
        validRequests.push(now);
        await this.cache.setList(`sliding:${key}`, validRequests, Math.ceil(window / 1000));

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', limit.toString());
        res.setHeader('X-RateLimit-Remaining', (limit - validRequests.length).toString());
        res.setHeader('X-RateLimit-Reset', new Date(now + window).toISOString());

        next();
      } catch (error) {
        logger.error('Sliding window rate limiter error:', error);
        // Allow request on error to prevent blocking
        next();
      }
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  public async resetLimit(key: string): Promise<void> {
    try {
      await this.cache.delete(`rl:${key}`);
      await this.cache.delete(`sliding:${key}`);
      logger.info(`Rate limit reset for key: ${key}`);
    } catch (error) {
      logger.error('Failed to reset rate limit:', error);
    }
  }

  /**
   * Get current rate limit status for a key
   */
  public async getLimitStatus(key: string): Promise<{
    limit: number;
    remaining: number;
    resetAt: Date;
  } | null> {
    try {
      const data = await this.cache.get(`rl:${key}`);
      if (!data) {
        return null;
      }

      return {
        limit: data.max,
        remaining: data.max - data.current,
        resetAt: new Date(data.resetTime),
      };
    } catch (error) {
      logger.error('Failed to get rate limit status:', error);
      return null;
    }
  }
}