/**
 * Health Check Service
 * Monitors system health, dependencies, and provides diagnostic endpoints
 */

import { DatabaseService } from './DatabaseService';
import { ExternalLogService } from './ExternalLogService';
import { os } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { execSync } from 'child_process';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy"
}

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message?: string;
  responseTime?: number;
  details?: Record<string, any>;
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  checks: HealthCheck[];
  system: SystemMetrics;
  version: string;
  environment: string;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    connections: number;
    interfaces: string[];
  };
}

export interface DependencyCheck {
  name: string;
  type: "database" | 'service' | 'api' | 'file' | 'network';
  check: () => Promise<HealthCheck>;
  critical?: boolean;
}

export class HealthCheckService {
  private dbService: DatabaseService;
  private logger: ExternalLogService;
  private startTime: Date;
  private dependencies: Map<string, DependencyCheck>;
  private healthHistory: HealthCheck[];
  private maxHistorySize: number = 100;
  private cacheDuration: number = 5000; // 5 seconds
  private lastCheck: SystemHealth | null = null;
  private lastCheckTime: number = 0;

  constructor() {
    this.dbService = new DatabaseService();
    this.logger = new ExternalLogService();
    this.startTime = new Date();
    this.dependencies = new Map();
    this.healthHistory = [];
    this.initializeDefaultChecks();
  }

  /**
   * Initialize default health checks
   */
  private initializeDefaultChecks(): void {
    // Database check
    this.registerDependency({
      name: "database",
      type: "database",
      critical: true,
      check: async () => {
        const start = Date.now();
        try {
          await this.dbService.get('SELECT 1');
          return {
            name: "database",
            status: HealthStatus.HEALTHY,
            responseTime: Date.now() - start,
            message: 'Database connection is healthy'
          };
        } catch (error: any) {
          return {
            name: "database",
            status: HealthStatus.UNHEALTHY,
            responseTime: Date.now() - start,
            message: `Database error: ${error.message}`
          };
        }
      }
    });

    // Session storage check
    this.registerDependency({
      name: 'session_storage',
      type: "database",
      critical: false,
      check: async () => {
        const start = Date.now();
        try {
          const count = await this.dbService.get(
            'SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime("now")'
          );
          return {
            name: 'session_storage',
            status: HealthStatus.HEALTHY,
            responseTime: Date.now() - start,
            message: 'Session storage is healthy',
            details: { activeSessions: count?.count || 0 }
          };
        } catch (error: any) {
          return {
            name: 'session_storage',
            status: HealthStatus.DEGRADED,
            responseTime: Date.now() - start,
            message: `Session storage warning: ${error.message}`
          };
        }
      }
    });

    // Disk space check
    this.registerDependency({
      name: 'disk_space',
      type: 'file',
      critical: false,
      check: async () => {
        const metrics = await this.getDiskMetrics();
        const status = metrics.percentage > 90 
          ? HealthStatus.UNHEALTHY 
          : metrics.percentage > 75 
            ? HealthStatus.DEGRADED 
            : HealthStatus.HEALTHY;
        
        return {
          name: 'disk_space',
          status,
          message: `Disk usage: ${metrics.percentage.toFixed(1)}%`,
          details: metrics
        };
      }
    });

    // Memory check
    this.registerDependency({
      name: 'memory',
      type: 'service',
      critical: false,
      check: async () => {
        const metrics = this.getMemoryMetrics();
        const status = metrics.percentage > 90 
          ? HealthStatus.UNHEALTHY 
          : metrics.percentage > 75 
            ? HealthStatus.DEGRADED 
            : HealthStatus.HEALTHY;
        
        return {
          name: 'memory',
          status,
          message: `Memory usage: ${metrics.percentage.toFixed(1)}%`,
          details: metrics
        };
      }
    });

    // CPU check
    this.registerDependency({
      name: 'cpu',
      type: 'service',
      critical: false,
      check: async () => {
        const metrics = await this.getCPUMetrics();
        const status = metrics.usage > 90 
          ? HealthStatus.UNHEALTHY 
          : metrics.usage > 75 
            ? HealthStatus.DEGRADED 
            : HealthStatus.HEALTHY;
        
        return {
          name: 'cpu',
          status,
          message: `CPU usage: ${metrics.usage.toFixed(1)}%`,
          details: metrics
        };
      }
    });
  }

  /**
   * Register a dependency check
   */
  registerDependency(dependency: DependencyCheck): void {
    this.dependencies.set(dependency.name, dependency);
    this.logger.info(`Registered health check: ${dependency.name}`);
  }

  /**
   * Unregister a dependency check
   */
  unregisterDependency(name: string): void {
    this.dependencies.delete(name);
    this.logger.info(`Unregistered health check: ${name}`);
  }

