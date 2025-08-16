/**
 * OpenTelemetry Setup - Configure tracing and metrics export
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace, metrics, propagation, context } from '@opentelemetry/api';
import winston from 'winston';

interface OpenTelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  prometheusPort?: number;
  enableAutoInstrumentation: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  sampleRate: number;
  exporters: {
    jaeger?: boolean;
    prometheus?: boolean;
    console?: boolean;
  };
}

export class OpenTelemetrySetup {
  private logger: winston.Logger;
  private sdk: NodeSDK | null = null;
  private config: OpenTelemetryConfig;
  private isInitialized = false;

  constructor(config: Partial<OpenTelemetryConfig> = {}) {
    this.config = {
      serviceName: 'monitoring-dashboard',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9464'),
      enableAutoInstrumentation: true,
      enableMetrics: true,
      enableTracing: true,
      sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
      exporters: {
        jaeger: true,
        prometheus: true,
        console: false
      },
      ...config
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'opentelemetry.log' })
      ]
    });
  }

  /**
   * Initialize OpenTelemetry SDK
   */
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('OpenTelemetry already initialized');
      return;
    }

    this.logger.info('Initializing OpenTelemetry...', {
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      enableTracing: this.config.enableTracing,
      enableMetrics: this.config.enableMetrics
    });

    try {
      // Create resource
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: `${this.config.serviceName}-${process.pid}`,
        [SemanticResourceAttributes.PROCESS_PID]: process.pid,
        [SemanticResourceAttributes.HOST_NAME]: require('os').hostname(),
        [SemanticResourceAttributes.HOST_ARCH]: process.arch,
        [SemanticResourceAttributes.OS_TYPE]: process.platform,
        [SemanticResourceAttributes.PROCESS_RUNTIME_NAME]: 'nodejs',
        [SemanticResourceAttributes.PROCESS_RUNTIME_VERSION]: process.version
      });

      // Configure SDK
      const sdkConfig: any = {
        resource,
        instrumentations: []
      };

      // Add auto-instrumentations if enabled
      if (this.config.enableAutoInstrumentation) {
        sdkConfig.instrumentations.push(getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false // Disable noisy fs instrumentation
          },
          '@opentelemetry/instrumentation-dns': {
            enabled: false // Disable noisy DNS instrumentation
          }
        }));
      }

      // Configure tracing
      if (this.config.enableTracing) {
        const spanProcessors = [];

        // Jaeger exporter
        if (this.config.exporters.jaeger && this.config.jaegerEndpoint) {
          const jaegerExporter = new JaegerExporter({
            endpoint: this.config.jaegerEndpoint,
            headers: {},
            username: process.env.JAEGER_USERNAME,
            password: process.env.JAEGER_PASSWORD
          });
          
          spanProcessors.push(new BatchSpanProcessor(jaegerExporter));
        }

        sdkConfig.traceExporter = spanProcessors;
      }

      // Configure metrics
      if (this.config.enableMetrics) {
        const metricReaders = [];

        // Prometheus exporter
        if (this.config.exporters.prometheus) {
          const prometheusExporter = new PrometheusExporter({
            port: this.config.prometheusPort,
            endpoint: '/metrics'
          });
          
          metricReaders.push(
            new PeriodicExportingMetricReader({
              exporter: prometheusExporter,
              exportIntervalMillis: 30000 // 30 seconds
            })
          );
        }

        sdkConfig.metricReader = metricReaders;
      }

      // Initialize SDK
      this.sdk = new NodeSDK(sdkConfig);
      this.sdk.start();

      this.isInitialized = true;
      this.logger.info('OpenTelemetry initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry:', error);
      throw error;
    }
  }

  /**
   * Shutdown OpenTelemetry
   */
  public async shutdown(): Promise<void> {
    if (!this.sdk || !this.isInitialized) {
      return;
    }

    try {
      await this.sdk.shutdown();
      this.isInitialized = false;
      this.logger.info('OpenTelemetry shut down successfully');
    } catch (error) {
      this.logger.error('Failed to shutdown OpenTelemetry:', error);
    }
  }

  /**
   * Create a custom tracer
   */
  public createTracer(name: string, version?: string): any {
    return trace.getTracer(name, version);
  }

  /**
   * Create a custom meter
   */
  public createMeter(name: string, version?: string): any {
    return metrics.getMeter(name, version);
  }

  /**
   * Get the current span
   */
  public getCurrentSpan(): any {
    return trace.getActiveSpan();
  }

  /**
   * Start a new span
   */
  public startSpan(tracer: any, name: string, options?: any): any {
    return tracer.startSpan(name, options);
  }

  /**
   * End a span
   */
  public endSpan(span: any, error?: Error): void {
    if (error) {
      span.recordException(error);
      span.setStatus({
        code: 2, // ERROR
        message: error.message
      });
    } else {
      span.setStatus({ code: 1 }); // OK
    }
    span.end();
  }

  /**
   * Add attributes to current span
   */
  public addSpanAttributes(attributes: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Add event to current span
   */
  public addSpanEvent(name: string, attributes?: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Wrap function with tracing
   */
  public traceFunction<T extends (...args: any[]) => any>(
    tracer: any,
    name: string,
    fn: T,
    options?: any
  ): T {
    return ((...args: any[]) => {
      const span = tracer.startSpan(name, options);
      
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result
            .then((value: any) => {
              this.endSpan(span);
              return value;
            })
            .catch((error: Error) => {
              this.endSpan(span, error);
              throw error;
            });
        }
        
        this.endSpan(span);
        return result;
      } catch (error) {
        this.endSpan(span, error as Error);
        throw error;
      }
    }) as T;
  }

  /**
   * Wrap async function with tracing
   */
  public traceAsyncFunction<T extends (...args: any[]) => Promise<any>>(
    tracer: any,
    name: string,
    fn: T,
    options?: any
  ): T {
    return (async (...args: any[]) => {
      const span = tracer.startSpan(name, options);
      
      try {
        const result = await fn(...args);
        this.endSpan(span);
        return result;
      } catch (error) {
        this.endSpan(span, error as Error);
        throw error;
      }
    }) as T;
  }

  /**
   * Create HTTP request tracing middleware
   */
  public createHTTPMiddleware() {
    return (req: any, res: any, next: any) => {
      const tracer = this.createTracer('http-requests');
      const span = tracer.startSpan(`${req.method} ${req.path}`, {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.scheme': req.protocol,
          'http.host': req.get('host'),
          'http.user_agent': req.get('user-agent'),
          'http.client_ip': req.ip
        }
      });

      // Add span to request for later use
      req.span = span;

      res.on('finish', () => {
        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.response.size': res.get('content-length')
        });

        if (res.statusCode >= 400) {
          span.setStatus({
            code: 2, // ERROR
            message: `HTTP ${res.statusCode}`
          });
        } else {
          span.setStatus({ code: 1 }); // OK
        }

        span.end();
      });

      res.on('error', (error: Error) => {
        this.endSpan(span, error);
      });

      next();
    };
  }

  /**
   * Create database query tracing
   */
  public traceDatabaseQuery(
    tracer: any,
    operation: string,
    table: string,
    query?: string
  ): any {
    return tracer.startSpan(`db.${operation}`, {
      attributes: {
        'db.operation': operation,
        'db.table': table,
        'db.statement': query,
        'db.type': 'sql'
      }
    });
  }

  /**
   * Create custom metrics
   */
  public createCustomMetrics() {
    const meter = this.createMeter('monitoring-dashboard-metrics');

    // Create various metric types
    const requestCounter = meter.createCounter('requests_total', {
      description: 'Total number of requests'
    });

    const requestDuration = meter.createHistogram('request_duration_seconds', {
      description: 'Request duration in seconds',
      unit: 's'
    });

    const activeConnections = meter.createUpDownCounter('active_connections', {
      description: 'Number of active connections'
    });

    const memoryUsage = meter.createObservableGauge('memory_usage_bytes', {
      description: 'Current memory usage in bytes'
    });

    // Register callback for observable metrics
    meter.addBatchObservableCallback(
      (observableResult) => {
        const memUsage = process.memoryUsage();
        observableResult.observe(memoryUsage, memUsage.heapUsed);
      },
      [memoryUsage]
    );

    return {
      requestCounter,
      requestDuration,
      activeConnections,
      memoryUsage
    };
  }

  /**
   * Create correlation ID context
   */
  public createCorrelationContext(correlationId: string): any {
    return context.active().setValue('correlationId', correlationId);
  }

  /**
   * Get correlation ID from context
   */
  public getCorrelationId(): string | undefined {
    return context.active().getValue('correlationId') as string;
  }

  /**
   * Propagate context across async operations
   */
  public runWithContext<T>(ctx: any, fn: () => T): T {
    return context.with(ctx, fn);
  }

  /**
   * Extract baggage from headers
   */
  public extractBaggage(headers: Record<string, string>): Record<string, string> {
    const baggage: Record<string, string> = {};
    
    // Extract from standard OpenTelemetry baggage header
    const baggageHeader = headers['baggage'];
    if (baggageHeader) {
      const items = baggageHeader.split(',');
      for (const item of items) {
        const [key, value] = item.trim().split('=');
        if (key && value) {
          baggage[key] = decodeURIComponent(value);
        }
      }
    }

    return baggage;
  }

  /**
   * Inject baggage into headers
   */
  public injectBaggage(baggage: Record<string, string>): Record<string, string> {
    const items = Object.entries(baggage)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join(',');

    return {
      'baggage': items
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): OpenTelemetryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<OpenTelemetryConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.info('OpenTelemetry configuration updated', updates);
  }

  /**
   * Check if initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get OpenTelemetry version info
   */
  public getVersionInfo(): Record<string, string> {
    return {
      sdk: require('@opentelemetry/sdk-node/package.json').version,
      api: require('@opentelemetry/api/package.json').version,
      autoInstrumentations: require('@opentelemetry/auto-instrumentations-node/package.json').version
    };
  }
}

