interface Service {
  name: string;
  port: number;
  endpoints: string[];
  health?: string;
  lastSeen?: Date;
}

export class ServiceDiscovery {
  private static instance: ServiceDiscovery;
  private services: Map<string, Service> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  
  private constructor() {
    this.startHealthChecks();
  }
  
  static getInstance(): ServiceDiscovery {
    if (!ServiceDiscovery.instance) {
      ServiceDiscovery.instance = new ServiceDiscovery();
    }
    return ServiceDiscovery.instance;
  }
  
  async register(service: Service): Promise<void> {
    service.lastSeen = new Date();
    service.health = service.health || '/health';
    this.services.set(service.name, service);
    console.log(`Service registered: ${service.name} on port ${service.port}`);
  }
  
  async deregister(name: string): Promise<void> {
    this.services.delete(name);
    console.log(`Service deregistered: ${name}`);
  }
  
  getService(name: string): Service | undefined {
    return this.services.get(name);
  }
  
  getAllServices(): Service[] {
    return Array.from(this.services.values());
  }
  
  getServiceUrl(name: string): string | undefined {
    const service = this.services.get(name);
    if (!service) return undefined;
    return `http://localhost:${service.port}`;
  }
  
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.services.forEach(async (service, name) => {
        try {
          const response = await fetch(`http://localhost:${service.port}${service.health}`);
          if (response.ok) {
            service.lastSeen = new Date();
          } else {
            console.warn(`Health check failed for ${name}`);
          }
        } catch (error) {
          console.error(`Health check error for ${name}:`, error);
        }
      });
    }, 30000); // Check every 30 seconds
  }
  
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}