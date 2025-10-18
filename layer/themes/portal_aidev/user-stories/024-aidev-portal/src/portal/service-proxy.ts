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

      // Make actual HTTP request to the service
      const fullUrl = `${serviceUrl}${request.url}`;

      const response = await fetch(fullUrl, {
        method: request.method,
        headers: forwardedHeaders,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: AbortSignal.timeout(this.timeout)
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      return {
        success: response.ok,
        statusCode: response.status,
        headers: responseHeaders,
        body: responseBody
      };

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

      // Call service health endpoint
      const healthUrl = `${serviceUrl}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      });

      return response.ok;
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