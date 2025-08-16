/**
 * Comprehensive Security Headers Middleware
 * Implements all recommended security headers for web applications
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

export interface SecurityHeadersOptions {
  contentSecurityPolicy?: ContentSecurityPolicyOptions | boolean;
  crossOriginEmbedderPolicy?: boolean;
  crossOriginOpenerPolicy?: boolean;
  crossOriginResourcePolicy?: boolean;
  dnsPrefetchControl?: boolean;
  frameguard?: FrameguardOptions | boolean;
  hidePoweredBy?: boolean;
  hsts?: HstsOptions | boolean;
  ieNoOpen?: boolean;
  noSniff?: boolean;
  originAgentCluster?: boolean;
  permissionsPolicy?: PermissionsPolicyOptions | boolean;
  referrerPolicy?: ReferrerPolicyOptions | boolean;
  xssFilter?: boolean;
}

interface ContentSecurityPolicyOptions {
  directives?: {
    [directive: string]: string[] | string | boolean;
  };
  reportOnly?: boolean;
  reportUri?: string;
  useNonce?: boolean;
}

interface FrameguardOptions {
  action?: 'deny' | "sameorigin" | 'allow-from';
  domain?: string;
}

interface HstsOptions {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

interface PermissionsPolicyOptions {
  features?: {
    [feature: string]: string[];
  };
}

interface ReferrerPolicyOptions {
  policy?: string | string[];
}

/**
 * Main security headers class
 */
export class SecurityHeaders {
  private options: SecurityHeadersOptions;
  private nonces: Map<string, string> = new Map();

  constructor(options: SecurityHeadersOptions = {}) {
    // Set secure defaults
    this.options = {
      contentSecurityPolicy: options.contentSecurityPolicy ?? true,
      crossOriginEmbedderPolicy: options.crossOriginEmbedderPolicy ?? true,
      crossOriginOpenerPolicy: options.crossOriginOpenerPolicy ?? true,
      crossOriginResourcePolicy: options.crossOriginResourcePolicy ?? false,
      dnsPrefetchControl: options.dnsPrefetchControl ?? true,
      frameguard: options.frameguard ?? true,
      hidePoweredBy: options.hidePoweredBy ?? true,
      hsts: options.hsts ?? true,
      ieNoOpen: options.ieNoOpen ?? true,
      noSniff: options.noSniff ?? true,
      originAgentCluster: options.originAgentCluster ?? true,
      permissionsPolicy: options.permissionsPolicy ?? true,
      referrerPolicy: options.referrerPolicy ?? true,
      xssFilter: options.xssFilter ?? true
    };
  }

  /**
   * Generate a nonce for CSP
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Set Content Security Policy header
   */
  private setContentSecurityPolicy(req: Request, res: Response): void {
    if (!this.options.contentSecurityPolicy) return;

    const defaultOptions: ContentSecurityPolicyOptions = {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'media-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-src': ["'self'"],
        'frame-ancestors': ["'self'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': true,
        'block-all-mixed-content': true
      },
      reportOnly: false,
      useNonce: false
    };

    const cspOptions = typeof this.options.contentSecurityPolicy === 'object' 
      ? { ...defaultOptions, ...this.options.contentSecurityPolicy }
      : defaultOptions;

    // Generate nonce if needed
    let nonce = '';
    if (cspOptions.useNonce) {
      nonce = this.generateNonce();
      this.nonces.set(req.url, nonce);
      
      // Add nonce to script-src and style-src
      if (cspOptions.directives?.['script-src']) {
        if (Array.isArray(cspOptions.directives['script-src'])) {
          cspOptions.directives['script-src'].push(`'nonce-${nonce}'`);
        }
      }
      if (cspOptions.directives?.['style-src']) {
        if (Array.isArray(cspOptions.directives['style-src'])) {
          cspOptions.directives['style-src'].push(`'nonce-${nonce}'`);
        }
      }
    }

    // Build CSP string
    const policy = Object.entries(cspOptions.directives || {})
      .map(([directive, value]) => {
        if (value === true) return directive;
        if (value === false) return '';
        if (Array.isArray(value)) return `${directive} ${value.join(' ')}`;
        return `${directive} ${value}`;
      })
      .filter(Boolean)
      .join('; ');

    // Add report-uri if specified
    const finalPolicy = cspOptions.reportUri 
      ? `${policy}; report-uri ${cspOptions.reportUri}`
      : policy;

    // Set header
    const headerName = cspOptions.reportOnly 
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    
    res.setHeader(headerName, finalPolicy);

    // Attach nonce to response locals for template engines
    if (nonce) {
      (res as any).locals = (res as any).locals || {};
      (res as any).locals.cspNonce = nonce;
    }
  }

  /**
   * Set Strict-Transport-Security header
   */
  private setHsts(res: Response): void {
    if (!this.options.hsts) return;

    const defaultOptions: HstsOptions = {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: false
    };

    const hstsOptions = typeof this.options.hsts === 'object'
      ? { ...defaultOptions, ...this.options.hsts }
      : defaultOptions;

    let headerValue = `max-age=${hstsOptions.maxAge}`;
    
    if (hstsOptions.includeSubDomains) {
      headerValue += '; includeSubDomains';
    }
    
    if (hstsOptions.preload) {
      headerValue += '; preload';
    }

    res.setHeader('Strict-Transport-Security', headerValue);
  }