  /**
   * Perform full health check
   */
  async checkHealth(useCache: boolean = true): Promise<SystemHealth> {
    // Return cached result if available and fresh
    if (useCache && this.lastCheck && (Date.now() - this.lastCheckTime) < this.cacheDuration) {
      return this.lastCheck;
    }

    const checks: HealthCheck[] = [];
    let overallStatus = HealthStatus.HEALTHY;

    // Run all dependency checks
    for (const [name, dependency] of this.dependencies) {
      try {
        const check = await dependency.check();
        checks.push(check);

        // Update overall status
        if (check.status === HealthStatus.UNHEALTHY) {
          if (dependency.critical) {
            overallStatus = HealthStatus.UNHEALTHY;
          } else if (overallStatus !== HealthStatus.UNHEALTHY) {
            overallStatus = HealthStatus.DEGRADED;
          }
        } else if (check.status === HealthStatus.DEGRADED && overallStatus === HealthStatus.HEALTHY) {
          overallStatus = HealthStatus.DEGRADED;
        }

        // Add to history
        this.addToHistory(check);
      } catch (error: any) {
        const errorCheck: HealthCheck = {
          name,
          status: HealthStatus.UNHEALTHY,
          message: `Check failed: ${error.message}`
        };
        checks.push(errorCheck);
        if (dependency.critical) {
          overallStatus = HealthStatus.UNHEALTHY;
        }
      }
    }

    // Get system metrics
    const systemMetrics = await this.getSystemMetrics();

    const health: SystemHealth = {
      status: overallStatus,
      timestamp: new Date(),
      uptime: this.getUptime(),
      checks,
      system: systemMetrics,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || "development"
    };

    // Cache the result
    this.lastCheck = health;
    this.lastCheckTime = Date.now();

    // Log health status
    this.logger.info(`Health check completed: ${overallStatus}`);

    return health;
  }

  /**
   * Get simple health status (for load balancers)
   */
  async getSimpleHealth(): Promise<{ status: string; code: number }> {
    const health = await this.checkHealth();
    
    switch (health.status) {
      case HealthStatus.HEALTHY:
        return { status: 'OK', code: 200 };
      case HealthStatus.DEGRADED:
        return { status: "DEGRADED", code: 200 };
      case HealthStatus.UNHEALTHY:
        return { status: "UNHEALTHY", code: 503 };
      default:
        return { status: 'UNKNOWN', code: 503 };
    }
  }

  /**
   * Get liveness check (is the service alive?)
   */
  async getLiveness(): Promise<{ alive: boolean; uptime: number }> {
    return {
      alive: true,
      uptime: this.getUptime()
    };
  }

  /**
   * Get readiness check (is the service ready to handle requests?)
   */
  async getReadiness(): Promise<{ ready: boolean; checks: string[] }> {
    const health = await this.checkHealth();
    const failedChecks = health.checks
      .filter(c => c.status === HealthStatus.UNHEALTHY)
      .map(c => c.name);

    // Check critical dependencies
    const criticalFailed = failedChecks.some(name => {
      const dep = this.dependencies.get(name);
      return dep?.critical;
    });

    return {
      ready: !criticalFailed,
      checks: failedChecks
    };
  }

  /**
   * Get health history
   */
  getHealthHistory(): HealthCheck[] {
    return [...this.healthHistory];
  }

  /**
   * Get health statistics
   */
  getHealthStatistics(): {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    unhealthyChecks: number;
    averageResponseTime: number;
    uptime: number;
    uptimePercentage: number;
  } {
    const stats = {
      totalChecks: this.healthHistory.length,
      healthyChecks: 0,
      degradedChecks: 0,
      unhealthyChecks: 0,
      totalResponseTime: 0,
      responseTimeCount: 0
    };

    for (const check of this.healthHistory) {
      switch (check.status) {
        case HealthStatus.HEALTHY:
          stats.healthyChecks++;
          break;
        case HealthStatus.DEGRADED:
          stats.degradedChecks++;
          break;
        case HealthStatus.UNHEALTHY:
          stats.unhealthyChecks++;
          break;
      }

      if (check.responseTime) {
        stats.totalResponseTime += check.responseTime;
        stats.responseTimeCount++;
      }
    }

    const uptime = this.getUptime();
    const uptimePercentage = stats.totalChecks > 0
      ? (stats.healthyChecks / stats.totalChecks) * 100
      : 100;

    return {
      totalChecks: stats.totalChecks,
      healthyChecks: stats.healthyChecks,
      degradedChecks: stats.degradedChecks,
      unhealthyChecks: stats.unhealthyChecks,
      averageResponseTime: stats.responseTimeCount > 0
        ? stats.totalResponseTime / stats.responseTimeCount
        : 0,
      uptime,
      uptimePercentage
    };
  }

  /**
   * Get specific dependency health
   */
  async checkDependency(name: string): Promise<HealthCheck | null> {
    const dependency = this.dependencies.get(name);
    if (!dependency) {
      return null;
    }

    try {
      return await dependency.check();
    } catch (error: any) {
      return {
        name,
        status: HealthStatus.UNHEALTHY,
        message: `Check failed: ${error.message}`
      };
    }
  }

