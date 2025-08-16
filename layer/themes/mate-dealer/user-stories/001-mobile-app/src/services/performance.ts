/**
 * Performance Monitoring Service
 * 
 * Tracks and monitors app performance metrics including startup time,
 * screen transitions, memory usage, and battery consumption.
 */

import logger from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  target?: number;
  status?: 'success' | 'warning' | 'error';
}

export interface ScreenTransition {
  from: string;
  to: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}

export interface StartupMetrics {
  coldStartTime?: number;
  warmStartTime?: number;
  timeToInteractive?: number;
  splashScreenDuration?: number;
  initialRenderTime?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private screenTransitions: ScreenTransition[] = [];
  private currentTransition: ScreenTransition | null = null;
  private startupMetrics: StartupMetrics = {};
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private appStartTime: number;
  private isMonitoring: boolean = false;

  // Performance targets
  private readonly TARGETS = {
    STARTUP_TIME: 3000, // < 3 seconds
    TRANSITION_TIME: 300, // < 300ms
    MEMORY_BASELINE: 200 * 1024 * 1024, // < 200MB
    FPS: 60, // 60 FPS
    BATTERY_DRAIN: 10, // < 10% per hour
    API_RESPONSE: 1000, // < 1 second
    DB_QUERY: 100, // < 100ms
    IMAGE_LOAD: 500, // < 500ms
    CACHE_HIT_RATE: 80 // > 80%
  };

  private constructor() {
    this.appStartTime = Date.now();
    this.startMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor memory usage every 30 seconds
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);

    // Log initial startup
    this.measureAppStartup();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  // App startup monitoring
  measureAppStartup(): void {
    const startupTime = Date.now() - this.appStartTime;
    
    this.startupMetrics.coldStartTime = startupTime;
    
    const metric: PerformanceMetric = {
      name: 'app_startup',
      value: startupTime,
      unit: 'ms',
      timestamp: Date.now(),
      target: this.TARGETS.STARTUP_TIME,
      status: startupTime < this.TARGETS.STARTUP_TIME ? 'success' : 'warning'
    };

    this.recordMetric(metric);
    logger.logAppStartup(startupTime);

    if (startupTime > this.TARGETS.STARTUP_TIME) {
      logger.warn(`App startup exceeded target: ${startupTime}ms (target: ${this.TARGETS.STARTUP_TIME}ms)`);
    }
  }

  markSplashScreenEnd(): void {
    const duration = Date.now() - this.appStartTime;
    this.startupMetrics.splashScreenDuration = duration;
    
    this.recordMetric({
      name: 'splash_screen_duration',
      value: duration,
      unit: 'ms',
      timestamp: Date.now()
    });
  }

  markTimeToInteractive(): void {
    const duration = Date.now() - this.appStartTime;
    this.startupMetrics.timeToInteractive = duration;
    
    this.recordMetric({
      name: 'time_to_interactive',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      target: this.TARGETS.STARTUP_TIME,
      status: duration < this.TARGETS.STARTUP_TIME ? 'success' : 'warning'
    });
  }

  // Screen transition monitoring
  startScreenTransition(from: string, to: string): void {
    this.currentTransition = {
      from,
      to,
      startTime: Date.now()
    };
  }

  endScreenTransition(): void {
    if (!this.currentTransition) return;

    const endTime = Date.now();
    const duration = endTime - this.currentTransition.startTime;

    this.currentTransition.endTime = endTime;
    this.currentTransition.duration = duration;

    this.screenTransitions.push(this.currentTransition);

    const metric: PerformanceMetric = {
      name: 'screen_transition',
      value: duration,
      unit: 'ms',
      timestamp: endTime,
      target: this.TARGETS.TRANSITION_TIME,
      status: duration < this.TARGETS.TRANSITION_TIME ? 'success' : 'warning'
    };

    this.recordMetric(metric);
    logger.logScreenTransition(
      this.currentTransition.from,
      this.currentTransition.to,
      duration
    );

    if (duration > this.TARGETS.TRANSITION_TIME) {
      logger.warn(`Screen transition exceeded target: ${duration}ms (target: ${this.TARGETS.TRANSITION_TIME}ms)`, {
        from: this.currentTransition.from,
        to: this.currentTransition.to
      });
    }

    this.currentTransition = null;
  }

