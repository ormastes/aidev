/**
 * HTTP/Axios Wrapper with External Logging
 * Maintains same interface as axios but adds logging
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from '../utils/http-wrapper';
import * as http from '../utils/http-wrapper';
import * as https from 'node:https';
import { ExternalLogLib } from '../user-stories/001-basic-log-capture/src/external/external-log-lib';

class AxiosWrapper {
  private logger: ExternalLogLib;
  private instance: AxiosInstance;

  constructor(config?: AxiosRequestConfig) {
    this.logger = new ExternalLogLib({
      appName: 'axios-wrapper',
      logLevel: 'info',
      transports: ['file'],
      logDir: './logs'
    });

    this.instance = axios.create(config);
    this.setupInterceptors();
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    // Remove sensitive headers from logs
    const sensitiveHeaders = ["authorization", 'cookie', 'x-api-key', 'x-auth-token', 'api-key', 'access-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
      // Check case-insensitive
      const key = Object.keys(sanitized).find(k => k.toLowerCase() === header.toLowerCase());
      if (key && sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove password from URL if present
      if (urlObj.password) {
        urlObj.password: "PLACEHOLDER";
      }
      // Remove sensitive query params
      const sensitiveParams = ['token', 'api_key', 'access_token', 'secret'];
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        const requestId = Math.random().toString(36).substring(7);
        config.metadata = { startTime: Date.now(), requestId };
        
        this.logger.log('info', 'HTTP Request Started', {
          requestId,
          method: config.method?.toUpperCase(),
          url: this.sanitizeUrl(config.url || ''),
          baseURL: config.baseURL,
          headers: this.sanitizeHeaders(config.headers),
          params: config.params,
          timeout: config.timeout,
          timestamp: new Date().toISOString()
        });
        
        return config;
      },
      (error) => {
        this.logger.log('error', 'HTTP Request Setup Failed', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        const requestId = response.config.metadata?.requestId;
        
        this.logger.log('info', 'HTTP Response Received', {
          requestId,
          method: response.config.method?.toUpperCase(),
          url: this.sanitizeUrl(response.config.url || ''),
          status: response.status,
          statusText: response.statusText,
          duration,
          headers: this.sanitizeHeaders(response.headers),
          dataSize: JSON.stringify(response.data).length,
          timestamp: new Date().toISOString()
        });
        
        return response;
      },
      (error: AxiosError) => {
        const duration = Date.now() - (error.config?.metadata?.startTime || 0);
        const requestId = error.config?.metadata?.requestId;
        
        this.logger.log('error', 'HTTP Request Failed', {
          requestId,
          method: error.config?.method?.toUpperCase(),
          url: this.sanitizeUrl(error.config?.url || ''),
          status: error.response?.status,
          statusText: error.response?.statusText,
          error: error.message,
          code: error.code,
          duration,
          responseData: error.response?.data,
          timestamp: new Date().toISOString()
        });
        
        return Promise.reject(error);
      }
    );
  }

  // Axios compatible methods
  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.request<T>(config);
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  async head<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.head<T>(url, config);
  }

  async options<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.options<T>(url, config);
  }

  // Create new instance
  create(config?: AxiosRequestConfig): AxiosWrapper {
    return new AxiosWrapper(config);
  }

  // Access to interceptors
  get interceptors() {
    return this.instance.interceptors;
  }

  // Access to defaults
  get defaults() {
    return this.instance.defaults;
  }
}

// Node.js http/https wrappers
class HttpWrapper {
  private logger: ExternalLogLib;
  
  constructor() {
    this.logger = new ExternalLogLib({
      appName: 'http-wrapper',
      logLevel: 'info',
      transports: ['file'],
      logDir: './logs'
    });
  }

  private logRequest(protocol: string, options: any, requestId: string): void {
    this.logger.log('info', `${protocol} Request Started`, {
      requestId,
      method: options.method || 'GET',
      hostname: options.hostname || options.host,
      port: options.port,
      path: options.path || '/',
      headers: this.sanitizeHeaders(options.headers || {}),
      timestamp: new Date().toISOString()
    });
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    ["authorization", 'cookie', 'x-api-key'].forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });
    return sanitized;
  }

  // HTTP request wrapper
  request(options: http.RequestOptions | string | URL, callback?: (res: http.IncomingMessage) => void): http.ClientRequest {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    
    this.logRequest('HTTP', options, requestId);
    
    const req = http.request(options, (res) => {
      const duration = Date.now() - startTime;
      
      this.logger.log('info', 'HTTP Response Received', {
        requestId,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: this.sanitizeHeaders(res.headers),
        duration,
        timestamp: new Date().toISOString()
      });
      
      if (callback) callback(res);
    });
    
    req.on('error', (error) => {
      this.logger.log('error', 'HTTP Request Error', {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    });
    
    return req;
  }

  // HTTPS request wrapper
  httpsRequest(options: https.RequestOptions | string | URL, callback?: (res: http.IncomingMessage) => void): http.ClientRequest {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    
    this.logRequest('HTTPS', options, requestId);
    
    const req = https.request(options, (res) => {
      const duration = Date.now() - startTime;
      
      this.logger.log('info', 'HTTPS Response Received', {
        requestId,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: this.sanitizeHeaders(res.headers),
        duration,
        timestamp: new Date().toISOString()
      });
      
      if (callback) callback(res);
    });
    
    req.on('error', (error) => {
      this.logger.log('error', 'HTTPS Request Error', {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    });
    
    return req;
  }

  // Convenience methods
  get(url: string | URL, options?: http.RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest {
    const protocol = typeof url === 'string' ? (url.startsWith('https:') ? 'https' : 'http') : url.protocol;
    
    if (protocol === 'https:') {
      return this.httpsRequest(url, callback);
    } else {
      return this.request(url, callback);
    }
  }
}

// Create singleton instances
const axiosWrapper = new AxiosWrapper();
const httpWrapper = new HttpWrapper();

// Export axios-compatible interface
export default axiosWrapper;
export const create = (config?: AxiosRequestConfig) => new AxiosWrapper(config);

// Export http/https wrappers
export const httpRequest = httpWrapper.request.bind(httpWrapper);
export const httpsRequest = httpWrapper.httpsRequest.bind(httpWrapper);
export const get = httpWrapper.get.bind(httpWrapper);

// Re-export axios types
export * from 'axios';