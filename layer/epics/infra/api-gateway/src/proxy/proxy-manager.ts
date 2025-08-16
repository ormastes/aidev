/**
 * Proxy Manager - Routes requests to microservices
 */

import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import { CircuitBreaker } from '../resilience/circuit-breaker';
import { MetricsCollector } from '../monitoring/metrics';
import { logger } from '../utils/logger';

export interface ServiceConfig {
  path: string;
  target: string;
  service: string;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  timeout?: number;
  retries?: number;
  changeOrigin?: boolean;
  pathRewrite?: { [key: string]: string };
  headers?: { [key: string]: string };
}

export class ProxyManager {
  private circuitBreaker: CircuitBreaker;
  private metricsCollector: MetricsCollector;
  private proxies: Map<string, any> = new Map();
  private services: Map<string, ServiceConfig> = new Map();

  constructor(
    circuitBreaker: CircuitBreaker,
    metricsCollector: MetricsCollector
  ) {
    this.circuitBreaker = circuitBreaker;
    this.metricsCollector = metricsCollector;
  }

  /**
   * Create proxy middleware for a service
   */
  public createProxy(serviceConfig: ServiceConfig): any {
    const { path, target, service } = serviceConfig;
    
    // Check if proxy already exists
    if (this.proxies.has(service)) {
      return this.proxies.get(service);
    }

    // Store service configuration
    this.services.set(service, serviceConfig);

    // Create proxy options
    const proxyOptions: Options = {
      target,
      changeOrigin: serviceConfig.changeOrigin !== false,
      pathRewrite: serviceConfig.pathRewrite || {
        [`^${path}`]: '',
      },
      timeout: serviceConfig.timeout || 30000,
      proxyTimeout: serviceConfig.timeout || 30000,
      
      // Custom headers
      onProxyReq: (proxyReq, req, res) => {
        // Add custom headers
        if (serviceConfig.headers) {
          Object.entries(serviceConfig.headers).forEach(([key, value]) => {
            proxyReq.setHeader(key, value);
          });
        }

        // Add tracing headers
        const traceId = (req as any).traceId || this.generateTraceId();
        proxyReq.setHeader('X-Trace-ID', traceId);
        proxyReq.setHeader('X-Forwarded-For', req.ip || '');
        proxyReq.setHeader('X-Real-IP', req.ip || '');
        proxyReq.setHeader('X-Gateway-Time', Date.now().toString());

        // Add user context if authenticated
        const user = (req as any).user;
        if (user) {
          proxyReq.setHeader('X-User-ID', user.id);
          proxyReq.setHeader('X-User-Roles', user.roles.join(','));
        }

        // Log outgoing request
        logger.debug(`Proxying request to ${service}`, {
          method: req.method,
          path: req.path,
          target: `${target}${req.path}`,
          traceId,
        });

        // Record metrics
        this.metricsCollector.recordRequest(service, req.method, req.path);
      },

      // Handle proxy response
      onProxyRes: (proxyRes, req, res) => {
        const responseTime = Date.now() - parseInt(proxyRes.headers['x-gateway-time'] || '0');
        
        // Add response headers
        res.setHeader('X-Response-Time', responseTime.toString());
        res.setHeader('X-Service', service);

        // Log response
        logger.debug(`Proxy response from ${service}`, {
          status: proxyRes.statusCode,
          responseTime,
          path: req.path,
        });

        // Record metrics
        this.metricsCollector.recordResponse(
          service,
          req.method,
          req.path,
          proxyRes.statusCode || 0,
          responseTime
        );

        // Update circuit breaker
        if (proxyRes.statusCode && proxyRes.statusCode >= 500) {
          this.circuitBreaker.recordFailure(service);
        } else {
          this.circuitBreaker.recordSuccess(service);
        }
      },

      // Handle errors
      onError: (err, req, res) => {
        logger.error(`Proxy error for ${service}:`, err);
        
        // Record failure in circuit breaker
        this.circuitBreaker.recordFailure(service);
        
        // Record error metric
        this.metricsCollector.recordError(service, req.method, req.path, err.message);

        // Check if circuit is open
        if (this.circuitBreaker.isOpen(service)) {
          (res as Response).status(503).json({
            error: 'Service Unavailable',
            message: `Service ${service} is temporarily unavailable`,
            service,
            retryAfter: this.circuitBreaker.getResetTime(service),
          });
          return;
        }

        // Return error response
        (res as Response).status(502).json({
          error: 'Bad Gateway',
          message: `Failed to reach service ${service}`,
          service,
          details: err.message,
        });
      },
    };

    // Create proxy middleware with circuit breaker
    const proxyMiddleware = (req: Request, res: Response, next: NextFunction) => {
      // Check circuit breaker
      if (this.circuitBreaker.isOpen(service)) {
        logger.warn(`Circuit breaker open for ${service}`);
        
        res.status(503).json({
          error: 'Service Unavailable',
          message: `Service ${service} is temporarily unavailable`,
          service,
          retryAfter: this.circuitBreaker.getResetTime(service),
        });
        return;
      }

      // Apply retry logic if configured
      if (serviceConfig.retries && serviceConfig.retries > 0) {
        this.retryProxy(req, res, proxyOptions, service, serviceConfig.retries);
      } else {
        createProxyMiddleware(proxyOptions)(req, res, next);
      }
    };

    this.proxies.set(service, proxyMiddleware);
    return proxyMiddleware;
  }

