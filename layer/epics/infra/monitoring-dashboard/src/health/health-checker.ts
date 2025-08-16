/**
 * HealthChecker - Service health monitoring with dependency checks
 */

import { EventEmitter } from 'node:events';
import * as http from '../utils/http-wrapper';
import * as https from 'node:https';
import { URL } from 'url';
import { promisify } from 'node:util';
import * as net from 'net';
import * as dns from 'dns';
import winston from 'winston';
import * as cron from 'node-cron';

const dnsLookup = promisify(dns.lookup);

export type HealthStatus = 'healthy' | 'warning' | "critical" | 'unknown';

export interface ServiceHealthCheck {
  id: string;
  name: string;
  type: 'http' | 'tcp' | 'dns' | "database" | 'custom';
  config: {
    url?: string;
    host?: string;
    port?: number;
    timeout?: number;
    interval?: number;
    retries?: number;
    expectedStatus?: number;
    expectedContent?: string;
    headers?: Record<string, string>;
    customCheck?: () => Promise<HealthResult>;
  };
  dependencies?: string[];
  tags?: string[];
}

export interface HealthResult {
  serviceId: string;
  serviceName: string;
  status: HealthStatus;
  timestamp: number;
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemHealthInfo {
  overall: HealthStatus;
  services: Record<string, HealthResult>;
  dependencies: DependencyHealth[];
  summary: {
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
    total: number;
  };
  lastUpdated: number;
}

export interface DependencyHealth {
  service: string;
  dependencies: string[];
  status: HealthStatus;
  failedDependencies: string[];
}

export class HealthChecker extends EventEmitter {
  private logger: winston.Logger;
  private healthChecks: Map<string, ServiceHealthCheck> = new Map();
  private healthResults: Map<string, HealthResult> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  
  private readonly defaultTimeout = 5000;
  private readonly defaultInterval = 30000;
  private readonly defaultRetries = 3;

