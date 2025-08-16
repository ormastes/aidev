/**
 * Rate Limit Monitor Service
 * Tracks and monitors API rate limiting across all endpoints
 */

import { EventEmitter } from 'node:events';
import { ExternalLogService } from './ExternalLogService';

export interface RateLimitEvent {
  timestamp: Date;
  endpoint: string;
  method: string;
  clientId: string;
  ip: string;
  remaining: number;
  limit: number;
  windowMs: number;
  blocked: boolean;
  statusCode: number;
}

export interface RateLimitStats {
  endpoint: string;
  totalRequests: number;
  blockedRequests: number;
  uniqueClients: number;
  averageUsage: number;
  peakUsage: number;
  timeWindow: {
    start: Date;
    end: Date;
  };
}

export interface RateLimitConfig {
  endpoint: string;
  limit: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface ClientUsage {
  clientId: string;
  ip: string;
  endpoints: Map<string, {
    requests: number;
    blocked: number;
    lastAccess: Date;
  }>;
  totalRequests: number;
  totalBlocked: number;
}

export class RateLimitMonitorService extends EventEmitter {
  private logger: ExternalLogService;
  private events: RateLimitEvent[] = [];
  private stats: Map<string, RateLimitStats> = new Map();
  private clientUsage: Map<string, ClientUsage> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();
  private maxEventsRetained: number = 10000;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = new ExternalLogService();
    this.startCleanupTimer();
    this.startMetricsCollection();
  }

  /**
   * Record a rate limit event
   */
  recordEvent(event: Omit<RateLimitEvent, "timestamp">): void {
    const fullEvent: RateLimitEvent = {
      ...event,
      timestamp: new Date()
    };

    // Add to events history
    this.events.push(fullEvent);
    if (this.events.length > this.maxEventsRetained) {
      this.events.shift();
    }

    // Update statistics
    this.updateStats(fullEvent);
    this.updateClientUsage(fullEvent);

    // Emit event for real-time monitoring
    this.emit('rate-limit-event', fullEvent);

    // Log if blocked
    if (fullEvent.blocked) {
      this.logger.warn('Rate limit exceeded', {
        endpoint: fullEvent.endpoint,
        clientId: fullEvent.clientId,
        ip: fullEvent.ip
      });
      this.emit('rate-limit-exceeded', fullEvent);
    }
  }

  /**
   * Update endpoint statistics
   */
  private updateStats(event: RateLimitEvent): void {
    const key = `${event.method}:${event.endpoint}`;
    let stats = this.stats.get(key);

    if (!stats) {
      stats = {
        endpoint: event.endpoint,
        totalRequests: 0,
        blockedRequests: 0,
        uniqueClients: 0,
        averageUsage: 0,
        peakUsage: 0,
        timeWindow: {
          start: event.timestamp,
          end: event.timestamp
        }
      };
      this.stats.set(key, stats);
    }

    stats.totalRequests++;
    if (event.blocked) {
      stats.blockedRequests++;
    }

    // Calculate usage percentage
    const usage = ((event.limit - event.remaining) / event.limit) * 100;
    stats.averageUsage = (stats.averageUsage * (stats.totalRequests - 1) + usage) / stats.totalRequests;
    stats.peakUsage = Math.max(stats.peakUsage, usage);
    stats.timeWindow.end = event.timestamp;
  }

  /**
   * Update client usage tracking
   */
  private updateClientUsage(event: RateLimitEvent): void {
    let client = this.clientUsage.get(event.clientId);

    if (!client) {
      client = {
        clientId: event.clientId,
        ip: event.ip,
        endpoints: new Map(),
        totalRequests: 0,
        totalBlocked: 0
      };
      this.clientUsage.set(event.clientId, client);
    }

    // Update endpoint-specific usage
    const endpointKey = `${event.method}:${event.endpoint}`;
    let endpointUsage = client.endpoints.get(endpointKey);
    
    if (!endpointUsage) {
      endpointUsage = {
        requests: 0,
        blocked: 0,
        lastAccess: event.timestamp
      };
      client.endpoints.set(endpointKey, endpointUsage);
    }

    endpointUsage.requests++;
    if (event.blocked) {
      endpointUsage.blocked++;
    }
    endpointUsage.lastAccess = event.timestamp;

    // Update totals
    client.totalRequests++;
    if (event.blocked) {
      client.totalBlocked++;
    }
  }

