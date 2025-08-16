/**
 * Service Registry - Core component for service registration and discovery
 */

import { EventEmitter } from 'node:events';
import express, { Application, Request, Response, NextFunction } from 'express';
import { Server } from '../utils/http-wrapper';
import { AuthenticationManager } from '../auth/authentication-manager';

export interface ServiceInfo {
  id: string;
  name: string;
  url: string;
  healthEndpoint: string;
  version: string;
  tags: string[];
  status: 'healthy' | "unhealthy" | 'unknown';
  metadata?: Record<string, any>;
  lastHealthCheck?: Date;
}

export interface ServiceHealth {
  status: 'healthy' | "unhealthy" | 'unknown';
  uptime?: number;
  version?: string;
  lastCheck?: string;
  error?: string;
}

export interface RegistryConfig {
  port: number;
  healthCheckInterval: number;
  authManager?: AuthenticationManager;
}

export class ServiceRegistry extends EventEmitter {
  private services: Map<string, ServiceInfo> = new Map();
  private app: Application;
  private server?: Server;
  private config: RegistryConfig;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private authManager?: AuthenticationManager;

  constructor(config: RegistryConfig) {
    super();
    this.config = config;
    this.authManager = config.authManager;
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Authentication middleware
    const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
      // Skip auth for health endpoint and GET /services
      if (req.path === '/health' || (req.method === 'GET' && req.path === '/services')) {
        return next();
      }

      if (!this.authManager) {
        return next();
      }

      const authResult = await this.authManager.authenticateRequest(
        req.headers.authorization,
        ['service:register', 'service:discover']
      );

      if (!authResult.success) {
        if (authResult.error?.includes('No authentication token')) {
          return res.status(401).json({ error: 'authentication required' });
        }
        if (authResult.error?.includes('Invalid or expired')) {
          return res.status(403).json({ error: 'invalid token' });
        }
        return res.status(403).json({ error: authResult.error });
      }

      next();
    };

    this.app.use(authMiddleware);

    // List all services
    this.app.get('/services', (req, res) => {
      const services = Array.from(this.services.values());
      res.json(services);
    });

    // Register a service
    this.app.post('/services', (req, res) => {
      const service = req.body as ServiceInfo;
      
      if (!service.id || !service.name || !service.url) {
        return res.status(400).json({ error: 'Invalid service configuration' });
      }

      if (this.services.has(service.id)) {
        return res.status(409).json({ error: 'Service already registered' });
      }

      service.status = 'unknown';
      this.services.set(service.id, service);
      this.emit('service:registered', service);

      res.json({ success: true, serviceId: service.id });
    });

    // Update service
    this.app.put('/services/:id', (req, res) => {
      const serviceId = req.params.id;
      const updates = req.body;

      if (!this.services.has(serviceId)) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const service = this.services.get(serviceId)!;
      const updatedService = { ...service, ...updates };
      this.services.set(serviceId, updatedService);
      this.emit('service:updated', updatedService);

      res.json({ success: true });
    });

    // Deregister a service
    this.app.delete('/services/:id', (req, res) => {
      const serviceId = req.params.id;

      if (!this.services.has(serviceId)) {
        return res.status(404).json({ error: 'Service not found' });
      }

      this.services.delete(serviceId);
      this.emit('service:deregistered', serviceId);

      // Clear health check interval
      const interval = this.healthCheckIntervals.get(serviceId);
      if (interval) {
        clearInterval(interval);
        this.healthCheckIntervals.delete(serviceId);
      }

      res.json({ success: true });
    });

    // Get service health
    this.app.get('/services/:id/health', (req, res) => {
      const serviceId = req.params.id;
      const service = this.services.get(serviceId);

      if (!service) {
        return res.status(404).json({ 
          status: 'unknown', 
          error: 'Service not found' 
        });
      }

      res.json({
        status: service.status,
        lastCheck: service.lastHealthCheck?.toISOString()
      });
    });

    // Update service health
    this.app.post('/services/:id/health', (req, res) => {
      const serviceId = req.params.id;
      const health = req.body as ServiceHealth;

      this.updateServiceHealth(serviceId, health);
      res.json({ success: true });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`Service Registry running on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Clear all health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Service Registry stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async listServices(): Promise<ServiceInfo[]> {
    return Array.from(this.services.values());
  }

  async updateServiceHealth(serviceId: string, health: ServiceHealth): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) return;

    service.status = health.status;
    service.lastHealthCheck = new Date();
    
    if (health.version) {
      service.version = health.version;
    }

    this.emit('service:health:updated', { serviceId, health });
  }

  getService(serviceId: string): ServiceInfo | undefined {
    return this.services.get(serviceId);
  }
}