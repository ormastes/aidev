/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 * Implements double-submit cookie and synchronizer token patterns
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface CsrfOptions {
  cookie?: CookieOptions;
  ignoreMethods?: string[];
  ignoreRoutes?: string[];
  sessionKey?: string;
  tokenLength?: number;
  tokenHeader?: string;
  tokenField?: string;
  value?: (req: Request) => string;
  errorHandler?: (err: any, req: Request, res: Response, next: NextFunction) => void;
}

interface CookieOptions {
  name?: string;
  httpOnly?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
  maxAge?: number;
  domain?: string;
  path?: string;
}

interface CsrfToken {
  token: string;
  secret: string;
  expiresAt: Date;
}

/**
 * CSRF Protection class
 */
export class CsrfProtection {
  private options: Required<CsrfOptions>;
  private tokens: Map<string, CsrfToken> = new Map();

  constructor(options: CsrfOptions = {}) {
    this.options = {
      cookie: {
        name: options.cookie?.name ?? '_csrf',
        httpOnly: options.cookie?.httpOnly ?? true,
        sameSite: options.cookie?.sameSite ?? 'strict',
        secure: options.cookie?.secure ?? process.env.NODE_ENV === 'production',
        maxAge: options.cookie?.maxAge ?? 86400000, // 24 hours
        path: options.cookie?.path ?? '/',
        ...options.cookie
      },
      ignoreMethods: options.ignoreMethods ?? ['GET', 'HEAD', 'OPTIONS'],
      ignoreRoutes: options.ignoreRoutes ?? [],
      sessionKey: options.sessionKey ?? 'csrfSecret',
      tokenLength: options.tokenLength ?? 32,
      tokenHeader: options.tokenHeader ?? 'x-csrf-token',
      tokenField: options.tokenField ?? '_csrf',
      value: options.value ?? this.defaultValue,
      errorHandler: options.errorHandler ?? this.defaultErrorHandler
    };

    // Cleanup expired tokens periodically
    setInterval(() => this.cleanupExpiredTokens(), 3600000); // Every hour
  }

  /**
   * Generate CSRF token
   */
  private generateToken(): CsrfToken {
    const token = crypto.randomBytes(this.options.tokenLength).toString('hex');
    const secret = crypto.randomBytes(this.options.tokenLength).toString('hex');
    const expiresAt = new Date(Date.now() + (this.options.cookie?.maxAge || 86400000));
    
    return { token, secret, expiresAt };
  }

  /**
   * Create token hash
   */
  private createTokenHash(token: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(token)
      .digest('hex');
  }

