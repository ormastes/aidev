/**
 * External Log Library
 * Central hub for all external access logging and monitoring
 */

import { networkInterceptor } from './network-interceptor';
import { databaseInterceptor } from './database-interceptor';
import { systemMetricsLogger } from './system-metrics-logger';
import { externalCallTracker, trackExternal } from './external-call-tracker';
import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import { EventEmitter } from '../../../../../../../../infra_external-log-lib/src';

export interface ExternalLogConfig {
  logDir?: string;
  enableNetwork?: boolean;
  enableDatabase?: boolean;
  enableMetrics?: boolean;
  enableCallTracking?: boolean;
  captureStackTrace?: boolean;
  autoInstrument?: boolean;
}

export interface ExternalAccessLog {
  timestamp: Date;
  type: 'network' | 'database' | 'file' | 'cache' | 'other';
  functionName: string;
  duration: number;
  "success": boolean;
  error?: any;
  details: any;
  testContext?: {
    testName: string;
    storyId: string;
  };
}

export class ExternalLogLib extends EventEmitter {
  private config: ExternalLogConfig;
  private logs: ExternalAccessLog[] = [];
  private enabled = false;

  constructor(config: ExternalLogConfig = {}) {
    super();
    this.config = {
      logDir: config.logDir || path.join(process.cwd(), 'logs', 'external'),
      enableNetwork: config.enableNetwork !== false,
      enableDatabase: config.enableDatabase !== false,
      enableMetrics: config.enableMetrics !== false,
      enableCallTracking: config.enableCallTracking !== false,
      captureStackTrace: config.captureStackTrace !== false,
      autoInstrument: config.autoInstrument !== false
    };

    this.ensureLogDir();
    this.setupInterceptors();
  }

  private ensureLogDir(): void {
    if (this.config.logDir && !fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  private setupInterceptors(): void {
    // Network interceptor integration
    if (this.config.enableNetwork) {
      networkInterceptor.on('network', (log) => {
        this.logExternalAccess({
          timestamp: log.timestamp,
          type: 'network',
          functionName: `ext_http_${log.method?.toLowerCase() || 'request'}`,
          duration: log.duration || 0,
          success: !log.error,
          error: log.error,
          details: log,
          testContext: this.getCurrentTestContext()
        });
      });
    }

    // Database interceptor integration
    if (this.config.enableDatabase) {
      databaseInterceptor.on('database', (log) => {
        this.logExternalAccess({
          timestamp: log.timestamp,
          type: 'database',
          functionName: `ext_database_${log.operation?.toLowerCase() || 'query'}`,
          duration: log.duration || 0,
          success: !log.error,
          error: log.error,
          details: log,
          testContext: this.getCurrentTestContext()
        });
      });
    }

    // External call tracker integration
    if (this.config.enableCallTracking) {
      externalCallTracker.on('external-call', (call) => {
        this.logExternalAccess({
          timestamp: call.timestamp,
          type: this.inferType(call.functionName),
          functionName: call.functionName,
          duration: call.duration,
          success: !call.error,
          error: call.error,
          details: {
            args: call.args,
            result: call.result,
            stackTrace: call.stackTrace
          },
          testContext: call.testName ? {
            testName: call.testName,
            storyId: call.storyId || ''
          } : undefined
        });
      });
    }
  }

  private inferType(functionName: string): ExternalAccessLog['type'] {
    if (functionName.includes('http') || functionName.includes('websocket')) {
      return 'network';
    }
    if (functionName.includes('database') || functionName.includes('db')) {
      return 'database';
    }
    if (functionName.includes('fs') || functionName.includes('file')) {
      return 'file';
    }
    if (functionName.includes('cache')) {
      return 'cache';
    }
    return 'other';
  }

  private getCurrentTestContext(): ExternalAccessLog['testContext'] | undefined {
    // This would be integrated with test runner
    return undefined;
  }

  /**
   * Enable all logging
   */
  enable(): void {
    this.enabled = true;
    
    if (this.config.enableNetwork) {
      networkInterceptor.enable();
    }
    if (this.config.enableDatabase) {
      databaseInterceptor.enable();
    }
    if (this.config.enableMetrics) {
      systemMetricsLogger.startLogging();
    }
    if (this.config.enableCallTracking) {
      externalCallTracker.enable();
    }

    if (this.config.autoInstrument) {
      this.autoInstrument();
    }

    this.emit('enabled');
  }

  /**
   * Disable all logging
   */
  disable(): void {
    this.enabled = false;
    
    if (this.config.enableNetwork) {
      networkInterceptor.disable();
    }
    if (this.config.enableDatabase) {
      databaseInterceptor.disable();
    }
    if (this.config.enableMetrics) {
      systemMetricsLogger.stopLogging();
    }
    if (this.config.enableCallTracking) {
      externalCallTracker.disable();
    }

    this.emit('disabled');
  }

  /**
   * Auto-instrument common external libraries
   */
  private autoInstrument(): void {
    // Instrument HTTP/HTTPS
    this.instrumentModule('http', ['request', 'get']);
    this.instrumentModule('https', ['request', 'get']);
    
    // Instrument popular HTTP clients
    this.instrumentModule('axios', ['request', 'get', 'post', 'put', 'delete']);
    this.instrumentModule('node-fetch', ['default']);
    
    // Instrument database clients
    this.instrumentModule('pg', ['query']);
    this.instrumentModule('mysql', ['query']);
    this.instrumentModule('mongodb', ['find', 'insert', 'update', 'delete']);
    
    // Instrument file system
    this.instrumentModule('fs', ['readFile', 'writeFile', 'readFileSync', 'writeFileSync']);
  }

  /**
   * Instrument a module's methods
   */
  private instrumentModule(moduleName: string, methods: string[]): void {
    try {
      const module = require(moduleName);
      
      methods.forEach(method => {
        if (module[method] && typeof module[method] === 'function') {
          const originalMethod = module[method];
          const trackedName = `ext_${moduleName}_${method}`;
          
          module[method] = trackExternal(trackedName, originalMethod);
        }
      });
    } catch (error) {
      // Module not installed, skip
    }
  }

  /**
   * Log an external access
   */
  private logExternalAccess(log: ExternalAccessLog): void {
    if (!this.enabled) return;

    this.logs.push(log);
    this.emit('external-access', log);

    // Write to file if configured
    if (this.config.logDir) {
      this.writeLog(log);
    }

    // Keep buffer manageable
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000);
    }
  }