  /**
   * Get all registered dependencies
   */
  getDependencies(): string[] {
    return Array.from(this.dependencies.keys());
  }

  /**
   * Reset health history
   */
  resetHistory(): void {
    this.healthHistory = [];
    this.logger.info('Health history reset');
  }

  /**
   * Helper: Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const [cpu, memory, disk, network] = await Promise.all([
      this.getCPUMetrics(),
      Promise.resolve(this.getMemoryMetrics()),
      this.getDiskMetrics(),
      Promise.resolve(this.getNetworkMetrics())
    ]);

    return { cpu, memory, disk, network };
  }

  /**
   * Helper: Get CPU metrics
   */
  private async getCPUMetrics(): Promise<SystemMetrics['cpu']> {
    const cpus = os.cpus();
    const loadAverage = os.loadavg();

    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }

    const usage = 100 - ~~(100 * totalIdle / totalTick);

    return {
      usage,
      cores: cpus.length,
      loadAverage
    };
  }

  /**
   * Helper: Get memory metrics
   */
  private getMemoryMetrics(): SystemMetrics['memory'] {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percentage = (used / total) * 100;

    return {
      total,
      used,
      free,
      percentage
    };
  }

  /**
   * Helper: Get disk metrics
   */
  private async getDiskMetrics(): Promise<SystemMetrics['disk']> {
    try {
      // Get disk usage for current directory
      const diskPath = process.cwd();
      
      if (process.platform === 'win32') {
        // Windows: Use wmic command
        const output = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8' });
        // Parse Windows output
        const lines = output.trim().split('\n').slice(1);
        let total = 0;
        let free = 0;
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3 && parts[1] && parts[2]) {
            free += parseInt(parts[1]) || 0;
            total += parseInt(parts[2]) || 0;
          }
        }
        
        const used = total - free;
        const percentage = total > 0 ? (used / total) * 100 : 0;
        
        return { total, used, free, percentage };
      } else {
        // Unix-like: Use df command
        const output = execSync(`df -k "${diskPath}" | tail -1`, { encoding: 'utf8' });
        const parts = output.trim().split(/\s+/);
        
        const total = parseInt(parts[1]) * 1024;
        const used = parseInt(parts[2]) * 1024;
        const free = parseInt(parts[3]) * 1024;
        const percentage = parseFloat(parts[4]);
        
        return { total, used, free, percentage };
      }
    } catch (error) {
      // Fallback to basic metrics
      return {
        total: 0,
        used: 0,
        free: 0,
        percentage: 0
      };
    }
  }

  /**
   * Helper: Get network metrics
   */
  private getNetworkMetrics(): SystemMetrics['network'] {
    const interfaces = os.networkInterfaces();
    const interfaceNames = Object.keys(interfaces);
    
    // Count active connections (simplified)
    let connections = 0;
    for (const name of interfaceNames) {
      const iface = interfaces[name];
      if (iface) {
        connections += iface.filter(addr => !addr.internal).length;
      }
    }

    return {
      connections,
      interfaces: interfaceNames
    };
  }

  /**
   * Helper: Get uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Helper: Add check to history
   */
  private addToHistory(check: HealthCheck): void {
    this.healthHistory.push({
      ...check,
      timestamp: new Date() as any
    });

    // Trim history if needed
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Express middleware for health endpoints
   */
  middleware() {
    return async (req: any, res: any, next: any) => {
      const path = req.path;

      // Health check endpoint
      if (path === '/health') {
        const health = await this.checkHealth();
        const statusCode = health.status === HealthStatus.UNHEALTHY ? 503 : 200;
        return res.status(statusCode).json(health);
      }

      // Simple health endpoint (for load balancers)
      if (path === '/health/status') {
        const { status, code } = await this.getSimpleHealth();
        return res.status(code).send(status);
      }

      // Liveness probe
      if (path === '/health/live') {
        const liveness = await this.getLiveness();
        return res.status(200).json(liveness);
      }

      // Readiness probe
      if (path === '/health/ready') {
        const readiness = await this.getReadiness();
        const statusCode = readiness.ready ? 200 : 503;
        return res.status(statusCode).json(readiness);
      }

      // Health statistics
      if (path === '/health/stats') {
        const stats = this.getHealthStatistics();
        return res.status(200).json(stats);
      }

      // Health history
      if (path === '/health/history') {
        const history = this.getHealthHistory();
        return res.status(200).json(history);
      }

      // Specific dependency check
      if (path.startsWith('/health/dependency/')) {
        const depName = path.substring('/health/dependency/'.length);
        const check = await this.checkDependency(depName);
        if (check) {
          const statusCode = check.status === HealthStatus.UNHEALTHY ? 503 : 200;
          return res.status(statusCode).json(check);
        } else {
          return res.status(404).json({ error: 'Dependency not found' });
        }
      }

      next();
    };
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();