/**
 * External Interface: ServiceDiscovery
 * 
 * This external interface defines the contract for discovering
 * and resolving service URLs in different environments.
 */

export interface ServiceInfo {
  name: string;
  port: number;
  host: string;
  protocol: 'http' | 'https';
  environment: string;
  status: 'healthy' | "unhealthy" | 'unknown';
  lastChecked?: string;
  metadata?: Record<string, any>;
}

export interface ServiceRegistration {
  name: string;
  port: number;
  host?: string;
  protocol?: 'http' | 'https';
  environment: string;
  healthCheckPath?: string;
  dependencies?: string[];
}

export interface ServiceQuery {
  name?: string;
  environment?: string;
  status?: 'healthy' | "unhealthy" | 'unknown';
  tags?: string[];
}

export interface ServiceHealth {
  service: string;
  healthy: boolean;
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

/**
 * External interface for service discovery and URL resolution
 */
export interface ServiceDiscovery {
  /**
   * Register a service for discovery
   */
  registerService(registration: ServiceRegistration): Promise<ServiceInfo>;
  
  /**
   * Unregister a service
   */
  unregisterService(name: string, environment: string): Promise<void>;
  
  /**
   * Discover a specific service
   */
  discoverService(name: string, environment: string): Promise<ServiceInfo | null>;
  
  /**
   * Discover all services matching query
   */
  discoverServices(query: ServiceQuery): Promise<ServiceInfo[]>;
  
  /**
   * Get service URL
   */
  getServiceUrl(name: string, environment: string): Promise<string>;
  
  /**
   * Get URLs for multiple services
   */
  getServiceUrls(services: Array<{name: string, environment: string}>): Promise<Record<string, string>>;
  
  /**
   * Check health of a service
   */
  checkServiceHealth(name: string, environment: string): Promise<ServiceHealth>;
  
  /**
   * Check health of all registered services
   */
  checkAllServicesHealth(environment?: string): Promise<ServiceHealth[]>;
  
  /**
   * Get service dependencies
   */
  getServiceDependencies(name: string, environment: string): Promise<string[]>;
  
  /**
   * Get dependent services (services that depend on this one)
   */
  getDependentServices(name: string, environment: string): Promise<string[]>;
  
  /**
   * Update service status
   */
  updateServiceStatus(name: string, environment: string, status: 'healthy' | "unhealthy" | 'unknown'): Promise<void>;
  
  /**
   * Watch for service changes
   */
  watchServices(callback: (event: "registered" | "unregistered" | 'updated', service: ServiceInfo) => void): () => void;
}