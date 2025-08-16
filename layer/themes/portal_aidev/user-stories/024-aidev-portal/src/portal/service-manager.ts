/**
 * Portal Service Manager - Manages service interactions from the portal
 */

import fetch from 'node-fetch';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { AuthenticationManager } from '../auth/authentication-manager';

export interface ServiceConfig {
  id: string;
  name: string;
  url: string;
  healthEndpoint: string;
  version: string;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface ServiceDiscoveryOptions {
  tags?: string[];
}

export interface OperationResult {
  success: boolean;
  serviceId?: string;
  error?: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  uptime?: number;
  version?: string;
  lastCheck?: string;
  error?: string;
}

export interface PortalServiceManagerConfig {
  registryUrl: string;
  authManager: AuthenticationManager;
  timeout?: number;
}

export class PortalServiceManager extends EventEmitter {
  private registryUrl: string;
  private authManager: AuthenticationManager;
  private authToken: string = '';
  private timeout: number;

  constructor(config: PortalServiceManagerConfig) {
    super();
    this.registryUrl = config.registryUrl;
    this.authManager = config.authManager;
    this.timeout = config.timeout || 5000;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  async registerService(config: ServiceConfig): Promise<OperationResult> {
    try {
      // Validate configuration
      if (!config.id || !config.name || !config.url) {
        return {
          success: false,
          error: 'invalid service configuration'
        };
      }

      // Validate URL format
      try {
        new URL(config.url);
      } catch {
        return {
          success: false,
          error: 'invalid service configuration: invalid URL'
        };
      }

      const response = await fetch(`${this.registryUrl}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(config),
        timeout: this.timeout
      });

      if (response.status === 401) {
        return {
          success: false,
          error: 'authentication required'
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'invalid token'
        };
      }

      if (response.status === 409) {
        return {
          success: false,
          error: 'service already registered'
        };
      }

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'registration failed'
        };
      }

      const result = await response.json();
      return {
        success: true,
        serviceId: result.serviceId
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'registry unavailable'
        };
      }
      return {
        success: false,
        error: error.message
      };
    }
  }

  async discoverServices(options?: ServiceDiscoveryOptions): Promise<ServiceConfig[]> {
    try {
      const response = await fetch(`${this.registryUrl}/services`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        timeout: this.timeout
      });

      if (!response.ok) {
        return [];
      }

      const services = await response.json();

      // Filter by tags if specified
      if (options?.tags && options.tags.length > 0) {
        return services.filter((service: ServiceConfig) => 
          options.tags!.some(tag => service.tags.includes(tag))
        );
      }

      return services;
    } catch (error) {
      console.error('Service discovery failed:', error);
      return [];
    }
  }

  async updateService(serviceId: string, updates: Partial<ServiceConfig>): Promise<OperationResult> {
    try {
      const response = await fetch(`${this.registryUrl}/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(updates),
        timeout: this.timeout
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'update failed'
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deregisterService(serviceId: string): Promise<OperationResult> {
    try {
      const response = await fetch(`${this.registryUrl}/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        timeout: this.timeout
      });

      if (response.status === 404) {
        return {
          success: false,
          error: 'service not found'
        };
      }

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'deregistration failed'
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getServiceHealth(serviceId: string): Promise<ServiceHealth> {
    try {
      const response = await fetch(`${this.registryUrl}/services/${serviceId}/health`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        timeout: this.timeout
      });

      if (response.status === 404) {
        return {
          status: 'unknown',
          error: 'service not found'
        };
      }

      if (!response.ok) {
        return {
          status: 'unknown',
          error: 'health check failed'
        };
      }

      return await response.json();
    } catch (error: any) {
      return {
        status: 'unknown',
        error: error.message
      };
    }
  }
}