/**
 * TraceCollector - Distributed tracing and performance analysis
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import * as crypto from 'crypto';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: SpanLog[];
  status: SpanStatus;
  references: SpanReference[];
}

export interface SpanLog {
  timestamp: number;
  fields: Record<string, any>;
}

export interface SpanReference {
  type: 'childOf' | 'followsFrom';
  traceId: string;
  spanId: string;
}

export interface SpanStatus {
  code: 'ok' | 'error' | 'timeout' | 'cancelled';
  message?: string;
}

export interface Trace {
  traceId: string;
  spans: Span[];
  startTime: number;
  endTime: number;
  duration: number;
  services: string[];
  operationsCount: number;
  errorCount: number;
  status: 'success' | 'error' | 'timeout';
  rootSpan?: Span;
}

export interface TraceQuery {
  traceId?: string;
  service?: string;
  operation?: string;
  tags?: Record<string, string>;
  minDuration?: number;
  maxDuration?: number;
  startTime?: number;
  endTime?: number;
  hasErrors?: boolean;
  limit?: number;
  offset?: number;
}

export interface PerformanceMetrics {
  averageDuration: number;
  p50Duration: number;
  p90Duration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
  throughput: number;
  slowestTraces: Trace[];
  errorTraces: Trace[];
}

export interface ServiceDependency {
  service: string;
  dependencies: string[];
  callCounts: Record<string, number>;
  errorCounts: Record<string, number>;
}

export class TraceCollector extends EventEmitter {
  private logger: winston.Logger;
  private spans: Map<string, Span> = new Map();
  private traces: Map<string, Trace> = new Map();
  private activeSpans: Map<string, Span> = new Map();
  
  private maxRetentionTime = 24 * 60 * 60 * 1000; // 24 hours
  private maxTraces = 50000;
  private maxSpansPerTrace = 1000;
  
  // Performance tracking
  private serviceMetrics: Map<string, PerformanceMetrics> = new Map();
  private serviceDependencies: Map<string, ServiceDependency> = new Map();
  
  // Sampling configuration
  private samplingRate = 1.0; // 100% by default
  private adaptiveSampling = true;

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
        new winston.transports.File({ filename: 'trace-collector.log' })
      ]
    });

    // Start periodic maintenance
    setInterval(() => {
      this.performMaintenance();
    }, 300000); // Every 5 minutes
  }

  /**
   * Start a new span
   */
  public startSpan(
    operationName: string,
    serviceName: string,
    parentSpan?: Span | string,
    tags: Record<string, any> = {}
  ): Span {
    const traceId = parentSpan 
      ? (typeof parentSpan === 'string' ? parentSpan : parentSpan.traceId)
      : this.generateTraceId();
    
    const span: Span = {
      traceId,
      spanId: this.generateSpanId(),
      parentSpanId: typeof parentSpan === 'object' ? parentSpan.spanId : undefined,
      operationName,
      serviceName,
      startTime: Date.now(),
      tags: { ...tags },
      logs: [],
      status: { code: 'ok' },
      references: []
    };

    // Add parent reference
    if (typeof parentSpan === 'object') {
      span.references.push({
        type: 'childOf',
        traceId: parentSpan.traceId,
        spanId: parentSpan.spanId
      });
    }

    this.spans.set(span.spanId, span);
    this.activeSpans.set(span.spanId, span);

    this.emit('spanStarted', span);
    return span;
  }

  /**
   * Finish a span
   */
  public finishSpan(span: Span | string, tags: Record<string, any> = {}): void {
    const spanObj = typeof span === 'string' ? this.spans.get(span) : span;
    if (!spanObj) {
      this.logger.warn(`Span not found: ${typeof span === 'string' ? span : span.spanId}`);
      return;
    }

    spanObj.endTime = Date.now();
    spanObj.duration = spanObj.endTime - spanObj.startTime;
    spanObj.tags = { ...spanObj.tags, ...tags };

    this.activeSpans.delete(spanObj.spanId);
    this.processFinishedSpan(spanObj);

    this.emit('spanFinished', spanObj);
  }

  /**
   * Add log to span
   */
  public addLogToSpan(span: Span | string, fields: Record<string, any>): void {
    const spanObj = typeof span === 'string' ? this.spans.get(span) : span;
    if (!spanObj) {
      return;
    }

    const log: SpanLog = {
      timestamp: Date.now(),
      fields
    };

    spanObj.logs.push(log);
  }

  /**
   * Set span status
   */
  public setSpanStatus(span: Span | string, code: SpanStatus['code'], message?: string): void {
    const spanObj = typeof span === 'string' ? this.spans.get(span) : span;
    if (!spanObj) {
      return;
    }

    spanObj.status = { code, message };
    
    if (code === 'error') {
      spanObj.tags.error = true;
    }
  }

  /**
   * Add tags to span
   */
  public addTagsToSpan(span: Span | string, tags: Record<string, any>): void {
    const spanObj = typeof span === 'string' ? this.spans.get(span) : span;
    if (!spanObj) {
      return;
    }

    spanObj.tags = { ...spanObj.tags, ...tags };
  }

  /**
   * Process finished span and build trace
   */
  private processFinishedSpan(span: Span): void {
    // Get or create trace
    let trace = this.traces.get(span.traceId);
    if (!trace) {
      trace = {
        traceId: span.traceId,
        spans: [],
        startTime: span.startTime,
        endTime: span.endTime || span.startTime,
        duration: 0,
        services: [],
        operationsCount: 0,
        errorCount: 0,
        status: 'success'
      };
      this.traces.set(span.traceId, trace);
    }

    // Add span to trace
    trace.spans.push(span);
    
    // Update trace metadata
    trace.startTime = Math.min(trace.startTime, span.startTime);
    trace.endTime = Math.max(trace.endTime, span.endTime || span.startTime);
    trace.duration = trace.endTime - trace.startTime;
    
    // Add service if not already present
    if (!trace.services.includes(span.serviceName)) {
      trace.services.push(span.serviceName);
    }
    
    trace.operationsCount = trace.spans.length;
    
    // Count errors
    if (span.status.code === 'error') {
      trace.errorCount++;
    }
    
    // Update trace status
    if (trace.errorCount > 0) {
      trace.status = 'error';
    } else if (trace.spans.some(s => s.status.code === 'timeout')) {
      trace.status = 'timeout';
    }

    // Find root span (span without parent)
    trace.rootSpan = trace.spans.find(s => !s.parentSpanId) || trace.spans[0];

    // Update service dependencies
    this.updateServiceDependencies(span);

    // Check if trace is complete
    if (this.isTraceComplete(trace)) {
      this.emit('traceCompleted', trace);
      this.updatePerformanceMetrics(trace);
    }

    // Cleanup if trace has too many spans
    if (trace.spans.length > this.maxSpansPerTrace) {
      trace.spans = trace.spans.slice(-this.maxSpansPerTrace);
    }
  }

  /**
   * Check if trace is complete (no active spans for this trace)
   */
  private isTraceComplete(trace: Trace): boolean {
    for (const activeSpan of this.activeSpans.values()) {
      if (activeSpan.traceId === trace.traceId) {
        return false;
      }
    }
    return true;
  }

  /**
   * Update service dependencies based on span
   */
  private updateServiceDependencies(span: Span): void {
    const parentSpan = span.parentSpanId ? this.spans.get(span.parentSpanId) : null;
    if (!parentSpan) {
      return;
    }

    const parentService = parentSpan.serviceName;
    const currentService = span.serviceName;

    if (parentService === currentService) {
      return; // Same service, not a dependency
    }

    let dependency = this.serviceDependencies.get(parentService);
    if (!dependency) {
      dependency = {
        service: parentService,
        dependencies: [],
        callCounts: {},
        errorCounts: {}
      };
      this.serviceDependencies.set(parentService, dependency);
    }

    if (!dependency.dependencies.includes(currentService)) {
      dependency.dependencies.push(currentService);
    }

    dependency.callCounts[currentService] = (dependency.callCounts[currentService] || 0) + 1;

    if (span.status.code === 'error') {
      dependency.errorCounts[currentService] = (dependency.errorCounts[currentService] || 0) + 1;
    }
  }

  /**
   * Update performance metrics for service
   */
  private updatePerformanceMetrics(trace: Trace): void {
    for (const service of trace.services) {
      const serviceSpans = trace.spans.filter(s => s.serviceName === service);
      const durations = serviceSpans.map(s => s.duration || 0);
      
      let metrics = this.serviceMetrics.get(service);
      if (!metrics) {
        metrics = {
          averageDuration: 0,
          p50Duration: 0,
          p90Duration: 0,
          p95Duration: 0,
          p99Duration: 0,
          errorRate: 0,
          throughput: 0,
          slowestTraces: [],
          errorTraces: []
        };
        this.serviceMetrics.set(service, metrics);
      }

      // Update metrics (simplified - in reality would use sliding windows)
      if (durations.length > 0) {
        metrics.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const sortedDurations = durations.sort((a, b) => a - b);
        
        metrics.p50Duration = this.percentile(sortedDurations, 50);
        metrics.p90Duration = this.percentile(sortedDurations, 90);
        metrics.p95Duration = this.percentile(sortedDurations, 95);
        metrics.p99Duration = this.percentile(sortedDurations, 99);
      }

      // Update error rate
      const errorCount = serviceSpans.filter(s => s.status.code === 'error').length;
      metrics.errorRate = (errorCount / serviceSpans.length) * 100;

      // Add to slowest traces if applicable
      if (trace.duration > 5000) { // 5 seconds threshold
        metrics.slowestTraces.push(trace);
        metrics.slowestTraces = metrics.slowestTraces
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 10); // Keep top 10
      }

      // Add to error traces if applicable
      if (trace.status === 'error') {
        metrics.errorTraces.push(trace);
        metrics.errorTraces = metrics.errorTraces.slice(-10); // Keep last 10
      }
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get recent traces
   */
  public async getRecentTraces(limit: number = 100): Promise<Trace[]> {
    return Array.from(this.traces.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Get trace by ID
   */
  public async getTrace(traceId: string): Promise<Trace | null> {
    return this.traces.get(traceId) || null;
  }

  /**
   * Search traces
   */
  public async searchTraces(query: TraceQuery): Promise<{
    traces: Trace[];
    total: number;
  }> {
    let filteredTraces = Array.from(this.traces.values());

    // Apply filters
    if (query.traceId) {
      filteredTraces = filteredTraces.filter(trace => trace.traceId === query.traceId);
    }

    if (query.service) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.services.includes(query.service!)
      );
    }

    if (query.operation) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.spans.some(span => span.operationName.includes(query.operation!))
      );
    }

    if (query.minDuration) {
      filteredTraces = filteredTraces.filter(trace => trace.duration >= query.minDuration!);
    }

    if (query.maxDuration) {
      filteredTraces = filteredTraces.filter(trace => trace.duration <= query.maxDuration!);
    }

    if (query.startTime) {
      filteredTraces = filteredTraces.filter(trace => trace.startTime >= query.startTime!);
    }

    if (query.endTime) {
      filteredTraces = filteredTraces.filter(trace => trace.endTime <= query.endTime!);
    }

    if (query.hasErrors !== undefined) {
      filteredTraces = filteredTraces.filter(trace => 
        query.hasErrors ? trace.errorCount > 0 : trace.errorCount === 0
      );
    }

    if (query.tags) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.spans.some(span => 
          Object.entries(query.tags!).every(([key, value]) => 
            span.tags[key] === value
          )
        )
      );
    }

    // Sort by start time (newest first)
    filteredTraces.sort((a, b) => b.startTime - a.startTime);

    const total = filteredTraces.length;
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    
    return {
      traces: filteredTraces.slice(offset, offset + limit),
      total
    };
  }

  /**
   * Get service performance metrics
   */
  public getServiceMetrics(service: string): PerformanceMetrics | null {
    return this.serviceMetrics.get(service) || null;
  }

  /**
   * Get all service metrics
   */
  public getAllServiceMetrics(): Record<string, PerformanceMetrics> {
    const metrics: Record<string, PerformanceMetrics> = {};
    for (const [service, serviceMetrics] of this.serviceMetrics) {
      metrics[service] = serviceMetrics;
    }
    return metrics;
  }

  /**
   * Get service dependencies
   */
  public getServiceDependencies(): ServiceDependency[] {
    return Array.from(this.serviceDependencies.values());
  }

  /**
   * Get dependency graph
   */
  public getDependencyGraph(): {
    nodes: Array<{ id: string; label: string; type: 'service' }>;
    edges: Array<{ from: string; to: string; weight: number; errors: number }>;
  } {
    const nodes = new Set<string>();
    const edges: Array<{ from: string; to: string; weight: number; errors: number }> = [];

    for (const dependency of this.serviceDependencies.values()) {
      nodes.add(dependency.service);
      
      for (const dep of dependency.dependencies) {
        nodes.add(dep);
        edges.push({
          from: dependency.service,
          to: dep,
          weight: dependency.callCounts[dep] || 0,
          errors: dependency.errorCounts[dep] || 0
        });
      }
    }

    return {
      nodes: Array.from(nodes).map(id => ({ id, label: id, type: 'service' as const })),
      edges
    };
  }

  /**
   * Get trace timeline for visualization
   */
  public getTraceTimeline(traceId: string): Array<{
    spanId: string;
    serviceName: string;
    operationName: string;
    startTime: number;
    duration: number;
    level: number;
    status: SpanStatus['code'];
  }> | null {
    const trace = this.traces.get(traceId);
    if (!trace) {
      return null;
    }

    const timeline: Array<{
      spanId: string;
      serviceName: string;
      operationName: string;
      startTime: number;
      duration: number;
      level: number;
      status: SpanStatus['code'];
    }> = [];

    // Build hierarchy
    const spansByParent: Map<string | undefined, Span[]> = new Map();
    for (const span of trace.spans) {
      const parent = span.parentSpanId;
      if (!spansByParent.has(parent)) {
        spansByParent.set(parent, []);
      }
      spansByParent.get(parent)!.push(span);
    }

    // Build timeline recursively
    const buildTimeline = (spans: Span[], level: number = 0) => {
      spans.sort((a, b) => a.startTime - b.startTime);
      
      for (const span of spans) {
        timeline.push({
          spanId: span.spanId,
          serviceName: span.serviceName,
          operationName: span.operationName,
          startTime: span.startTime - trace.startTime, // Relative to trace start
          duration: span.duration || 0,
          level,
          status: span.status.code
        });

        // Add child spans
        const children = spansByParent.get(span.spanId) || [];
        if (children.length > 0) {
          buildTimeline(children, level + 1);
        }
      }
    };

    const rootSpans = spansByParent.get(undefined) || [];
    buildTimeline(rootSpans);

    return timeline;
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    totalTraces: number;
    totalSpans: number;
    activeSpans: number;
    services: number;
    averageTraceSize: number;
    averageTraceDuration: number;
    errorRate: number;
  } {
    const traces = Array.from(this.traces.values());
    const totalSpans = Array.from(this.spans.values()).length;
    const services = new Set<string>();
    
    let totalDuration = 0;
    let totalSpanCount = 0;
    let totalErrors = 0;

    for (const trace of traces) {
      for (const service of trace.services) {
        services.add(service);
      }
      totalDuration += trace.duration;
      totalSpanCount += trace.spans.length;
      totalErrors += trace.errorCount;
    }

    return {
      totalTraces: traces.length,
      totalSpans,
      activeSpans: this.activeSpans.size,
      services: services.size,
      averageTraceSize: traces.length > 0 ? totalSpanCount / traces.length : 0,
      averageTraceDuration: traces.length > 0 ? totalDuration / traces.length : 0,
      errorRate: totalSpanCount > 0 ? (totalErrors / totalSpanCount) * 100 : 0
    };
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Should sample this trace
   */
  private shouldSample(): boolean {
    return Math.random() <= this.samplingRate;
  }

  /**
   * Set sampling rate
   */
  public setSamplingRate(rate: number): void {
    this.samplingRate = Math.max(0, Math.min(1, rate));
    this.logger.info(`Sampling rate set to ${this.samplingRate * 100}%`);
  }

  /**
   * Perform maintenance tasks
   */
  private performMaintenance(): void {
    const now = Date.now();
    const cutoff = now - this.maxRetentionTime;

    // Clean old traces
    const tracesToRemove: string[] = [];
    for (const [traceId, trace] of this.traces) {
      if (trace.endTime < cutoff) {
        tracesToRemove.push(traceId);
      }
    }

    for (const traceId of tracesToRemove) {
      const trace = this.traces.get(traceId);
      if (trace) {
        // Remove spans belonging to this trace
        for (const span of trace.spans) {
          this.spans.delete(span.spanId);
        }
        this.traces.delete(traceId);
      }
    }

    // Limit total traces
    if (this.traces.size > this.maxTraces) {
      const sortedTraces = Array.from(this.traces.entries())
        .sort(([, a], [, b]) => a.endTime - b.endTime);
      
      const toRemove = sortedTraces.slice(0, this.traces.size - this.maxTraces);
      for (const [traceId] of toRemove) {
        const trace = this.traces.get(traceId);
        if (trace) {
          for (const span of trace.spans) {
            this.spans.delete(span.spanId);
          }
          this.traces.delete(traceId);
        }
      }
    }

    // Adaptive sampling based on load
    if (this.adaptiveSampling) {
      const tracesPerMinute = this.traces.size / (this.maxRetentionTime / 60000);
      if (tracesPerMinute > 1000) {
        this.samplingRate = Math.max(0.1, this.samplingRate * 0.9);
      } else if (tracesPerMinute < 100) {
        this.samplingRate = Math.min(1.0, this.samplingRate * 1.1);
      }
    }

    if (tracesToRemove.length > 0) {
      this.logger.info(`Cleaned up ${tracesToRemove.length} old traces`);
    }
  }

  /**
   * Export traces for external analysis
   */
  public exportTraces(query: TraceQuery, format: 'jaeger' | 'zipkin' | 'json' = 'json'): any {
    const { traces } = this.searchTraces(query);
    
    switch (format) {
      case 'jaeger':
        return this.exportToJaegerFormat(traces);
      case 'zipkin':
        return this.exportToZipkinFormat(traces);
      case 'json':
      default:
        return traces;
    }
  }

  /**
   * Export to Jaeger format
   */
  private exportToJaegerFormat(traces: Trace[]): any {
    return {
      data: traces.map(trace => ({
        traceID: trace.traceId,
        spans: trace.spans.map(span => ({
          traceID: span.traceId,
          spanID: span.spanId,
          parentSpanID: span.parentSpanId || '',
          operationName: span.operationName,
          process: {
            serviceName: span.serviceName,
            tags: []
          },
          startTime: span.startTime * 1000, // Jaeger uses microseconds
          duration: (span.duration || 0) * 1000,
          tags: Object.entries(span.tags).map(([key, value]) => ({
            key,
            type: typeof value === 'string' ? 'string' : 'number',
            value: String(value)
          })),
          logs: span.logs.map(log => ({
            timestamp: log.timestamp * 1000,
            fields: Object.entries(log.fields).map(([key, value]) => ({
              key,
              value: String(value)
            }))
          }))
        }))
      }))
    };
  }

  /**
   * Export to Zipkin format
   */
  private exportToZipkinFormat(traces: Trace[]): any {
    const spans: any[] = [];
    
    for (const trace of traces) {
      for (const span of trace.spans) {
        spans.push({
          traceId: span.traceId,
          id: span.spanId,
          parentId: span.parentSpanId,
          name: span.operationName,
          localEndpoint: {
            serviceName: span.serviceName
          },
          timestamp: span.startTime * 1000, // Zipkin uses microseconds
          duration: (span.duration || 0) * 1000,
          tags: span.tags,
          annotations: span.logs.map(log => ({
            timestamp: log.timestamp * 1000,
            value: JSON.stringify(log.fields)
          }))
        });
      }
    }
    
    return spans;
  }
}