  /**
   * Write log to file
   */
  private writeLog(log: ExternalAccessLog): void {
    const filename = `external-${new Date().toISOString().split('T')[0]}.jsonl`;
    const filepath = path.join(this.config.logDir!, filename);
    
    fs.appendFileSync(filepath, JSON.stringify(log) + '\n');
  }

  /**
   * Get all logs
   */
  getLogs(): ExternalAccessLog[] {
    return [...this.logs];
  }

  /**
   * Get logs for a specific test
   */
  getLogsForTest(testName: string): ExternalAccessLog[] {
    return this.logs.filter(l => l.testContext?.testName === testName);
  }

  /**
   * Get unique function names
   */
  getUniqueFunctions(): string[] {
    return Array.from(new Set(this.logs.map(l => l.functionName)));
  }

  /**
   * Get external call statistics
   */
  getStats(): any {
    const stats = {
      totalCalls: this.logs.length,
      byType: {} as Record<string, number>,
      byFunction: {} as Record<string, any>,
      errorRate: 0,
      avgDuration: 0
    };

    this.logs.forEach(log => {
      // Count by type
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;

      // Count by function
      if (!stats.byFunction[log.functionName]) {
        stats.byFunction[log.functionName] = {
          count: 0,
          errors: 0,
          totalDuration: 0,
          avgDuration: 0
        };
      }
      
      const funcStats = stats.byFunction[log.functionName];
      funcStats.count++;
      funcStats.totalDuration += log.duration;
      if (!log.success) funcStats.errors++;
    });

    // Calculate averages
    const totalDuration = this.logs.reduce((sum, l) => sum + l.duration, 0);
    stats.avgDuration = stats.totalCalls > 0 ? totalDuration / stats.totalCalls : 0;
    
    const totalErrors = this.logs.filter(l => !l.success).length;
    stats.errorRate = stats.totalCalls > 0 ? (totalErrors / stats.totalCalls) * 100 : 0;

    // Calculate function averages
    Object.values(stats.byFunction).forEach((funcStats: any) => {
      funcStats.avgDuration = funcStats.count > 0 ? funcStats.totalDuration / funcStats.count : 0;
    });

    return stats;
  }

  /**
   * Generate a summary report
   */
  generateReport(): any {
    return {
      timestamp: new Date(),
      enabled: this.enabled,
      config: this.config,
      stats: this.getStats(),
      uniqueFunctions: this.getUniqueFunctions(),
      networkStats: this.config.enableNetwork ? networkInterceptor.getStats() : null,
      databaseStats: this.config.enableDatabase ? databaseInterceptor.getStats() : null,
      systemMetrics: this.config.enableMetrics ? systemMetricsLogger.getCurrentMetrics() : null,
      callTrackerStats: this.config.enableCallTracking ? externalCallTracker.getStats() : null
    };
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    externalCallTracker.clear();
    this.emit('cleared');
  }
}

// Singleton instance
export const externalLogLib = new ExternalLogLib();

// Export convenience functions
export { trackExternal, TrackExternalCall } from './external-call-tracker';
export { externalCallTracker } from './external-call-tracker';