  // Memory monitoring
  private checkMemoryUsage(): void {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const memoryUsage = process.memoryUsage();
      const heapUsed = memoryUsage.heapUsed;
      
      const metric: PerformanceMetric = {
        name: 'memory_usage',
        value: heapUsed,
        unit: 'bytes',
        timestamp: Date.now(),
        target: this.TARGETS.MEMORY_BASELINE,
        status: heapUsed < this.TARGETS.MEMORY_BASELINE ? 'success' : 'warning'
      };

      this.recordMetric(metric);
      logger.logMemoryUsage();

      if (heapUsed > this.TARGETS.MEMORY_BASELINE) {
        logger.warn(`Memory usage exceeded baseline: ${Math.round(heapUsed / 1024 / 1024)}MB (target: ${Math.round(this.TARGETS.MEMORY_BASELINE / 1024 / 1024)}MB)`);
      }
    }
  }

  getMemoryMetrics(): MemoryMetrics | null {
    if (typeof process === "undefined" || !process.memoryUsage) {
      return null;
    }

    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;

    return {
      used: heapUsed,
      total: heapTotal,
      percentage: (heapUsed / heapTotal) * 100,
      timestamp: Date.now()
    };
  }

  // API performance monitoring
  measureApiCall(
    endpoint: string,
    method: string,
    startTime: number,
    statusCode: number
  ): void {
    const duration = Date.now() - startTime;
    
    const metric: PerformanceMetric = {
      name: `api_${method.toLowerCase()}_${endpoint}`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      target: this.TARGETS.API_RESPONSE,
      status: duration < this.TARGETS.API_RESPONSE ? 'success' : 'warning'
    };

    this.recordMetric(metric);
    logger.logApiRequest(method, endpoint, statusCode, duration);

    if (duration > this.TARGETS.API_RESPONSE) {
      logger.warn(`API call exceeded target: ${endpoint} took ${duration}ms (target: ${this.TARGETS.API_RESPONSE}ms)`);
    }
  }

  // Database performance monitoring
  measureDatabaseQuery(
    query: string,
    startTime: number,
    success: boolean
  ): void {
    const duration = Date.now() - startTime;
    
    const metric: PerformanceMetric = {
      name: 'database_query',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      target: this.TARGETS.DB_QUERY,
      status: duration < this.TARGETS.DB_QUERY ? 'success' : 'warning'
    };

    this.recordMetric(metric);
    logger.logDatabaseQuery(query, duration, success);

    if (duration > this.TARGETS.DB_QUERY) {
      logger.warn(`Database query exceeded target: ${duration}ms (target: ${this.TARGETS.DB_QUERY}ms)`);
    }
  }

  // FPS monitoring (for React Native)
  measureFPS(fps: number): void {
    const metric: PerformanceMetric = {
      name: 'fps',
      value: fps,
      unit: 'fps',
      timestamp: Date.now(),
      target: this.TARGETS.FPS,
      status: fps >= this.TARGETS.FPS - 5 ? 'success' : fps >= this.TARGETS.FPS - 15 ? 'warning' : 'error'
    };

    this.recordMetric(metric);

    if (fps < this.TARGETS.FPS - 15) {
      logger.warn(`FPS dropped significantly: ${fps} FPS (target: ${this.TARGETS.FPS} FPS)`);
    }
  }

  // Battery monitoring (mobile specific)
  measureBatteryUsage(
    batteryLevel: number,
    isCharging: boolean,
    appUsagePercent: number
  ): void {
    const metric: PerformanceMetric = {
      name: 'battery_drain',
      value: appUsagePercent,
      unit: 'percent_per_hour',
      timestamp: Date.now(),
      target: this.TARGETS.BATTERY_DRAIN,
      status: appUsagePercent < this.TARGETS.BATTERY_DRAIN ? 'success' : 'warning'
    };

    this.recordMetric(metric);
    logger.logBatteryUsage(batteryLevel, isCharging, appUsagePercent);

    if (appUsagePercent > this.TARGETS.BATTERY_DRAIN) {
      logger.warn(`High battery usage: ${appUsagePercent}% per hour (target: < ${this.TARGETS.BATTERY_DRAIN}%)`);
    }
  }

  // Image loading performance
  measureImageLoad(imageUrl: string, startTime: number): void {
    const duration = Date.now() - startTime;
    
    const metric: PerformanceMetric = {
      name: 'image_load',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      target: this.TARGETS.IMAGE_LOAD,
      status: duration < this.TARGETS.IMAGE_LOAD ? 'success' : 'warning'
    };

    this.recordMetric(metric);

    if (duration > this.TARGETS.IMAGE_LOAD) {
      logger.debug(`Slow image load: ${imageUrl} took ${duration}ms`);
    }
  }

  // Cache performance
  measureCacheHitRate(hits: number, total: number): void {
    const hitRate = (hits / total) * 100;
    
    const metric: PerformanceMetric = {
      name: 'cache_hit_rate',
      value: hitRate,
      unit: 'percent',
      timestamp: Date.now(),
      target: this.TARGETS.CACHE_HIT_RATE,
      status: hitRate > this.TARGETS.CACHE_HIT_RATE ? 'success' : 'warning'
    };

    this.recordMetric(metric);

    if (hitRate < this.TARGETS.CACHE_HIT_RATE) {
      logger.debug(`Low cache hit rate: ${hitRate.toFixed(2)}% (target: > ${this.TARGETS.CACHE_HIT_RATE}%)`);
    }
  }

  // Record a custom metric
  recordMetric(metric: PerformanceMetric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metrics = this.metrics.get(metric.name)!;
    metrics.push(metric);

    // Keep only last 100 metrics per type to avoid memory issues
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  // Get metrics
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }

    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics;
  }

  getLatestMetric(name: string): PerformanceMetric | null {
    const metrics = this.metrics.get(name);
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  getAverageMetric(name: string, windowSize: number = 10): number | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    const recentMetrics = metrics.slice(-windowSize);
    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  // Get performance summary
  getPerformanceSummary(): {
    startup: StartupMetrics;
    averageTransitionTime: number | null;
    currentMemoryUsage: MemoryMetrics | null;
    recentMetrics: { [key: string]: PerformanceMetric | null };
    healthStatus: 'good' | 'warning' | "critical";
  } {
    const avgTransition = this.getAverageMetric('screen_transition');
    const memoryMetrics = this.getMemoryMetrics();
    
    const recentMetrics: { [key: string]: PerformanceMetric | null } = {};
    for (const [name] of this.metrics) {
      recentMetrics[name] = this.getLatestMetric(name);
    }

    // Determine health status
    let warningCount = 0;
    let errorCount = 0;
    
    for (const metric of Object.values(recentMetrics)) {
      if (metric?.status === 'warning') warningCount++;
      if (metric?.status === 'error') errorCount++;
    }

    let healthStatus: 'good' | 'warning' | "critical" = 'good';
    if (errorCount > 0) healthStatus = "critical";
    else if (warningCount > 2) healthStatus = 'warning';

    return {
      startup: this.startupMetrics,
      averageTransitionTime: avgTransition,
      currentMemoryUsage: memoryMetrics,
      recentMetrics,
      healthStatus
    };
  }

  // Export metrics for analysis
  exportMetrics(): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(this.metrics),
      screenTransitions: this.screenTransitions,
      startupMetrics: this.startupMetrics,
      summary: this.getPerformanceSummary()
    };

    return JSON.stringify(data, null, 2);
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics.clear();
    this.screenTransitions = [];
    this.currentTransition = null;
  }

  // Reset monitoring
  reset(): void {
    this.clearMetrics();
    this.startupMetrics = {};
    this.appStartTime = Date.now();
  }
}

export default PerformanceMonitor.getInstance();
export { PerformanceMonitor };