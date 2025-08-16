/**
 * API Gateway Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.GATEWAY_PORT || '8080'),
  version: '1.0.0',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'HS256' as const,
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'gateway:',
    ttl: 3600, // 1 hour default TTL
  },

  // Rate Limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
  },

  // CORS Configuration
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
    ],
  },

  // Circuit Breaker Configuration
  circuitBreaker: {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '10000'),
    errorThreshold: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50'),
    volumeThreshold: parseInt(process.env.CIRCUIT_BREAKER_VOLUME_THRESHOLD || '10'),
    sleepWindow: parseInt(process.env.CIRCUIT_BREAKER_SLEEP_WINDOW || '10000'),
  },

  // Health Check Configuration
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'), // 5 seconds
    retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3'),
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    filename: process.env.LOG_FILE || 'api-gateway.log',
  },

  // Cache Configuration
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '60'), // 1 minute
  },

  // Swagger Configuration
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: 'AI Development Platform API Gateway',
    description: 'Unified API Gateway for all platform services',
    version: '1.0.0',
    servers: [
      {
        url: `http://localhost:${process.env.GATEWAY_PORT || '8080'}`,
        description: 'Development server',
      },
    ],
  },

  // Metrics Configuration
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    prefix: 'api_gateway_',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  },

  // Service Discovery (optional)
  serviceDiscovery: {
    enabled: process.env.SERVICE_DISCOVERY_ENABLED === 'true',
    type: process.env.SERVICE_DISCOVERY_TYPE || 'static', // static, consul, eureka, kubernetes
    consulHost: process.env.CONSUL_HOST || 'localhost',
    consulPort: parseInt(process.env.CONSUL_PORT || '8500'),
  },

  // Request/Response Configuration
  request: {
    maxBodySize: process.env.MAX_BODY_SIZE || '10mb',
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'), // 30 seconds
  },

  // Security Headers
  security: {
    contentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
    hsts: {
      enabled: process.env.HSTS_ENABLED !== 'false',
      maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
      includeSubDomains: true,
      preload: true,
    },
  },
};