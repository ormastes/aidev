/**
 * Security Middleware - Express middleware for authentication and security
 * 
 * Provides reusable middleware components for web applications
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from './AuthService';
import { SessionManager } from './SessionManager';
import { SecurityConstants } from './security';
import { User, UserRole } from './User';

export interface AuthMiddlewareOptions {
  authService: AuthService;
  sessionManager: SessionManager;
  requiredRole?: UserRole;
  requireAuth?: boolean;
  loginPath?: string;
  publicPaths?: string[];
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface AuthenticatedRequest extends Request {
  user?: User;
  session?: any;
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if path is public
      if (options.publicPaths && isPublicPath(req.path, options.publicPaths)) {
        return next();
      }

      // Attach session if available
      await options.sessionManager.attachSession(req, res, () => {});

      // Get current user
      const user = await options.authService.getCurrentUser(req);

      if (!user && options.requireAuth !== false) {
        // Redirect to login or return 401
        if (options.loginPath && req.accepts('html')) {
          return res.redirect(options.loginPath);
        }
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check role if specified
      if (user && options.requiredRole) {
        if (!user.roles.includes(options.requiredRole)) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }

      // Attach user to request
      req.user = user || undefined;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  };
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(options?: RateLimitOptions) {
  const windowMs = options?.windowMs || SecurityConstants.RATE_LIMIT.API_REQUESTS.WINDOW_MS;
  const max = options?.max || SecurityConstants.RATE_LIMIT.API_REQUESTS.MAX;
  const message = options?.message || 'Too many requests, please try again later';
  const keyGenerator = options?.keyGenerator || ((req: Request) => req.ip);

  // In-memory store for simplicity
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean up old entries
    for (const [k, v] of requests) {
      if (v.resetTime < now) {
        requests.delete(k);
      }
    }

    // Get or create entry
    let entry = requests.get(key);
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      requests.set(key, entry);
    }

    entry.count++;

    if (entry.count > max) {
      res.status(429).json({ error: message });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    next();
  };
}

/**
 * Create security headers middleware
 */
export function createSecurityHeadersMiddleware(customHeaders?: Record<string, string>) {
  const headers = {
    ...SecurityConstants.HEADERS,
    ...customHeaders
  };

  return (req: Request, res: Response, next: NextFunction) => {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
    next();
  };
}

/**
 * Create CORS middleware
 */
export function createCorsMiddleware(options?: {
  origins?: string[];
  credentials?: boolean;
  methods?: string[];
  headers?: string[];
}) {
  const allowedOrigins = options?.origins || SecurityConstants.CORS.ALLOWED_ORIGINS;
  const credentials = options?.credentials ?? SecurityConstants.CORS.CREDENTIALS;
  const methods = options?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  const headers = options?.headers || ['Content-Type', 'Authorization'];

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      
      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', headers.join(', '));
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  };
}

/**
 * Create CSRF protection middleware
 */
export function createCsrfMiddleware(options?: {
  tokenLength?: number;
  sessionKey?: string;
  headerName?: string;
}) {
  const tokenLength = options?.tokenLength || 32;
  const sessionKey = options?.sessionKey || 'csrfToken';
  const headerName = options?.headerName || 'x-csrf-token';

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Generate token if not exists
    if (!req.session?.[sessionKey]) {
      req.session[sessionKey] = generateToken(tokenLength);
    }

    // Verify token
    const token = req.headers[headerName] || req.body?._csrf;
    if (token !== req.session[sessionKey]) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    next();
  };
}

/**
 * Create audit logging middleware
 */
export function createAuditMiddleware(options?: {
  logger?: (event: AuditEvent) => void;
  includeBody?: boolean;
  includeSensitive?: boolean;
}) {
  const logger = options?.logger || console.log;
  const includeBody = options?.includeBody || false;
  const includeSensitive = options?.includeSensitive || false;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const event: AuditEvent = {
        timestamp: new Date(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: Date.now() - startTime,
        userId: req.user?.id,
        username: req.user?.username,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };

      if (includeBody && req.body) {
        event.body = includeSensitive ? req.body : sanitizeBody(req.body);
      }

      logger(event);
    });

    next();
  };
}

// Helper types and functions

interface AuditEvent {
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  username?: string;
  ip: string;
  userAgent?: string;
  body?: any;
}

function isPublicPath(path: string, publicPaths: string[]): boolean {
  return publicPaths.some(publicPath => {
    if (publicPath.endsWith('*')) {
      return path.startsWith(publicPath.slice(0, -1));
    }
    return path === publicPath;
  });
}

function generateToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function sanitizeBody(body: any): any {
  const sensitive = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  const sanitized = { ...body };
  
  for (const key of Object.keys(sanitized)) {
    if (sensitive.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}