  /**
   * Retry proxy with exponential backoff
   */
  private async retryProxy(
    req: Request,
    res: Response,
    options: Options,
    service: string,
    retries: number,
    attempt: number = 1
  ): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        const proxy = createProxyMiddleware({
          ...options,
          onError: (err) => {
            if (attempt < retries) {
              logger.warn(`Retry attempt ${attempt} failed for ${service}:`, err.message);
              reject(err);
            } else {
              options.onError?.(err, req, res);
              resolve();
            }
          },
          onProxyRes: (proxyRes, req, res) => {
            if (proxyRes.statusCode && proxyRes.statusCode >= 500 && attempt < retries) {
              logger.warn(`Retry attempt ${attempt} got ${proxyRes.statusCode} from ${service}`);
              reject(new Error(`Service returned ${proxyRes.statusCode}`));
            } else {
              options.onProxyRes?.(proxyRes, req, res);
              resolve();
            }
          },
        });

        proxy(req, res, () => resolve());
      });
    } catch (error) {
      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      logger.info(`Retrying ${service} after ${delay}ms (attempt ${attempt + 1}/${retries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry
      await this.retryProxy(req, res, options, service, retries, attempt + 1);
    }
  }

  /**
   * Load balance between multiple targets
   */
  public createLoadBalancedProxy(
    path: string,
    targets: string[],
    service: string
  ): any {
    let currentIndex = 0;

    return (req: Request, res: Response, next: NextFunction) => {
      // Round-robin load balancing
      const target = targets[currentIndex];
      currentIndex = (currentIndex + 1) % targets.length;

      const config: ServiceConfig = {
        path,
        target,
        service,
      };

      this.createProxy(config)(req, res, next);
    };
  }

  /**
   * Create health-check aware proxy
   */
  public createHealthAwareProxy(
    serviceConfig: ServiceConfig,
    healthChecker: (target: string) => Promise<boolean>
  ): any {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check service health
      const isHealthy = await healthChecker(serviceConfig.target);
      
      if (!isHealthy) {
        logger.warn(`Service ${serviceConfig.service} is unhealthy`);
        
        res.status(503).json({
          error: 'Service Unavailable',
          message: `Service ${serviceConfig.service} is unhealthy`,
          service: serviceConfig.service,
        });
        return;
      }

      this.createProxy(serviceConfig)(req, res, next);
    };
  }

  /**
   * Get all registered endpoints
   */
  public getEndpoints(): Array<{
    path: string;
    service: string;
    target: string;
    status: string;
  }> {
    const endpoints: Array<any> = [];
    
    for (const [service, config] of this.services) {
      endpoints.push({
        path: config.path,
        service,
        target: config.target,
        status: this.circuitBreaker.getStatus(service),
      });
    }

    return endpoints;
  }

  /**
   * Update service target dynamically
   */
  public updateServiceTarget(service: string, newTarget: string): boolean {
    const config = this.services.get(service);
    
    if (!config) {
      logger.error(`Service ${service} not found`);
      return false;
    }

    config.target = newTarget;
    this.services.set(service, config);
    
    // Clear cached proxy to force recreation
    this.proxies.delete(service);
    
    logger.info(`Updated target for ${service} to ${newTarget}`);
    return true;
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  public getServiceStats(service: string): any {
    return {
      service,
      config: this.services.get(service),
      circuitStatus: this.circuitBreaker.getStatus(service),
      metrics: this.metricsCollector.getServiceMetrics(service),
    };
  }
}