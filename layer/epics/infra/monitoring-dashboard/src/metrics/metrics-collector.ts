import { fileAPI } from '../utils/file-api';
/**
 * MetricsCollector - System and application metrics collection with time-series storage
 */

import { EventEmitter } from 'node:events';
import { promisify } from 'node:util';
import * as os from 'os';
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { exec } from 'child_process';
import winston from 'winston';

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

export interface ApplicationMetrics {
  timestamp: number;
  service: string;
  requests: {
    total: number;
    rate: number;
    errors: number;
    errorRate: number;
  };
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  resources: {
    cpu: number;
    memory: number;
    handles: number;
  };
}

export interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  labels: Record<string, string>;
  type: 'counter' | 'gauge' | "histogram" | 'summary';
}

export interface MetricQuery {
  service?: string;
  metric?: string;
  startTime: number;
  endTime: number;
  step?: number;
}

export class MetricsCollector extends EventEmitter {
  private logger: winston.Logger;
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: Map<string, ApplicationMetrics[]> = new Map();
  private customMetrics: Map<string, CustomMetric[]> = new Map();
  private collectionInterval: NodeJS.Timeout | null = null;
  private isCollecting = false;
  
  private maxRetentionTime = 24 * 60 * 60 * 1000; // 24 hours
  private maxDataPoints = 8640; // 10-second intervals for 24 hours
  
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

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
        new winston.transports.File({ filename: 'metrics-collector.log' })
      ]
    });
  }

  /**
   * Start metrics collection
   */
  public startCollection(intervalMs: number = 10000): void {
    if (this.isCollecting) {
      this.logger.warn('Metrics collection is already running');
      return;
    }

    this.isCollecting = true;
    this.logger.info(`Starting metrics collection with ${intervalMs}ms interval`);

    this.collectionInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.collectApplicationMetrics();
        this.cleanupOldData();
        this.emit("metricsUpdated", await this.getCurrentMetrics());
      } catch (error) {
        this.logger.error('Error during metrics collection:', error);
      }
    }, intervalMs);

    // Initial collection
    this.collectSystemMetrics().catch(error => 
      this.logger.error('Error during initial system metrics collection:', error)
    );
  }

  /**
   * Stop metrics collection
   */
  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
    this.logger.info('Metrics collection stopped');
  }

  /**
   * Collect system-level metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    const timestamp = Date.now();
    
    try {
      const metrics: SystemMetrics = {
        timestamp,
        cpu: await this.getCPUMetrics(),
        memory: this.getMemoryMetrics(),
        disk: await this.getDiskMetrics(),
        network: await this.getNetworkMetrics()
      };

      this.systemMetrics.push(metrics);
      this.trimArray(this.systemMetrics, this.maxDataPoints);
      
      this.emit("systemMetricsCollected", metrics);
    } catch (error) {
      this.logger.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Get CPU usage metrics
   */
  private async getCPUMetrics(): Promise<SystemMetrics['cpu']> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime.bigint();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime.bigint();
        const elapsedTime = Number(endTime - startTime) / 1e9;
        
        const totalUsage = (endUsage.user + endUsage.system) / 1e6;
        const usage = (totalUsage / elapsedTime / os.cpus().length) * 100;
        
        resolve({
          usage: Math.round(usage * 100) / 100,
          loadAverage: os.loadavg(),
          cores: os.cpus().length
        });
      }, 100);
    });
  }

  /**
   * Get memory usage metrics
   */
  private getMemoryMetrics(): SystemMetrics['memory'] {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    return {
      total,
      used,
      free,
      usage: Math.round(usage * 100) / 100
    };
  }

  /**
   * Get disk usage metrics
   */
  private async getDiskMetrics(): Promise<SystemMetrics['disk']> {
    try {
      const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'");
      const [totalStr, usedStr, freeStr, usageStr] = stdout.trim().split(' ');
      
      const parseSize = (sizeStr: string): number => {
        const size = parseFloat(sizeStr);
        if (sizeStr.includes('G')) return size * 1024 * 1024 * 1024;
        if (sizeStr.includes('M')) return size * 1024 * 1024;
        if (sizeStr.includes('K')) return size * 1024;
        return size;
      };

      return {
        total: parseSize(totalStr),
        used: parseSize(usedStr),
        free: parseSize(freeStr),
        usage: parseFloat(usageStr.replace('%', ''))
      };
    } catch (error) {
      this.logger.error('Error getting disk metrics:', error);
      return { total: 0, used: 0, free: 0, usage: 0 };
    }
  }

  /**
   * Get network I/O metrics
   */
  private async getNetworkMetrics(): Promise<SystemMetrics['network']> {
    try {
      if (process.platform === 'linux') {
        const data = await readFileAsync('/proc/net/dev', 'utf8');
        const lines = data.split('\n').slice(2);
        let bytesIn = 0, bytesOut = 0, packetsIn = 0, packetsOut = 0;

        for (const line of lines) {
          if (line.trim()) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 10 && !parts[0].startsWith('lo:')) {
              bytesIn += parseInt(parts[1]) || 0;
              packetsIn += parseInt(parts[2]) || 0;
              bytesOut += parseInt(parts[9]) || 0;
              packetsOut += parseInt(parts[10]) || 0;
            }
          }
        }

        return { bytesIn, bytesOut, packetsIn, packetsOut };
      } else {
        // Fallback for non-Linux systems
        return { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 };
      }
    } catch (error) {
      this.logger.error('Error getting network metrics:', error);
      return { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 };
    }
  }

  /**
   * Collect application-specific metrics
   */
  private async collectApplicationMetrics(): Promise<void> {
    const services = this.getRegisteredServices();
    
    for (const service of services) {
      try {
        const metrics = await this.collectServiceMetrics(service);
        if (metrics) {
          const serviceMetrics = this.applicationMetrics.get(service) || [];
          serviceMetrics.push(metrics);
          this.trimArray(serviceMetrics, this.maxDataPoints);
          this.applicationMetrics.set(service, serviceMetrics);
          
          this.emit("applicationMetricsCollected", metrics);
        }
      } catch (error) {
        this.logger.error(`Error collecting metrics for service ${service}:`, error);
      }
    }
  }

  /**
   * Collect metrics for a specific service
   */
  private async collectServiceMetrics(service: string): Promise<ApplicationMetrics | null> {
    // This would integrate with your service discovery/registry
    // For now, we'll simulate with process metrics
    const timestamp = Date.now();
    const memUsage = process.memoryUsage();

    return {
      timestamp,
      service,
      requests: {
        total: this.counters.get(`${service}_requests_total`) || 0,
        rate: this.calculateRate(`${service}_requests_total`),
        errors: this.counters.get(`${service}_errors_total`) || 0,
        errorRate: this.calculateErrorRate(service)
      },
      responseTime: {
        avg: this.calculateAverage(`${service}_response_time`),
        p50: this.calculatePercentile(`${service}_response_time`, 50),
        p95: this.calculatePercentile(`${service}_response_time`, 95),
        p99: this.calculatePercentile(`${service}_response_time`, 99)
      },
      resources: {
        cpu: await this.getServiceCPU(service),
        memory: memUsage.heapUsed,
        handles: (process as any)._getActiveHandles?.()?.length || 0
      }
    };
  }

  /**
   * Get registered services
   */
  private getRegisteredServices(): string[] {
    // This would come from your service registry
    return ['api-gateway', 'auth-service', 'user-service', 'order-service'];
  }

  /**
   * Calculate request rate
   */
  private calculateRate(metricName: string): number {
    const current = this.counters.get(metricName) || 0;
    const previous = this.counters.get(`${metricName}_previous`) || 0;
    this.counters.set(`${metricName}_previous`, current);
    return current - previous;
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(service: string): number {
    const errors = this.counters.get(`${service}_errors_total`) || 0;
    const total = this.counters.get(`${service}_requests_total`) || 1;
    return (errors / total) * 100;
  }

  /**
   * Get service CPU usage
   */
  private async getServiceCPU(service: string): Promise<number> {
    // This would use process monitoring tools or service-specific APIs
    // For now, return a simulated value
    return Math.random() * 100;
  }

  /**
   * Calculate average from histogram data
   */
  private calculateAverage(metricName: string): number {
    const values = this.histograms.get(metricName) || [];
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate percentile from histogram data
   */
  private calculatePercentile(metricName: string, percentile: number): number {
    const values = this.histograms.get(metricName) || [];
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Record a custom metric
   */
  public recordMetric(name: string, value: number, labels: Record<string, string> = {}, type: CustomMetric['type'] = 'gauge'): void {
    const metric: CustomMetric = {
      name,
      value,
      timestamp: Date.now(),
      labels,
      type
    };

    const metrics = this.customMetrics.get(name) || [];
    metrics.push(metric);
    this.trimArray(metrics, this.maxDataPoints);
    this.customMetrics.set(name, metrics);

    // Update internal counters/gauges
    switch (type) {
      case 'counter':
        this.counters.set(name, (this.counters.get(name) || 0) + value);
        break;
      case 'gauge':
        this.gauges.set(name, value);
        break;
      case "histogram":
        const histValues = this.histograms.get(name) || [];
        histValues.push(value);
        this.trimArray(histValues, 1000); // Keep last 1000 values
        this.histograms.set(name, histValues);
        break;
    }

    this.emit("customMetricRecorded", metric);
  }

  /**
   * Get current aggregated metrics
   */
  public async getCurrentMetrics(): Promise<{
    system: SystemMetrics | null;
    applications: Record<string, ApplicationMetrics | null>;
    custom: Record<string, CustomMetric | null>;
  }> {
    const latestSystem = this.systemMetrics[this.systemMetrics.length - 1] || null;
    
    const applications: Record<string, ApplicationMetrics | null> = {};
    for (const [service, metrics] of this.applicationMetrics) {
      applications[service] = metrics[metrics.length - 1] || null;
    }

    const custom: Record<string, CustomMetric | null> = {};
    for (const [name, metrics] of this.customMetrics) {
      custom[name] = metrics[metrics.length - 1] || null;
    }

    return {
      system: latestSystem,
      applications,
      custom
    };
  }

  /**
   * Get metric history
   */
  public async getMetricHistory(service: string, metric: string, duration: string): Promise<any[]> {
    const now = Date.now();
    const durationMs = this.parseDuration(duration);
    const startTime = now - durationMs;

    if (service === 'system') {
      return this.systemMetrics.filter(m => m.timestamp >= startTime);
    } else if (this.applicationMetrics.has(service)) {
      return this.applicationMetrics.get(service)!.filter(m => m.timestamp >= startTime);
    } else if (this.customMetrics.has(metric)) {
      return this.customMetrics.get(metric)!.filter(m => m.timestamp >= startTime);
    }

    return [];
  }

  /**
   * Get aggregated metrics for time range
   */
  public getAggregatedMetrics(query: MetricQuery): any {
    // Implementation for aggregated metrics queries
    const { service, metric, startTime, endTime, step = 60000 } = query;
    
    // This would implement proper aggregation logic
    // For now, return a simplified response
    return {
      query,
      result: [],
      timestamp: Date.now()
    };
  }

  /**
   * Parse duration string (e.g., "1h", "30m", "5s")
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // Default to 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600000;
    }
  }

  /**
   * Trim array to maximum size
   */
  private trimArray<T>(array: T[], maxSize: number): void {
    while (array.length > maxSize) {
      array.shift();
    }
  }

  /**
   * Clean up old data beyond retention time
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.maxRetentionTime;

    // Clean system metrics
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);

    // Clean application metrics
    for (const [service, metrics] of this.applicationMetrics) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.applicationMetrics.set(service, filtered);
    }

    // Clean custom metrics
    for (const [name, metrics] of this.customMetrics) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.customMetrics.set(name, filtered);
    }
  }

  /**
   * Get metrics summary
   */
  public getMetricsSummary(): {
    systemMetricsCount: number;
    applicationMetricsCount: number;
    customMetricsCount: number;
    services: string[];
    customMetricNames: string[];
  } {
    return {
      systemMetricsCount: this.systemMetrics.length,
      applicationMetricsCount: Array.from(this.applicationMetrics.values())
        .reduce((sum, metrics) => sum + metrics.length, 0),
      customMetricsCount: Array.from(this.customMetrics.values())
        .reduce((sum, metrics) => sum + metrics.length, 0),
      services: Array.from(this.applicationMetrics.keys()),
      customMetricNames: Array.from(this.customMetrics.keys())
    };
  }
}