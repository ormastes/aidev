/**
 * Security Middleware Suite - Complete security middleware collection
 * 
 * Provides a unified interface for all security middleware components
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthService } from './AuthService';
import { SessionManager } from './SessionManager';
import { AuditLogger } from './AuditLogger';
import { UserRole } from '../common/types/User';
import * as helmet from 'helmet';
import { crypto } from '../../infra_external-log-lib/src';

export interface SecurityMiddlewareConfig {
  authService: AuthService;
  sessionManager: SessionManager;
  auditLogger: AuditLogger;
  csrfEnabled?: boolean;
  rateLimitEnabled?: boolean;
  corsEnabled?: boolean;
  helmetEnabled?: boolean;
  publicPaths?: string[];
  loginPath?: string;
}

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export interface CorsConfig {
  origins?: string[] | '*';
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export class SecurityMiddlewareSuite {
  private authService: AuthService;
  private sessionManager: SessionManager;
  private auditLogger: AuditLogger;
  private config: SecurityMiddlewareConfig;
  private rateLimitStores: Map<string, Map<string, RateLimitEntry>>;

  constructor(config: SecurityMiddlewareConfig) {
    this.authService = config.authService;
    this.sessionManager = config.sessionManager;
    this.auditLogger = config.auditLogger;
    this.config = config;
    this.rateLimitStores = new Map();
  }

  /**
   * Get all security middleware as an array
   */
  getAllMiddleware(): RequestHandler[] {
    const middleware: RequestHandler[] = [];

    // Add helmet for security headers if enabled
    if (this.config.helmetEnabled !== false) {
      middleware.push(this.helmetMiddleware());
    }

    // Add CORS if enabled
    if (this.config.corsEnabled !== false) {
      middleware.push(this.cors());
    }

    // Add rate limiting if enabled
    if (this.config.rateLimitEnabled !== false) {
      middleware.push(this.rateLimit());
    }

    // Add audit logging
    middleware.push(this.auditLog());

    // Add CSRF protection if enabled
    if (this.config.csrfEnabled !== false) {
      middleware.push(this.csrfProtection());
    }

    return middleware;
  }

  /**
   * Authentication middleware - require user to be logged in
   */
  requireAuth(): RequestHandler {
    return async (req: any, res: Response, next: NextFunction) => {
      try {
        // Check if path is public
        if (this.isPublicPath(req.path)) {
          return next();
        }

        const user = await this.authService.getCurrentUser(req);

        if (!user) {
          // Log unauthorized access attempt
          await this.auditLogger.log({
            action: 'UNAUTHORIZED_ACCESS',
            userId: 'anonymous',
            resource: req.path,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          });

          if (this.config.loginPath && req.accepts('html')) {
            return res.redirect(this.config.loginPath);
          }

          return res.status(401).json({
            error: 'Authentication required',
            message: 'Please log in to access this resource'
          });
        }

        req.user = user;
        next();
      } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication error' });
      }
    };
  }

  /**
   * Role-based access control middleware
   */
  requireRole(role: UserRole): RequestHandler {
    return async (req: any, res: Response, next: NextFunction) => {
      try {
        const user = req.user || await this.authService.getCurrentUser(req);

        if (!user) {
          return res.status(401).json({
            error: 'Authentication required'
          });
        }

        if (!user.roles.includes(role)) {
          // Log unauthorized role access attempt
          await this.auditLogger.log({
            action: 'UNAUTHORIZED_ROLE_ACCESS',
            userId: user.id,
            resource: req.path,
            details: { requiredRole: role, userRoles: user.roles },
            severity: 'MEDIUM'
          });

          return res.status(403).json({
            error: 'Insufficient permissions',
            message: `This resource requires ${role} role`
          });
        }

        req.user = user;
        next();
      } catch (error) {
        console.error('Role middleware error:', error);
        res.status(500).json({ error: 'Authorization error' });
      }
    };
  }

  /**
   * Rate limiting middleware
   */
  rateLimit(config?: RateLimitConfig): RequestHandler {
    const windowMs = config?.windowMs || 15 * 60 * 1000; // 15 minutes
    const maxRequests = config?.maxRequests || 100;
    const keyGenerator = config?.keyGenerator || ((req: Request) => req.ip);
    const storeName = `rateLimit-${windowMs}-${maxRequests}`;

    // Get or create store for this configuration
    if (!this.rateLimitStores.has(storeName)) {
      this.rateLimitStores.set(storeName, new Map());
    }
    const store = this.rateLimitStores.get(storeName)!;

    return async (req: Request, res: Response, next: NextFunction) => {
      const key = keyGenerator(req);
      const now = Date.now();

      // Clean up expired entries
      for (const [k, entry] of store) {
        if (entry.resetTime < now) {
          store.delete(k);
        }
      }

      // Get or create entry
      let entry = store.get(key);
      if (!entry || entry.resetTime < now) {
        entry = {
          count: 0,
          resetTime: now + windowMs,
          firstRequest: now
        };
        store.set(key, entry);
      }

      entry.count++;

      // Check if limit exceeded
      if (entry.count > maxRequests) {
        // Log rate limit violation
        await this.auditLogger.log({
          action: 'RATE_LIMIT_EXCEEDED',
          userId: (req as any).user?.id || 'anonymous',
          ip: req.ip,
          details: {
            requests: entry.count,
            limit: maxRequests,
            window: windowMs
          },
          severity: 'MEDIUM'
        });

        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        });
        return;
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      // Skip counting successful requests if configured
      if (config?.skipSuccessfulRequests) {
        res.on('finish', () => {
          if (res.statusCode < 400 && entry) {
            entry.count--;
          }
        });
      }

      next();
    };
  }

  /**
   * CORS middleware
   */
  cors(config?: CorsConfig): RequestHandler {
    const origins = config?.origins || ['http://localhost:3000', 'http://localhost:3456', 'http://localhost:3400'];
    const methods = config?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    const allowedHeaders = config?.allowedHeaders || ['Content-Type', 'Authorization', 'X-CSRF-Token'];
    const exposedHeaders = config?.exposedHeaders || ['X-RateLimit-Limit', 'X-RateLimit-Remaining'];
    const credentials = config?.credentials ?? true;
    const maxAge = config?.maxAge || 86400; // 24 hours

    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;

      // Handle origin
      if (origins === '*') {
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else if (origin && Array.isArray(origins) && origins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      // Set other CORS headers
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', maxAge.toString());

      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }

      next();
    };
  }

  /**
   * CSRF protection middleware
   */
  csrfProtection(): RequestHandler {
    return async (req: any, res: Response, next: NextFunction) => {
      // Skip for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        // Generate token for forms
        if (!req.session?.csrfToken) {
          req.session = req.session || {};
          req.session.csrfToken = this.generateCsrfToken();
        }
        
        // Make token available to templates
        res.locals.csrfToken = req.session.csrfToken;
        return next();
      }

      // Verify token for state-changing methods
      const token = req.headers['x-csrf-token'] || 
                   req.body?._csrf || 
                   req.query?._csrf;

      if (!req.session?.csrfToken || token !== req.session.csrfToken) {
        await this.auditLogger.log({
          action: 'CSRF_VALIDATION_FAILED',
          userId: req.user?.id || 'anonymous',
          resource: req.path,
          ip: req.ip,
          severity: 'HIGH'
        });

        return res.status(403).json({
          error: 'Invalid CSRF token',
          message: 'Request validation failed'
        });
      }

      next();
    };
  }

  /**
   * Security headers middleware using helmet
   */
  helmetMiddleware(): RequestHandler {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  /**
   * Audit logging middleware
   */
  auditLog(): RequestHandler {
    return async (req: any, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const originalSend = res.send;
      let responseBody: any;

      // Capture response body
      res.send = function(data: any) {
        responseBody = data;
        return originalSend.call(this, data);
      };

      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        const user = req.user;

        // Determine severity based on status code
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (res.statusCode >= 500) {
          severity = 'HIGH';
        } else if (res.statusCode >= 400) {
          severity = 'MEDIUM';
        }

        // Log the request
        await this.auditLogger.log({
          action: 'HTTP_REQUEST',
          userId: user?.id || 'anonymous',
          resource: req.path,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          severity,
          details: {
            method: req.method,
            statusCode: res.statusCode,
            duration,
            query: req.query,
            // Don't log sensitive body fields
            body: this.sanitizeRequestBody(req.body)
          }
        });

        // Log security events
        if (res.statusCode === 401) {
          await this.auditLogger.log({
            action: 'AUTHENTICATION_FAILED',
            userId: 'anonymous',
            resource: req.path,
            ip: req.ip,
            severity: 'MEDIUM'
          });
        } else if (res.statusCode === 403) {
          await this.auditLogger.log({
            action: 'AUTHORIZATION_FAILED',
            userId: user?.id || 'anonymous',
            resource: req.path,
            ip: req.ip,
            severity: 'MEDIUM'
          });
        }
      });

      next();
    };
  }

  /**
   * XSS protection middleware
   */
  xssProtection(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanitize body
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      // Add XSS protection headers
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      next();
    };
  }

  /**
   * SQL injection protection middleware
   */
  sqlInjectionProtection(): RequestHandler {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
      /(\b(OR|AND)\b\s*\d+\s*=\s*\d+)/gi,
      /(--|\||;|\/\*|\*\/)/g
    ];

    return (req: Request, res: Response, next: NextFunction) => {
      const checkForSqlInjection = (value: string): boolean => {
        return sqlPatterns.some(pattern => pattern.test(value));
      };

      const validateObject = (obj: any): boolean => {
        for (const key in obj) {
          const value = obj[key];
          if (typeof value === 'string' && checkForSqlInjection(value)) {
            return false;
          } else if (typeof value === 'object' && value !== null) {
            if (!validateObject(value)) {
              return false;
            }
          }
        }
        return true;
      };

      // Check query parameters
      if (req.query && !validateObject(req.query)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Request contains potentially malicious content'
        });
      }

      // Check body
      if (req.body && !validateObject(req.body)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Request contains potentially malicious content'
        });
      }

      next();
    };
  }

  /**
   * Helper: Check if path is public
   */
  private isPublicPath(path: string): boolean {
    if (!this.config.publicPaths) {
      return false;
    }

    return this.config.publicPaths.some(publicPath => {
      if (publicPath.endsWith('*')) {
        return path.startsWith(publicPath.slice(0, -1));
      }
      return path === publicPath;
    });
  }

  /**
   * Helper: Generate CSRF token
   */
  private generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Helper: Sanitize request body
   */
  private sanitizeRequestBody(body: any): any {
    if (!body) return undefined;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
    const sanitized = { ...body };

    for (const key in sanitized) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeRequestBody(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Helper: Sanitize object for XSS
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = this.sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  }
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}