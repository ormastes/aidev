/**
 * Security constants and configuration
 */

export const SecurityConstants = {
  // Session configuration
  SESSION: {
    SECRET: process.env.SESSION_SECRET || 'aidev-session-secret-change-in-production',
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    COOKIE_NAME: 'aidev.sid',
    REDIS_PREFIX: 'aidev:session:'
  },

  // JWT configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || 'aidev-jwt-secret-change-in-production',
    EXPIRES_IN: '24h',
    REFRESH_EXPIRES_IN: '7d',
    ALGORITHM: 'HS256' as const
  },

  // Password policy
  PASSWORD: {
    MIN_LENGTH: 8,
    BCRYPT_ROUNDS: 10,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false
  },

  // Rate limiting
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: {
      MAX: 5,
      WINDOW_MS: 15 * 60 * 1000 // 15 minutes
    },
    API_REQUESTS: {
      MAX: 100,
      WINDOW_MS: 15 * 60 * 1000 // 15 minutes
    }
  },

  // CORS configuration
  CORS: {
    ALLOWED_ORIGINS: [
      'http://localhost:3400', // aidev-portal
      'http://localhost:3456', // gui-selector
      'http://localhost:3300', // chat-space
      'http://localhost:3500'  // pocketflow
    ],
    CREDENTIALS: true
  },

  // Security headers
  HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'"
  },

  // Default credentials (development only)
  DEFAULT_CREDENTIALS: {
    USERNAME: 'admin',
    password: "PLACEHOLDER"
  }
};