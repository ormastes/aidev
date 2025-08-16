/**
 * Shared port management utilities for all themes
 */

import { net } from '../../../infra_external-log-lib/src';

/**
 * Default port allocations for common services
 */
export const DEFAULT_PORTS = {
  webServer: 3000,
  apiServer: 3001,
  database: 5432,
  redis: 6379,
  elasticsearch: 9200,
  kafka: 9092,
  graphql: 4000,
  websocket: 8080,
  metrics: 9090,
  healthCheck: 3999,
} as const;

/**
 * Port range for dynamic allocation
 */
export const PORT_RANGE = {
  min: 3000,
  max: 9999,
} as const;

/**
 * Checks if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

/**
 * Finds an available port within a range
 */
export async function findAvailablePort(
  startPort: number = PORT_RANGE.min,
  endPort: number = PORT_RANGE.max
): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  throw new Error(`No available port found between ${startPort} and ${endPort}`);
}

/**
 * Gets the next available port after a given port
 */
export async function getNextAvailablePort(basePort: number): Promise<number> {
  let port = basePort;
  
  while (port <= PORT_RANGE.max) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  throw new Error(`No available port found after ${basePort}`);
}

/**
 * Port allocation configuration
 */
export interface PortAllocation {
  service: string;
  port: number;
  description?: string;
}

/**
 * Manages port allocations for a project
 */
export class PortManager {
  private allocations: Map<string, number> = new Map();
  private basePort: number;

  constructor(basePort: number = PORT_RANGE.min) {
    this.basePort = basePort;
  }

  /**
   * Allocates a port for a service
   */
  async allocate(service: string, preferredPort?: number): Promise<number> {
    // Check if already allocated
    if (this.allocations.has(service)) {
      return this.allocations.get(service)!;
    }

    // Try preferred port first
    if (preferredPort && await isPortAvailable(preferredPort)) {
      this.allocations.set(service, preferredPort);
      return preferredPort;
    }

    // Find next available port
    const port = await this.findNextPort();
    this.allocations.set(service, port);
    return port;
  }

  /**
   * Gets all allocations
   */
  getAllocations(): PortAllocation[] {
    return Array.from(this.allocations.entries()).map(([service, port]) => ({
      service,
      port,
    }));
  }

  /**
   * Releases a port allocation
   */
  release(service: string): void {
    this.allocations.delete(service);
  }

  /**
   * Releases all allocations
   */
  releaseAll(): void {
    this.allocations.clear();
  }

  /**
   * Finds the next available port
   */
  private async findNextPort(): Promise<number> {
    const usedPorts = new Set(this.allocations.values());
    let port = this.basePort;

    while (port <= PORT_RANGE.max) {
      if (!usedPorts.has(port) && await isPortAvailable(port)) {
        return port;
      }
      port++;
    }

    throw new Error('No available ports in range');
  }

  /**
   * Exports allocations as environment variables
   */
  toEnvVars(prefix: string = ''): Record<string, number> {
    const env: Record<string, number> = {};
    
    this.allocations.forEach((port, service) => {
      const key = prefix + service.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_PORT';
      env[key] = port;
    });
    
    return env;
  }
}

/**
 * Creates a port configuration for common services
 */
export async function createServicePortConfig(
  basePort: number = 3000,
  services: string[] = ['web', 'api', 'ws']
): Promise<Record<string, number>> {
  const portManager = new PortManager(basePort);
  const config: Record<string, number> = {};

  for (const service of services) {
    config[service] = await portManager.allocate(service);
  }

  return config;
}