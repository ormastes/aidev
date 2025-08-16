/**
 * API Gateway Server - Main entry point
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import responseTime from 'response-time';
import { createServer } from 'http';
import { config } from './config';
import { logger } from './utils/logger';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';
import { ProxyManager } from './proxy/proxy-manager';
import { RateLimiter } from './middleware/rate-limiter';
import { AuthManager } from './auth/auth-manager';
import { MetricsCollector } from './monitoring/metrics';
import { HealthChecker } from './health/health-checker';
import { CircuitBreaker } from './resilience/circuit-breaker';
import { CacheManager } from './cache/cache-manager';
import { SwaggerSetup } from './swagger';

export class APIGatewayServer {
  private app: express.Application;
  private server: any;
  private proxyManager: ProxyManager;
  private authManager: AuthManager;
  private metricsCollector: MetricsCollector;
  private healthChecker: HealthChecker;
  private circuitBreaker: CircuitBreaker;
  private cacheManager: CacheManager;
  private rateLimiter: RateLimiter;

  constructor() {
    this.app = express();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize core components
      this.cacheManager = new CacheManager(config.redis);
      this.authManager = new AuthManager(this.cacheManager);
      this.metricsCollector = new MetricsCollector();
      this.healthChecker = new HealthChecker();
      this.circuitBreaker = new CircuitBreaker();
      this.rateLimiter = new RateLimiter(this.cacheManager);
      this.proxyManager = new ProxyManager(
        this.circuitBreaker,
        this.metricsCollector
      );

      // Setup middleware
      this.setupGlobalMiddleware();
      
      // Setup routes and proxy
      this.setupAPIRoutes();
      
      // Setup Swagger documentation
      if (config.swagger.enabled) {
        SwaggerSetup.setup(this.app);
      }

      // Setup error handling
      this.setupErrorHandling();

      logger.info('API Gateway initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize API Gateway:', error);
      process.exit(1);
    }
  }

  private setupGlobalMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }));

    // Compression
    this.app.use(compression());

    // Response time tracking
    this.app.use(responseTime((req, res, time) => {
      this.metricsCollector.recordResponseTime(req.path, req.method, time);
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  private setupAPIRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = this.healthChecker.getHealth();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      const metrics = await this.metricsCollector.getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    });

    // API documentation
    this.app.get('/api-docs', (req, res) => {
      res.json({
        version: config.version,
        endpoints: this.proxyManager.getEndpoints(),
        rateLimit: config.rateLimiting,
      });
    });

    // Authentication endpoints
    this.app.post('/auth/login', this.authManager.login.bind(this.authManager));
    this.app.post('/auth/refresh', this.authManager.refresh.bind(this.authManager));
    this.app.post('/auth/logout', this.authManager.logout.bind(this.authManager));
    this.app.post('/auth/validate', this.authManager.validate.bind(this.authManager));

    // Setup proxy routes for microservices
    this.setupProxyRoutes();
  }

  private setupProxyRoutes(): void {
    // Define service routes
    const services = [
      {
        path: '/api/chat',
        target: 'http://localhost:3001',
        service: 'chat-space',
        rateLimit: { windowMs: 60000, max: 100 }
      },
      {
        path: '/api/mcp',
        target: 'http://localhost:3002',
        service: 'mcp-agent',
        rateLimit: { windowMs: 60000, max: 50 }
      },
      {
        path: '/api/workflow',
        target: 'http://localhost:3003',
        service: 'pocketflow',
        rateLimit: { windowMs: 60000, max: 200 }
      },
      {
        path: '/api/scraper',
        target: 'http://localhost:3888',
        service: 'web-scraper',
        rateLimit: { windowMs: 60000, max: 30 }
      },
      {
        path: '/api/monitoring',
        target: 'http://localhost:3999',
        service: 'monitoring-dashboard',
        rateLimit: { windowMs: 60000, max: 500 }
      },
      {
        path: '/api/portal',
        target: 'http://localhost:3000',
        service: 'portal',
        rateLimit: { windowMs: 60000, max: 100 }
      }
    ];

    // Register each service with the proxy
    services.forEach(service => {
      // Apply rate limiting per service
      this.app.use(
        service.path,
        this.rateLimiter.createLimiter(service.rateLimit),
        this.authManager.authenticate.bind(this.authManager),
        this.proxyManager.createProxy(service)
      );

      // Register health check for the service
      this.healthChecker.registerService(service.service, service.target);
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.path} not found`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      
      const status = err.status || 500;
      const message = err.message || 'Internal Server Error';
      
      res.status(status).json({
        error: message,
        status,
        timestamp: new Date().toISOString(),
        ...(config.env === 'development' && { stack: err.stack })
      });
    });
  }

  public async start(): Promise<void> {
    const port = config.port;
    
    this.server = createServer(this.app);
    
    this.server.listen(port, () => {
      logger.info(`API Gateway running on port ${port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Swagger UI: http://localhost:${port}/api-docs`);
      
      // Start health checks
      this.healthChecker.startChecking();
      
      // Start metrics collection
      this.metricsCollector.startCollection();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down API Gateway...');
    
    // Stop accepting new connections
    this.server.close(() => {
      logger.info('Server closed');
    });

    // Close all connections
    await this.cacheManager.disconnect();
    await this.healthChecker.stop();
    await this.metricsCollector.stop();
    
    process.exit(0);
  }
}

// Start the server
if (require.main === module) {
  const server = new APIGatewayServer();
  server.start().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}