  /**
   * Set X-Frame-Options header
   */
  private setFrameguard(res: Response): void {
    if (!this.options.frameguard) return;

    const defaultOptions: FrameguardOptions = {
      action: "sameorigin"
    };

    const frameguardOptions = typeof this.options.frameguard === 'object'
      ? { ...defaultOptions, ...this.options.frameguard }
      : defaultOptions;

    let headerValue = "SAMEORIGIN";
    
    if (frameguardOptions.action === 'deny') {
      headerValue = 'DENY';
    } else if (frameguardOptions.action === 'allow-from' && frameguardOptions.domain) {
      headerValue = `ALLOW-FROM ${frameguardOptions.domain}`;
    }

    res.setHeader('X-Frame-Options', headerValue);
  }

  /**
   * Set Permissions-Policy header
   */
  private setPermissionsPolicy(res: Response): void {
    if (!this.options.permissionsPolicy) return;

    const defaultFeatures = {
      "accelerometer": ['self'],
      'ambient-light-sensor': ['self'],
      "autoplay": ['self'],
      'battery': ['self'],
      'camera': ['none'],
      'display-capture': ['none'],
      'document-domain': ['self'],
      'encrypted-media': ['self'],
      "fullscreen": ['self'],
      "geolocation": ['none'],
      "gyroscope": ['self'],
      "magnetometer": ['none'],
      "microphone": ['none'],
      'midi': ['none'],
      'payment': ['none'],
      'picture-in-picture': ['self'],
      'publickey-credentials-get': ['self'],
      'screen-wake-lock': ['self'],
      'sync-xhr': ['self'],
      'usb': ['none'],
      'web-share': ['self'],
      'xr-spatial-tracking': ['none']
    };

    const features = typeof this.options.permissionsPolicy === 'object' && this.options.permissionsPolicy.features
      ? { ...defaultFeatures, ...this.options.permissionsPolicy.features }
      : defaultFeatures;

    const policy = Object.entries(features)
      .map(([feature, allowList]) => {
        const values = allowList.map(value => 
          value === 'self' ? 'self' : `"${value}"`
        ).join(' ');
        return `${feature}=(${values})`;
      })
      .join(', ');

    res.setHeader('Permissions-Policy', policy);
  }

  /**
   * Set Referrer-Policy header
   */
  private setReferrerPolicy(res: Response): void {
    if (!this.options.referrerPolicy) return;

    const defaultPolicy = 'strict-origin-when-cross-origin';
    
    let policy: string;
    if (typeof this.options.referrerPolicy === 'object' && this.options.referrerPolicy.policy) {
      policy = Array.isArray(this.options.referrerPolicy.policy)
        ? this.options.referrerPolicy.policy.join(', ')
        : this.options.referrerPolicy.policy;
    } else {
      policy = defaultPolicy;
    }

    res.setHeader('Referrer-Policy', policy);
  }

  /**
   * Express middleware function
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Content Security Policy
      this.setContentSecurityPolicy(req, res);

      // Cross-Origin Headers
      if (this.options.crossOriginEmbedderPolicy) {
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      }
      
      if (this.options.crossOriginOpenerPolicy) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      }
      
      if (this.options.crossOriginResourcePolicy) {
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      }

      // DNS Prefetch Control
      if (this.options.dnsPrefetchControl) {
        res.setHeader('X-DNS-Prefetch-Control', 'off');
      }

      // Frameguard
      this.setFrameguard(res);

      // Hide X-Powered-By
      if (this.options.hidePoweredBy) {
        res.removeHeader('X-Powered-By');
      }

      // HSTS
      this.setHsts(res);

      // IE No Open
      if (this.options.ieNoOpen) {
        res.setHeader('X-Download-Options', 'noopen');
      }

      // No Sniff
      if (this.options.noSniff) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }

      // Origin Agent Cluster
      if (this.options.originAgentCluster) {
        res.setHeader('Origin-Agent-Cluster', '?1');
      }

      // Permissions Policy
      this.setPermissionsPolicy(res);

      // Referrer Policy
      this.setReferrerPolicy(res);

      // XSS Filter
      if (this.options.xssFilter) {
        res.setHeader('X-XSS-Protection', '1; mode=block');
      }

      next();
    };
  }

  /**
   * Get nonce for current request
   */
  getNonce(url: string): string | undefined {
    return this.nonces.get(url);
  }

  /**
   * Clear old nonces to prevent memory leak
   */
  clearOldNonces(): void {
    // In production, implement proper cleanup based on request lifecycle
    this.nonces.clear();
  }
}

/**
 * Preset configurations for different security levels
 */
export const securityPresets = {
  // Maximum security (may break some functionality)
  strict: new SecurityHeaders({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'none'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'"],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': true
      },
      useNonce: true
    },
    crossOriginResourcePolicy: true,
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true
    }
  }),

  // Balanced security (recommended for most applications)
  balanced: new SecurityHeaders({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'connect-src': ["'self'", 'https://api.example.com'],
        'frame-ancestors': ["'self'"],
        'upgrade-insecure-requests': true
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true
    }
  }),

  // Minimal security (for development/testing)
  minimal: new SecurityHeaders({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    hsts: false
  })
};

export default SecurityHeaders;