/**
 * Global OpenTelemetry setup function
 */
export function setupOpenTelemetry(config?: Partial<OpenTelemetryConfig>): OpenTelemetrySetup {
  const otelSetup = new OpenTelemetrySetup(config);
  
  try {
    otelSetup.initialize();
    return otelSetup;
  } catch (error) {
    console.error('Failed to setup OpenTelemetry:', error);
    // Return uninitialized setup to prevent crashes
    return otelSetup;
  }
}

/**
 * Express middleware factory for OpenTelemetry
 */
export function createOTelMiddleware(otelSetup: OpenTelemetrySetup) {
  if (!otelSetup.isReady()) {
    return (req: any, res: any, next: any) => next();
  }

  return otelSetup.createHTTPMiddleware();
}

/**
 * Utility function to trace any function
 */
export function trace<T extends (...args: any[]) => any>(
  name: string,
  fn: T,
  tracer?: any
): T {
  const otelSetup = new OpenTelemetrySetup();
  if (!otelSetup.isReady()) {
    return fn; // Return original function if not initialized
  }

  const tracerInstance = tracer || otelSetup.createTracer('default');
  return otelSetup.traceFunction(tracerInstance, name, fn);
}

/**
 * Utility function to trace async functions
 */
export function traceAsync<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  tracer?: any
): T {
  const otelSetup = new OpenTelemetrySetup();
  if (!otelSetup.isReady()) {
    return fn; // Return original function if not initialized
  }

  const tracerInstance = tracer || otelSetup.createTracer('default');
  return otelSetup.traceAsyncFunction(tracerInstance, name, fn);
}

export default OpenTelemetrySetup;