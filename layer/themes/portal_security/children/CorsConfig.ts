/**
 * CORS Configuration for Portal Embedding
 * Configures Cross-Origin Resource Sharing for embedded services
 */

export interface CorsOptions {
  allowedOrigins: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export const DEFAULT_CORS_CONFIG: CorsOptions = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3456',
    'http://localhost:3457'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Session-Id',
    'X-User-Id'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Create CORS middleware for Elysia
 */
export function createCorsMiddleware(options?: Partial<CorsOptions>) {
  const config = { ...DEFAULT_CORS_CONFIG, ...options };

  return function corsMiddleware(context: any) {
    const { request, set } = context;
    const origin = request.headers.get('origin');

    // Check if origin is allowed
    if (origin && config.allowedOrigins.includes(origin)) {
      set.headers['Access-Control-Allow-Origin'] = origin;
    }

    // Set other CORS headers
    if (config.credentials) {
      set.headers['Access-Control-Allow-Credentials'] = 'true';
    }

    if (config.allowedMethods) {
      set.headers['Access-Control-Allow-Methods'] = config.allowedMethods.join(', ');
    }

    if (config.allowedHeaders) {
      set.headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
    }

    if (config.maxAge) {
      set.headers['Access-Control-Max-Age'] = config.maxAge.toString();
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      set.status = 204;
      return new Response(null, { status: 204 });
    }

    return context;
  };
}

/**
 * Security headers for portal
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "frame-src http://localhost:3001 http://localhost:3002 http://localhost:3457",
    "connect-src 'self' http://localhost:3001 http://localhost:3002 http://localhost:3457"
  ].join('; ')
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(set: any) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    set.headers[key] = value;
  });
}
