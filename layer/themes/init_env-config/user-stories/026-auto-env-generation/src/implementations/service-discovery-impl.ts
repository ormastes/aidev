/**
 * Implementation of ServiceDiscovery
 * 
 * This implementation provides in-memory service registry and discovery
 * functionality for development and testing purposes.
 */

import {
  ServiceDiscovery,
  ServiceInfo,
  ServiceRegistration,
  ServiceQuery,
  ServiceHealth
} from '../external/service-discovery';

export class ServiceDiscoveryImpl implements ServiceDiscovery {
  private services: Map<string, ServiceInfo> = new Map();
  private watchers: Set<(event: "registered" | "unregistered" | 'updated', service: ServiceInfo) => void> = new Set();

  async registerService(registration: ServiceRegistration): Promise<ServiceInfo> {
    const serviceInfo: ServiceInfo = {
      name: registration.name,
      port: registration.port,
      host: registration.host || "localhost",
      protocol: registration.protocol || 'http',
      environment: registration.environment,
      status: 'healthy',
      lastChecked: new Date().toISOString(),
      metadata: {
        healthCheckPath: registration.healthCheckPath,
        dependencies: registration.dependencies || []
      }
    };

    const key = this.getServiceKey(registration.name, registration.environment);
    this.services.set(key, serviceInfo);
    
    // Notify watchers
    this.notifyWatchers("registered", serviceInfo);
    
    return serviceInfo;
  }

  async unregisterService(name: string, environment: string): Promise<void> {
    const key = this.getServiceKey(name, environment);
    const service = this.services.get(key);
    
    if (service) {
      this.services.delete(key);
      this.notifyWatchers("unregistered", service);
    }
  }

  async discoverService(name: string, environment: string): Promise<ServiceInfo | null> {
    const key = this.getServiceKey(name, environment);
    const service = this.services.get(key);
    
    if (!service) {
      // Try to find in shared environment
      const sharedKey = this.getServiceKey(name, 'shared');
      return this.services.get(sharedKey) || null;
    }
    
    return service;
  }

  async discoverServices(query: ServiceQuery): Promise<ServiceInfo[]> {
    const results: ServiceInfo[] = [];
    
    for (const service of this.services.values()) {
      if (query.name && service.name !== query.name) continue;
      if (query.environment && service.environment !== query.environment) continue;
      if (query.status && service.status !== query.status) continue;
      
      results.push(service);
    }
    
    return results;
  }

  async getServiceUrl(name: string, environment: string): Promise<string> {
    const service = await this.discoverService(name, environment);
    
    if (!service) {
      throw new Error(`Service ${name} not found in environment ${environment}`);
    }
    
    return `${service.protocol}://${service.host}:${service.port}`;
  }

  async getServiceUrls(services: Array<{name: string, environment: string}>): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};
    
    for (const { name, environment } of services) {
      try {
        urls[name] = await this.getServiceUrl(name, environment);
      } catch (error) {
        // Skip services that aren't found
      }
    }
    
    return urls;
  }

  async checkServiceHealth(name: string, environment: string): Promise<ServiceHealth> {
    const service = await this.discoverService(name, environment);
    
    if (!service) {
      return {
        service: name,
        healthy: false,
        lastCheck: new Date().toISOString(),
        error: 'Service not found'
      };
    }
    
    // For this implementation, we'll use the service status
    // In a real implementation, this would make HTTP health checks
    return {
      service: name,
      healthy: service.status === 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: Math.random() * 100 // Mock response time
    };
  }

  async checkAllServicesHealth(environment?: string): Promise<ServiceHealth[]> {
    const healthChecks: ServiceHealth[] = [];
    
    for (const service of this.services.values()) {
      if (environment && service.environment !== environment) continue;
      
      const health = await this.checkServiceHealth(service.name, service.environment);
      healthChecks.push(health);
    }
    
    return healthChecks;
  }

  async getServiceDependencies(name: string, environment: string): Promise<string[]> {
    const service = await this.discoverService(name, environment);
    
    if (!service || !service.metadata?.dependencies) {
      return [];
    }
    
    return service.metadata.dependencies as string[];
  }

  async getDependentServices(name: string, environment: string): Promise<string[]> {
    const dependents: string[] = [];
    
    for (const service of this.services.values()) {
      if (service.environment === environment && service.metadata?.dependencies) {
        const dependencies = service.metadata.dependencies as string[];
        if (dependencies.includes(name)) {
          dependents.push(service.name);
        }
      }
    }
    
    return dependents;
  }

  async updateServiceStatus(name: string, environment: string, status: 'healthy' | "unhealthy" | 'unknown'): Promise<void> {
    const key = this.getServiceKey(name, environment);
    const service = this.services.get(key);
    
    if (service) {
      service.status = status;
      service.lastChecked = new Date().toISOString();
      this.notifyWatchers('updated', service);
    }
  }

  watchServices(callback: (event: "registered" | "unregistered" | 'updated', service: ServiceInfo) => void): () => void {
    this.watchers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.watchers.delete(callback);
    };
  }

  private getServiceKey(name: string, environment: string): string {
    return `${environment}:${name}`;
  }

  private notifyWatchers(event: "registered" | "unregistered" | 'updated', service: ServiceInfo): void {
    for (const watcher of this.watchers) {
      try {
        watcher(event, service);
      } catch (error) {
        console.error('Error in service watcher:', error);
      }
    }
  }
}