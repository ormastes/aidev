/**
 * Dashboard Service Implementation
 * Core orchestration service for the log analysis dashboard
 */

import * as os from 'os';
import * as process from 'process';
import type {
  IDashboardService,
  DashboardConfig,
  HealthStatus,
  DashboardError
} from './interfaces';

export class DashboardService implements IDashboardService {
  private config: DashboardConfig | null = null;
  private isInitialized = false;
  private isShutdown = false;
  private startTime: Date | null = null;

  async initialize(config: DashboardConfig): Promise<void> {
    if (this.isShutdown) {
      // Allow reinitialization after shutdown
      this.isShutdown = false;
    }

    this.validateConfig(config);
    
    this.config = { ...config };
    this.isInitialized = true;
    this.startTime = new Date();

    // Initialize subsystems (placeholder for future implementation)
    await this.initializeSubsystems();
  }

  async getHealth(): Promise<HealthStatus> {
    if (this.isShutdown) {
      throw new Error('Service has been shut down');
    }

    const now = new Date();
    const metrics = await this.getSystemMetrics();
    
    let status: HealthStatus['status'] = 'unhealthy';
    let services = {
      logService: false,
      streaming: false,
      database: false
    };

    if (this.isInitialized) {
      status = 'healthy';
      services = {
        logService: true, // Will be updated when log service integration is implemented
        streaming: this.config?.enableStreaming ?? false,
        database: true // Placeholder - will be updated with actual database checks
      };

      // Determine overall status based on service states
      const allServicesHealthy = Object.values(services).every(service => service);
      if (!allServicesHealthy) {
        status = 'degraded';
      }
    }

    return {
      status,
      timestamp: now,
      services,
      metrics
    };
  }

  async updateConfig(updates: Partial<DashboardConfig>): Promise<void> {
    if (this.isShutdown) {
      throw new Error('Service has been shut down');
    }

    if (!this.isInitialized) {
      throw new Error('Service must be initialized before updating configuration');
    }

    // Prevent changes to critical configuration after initialization
    if ('port' in updates) {
      throw new Error('Cannot change port after initialization');
    }

    if ('host' in updates) {
      throw new Error('Cannot change host after initialization');
    }

    // Validate the updates
    const newConfig = { ...this.config!, ...updates };
    this.validateConfig(newConfig);

    // Apply updates
    this.config = newConfig;

    // Apply runtime configuration changes
    await this.applyConfigurationChanges(updates);
  }

  async shutdown(): Promise<void> {
    if (this.isShutdown) {
      return; // Already shut down
    }

    // Graceful shutdown of subsystems
    await this.shutdownSubsystems();
    
    this.isInitialized = false;
    this.isShutdown = true;
    this.config = null;
    this.startTime = null;
  }

  private validateConfig(config: DashboardConfig): void {
    if (!config.port || config.port <= 0 || config.port > 65535) {
      throw new Error('Invalid port number');
    }

    if (!config.host || config.host.trim() === '') {
      throw new Error('Host cannot be empty');
    }

    if (config.refreshInterval <= 0) {
      throw new Error('Refresh interval must be positive');
    }

    if (config.maxQueryLimit <= 0) {
      throw new Error('Max query limit must be positive');
    }

    if (config.streamingBufferSize < 0) {
      throw new Error('Streaming buffer size must be non-negative');
    }

    if (!['light', 'dark'].includes(config.theme)) {
      throw new Error('Theme must be either "light" or "dark"');
    }

    if (!Array.isArray(config.exportFormats) || config.exportFormats.length === 0) {
      throw new Error('Export formats must be a non-empty array');
    }
  }

  private async initializeSubsystems(): Promise<void> {
    // Placeholder for subsystem initialization
    // This will include:
    // - Log service connection
    // - Streaming service setup
    // - Database initialization
    // - HTTP server setup (handled in external layer)
  }

  private async shutdownSubsystems(): Promise<void> {
    // Placeholder for graceful subsystem shutdown
    // This will include:
    // - Closing active connections
    // - Stopping background tasks
    // - Cleaning up resources
  }

  private async applyConfigurationChanges(updates: Partial<DashboardConfig>): Promise<void> {
    // Handle dynamic configuration changes
    if ('enableStreaming' in updates) {
      // Update streaming service state
    }

    if ('refreshInterval' in updates) {
      // Update refresh timers
    }

    if ('theme' in updates) {
      // Update theme settings
    }
  }

  private async getSystemMetrics(): Promise<HealthStatus['metrics']> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    // Get CPU usage (simplified calculation)
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      Object.values(cpu.times).forEach(time => totalTick += time);
      totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = Math.max(0, Math.min(100, 100 - (totalIdle / totalTick) * 100));

    // Calculate memory usage percentage
    const memUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;

    // Simplified disk usage (placeholder)
    const diskUsage = 45; // This would be calculated from actual disk usage

    return {
      activeStreams: 0, // Will be updated when streaming service is implemented
      memoryUsage: Math.round(memUsagePercent * 100) / 100,
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      diskUsage: diskUsage
    };
  }
}