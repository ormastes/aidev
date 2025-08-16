/**
 * PortAllocator External Interface
 * 
 * Defines the contract for the port allocation system.
 * This interface manages port assignment for different environments and services.
 */

export interface PortRange {
  start: number;
  end: number;
}

export interface PortAllocation {
  port: number;
  service: string;
  environment: string;
  allocatedAt: Date;
}

export interface EnvironmentPortConfig {
  type: 'theme' | 'epic' | 'demo' | 'release' | 'test';
  basePort: number;
  serviceRange: PortRange;
}

export interface PortAllocator {
  /**
   * Allocate ports for a new environment
   * Returns the base port and available service port range
   */
  allocatePortsForEnvironment(
    environmentName: string,
    environmentType: EnvironmentPortConfig['type']
  ): Promise<{
    portal: number;
    services: PortRange;
  }>;
  
  /**
   * Allocate a specific port for a service within an environment
   */
  allocateServicePort(
    environmentName: string,
    serviceName: string
  ): Promise<number>;
  
  /**
   * Release all ports allocated to an environment
   */
  releaseEnvironmentPorts(environmentName: string): Promise<boolean>;
  
  /**
   * Release a specific port
   */
  releasePort(port: number): Promise<boolean>;
  
  /**
   * Check if a port is available
   */
  isPortAvailable(port: number): Promise<boolean>;
  
  /**
   * Get all ports allocated to an environment
   */
  getEnvironmentPorts(environmentName: string): Promise<PortAllocation[]>;
  
  /**
   * Get the next available port in a range
   */
  getNextAvailablePort(range: PortRange): Promise<number | null>;
  
  /**
   * Get all used ports across all environments
   */
  getAllUsedPorts(): Promise<PortAllocation[]>;
  
  /**
   * Get port configuration for an environment type
   */
  getPortConfigForType(type: EnvironmentPortConfig['type']): EnvironmentPortConfig;
  
  /**
   * Reserve a specific port (for manual allocation)
   */
  reservePort(
    port: number,
    environmentName: string,
    serviceName: string
  ): Promise<boolean>;
  
  /**
   * Validate if a port is within the allowed range for an environment type
   */
  validatePortForEnvironment(
    port: number,
    environmentType: EnvironmentPortConfig['type']
  ): boolean;
  
  /**
   * Get a summary of port usage by environment type
   */
  getPortUsageSummary(): Promise<{
    [key in EnvironmentPortConfig['type']]: {
      total: number;
      used: number;
      available: number;
    };
  }>;
}