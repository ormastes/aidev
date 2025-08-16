export interface ServiceConfig {
  name: string;
  url?: string;
  port?: number;
  protocol?: string;
  requiresAuth?: boolean;
  dependencies?: string[];
  environments?: {
    [environment: string]: {
      url: string;
      port: number;
      protocol?: string;
    };
  };
}

export interface ServiceInfo extends ServiceConfig {
  id: string;
  registeredAt: Date;
}

export class ServiceDiscovery {
  private services: Map<string, ServiceInfo> = new Map();

  registerService(serviceId: string, config: ServiceConfig): void {
    const serviceInfo: ServiceInfo = {
      ...config,
      id: serviceId,
      registeredAt: new Date()
    };
    this.services.set(serviceId, serviceInfo);
  }

  unregisterService(serviceId: string): boolean {
    return this.services.delete(serviceId);
  }

  getService(serviceId: string): ServiceInfo | undefined {
    return this.services.get(serviceId);
  }

  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  getServicesByDependency(dependencyId: string): ServiceInfo[] {
    return this.getAllServices().filter(service => 
      service.dependencies?.includes(dependencyId)
    );
  }

  getServiceUrl(serviceId: string, environment?: string): string | undefined {
    const service = this.getService(serviceId);
    if (!service) return undefined;

    // If environment-specific URLs are defined and environment is specified
    if (environment && service.environments && service.environments[environment]) {
      return service.environments[environment].url;
    }

    // Return default URL
    return service.url;
  }

  getServicePort(serviceId: string, environment?: string): number | undefined {
    const service = this.getService(serviceId);
    if (!service) return undefined;

    // If environment-specific ports are defined and environment is specified
    if (environment && service.environments && service.environments[environment]) {
      return service.environments[environment].port;
    }

    // Return default port
    return service.port;
  }

  getServiceProtocol(serviceId: string, environment?: string): string | undefined {
    const service = this.getService(serviceId);
    if (!service) return undefined;

    // If environment-specific protocols are defined and environment is specified
    if (environment && service.environments && service.environments[environment]) {
      return service.environments[environment].protocol || 'http';
    }

    // Return default protocol
    return service.protocol || 'http';
  }

  getServicesForEnvironment(environment: string): Map<string, { url: string; port: number; protocol: string }> {
    const result = new Map<string, { url: string; port: number; protocol: string }>();

    for (const [serviceId, service] of this.services) {
      const url = this.getServiceUrl(serviceId, environment);
      const port = this.getServicePort(serviceId, environment);
      const protocol = this.getServiceProtocol(serviceId, environment);

      if (url && port) {
        result.set(serviceId, { url, port, protocol: protocol || 'http' });
      }
    }

    return result;
  }

  getDependencyTree(serviceId: string, visited: Set<string> = new Set()): string[] {
    if (visited.has(serviceId)) return [];
    visited.add(serviceId);

    const service = this.getService(serviceId);
    if (!service || !service.dependencies) return [];

    const allDependencies: string[] = [];
    
    for (const depId of service.dependencies) {
      allDependencies.push(depId);
      allDependencies.push(...this.getDependencyTree(depId, visited));
    }

    return [...new Set(allDependencies)];
  }

  clearServices(): void {
    this.services.clear();
  }

  getServiceCount(): number {
    return this.services.size;
  }

  hasService(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  exportConfiguration(): { [serviceId: string]: ServiceConfig } {
    const config: { [serviceId: string]: ServiceConfig } = {};
    
    for (const [serviceId, serviceInfo] of this.services) {
      const { id, registeredAt, ...serviceConfig } = serviceInfo;
      config[serviceId] = serviceConfig;
    }

    return config;
  }

  importConfiguration(config: { [serviceId: string]: ServiceConfig }): void {
    this.clearServices();
    
    for (const [serviceId, serviceConfig] of Object.entries(config)) {
      this.registerService(serviceId, serviceConfig);
    }
  }
}