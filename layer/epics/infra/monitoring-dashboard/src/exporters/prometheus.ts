/**
 * Prometheus Exporter - Export metrics in Prometheus format
 */

import { Application } from 'express';
import { register, Counter, Gauge, Histogram, Summary, collectDefaultMetrics } from 'prom-client';
import winston from 'winston';
import { MetricsCollector } from '../metrics/metrics-collector';

interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | "histogram" | 'summary';
  labels?: string[];
  instance?: Counter<string> | Gauge<string> | Histogram<string> | Summary<string>;
}

export class PrometheusExporter {
  private logger: winston.Logger;
  private customMetrics: Map<string, PrometheusMetric> = new Map();
  private metricsCollector: MetricsCollector;
  private isInitialized = false;

  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'prometheus-exporter.log' })
      ]
    });
  }

  /**
   * Initialize Prometheus exporter
   */
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('Prometheus exporter already initialized');
      return;
    }

    // Collect default Node.js metrics
    collectDefaultMetrics({ 
      prefix: 'monitoring_dashboard_',
      timeout: 10000
    });

    // Initialize system metrics
    this.initializeSystemMetrics();

    // Initialize application metrics
    this.initializeApplicationMetrics();

    // Initialize custom monitoring metrics
    this.initializeMonitoringMetrics();

    this.isInitialized = true;
    this.logger.info('Prometheus exporter initialized');
  }

  /**
   * Initialize system-level metrics
   */
  private initializeSystemMetrics(): void {
    // CPU metrics
    this.registerGauge(
      'system_cpu_usage_percent',
      'System CPU usage percentage',
      ['core']
    );

    this.registerGauge(
      'system_cpu_load_average',
      'System CPU load average',
      ['period']
    );

    // Memory metrics
    this.registerGauge(
      'system_memory_total_bytes',
      'Total system memory in bytes'
    );

    this.registerGauge(
      'system_memory_used_bytes',
      'Used system memory in bytes'
    );

    this.registerGauge(
      'system_memory_free_bytes',
      'Free system memory in bytes'
    );

    this.registerGauge(
      'system_memory_usage_percent',
      'System memory usage percentage'
    );

    // Disk metrics
    this.registerGauge(
      'system_disk_total_bytes',
      'Total disk space in bytes',
      ['mount']
    );

    this.registerGauge(
      'system_disk_used_bytes',
      'Used disk space in bytes',
      ['mount']
    );

    this.registerGauge(
      'system_disk_free_bytes',
      'Free disk space in bytes',
      ['mount']
    );

    this.registerGauge(
      'system_disk_usage_percent',
      'Disk usage percentage',
      ['mount']
    );

    // Network metrics
    this.registerCounter(
      'system_network_bytes_received_total',
      'Total bytes received',
      ["interface"]
    );

    this.registerCounter(
      'system_network_bytes_sent_total',
      'Total bytes sent',
      ["interface"]
    );

    this.registerCounter(
      'system_network_packets_received_total',
      'Total packets received',
      ["interface"]
    );

    this.registerCounter(
      'system_network_packets_sent_total',
      'Total packets sent',
      ["interface"]
    );
  }

  /**
   * Initialize application metrics
   */
  private initializeApplicationMetrics(): void {
    // HTTP request metrics
    this.registerCounter(
      'http_requests_total',
      'Total HTTP requests',
      ['method', 'path', 'status_code', 'service']
    );

    this.registerHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      ['method', 'path', 'service'],
      [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    );

    this.registerGauge(
      'http_requests_in_flight',
      'Current HTTP requests in flight',
      ['service']
    );

    // Application-specific metrics
    this.registerCounter(
      'application_errors_total',
      'Total application errors',
      ['service', 'type', "severity"]
    );

    this.registerGauge(
      'application_uptime_seconds',
      'Application uptime in seconds',
      ['service']
    );

    this.registerGauge(
      'application_memory_usage_bytes',
      'Application memory usage in bytes',
      ['service']
    );

    this.registerGauge(
      'application_cpu_usage_percent',
      'Application CPU usage percentage',
      ['service']
    );

    // Database metrics
    this.registerCounter(
      'database_queries_total',
      'Total database queries',
      ['service', "operation", 'table']
    );

    this.registerHistogram(
      'database_query_duration_seconds',
      'Database query duration in seconds',
      ['service', "operation", 'table'],
      [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    );

    this.registerGauge(
      'database_connections_active',
      'Active database connections',
      ['service', "database"]
    );

    this.registerGauge(
      'database_connections_idle',
      'Idle database connections',
      ['service', "database"]
    );
  }

  /**
   * Initialize monitoring system metrics
   */
  private initializeMonitoringMetrics(): void {
    // Health check metrics
    this.registerGauge(
      'health_check_status',
      'Health check status (0=unhealthy, 1=healthy)',
      ['service', 'check_name']
    );

    this.registerHistogram(
      'health_check_duration_seconds',
      'Health check duration in seconds',
      ['service', 'check_name'],
      [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    );

    this.registerCounter(
      'health_checks_total',
      'Total health checks performed',
      ['service', 'check_name', 'status']
    );

    // Alert metrics
    this.registerGauge(
      'alerts_active_total',
      'Total active alerts',
      ["severity"]
    );

    this.registerCounter(
      'alerts_triggered_total',
      'Total alerts triggered',
      ['rule_name', "severity", 'service']
    );

    this.registerCounter(
      'alert_notifications_sent_total',
      'Total alert notifications sent',
      ['type', 'status']
    );

    this.registerHistogram(
      'alert_resolution_duration_seconds',
      'Alert resolution duration in seconds',
      ['rule_name', "severity"],
      [60, 300, 900, 1800, 3600, 7200, 14400, 28800]
    );

    // Log metrics
    this.registerCounter(
      'logs_processed_total',
      'Total logs processed',
      ['service', 'level']
    );

    this.registerCounter(
      'log_patterns_matched_total',
      'Total log pattern matches',
      ['pattern_name', 'service']
    );

    this.registerGauge(
      'log_processing_lag_seconds',
      'Log processing lag in seconds',
      ['source']
    );

    // Trace metrics
    this.registerCounter(
      'traces_received_total',
      'Total traces received',
      ['service']
    );

    this.registerHistogram(
      'trace_duration_seconds',
      'Trace duration in seconds',
      ['service', "operation"],
      [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    );

    this.registerGauge(
      'traces_in_flight',
      'Current traces being processed',
      ['service']
    );

    this.registerCounter(
      'trace_spans_total',
      'Total spans processed',
      ['service', "operation", 'status']
    );

    // Monitoring dashboard metrics
    this.registerGauge(
      'dashboard_websocket_connections',
      'Current WebSocket connections'
    );

    this.registerCounter(
      'dashboard_api_requests_total',
      'Total API requests to dashboard',
      ["endpoint", 'method', 'status']
    );

    this.registerHistogram(
      'dashboard_api_duration_seconds',
      'Dashboard API request duration',
      ["endpoint", 'method'],
      [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    );

    this.registerGauge(
      'dashboard_cache_entries',
      'Number of cache entries'
    );

    this.registerCounter(
      'dashboard_cache_hits_total',
      'Total cache hits'
    );

    this.registerCounter(
      'dashboard_cache_misses_total',
      'Total cache misses'
    );
  }

  /**
   * Register a Counter metric
   */
  public registerCounter(name: string, help: string, labels?: string[]): void {
    if (this.customMetrics.has(name)) {
      return;
    }

    const counter = new Counter({
      name,
      help,
      labelNames: labels || []
    });

    this.customMetrics.set(name, {
      name,
      help,
      type: 'counter',
      labels,
      instance: counter
    });
  }

  /**
   * Register a Gauge metric
   */
  public registerGauge(name: string, help: string, labels?: string[]): void {
    if (this.customMetrics.has(name)) {
      return;
    }

    const gauge = new Gauge({
      name,
      help,
      labelNames: labels || []
    });

    this.customMetrics.set(name, {
      name,
      help,
      type: 'gauge',
      labels,
      instance: gauge
    });
  }

  /**
   * Register a Histogram metric
   */
  public registerHistogram(
    name: string, 
    help: string, 
    labels?: string[], 
    buckets?: number[]
  ): void {
    if (this.customMetrics.has(name)) {
      return;
    }

    const histogram = new Histogram({
      name,
      help,
      labelNames: labels || [],
      buckets: buckets || [0.1, 0.5, 1, 2, 5, 10]
    });

    this.customMetrics.set(name, {
      name,
      help,
      type: "histogram",
      labels,
      instance: histogram
    });
  }

  /**
   * Register a Summary metric
   */
  public registerSummary(
    name: string, 
    help: string, 
    labels?: string[],
    percentiles?: number[]
  ): void {
    if (this.customMetrics.has(name)) {
      return;
    }

    const summary = new Summary({
      name,
      help,
      labelNames: labels || [],
      percentiles: percentiles || [0.5, 0.9, 0.95, 0.99]
    });

    this.customMetrics.set(name, {
      name,
      help,
      type: 'summary',
      labels,
      instance: summary
    });
  }

  /**
   * Update system metrics from MetricsCollector
   */
  public async updateSystemMetrics(): Promise<void> {
    try {
      const currentMetrics = await this.metricsCollector.getCurrentMetrics();
      
      if (currentMetrics.system) {
        const system = currentMetrics.system;
        
        // Update CPU metrics
        this.setGauge('system_cpu_usage_percent', system.cpu.usage);
        system.cpu.loadAverage.forEach((load, index) => {
          const period = ['1m', '5m', '15m'][index];
          this.setGauge('system_cpu_load_average', load, { period });
        });

        // Update memory metrics
        this.setGauge('system_memory_total_bytes', system.memory.total);
        this.setGauge('system_memory_used_bytes', system.memory.used);
        this.setGauge('system_memory_free_bytes', system.memory.free);
        this.setGauge('system_memory_usage_percent', system.memory.usage);

        // Update disk metrics
        this.setGauge('system_disk_total_bytes', system.disk.total, { mount: '/' });
        this.setGauge('system_disk_used_bytes', system.disk.used, { mount: '/' });
        this.setGauge('system_disk_free_bytes', system.disk.free, { mount: '/' });
        this.setGauge('system_disk_usage_percent', system.disk.usage, { mount: '/' });

        // Update network metrics
        this.incrementCounter('system_network_bytes_received_total', 
          system.network.bytesIn, { interface: 'all' });
        this.incrementCounter('system_network_bytes_sent_total', 
          system.network.bytesOut, { interface: 'all' });
        this.incrementCounter('system_network_packets_received_total', 
          system.network.packetsIn, { interface: 'all' });
        this.incrementCounter('system_network_packets_sent_total', 
          system.network.packetsOut, { interface: 'all' });
      }

      // Update application metrics
      for (const [service, appMetrics] of Object.entries(currentMetrics.applications)) {
        if (appMetrics) {
          this.setGauge('application_memory_usage_bytes', 
            appMetrics.resources.memory, { service });
          this.setGauge('application_cpu_usage_percent', 
            appMetrics.resources.cpu, { service });
          
          this.incrementCounter('http_requests_total', 
            appMetrics.requests.total, 
            { service, method: 'GET', path: '/api', status_code: '200' });
            
          this.incrementCounter('application_errors_total', 
            appMetrics.requests.errors, 
            { service, type: 'http', severity: 'error' });
        }
      }

    } catch (error) {
      this.logger.error('Error updating system metrics:', error);
    }
  }

  /**
   * Update health check metrics
   */
  public updateHealthMetrics(serviceId: string, checkName: string, isHealthy: boolean, duration: number): void {
    this.setGauge('health_check_status', isHealthy ? 1 : 0, { service: serviceId, check_name: checkName });
    this.observeHistogram('health_check_duration_seconds', duration / 1000, 
      { service: serviceId, check_name: checkName });
    this.incrementCounter('health_checks_total', 1, 
      { service: serviceId, check_name: checkName, status: isHealthy ? 'healthy' : "unhealthy" });
  }

  /**
   * Update alert metrics
   */
  public updateAlertMetrics(ruleId: string, severity: string, service: string): void {
    this.incrementCounter('alerts_triggered_total', 1, 
      { rule_name: ruleId, severity, service });
  }

  /**
   * Update log metrics
   */
  public updateLogMetrics(service: string, level: string, count: number = 1): void {
    this.incrementCounter('logs_processed_total', count, { service, level });
  }

  /**
   * Update trace metrics
   */
  public updateTraceMetrics(service: string, operation: string, duration: number, status: string): void {
    this.incrementCounter('traces_received_total', 1, { service });
    this.observeHistogram('trace_duration_seconds', duration / 1000, { service, operation });
    this.incrementCounter('trace_spans_total', 1, { service, operation, status });
  }

  /**
   * Update dashboard metrics
   */
  public updateDashboardMetrics(metric: string, value: number, labels?: Record<string, string>): void {
    const metricName = `dashboard_${metric}`;
    const existingMetric = this.customMetrics.get(metricName);
    
    if (existingMetric) {
      switch (existingMetric.type) {
        case 'gauge':
          this.setGauge(metricName, value, labels);
          break;
        case 'counter':
          this.incrementCounter(metricName, value, labels);
          break;
        case "histogram":
          this.observeHistogram(metricName, value, labels);
          break;
      }
    }
  }

  /**
   * Set gauge value
   */
  private setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.customMetrics.get(name);
    if (metric?.instance && metric.type === 'gauge') {
      const gauge = metric.instance as Gauge<string>;
      if (labels) {
        gauge.set(labels, value);
      } else {
        gauge.set(value);
      }
    }
  }

  /**
   * Increment counter
   */
  private incrementCounter(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.customMetrics.get(name);
    if (metric?.instance && metric.type === 'counter') {
      const counter = metric.instance as Counter<string>;
      if (labels) {
        counter.inc(labels, value);
      } else {
        counter.inc(value);
      }
    }
  }

  /**
   * Observe histogram
   */
  private observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.customMetrics.get(name);
    if (metric?.instance && metric.type === "histogram") {
      const histogram = metric.instance as Histogram<string>;
      if (labels) {
        histogram.observe(labels, value);
      } else {
        histogram.observe(value);
      }
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  public async getMetrics(): Promise<string> {
    // Update metrics before returning
    await this.updateSystemMetrics();
    
    return register.metrics();
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    register.clear();
    this.customMetrics.clear();
    this.logger.info('Prometheus metrics cleared');
  }

  /**
   * Get metric names
   */
  public getMetricNames(): string[] {
    return Array.from(this.customMetrics.keys());
  }

  /**
   * Get metric info
   */
  public getMetricInfo(name: string): PrometheusMetric | null {
    return this.customMetrics.get(name) || null;
  }

  /**
   * Check if metric exists
   */
  public hasMetric(name: string): boolean {
    return this.customMetrics.has(name);
  }
}

/**
 * Setup Prometheus endpoint
 */
export function setupPrometheus(app: Application, metricsCollector: MetricsCollector): PrometheusExporter {
  const exporter = new PrometheusExporter(metricsCollector);
  exporter.initialize();

  // Prometheus metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await exporter.getMetrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });

  // Health endpoint for Prometheus
  app.get('/metrics/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      metrics_count: exporter.getMetricNames().length,
      timestamp: Date.now() 
    });
  });

  return exporter;
}