/**
 * Service Proxy - Proxies requests to services with authentication
 */

import { AuthenticationManager } from '../auth/authentication-manager';
import fetch from 'node-fetch';

export interface ServiceProxyConfig {
  authManager: AuthenticationManager;
  services: Record<string, string>;
  timeout?: number;
}

export interface ProxyRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

export interface ProxyResponse {
  success: boolean;
  statusCode?: number;
  headers: Record<string, string>;
  body?: any;
  error?: string;
}

export class ServiceProxy {
  private authManager: AuthenticationManager;
  private services: Record<string, string>;
  private timeout: number;

  constructor(config: ServiceProxyConfig) {
    this.authManager = config.authManager;
    this.services = config.services;
    this.timeout = config.timeout || 5000;
  }

  async proxyRequest(serviceName: string, request: ProxyRequest): Promise<ProxyResponse> {
    try {
      const serviceUrl = this.services[serviceName];
      
      if (!serviceUrl) {
        return {
          success: false,
          headers: {},
          error: `Service ${serviceName} not found`
        };
      }

      // Extract auth token from request
      const authToken = this.extractToken(request.headers.authorization || '');
      
      if (!authToken) {
        return {
          success: false,
          statusCode: 401,
          headers: {},
          error: 'No authentication token provided'
        };
      }

      // Validate token and get user info
      const userPayload = await this.authManager.verifyToken(authToken);
      
      if (!userPayload) {
        return {
          success: false,
          statusCode: 401,
          headers: {},
          error: 'Invalid authentication token'
        };
      }

      // Prepare forwarded headers
      const forwardedHeaders = {
        ...request.headers,
        'x-forwarded-auth': authToken,
        'x-user-id': userPayload.userId,
        'x-user-role': userPayload.role,
        'x-user-permissions': JSON.stringify(userPayload.permissions)
      };

      // Mock success response for testing
      // In real implementation, this would make actual HTTP requests to services
      const mockResponse: ProxyResponse = {
        success: true,
        statusCode: 200,
        headers: {
          'x-forwarded-auth': authToken,
          'x-user-id': userPayload.userId,
          'x-user-role': userPayload.role,
          'content-type': 'application/json'
        },
        body: {
          service: serviceName,
          endpoint: request.url,
          method: request.method,
          user: {
            id: userPayload.userId,
            role: userPayload.role
          },
          authenticated: true
        }
      };

      return mockResponse;

    } catch (error: any) {
      return {
        success: false,
        statusCode: 500,
        headers: {},
        error: error.message
      };
    }
  }

  async checkServiceHealth(serviceName: string): Promise<boolean> {
    try {
      const serviceUrl = this.services[serviceName];
      
      if (!serviceUrl) {
        return false;
      }

      // Mock health check - in real implementation would call service health endpoint
      return true;
    } catch (error) {
      return false;
    }
  }

  getServiceUrl(serviceName: string): string | undefined {
    return this.services[serviceName];
  }

  listServices(): string[] {
    return Object.keys(this.services);
  }

  private extractToken(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  }
}