  /**
   * Register rate limit configuration
   */
  registerConfig(config: RateLimitConfig): void {
    this.configs.set(config.endpoint, config);
    this.logger.info('Rate limit config registered', {
      endpoint: config.endpoint,
      limit: config.limit,
      windowMs: config.windowMs
    });
  }

  /**
   * Get current statistics
   */
  getStats(endpoint?: string): RateLimitStats[] {
    if (endpoint) {
      const stats = this.stats.get(endpoint);
      return stats ? [stats] : [];
    }
    return Array.from(this.stats.values());
  }

  /**
   * Get client usage information
   */
  getClientUsage(clientId?: string): ClientUsage[] {
    if (clientId) {
      const usage = this.clientUsage.get(clientId);
      return usage ? [usage] : [];
    }
    return Array.from(this.clientUsage.values());
  }

  /**
   * Get top offenders (clients with most blocked requests)
   */
  getTopOffenders(limit: number = 10): ClientUsage[] {
    return Array.from(this.clientUsage.values())
      .sort((a, b) => b.totalBlocked - a.totalBlocked)
      .slice(0, limit);
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): RateLimitEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by time range
   */
  getEventsByTimeRange(start: Date, end: Date): RateLimitEvent[] {
    return this.events.filter(event => 
      event.timestamp >= start && event.timestamp <= end
    );
  }

  /**
   * Get current configuration
   */
  getConfigs(): RateLimitConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(endpoint: string, updates: Partial<RateLimitConfig>): boolean {
    const config = this.configs.get(endpoint);
    if (!config) {
      return false;
    }

    Object.assign(config, updates);
    this.emit('config-updated', { endpoint, config });
    
    this.logger.info('Rate limit config updated', {
      endpoint,
      updates
    });

    return true;
  }

  /**
   * Reset statistics for an endpoint
   */
  resetStats(endpoint?: string): void {
    if (endpoint) {
      this.stats.delete(endpoint);
    } else {
      this.stats.clear();
    }
    this.emit('stats-reset', { endpoint });
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): {
    totalRequests: number;
    totalBlocked: number;
    blockRate: number;
    uniqueClients: number;
    activeEndpoints: number;
    topEndpoints: Array<{ endpoint: string; requests: number }>;
  } {
    let totalRequests = 0;
    let totalBlocked = 0;
    const endpointRequests: Map<string, number> = new Map();

    for (const stats of this.stats.values()) {
      totalRequests += stats.totalRequests;
      totalBlocked += stats.blockedRequests;
      endpointRequests.set(
        stats.endpoint,
        (endpointRequests.get(stats.endpoint) || 0) + stats.totalRequests
      );
    }

    const topEndpoints = Array.from(endpointRequests.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([endpoint, requests]) => ({ endpoint, requests }));

    return {
      totalRequests,
      totalBlocked,
      blockRate: totalRequests > 0 ? (totalBlocked / totalRequests) * 100 : 0,
      uniqueClients: this.clientUsage.size,
      activeEndpoints: this.stats.size,
      topEndpoints
    };
  }

  /**
   * Export data for analysis
   */
  exportData(): {
    events: RateLimitEvent[];
    stats: RateLimitStats[];
    clientUsage: ClientUsage[];
    configs: RateLimitConfig[];
    metrics: ReturnType<typeof this.getAggregatedMetrics>;
  } {
    return {
      events: this.events,
      stats: this.getStats(),
      clientUsage: this.getClientUsage(),
      configs: this.getConfigs(),
      metrics: this.getAggregatedMetrics()
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      
      // Clean old events
      this.events = this.events.filter(event => 
        event.timestamp > oneHourAgo
      );

      // Clean inactive clients
      for (const [clientId, usage] of this.clientUsage.entries()) {
        let hasRecentActivity = false;
        for (const endpoint of usage.endpoints.values()) {
          if (endpoint.lastAccess > oneHourAgo) {
            hasRecentActivity = true;
            break;
          }
        }
        if (!hasRecentActivity) {
          this.clientUsage.delete(clientId);
        }
      }
    }, 300000); // Run every 5 minutes
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getAggregatedMetrics();
      this.emit('metrics-collected', metrics);
      
      // Log high block rate warning
      if (metrics.blockRate > 10) {
        this.logger.warn('High rate limit block rate detected', {
          blockRate: metrics.blockRate,
          totalBlocked: metrics.totalBlocked
        });
      }
    }, 60000); // Collect every minute
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const rateLimitMonitor = new RateLimitMonitorService();