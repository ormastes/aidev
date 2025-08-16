/**
 * Service Health Monitor - Monitors health of registered services
 */

import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import fetch from 'node-fetch';
import { ServiceRegistry, ServiceInfo } from '../core/service-registry';

export interface HealthMonitorConfig {
  registry: ServiceRegistry;
  checkInterval: number;
  timeout?: number;
}

export interface HealthCheckResult {
  serviceId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
}

export class ServiceHealthMonitor extends EventEmitter {
  private registry: ServiceRegistry;
  private checkInterval: number;
  private timeout: number;
  private monitoringInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config: HealthMonitorConfig) {
    super();
    this.registry = config.registry;
    this.checkInterval = config.checkInterval;
    this.timeout = config.timeout || 3000;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    
    // Start periodic health checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks().catch(err => {
        console.error('Health check cycle failed:', err);
      });
    }, this.checkInterval);

    // Perform initial health check
    await this.performHealthChecks();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  private async performHealthChecks(): Promise<void> {
    const services = await this.registry.listServices();
    
    // Check health of all services in parallel
    const healthChecks = services.map(service => this.checkServiceHealth(service));
    const results = await Promise.allSettled(healthChecks);

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const healthResult = result.value;
        const service = services[index];
        
        // Update service health in registry
        this.registry.updateServiceHealth(service.id, {
          status: healthResult.status,
          lastCheck: new Date().toISOString()
        });

        this.emit('health:checked', healthResult);
      } else {
        console.error(`Health check failed for service:`, result.reason);
      }
    });
  }

  private async checkServiceHealth(service: ServiceInfo): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const healthUrl = new URL(service.healthEndpoint, service.url).toString();
      
      const response = await fetch(healthUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'AI-Dev-Portal-Health-Monitor/1.0'
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        // Try to parse health response
        try {
          const healthData = await response.json();
          
          // Update service health with additional data if available
          if (healthData.uptime || healthData.version) {
            await this.registry.updateServiceHealth(service.id, {
              status: 'healthy',
              uptime: healthData.uptime,
              version: healthData.version,
              lastCheck: new Date().toISOString()
            });
          }
        } catch {
          // If JSON parsing fails, just mark as healthy
        }

        return {
          serviceId: service.id,
          status: 'healthy',
          responseTime
        };
      } else {
        return {
          serviceId: service.id,
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error: any) {
      return {
        serviceId: service.id,
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkSpecificService(serviceId: string): Promise<HealthCheckResult> {
    const service = this.registry.getService(serviceId);
    
    if (!service) {
      return {
        serviceId,
        status: 'unknown',
        error: 'Service not found'
      };
    }

    return this.checkServiceHealth(service);
  }
}