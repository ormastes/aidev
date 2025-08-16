"use strict";
/**
 * Enhanced Rate Limiter for AI Dev Platform
 * Fix #7: Comprehensive rate limiting for all API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
export const DistributedRateLimiter = export const ProgressiveRateLimiter = export const rateLimiters = export const RateLimiter = void 0;
export const applyRateLimiting = applyRateLimiting;
class RateLimiter {
    constructor(options = {}) {
        this.store = new Map();
        this.options = {
            windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
            max: options.max || 100,
            message: options.message || 'Too many requests, please try again later.',
            skipSuccessfulRequests: options.skipSuccessfulRequests || false,
            skipFailedRequests: options.skipFailedRequests || false,
            keyGenerator: options.keyGenerator || ((req) => req.ip || 'unknown'),
            handler: options.handler || this.defaultHandler
        };
        // Clean up expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }
    defaultHandler(req, res) {
        res.status(429).json({
            error: 'Rate limit exceeded',
            message: this.options.message,
            retryAfter: Math.ceil(this.options.windowMs / 1000)
        });
    }
    cleanup() {
        const now = Date.now();
        for (const [key, data] of this.store.entries()) {
            if (now > data.resetTime) {
                this.store.delete(key);
            }
        }
    }
    middleware() {
        return (req, res, next) => {
            const key = this.options.keyGenerator(req);
            const now = Date.now();
            let data = this.store.get(key);
            if (!data || now > data.resetTime) {
                data = {
                    hits: 0,
                    resetTime: now + this.options.windowMs
                };
                this.store.set(key, data);
            }
            data.hits++;
            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', this.options.max.toString());
            res.setHeader('X-RateLimit-Remaining', Math.max(0, this.options.max - data.hits).toString());
            res.setHeader('X-RateLimit-Reset', new Date(data.resetTime).toISOString());
            if (data.hits > this.options.max) {
                res.setHeader('Retry-After', Math.ceil((data.resetTime - now) / 1000).toString());
                return this.options.handler(req, res);
            }
            // Track response for conditional limiting
            if (this.options.skipSuccessfulRequests || this.options.skipFailedRequests) {
                const originalEnd = res.end;
                res.end = function (...args) {
                    const statusCode = res.statusCode;
                    if ((this.options.skipSuccessfulRequests && statusCode < 400) ||
                        (this.options.skipFailedRequests && statusCode >= 400)) {
                        // Decrement the hit count
                        if (data)
                            data.hits--;
                    }
                    originalEnd.apply(res, args);
                };
            }
            next();
        };
    }
}
export const RateLimiter = RateLimiter;
/**
 * Endpoint-specific rate limiters
 */
export const rateLimiters = {
    // Strict limit for authentication endpoints
    auth: new RateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts
        message: 'Too many authentication attempts, please try again later.',
        skipSuccessfulRequests: true
    }),
    // API endpoints
    api: new RateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'API rate limit exceeded.'
    }),
    // Search endpoints (more lenient)
    search: new RateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30,
        message: 'Too many search requests.'
    }),
    // File upload endpoints
    upload: new RateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: 'Upload limit exceeded.'
    }),
    // General pages
    general: new RateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 200
    })
};
/**
 * Progressive rate limiting based on user behavior
 */
class ProgressiveRateLimiter {
    constructor(baseOptions = {}) {
        this.violations = new Map();
        this.baseLimiter = new RateLimiter(baseOptions);
    }
    middleware() {
        return (req, res, next) => {
            const key = req.ip || 'unknown';
            const violations = this.violations.get(key) || 0;
            // Progressively stricter limits for repeat violators
            const limiter = new RateLimiter({
                windowMs: 15 * 60 * 1000,
                max: Math.max(10, 100 - (violations * 20)),
                handler: (req, res) => {
                    this.violations.set(key, violations + 1);
                    // Ban after 5 violations
                    if (violations >= 4) {
                        res.status(403).json({
                            error: 'Banned',
                            message: 'You have been temporarily banned due to excessive requests.'
                        });
                    }
                    else {
                        res.status(429).json({
                            error: 'Rate limit exceeded',
                            message: `Warning ${violations + 1}/5: Continued violations will result in a ban.`,
                            retryAfter: 900 // 15 minutes
                        });
                    }
                }
            });
            limiter.middleware()(req, res, next);
        };
    }
}
export const ProgressiveRateLimiter = ProgressiveRateLimiter;
/**
 * Distributed rate limiting for microservices
 */
class DistributedRateLimiter {
    constructor(redisClient) {
        this.redis = redisClient;
    }
    async middleware(options = {}) {
        return async (req, res, next) => {
            if (!this.redis) {
                // Fallback to local rate limiting if Redis not available
                return new RateLimiter(options).middleware()(req, res, next);
            }
            const key = `rate:${req.ip}:${req.path}`;
            const limit = options.max || 100;
            const window = options.windowMs || 900000;
            try {
                const current = await this.redis.incr(key);
                if (current === 1) {
                    await this.redis.expire(key, Math.ceil(window / 1000));
                }
                const ttl = await this.redis.ttl(key);
                res.setHeader('X-RateLimit-Limit', limit.toString());
                res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current).toString());
                res.setHeader('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());
                if (current > limit) {
                    res.setHeader('Retry-After', ttl.toString());
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        message: options.message || 'Too many requests',
                        retryAfter: ttl
                    });
                }
                next();
            }
            catch (error) {
                console.error('Rate limiter error:', error);
                // Fail open - allow request if rate limiter fails
                next();
            }
        };
    }
}
export const DistributedRateLimiter = DistributedRateLimiter;
/**
 * Apply rate limiting to Express app
 */
function applyRateLimiting(app) {
    // Authentication routes - strict limits
    app.use('/login', exports.rateLimiters.auth.middleware());
    app.use('/register', exports.rateLimiters.auth.middleware());
    app.use('/api/auth', exports.rateLimiters.auth.middleware());
    app.use('/forgot-password', exports.rateLimiters.auth.middleware());
    // API routes
    app.use('/api', exports.rateLimiters.api.middleware());
    // Search routes
    app.use('/search', exports.rateLimiters.search.middleware());
    app.use('/api/search', exports.rateLimiters.search.middleware());
    // Upload routes
    app.use('/upload', exports.rateLimiters.upload.middleware());
    app.use('/api/upload', exports.rateLimiters.upload.middleware());
    // General rate limiting for all other routes
    app.use(exports.rateLimiters.general.middleware());
    console.log('✅ Rate limiting applied to all endpoints');
}
export const default = {
    RateLimiter,
    ProgressiveRateLimiter,
    DistributedRateLimiter,
    rateLimiters: exports.rateLimiters,
    applyRateLimiting
};
//# sourceMappingURL=rate-limiter-enhanced.js.map