/**
 * PortAllocator Component
 * 
 * Manages port allocation for different environment types and services.
 * Integrates with PortRegistry for persistent storage.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import type { 
  PortAllocator as IPortAllocator,
  PortRange,
  PortAllocation,
  EnvironmentPortConfig 
} from '../interfaces/port-allocator.interface';
import { PortRegistry } from './port-registry';

export class PortAllocator implements IPortAllocator {
  private portRegistry: PortRegistry;
  
  // Port configuration for each environment type
  private readonly portConfigs: Record<EnvironmentPortConfig['type'], {base: number, start: number, end: number}> = {
    release: { base: 3456, start: 3400, end: 3499 },
    test: { base: 3100, start: 3100, end: 3199 },
    theme: { base: 3200, start: 3200, end: 3299 },
    demo: { base: 3300, start: 3300, end: 3399 },
    epic: { base: 3500, start: 3500, end: 3599 }
  };

  constructor(portRegistry: PortRegistry) {
    this.portRegistry = portRegistry;
  }

  async allocatePortsForEnvironment(
    environmentName: string,
    environmentType: EnvironmentPortConfig['type']
  ): Promise<{ portal: number; services: PortRange }> {
    // We need to ensure the whole allocation process is atomic
    // The registry handles locking internally, but we need to check and allocate atomically
    const config = this.portConfigs[environmentType];
    
    // Special handling for release environment (Working on port)
    if (environmentType === 'release') {
      const isAvailable = await this.isPortAvailable(config.base);
      if (!isAvailable) {
        throw new Error(`Release port ${config.base} is already allocated`);
      }
      
      await this.portRegistry.registerAllocation(environmentName, 'portal', config.base);
      
      return {
        portal: config.base,
        services: { start: config.start + 1, end: config.end }
      };
    }
    
    // For other environments, we need to find and allocate atomically
    // The registry's locking will handle the race condition
    let allocated = false;
    let basePort = config.start - 1;
    
    while (!allocated && basePort < config.end) {
      basePort++;
      const isAvailable = await this.isPortAvailable(basePort);
      
      if (isAvailable) {
        try {
          // Try to allocate - this will be atomic due to registry locking
          await this.portRegistry.registerAllocation(environmentName, 'portal', basePort);
          allocated = true;
        } catch {
          // Another process got it first, continue searching
          continue;
        }
      }
    }
    
    if (!allocated) {
      throw new Error(`No available ports in ${environmentType} range`);
    }
    
    return {
      portal: basePort,
      services: { start: basePort + 1, end: config.end }
    };
  }

  async allocateServicePort(environmentName: string, serviceName: string): Promise<number> {
    // Get environment's existing allocations
    const envPorts = await this.portRegistry.getEnvironmentPorts(environmentName);
    if (envPorts.length === 0) {
      throw new Error(`Environment ${environmentName} not found`);
    }
    
    // Find the base port to determine the range
    const basePort = Math.min(...envPorts.map(p => p.port));
    const envType = this.getEnvironmentTypeByPort(basePort);
    const config = this.portConfigs[envType];
    
    // Find next available port in the service range
    const servicePort = await this.getNextAvailablePort({ 
      start: basePort + 1, 
      end: config.end 
    });
    
    if (!servicePort) {
      throw new Error(`No available service ports for environment ${environmentName}`);
    }
    
    // Register the service port
    await this.portRegistry.registerAllocation(environmentName, serviceName, servicePort);
    
    return servicePort;
  }

  async releaseEnvironmentPorts(environmentName: string): Promise<boolean> {
    await this.portRegistry.removeEnvironmentAllocations(environmentName);
    return true;
  }

  async releasePort(port: number): Promise<boolean> {
    // Find which environment/service owns this port
    const allPorts = await this.portRegistry.getUsedPorts();
    const allocation = allPorts.find(p => p.port === port);
    
    if (allocation) {
      // Remove specific allocation
      const envPorts = await this.portRegistry.getEnvironmentPorts(allocation.env);
      const otherPorts = envPorts.filter(p => p.port !== port);
      
      // Re-register all other ports (crude but works)
      await this.portRegistry.removeEnvironmentAllocations(allocation.env);
      for (const p of otherPorts) {
        await this.portRegistry.registerAllocation(allocation.env, p.service, p.port);
      }
    }
    
    return true;
  }

  async isPortAvailable(port: number): Promise<boolean> {
    const usedPorts = await this.portRegistry.getUsedPorts();
    return !usedPorts.some(p => p.port === port);
  }

  async getEnvironmentPorts(environmentName: string): Promise<PortAllocation[]> {
    const ports = await this.portRegistry.getEnvironmentPorts(environmentName);
    return ports.map(p => ({
      port: p.port,
      service: p.service,
      environment: environmentName,
      allocatedAt: new Date() // In a real implementation, we'd store this
    }));
  }

  async getNextAvailablePort(range: PortRange): Promise<number | null> {
    const usedPorts = await this.portRegistry.getUsedPorts();
    const usedPortNumbers = new Set(usedPorts.map(p => p.port));
    
    for (let port = range.start; port <= range.end; port++) {
      if (!usedPortNumbers.has(port)) {
        return port;
      }
    }
    
    return null;
  }

  async getAllUsedPorts(): Promise<PortAllocation[]> {
    const usedPorts = await this.portRegistry.getUsedPorts();
    return usedPorts.map(p => ({
      port: p.port,
      service: p.service,
      environment: p.env,
      allocatedAt: new Date()
    }));
  }

  getPortConfigForType(type: EnvironmentPortConfig['type']): EnvironmentPortConfig {
    const config = this.portConfigs[type];
    return {
      type,
      basePort: config.base,
      serviceRange: { start: config.start, end: config.end }
    };
  }

  async reservePort(port: number, environmentName: string, serviceName: string): Promise<boolean> {
    const isAvailable = await this.isPortAvailable(port);
    if (!isAvailable) {
      return false;
    }
    
    await this.portRegistry.registerAllocation(environmentName, serviceName, port);
    return true;
  }

  validatePortForEnvironment(port: number, environmentType: EnvironmentPortConfig['type']): boolean {
    const config = this.portConfigs[environmentType];
    return port >= config.start && port <= config.end;
  }

  async getPortUsageSummary(): Promise<{
    [key in EnvironmentPortConfig['type']]: {
      total: number;
      used: number;
      available: number;
    };
  }> {
    const usedPorts = await this.portRegistry.getUsedPorts();
    const summary: any = {};
    
    for (const [type, config] of Object.entries(this.portConfigs)) {
      const total = config.end - config.start + 1;
      const used = usedPorts.filter(p => 
        p.port >= config.start && p.port <= config.end
      ).length;
      
      summary[type] = {
        total,
        used,
        available: total - used
      };
    }
    
    return summary;
  }
  
  private getEnvironmentTypeByPort(port: number): EnvironmentPortConfig['type'] {
    for (const [type, config] of Object.entries(this.portConfigs)) {
      if (port >= config.start && port <= config.end) {
        return type as EnvironmentPortConfig['type'];
      }
    }
    throw new Error(`Port ${port} does not belong to any known environment type`);
  }
}