  /**
   * Verify token
   */
  private verifyToken(token: string, secret: string, providedToken: string): boolean {
    if (!token || !secret || !providedToken) {
      return false;
    }
    
    const expectedHash = this.createTokenHash(token, secret);
    const providedHash = this.createTokenHash(providedToken, secret);
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash),
      Buffer.from(providedHash)
    );
  }

  /**
   * Get token from request
   */
  private getTokenFromRequest(req: Request): string | undefined {
    // Check header
    const headerToken = req.headers[this.options.tokenHeader] as string;
    if (headerToken) {
      return headerToken;
    }
    
    // Check body
    if (req.body && req.body[this.options.tokenField]) {
      return req.body[this.options.tokenField];
    }
    
    // Check query
    if (req.query[this.options.tokenField]) {
      return req.query[this.options.tokenField] as string;
    }
    
    return undefined;
  }

  /**
   * Default value extractor
   */
  private defaultValue(req: Request): string {
    return this.getTokenFromRequest(req) || '';
  }

  /**
   * Default error handler
   */
  private defaultErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
    res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token'
    });
  }

  /**
   * Cleanup expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [key, token] of this.tokens.entries()) {
      if (token.expiresAt < now) {
        this.tokens.delete(key);
      }
    }
  }

  /**
   * Generate token middleware
   */
  generateToken() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Get or create session ID
      const sessionId = (req as any).sessionID || req.ip || crypto.randomBytes(16).toString('hex');
      
      // Check if token already exists
      let csrfToken = this.tokens.get(sessionId);
      
      // Generate new token if needed
      if (!csrfToken || csrfToken.expiresAt < new Date()) {
        csrfToken = this.generateToken();
        this.tokens.set(sessionId, csrfToken);
      }
      
      // Set cookie
      const cookieOptions = this.options.cookie as CookieOptions;
      res.cookie(cookieOptions.name!, csrfToken.secret, {
        httpOnly: cookieOptions.httpOnly,
        sameSite: cookieOptions.sameSite as any,
        secure: cookieOptions.secure,
        maxAge: cookieOptions.maxAge,
        domain: cookieOptions.domain,
        path: cookieOptions.path
      });
      
      // Attach token to request and response
      (req as any).csrfToken = () => csrfToken!.token;
      (res as any).locals = (res as any).locals || {};
      (res as any).locals.csrfToken = csrfToken.token;
      
      next();
    };
  }

  /**
   * Verify token middleware
   */
  verifyToken() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip for ignored methods
      if (this.options.ignoreMethods.includes(req.method)) {
        return next();
      }
      
      // Skip for ignored routes
      if (this.options.ignoreRoutes.some(route => req.path.startsWith(route))) {
        return next();
      }
      
      // Get session ID
      const sessionId = (req as any).sessionID || req.ip || '';
      
      // Get stored token
      const storedToken = this.tokens.get(sessionId);
      if (!storedToken) {
        return this.options.errorHandler(
          new Error('CSRF token not found'),
          req,
          res,
          next
        );
      }
      
      // Check if token expired
      if (storedToken.expiresAt < new Date()) {
        this.tokens.delete(sessionId);
        return this.options.errorHandler(
          new Error('CSRF token expired'),
          req,
          res,
          next
        );
      }
      
      // Get token from request
      const providedToken = this.options.value(req);
      
      // Get secret from cookie
      const cookieOptions = this.options.cookie as CookieOptions;
      const secret = req.cookies?.[cookieOptions.name!] || storedToken.secret;
      
      // Verify token
      if (!this.verifyToken(storedToken.token, secret, providedToken)) {
        return this.options.errorHandler(
          new Error('CSRF token validation failed'),
          req,
          res,
          next
        );
      }
      
      // Token is valid, continue
      next();
    };
  }

  /**
   * Combined middleware (generate and verify)
   */
  middleware() {
    const generate = this.generateToken();
    const verify = this.verifyToken();
    
    return (req: Request, res: Response, next: NextFunction) => {
      generate(req, res, (err) => {
        if (err) return next(err);
        verify(req, res, next);
      });
    };
  }
}

/**
 * Double-submit cookie CSRF protection
 */
export class DoubleSubmitCsrf {
  private secret: string;
  private cookieName: string;
  private headerName: string;

  constructor(secret: string, cookieName: string = 'csrf-token', headerName: string = 'x-csrf-token') {
    this.secret = secret;
    this.cookieName = cookieName;
    this.headerName = headerName;
  }

  /**
   * Generate token
   */
  generateToken(req: Request, res: Response): string {
    const token = crypto
      .createHmac('sha256', this.secret)
      .update(req.sessionID || req.ip || crypto.randomBytes(16).toString('hex'))
      .update(Date.now().toString())
      .digest('hex');
    
    // Set cookie
    res.cookie(this.cookieName, token, {
      httpOnly: false, // Must be accessible by JavaScript
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000 // 24 hours
    });
    
    return token;
  }

  /**
   * Verify token
   */
  verifyToken(req: Request): boolean {
    const cookieToken = req.cookies?.[this.cookieName];
    const headerToken = req.headers[this.headerName] as string;
    
    if (!cookieToken || !headerToken) {
      return false;
    }
    
    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  }

  /**
   * Middleware
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Generate token for GET requests
      if (req.method === 'GET') {
        const token = this.generateToken(req, res);
        (res as any).locals = (res as any).locals || {};
        (res as any).locals.csrfToken = token;
        return next();
      }
      
      // Verify token for state-changing requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        if (!this.verifyToken(req)) {
          return res.status(403).json({
            error: 'CSRF token validation failed',
            message: 'Invalid or missing CSRF token'
          });
        }
      }
      
      next();
    };
  }
}

/**
 * Helper function to add CSRF token to forms
 */
export function csrfFormField(token: string, fieldName: string = '_csrf'): string {
  return `<input type="hidden" name="${fieldName}" value="${token}">`;
}

/**
 * Helper function to add CSRF token to AJAX requests
 */
export function csrfAjaxHeader(token: string, headerName: string = 'X-CSRF-Token'): { [key: string]: string } {
  return {
    [headerName]: token
  };
}

// Export default instance with secure defaults
export default new CsrfProtection();