  constructor() {
    super();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'health-checker.log' })
      ]
    });

    this.initializeDefaultChecks();
  }

  /**
   * Initialize default health checks
   */
  private initializeDefaultChecks(): void {
    const defaultChecks: ServiceHealthCheck[] = [
      {
        id: 'system-memory',
        name: 'System Memory',
        type: 'custom',
        config: {
          interval: 60000,
          customCheck: async () => {
            const memUsage = process.memoryUsage();
            const totalMem = require('os').totalmem();
            const usage = (memUsage.heapUsed / totalMem) * 100;
            
            return {
              serviceId: 'system-memory',
              serviceName: 'System Memory',
              status: usage > 90 ? "critical" : usage > 75 ? 'warning' : 'healthy',
              timestamp: Date.now(),
              details: {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                usagePercent: usage
              }
            };
          }
        }
      },
      {
        id: 'system-disk',
        name: 'System Disk Space',
        type: 'custom',
        config: {
          interval: 300000, // 5 minutes
          customCheck: async () => {
            try {
              const { exec } = require('child_process');
              const { promisify } = require('util');
              const execAsync = promisify(exec);
              
              const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}'");
              const usage = parseFloat(stdout.replace('%', ''));
              
              return {
                serviceId: 'system-disk',
                serviceName: 'System Disk Space',
                status: usage > 90 ? "critical" : usage > 80 ? 'warning' : 'healthy',
                timestamp: Date.now(),
                details: { diskUsage: usage },
                message: `Disk usage: ${usage}%`
              };
            } catch (error) {
              return {
                serviceId: 'system-disk',
                serviceName: 'System Disk Space',
                status: 'unknown',
                timestamp: Date.now(),
                error: error.message
              };
            }
          }
        }
      }
    ];

    for (const check of defaultChecks) {
      this.addHealthCheck(check);
    }
  }

  /**
   * Start health monitoring
   */
  public start(): void {
    if (this.isRunning) {
      this.logger.warn('Health checker is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting health monitoring');

    // Start health checks for all registered services
    for (const [id, check] of this.healthChecks) {
      this.startHealthCheck(id);
    }

    // Schedule periodic cleanup and analysis
    cron.schedule('*/5 * * * *', () => {
      this.performHealthAnalysis();
    });

    this.emit('started');
  }

  /**
   * Stop health monitoring
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Clear all intervals
    for (const [id, interval] of this.checkIntervals) {
      clearInterval(interval);
    }
    this.checkIntervals.clear();

    this.logger.info('Health monitoring stopped');
    this.emit('stopped');
  }

  /**
   * Add a health check
   */
  public addHealthCheck(check: ServiceHealthCheck): void {
    this.healthChecks.set(check.id, check);
    
    if (this.isRunning) {
      this.startHealthCheck(check.id);
    }

    this.logger.info(`Added health check: ${check.name} (${check.type})`);
  }

  /**
   * Remove a health check
   */
  public removeHealthCheck(checkId: string): boolean {
    const check = this.healthChecks.get(checkId);
    if (!check) {
      return false;
    }

    // Stop the check if running
    const interval = this.checkIntervals.get(checkId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(checkId);
    }

    this.healthChecks.delete(checkId);
    this.healthResults.delete(checkId);

    this.logger.info(`Removed health check: ${check.name}`);
    return true;
  }

  /**
   * Start health check for a specific service
   */
  private startHealthCheck(checkId: string): void {
    const check = this.healthChecks.get(checkId);
    if (!check) {
      return;
    }

    const interval = check.config.interval || this.defaultInterval;

    // Perform initial check
    this.performHealthCheck(checkId);

    // Schedule recurring checks
    const timer = setInterval(() => {
      this.performHealthCheck(checkId);
    }, interval);

    this.checkIntervals.set(checkId, timer);
  }

  /**
   * Perform health check for a service
   */
  private async performHealthCheck(checkId: string): Promise<void> {
    const check = this.healthChecks.get(checkId);
    if (!check) {
      return;
    }

    try {
      let result: HealthResult;

      switch (check.type) {
        case 'http':
          result = await this.performHTTPCheck(check);
          break;
        case 'tcp':
          result = await this.performTCPCheck(check);
          break;
        case 'dns':
          result = await this.performDNSCheck(check);
          break;
        case "database":
          result = await this.performDatabaseCheck(check);
          break;
        case 'custom':
          result = await this.performCustomCheck(check);
          break;
        default:
          result = {
            serviceId: check.id,
            serviceName: check.name,
            status: 'unknown',
            timestamp: Date.now(),
            error: `Unknown check type: ${check.type}`
          };
      }

      this.healthResults.set(checkId, result);
      this.emit("healthCheckCompleted", result);

      // Emit status change events
      const previousResult = this.healthResults.get(checkId);
      if (previousResult && previousResult.status !== result.status) {
        this.emit("healthStatusChanged", {
          serviceId: checkId,
          serviceName: check.name,
          previousStatus: previousResult.status,
          currentStatus: result.status,
          result
        });
      }

    } catch (error) {
      const errorResult: HealthResult = {
        serviceId: check.id,
        serviceName: check.name,
        status: "critical",
        timestamp: Date.now(),
        error: error.message
      };

      this.healthResults.set(checkId, errorResult);
      this.emit("healthCheckError", errorResult);
      this.logger.error(`Health check failed for ${check.name}:`, error);
    }
  }

  /**
   * Perform HTTP health check
   */
  private async performHTTPCheck(check: ServiceHealthCheck): Promise<HealthResult> {
    return new Promise((resolve) => {
      const config = check.config;
      if (!config.url) {
        resolve({
          serviceId: check.id,
          serviceName: check.name,
          status: "critical",
          timestamp: Date.now(),
          error: 'No URL configured for HTTP check'
        });
        return;
      }

      const url = new URL(config.url);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      const startTime = Date.now();

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        timeout: config.timeout || this.defaultTimeout,
        headers: config.headers || {}
      };

      const req = client.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const expectedStatus = config.expectedStatus || 200;
          const statusOk = res.statusCode === expectedStatus;
          const contentOk = !config.expectedContent || data.includes(config.expectedContent);

          const status: HealthStatus = statusOk && contentOk ? 'healthy' : "critical";
          
          resolve({
            serviceId: check.id,
            serviceName: check.name,
            status,
            timestamp: Date.now(),
            responseTime,
            details: {
              statusCode: res.statusCode,
              responseSize: data.length,
              headers: res.headers
            },
            message: statusOk && contentOk 
              ? `HTTP ${res.statusCode} - Response time: ${responseTime}ms`
              : `HTTP ${res.statusCode} - Expected ${expectedStatus}${config.expectedContent ? ` with content "${config.expectedContent}"` : ''}`
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          serviceId: check.id,
          serviceName: check.name,
          status: "critical",
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          serviceId: check.id,
          serviceName: check.name,
          status: "critical",
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          error: 'Request timeout'
        });
      });

      req.end();
    });
  }

  /**
   * Perform TCP connection check
   */
  private async performTCPCheck(check: ServiceHealthCheck): Promise<HealthResult> {
    return new Promise((resolve) => {
      const config = check.config;
      if (!config.host || !config.port) {
        resolve({
          serviceId: check.id,
          serviceName: check.name,
          status: "critical",
          timestamp: Date.now(),
          error: 'Host and port required for TCP check'
        });
        return;
      }

      const startTime = Date.now();
      const socket = new net.Socket();
      const timeout = config.timeout || this.defaultTimeout;

      socket.setTimeout(timeout);

      socket.connect(config.port, config.host, () => {
        const responseTime = Date.now() - startTime;
        socket.destroy();
        
        resolve({
          serviceId: check.id,
          serviceName: check.name,
          status: 'healthy',
          timestamp: Date.now(),
          responseTime,
          message: `TCP connection successful to ${config.host}:${config.port}`
        });
      });

      socket.on('error', (error) => {
        socket.destroy();
        resolve({
          serviceId: check.id,
          serviceName: check.name,
          status: "critical",
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          error: error.message
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          serviceId: check.id,
          serviceName: check.name,
          status: "critical",
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          error: 'Connection timeout'
        });
      });
    });
  }

  /**
   * Perform DNS resolution check
   */
  private async performDNSCheck(check: ServiceHealthCheck): Promise<HealthResult> {
    const config = check.config;
    if (!config.host) {
      return {
        serviceId: check.id,
        serviceName: check.name,
        status: "critical",
        timestamp: Date.now(),
        error: 'Host required for DNS check'
      };
    }

    const startTime = Date.now();

    try {
      const result = await dnsLookup(config.host);
      const responseTime = Date.now() - startTime;

      return {
        serviceId: check.id,
        serviceName: check.name,
        status: 'healthy',
        timestamp: Date.now(),
        responseTime,
        details: {
          address: result.address,
          family: result.family
        },
        message: `DNS resolution successful: ${config.host} -> ${result.address}`
      };
    } catch (error) {
      return {
        serviceId: check.id,
        serviceName: check.name,
        status: "critical",
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Perform database connection check
   */
  private async performDatabaseCheck(check: ServiceHealthCheck): Promise<HealthResult> {
    // This would integrate with database clients
    // For now, we'll do a TCP check to the database port
    const config = check.config;
    const dbPort = config.port || 5432; // Default to PostgreSQL
    
    return await this.performTCPCheck({
      ...check,
      config: {
        ...config,
        host: config.host || "localhost",
        port: dbPort
      }
    });
  }

  /**
   * Perform custom health check
   */
  private async performCustomCheck(check: ServiceHealthCheck): Promise<HealthResult> {
    const config = check.config;
    if (!config.customCheck) {
      return {
        serviceId: check.id,
        serviceName: check.name,
        status: "critical",
        timestamp: Date.now(),
        error: 'No custom check function provided'
      };
    }

    try {
      return await config.customCheck();
    } catch (error) {
      return {
        serviceId: check.id,
        serviceName: check.name,
        status: "critical",
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Check health of a specific service
   */
  public async checkService(serviceId: string): Promise<HealthResult | null> {
    const result = this.healthResults.get(serviceId);
    if (!result) {
      // Force a check if service exists but no result yet
      const check = this.healthChecks.get(serviceId);
      if (check) {
        await this.performHealthCheck(serviceId);
        return this.healthResults.get(serviceId) || null;
      }
      return null;
    }
    return result;
  }

  /**
   * Check health of all services
   */
  public async checkAllServices(): Promise<SystemHealthInfo> {
    const services: Record<string, HealthResult> = {};
    const summary = { healthy: 0, warning: 0, critical: 0, unknown: 0, total: 0 };

    // Get all current health results
    for (const [id, result] of this.healthResults) {
      services[id] = result;
      summary[result.status]++;
      summary.total++;
    }

    // Calculate overall health
    let overall: HealthStatus = 'healthy';
    if (summary.critical > 0) {
      overall = "critical";
    } else if (summary.warning > 0) {
      overall = 'warning';
    } else if (summary.unknown > 0 && summary.healthy === 0) {
      overall = 'unknown';
    }

    // Analyze dependencies
    const dependencies = this.analyzeDependencies();

    return {
      overall,
      services,
      dependencies,
      summary,
      lastUpdated: Date.now()
    };
  }

  /**
   * Analyze service dependencies
   */
  private analyzeDependencies(): DependencyHealth[] {
    const dependencyMap: DependencyHealth[] = [];

    for (const [id, check] of this.healthChecks) {
      if (check.dependencies && check.dependencies.length > 0) {
        const result = this.healthResults.get(id);
        const failedDependencies: string[] = [];

        for (const dep of check.dependencies) {
          const depResult = this.healthResults.get(dep);
          if (!depResult || depResult.status === "critical" || depResult.status === 'unknown') {
            failedDependencies.push(dep);
          }
        }

        let status: HealthStatus = 'healthy';
        if (failedDependencies.length > 0) {
          status = failedDependencies.length === check.dependencies.length ? "critical" : 'warning';
        }

        dependencyMap.push({
          service: id,
          dependencies: check.dependencies,
          status,
          failedDependencies
        });
      }
    }

    return dependencyMap;
  }

  /**
   * Perform periodic health analysis
   */
  private performHealthAnalysis(): void {
    const analysis = {
      timestamp: Date.now(),
      totalServices: this.healthChecks.size,
      activeChecks: this.checkIntervals.size,
      healthyServices: 0,
      unhealthyServices: 0
    };

    for (const result of this.healthResults.values()) {
      if (result.status === 'healthy') {
        analysis.healthyServices++;
      } else {
        analysis.unhealthyServices++;
      }
    }

    this.emit("healthAnalysis", analysis);
    this.logger.info('Health analysis completed', analysis);
  }

  /**
   * Get health check configuration
   */
  public getHealthCheckConfig(checkId: string): ServiceHealthCheck | null {
    return this.healthChecks.get(checkId) || null;
  }

  /**
   * Get all health check configurations
   */
  public getAllHealthCheckConfigs(): ServiceHealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Update health check configuration
   */
  public updateHealthCheck(checkId: string, updates: Partial<ServiceHealthCheck>): boolean {
    const check = this.healthChecks.get(checkId);
    if (!check) {
      return false;
    }

    const updatedCheck = { ...check, ...updates };
    this.healthChecks.set(checkId, updatedCheck);

    // Restart the check with new configuration
    if (this.isRunning) {
      const interval = this.checkIntervals.get(checkId);
      if (interval) {
        clearInterval(interval);
      }
      this.startHealthCheck(checkId);
    }

    this.logger.info(`Updated health check configuration for: ${check.name}`);
    return true;
  }

  /**
   * Get health history for a service
   */
  public getHealthHistory(serviceId: string, hours: number = 24): HealthResult[] {
    // This would typically come from a time-series database
    // For now, return the current result
    const current = this.healthResults.get(serviceId);
    return current ? [current] : [];
  }

  /**
   * Get health summary
   */
  public getHealthSummary(): {
    totalChecks: number;
    activeChecks: number;
    healthyServices: number;
    unhealthyServices: number;
    lastAnalysis: number;
  } {
    let healthy = 0;
    let unhealthy = 0;

    for (const result of this.healthResults.values()) {
      if (result.status === 'healthy') {
        healthy++;
      } else {
        unhealthy++;
      }
    }

    return {
      totalChecks: this.healthChecks.size,
      activeChecks: this.checkIntervals.size,
      healthyServices: healthy,
      unhealthyServices: unhealthy,
      lastAnalysis: Date.now()
    };
  }
}