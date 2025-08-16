/**
 * DashboardAPI - RESTful API endpoints with data aggregation and caching
 */

import { Router, Request, Response } from 'express';
import winston from 'winston';
import { MetricsCollector } from '../metrics/metrics-collector';
import { LogAggregator } from '../logs/log-aggregator';
import { HealthChecker } from '../health/health-checker';
import { AlertManager } from '../alerts/alert-manager';
import { TraceCollector } from '../tracing/trace-collector';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  cached?: boolean;
  executionTime?: number;
}

export class DashboardAPI {
  private router: Router;
  private logger: winston.Logger;
  private cache: Map<string, CacheEntry> = new Map();
  private defaultCacheTTL = 30000; // 30 seconds

  constructor(
    private metricsCollector: MetricsCollector,
    private logAggregator: LogAggregator,
    private healthChecker: HealthChecker,
    private alertManager: AlertManager,
    private traceCollector: TraceCollector
  ) {
    this.router = Router();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'dashboard-api.log' })
      ]
    });

    this.setupRoutes();
    this.startCacheCleanup();
  }

  /**
   * Get Express router
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Metrics endpoints
    this.router.get('/metrics/current', this.handleWithCache(this.getCurrentMetrics.bind(this), 30000));
    this.router.get('/metrics/history', this.handleWithCache(this.getMetricHistory.bind(this), 60000));
    this.router.get('/metrics/summary', this.handleWithCache(this.getMetricsSummary.bind(this), 60000));
    this.router.post('/metrics/custom', this.recordCustomMetric.bind(this));

    // Health endpoints
    this.router.get('/health/overview', this.handleWithCache(this.getHealthOverview.bind(this), 30000));
    this.router.get('/health/services', this.handleWithCache(this.getAllServicesHealth.bind(this), 30000));
    this.router.get('/health/service/:serviceId', this.handleWithCache(this.getServiceHealth.bind(this), 30000));
    this.router.post('/health/checks', this.addHealthCheck.bind(this));
    this.router.put('/health/checks/:checkId', this.updateHealthCheck.bind(this));
    this.router.delete('/health/checks/:checkId', this.deleteHealthCheck.bind(this));

    // Logs endpoints
    this.router.get('/logs/recent', this.getRecentLogs.bind(this));
    this.router.post('/logs/search', this.searchLogs.bind(this));
    this.router.get('/logs/statistics', this.handleWithCache(this.getLogStatistics.bind(this), 60000));
    this.router.post('/logs/patterns', this.addLogPattern.bind(this));
    this.router.get('/logs/export', this.exportLogs.bind(this));

    // Alerts endpoints
    this.router.get('/alerts/active', this.getActiveAlerts.bind(this));
    this.router.get('/alerts/history', this.getAlertHistory.bind(this));
    this.router.get('/alerts/rules', this.getAlertRules.bind(this));
    this.router.post('/alerts/rules', this.createAlertRule.bind(this));
    this.router.put('/alerts/rules/:ruleId', this.updateAlertRule.bind(this));
    this.router.delete('/alerts/rules/:ruleId', this.deleteAlertRule.bind(this));
    this.router.post('/alerts/:alertId/acknowledge', this.acknowledgeAlert.bind(this));
    this.router.post('/alerts/:alertId/resolve', this.resolveAlert.bind(this));
    this.router.post('/alerts/:alertId/suppress', this.suppressAlert.bind(this));
    this.router.get('/alerts/statistics', this.handleWithCache(this.getAlertStatistics.bind(this), 60000));

    // Tracing endpoints
    this.router.get('/traces/recent', this.getRecentTraces.bind(this));
    this.router.get('/traces/:traceId', this.getTrace.bind(this));
    this.router.post('/traces/search', this.searchTraces.bind(this));
    this.router.get('/traces/:traceId/timeline', this.getTraceTimeline.bind(this));
    this.router.get('/traces/services/metrics', this.handleWithCache(this.getServiceMetrics.bind(this), 60000));
    this.router.get('/traces/dependencies', this.handleWithCache(this.getServiceDependencies.bind(this), 120000));
    this.router.get('/traces/statistics', this.handleWithCache(this.getTracingStatistics.bind(this), 60000));
    this.router.get('/traces/export', this.exportTraces.bind(this));

    // Dashboard overview endpoints
    this.router.get('/dashboard/overview', this.handleWithCache(this.getDashboardOverview.bind(this), 30000));
    this.router.get('/dashboard/status', this.getSystemStatus.bind(this));

    // Configuration endpoints
    this.router.get('/config/sampling', this.getSamplingConfig.bind(this));
    this.router.post('/config/sampling', this.setSamplingConfig.bind(this));

    // Utilities
    this.router.get('/time', this.getServerTime.bind(this));
    this.router.post('/cache/clear', this.clearCache.bind(this));
  }

  /**
   * Cache handler wrapper
   */
  private handleWithCache(handler: (req: Request, res: Response) => Promise<any>, cacheTTL?: number) {
    return async (req: Request, res: Response) => {
      const cacheKey = this.generateCacheKey(req);
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        this.sendResponse(res, { 
          success: true, 
          data: cached, 
          timestamp: Date.now(), 
          cached: true 
        });
        return;
      }

      const startTime = Date.now();
      
      try {
        const data = await handler(req, res);
        const executionTime = Date.now() - startTime;
        
        this.setCache(cacheKey, data, cacheTTL || this.defaultCacheTTL);
        
        this.sendResponse(res, { 
          success: true, 
          data, 
          timestamp: Date.now(), 
          executionTime 
        });
      } catch (error) {
        this.logger.error('API handler error:', error);
        this.sendResponse(res, { 
          success: false, 
          error: error.message, 
          timestamp: Date.now() 
        }, 500);
      }
    };
  }

  /**
   * Metrics endpoints
   */
  private async getCurrentMetrics(req: Request, res: Response): Promise<any> {
    return await this.metricsCollector.getCurrentMetrics();
  }

  private async getMetricHistory(req: Request, res: Response): Promise<any> {
    const { service, metric, duration = '1h' } = req.query as any;
    return await this.metricsCollector.getMetricHistory(service, metric, duration);
  }

  private async getMetricsSummary(req: Request, res: Response): Promise<any> {
    return this.metricsCollector.getMetricsSummary();
  }

  private async recordCustomMetric(req: Request, res: Response): Promise<void> {
    const { name, value, labels = {}, type = 'gauge' } = req.body;
    
    if (!name || value === undefined) {
      this.sendResponse(res, { 
        success: false, 
        error: 'Name and value are required', 
        timestamp: Date.now() 
      }, 400);
      return;
    }

    this.metricsCollector.recordMetric(name, value, labels, type);
    this.sendResponse(res, { 
      success: true, 
      data: { recorded: true }, 
      timestamp: Date.now() 
    });
  }

  /**
   * Health endpoints
   */
  private async getHealthOverview(req: Request, res: Response): Promise<any> {
    return await this.healthChecker.checkAllServices();
  }

  private async getAllServicesHealth(req: Request, res: Response): Promise<any> {
    const overview = await this.healthChecker.checkAllServices();
    return overview.services;
  }

  private async getServiceHealth(req: Request, res: Response): Promise<any> {
    const { serviceId } = req.params;
    return await this.healthChecker.checkService(serviceId);
  }

  private async addHealthCheck(req: Request, res: Response): Promise<void> {
    const check = req.body;
    
    if (!check.id || !check.name || !check.type) {
      this.sendResponse(res, { 
        success: false, 
        error: 'ID, name, and type are required', 
        timestamp: Date.now() 
      }, 400);
      return;
    }

    this.healthChecker.addHealthCheck(check);
    this.sendResponse(res, { 
      success: true, 
      data: { added: true }, 
      timestamp: Date.now() 
    });
  }

  private async updateHealthCheck(req: Request, res: Response): Promise<void> {
    const { checkId } = req.params;
    const updates = req.body;
    
    const success = this.healthChecker.updateHealthCheck(checkId, updates);
    
    if (success) {
      this.sendResponse(res, { 
        success: true, 
        data: { updated: true }, 
        timestamp: Date.now() 
      });
    } else {
      this.sendResponse(res, { 
        success: false, 
        error: 'Health check not found', 
        timestamp: Date.now() 
      }, 404);
    }
  }

  private async deleteHealthCheck(req: Request, res: Response): Promise<void> {
    const { checkId } = req.params;
    
    const success = this.healthChecker.removeHealthCheck(checkId);
    
    if (success) {
      this.sendResponse(res, { 
        success: true, 
        data: { deleted: true }, 
        timestamp: Date.now() 
      });
    } else {
      this.sendResponse(res, { 
        success: false, 
        error: 'Health check not found', 
        timestamp: Date.now() 
      }, 404);
    }
  }

  /**
   * Logs endpoints
   */
  private async getRecentLogs(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const logs = await this.logAggregator.getRecentLogs(query);
    this.sendResponse(res, { 
      success: true, 
      data: logs, 
      timestamp: Date.now() 
    });
  }

  private async searchLogs(req: Request, res: Response): Promise<void> {
    const searchQuery = req.body;
    const results = await this.logAggregator.searchLogs(searchQuery);
    this.sendResponse(res, { 
      success: true, 
      data: results, 
      timestamp: Date.now() 
    });
  }

  private async getLogStatistics(req: Request, res: Response): Promise<any> {
    return this.logAggregator.getStatistics();
  }

  private async addLogPattern(req: Request, res: Response): Promise<void> {
    const pattern = req.body;
    
    if (!pattern.id || !pattern.name || !pattern.pattern) {
      this.sendResponse(res, { 
        success: false, 
        error: 'ID, name, and pattern are required', 
        timestamp: Date.now() 
      }, 400);
      return;
    }

    pattern.pattern = new RegExp(pattern.pattern, pattern.flags || 'i');
    this.logAggregator.addPattern(pattern);
    
    this.sendResponse(res, { 
      success: true, 
      data: { added: true }, 
      timestamp: Date.now() 
    });
  }

  private async exportLogs(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const format = query.format || 'json';
    
    const logs = await this.logAggregator.exportLogs(query, format);
    
    res.setHeader('Content-Type', 
      format === 'csv' ? 'text/csv' : 
      format === 'txt' ? 'text/plain' : 'application/json'
    );
    res.setHeader('Content-Disposition', `attachment; filename="logs.${format}"`);
    res.send(logs);
  }

  /**
   * Alerts endpoints
   */
  private async getActiveAlerts(req: Request, res: Response): Promise<void> {
    const alerts = await this.alertManager.getActiveAlerts();
    this.sendResponse(res, { 
      success: true, 
      data: alerts, 
      timestamp: Date.now() 
    });
  }

  private async getAlertHistory(req: Request, res: Response): Promise<void> {
    // This would implement alert history retrieval
    this.sendResponse(res, { 
      success: true, 
      data: [], 
      timestamp: Date.now() 
    });
  }

  private async getAlertRules(req: Request, res: Response): Promise<void> {
    const rules = this.alertManager.getAlertRules();
    this.sendResponse(res, { 
      success: true, 
      data: rules, 
      timestamp: Date.now() 
    });
  }

  private async createAlertRule(req: Request, res: Response): Promise<void> {
    const rule = req.body;
    
    if (!rule.id || !rule.name || !rule.conditions) {
      this.sendResponse(res, { 
        success: false, 
        error: 'ID, name, and conditions are required', 
        timestamp: Date.now() 
      }, 400);
      return;
    }

    rule.createdAt = Date.now();
    rule.updatedAt = Date.now();
    
    this.alertManager.addAlertRule(rule);
    this.sendResponse(res, { 
      success: true, 
      data: { created: true }, 
      timestamp: Date.now() 
    });
  }

  private async updateAlertRule(req: Request, res: Response): Promise<void> {
    const { ruleId } = req.params;
    const updates = req.body;
    
    const success = this.alertManager.updateAlertRule(ruleId, updates);
    
    if (success) {
      this.sendResponse(res, { 
        success: true, 
        data: { updated: true }, 
        timestamp: Date.now() 
      });
    } else {
      this.sendResponse(res, { 
        success: false, 
        error: 'Alert rule not found', 
        timestamp: Date.now() 
      }, 404);
    }
  }

  private async deleteAlertRule(req: Request, res: Response): Promise<void> {
    const { ruleId } = req.params;
    
    const success = this.alertManager.deleteAlertRule(ruleId);
    
    if (success) {
      this.sendResponse(res, { 
        success: true, 
        data: { deleted: true }, 
        timestamp: Date.now() 
      });
    } else {
      this.sendResponse(res, { 
        success: false, 
        error: 'Alert rule not found', 
        timestamp: Date.now() 
      }, 404);
    }
  }

  private async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;
    
    const success = await this.alertManager.acknowledgeAlert(alertId, acknowledgedBy);
    
    if (success) {
      this.sendResponse(res, { 
        success: true, 
        data: { acknowledged: true }, 
        timestamp: Date.now() 
      });
    } else {
      this.sendResponse(res, { 
        success: false, 
        error: 'Alert not found or already acknowledged', 
        timestamp: Date.now() 
      }, 404);
    }
  }

  private async resolveAlert(req: Request, res: Response): Promise<void> {
    const { alertId } = req.params;
    const { resolvedBy } = req.body;
    
    const success = await this.alertManager.resolveAlert(alertId, resolvedBy);
    
    if (success) {
      this.sendResponse(res, { 
        success: true, 
        data: { resolved: true }, 
        timestamp: Date.now() 
      });
    } else {
      this.sendResponse(res, { 
        success: false, 
        error: 'Alert not found', 
        timestamp: Date.now() 
      }, 404);
    }
  }

  private async suppressAlert(req: Request, res: Response): Promise<void> {
    const { alertId } = req.params;
    const { durationMinutes = 60 } = req.body;
    
    const success = await this.alertManager.suppressAlert(alertId, durationMinutes);
    
    if (success) {
      this.sendResponse(res, { 
        success: true, 
        data: { suppressed: true, duration: durationMinutes }, 
        timestamp: Date.now() 
      });
    } else {
      this.sendResponse(res, { 
        success: false, 
        error: 'Alert not found', 
        timestamp: Date.now() 
      }, 404);
    }
  }

  private async getAlertStatistics(req: Request, res: Response): Promise<any> {
    return this.alertManager.getAlertStatistics();
  }

  /**
   * Tracing endpoints
   */
  private async getRecentTraces(req: Request, res: Response): Promise<void> {
    const { limit = 100 } = req.query as any;
    const traces = await this.traceCollector.getRecentTraces(Number(limit));
    this.sendResponse(res, { 
      success: true, 
      data: traces, 
      timestamp: Date.now() 
    });
  }

  private async getTrace(req: Request, res: Response): Promise<void> {
    const { traceId } = req.params;
    const trace = await this.traceCollector.getTrace(traceId);
    
    if (trace) {
      this.sendResponse(res, { 
        success: true, 
        data: trace, 
        timestamp: Date.now() 
      });
    } else {
      this.sendResponse(res, { 
        success: false, 
        error: 'Trace not found', 
        timestamp: Date.now() 
      }, 404);
    }
  }

  private async searchTraces(req: Request, res: Response): Promise<void> {
    const query = req.body;
    const results = await this.traceCollector.searchTraces(query);
    this.sendResponse(res, { 
      success: true, 
      data: results, 
      timestamp: Date.now() 
    });
  }

  private async getTraceTimeline(req: Request, res: Response): Promise<void> {
    const { traceId } = req.params;
    const timeline = this.traceCollector.getTraceTimeline(traceId);
    
    if (timeline) {
      this.sendResponse(res, { 
        success: true, 
        data: timeline, 
        timestamp: Date.now() 
      });
    } else {
      this.sendResponse(res, { 
        success: false, 
        error: 'Trace not found', 
        timestamp: Date.now() 
      }, 404);
    }
  }

  private async getServiceMetrics(req: Request, res: Response): Promise<any> {
    return this.traceCollector.getAllServiceMetrics();
  }

  private async getServiceDependencies(req: Request, res: Response): Promise<any> {
    return this.traceCollector.getDependencyGraph();
  }

  private async getTracingStatistics(req: Request, res: Response): Promise<any> {
    return this.traceCollector.getStatistics();
  }

  private async exportTraces(req: Request, res: Response): Promise<void> {
    const query = req.body || {};
    const format = req.query.format as string || 'json';
    
    const traces = this.traceCollector.exportTraces(query, format as any);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="traces.${format}"`);
    res.json(traces);
  }

  /**
   * Dashboard overview
   */
  private async getDashboardOverview(req: Request, res: Response): Promise<any> {
    const [metrics, health, alerts, traces] = await Promise.all([
      this.metricsCollector.getCurrentMetrics(),
      this.healthChecker.checkAllServices(),
      this.alertManager.getActiveAlerts(),
      this.traceCollector.getStatistics()
    ]);

    return {
      metrics: {
        system: metrics.system,
        services: Object.keys(metrics.applications).length,
        customMetrics: Object.keys(metrics.custom).length
      },
      health: {
        overall: health.overall,
        summary: health.summary
      },
      alerts: {
        active: alerts.length,
        critical: alerts.filter(a => a.severity === "critical").length
      },
      traces: {
        total: traces.totalTraces,
        services: traces.services,
        errorRate: traces.errorRate
      },
      timestamp: Date.now()
    };
  }

  /**
   * System status
   */
  private async getSystemStatus(req: Request, res: Response): Promise<void> {
    const status = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      timestamp: Date.now()
    };

    this.sendResponse(res, { 
      success: true, 
      data: status, 
      timestamp: Date.now() 
    });
  }

  /**
   * Configuration endpoints
   */
  private async getSamplingConfig(req: Request, res: Response): Promise<void> {
    // This would get sampling configuration
    this.sendResponse(res, { 
      success: true, 
      data: { samplingRate: 1.0, adaptiveSampling: true }, 
      timestamp: Date.now() 
    });
  }

  private async setSamplingConfig(req: Request, res: Response): Promise<void> {
    const { samplingRate } = req.body;
    
    if (samplingRate !== undefined) {
      this.traceCollector.setSamplingRate(samplingRate);
    }

    this.sendResponse(res, { 
      success: true, 
      data: { updated: true }, 
      timestamp: Date.now() 
    });
  }

  /**
   * Utility endpoints
   */
  private async getServerTime(req: Request, res: Response): Promise<void> {
    this.sendResponse(res, { 
      success: true, 
      data: { 
        timestamp: Date.now(),
        iso: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }, 
      timestamp: Date.now() 
    });
  }

  private async clearCache(req: Request, res: Response): Promise<void> {
    this.cache.clear();
    this.sendResponse(res, { 
      success: true, 
      data: { cleared: true }, 
      timestamp: Date.now() 
    });
  }

  /**
   * Cache management
   */
  private generateCacheKey(req: Request): string {
    return `${req.method}:${req.path}:${JSON.stringify(req.query)}:${JSON.stringify(req.body)}`;
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.timestamp + entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  /**
   * Send standardized response
   */
  private sendResponse(res: Response, response: APIResponse, status: number = 200): void {
    res.status(status).json(response);
  }
}